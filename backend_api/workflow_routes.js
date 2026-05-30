/**
 * PawBandhan case workflow — representatives, dispatch, doctor handover
 */
const path = require('path');
const multer = require('multer');

const WORKFLOW = {
    REPORTED: 'reported',
    ASSIGNED_REP: 'assigned_rep',
    RINGING_REP: 'ringing_rep',
    REP_ACCEPTED: 'rep_accepted',
    REP_ARRIVED_INCIDENT: 'rep_arrived_incident',
    PHOTO_INCIDENT_VERIFIED: 'photo_incident_verified',
    DOCTOR_REQUESTED: 'doctor_requested',
    DOCTOR_ASSIGNED: 'doctor_assigned',
    DOCTOR_APPROVED: 'doctor_approved',
    ANIMAL_PICKED_UP: 'animal_picked_up',
    EN_ROUTE_DOCTOR: 'en_route_doctor',
    REP_ARRIVED_DOCTOR: 'rep_arrived_doctor',
    HANDOVER_OTP_PENDING: 'handover_otp_pending',
    AT_DOCTOR: 'at_doctor',
    TREATMENT_IN_PROGRESS: 'treatment_in_progress',
    TREATMENT_COMPLETE: 'treatment_complete',
    PICKUP_REQUESTED: 'pickup_requested',
    PICKUP_EN_ROUTE: 'pickup_en_route',
    PICKUP_ARRIVED: 'pickup_arrived',
    NGO_RECEIVED: 'ngo_received',
    RELEASED_SAFE: 'released_safe',
    ADOPTED_NGO: 'adopted_ngo',
    RESOLVED: 'resolved'
};

const STATUS_LABELS = {
    ngo_assigned: 'NGO assigned (awaiting accept)',
    ngo_accepted: 'NGO accepted case',
    [WORKFLOW.REPORTED]: 'Case reported',
    [WORKFLOW.ASSIGNED_REP]: 'Representative assigned',
    [WORKFLOW.RINGING_REP]: 'Alert sent to representative',
    [WORKFLOW.REP_ACCEPTED]: 'Representative accepted',
    [WORKFLOW.REP_ARRIVED_INCIDENT]: 'Arrived at incident',
    [WORKFLOW.PHOTO_INCIDENT_VERIFIED]: 'Animal photo verified',
    [WORKFLOW.DOCTOR_REQUESTED]: 'Finding nearest vet',
    [WORKFLOW.DOCTOR_ASSIGNED]: 'Vet assigned',
    [WORKFLOW.DOCTOR_APPROVED]: 'Vet approved case',
    [WORKFLOW.ANIMAL_PICKED_UP]: 'Animal picked up',
    [WORKFLOW.EN_ROUTE_DOCTOR]: 'En route to clinic',
    [WORKFLOW.REP_ARRIVED_DOCTOR]: 'Arrived at clinic',
    [WORKFLOW.HANDOVER_OTP_PENDING]: 'Awaiting handover OTP',
    [WORKFLOW.AT_DOCTOR]: 'Animal with veterinarian',
    [WORKFLOW.TREATMENT_IN_PROGRESS]: 'Treatment in progress',
    [WORKFLOW.TREATMENT_COMPLETE]: 'Treatment complete',
    [WORKFLOW.PICKUP_REQUESTED]: 'Pickup requested',
    [WORKFLOW.PICKUP_EN_ROUTE]: 'Representative en route for pickup',
    [WORKFLOW.PICKUP_ARRIVED]: 'Representative arrived for pickup',
    [WORKFLOW.NGO_RECEIVED]: 'Animal received by NGO',
    [WORKFLOW.RELEASED_SAFE]: 'Released to safe area',
    [WORKFLOW.ADOPTED_NGO]: 'Kept by shelter',
    [WORKFLOW.RESOLVED]: 'Case resolved'
};

function registerWorkflowRoutes(app, pool, io, deps) {
    const { upload, generateCode, generateOTP, sendEmail } = deps;

    async function initWorkflowSchema() {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS representatives (
                id SERIAL PRIMARY KEY,
                uid VARCHAR(255) UNIQUE,
                ngo_id INTEGER REFERENCES ngos(id),
                name VARCHAR(255),
                email VARCHAR(255),
                phone VARCHAR(20),
                vehicle_type VARCHAR(100),
                vehicle_number VARCHAR(100),
                license_number VARCHAR(100),
                status VARCHAR(30) DEFAULT 'portal_registered',
                rep_id VARCHAR(50) UNIQUE,
                kyc_data JSONB,
                created_at TIMESTAMP DEFAULT NOW()
            );
            CREATE TABLE IF NOT EXISTS case_timeline (
                id SERIAL PRIMARY KEY,
                incident_code VARCHAR(50) NOT NULL,
                status VARCHAR(80) NOT NULL,
                actor_type VARCHAR(30),
                actor_id INTEGER,
                note TEXT,
                meta JSONB,
                created_at TIMESTAMP DEFAULT NOW()
            );
            CREATE TABLE IF NOT EXISTS case_photos (
                id SERIAL PRIMARY KEY,
                incident_code VARCHAR(50) NOT NULL,
                photo_type VARCHAR(50) NOT NULL,
                file_url TEXT NOT NULL,
                verified BOOLEAN DEFAULT false,
                uploaded_by VARCHAR(30),
                uploader_id INTEGER,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);
        const alters = [
            "ALTER TABLE incidents ADD COLUMN IF NOT EXISTS incident_code VARCHAR(50)",
            "ALTER TABLE incidents ADD COLUMN IF NOT EXISTS animal_type VARCHAR(50)",
            "ALTER TABLE incidents ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,8)",
            "ALTER TABLE incidents ADD COLUMN IF NOT EXISTS longitude DECIMAL(11,8)",
            "ALTER TABLE incidents ADD COLUMN IF NOT EXISTS incident_type VARCHAR(50)",
            "ALTER TABLE incidents ADD COLUMN IF NOT EXISTS ngo_id INTEGER",
            "ALTER TABLE incidents ADD COLUMN IF NOT EXISTS workflow_status VARCHAR(80) DEFAULT 'reported'",
            "ALTER TABLE incidents ADD COLUMN IF NOT EXISTS rep_id INTEGER",
            "ALTER TABLE incidents ADD COLUMN IF NOT EXISTS doctor_id INTEGER",
            "ALTER TABLE incidents ADD COLUMN IF NOT EXISTS injury_type VARCHAR(100)",
            "ALTER TABLE incidents ADD COLUMN IF NOT EXISTS handover_otp VARCHAR(10)",
            "ALTER TABLE incidents ADD COLUMN IF NOT EXISTS dog_tag_id VARCHAR(50)",
            "ALTER TABLE incidents ADD COLUMN IF NOT EXISTS resolution_type VARCHAR(50)",
            "ALTER TABLE incidents ADD COLUMN IF NOT EXISTS release_lat DECIMAL(10,8)",
            "ALTER TABLE incidents ADD COLUMN IF NOT EXISTS release_lng DECIMAL(11,8)",
            "ALTER TABLE incidents ADD COLUMN IF NOT EXISTS release_address TEXT",
            "ALTER TABLE incidents ADD COLUMN IF NOT EXISTS treatment_report TEXT",
            "ALTER TABLE cases ADD COLUMN IF NOT EXISTS workflow_status VARCHAR(80)",
            "ALTER TABLE cases ADD COLUMN IF NOT EXISTS rep_id INTEGER",
            "ALTER TABLE cases ADD COLUMN IF NOT EXISTS doctor_id INTEGER",
            "ALTER TABLE cases ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,8)",
            "ALTER TABLE cases ADD COLUMN IF NOT EXISTS longitude DECIMAL(11,8)",
            "ALTER TABLE notifications ADD COLUMN IF NOT EXISTS rep_id INTEGER",
            "ALTER TABLE incidents ADD COLUMN IF NOT EXISTS ngo_accepted_at TIMESTAMP"
        ];
        for (const sql of alters) await pool.query(sql);
        await pool.query(`
            UPDATE incidents SET ngo_accepted_at = COALESCE(ngo_accepted_at, updated_at, created_at)
            WHERE ngo_id IS NOT NULL AND ngo_accepted_at IS NULL
            AND (
                workflow_status NOT IN ('ngo_assigned', 'reported')
                OR incident_type IN ('ngo_created_case', 'walkin_received')
            )
        `).catch(() => {});
    }

    function haversineKm(lat1, lon1, lat2, lon2) {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    function parseKyc(row) {
        if (!row?.kyc_data) return {};
        return typeof row.kyc_data === 'object' ? row.kyc_data : JSON.parse(row.kyc_data || '{}');
    }

    function normalizeIncidentCode(raw) {
        let c = String(raw || '').trim();
        if (!c) return '';
        c = c.replace(/\s+/g, '');
        if (!/^PB/i.test(c)) c = 'PB' + c;
        return c.toUpperCase();
    }

    async function resolveIncidentByCode(rawCode) {
        const code = normalizeIncidentCode(rawCode);
        if (!code) return null;
        let r = await pool.query('SELECT * FROM incidents WHERE incident_code = $1 OR incident_id::text = $1 LIMIT 1', [code]);
        if (r.rows.length) return r.rows[0];
        r = await pool.query('SELECT * FROM incidents WHERE UPPER(incident_code) = $1 OR UPPER(incident_id::text) = $1 LIMIT 1', [code]);
        return r.rows[0] || null;
    }

    async function findNearestNgo(lat, lng) {
        const active = await pool.query("SELECT id, name, kyc_data, address, city, state FROM ngos WHERE status = 'active'");
        if (!active.rows.length) return null;
        if (lat == null || lng == null || Number.isNaN(Number(lat)) || Number.isNaN(Number(lng))) {
            return active.rows[0];
        }
        const flat = Number(lat);
        const flng = Number(lng);
        let best = null;
        let bestKm = Infinity;
        for (const n of active.rows) {
            const kyc = parseKyc(n);
            const nlat = kyc.latitude ?? kyc.lat ?? kyc.registry_latitude;
            const nlng = kyc.longitude ?? kyc.lng ?? kyc.registry_longitude;
            if (nlat == null || nlng == null) continue;
            const km = haversineKm(flat, flng, Number(nlat), Number(nlng));
            if (km < bestKm) {
                bestKm = km;
                best = { ...n, distance_km: Math.round(km * 10) / 10 };
            }
        }
        return best || active.rows[0];
    }

    function canonicalIncidentCode(row) {
        if (!row) return null;
        return row.incident_code || (row.incident_id != null ? String(row.incident_id) : null);
    }

    async function ensureIncidentCode(row) {
        const code = canonicalIncidentCode(row);
        if (!code) return null;
        if (!row.incident_code && row.incident_id) {
            await pool.query('UPDATE incidents SET incident_code = $1 WHERE id = $2', [code, row.id]);
            row.incident_code = code;
        }
        return code;
    }

    const INCIDENT_SOURCE_LABELS = {
        ngo_created_case: 'Registered by NGO',
        admin_created_case: 'Created by admin',
        customer_report: 'Customer alert',
        walkin_received: 'Walk-in received',
        null: 'Rescue case'
    };

    async function assignNgoToIncident(incidentCode, ngoId, note, options = {}) {
        const row = await resolveIncidentByCode(incidentCode);
        if (!row) return;
        const code = await ensureIncidentCode(row);
        const acceptNow = options.accept === true;
        await pool.query(
            `UPDATE incidents SET ngo_id = $1, workflow_status = $2, ngo_accepted_at = $4, updated_at = NOW()
             WHERE incident_code = $3 OR incident_id::text = $3`,
            [ngoId, 'ngo_assigned', code, acceptNow ? new Date() : null]
        );
        await pool.query('UPDATE cases SET ngo_id = $1, workflow_status = $2 WHERE incident_code = $3', [ngoId, 'ngo_assigned', code]).catch(() => {});
        await addTimeline(code, 'ngo_assigned', 'system', null, note || 'NGO assigned to case');
        if (acceptNow) await addTimeline(code, 'ngo_accepted', options.actorType || 'ngo', ngoId, options.acceptNote || 'NGO accepted the assignment');
    }

    async function markNgoAccepted(incidentCode, ngoId, actorType, note) {
        const row = await resolveIncidentByCode(incidentCode);
        if (!row) throw new Error('Case not found');
        const code = await ensureIncidentCode(row);
        if (Number(row.ngo_id) !== Number(ngoId)) throw new Error('Case is not assigned to this NGO');
        if (row.ngo_accepted_at) return code;
        await pool.query(
            'UPDATE incidents SET ngo_accepted_at = NOW(), updated_at = NOW() WHERE incident_code = $1 OR incident_id::text = $1',
            [code]
        );
        await addTimeline(code, 'ngo_accepted', actorType || 'ngo', ngoId, note || 'NGO accepted the rescue assignment');
        return code;
    }

    async function getIncident(incidentCode) {
        const row = await resolveIncidentByCode(incidentCode);
        return row;
    }

    async function addTimeline(incidentCode, status, actorType, actorId, note, meta) {
        await pool.query(
            'INSERT INTO case_timeline (incident_code, status, actor_type, actor_id, note, meta) VALUES ($1,$2,$3,$4,$5,$6)',
            [incidentCode, status, actorType || null, actorId || null, note || STATUS_LABELS[status] || status, meta ? JSON.stringify(meta) : null]
        );
    }

    async function setWorkflowStatus(incidentCode, status, extra = {}) {
        const row = await resolveIncidentByCode(incidentCode);
        if (!row) throw new Error('Case not found');
        const code = await ensureIncidentCode(row);
        const fields = ['workflow_status = $2', 'updated_at = NOW()'];
        const vals = [code, status];
        let i = 3;
        const map = { ngo_id: 'ngo_id', rep_id: 'rep_id', doctor_id: 'doctor_id', injury_type: 'injury_type',
            handover_otp: 'handover_otp', dog_tag_id: 'dog_tag_id', resolution_type: 'resolution_type',
            treatment_report: 'treatment_report', release_lat: 'release_lat', release_lng: 'release_lng', release_address: 'release_address' };
        for (const [k, col] of Object.entries(map)) {
            if (extra[k] !== undefined && extra[k] !== '' && extra[k] !== null) {
                fields.push(`${col} = $${i++}`);
                vals.push(extra[k]);
            }
        }
        await pool.query(`UPDATE incidents SET ${fields.join(', ')} WHERE incident_code = $1 OR incident_id::text = $1`, vals);
        await pool.query('UPDATE cases SET workflow_status = $1 WHERE incident_code = $2', [status, code]).catch(() => {});
        return code;
    }

    function emitCase(incidentCode, event, payload) {
        io.to('case-' + incidentCode).emit(event, payload);
        io.emit('case-update', { incidentCode, event, ...payload });
    }

    async function enrichCase(row) {
        if (!row) return null;
        const code = canonicalIncidentCode(row);
        const [ngo, rep, doc, reporter, timeline, photos, caseMeta] = await Promise.all([
            row.ngo_id ? pool.query('SELECT id, name, phone, email, prn FROM ngos WHERE id=$1', [row.ngo_id]) : { rows: [] },
            row.rep_id ? pool.query('SELECT id, name, phone, email, rep_id, vehicle_type, last_lat, last_lng, is_online FROM representatives WHERE id=$1', [row.rep_id]) : { rows: [] },
            row.doctor_id ? pool.query('SELECT id, name, phone, email, prn, hospital_name, specialization FROM doctors WHERE id=$1', [row.doctor_id]) : { rows: [] },
            row.user_id ? pool.query('SELECT first_name, last_name, phone_no, email FROM users WHERE id=$1', [row.user_id]) : { rows: [] },
            code ? pool.query('SELECT * FROM case_timeline WHERE incident_code=$1 ORDER BY created_at ASC', [code]) : { rows: [] },
            code ? pool.query('SELECT * FROM case_photos WHERE incident_code=$1 ORDER BY created_at ASC', [code]) : { rows: [] },
            code ? pool.query('SELECT animal_type, location, condition FROM cases WHERE incident_code=$1 LIMIT 1', [code]) : { rows: [] }
        ]);
        const u = reporter.rows[0];
        const cm = caseMeta.rows[0] || {};
        const incidentType = row.incident_type || null;
        return {
            ...row,
            incident_code: code,
            animal_type: row.animal_type || cm.animal_type,
            location: cm.location || row.description,
            description: row.description || cm.location,
            workflow_status: row.workflow_status || WORKFLOW.REPORTED,
            status_label: STATUS_LABELS[row.workflow_status] || row.workflow_status,
            incident_source: incidentType,
            incident_source_label: INCIDENT_SOURCE_LABELS[incidentType] || INCIDENT_SOURCE_LABELS.null,
            can_ngo_manage: Boolean(row.ngo_id),
            ngo_accepted: Boolean(row.ngo_accepted_at),
            ngo_accepted_at: row.ngo_accepted_at || null,
            ngo_acceptance_pending: Boolean(row.ngo_id && !row.ngo_accepted_at),
            ngo: ngo.rows[0] || null,
            representative: rep.rows[0] || null,
            doctor: doc.rows[0] || null,
            reporter: u ? {
                name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Citizen',
                phone: u.phone_no,
                email: u.email
            } : null,
            timeline: timeline.rows,
            photos: photos.rows
        };
    }

    // ─── Representatives: portal registration ───
    app.post('/api/representatives/register', async (req, res) => {
        try {
            const { uid, name, email, phone, ngoId, vehicleType, vehicleNumber, licenseNumber } = req.body;
            const normalizedEmail = email ? String(email).trim().toLowerCase() : '';
            const existing = await pool.query('SELECT * FROM representatives WHERE uid=$1 OR LOWER(email)=$2', [uid, normalizedEmail]);
            if (existing.rows.length) {
                if (existing.rows[0].uid !== uid && (existing.rows[0].uid.startsWith('admin-rep-') || existing.rows[0].uid.startsWith('rep-invite-'))) {
                    const linked = await pool.query('UPDATE representatives SET uid=$1, name=COALESCE($2,name), phone=COALESCE($3,phone) WHERE id=$4 RETURNING *',
                        [uid, name, phone, existing.rows[0].id]);
                    return res.json({ success: true, representative: linked.rows[0], linked: true });
                }
                return res.json({ success: true, representative: existing.rows[0], existed: true });
            }
            const invited = await pool.query(
                `SELECT * FROM representatives WHERE LOWER(email)=$1 AND (uid LIKE 'admin-rep-%' OR uid LIKE 'rep-invite-%') LIMIT 1`,
                [normalizedEmail]
            );
            if (invited.rows.length) {
                const linked = await pool.query(
                    'UPDATE representatives SET uid=$1, name=$2, phone=$3, vehicle_type=COALESCE($4,vehicle_type), vehicle_number=COALESCE($5,vehicle_number), license_number=COALESCE($6,license_number), status=COALESCE(status,$7) WHERE id=$8 RETURNING *',
                    [uid, name, phone, vehicleType, vehicleNumber, licenseNumber, 'portal_registered', invited.rows[0].id]
                );
                await pool.query("UPDATE users SET role='representative', status='pending' WHERE uid=$1", [uid]).catch(() => {});
                return res.json({ success: true, representative: linked.rows[0], linked: true });
            }
            const r = await pool.query(
                `INSERT INTO representatives (uid, ngo_id, name, email, phone, vehicle_type, vehicle_number, license_number, status)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'portal_registered') RETURNING *`,
                [uid, ngoId || null, name, email, phone, vehicleType, vehicleNumber, licenseNumber]
            );
            await pool.query("UPDATE users SET role='representative', status='pending' WHERE uid=$1", [uid]).catch(() => {});
            res.json({ success: true, representative: r.rows[0] });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    app.post('/api/representatives/:uid/kyc', upload.single('selfie'), async (req, res) => {
        try {
            const { ngoId, aadhaar, address } = req.body;
            const selfieUrl = req.file ? `/uploads/${req.file.filename}` : null;
            const kyc = { kyc_submitted: true, selfie_url: selfieUrl, aadhaar, address, submitted_at: new Date().toISOString() };
            const r = await pool.query(
                `UPDATE representatives SET ngo_id=COALESCE($2, ngo_id), kyc_data=$3, status='pending_admin'
                 WHERE uid=$1 RETURNING *`,
                [req.params.uid, ngoId || null, JSON.stringify(kyc)]
            );
            if (!r.rows.length) return res.status(404).json({ error: 'Representative not found' });
            res.json({ success: true, representative: r.rows[0] });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    app.get('/api/representatives/:uid/profile', async (req, res) => {
        try {
            const r = await pool.query(
                `SELECT r.*, n.name as ngo_name, n.prn as ngo_prn FROM representatives r
                 LEFT JOIN ngos n ON r.ngo_id = n.id WHERE r.uid = $1`,
                [req.params.uid]
            );
            if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
            res.json(r.rows[0]);
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    // NGO creates representative invite (pre-account)
    app.post('/api/ngos/:uid/representatives', async (req, res) => {
        try {
            const { name, email, phone, vehicleType, vehicleNumber } = req.body;
            const ngoRes = await pool.query('SELECT id, status FROM ngos WHERE uid=$1', [req.params.uid]);
            if (!ngoRes.rows.length) return res.status(404).json({ error: 'NGO not found' });
            if (ngoRes.rows[0].status !== 'active') return res.status(403).json({ error: 'NGO must be active' });
            const tempUid = `rep-invite-${Date.now()}`;
            const r = await pool.query(
                `INSERT INTO representatives (uid, ngo_id, name, email, phone, vehicle_type, vehicle_number, status)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,'invited') RETURNING *`,
                [tempUid, ngoRes.rows[0].id, name, email, phone, vehicleType, vehicleNumber]
            );
            res.json({ success: true, representative: r.rows[0], inviteMessage: 'Representative must register on portal with this email, complete KYC, then admin approves for app access.' });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    app.get('/api/ngos/:uid/representatives', async (req, res) => {
        try {
            const ngoRes = await pool.query('SELECT id FROM ngos WHERE uid=$1', [req.params.uid]);
            if (!ngoRes.rows.length) return res.status(404).json({ error: 'NGO not found' });
            const r = await pool.query('SELECT * FROM representatives WHERE ngo_id=$1 ORDER BY created_at DESC', [ngoRes.rows[0].id]);
            res.json(r.rows);
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    // Admin pending reps
    app.get('/api/admin/pending-representatives', async (req, res) => {
        try {
            const r = await pool.query(
                `SELECT r.*, n.name as ngo_name FROM representatives r
                 LEFT JOIN ngos n ON r.ngo_id = n.id
                 WHERE r.status IN ('pending_admin', 'portal_registered', 'onboarding') ORDER BY r.created_at DESC`
            );
            res.json(r.rows);
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    app.post('/api/admin/approve-representative', async (req, res) => {
        try {
            const { id, uid } = req.body;
            const repId = 'PB-REP-' + Math.floor(1000 + Math.random() * 9000);
            await pool.query(`UPDATE representatives SET status='active', rep_id=$1 WHERE id=$2`, [repId, id]);
            if (uid) await pool.query("UPDATE users SET status='active' WHERE uid=$1", [uid]);
            const rep = await pool.query('SELECT * FROM representatives WHERE id=$1', [id]);
            if (rep.rows[0]?.email) {
                await sendEmail(rep.rows[0].email, 'PawBandhan App Access Approved',
                    `<h2>You're approved!</h2><p>Your representative ID: <strong>${repId}</strong></p><p>Download the PawBandhan Representative app and sign in.</p>`);
            }
            res.json({ success: true, repId });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    // ─── Case workflow ───
    app.get('/api/workflow/case/:incidentCode', async (req, res) => {
        try {
            const inc = await getIncident(req.params.incidentCode);
            if (!inc) return res.status(404).json({ error: 'Case not found' });
            res.json(await enrichCase(inc));
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    async function assignRepToCase(rawCode, repId, options = {}) {
        const inc = await resolveIncidentByCode(rawCode);
        if (!inc) throw new Error('Case not found');
        const code = await ensureIncidentCode(inc);
        const repRow = await pool.query('SELECT * FROM representatives WHERE id=$1', [repId]);
        if (!repRow.rows.length) throw new Error('Representative not found');
        const rep = repRow.rows[0];
        if (rep.status !== 'active') throw new Error('Representative is not active');

        let ngoId = inc.ngo_id || rep.ngo_id;
        if (options.ngoUid) {
            const n = await pool.query('SELECT id FROM ngos WHERE uid=$1', [options.ngoUid]);
            if (!n.rows.length) throw new Error('NGO not found');
            ngoId = n.rows[0].id;
            if (rep.ngo_id && Number(rep.ngo_id) !== Number(ngoId)) {
                throw new Error('This representative is not registered with your NGO');
            }
        } else if (options.isAdmin && options.ngoId) {
            ngoId = parseInt(options.ngoId, 10);
        }
        if (!ngoId) ngoId = rep.ngo_id;

        const incFresh = await pool.query(
            'SELECT ngo_id, ngo_accepted_at FROM incidents WHERE incident_code = $1 OR incident_id::text = $1 LIMIT 1',
            [code]
        );
        const incRow = incFresh.rows[0] || inc;
        if (options.ngoUid && incRow.ngo_id && !incRow.ngo_accepted_at) {
            throw new Error('Accept this case in your NGO dashboard before dispatching a rescue hero.');
        }

        await setWorkflowStatus(code, WORKFLOW.RINGING_REP, { ngo_id: ngoId, rep_id: repId });
        const actor = options.isAdmin ? 'admin' : 'ngo';
        await addTimeline(code, WORKFLOW.RINGING_REP, actor, options.isAdmin ? null : ngoId, `Representative ${rep.name} assigned`);
        const updated = await enrichCase({ ...inc, workflow_status: WORKFLOW.RINGING_REP, rep_id: repId, ngo_id: ngoId, incident_code: code });
        emitCase(code, 'new-dispatch', {
            incidentCode: code,
            status: WORKFLOW.RINGING_REP,
            repUid: rep.uid,
            incident: updated
        });
        await pool.query(
            'INSERT INTO notifications (rep_id, ngo_id, incident_code, title, message, type) VALUES ($1,$2,$3,$4,$5,$6)',
            [repId, ngoId, code, 'New rescue dispatch!', 'Tap to accept — animal needs help nearby.', 'dispatch_ring']
        ).catch(() => {});
        return { code, status: WORKFLOW.RINGING_REP, case: updated };
    }

    // NGO or admin assigns representative → rings rep app
    app.post('/api/workflow/:incidentCode/assign-rep', async (req, res) => {
        try {
            const { repId, ngoUid, ngoId, actor_type } = req.body;
            if (!repId) return res.status(400).json({ error: 'repId required' });
            const result = await assignRepToCase(req.params.incidentCode, parseInt(repId, 10), {
                ngoUid,
                ngoId,
                isAdmin: actor_type === 'admin' || req.body.isAdmin === true
            });
            res.json({ success: true, ...result });
        } catch (e) { res.status(400).json({ error: e.message }); }
    });

    // Rep accepts
    app.post('/api/workflow/:incidentCode/rep-accept', async (req, res) => {
        try {
            const { repUid } = req.body;
            const rep = await pool.query('SELECT * FROM representatives WHERE uid=$1 AND status=$2', [repUid, 'active']);
            if (!rep.rows.length) return res.status(403).json({ error: 'Representative not active' });
            await setWorkflowStatus(req.params.incidentCode, WORKFLOW.REP_ACCEPTED, { rep_id: rep.rows[0].id });
            await addTimeline(req.params.incidentCode, WORKFLOW.REP_ACCEPTED, 'representative', rep.rows[0].id);
            const inc = await getIncident(req.params.incidentCode);
            emitCase(req.params.incidentCode, 'status-changed', { status: WORKFLOW.REP_ACCEPTED, case: await enrichCase(inc) });
            res.json({ success: true, case: await enrichCase(inc) });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    app.post('/api/workflow/:incidentCode/rep-arrived-incident', async (req, res) => {
        try {
            const { repUid } = req.body;
            await setWorkflowStatus(req.params.incidentCode, WORKFLOW.REP_ARRIVED_INCIDENT);
            const rep = await pool.query('SELECT id FROM representatives WHERE uid=$1', [repUid]);
            await addTimeline(req.params.incidentCode, WORKFLOW.REP_ARRIVED_INCIDENT, 'representative', rep.rows[0]?.id);
            const inc = await getIncident(req.params.incidentCode);
            emitCase(req.params.incidentCode, 'status-changed', { status: WORKFLOW.REP_ARRIVED_INCIDENT, case: await enrichCase(inc) });
            res.json({ success: true });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    app.post('/api/workflow/:incidentCode/photo', upload.single('photo'), async (req, res) => {
        try {
            const { photoType, uploaderType, uploaderUid } = req.body;
            if (!req.file) return res.status(400).json({ error: 'Photo required' });
            const url = `/uploads/${req.file.filename}`;
            let uploaderId = null;
            if (uploaderType === 'representative') {
                const r = await pool.query('SELECT id FROM representatives WHERE uid=$1', [uploaderUid]);
                uploaderId = r.rows[0]?.id;
            } else if (uploaderType === 'doctor') {
                const d = await pool.query('SELECT id FROM doctors WHERE uid=$1', [uploaderUid]);
                uploaderId = d.rows[0]?.id;
            }
            const inc = await getIncident(req.params.incidentCode);
            const reportPhotos = (inc.images || []).map(f => `/uploads/${f}`);
            let verified = photoType !== 'incident_verify';
            if (photoType === 'incident_verify' && reportPhotos.length) {
                verified = true; // simplified match — production would use image hashing/ML
            }
            await pool.query(
                'INSERT INTO case_photos (incident_code, photo_type, file_url, verified, uploaded_by, uploader_id) VALUES ($1,$2,$3,$4,$5,$6)',
                [req.params.incidentCode, photoType, url, verified, uploaderType, uploaderId]
            );
            if (photoType === 'incident_verify' && verified) {
                await setWorkflowStatus(req.params.incidentCode, WORKFLOW.PHOTO_INCIDENT_VERIFIED);
                await addTimeline(req.params.incidentCode, WORKFLOW.PHOTO_INCIDENT_VERIFIED, 'representative', uploaderId, 'Animal photo matched');
            }
            const updated = await getIncident(req.params.incidentCode);
            emitCase(req.params.incidentCode, 'photo-uploaded', { photoType, url, verified, case: await enrichCase(updated) });
            res.json({ success: true, verified, url });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    app.post('/api/workflow/:incidentCode/select-injury', async (req, res) => {
        try {
            const { injuryType, animalType } = req.body;
            await setWorkflowStatus(req.params.incidentCode, WORKFLOW.DOCTOR_REQUESTED, { injury_type: injuryType });
            await addTimeline(req.params.incidentCode, WORKFLOW.DOCTOR_REQUESTED, 'system', null, `Injury: ${injuryType}`);
            const docs = await pool.query(
                `SELECT * FROM doctors WHERE status='active' ORDER BY id ASC LIMIT 5`
            );
            let doctorId = docs.rows[0]?.id;
            if (docs.rows.length > 1) {
                doctorId = docs.rows[Math.floor(Math.random() * docs.rows.length)].id;
            }
            if (doctorId) {
                await setWorkflowStatus(req.params.incidentCode, WORKFLOW.DOCTOR_ASSIGNED, { doctor_id: doctorId });
                await addTimeline(req.params.incidentCode, WORKFLOW.DOCTOR_ASSIGNED, 'system', doctorId);
                await pool.query(
                    'INSERT INTO notifications (doctor_id, incident_code, title, message, type) VALUES ($1,$2,$3,$4,$5)',
                    [doctorId, req.params.incidentCode, 'New case needs approval', `${animalType || 'Animal'} — ${injuryType}`, 'doctor_case']
                );
                emitCase(req.params.incidentCode, 'doctor-assigned', { doctorId });
            }
            res.json({ success: true, doctorId, status: WORKFLOW.DOCTOR_ASSIGNED });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    app.post('/api/workflow/:incidentCode/doctor-approve', async (req, res) => {
        try {
            const { doctorUid } = req.body;
            const doc = await pool.query('SELECT id, kyc_data FROM doctors WHERE uid=$1', [doctorUid]);
            if (!doc.rows.length) return res.status(404).json({ error: 'Doctor not found' });
            const kyc = typeof doc.rows[0].kyc_data === 'object' ? doc.rows[0].kyc_data : {};
            const lat = kyc.latitude || kyc.lat || 19.076;
            const lng = kyc.longitude || kyc.lng || 72.8777;
            await setWorkflowStatus(req.params.incidentCode, WORKFLOW.DOCTOR_APPROVED, { doctor_id: doc.rows[0].id });
            await addTimeline(req.params.incidentCode, WORKFLOW.DOCTOR_APPROVED, 'doctor', doc.rows[0].id);
            const inc = await getIncident(req.params.incidentCode);
            emitCase(req.params.incidentCode, 'status-changed', {
                status: WORKFLOW.DOCTOR_APPROVED,
                doctorLocation: { lat, lng },
                case: await enrichCase(inc)
            });
            res.json({ success: true, doctorLocation: { lat, lng } });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    app.post('/api/workflow/:incidentCode/animal-picked-up', async (req, res) => {
        try {
            await setWorkflowStatus(req.params.incidentCode, WORKFLOW.ANIMAL_PICKED_UP);
            await setWorkflowStatus(req.params.incidentCode, WORKFLOW.EN_ROUTE_DOCTOR);
            await addTimeline(req.params.incidentCode, WORKFLOW.ANIMAL_PICKED_UP, 'representative', null);
            const inc = await getIncident(req.params.incidentCode);
            emitCase(req.params.incidentCode, 'status-changed', { status: WORKFLOW.EN_ROUTE_DOCTOR, case: await enrichCase(inc) });
            res.json({ success: true });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    app.post('/api/workflow/:incidentCode/rep-arrived-doctor', async (req, res) => {
        try {
            const otp = generateOTP();
            await setWorkflowStatus(req.params.incidentCode, WORKFLOW.HANDOVER_OTP_PENDING, { handover_otp: otp });
            await addTimeline(req.params.incidentCode, WORKFLOW.REP_ARRIVED_DOCTOR, 'representative', null);
            const inc = await getIncident(req.params.incidentCode);
            emitCase(req.params.incidentCode, 'otp-generated', { status: WORKFLOW.HANDOVER_OTP_PENDING });
            res.json({ success: true, message: 'Doctor must share OTP with representative', demoOtp: otp });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    app.get('/api/workflow/:incidentCode/handover-otp', async (req, res) => {
        try {
            const inc = await getIncident(req.params.incidentCode);
            if (!inc) return res.status(404).json({ error: 'Not found' });
            res.json({ otp: inc.handover_otp });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    app.post('/api/workflow/:incidentCode/verify-handover-otp', async (req, res) => {
        try {
            const { otp } = req.body;
            const inc = await getIncident(req.params.incidentCode);
            if (!inc || inc.handover_otp !== otp) return res.status(400).json({ error: 'Invalid OTP' });
            await setWorkflowStatus(req.params.incidentCode, WORKFLOW.AT_DOCTOR);
            await addTimeline(req.params.incidentCode, WORKFLOW.AT_DOCTOR, 'representative', inc.rep_id, 'Handover complete');
            emitCase(req.params.incidentCode, 'status-changed', { status: WORKFLOW.AT_DOCTOR, case: await enrichCase(inc) });
            res.json({ success: true });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    app.post('/api/workflow/:incidentCode/treatment-start', async (req, res) => {
        try {
            await setWorkflowStatus(req.params.incidentCode, WORKFLOW.TREATMENT_IN_PROGRESS);
            await addTimeline(req.params.incidentCode, WORKFLOW.TREATMENT_IN_PROGRESS, 'doctor', null);
            res.json({ success: true });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    app.post('/api/workflow/:incidentCode/treatment-complete', async (req, res) => {
        try {
            const { treatmentReport } = req.body;
            await setWorkflowStatus(req.params.incidentCode, WORKFLOW.TREATMENT_COMPLETE, { treatment_report: treatmentReport });
            await addTimeline(req.params.incidentCode, WORKFLOW.TREATMENT_COMPLETE, 'doctor', null, treatmentReport);
            await setWorkflowStatus(req.params.incidentCode, WORKFLOW.PICKUP_REQUESTED);
            const inc = await getIncident(req.params.incidentCode);
            emitCase(req.params.incidentCode, 'status-changed', { status: WORKFLOW.PICKUP_REQUESTED, case: await enrichCase(inc) });
            res.json({ success: true });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    app.post('/api/workflow/:incidentCode/request-pickup', async (req, res) => {
        try {
            const { repId } = req.body;
            await setWorkflowStatus(req.params.incidentCode, WORKFLOW.PICKUP_EN_ROUTE, { rep_id: repId });
            await addTimeline(req.params.incidentCode, WORKFLOW.PICKUP_EN_ROUTE, 'ngo', null);
            const rep = await pool.query('SELECT uid FROM representatives WHERE id=$1', [repId]);
            emitCase(req.params.incidentCode, 'pickup-dispatch', { repUid: rep.rows[0]?.uid });
            res.json({ success: true });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    app.post('/api/workflow/:incidentCode/ngo-receive', async (req, res) => {
        try {
            await setWorkflowStatus(req.params.incidentCode, WORKFLOW.NGO_RECEIVED);
            await addTimeline(req.params.incidentCode, WORKFLOW.NGO_RECEIVED, 'ngo', null);
            res.json({ success: true });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    app.post('/api/workflow/:incidentCode/resolve', async (req, res) => {
        try {
            const { resolutionType, releaseLat, releaseLng, releaseAddress } = req.body;
            const tagId = 'PB-TAG-' + Date.now().toString(36).toUpperCase();
            const finalStatus = resolutionType === 'adopted_ngo' ? WORKFLOW.ADOPTED_NGO : WORKFLOW.RELEASED_SAFE;
            await setWorkflowStatus(req.params.incidentCode, finalStatus, {
                resolution_type: resolutionType,
                dog_tag_id: tagId,
                release_lat: releaseLat,
                release_lng: releaseLng,
                release_address: releaseAddress
            });
            await setWorkflowStatus(req.params.incidentCode, WORKFLOW.RESOLVED);
            await pool.query("UPDATE incidents SET status='resolved' WHERE incident_code=$1", [req.params.incidentCode]);
            await addTimeline(req.params.incidentCode, WORKFLOW.RESOLVED, 'ngo', null, `Dog tag: ${tagId}`);
            const inc = await getIncident(req.params.incidentCode);
            emitCase(req.params.incidentCode, 'case-resolved', { dogTagId: tagId, case: await enrichCase(inc) });
            res.json({ success: true, dogTagId: tagId, qrData: `https://pawbandhan.com/tag/${tagId}` });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    // Lists
    app.get('/api/representatives/:uid/dispatches', async (req, res) => {
        try {
            const rep = await pool.query('SELECT id, status FROM representatives WHERE uid=$1', [req.params.uid]);
            if (!rep.rows.length) return res.json([]);
            if (rep.rows[0].status !== 'active') return res.json([]);
            const ringing = await pool.query(
                `SELECT * FROM incidents WHERE rep_id=$1 AND workflow_status IN ($2,$3) ORDER BY created_at DESC`,
                [rep.rows[0].id, WORKFLOW.RINGING_REP, WORKFLOW.ASSIGNED_REP]
            );
            const active = await pool.query(
                `SELECT * FROM incidents WHERE rep_id=$1 AND workflow_status NOT IN ($2,$3,$4,$5) AND status != 'resolved' ORDER BY updated_at DESC`,
                [rep.rows[0].id, WORKFLOW.RINGING_REP, WORKFLOW.RESOLVED, 'resolved', WORKFLOW.REPORTED]
            );
            const enriched = await Promise.all([...ringing.rows, ...active.rows].map(i => enrichCase(i)));
            res.json(enriched);
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    app.get('/api/doctors/:uid/cases', async (req, res) => {
        try {
            const doc = await pool.query('SELECT id FROM doctors WHERE uid=$1', [req.params.uid]);
            if (!doc.rows.length) return res.json([]);
            const r = await pool.query(
                `SELECT * FROM incidents WHERE doctor_id=$1 AND workflow_status IN ($2,$3,$4,$5,$6) ORDER BY updated_at DESC`,
                [doc.rows[0].id, WORKFLOW.DOCTOR_ASSIGNED, WORKFLOW.DOCTOR_APPROVED, WORKFLOW.AT_DOCTOR, WORKFLOW.TREATMENT_IN_PROGRESS, WORKFLOW.TREATMENT_COMPLETE]
            );
            res.json(await Promise.all(r.rows.map(enrichCase)));
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    app.get('/api/ngos/:uid/workflow-cases/pending', async (req, res) => {
        try {
            const ngo = await pool.query('SELECT id, name FROM ngos WHERE uid=$1', [req.params.uid]);
            if (!ngo.rows.length) return res.json([]);
            const r = await pool.query(
                `SELECT * FROM incidents WHERE ngo_id=$1 AND ngo_accepted_at IS NULL
                 ORDER BY updated_at DESC LIMIT 40`,
                [ngo.rows[0].id]
            );
            res.json(await Promise.all(r.rows.map(enrichCase)));
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    app.get('/api/ngos/:uid/workflow-cases', async (req, res) => {
        try {
            const ngo = await pool.query('SELECT id, name FROM ngos WHERE uid=$1', [req.params.uid]);
            if (!ngo.rows.length) return res.json([]);
            const ngoId = ngo.rows[0].id;
            const r = await pool.query(
                `SELECT * FROM incidents WHERE ngo_id=$1 AND ngo_accepted_at IS NOT NULL
                 ORDER BY updated_at DESC LIMIT 80`,
                [ngoId]
            );
            const enriched = await Promise.all(r.rows.map(enrichCase));
            res.json(enriched.map(c => ({
                ...c,
                ngo_can_edit_status: true,
                ngo_can_assign_rep: c.workflow_status !== 'resolved' && c.ngo_accepted
            })));
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    app.post('/api/ngos/:uid/cases/:incidentCode/accept', async (req, res) => {
        try {
            const ngo = await pool.query('SELECT id, name FROM ngos WHERE uid=$1', [req.params.uid]);
            if (!ngo.rows.length) return res.status(404).json({ error: 'NGO not found' });
            const ngoId = ngo.rows[0].id;
            const row = await resolveIncidentByCode(req.params.incidentCode);
            if (!row) return res.status(404).json({ error: 'Case not found' });
            if (!row.ngo_id || Number(row.ngo_id) !== Number(ngoId)) {
                return res.status(403).json({ error: 'This case is not assigned to your NGO' });
            }
            const code = await markNgoAccepted(row.incident_code || req.params.incidentCode, ngoId, 'ngo', req.body.note || `${ngo.rows[0].name} accepted the rescue`);
            const updated = await enrichCase(await getIncident(code));
            emitCase(code, 'ngo-accepted', { case: updated });
            res.json({ success: true, case: updated });
        } catch (e) { res.status(400).json({ error: e.message }); }
    });

    app.post('/api/ngos/:uid/cases/:incidentCode/decline', async (req, res) => {
        try {
            const ngo = await pool.query('SELECT id FROM ngos WHERE uid=$1', [req.params.uid]);
            if (!ngo.rows.length) return res.status(404).json({ error: 'NGO not found' });
            const ngoId = ngo.rows[0].id;
            const row = await resolveIncidentByCode(req.params.incidentCode);
            if (!row) return res.status(404).json({ error: 'Case not found' });
            if (!row.ngo_id || Number(row.ngo_id) !== Number(ngoId)) {
                return res.status(403).json({ error: 'This case is not assigned to your NGO' });
            }
            if (row.ngo_accepted_at) return res.status(400).json({ error: 'Cannot decline after acceptance' });
            const code = await ensureIncidentCode(row);
            await pool.query(
                `UPDATE incidents SET ngo_id = NULL, ngo_accepted_at = NULL, workflow_status = $2, rep_id = NULL, updated_at = NOW()
                 WHERE incident_code = $1 OR incident_id::text = $1`,
                [code, WORKFLOW.REPORTED]
            );
            await pool.query('UPDATE cases SET ngo_id = NULL, workflow_status = $1 WHERE incident_code = $2', [WORKFLOW.REPORTED, code]).catch(() => {});
            await addTimeline(code, WORKFLOW.REPORTED, 'ngo', ngoId, req.body.reason || 'NGO declined assignment');
            const updated = await enrichCase(await getIncident(code));
            emitCase(code, 'ngo-declined', { case: updated });
            res.json({ success: true, case: updated });
        } catch (e) { res.status(400).json({ error: e.message }); }
    });

    app.get('/api/admin/workflow-cases', async (req, res) => {
        try {
            const r = await pool.query('SELECT * FROM incidents ORDER BY updated_at DESC LIMIT 100');
            res.json(await Promise.all(r.rows.map(enrichCase)));
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    app.get('/api/workflow/tracker-panel', async (req, res) => {
        try {
            const seen = new Set();
            const statusOptions = [];
            for (const [value, label] of Object.entries(STATUS_LABELS)) {
                if (seen.has(value)) continue;
                seen.add(value);
                statusOptions.push({ value, label });
            }
            const portal = req.query.portal || 'admin';
            if (portal === 'ngo' && req.query.ngoUid) {
                const ngoRes = await pool.query('SELECT id FROM ngos WHERE uid=$1', [req.query.ngoUid]);
                if (!ngoRes.rows.length) return res.status(404).json({ error: 'NGO not found' });
                const reps = await pool.query(
                    `SELECT id, name, email, ngo_id, status, rep_id FROM representatives
                     WHERE ngo_id=$1 AND status='active' ORDER BY name`,
                    [ngoRes.rows[0].id]
                );
                return res.json({ statusOptions, reps: reps.rows, ngos: [] });
            }
            const ngos = await pool.query("SELECT id, name FROM ngos WHERE status='active' ORDER BY name");
            const reps = await pool.query(
                `SELECT id, name, email, ngo_id, status, rep_id FROM representatives WHERE status='active' ORDER BY name`
            );
            res.json({ statusOptions, ngos: ngos.rows, reps: reps.rows });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    app.get('/api/workflow/status-options', (req, res) => {
        const seen = new Set();
        const options = [];
        for (const [value, label] of Object.entries(STATUS_LABELS)) {
            if (seen.has(value)) continue;
            seen.add(value);
            options.push({ value, label });
        }
        res.json(options);
    });

    app.get('/api/workflow/case-lookup/:code', async (req, res) => {
        try {
            const row = await resolveIncidentByCode(req.params.code);
            if (!row) return res.status(404).json({ error: 'Case not found' });
            res.json(await enrichCase(row));
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    app.post('/api/workflow/case/:incidentCode/update', async (req, res) => {
        try {
            const code = normalizeIncidentCode(req.params.incidentCode);
            const row = await resolveIncidentByCode(code);
            if (!row) return res.status(404).json({ error: 'Case not found' });
            const { workflow_status, ngo_id, rep_id } = req.body;
            if (!workflow_status) return res.status(400).json({ error: 'workflow_status required' });
            const extra = {};
            if (ngo_id !== undefined && ngo_id !== '' && ngo_id !== null) {
                extra.ngo_id = parseInt(ngo_id, 10);
            }
            if (rep_id !== undefined && rep_id !== '' && rep_id !== null) {
                extra.rep_id = parseInt(rep_id, 10);
            }
            if (ngo_id !== undefined && ngo_id !== '' && ngo_id !== null && Number(ngo_id) !== Number(row.ngo_id)) {
                await pool.query(
                    'UPDATE incidents SET ngo_accepted_at = NULL WHERE incident_code = $1 OR incident_id::text = $1',
                    [code]
                );
                await addTimeline(code, 'ngo_assigned', req.body.actor_type || 'admin', null, 'NGO reassigned — awaiting NGO acceptance');
            }
            const canonCode = await setWorkflowStatus(code, workflow_status, extra);
            await addTimeline(canonCode, workflow_status, req.body.actor_type || 'admin', null, req.body.note || STATUS_LABELS[workflow_status]);
            if (workflow_status === WORKFLOW.RESOLVED || workflow_status === 'resolved') {
                await pool.query("UPDATE incidents SET status = 'resolved' WHERE incident_code = $1 OR incident_id::text = $1", [canonCode]);
            }
            const updated = await getIncident(canonCode);
            emitCase(canonCode, 'status-updated', { case: await enrichCase(updated) });
            res.json({ success: true, case: await enrichCase(updated) });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    app.post('/api/ngos/:uid/receive-walkin', async (req, res) => {
        try {
            const ngoRes = await pool.query('SELECT id, name FROM ngos WHERE uid = $1 LIMIT 1', [req.params.uid]);
            if (!ngoRes.rows.length && req.params.uid !== 'demo-ngo-id') {
                return res.status(404).json({ error: 'NGO not found' });
            }
            let ngoId = ngoRes.rows[0]?.id;
            if (req.params.uid === 'demo-ngo-id') {
                const demo = await pool.query("SELECT id, name FROM ngos WHERE status = 'active' ORDER BY id ASC LIMIT 1");
                ngoId = demo.rows[0]?.id;
            }
            if (!ngoId) return res.status(400).json({ error: 'NGO not active' });
            const row = await resolveIncidentByCode(req.body.incidentCode);
            if (!row) return res.status(404).json({ error: 'Case not found in the system' });
            await assignNgoToIncident(row.incident_code, ngoId, `Walk-in received by NGO`, { accept: true, actorType: 'ngo', acceptNote: 'Walk-in accepted at shelter' });
            await setWorkflowStatus(row.incident_code, WORKFLOW.NGO_RECEIVED, { ngo_id: ngoId });
            await addTimeline(row.incident_code, WORKFLOW.NGO_RECEIVED, 'ngo', ngoId, 'Animal received at NGO (walk-in)');
            const updated = await enrichCase(await getIncident(row.incident_code));
            emitCase(row.incident_code, 'ngo-received', { case: updated });
            res.json({ success: true, incident_code: row.incident_code, case: updated });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    app.post('/api/workflow/auto-assign-ngo/:incidentCode', async (req, res) => {
        try {
            const row = await resolveIncidentByCode(req.params.incidentCode);
            if (!row) return res.status(404).json({ error: 'Case not found' });
            const lat = row.latitude != null ? Number(row.latitude) : null;
            const lng = row.longitude != null ? Number(row.longitude) : null;
            const ngo = await findNearestNgo(lat, lng);
            if (!ngo) return res.json({ success: false, message: 'No active NGO' });
            await assignNgoToIncident(row.incident_code, ngo.id, `Auto-assigned nearest NGO: ${ngo.name}`);
            const updated = await enrichCase(await getIncident(row.incident_code));
            emitCase(row.incident_code, 'ngo-assigned', { case: updated, ngoId: ngo.id });
            res.json({ success: true, ngoId: ngo.id, ngo_name: ngo.name, distance_km: ngo.distance_km || null, case: updated });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    return { initWorkflowSchema, WORKFLOW, STATUS_LABELS, enrichCase, findNearestNgo, assignNgoToIncident, markNgoAccepted, resolveIncidentByCode };
}

module.exports = { registerWorkflowRoutes, WORKFLOW, STATUS_LABELS };
