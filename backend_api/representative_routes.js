/**
 * Representative onboarding, admin management, check-in, location
 */
const multer = require('multer');

const REP_STATUS = {
    PORTAL: 'portal_registered',
    ONBOARDING: 'onboarding',
    PENDING: 'pending_admin',
    ACTIVE: 'active',
    REJECTED: 'rejected',
    SUSPENDED: 'suspended',
    INVITED: 'invited'
};

function haversineKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function parseKyc(row) {
    if (!row?.kyc_data) return {};
    return typeof row.kyc_data === 'string' ? JSON.parse(row.kyc_data || '{}') : row.kyc_data;
}

function calcEtaMinutes(fromLat, fromLng, toLat, toLng) {
    if (fromLat == null || fromLng == null || toLat == null || toLng == null) return null;
    const km = haversineKm(Number(fromLat), Number(fromLng), Number(toLat), Number(toLng));
    return Math.max(4, Math.round((km / 22) * 60));
}

const DOCTOR_VISIBLE_TO_CUSTOMER = new Set([
    'doctor_assigned', 'doctor_approved', 'animal_picked_up', 'en_route_doctor',
    'rep_arrived_doctor', 'handover_otp_pending', 'at_doctor', 'treatment_in_progress',
    'treatment_complete', 'pickup_requested', 'pickup_en_route', 'pickup_arrived', 'ngo_received', 'resolved'
]);

function registerRepresentativeRoutes(app, pool, deps) {
    const { upload, generateCode, sendEmail, io, resolveIncidentByCode } = deps;

    async function lookupIncident(rawCode) {
        if (resolveIncidentByCode) {
            const row = await resolveIncidentByCode(rawCode);
            if (row) return row;
        }
        const code = String(rawCode || '').trim().replace(/\s+/g, '');
        if (!code) return null;
        const norm = /^PB/i.test(code) ? code.toUpperCase() : ('PB' + code).toUpperCase();
        const r = await pool.query(
            'SELECT * FROM incidents WHERE incident_code = $1 OR incident_id::text = $1 OR UPPER(incident_code) = $1 LIMIT 1',
            [norm]
        );
        return r.rows[0] || null;
    }

    function canonicalCode(row) {
        return row.incident_code || (row.incident_id != null ? String(row.incident_id) : null);
    }

    const repUpload = upload.fields([
        { name: 'selfie', maxCount: 1 },
        { name: 'aadhaarFile', maxCount: 1 },
        { name: 'panFile', maxCount: 1 },
        { name: 'dlFile', maxCount: 1 },
        { name: 'addressProof', maxCount: 1 }
    ]);

    async function initRepSchema() {
        await pool.query(`
            ALTER TABLE representatives ADD COLUMN IF NOT EXISTS tracking_id VARCHAR(50) UNIQUE;
            ALTER TABLE representatives ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
            ALTER TABLE representatives ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMP;
            ALTER TABLE representatives ADD COLUMN IF NOT EXISTS last_lat DECIMAL(10,8);
            ALTER TABLE representatives ADD COLUMN IF NOT EXISTS last_lng DECIMAL(11,8);
            ALTER TABLE representatives ADD COLUMN IF NOT EXISTS last_location_at TIMESTAMP;
            ALTER TABLE representatives ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false;
            CREATE TABLE IF NOT EXISTS rep_checkins (id SERIAL PRIMARY KEY, rep_id INTEGER, selfie_url TEXT, lat DECIMAL(10,8), lng DECIMAL(11,8), created_at TIMESTAMP DEFAULT NOW());
            CREATE TABLE IF NOT EXISTS rep_timeslots (id SERIAL PRIMARY KEY, rep_id INTEGER, day_of_week INTEGER, start_time VARCHAR(10), end_time VARCHAR(10), created_at TIMESTAMP DEFAULT NOW());
            CREATE TABLE IF NOT EXISTS rep_reviews (id SERIAL PRIMARY KEY, rep_id INTEGER, incident_code VARCHAR(50), author VARCHAR(255), rating INTEGER DEFAULT 5, comment TEXT, created_at TIMESTAMP DEFAULT NOW());
        `);
    }

    function parseKyc(row) {
        if (!row) return {};
        return typeof row.kyc_data === 'string' ? JSON.parse(row.kyc_data || '{}') : (row.kyc_data || {});
    }

    function shapeRep(row) {
        if (!row) return null;
        const kyc = parseKyc(row);
        return { ...row, kyc_data: kyc, can_use_app: row.status === REP_STATUS.ACTIVE && !row.suspended_at };
    }

    function genTrackingId() {
        return 'REP-TRK-' + Date.now().toString(36).toUpperCase() + '-' + Math.floor(100 + Math.random() * 900);
    }

    async function linkRepresentativeByEmail(uid, email) {
        if (!email) return null;
        const normalized = String(email).trim().toLowerCase();
        const existing = await pool.query('SELECT * FROM representatives WHERE uid = $1', [uid]);
        if (existing.rows.length) return existing.rows[0];

        const invited = await pool.query(
            `SELECT * FROM representatives WHERE LOWER(email) = $1
             AND (uid LIKE 'admin-rep-%' OR uid LIKE 'rep-invite-%' OR status = $2)
             ORDER BY created_at ASC LIMIT 1`,
            [normalized, REP_STATUS.INVITED]
        );
        if (!invited.rows.length) return null;

        const linked = await pool.query(
            'UPDATE representatives SET uid = $1 WHERE id = $2 RETURNING *',
            [uid, invited.rows[0].id]
        );
        await pool.query("UPDATE users SET role = 'representative' WHERE uid = $1", [uid]).catch(() => {});
        return linked.rows[0];
    }

    // ─── Onboarding (multi-step) ───
    app.post('/api/representatives/:uid/onboarding', repUpload, async (req, res) => {
        try {
            const uid = req.params.uid;
            const body = req.body;
            const step = body.step || 'personal';
            let rep = await pool.query('SELECT * FROM representatives WHERE uid=$1', [uid]);
            if (!rep.rows.length) return res.status(404).json({ error: 'Representative not found' });

            const kyc = parseKyc(rep.rows[0]);
            const files = req.files || {};

            if (step === 'personal') {
                Object.assign(kyc, {
                    dob: body.dob, gender: body.gender, emergency_name: body.emergencyName,
                    emergency_phone: body.emergencyPhone, blood_group: body.bloodGroup
                });
                await pool.query(
                    'UPDATE representatives SET name=$1, phone=$2, vehicle_type=$3, vehicle_number=$4, license_number=$5, status=$6, kyc_data=$7 WHERE uid=$8',
                    [body.name || rep.rows[0].name, body.phone, body.vehicleType, body.vehicleNumber, body.licenseNumber, REP_STATUS.ONBOARDING, JSON.stringify(kyc), uid]
                );
            } else if (step === 'address') {
                kyc.address = { line1: body.line1, line2: body.line2, city: body.city, state: body.state, pincode: body.pincode };
                if (files.addressProof?.[0]) kyc.address_proof = '/uploads/' + files.addressProof[0].filename;
                await pool.query('UPDATE representatives SET kyc_data=$1, status=$2 WHERE uid=$3', [JSON.stringify(kyc), REP_STATUS.ONBOARDING, uid]);
            } else if (step === 'identity') {
                kyc.aadhaar = body.aadhaar;
                kyc.pan = body.pan;
                if (files.aadhaarFile?.[0]) kyc.aadhaar_file = '/uploads/' + files.aadhaarFile[0].filename;
                if (files.panFile?.[0]) kyc.pan_file = '/uploads/' + files.panFile[0].filename;
                if (files.dlFile?.[0]) kyc.dl_file = '/uploads/' + files.dlFile[0].filename;
                await pool.query('UPDATE representatives SET kyc_data=$1 WHERE uid=$2', [JSON.stringify(kyc), uid]);
            } else if (step === 'didit') {
                kyc.didit_session = body.diditSessionId;
                kyc.didit_verified = body.diditVerified === 'true' || body.diditVerified === true;
                kyc.didit_verified_at = new Date().toISOString();
                if (files.selfie?.[0]) kyc.selfie_url = '/uploads/' + files.selfie[0].filename;
                await pool.query('UPDATE representatives SET kyc_data=$1 WHERE uid=$2', [JSON.stringify(kyc), uid]);
            } else if (step === 'submit') {
                if (!body.tncAccepted || body.tncAccepted !== 'true') {
                    return res.status(400).json({ error: 'Terms & conditions must be accepted' });
                }
                kyc.tnc_accepted = true;
                kyc.tnc_accepted_at = new Date().toISOString();
                kyc.submitted_at = new Date().toISOString();
                const trackingId = rep.rows[0].tracking_id || genTrackingId();
                const ngoId = body.ngoId || rep.rows[0].ngo_id;
                await pool.query(
                    'UPDATE representatives SET kyc_data=$1, status=$2, tracking_id=$3, ngo_id=COALESCE($4, ngo_id) WHERE uid=$5',
                    [JSON.stringify(kyc), REP_STATUS.PENDING, trackingId, ngoId || null, uid]
                );
                return res.json({ success: true, trackingId, message: 'Application submitted for admin review' });
            }

            const updated = await pool.query('SELECT * FROM representatives WHERE uid=$1', [uid]);
            res.json({ success: true, representative: shapeRep(updated.rows[0]) });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    app.get('/api/representatives/track/:trackingId', async (req, res) => {
        try {
            const r = await pool.query('SELECT r.*, n.name as ngo_name FROM representatives r LEFT JOIN ngos n ON r.ngo_id=n.id WHERE r.tracking_id=$1', [req.params.trackingId]);
            if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
            res.json(shapeRep(r.rows[0]));
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    app.post('/api/representatives/:uid/link-account', async (req, res) => {
        try {
            const { email } = req.body;
            const linked = await linkRepresentativeByEmail(req.params.uid, email);
            res.json({ success: true, linked: Boolean(linked), representative: linked ? shapeRep(linked) : null });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    app.post('/api/representatives/ensure-demo', async (req, res) => {
        try {
            await initRepSchema();
            let r = await pool.query('SELECT * FROM representatives WHERE uid = $1', ['demo-rep-uid']);
            if (!r.rows.length) {
                r = await pool.query(
                    `INSERT INTO representatives (uid, name, email, phone, status, rep_id, tracking_id, kyc_data, vehicle_type, is_online)
                     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,true) RETURNING *`,
                    ['demo-rep-uid', 'Demo Representative', 'rep@pawbandhan.com', '9999999999', REP_STATUS.ACTIVE,
                        'PB-REP-DEMO', 'REP-TRK-DEMO', JSON.stringify({ demo: true }), 'Two Wheeler']
                );
            } else if (r.rows[0].status !== REP_STATUS.ACTIVE) {
                await pool.query("UPDATE representatives SET status=$1, suspended_at=NULL WHERE uid='demo-rep-uid'", [REP_STATUS.ACTIVE]);
            }
            res.json({ success: true, allowed: true, uid: 'demo-rep-uid' });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    app.get('/api/representatives/:uid/can-login', async (req, res) => {
        try {
            if (req.params.uid === 'demo-rep-uid') {
                return res.json({ allowed: true, demo: true });
            }
            let r = await pool.query('SELECT status, suspended_at, rejection_reason FROM representatives WHERE uid=$1', [req.params.uid]);
            if (!r.rows.length && req.query.email) {
                await linkRepresentativeByEmail(req.params.uid, req.query.email);
                r = await pool.query('SELECT status, suspended_at, rejection_reason FROM representatives WHERE uid=$1', [req.params.uid]);
            }
            if (!r.rows.length) return res.json({ allowed: false, reason: 'No representative profile. Register or ask your NGO to invite you with this email.' });
            const rep = r.rows[0];
            if (rep.status === REP_STATUS.REJECTED) return res.json({ allowed: false, reason: rep.rejection_reason || 'Application rejected' });
            if (rep.status === REP_STATUS.SUSPENDED || rep.suspended_at) return res.json({ allowed: false, reason: 'Account suspended' });
            if (rep.status === REP_STATUS.PENDING) return res.json({ allowed: false, reason: 'Pending admin approval', pending: true });
            if (rep.status === REP_STATUS.ACTIVE) return res.json({ allowed: true });
            if ([REP_STATUS.ONBOARDING, REP_STATUS.PORTAL, REP_STATUS.INVITED].includes(rep.status)) {
                return res.json({ allowed: false, reason: 'Complete onboarding first', onboarding: true });
            }
            res.json({ allowed: false, reason: 'Contact admin' });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    // ─── Admin representative management ───
    app.get('/api/admin/representatives-all', async (req, res) => {
        try {
            const r = await pool.query(`
                SELECT r.*, n.name as ngo_name, n.prn as ngo_prn
                FROM representatives r LEFT JOIN ngos n ON r.ngo_id = n.id
                ORDER BY r.created_at DESC`);
            res.json(r.rows.map(shapeRep));
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    app.get('/api/admin/representatives/:id', async (req, res) => {
        try {
            const r = await pool.query('SELECT r.*, n.name as ngo_name FROM representatives r LEFT JOIN ngos n ON r.ngo_id=n.id WHERE r.id=$1', [req.params.id]);
            if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
            const rep = shapeRep(r.rows[0]);
            const checkins = await pool.query('SELECT * FROM rep_checkins WHERE rep_id=$1 ORDER BY created_at DESC LIMIT 20', [rep.id]);
            const slots = await pool.query('SELECT * FROM rep_timeslots WHERE rep_id=$1', [rep.id]);
            const reviews = await pool.query('SELECT * FROM rep_reviews WHERE rep_id=$1 ORDER BY created_at DESC', [rep.id]);
            res.json({ ...rep, checkins: checkins.rows, timeslots: slots.rows, reviews: reviews.rows });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    app.post('/api/admin/representatives/create', async (req, res) => {
        try {
            const { name, email, phone, ngoId, vehicleType, vehicleNumber } = req.body;
            const tempUid = 'admin-rep-' + Date.now();
            const trackingId = genTrackingId();
            const r = await pool.query(
                `INSERT INTO representatives (uid, ngo_id, name, email, phone, vehicle_type, vehicle_number, status, tracking_id, kyc_data)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
                [tempUid, ngoId || null, name, email, phone, vehicleType, vehicleNumber, REP_STATUS.INVITED, trackingId,
                    JSON.stringify({ created_by_admin: true, invited_at: new Date().toISOString() })]
            );
            res.json({ success: true, representative: shapeRep(r.rows[0]), inviteNote: 'Rep must register at representative_auth.html with this email' });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    app.post('/api/admin/representatives/:id/allot-ngo', async (req, res) => {
        try {
            const { ngoId } = req.body;
            await pool.query('UPDATE representatives SET ngo_id=$1 WHERE id=$2', [ngoId, req.params.id]);
            res.json({ success: true });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    app.post('/api/admin/reject-representative', async (req, res) => {
        try {
            const { id, reason } = req.body;
            await pool.query('UPDATE representatives SET status=$1, rejection_reason=$2 WHERE id=$3', [REP_STATUS.REJECTED, reason || 'Did not meet requirements', id]);
            const rep = await pool.query('SELECT email, name FROM representatives WHERE id=$1', [id]);
            if (rep.rows[0]?.email) {
                await sendEmail(rep.rows[0].email, 'PawBandhan Application Update',
                    `<h2>Application not approved</h2><p>Dear ${rep.rows[0].name}, your representative application was not approved.</p><p>Reason: ${reason || 'Incomplete verification'}</p>`);
            }
            res.json({ success: true });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    app.post('/api/admin/suspend-representative', async (req, res) => {
        try {
            const { id, suspend } = req.body;
            if (suspend) {
                await pool.query('UPDATE representatives SET status=$1, suspended_at=NOW() WHERE id=$2', [REP_STATUS.SUSPENDED, id]);
            } else {
                await pool.query('UPDATE representatives SET status=$1, suspended_at=NULL WHERE id=$2', [REP_STATUS.ACTIVE, id]);
            }
            res.json({ success: true });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    // ─── Rep app: check-in, location, timeslots, reviews ───
    app.post('/api/representatives/:uid/checkin', upload.single('selfie'), async (req, res) => {
        try {
            const rep = await pool.query('SELECT id, status FROM representatives WHERE uid=$1', [req.params.uid]);
            if (!rep.rows.length || rep.rows[0].status !== REP_STATUS.ACTIVE) return res.status(403).json({ error: 'Not active' });
            const url = req.file ? '/uploads/' + req.file.filename : null;
            const { lat, lng } = req.body;
            await pool.query('INSERT INTO rep_checkins (rep_id, selfie_url, lat, lng) VALUES ($1,$2,$3,$4)',
                [rep.rows[0].id, url, lat || null, lng || null]);
            res.json({ success: true });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    app.post('/api/representatives/:uid/location', async (req, res) => {
        try {
            const { lat, lng, online } = req.body;
            const rep = await pool.query('SELECT id FROM representatives WHERE uid=$1', [req.params.uid]);
            await pool.query(
                'UPDATE representatives SET last_lat=$1, last_lng=$2, last_location_at=NOW(), is_online=$3 WHERE uid=$4',
                [lat, lng, online !== false, req.params.uid]
            );
            if (io && rep.rows[0]) {
                const active = await pool.query(
                    `SELECT incident_code FROM incidents WHERE rep_id=$1 AND workflow_status NOT IN ('resolved','reported') ORDER BY updated_at DESC LIMIT 3`,
                    [rep.rows[0].id]
                );
                active.rows.forEach(row => {
                    io.to('case-' + row.incident_code).emit('rep-location', { incidentCode: row.incident_code, lat, lng });
                    io.emit('case-update', { incidentCode: row.incident_code, event: 'rep-location', lat, lng });
                });
            }
            res.json({ success: true });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    app.get('/api/representatives/:uid/timeslots', async (req, res) => {
        try {
            const rep = await pool.query('SELECT id FROM representatives WHERE uid=$1', [req.params.uid]);
            if (!rep.rows.length) return res.json([]);
            const r = await pool.query('SELECT * FROM rep_timeslots WHERE rep_id=$1 ORDER BY day_of_week', [rep.rows[0].id]);
            res.json(r.rows);
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    app.post('/api/representatives/:uid/timeslots', async (req, res) => {
        try {
            const rep = await pool.query('SELECT id FROM representatives WHERE uid=$1', [req.params.uid]);
            if (!rep.rows.length) return res.status(404).json({ error: 'Not found' });
            const slots = req.body.slots || [];
            await pool.query('DELETE FROM rep_timeslots WHERE rep_id=$1', [rep.rows[0].id]);
            for (const s of slots) {
                await pool.query('INSERT INTO rep_timeslots (rep_id, day_of_week, start_time, end_time) VALUES ($1,$2,$3,$4)',
                    [rep.rows[0].id, s.day, s.start, s.end]);
            }
            res.json({ success: true });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    app.get('/api/representatives/:uid/reviews', async (req, res) => {
        try {
            const rep = await pool.query('SELECT id FROM representatives WHERE uid=$1', [req.params.uid]);
            if (!rep.rows.length) return res.json([]);
            const r = await pool.query('SELECT * FROM rep_reviews WHERE rep_id=$1 ORDER BY created_at DESC LIMIT 50', [rep.rows[0].id]);
            res.json(r.rows);
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    app.get('/api/admin/representatives-locations', async (req, res) => {
        try {
            const r = await pool.query(`
                SELECT id, name, rep_id, last_lat, last_lng, last_location_at, is_online, status, ngo_id
                FROM representatives WHERE status='active' AND last_lat IS NOT NULL`);
            res.json(r.rows);
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    const CUSTOMER_TRACK_STEPS = [
        { keys: ['reported'], label: 'Rescue requested', sub: 'Your alert is registered' },
        { keys: ['assigned_ngo', 'ngo_assigned'], label: 'NGO confirmed', sub: 'Partner shelter assigned' },
        { keys: ['assigned_rep', 'ringing_rep'], label: 'Hero assigned', sub: 'Field responder matched' },
        { keys: ['rep_accepted'], label: 'On the way', sub: 'Heading to the animal' },
        { keys: ['rep_arrived_incident'], label: 'Arrived at location', sub: 'At rescue spot' },
        { keys: ['photo_incident_verified'], label: 'Animal located', sub: 'Verified on site' },
        { keys: ['doctor_requested', 'doctor_assigned'], label: 'Vet assigned', sub: 'Clinic notified' },
        { keys: ['doctor_approved'], label: 'Vet approved', sub: 'Ready for transport' },
        { keys: ['animal_picked_up', 'en_route_doctor'], label: 'En route to clinic', sub: 'Animal in transit' },
        { keys: ['rep_arrived_doctor', 'handover_otp_pending', 'at_doctor'], label: 'At clinic', sub: 'Handover complete' },
        { keys: ['treatment_in_progress'], label: 'Treatment ongoing', sub: 'Under veterinary care' },
        { keys: ['treatment_complete'], label: 'Treatment complete', sub: 'Medical report submitted' },
        { keys: ['pickup_requested', 'pickup_en_route', 'pickup_arrived'], label: 'Return to shelter', sub: 'Pickup in progress' },
        { keys: ['ngo_received'], label: 'At shelter', sub: 'NGO received animal' },
        { keys: ['resolved', 'released_safe', 'adopted_ngo'], label: 'Rescue complete', sub: 'Animal is safe' }
    ];

    function customerStepIndex(ws) {
        for (let i = CUSTOMER_TRACK_STEPS.length - 1; i >= 0; i--) {
            if (CUSTOMER_TRACK_STEPS[i].keys.includes(ws)) return i;
        }
        return 0;
    }

    function buildCustomerTrackSteps(ws, timelineRows) {
        const currentIdx = customerStepIndex(ws);
        const byStatus = {};
        (timelineRows || []).forEach(t => {
            const prev = byStatus[t.status];
            if (!prev || new Date(t.created_at) > new Date(prev.created_at)) byStatus[t.status] = t;
        });
        return CUSTOMER_TRACK_STEPS.map((step, i) => {
            let event = null;
            for (const k of step.keys) {
                if (byStatus[k]) { event = byStatus[k]; break; }
            }
            return {
                key: step.keys[0],
                label: step.label,
                sub: step.sub,
                done: i < currentIdx,
                active: i === currentIdx,
                pending: i > currentIdx,
                at: event?.created_at || null,
                note: event?.note || null
            };
        });
    }

    // Shared case detail for customer / NGO / Admin (timeline + doctor)
    app.get('/api/workflow/case/:incidentCode/full', async (req, res) => {
        try {
            const row = await lookupIncident(req.params.incidentCode);
            if (!row) return res.status(404).json({ error: 'Not found' });
            const code = canonicalCode(row);
            const user = row.user_id ? await pool.query('SELECT first_name, last_name, phone_no, email FROM users WHERE id=$1', [row.user_id]) : { rows: [] };
            const photos = await pool.query('SELECT * FROM case_photos WHERE incident_code=$1 ORDER BY created_at ASC', [code]);
            const timeline = await pool.query('SELECT * FROM case_timeline WHERE incident_code=$1 ORDER BY created_at ASC', [code]);
            const caseRow = await pool.query('SELECT animal_type, location, condition FROM cases WHERE incident_code=$1 LIMIT 1', [code]);
            const caseMeta = caseRow.rows[0] || {};
            const reportImages = (Array.isArray(row.images) ? row.images : []).map(f => '/uploads/' + (typeof f === 'string' ? f.replace(/^\/uploads\//, '') : f));
            let rep = null;
            let ngo = null;
            let doctor = null;
            if (row.rep_id) {
                const rr = await pool.query('SELECT id, name, phone, email, rep_id, vehicle_type, last_lat, last_lng, last_location_at, is_online FROM representatives WHERE id=$1', [row.rep_id]);
                rep = rr.rows[0] || null;
            }
            if (row.ngo_id) {
                const nr = await pool.query('SELECT id, name, phone, email, prn, address, city, state, kyc_data FROM ngos WHERE id=$1', [row.ngo_id]);
                if (nr.rows[0]) {
                    const kyc = parseKyc(nr.rows[0]);
                    ngo = {
                        ...nr.rows[0],
                        location_label: [nr.rows[0].address, nr.rows[0].city, nr.rows[0].state].filter(Boolean).join(', ') || kyc.address || null,
                        latitude: kyc.latitude ?? kyc.lat ?? null,
                        longitude: kyc.longitude ?? kyc.lng ?? null
                    };
                }
            }
            const ws = row.workflow_status || 'reported';
            const show_doctor_section = DOCTOR_VISIBLE_TO_CUSTOMER.has(ws) && Boolean(row.doctor_id);
            if (show_doctor_section && row.doctor_id) {
                const dr = await pool.query('SELECT id, name, phone, email, prn, hospital_name, specialization, kyc_data FROM doctors WHERE id=$1', [row.doctor_id]);
                doctor = dr.rows[0] || null;
            }
            const track_steps = buildCustomerTrackSteps(ws, timeline.rows);
            const currentIdx = customerStepIndex(ws);
            const progress_percent = track_steps.length > 1
                ? Math.round((currentIdx / (track_steps.length - 1)) * 100)
                : 0;
            const doctor_photos = show_doctor_section ? photos.rows.filter(p =>
                p.uploaded_by === 'doctor' || (p.photo_type && String(p.photo_type).includes('doctor'))
            ) : [];
            const destLat = row.latitude != null ? Number(row.latitude) : null;
            const destLng = row.longitude != null ? Number(row.longitude) : null;
            let eta_minutes = null;
            if (rep?.last_lat != null && rep?.last_lng != null && destLat != null && destLng != null &&
                ['rep_accepted', 'rep_assigned', 'ringing_rep', 'en_route_doctor', 'pickup_en_route'].includes(ws)) {
                eta_minutes = calcEtaMinutes(rep.last_lat, rep.last_lng, destLat, destLng);
            }
            res.json({
                ...row,
                incident_code: code,
                animal_type: row.animal_type || caseMeta.animal_type,
                location: caseMeta.location || row.description,
                description: row.description || caseMeta.location,
                workflow_status: ws,
                track_steps,
                progress_percent,
                eta_minutes,
                show_doctor_section,
                representative: rep ? { ...rep, phone_display: rep.phone } : null,
                ngo,
                doctor,
                injury_type: show_doctor_section ? (row.injury_type || null) : null,
                treatment_report: show_doctor_section ? (row.treatment_report || null) : null,
                reporter: user.rows[0] ? {
                    name: `${user.rows[0].first_name || ''} ${user.rows[0].last_name || ''}`.trim(),
                    phone: user.rows[0].phone_no,
                    email: user.rows[0].email
                } : null,
                report_images: reportImages,
                case_photos: photos.rows,
                doctor_photos,
                timeline: timeline.rows
            });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    initRepSchema().then(async () => {
        try {
            const demo = await pool.query('SELECT id FROM representatives WHERE uid = $1', ['demo-rep-uid']);
            if (!demo.rows.length) {
                await pool.query(
                    `INSERT INTO representatives (uid, name, email, phone, status, rep_id, tracking_id, kyc_data, vehicle_type)
                     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
                    ['demo-rep-uid', 'Demo Representative', 'rep@pawbandhan.com', '9999999999', REP_STATUS.ACTIVE,
                        'PB-REP-DEMO', 'REP-TRK-DEMO', JSON.stringify({ demo: true }), 'Two Wheeler']
                );
            }
        } catch (e) { /* ignore */ }
    }).catch(() => {});

    return { initRepSchema, REP_STATUS };
}

module.exports = { registerRepresentativeRoutes, REP_STATUS };
