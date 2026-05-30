/**
 * Full profile views for representatives, NGOs, and veterinarians
 */
function parseKyc(row) {
    if (!row?.kyc_data) return {};
    return typeof row.kyc_data === 'object' ? row.kyc_data : JSON.parse(row.kyc_data || '{}');
}

function registerEntityProfileRoutes(app, pool) {
    async function repCasesStats(repId) {
        const total = await pool.query(
            `SELECT COUNT(*)::int AS n FROM incidents WHERE rep_id = $1`,
            [repId]
        );
        const resolved = await pool.query(
            `SELECT COUNT(*)::int AS n FROM incidents WHERE rep_id = $1 AND workflow_status IN ('resolved','ngo_received','released_safe','adopted_ngo','treatment_complete')`,
            [repId]
        );
        const active = await pool.query(
            `SELECT * FROM incidents WHERE rep_id = $1 AND workflow_status NOT IN ('resolved','released_safe','adopted_ngo') ORDER BY updated_at DESC LIMIT 15`,
            [repId]
        );
        return {
            cases_total: total.rows[0]?.n || 0,
            cases_resolved: resolved.rows[0]?.n || 0,
            recent_cases: active.rows
        };
    }

    async function repActivity(repId) {
        const timeline = await pool.query(
            `SELECT * FROM case_timeline WHERE actor_type IN ('representative','rep') AND actor_id = $1 ORDER BY created_at DESC LIMIT 40`,
            [repId]
        );
        const checkins = await pool.query(
            `SELECT * FROM rep_checkins WHERE rep_id = $1 ORDER BY created_at DESC LIMIT 30`,
            [repId]
        );
        return { timeline: timeline.rows, checkins: checkins.rows };
    }

    function buildRepProfile(row, extras) {
        const kyc = parseKyc(row);
        return {
            ...row,
            kyc_data: kyc,
            kyc_documents: {
                selfie: kyc.selfie_url || kyc.selfieUrl,
                aadhaar: kyc.aadhaar_url || kyc.aadhaarFile,
                pan: kyc.pan_url || kyc.panFile,
                dl: kyc.dl_url || kyc.dlFile,
                address_proof: kyc.address_proof_url || kyc.addressProof
            },
            ...extras
        };
    }

    app.get('/api/admin/representatives/:id/full-profile', async (req, res) => {
        try {
            const r = await pool.query(
                `SELECT r.*, n.name AS ngo_name, n.prn AS ngo_prn FROM representatives r
                 LEFT JOIN ngos n ON r.ngo_id = n.id WHERE r.id = $1`,
                [req.params.id]
            );
            if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
            const rep = r.rows[0];
            const stats = await repCasesStats(rep.id);
            const activity = await repActivity(rep.id);
            const slots = await pool.query('SELECT * FROM rep_timeslots WHERE rep_id=$1 ORDER BY day_of_week', [rep.id]);
            const reviews = await pool.query('SELECT * FROM rep_reviews WHERE rep_id=$1 ORDER BY created_at DESC LIMIT 20', [rep.id]);
            res.json(buildRepProfile(rep, {
                ...stats,
                ...activity,
                timeslots: slots.rows,
                reviews: reviews.rows
            }));
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    app.get('/api/ngos/:uid/representatives/:repId/full-profile', async (req, res) => {
        try {
            const ngo = await pool.query('SELECT id FROM ngos WHERE uid=$1', [req.params.uid]);
            if (!ngo.rows.length) return res.status(404).json({ error: 'NGO not found' });
            const r = await pool.query('SELECT * FROM representatives WHERE id=$1 AND ngo_id=$2', [req.params.repId, ngo.rows[0].id]);
            if (!r.rows.length) return res.status(403).json({ error: 'Representative not in your NGO' });
            const rep = r.rows[0];
            const stats = await repCasesStats(rep.id);
            const activity = await repActivity(rep.id);
            const slots = await pool.query('SELECT * FROM rep_timeslots WHERE rep_id=$1', [rep.id]);
            const reviews = await pool.query('SELECT * FROM rep_reviews WHERE rep_id=$1 ORDER BY created_at DESC LIMIT 20', [rep.id]);
            res.json(buildRepProfile(rep, { ...stats, ...activity, timeslots: slots.rows, reviews: reviews.rows }));
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    app.get('/api/admin/ngos/:id/full-profile', async (req, res) => {
        try {
            const r = await pool.query('SELECT * FROM ngos WHERE id=$1', [req.params.id]);
            if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
            const ngo = r.rows[0];
            const kyc = parseKyc(ngo);
            const reps = await pool.query(
                `SELECT id, name, email, phone, status, rep_id, vehicle_type FROM representatives WHERE ngo_id=$1 ORDER BY created_at DESC`,
                [ngo.id]
            );
            const cases = await pool.query(
                `SELECT incident_code, animal_type, workflow_status, created_at FROM incidents WHERE ngo_id=$1 ORDER BY updated_at DESC LIMIT 30`,
                [ngo.id]
            );
            const caseCount = await pool.query('SELECT COUNT(*)::int AS n FROM incidents WHERE ngo_id=$1', [ngo.id]);
            res.json({
                ...ngo,
                kyc_data: kyc,
                representatives: reps.rows,
                recent_cases: cases.rows,
                cases_total: caseCount.rows[0]?.n || 0
            });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    app.get('/api/ngos/:uid/full-profile', async (req, res) => {
        try {
            const r = await pool.query('SELECT * FROM ngos WHERE uid=$1', [req.params.uid]);
            if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
            const ngo = r.rows[0];
            const kyc = parseKyc(ngo);
            const reps = await pool.query(
                `SELECT id, name, email, phone, status, rep_id FROM representatives WHERE ngo_id=$1`,
                [ngo.id]
            );
            const cases = await pool.query(
                `SELECT incident_code, animal_type, workflow_status, incident_type, created_at FROM incidents WHERE ngo_id=$1 ORDER BY updated_at DESC LIMIT 20`,
                [ngo.id]
            );
            res.json({ ...ngo, kyc_data: kyc, representatives: reps.rows, recent_cases: cases.rows });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    app.get('/api/admin/doctors/:id/full-profile', async (req, res) => {
        try {
            const r = await pool.query('SELECT * FROM doctors WHERE id=$1', [req.params.id]);
            if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
            const doc = r.rows[0];
            const kyc = parseKyc(doc);
            const cases = await pool.query(
                `SELECT incident_code, animal_type, workflow_status, injury_type, treatment_report, created_at
                 FROM incidents WHERE doctor_id=$1 ORDER BY updated_at DESC LIMIT 25`,
                [doc.id]
            );
            const total = await pool.query('SELECT COUNT(*)::int AS n FROM incidents WHERE doctor_id=$1', [doc.id]);
            const timeline = await pool.query(
                `SELECT * FROM case_timeline WHERE actor_type IN ('doctor','vet') AND actor_id=$1 ORDER BY created_at DESC LIMIT 30`,
                [doc.id]
            );
            res.json({
                ...doc,
                kyc_data: kyc,
                cases_total: total.rows[0]?.n || 0,
                recent_cases: cases.rows,
                activity: timeline.rows
            });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    app.get('/api/doctors/:uid/full-profile', async (req, res) => {
        try {
            const r = await pool.query('SELECT * FROM doctors WHERE uid=$1', [req.params.uid]);
            if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
            const doc = r.rows[0];
            const kyc = parseKyc(doc);
            const cases = await pool.query(
                `SELECT incident_code, animal_type, workflow_status, created_at FROM incidents WHERE doctor_id=$1 ORDER BY updated_at DESC LIMIT 15`,
                [doc.id]
            );
            res.json({ ...doc, kyc_data: kyc, recent_cases: cases.rows });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    app.get('/api/admin/representatives-list', async (req, res) => {
        try {
            const r = await pool.query(
                `SELECT id, name, email, ngo_id, status FROM representatives WHERE status='active' ORDER BY name`
            );
            res.json(r.rows);
        } catch (e) { res.status(500).json({ error: e.message }); }
    });
}

module.exports = { registerEntityProfileRoutes };
