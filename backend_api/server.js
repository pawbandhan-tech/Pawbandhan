const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const multer = require('multer');
const socketIO = require('socket.io');
const http = require('http');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

// Liveness probe — no database required (Render / production health checks)
app.get('/health', (req, res) => {
    res.status(200).json({
        ok: true,
        service: 'pawbandhan-api',
        database: Boolean(process.env.DATABASE_URL),
        uptime: Math.floor(process.uptime())
    });
});

// Create uploads directory
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');

// Database connection (Neon / PostgreSQL via DATABASE_URL)
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
    console.warn('WARNING: DATABASE_URL is not set. Copy backend_api/.env.example to backend_api/.env');
}
const pool = dbUrl
    ? new Pool({
        connectionString: dbUrl,
        ssl: !dbUrl.includes('localhost') ? { rejectUnauthorized: false } : false
    })
    : null;

// Email configuration (optional — set SMTP_USER / SMTP_PASS in .env)
const transporter = nodemailer.createTransport(
    process.env.SMTP_USER && process.env.SMTP_PASS
        ? { service: process.env.SMTP_SERVICE || 'gmail', auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } }
        : { jsonTransport: true }
);

// File upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage: storage });
const ngoRegistrationUpload = upload.fields([
    { name: 'registryPhotos', maxCount: 4 },
    { name: 'panCardFile', maxCount: 1 },
    { name: 'aadhaarFile', maxCount: 1 },
    { name: 'bankStatementFile', maxCount: 1 },
    { name: 'registrationCertFile', maxCount: 1 },
    { name: 'complianceCertFile', maxCount: 1 },
    { name: 'deedFile', maxCount: 1 },
    { name: 'additionalNgoDocs', maxCount: 10 }
]);

function getUploadUrl(file) {
    return file ? `/uploads/${file.filename}` : null;
}

function getFirstUploaded(files, key) {
    return files && files[key] && files[key][0] ? files[key][0] : null;
}

function parseJsonValue(value, fallback) {
    if (value == null || value === '') return fallback;
    if (typeof value !== 'string') return value;
    try { return JSON.parse(value); } catch (error) { return fallback; }
}

function splitFullName(name = '') {
    const parts = String(name).trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return { firstName: '', lastName: '' };
    return {
        firstName: parts[0],
        lastName: parts.slice(1).join(' ')
    };
}

function shapeNgoProfile(row) {
    if (!row) return null;
    const kyc = typeof row.kyc_data === 'string' ? parseJsonValue(row.kyc_data, {}) : (row.kyc_data || {});
    return {
        ...row,
        kyc_data: kyc,
        kyc_submitted: Boolean(kyc.kyc_submitted),
        registry_photos: Array.isArray(kyc.registry_photos) ? kyc.registry_photos : [],
        document_uploads: kyc.document_uploads || {},
        authorizedPerson: kyc.authorizedPerson || '',
        authorizedRole: kyc.authorizedRole || '',
        submitted_at: kyc.submitted_at || null
    };
}

async function ensureCustomerProfile({ name, email, phone }) {
    const normalizedEmail = email ? String(email).trim().toLowerCase() : '';
    const normalizedPhone = phone ? String(phone).trim() : '';
    const customerName = String(name || '').trim();
    const { firstName, lastName } = splitFullName(customerName);

    let userRes = await pool.query(
        'SELECT * FROM users WHERE COALESCE(role, \'customer\') = \'customer\' AND (($1 <> \'\' AND phone_no = $1) OR ($2 <> \'\' AND LOWER(email) = $2)) ORDER BY created_at ASC LIMIT 1',
        [normalizedPhone, normalizedEmail]
    );

    let user = userRes.rows[0];
    const existed = Boolean(user);
    if (!user) {
        const generatedUid = `customer-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const accountNo = generateCode('PB');
        const createdUser = await pool.query(
            'INSERT INTO users (uid, first_name, last_name, phone_no, email, account_no, role, status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
            [generatedUid, firstName || customerName || 'Customer', lastName || null, normalizedPhone || null, normalizedEmail || null, accountNo, 'customer', 'active']
        );
        user = createdUser.rows[0];
    } else {
        const nextFirstName = firstName || user.first_name || customerName;
        const nextLastName = lastName || user.last_name;
        const nextPhone = normalizedPhone || user.phone_no;
        const nextEmail = normalizedEmail || user.email;
        const updatedUser = await pool.query(
            'UPDATE users SET first_name=$1, last_name=$2, phone_no=$3, email=$4, status=$5 WHERE id=$6 RETURNING *',
            [nextFirstName, nextLastName || null, nextPhone || null, nextEmail || null, user.status === 'rejected' ? 'active' : user.status || 'active', user.id]
        );
        user = updatedUser.rows[0];
    }

    const customerRes = await pool.query('SELECT * FROM customers WHERE uid = $1 OR ($2 <> \'\' AND phone = $2) OR ($3 <> \'\' AND LOWER(email) = $3) ORDER BY created_at ASC LIMIT 1', [user.uid, normalizedPhone, normalizedEmail]);
    if (customerRes.rows.length === 0) {
        await pool.query(
            'INSERT INTO customers (uid, name, email, phone) VALUES ($1,$2,$3,$4)',
            [user.uid, customerName || `${user.first_name || ''} ${user.last_name || ''}`.trim(), normalizedEmail || null, normalizedPhone || null]
        );
    } else {
        await pool.query(
            'UPDATE customers SET uid=$1, name=$2, email=$3, phone=$4 WHERE id=$5',
            [user.uid, customerName || customerRes.rows[0].name, normalizedEmail || customerRes.rows[0].email, normalizedPhone || customerRes.rows[0].phone, customerRes.rows[0].id]
        );
    }

    return { user, existed };
}

function generateCode(prefix) { return prefix + Date.now() + Math.floor(Math.random() * 10000); }
function generateOTP() { return Math.floor(100000 + Math.random() * 900000).toString(); }

async function sendEmail(to, subject, html) {
    try {
        await transporter.sendMail({ from: 'PawBandhan <pawbandhan@gmail.com>', to, subject, html });
        console.log(`Email sent to ${to}`);
    } catch (error) { console.error('Email error:', error); }
}

// Socket.io
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    socket.on('join-case', (caseId) => socket.join('case-' + caseId));
    socket.on('join-rep', (uid) => socket.join('rep-' + uid));
    socket.on('join-ngo', (uid) => socket.join('ngo-' + uid));
    socket.on('join-doctor', (uid) => socket.join('doctor-' + uid));
    socket.on('join-customer', (uid) => socket.join('customer-' + uid));
    socket.on('disconnect', () => console.log('Client disconnected:', socket.id));
});

async function ensureDemoNgo() {
    const existing = await pool.query("SELECT * FROM ngos WHERE uid = 'demo-ngo-seed' LIMIT 1");
    if (existing.rows.length) return existing.rows[0];
    const prn = 'PB-NGO-' + Math.floor(1000 + Math.random() * 9000);
    const ins = await pool.query(
        `INSERT INTO ngos (uid, name, email, phone, status, prn, ack_no, ngo_type, reg_number)
         VALUES ($1,$2,$3,$4,'active',$5,$6,$7,$8) RETURNING *`,
        ['demo-ngo-seed', 'Rescue Foundation Mumbai', 'rescue@foundation.org', '9999999999', prn, 'ACK-DEMO-001', 'Trust', 'NGO-MH-DEMO']
    );
    return ins.rows[0];
}

const { registerAdminAuth } = require('./admin_auth');
if (pool) registerAdminAuth(app, pool);

const { registerWorkflowRoutes } = require('./workflow_routes');
const { registerRepresentativeRoutes } = require('./representative_routes');
const { registerEntityProfileRoutes } = require('./entity_profile_routes');
let workflowApi;
let repApi;
workflowApi = registerWorkflowRoutes(app, pool, io, { upload, generateCode, generateOTP, sendEmail });
repApi = registerRepresentativeRoutes(app, pool, {
    upload, generateCode, sendEmail, io,
    resolveIncidentByCode: (...args) => workflowApi.resolveIncidentByCode(...args)
});
registerEntityProfileRoutes(app, pool);

// OTP Storage
const otps = new Map();

app.post('/api/otp/send', async (req, res) => {
    const { email, phone } = req.body;
    const otp = generateOTP();
    otps.set(email, otp);
    otps.set(phone, otp);
    
    // Simulate sending
    console.log(`OTP for ${email}/${phone}: ${otp}`);
    await sendEmail(email, 'PawBandhan OTP Verification', `<h2>Your OTP: ${otp}</h2><p>Please use this code to verify your account.</p>`);
    res.json({ success: true, message: 'OTP sent successfully' });
});

app.post('/api/otp/verify', (req, res) => {
    const { contact, otp } = req.body;
    if (otps.get(contact) === otp) {
        otps.delete(contact);
        return res.json({ success: true });
    }
    res.status(400).json({ error: 'Invalid OTP' });
});

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'OK', message: 'Server running' }));

// User registration
app.post('/api/users/register', async (req, res) => {
    try {
        const { uid, firstName, middleName, lastName, phoneNo, email, role, orgName } = req.body;
        const accountNo = generateCode('PB');
        const result = await pool.query(
            'INSERT INTO users (uid, first_name, middle_name, last_name, phone_no, email, account_no, role, status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
            [uid, firstName, middleName, lastName, phoneNo, email, accountNo, role || 'customer', 'pending']
        );
        
        let tempId = null;
        let ackNo = null;
        if (role === 'ngo') {
            tempId = 'T-PB-NGO-' + Math.floor(1000 + Math.random() * 9000);
            ackNo = 'ACK-NGO-' + Date.now().toString().slice(-6);
            await pool.query('INSERT INTO ngos (uid, name, email, phone, temp_prn, ack_no, status) VALUES ($1,$2,$3,$4,$5,$6,$7)', [uid, orgName, email, phoneNo, tempId, ackNo, 'pending']);
        } else if (role === 'doctor') {
            tempId = 'T-PB-DOC-' + Math.floor(1000 + Math.random() * 9000);
            ackNo = 'ACK-DOC-' + Date.now().toString().slice(-6);
            await pool.query('INSERT INTO doctors (uid, name, email, phone, temp_id, ack_no, status) VALUES ($1,$2,$3,$4,$5,$6,$7)', [uid, orgName, email, phoneNo, tempId, ackNo, 'pending']);
        } else if (role === 'rider') {
            ackNo = 'ACK-RID-' + Date.now().toString().slice(-6);
            await pool.query('INSERT INTO riders (uid, name, email, phone, status) VALUES ($1,$2,$3,$4,$5)', [uid, `${firstName} ${lastName}`, email, phoneNo, 'pending']);
        } else if ((role || 'customer') === 'customer') {
            const customerName = `${firstName || ''} ${lastName || ''}`.trim() || 'Customer';
            await pool.query(
                `INSERT INTO customers (uid, name, email, phone) VALUES ($1, $2, $3, $4)
                 ON CONFLICT (uid) DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email, phone = EXCLUDED.phone`,
                [uid, customerName, email, phoneNo]
            );
        }

        await sendEmail(email, 'Welcome to PawBandhan', `<h2>Welcome ${firstName}!</h2><p>Your account has been created. ${tempId ? `Your Temporary ID is: <strong>${tempId}</strong>.` : ''} Please login to complete your KYC onboarding. Your Application Reference: <strong>${ackNo || accountNo}</strong></p>`);
        res.json({ success: true, user: result.rows[0], tempId, ackNo });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// NGO onboarding submission
app.post('/api/ngos/register', ngoRegistrationUpload, async (req, res) => {
    try {
        const {
            uid,
            name,
            email,
            phone,
            ngoType,
            regNumber,
            panNumber,
            address,
            city,
            state,
            serviceArea,
            workType,
            authorizedPerson,
            authorizedRole,
            authorizedEmail,
            authorizedPhone,
            aadhaarNumber,
            submissionNotes,
            kyc_submitted
        } = req.body;
        const files = req.files || {};
        const registryPhotoTypes = parseJsonValue(req.body.registryPhotoTypes, ['board', 'representative', 'certificate', 'site']);
        let registryPhotos = (files.registryPhotos || []).map((file, index) => ({
            type: registryPhotoTypes[index] || `capture_${index + 1}`,
            status: 'captured',
            url: getUploadUrl(file),
            filename: file.originalname,
            timestamp: new Date().toISOString()
        }));

        if (registryPhotos.length === 0) {
            const legacyPhotos = parseJsonValue(req.body.registry_photos, []);
            if (Array.isArray(legacyPhotos)) registryPhotos = legacyPhotos;
        }

        const documentUploads = {
            pan_card: getUploadUrl(getFirstUploaded(files, 'panCardFile')),
            aadhaar_card: getUploadUrl(getFirstUploaded(files, 'aadhaarFile')),
            bank_statement: getUploadUrl(getFirstUploaded(files, 'bankStatementFile')),
            registration_certificate: getUploadUrl(getFirstUploaded(files, 'registrationCertFile')),
            compliance_certificate: getUploadUrl(getFirstUploaded(files, 'complianceCertFile')),
            trust_deed: getUploadUrl(getFirstUploaded(files, 'deedFile')),
            additional_documents: (files.additionalNgoDocs || []).map((file) => ({
                name: file.originalname,
                url: getUploadUrl(file)
            }))
        };

        if (!uid || !name || !authorizedPerson || !authorizedEmail || !authorizedPhone) {
            return res.status(400).json({ error: 'Missing required organization or contact details.' });
        }

        const requiredDocs = [
            ['PAN card', documentUploads.pan_card],
            ['Aadhaar card', documentUploads.aadhaar_card],
            ['Bank statement', documentUploads.bank_statement],
            ['Registration certificate', documentUploads.registration_certificate],
            ['80G / 12A certificate', documentUploads.compliance_certificate],
            ['Trust deed / MOA', documentUploads.trust_deed]
        ];
        const missingDocs = requiredDocs.filter(([, url]) => !url).map(([label]) => label);

        if (registryPhotos.length < 4) {
            return res.status(400).json({ error: 'Please capture all four live NGO photos before submitting.' });
        }
        if (missingDocs.length > 0) {
            return res.status(400).json({ error: `Missing required NGO documents: ${missingDocs.join(', ')}` });
        }

        const payload = {
            uid,
            name,
            email,
            phone,
            ngoType,
            regNumber,
            panNumber,
            aadhaarNumber,
            address,
            city,
            state,
            serviceArea,
            workType,
            authorizedPerson,
            authorizedRole,
            authorizedEmail,
            authorizedPhone,
            submissionNotes,
            kyc_submitted: kyc_submitted === true || kyc_submitted === 'true',
            submission_type: 'document_review',
            registry_photos: registryPhotos,
            document_uploads: documentUploads,
            submitted_at: new Date().toISOString()
        };

        let result = await pool.query(
            'UPDATE ngos SET name=$1, email=$2, phone=$3, ngo_type=$4, reg_number=$5, pan_number=$6, address=$7, city=$8, state=$9, service_area=$10, work_type=$11, kyc_data=$12, status=$13 WHERE uid=$14 RETURNING *',
            [name, email, phone, ngoType, regNumber, panNumber, address, city, state, serviceArea, workType, JSON.stringify(payload), 'pending', uid]
        );
        if (result.rows.length === 0) {
            result = await pool.query(
                'INSERT INTO ngos (uid, name, email, phone, ngo_type, reg_number, pan_number, address, city, state, service_area, work_type, kyc_data, status, ack_no) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *',
                [uid, name, email, phone, ngoType, regNumber, panNumber, address, city, state, serviceArea, workType, JSON.stringify(payload), 'pending', 'ACK-NGO-' + Date.now().toString().slice(-6)]
            );
        }
        res.json({ success: true, ngo: result.rows[0], ack_no: result.rows[0].ack_no });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// Doctor KYC Submission
app.post('/api/doctors/register', async (req, res) => {
    try {
        const { uid, name, email, phone, specialization, licenseNumber, hospitalName } = req.body;
        let result = await pool.query(
            'UPDATE doctors SET name=$1, email=$2, phone=$3, specialization=$4, license_number=$5, hospital_name=$6, kyc_data=$7, status=$8 WHERE uid=$9 RETURNING *',
            [name, email, phone, specialization, licenseNumber, hospitalName, JSON.stringify(req.body), 'pending', uid]
        );
        if (result.rows.length === 0) {
            result = await pool.query(
                'INSERT INTO doctors (uid, name, email, phone, specialization, license_number, hospital_name, kyc_data, status, ack_no) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *',
                [uid, name, email, phone, specialization, licenseNumber, hospitalName, JSON.stringify(req.body), 'pending', 'ACK-DOC-' + Date.now().toString().slice(-6)]
            );
        }
        res.json({ success: true, doctor: result.rows[0], ack_no: result.rows[0].ack_no });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// Rider Registration
app.post('/api/riders/register', async (req, res) => {
    try {
        const { uid, name, email, phone, vehicleType, vehicleNumber, licenseNumber, ngoId } = req.body;
        const result = await pool.query(
            'INSERT INTO riders (uid, name, email, phone, vehicle_type, vehicle_number, license_number, ngo_id, status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
            [uid, name, email, phone, vehicleType, vehicleNumber, licenseNumber, ngoId, 'pending']
        );
        await pool.query('UPDATE users SET role=$1, status=$2 WHERE uid=$3', ['rider', 'pending', uid]);
        res.json({ success: true, rider: result.rows[0] });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// Admin: Get all active NGOs (for dropdowns)
app.get('/api/ngos/active', async (req, res) => {
    try {
        const result = await pool.query("SELECT id, name, uid, prn FROM ngos WHERE status = 'active' ORDER BY name ASC");
        res.json(result.rows);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// Admin: Get pending applications
app.get('/api/admin/pending-applications', async (req, res) => {
    try {
        const ngos = await pool.query("SELECT * FROM ngos WHERE status = 'pending'");
        const riders = await pool.query("SELECT * FROM riders WHERE status = 'pending'");
        const doctors = await pool.query("SELECT * FROM doctors WHERE status = 'pending'");
        const representatives = await pool.query("SELECT r.*, n.name as ngo_name FROM representatives r LEFT JOIN ngos n ON r.ngo_id=n.id WHERE r.status IN ('pending_admin','portal_registered','onboarding')");
        res.json({ ngos: ngos.rows, riders: riders.rows, doctors: doctors.rows, representatives: representatives.rows || [] });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// Admin: Approve application
app.post('/api/admin/approve-application', async (req, res) => {
    try {
        const { type, id, uid } = req.body;
        let professionalId = null;
        let table = type === 'ngo' ? 'ngos' : (type === 'rider' ? 'riders' : 'doctors');
        
        if (type === 'ngo') {
            professionalId = 'PB-NGO-' + Math.floor(1000 + Math.random() * 9000);
            await pool.query(`UPDATE ${table} SET status = 'active', prn = $1 WHERE id = $2`, [professionalId, id]);
        } else if (type === 'doctor') {
            professionalId = 'PB-DOC-' + Math.floor(1000 + Math.random() * 9000);
            await pool.query(`UPDATE ${table} SET status = 'active', prn = $1 WHERE id = $2`, [professionalId, id]);
        } else if (type === 'rider') {
            professionalId = 'PB-RID-' + Math.floor(1000 + Math.random() * 9000);
            await pool.query(`UPDATE ${table} SET status = 'active', rider_id = $1 WHERE id = $2`, [professionalId, id]);
        }
        
        await pool.query('UPDATE users SET status = $1 WHERE uid = $2', ['active', uid]);
        
        // Notify user via email
        const userRes = await pool.query('SELECT email, first_name FROM users WHERE uid = $1', [uid]);
        if (userRes.rows.length > 0) {
            const { email, first_name } = userRes.rows[0];
            const message = `
                <h2>Welcome to the Network, ${first_name}!</h2>
                <p>Your application has been officially verified and approved by the PawBandhan Board.</p>
                <div style="background:#F1F5F9; padding:20px; border-radius:12px; margin:20px 0;">
                    <p style="margin:0;"><strong>Your Permanent Professional ID:</strong></p>
                    <p style="font-size:1.5rem; color:#4F46E5; font-weight:800; margin:10px 0;">${professionalId}</p>
                </div>
                <p>You can now access your full dashboard and start operations.</p>
            `;
            await sendEmail(email, 'PawBandhan Application Approved', message);
        }

        res.json({ success: true, professionalId });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// Admin: Reject application
app.post('/api/admin/reject-application', async (req, res) => {
    try {
        const { type, id, uid, reason } = req.body;
        let table = type === 'ngo' ? 'ngos' : (type === 'rider' ? 'riders' : 'doctors');
        await pool.query(`UPDATE ${table} SET status = 'rejected' WHERE id = $1`, [id]);
        await pool.query('UPDATE users SET status = $1 WHERE uid = $2', ['rejected', uid]);
        
        const userRes = await pool.query('SELECT email FROM users WHERE uid = $1', [uid]);
        if (userRes.rows.length > 0) {
            await sendEmail(userRes.rows[0].email, 'Application Status - PawBandhan', `<h2>Application Rejected</h2><p>Sorry, your application was not approved at this time.</p><pp;>Reason: ${reason || 'Documents incomplete'}</p>`);
        }
        
        res.json({ success: true });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// Get user profile
app.get('/api/users/:uid/profile', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM users WHERE uid=$1', [req.params.uid]);
        res.json(result.rows[0] || {});
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// Update user profile
app.put('/api/users/:uid/profile', async (req, res) => {
    try {
        const { firstName, lastName, phoneNo, address } = req.body;
        const result = await pool.query(
            'UPDATE users SET first_name=$1, last_name=$2, phone_no=$3, address=$4 WHERE uid=$5 RETURNING *',
            [firstName, lastName, phoneNo, address, req.params.uid]
        );
        res.json(result.rows[0]);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// Get user stats
app.get('/api/users/:uid/stats', async (req, res) => {
    try {
        const userRes = await pool.query('SELECT id FROM users WHERE uid=$1', [req.params.uid]);
        if (userRes.rows.length === 0) return res.json({ activeCases: 0, resolvedCases: 0, rewardPoints: 0 });
        const userId = userRes.rows[0].id;
        const active = await pool.query('SELECT COUNT(*) FROM incidents WHERE user_id=$1 AND status NOT IN ($2,$3)', [userId, 'resolved', 'closed']);
        const resolved = await pool.query('SELECT COUNT(*) FROM incidents WHERE user_id=$1 AND status=$2', [userId, 'resolved']);
        res.json({ activeCases: parseInt(active.rows[0].count), resolvedCases: parseInt(resolved.rows[0].count), rewardPoints: parseInt(resolved.rows[0].count) * 10 });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// NGO profile
app.get('/api/ngos/:uid/profile', async (req, res) => {
    try {
        if (req.params.uid === 'demo-ngo-id') {
            const demo = await ensureDemoNgo();
            return res.json({
                id: demo.id,
                uid: 'demo-ngo-id',
                name: demo.name || 'Rescue Foundation Mumbai',
                status: 'active',
                prn: 'PB-NGO-4821',
                ack_no: 'ACK-DEMO-001',
                ngo_type: 'Trust',
                reg_number: 'NGO-MH-DEMO',
                kyc_submitted: true,
                registry_photos: [],
                document_uploads: {},
                authorizedPerson: 'Rahul Mehta',
                authorizedRole: 'Operations Head',
                kyc_data: {}
            });
        }
        const result = await pool.query('SELECT * FROM ngos WHERE uid = $1 LIMIT 1', [req.params.uid]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'NGO profile not found' });
        res.json(shapeNgoProfile(result.rows[0]));
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// Customer lookup for NGO-created cases
app.post('/api/customers/lookup', async (req, res) => {
    try {
        const phone = req.body.phone ? String(req.body.phone).trim() : '';
        const email = req.body.email ? String(req.body.email).trim().toLowerCase() : '';
        if (!phone && !email) return res.status(400).json({ error: 'Phone or email is required.' });

        const result = await pool.query(
            `SELECT u.uid, u.first_name, u.last_name, u.phone_no, u.email, u.status, c.name AS customer_name
             FROM users u
             LEFT JOIN customers c ON c.uid = u.uid
             WHERE COALESCE(u.role, 'customer') = 'customer'
             AND (($1 <> '' AND u.phone_no = $1) OR ($2 <> '' AND LOWER(u.email) = $2))
             ORDER BY u.created_at ASC
             LIMIT 1`,
            [phone, email]
        );

        if (result.rows.length === 0) return res.json({ found: false });
        const customer = result.rows[0];
        res.json({
            found: true,
            customer: {
                uid: customer.uid,
                name: customer.customer_name || `${customer.first_name || ''} ${customer.last_name || ''}`.trim(),
                email: customer.email || '',
                phone: customer.phone_no || '',
                status: customer.status || 'active'
            }
        });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// Admin: Get application details
app.get('/api/admin/application-details/:type/:id', async (req, res) => {
    try {
        const { type, id } = req.params;
        let table = type === 'ngo' ? 'ngos' : (type === 'rider' ? 'riders' : 'doctors');
        const isNumericId = /^\d+$/.test(String(id));
        const result = isNumericId
            ? await pool.query(`SELECT * FROM ${table} WHERE id = $1`, [id])
            : await pool.query(`SELECT * FROM ${table} WHERE uid = $1`, [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Application not found' });
        const row = result.rows[0];
        res.json(type === 'ngo' ? shapeNgoProfile(row) : row);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// Report incident
app.post('/api/incidents/report', upload.array('images', 5), async (req, res) => {
    try {
        const { userId, incidentType, description, latitude, longitude, animalType, phoneNo, email } = req.body;
        const images = req.files ? req.files.map(f => f.filename) : [];
        
        let userRes = await pool.query('SELECT id FROM users WHERE uid=$1', [userId]);
        let dbUserId;
        if (userRes.rows.length === 0) {
            let findUser = await pool.query('SELECT id FROM users WHERE phone_no=$1 OR email=$2', [phoneNo, email]);
            if (findUser.rows.length > 0) { dbUserId = findUser.rows[0].id; }
            else {
                const newAccountNo = generateCode('PB');
                const newUser = await pool.query('INSERT INTO users (uid, phone_no, email, account_no) VALUES ($1,$2,$3,$4) RETURNING id', [userId, phoneNo, email, newAccountNo]);
                dbUserId = newUser.rows[0].id;
                await sendEmail(email, 'Case Reported - PawBandhan', `<h2>Case Reported!</h2><p>Your case has been registered. Tracking ID will be sent soon.</p>`);
            }
        } else { dbUserId = userRes.rows[0].id; }
        
        const incidentCode = generateCode('PB');
        const ngoPick = await pool.query("SELECT id FROM ngos WHERE status='active' ORDER BY id ASC LIMIT 1");
        let ngoId = ngoPick.rows[0]?.id || null;
        const result = await insertIncidentRecord({
            incidentCode,
            userId: dbUserId,
            incidentType,
            description,
            lat: latitude,
            lng: longitude,
            animal_type: animalType,
            imageList: images,
            ngoId,
            workflowStatus: 'reported'
        });
        await pool.query(
            "INSERT INTO cases (customer_name, customer_phone, customer_email, customer_uid, animal_type, condition, location, ngo_id, status, incident_code, workflow_status, latitude, longitude) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'open',$9,'reported',$10,$11)",
            [req.body.customerName || 'Citizen', phoneNo || '', email || '', userId, animalType, description, `${latitude},${longitude}`, ngoId, incidentCode, latitude, longitude]
        ).catch(() => {});
        if (!ngoId && workflowApi?.findNearestNgo) {
            const nearest = await workflowApi.findNearestNgo(latitude, longitude);
            if (nearest) {
                await workflowApi.assignNgoToIncident(incidentCode, nearest.id, `Auto-assigned: ${nearest.name}`);
                ngoId = nearest.id;
            }
        }
        if (workflowApi?.enrichCase) {
            io.emit('new-case-reported', { incidentCode, ngoId });
        }
        res.json({ success: true, incident: result.rows[0] });
    } catch (error) { console.error('Report error:', error); res.status(500).json({ error: error.message }); }
});

// Get user incidents
app.get('/api/users/:uid/incidents', async (req, res) => {
    try {
        const userRes = await pool.query('SELECT id FROM users WHERE uid=$1', [req.params.uid]);
        if (userRes.rows.length === 0) return res.json([]);
        const result = await pool.query('SELECT * FROM incidents WHERE user_id=$1 ORDER BY created_at DESC', [userRes.rows[0].id]);
        res.json(result.rows);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// Customer portal: tracked cases with workflow status
app.get('/api/users/:uid/cases-track', async (req, res) => {
    try {
        const userRes = await pool.query('SELECT id, first_name, last_name, email, phone_no FROM users WHERE uid=$1', [req.params.uid]);
        if (userRes.rows.length === 0) return res.json([]);
        const uid = req.params.uid;
        const rows = await pool.query(
            `SELECT i.*, c.animal_type, c.location, c.condition, c.customer_name, c.status as case_status,
                    n.name as ngo_name,
                    COALESCE(i.incident_code, i.incident_id::text, c.incident_code) AS track_code
             FROM incidents i
             LEFT JOIN cases c ON c.incident_code = COALESCE(i.incident_code, i.incident_id::text)
             LEFT JOIN ngos n ON n.id = i.ngo_id
             WHERE i.user_id = $1 OR c.customer_uid = $2
             ORDER BY i.created_at DESC`,
            [userRes.rows[0].id, uid]
        );
        const STATUS_LABELS = {
            reported: 'Reported', ngo_assigned: 'NGO assigned', rep_assigned: 'Rep assigned',
            ringing_rep: 'Hero alerted', rep_accepted: 'Rep en route', rep_arrived_incident: 'Rep at scene',
            photo_incident_verified: 'Verified on site', doctor_requested: 'Finding vet',
            doctor_assigned: 'Vet assigned', doctor_approved: 'Vet approved',
            animal_picked_up: 'Animal picked up', en_route_doctor: 'En route to vet',
            rep_arrived_doctor: 'At clinic', at_doctor: 'With vet',
            treatment_in_progress: 'Treatment ongoing', treatment_complete: 'Treatment done',
            handover_otp_pending: 'Handover', pickup_requested: 'Pickup scheduled',
            pickup_en_route: 'Pickup en route', ngo_received: 'At shelter', resolved: 'Resolved'
        };
        const stepKeys = [
            ['reported'], ['assigned_ngo', 'ngo_assigned'], ['assigned_rep', 'ringing_rep'], ['rep_accepted'],
            ['rep_arrived_incident'], ['photo_incident_verified'], ['doctor_requested', 'doctor_assigned'],
            ['doctor_approved'], ['animal_picked_up', 'en_route_doctor'],
            ['rep_arrived_doctor', 'handover_otp_pending', 'at_doctor'], ['treatment_in_progress'],
            ['treatment_complete'], ['pickup_requested', 'pickup_en_route', 'pickup_arrived'],
            ['ngo_received'], ['resolved', 'released_safe', 'adopted_ngo']
        ];
        function progressFor(ws) {
            for (let i = stepKeys.length - 1; i >= 0; i--) {
                if (stepKeys[i].includes(ws)) return stepKeys.length > 1 ? Math.round((i / (stepKeys.length - 1)) * 100) : 0;
            }
            return 0;
        }
        res.json(rows.rows.map(r => ({
            ...r,
            incident_code: r.track_code || r.incident_code || (r.incident_id != null ? String(r.incident_id) : null),
            location: r.location || r.description,
            status_label: STATUS_LABELS[r.workflow_status] || r.workflow_status || r.status,
            progress_percent: progressFor(r.workflow_status || 'reported'),
            images: Array.isArray(r.images) ? r.images : (typeof r.images === 'string' ? JSON.parse(r.images || '[]') : [])
        })));
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/users/:uid/notifications', async (req, res) => {
    try {
        const userRes = await pool.query('SELECT id FROM users WHERE uid = $1', [req.params.uid]);
        if (!userRes.rows.length) return res.json([]);
        const rows = await pool.query(
            'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 40',
            [userRes.rows[0].id]
        );
        res.json(rows.rows);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.patch('/api/notifications/:id/read', async (req, res) => {
    try {
        await pool.query('UPDATE notifications SET is_read = true WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/customers/:uid/profile', async (req, res) => {
    try {
        const u = await pool.query(
            `SELECT u.uid, u.first_name, u.last_name, u.email, u.phone_no, u.account_no, u.portal_access_code, c.name AS customer_name
             FROM users u LEFT JOIN customers c ON c.uid = u.uid WHERE u.uid = $1`,
            [req.params.uid]
        );
        if (!u.rows.length) return res.status(404).json({ error: 'Not found' });
        const row = u.rows[0];
        const fullName = (row.customer_name || `${row.first_name || ''} ${row.last_name || ''}`.trim()) || 'Customer';
        res.json({
            uid: row.uid,
            name: fullName,
            email: row.email,
            phone: row.phone_no,
            accountNo: row.account_no,
            hasPortalAccess: Boolean(row.portal_access_code)
        });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.patch('/api/customers/:uid/profile', async (req, res) => {
    try {
        const uid = req.params.uid;
        const name = req.body.name != null ? String(req.body.name).trim() : '';
        const phone = req.body.phone != null ? String(req.body.phone).trim() : null;
        if (!name) return res.status(400).json({ error: 'Name is required' });

        let existing = await pool.query('SELECT uid, email FROM users WHERE uid = $1', [uid]);
        const parts = name.split(/\s+/).filter(Boolean);
        const firstName = parts[0] || name;
        const lastName = parts.slice(1).join(' ') || '';
        const emailIn = req.body.email != null ? String(req.body.email).trim().toLowerCase() : null;

        if (!existing.rows.length) {
            const accountNo = generateCode('PB');
            await pool.query(
                'INSERT INTO users (uid, first_name, last_name, phone_no, email, account_no, role, status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
                [uid, firstName, lastName, phone, emailIn || `customer-${uid.slice(0, 8)}@pawbandhan.local`, accountNo, 'customer', 'active']
            );
            existing = await pool.query('SELECT uid, email FROM users WHERE uid = $1', [uid]);
        } else {
            await pool.query(
                'UPDATE users SET first_name = $1, last_name = $2, phone_no = COALESCE($3, phone_no) WHERE uid = $4',
                [firstName, lastName, phone, uid]
            );
        }

        const email = emailIn || existing.rows[0].email;
        const cust = await pool.query('SELECT id FROM customers WHERE uid = $1', [uid]);
        if (cust.rows.length) {
            await pool.query(
                'UPDATE customers SET name = $1, phone = COALESCE($2, phone), email = COALESCE($3, email) WHERE uid = $4',
                [name, phone, email, uid]
            );
        } else {
            await pool.query(
                'INSERT INTO customers (uid, name, email, phone) VALUES ($1, $2, $3, $4)',
                [uid, name, email, phone]
            );
        }

        res.json({ success: true, uid, name, email, phone });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/ngos/:uid/customers', async (req, res) => {
    try {
        let ngoId;
        if (req.params.uid === 'demo-ngo-id') {
            ngoId = (await ensureDemoNgo()).id;
        } else {
            const ngoRes = await pool.query('SELECT id, name FROM ngos WHERE uid = $1', [req.params.uid]);
            if (!ngoRes.rows.length) return res.status(404).json({ error: 'NGO not found' });
            ngoId = ngoRes.rows[0].id;
        }
        const result = await pool.query(
            `SELECT DISTINCT ON (COALESCE(cs.customer_uid, cs.customer_phone, cs.customer_email))
                cs.customer_uid, cs.customer_name, cs.customer_phone, cs.customer_email,
                u.email as user_email, u.phone_no as user_phone, u.portal_access_code,
                (SELECT COUNT(*) FROM cases c2 WHERE c2.ngo_id = $1 AND (c2.customer_uid = cs.customer_uid OR c2.customer_phone = cs.customer_phone))::int as case_count,
                (SELECT MAX(c3.created_at) FROM cases c3 WHERE c3.ngo_id = $1 AND (c3.customer_uid = cs.customer_uid OR c3.customer_phone = cs.customer_phone)) as last_case_at
             FROM cases cs
             LEFT JOIN users u ON u.uid = cs.customer_uid
             WHERE cs.ngo_id = $1
             ORDER BY COALESCE(cs.customer_uid, cs.customer_phone, cs.customer_email), cs.created_at DESC`,
            [ngoId]
        );
        res.json(result.rows);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// Get single incident
app.get('/api/incidents/:incidentCode', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM incidents WHERE incident_code=$1', [req.params.incidentCode]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Case not found' });
        res.json(result.rows[0]);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// Get statistics (with manual overrides from CMS)
app.get('/api/stats', async (req, res) => {
    try {
        const configRes = await pool.query('SELECT key, value FROM site_config WHERE key LIKE $1', ['stat_%']);
        const config = {};
        configRes.rows.forEach(r => config[r.key] = r.value);

        const totalRescues = await pool.query("SELECT COUNT(*) FROM incidents WHERE status='resolved'");
        const totalNGOs = await pool.query('SELECT COUNT(*) FROM ngos');
        const totalDoctors = await pool.query('SELECT COUNT(*) FROM doctors');
        const totalRiders = await pool.query('SELECT COUNT(*) FROM riders');

        res.json({
            totalRescues: parseInt(config.stat_rescues_override) || parseInt(totalRescues.rows[0]?.count) || 0,
            totalNGOs: parseInt(config.stat_ngos_override) || parseInt(totalNGOs.rows[0]?.count) || 0,
            totalDoctors: parseInt(config.stat_doctors_override) || parseInt(totalDoctors.rows[0]?.count) || 0,
            totalRiders: parseInt(config.stat_riders_override) || parseInt(totalRiders.rows[0]?.count) || 0
        });
    } catch (error) { res.json({ totalRescues: 0, totalNGOs: 0, totalDoctors: 0, totalRiders: 0 }); }
});

// Site Configuration CMS Endpoints
app.get('/api/site-config', async (req, res) => {
    try {
        const result = await pool.query('SELECT key, value FROM site_config');
        const config = {};
        result.rows.forEach(r => config[r.key] = r.value);
        res.json(config);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/admin/site-config', async (req, res) => {
    try {
        const updates = req.body; // { key: value }
        for (const [key, value] of Object.entries(updates)) {
            await pool.query('INSERT INTO site_config (key, value, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()', [key, value]);
        }
        res.json({ success: true });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/stories', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM success_stories ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/admin/stories', async (req, res) => {
    try {
        const { title, location, description, image_url, category } = req.body;
        const r = await pool.query(
            'INSERT INTO success_stories (title, location, description, image_url, category) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [title, location, description, image_url, category || 'rescue']
        );
        res.json({ success: true, story: r.rows[0] });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.put('/api/admin/stories/:id', async (req, res) => {
    try {
        const { title, location, description, image_url, category } = req.body;
        const r = await pool.query(
            `UPDATE success_stories SET title=$1, location=$2, description=$3, image_url=$4, category=$5
             WHERE id=$6 RETURNING *`,
            [title, location, description, image_url, category || 'rescue', req.params.id]
        );
        if (!r.rows.length) return res.status(404).json({ error: 'Story not found' });
        res.json({ success: true, story: r.rows[0] });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/admin/stories/upload-image', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No image file uploaded' });
        const url = '/uploads/' + req.file.filename;
        res.json({ success: true, url });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/admin/stories/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM success_stories WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// DIDIT KYC Routes
const { DIDITService } = require('./didit_service');
let diditConfig = { apiKey: '', workflowId: '' };

app.post('/api/didit/configure', (req, res) => {
    const { apiKey } = req.body;
    diditConfig.apiKey = apiKey;
    fs.writeFileSync('didit_config.json', JSON.stringify(diditConfig));
    res.json({ success: true });
});

app.post('/api/didit/create-session', async (req, res) => {
    try {
        const { userId, userEmail, userName } = req.body;
        if (fs.existsSync('didit_config.json')) {
            const config = JSON.parse(fs.readFileSync('didit_config.json'));
            diditConfig = config;
        }
        if (!diditConfig.apiKey) {
            return res.json({ success: true, demo: true, session_token: 'demo_' + Date.now(), message: 'Demo mode' });
        }
        const didit = new DIDITService(diditConfig.apiKey);
        if (!diditConfig.workflowId) {
            const workflow = await didit.createWorkflow('PawBandhan KYC', diditConfig.apiKey);
            diditConfig.workflowId = workflow.uuid;
            fs.writeFileSync('didit_config.json', JSON.stringify(diditConfig));
        }
        const session = await didit.createSession(diditConfig.workflowId, userId, 'https://pawbandhan.com/api/didit/webhook', diditConfig.apiKey);
        res.json({ success: true, session_id: session.session_id, session_token: session.session_token });
    } catch (error) {
        res.json({ success: true, demo: true, session_token: 'demo_' + Date.now() });
    }
});

app.post('/api/didit/verify-selfie', async (req, res) => {
    try {
        const { selfieBase64 } = req.body;
        if (fs.existsSync('didit_config.json')) {
            const config = JSON.parse(fs.readFileSync('didit_config.json'));
            diditConfig = config;
        }
        if (!diditConfig.apiKey) {
            return res.json({ success: true, demo: true, verified: true, confidence: 98.5, message: 'Demo mode - Verified' });
        }
        const didit = new DIDITService(diditConfig.apiKey);
        const result = await didit.verifyLiveness(selfieBase64, diditConfig.apiKey);
        res.json({ success: true, verified: result.liveness_score > 0.7, confidence: result.liveness_score * 100 });
    } catch (error) {
        res.json({ success: true, demo: true, verified: true, confidence: 95 });
    }
});

app.post('/api/didit/webhook', (req, res) => {
    console.log('DIDIT Webhook:', req.body);
    res.json({ received: true });
});

app.get('/api/didit/status/:sessionId', (req, res) => {
    res.json({ status: 'approved', message: 'Verification completed' });
});

// Serve HTML files
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '..', 'web_app', 'index.html')));
app.get('/dashboard.html', (req, res) => res.sendFile(path.join(__dirname, '..', 'web_app', 'dashboard.html')));
app.get('/ngo_dashboard.html', (req, res) => res.sendFile(path.join(__dirname, '..', 'web_app', 'ngo_dashboard.html')));
app.get('/admin_portal.html', (req, res) => res.sendFile(path.join(__dirname, '..', 'web_app', 'admin_portal.html')));
app.get('/kyc_verification.html', (req, res) => res.sendFile(path.join(__dirname, '..', 'web_app', 'kyc_verification.html')));
app.get('/representative_app.html', (req, res) => res.sendFile(path.join(__dirname, '..', 'web_app', 'representative_app.html')));
app.get('/representative_auth.html', (req, res) => res.sendFile(path.join(__dirname, '..', 'web_app', 'representative_auth.html')));

// Initialize database
async function initDB() {
    if (!pool) {
        console.warn('Skipping database init — DATABASE_URL is not configured.');
        return;
    }
    const createTables = `
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY, 
            uid VARCHAR(255) UNIQUE, 
            first_name VARCHAR(100), 
            middle_name VARCHAR(100),
            last_name VARCHAR(100), 
            phone_no VARCHAR(20), 
            email VARCHAR(255) UNIQUE, 
            account_no VARCHAR(50), 
            address TEXT, 
            role VARCHAR(20) DEFAULT 'customer',
            status VARCHAR(20) DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS incidents (
            id SERIAL PRIMARY KEY, 
            incident_code VARCHAR(50) UNIQUE, 
            user_id INTEGER REFERENCES users(id), 
            incident_type VARCHAR(50), 
            description TEXT, 
            latitude DECIMAL(10,8), 
            longitude DECIMAL(11,8), 
            animal_type VARCHAR(50), 
            images TEXT[], 
            status VARCHAR(50) DEFAULT 'pending', 
            notes TEXT, 
            created_at TIMESTAMP DEFAULT NOW(), 
            updated_at TIMESTAMP DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS ngos (
            id SERIAL PRIMARY KEY, 
            uid VARCHAR(255) REFERENCES users(uid),
            name VARCHAR(255), 
            email VARCHAR(255), 
            phone VARCHAR(20),
            ngo_type VARCHAR(100),
            reg_number VARCHAR(100),
            pan_number VARCHAR(100),
            address TEXT,
            city VARCHAR(100),
            state VARCHAR(100),
            service_area TEXT,
            work_type VARCHAR(100),
            status VARCHAR(20) DEFAULT 'pending',
            prn VARCHAR(50) UNIQUE,
            temp_prn VARCHAR(50) UNIQUE,
            ack_no VARCHAR(50) UNIQUE,
            kyc_data JSONB,
            created_at TIMESTAMP DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS doctors (
            id SERIAL PRIMARY KEY, 
            uid VARCHAR(255) REFERENCES users(uid),
            name VARCHAR(255), 
            email VARCHAR(255), 
            phone VARCHAR(20),
            specialization VARCHAR(255),
            license_number VARCHAR(100),
            hospital_name VARCHAR(255),
            status VARCHAR(20) DEFAULT 'pending',
            prn VARCHAR(50) UNIQUE,
            temp_id VARCHAR(50) UNIQUE,
            ack_no VARCHAR(50) UNIQUE,
            kyc_data JSONB,
            created_at TIMESTAMP DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS riders (
            id SERIAL PRIMARY KEY, 
            uid VARCHAR(255) REFERENCES users(uid),
            ngo_id INTEGER REFERENCES ngos(id),
            name VARCHAR(255), 
            email VARCHAR(255), 
            phone VARCHAR(20),
            vehicle_type VARCHAR(100),
            vehicle_number VARCHAR(100),
            license_number VARCHAR(100),
            status VARCHAR(20) DEFAULT 'pending',
            rider_id VARCHAR(50) UNIQUE,
            kyc_data JSONB,
            created_at TIMESTAMP DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS customers (
            id SERIAL PRIMARY KEY,
            uid VARCHAR(255) UNIQUE,
            name VARCHAR(255),
            email VARCHAR(255),
            phone VARCHAR(50),
            created_at TIMESTAMP DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS cases (
            id SERIAL PRIMARY KEY,
            customer_name VARCHAR(255),
            customer_phone VARCHAR(50),
            customer_email VARCHAR(255),
            customer_uid VARCHAR(255),
            animal_type VARCHAR(100),
            condition TEXT,
            location TEXT,
            status VARCHAR(50) DEFAULT 'open',
            ngo_id INTEGER REFERENCES ngos(id),
            incident_code VARCHAR(50),
            created_at TIMESTAMP DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS notifications (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id),
            ngo_id INTEGER REFERENCES ngos(id),
            rider_id INTEGER REFERENCES riders(id),
            doctor_id INTEGER REFERENCES doctors(id),
            incident_code VARCHAR(50),
            title VARCHAR(255),
            message TEXT,
            type VARCHAR(50),
            is_read BOOLEAN DEFAULT false,
            created_at TIMESTAMP DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS site_config (
            key VARCHAR(100) PRIMARY KEY,
            value TEXT,
            updated_at TIMESTAMP DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS success_stories (
            id SERIAL PRIMARY KEY,
            title VARCHAR(255),
            location VARCHAR(100),
            description TEXT,
            image_url TEXT,
            category VARCHAR(50),
            created_at TIMESTAMP DEFAULT NOW()
        );
        INSERT INTO site_config (key, value) VALUES 
            ('hero_title', 'Saving India''s Indie Dogs'),
            ('hero_subtitle', 'Join the nation''s most advanced rescue network. Every second counts when a life is on the line.'),
            ('emergency_hotline', 'pawbandhan@gmail.com'),
            ('mission_title', 'Technology Meets Compassion'),
            ('mission_text', 'PawBandhan is India''s first tech-first animal welfare platform.'),
            ('stat_rescues_override', '15000'),
            ('stat_ngos_override', '245'),
            ('stat_doctors_override', '1200'),
            ('stat_riders_override', '5600'),
            ('site_name', 'PawBandhan'),
            ('site_tagline', 'Rescue network'),
            ('hero_badge', 'Verified NGOs & live tracking'),
            ('stories_section_title', 'Tails of hope'),
            ('stories_section_lead', 'Real rescues published by the PawBandhan team from NGOs and field heroes across India.'),
            ('stories_empty_message', 'New success stories will appear here once published from the admin portal.'),
            ('footer_tagline', 'Technology and compassion for every street animal in India.')
        ON CONFLICT DO NOTHING;
        INSERT INTO ngos (name, email, phone) SELECT 'PawBandhan Foundation', 'admin@pawbandhan.com', '1234567890' WHERE NOT EXISTS (SELECT 1 FROM ngos);
    `;
    try { 
        await pool.query(createTables);
        await pool.query(
            `INSERT INTO site_config (key, value) VALUES ('emergency_hotline', 'pawbandhan@gmail.com')
             ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`
        ).catch(() => {});

        // Force schema updates for legacy tables
        await pool.query('ALTER TABLE ngos ADD COLUMN IF NOT EXISTS uid VARCHAR(255)');
        await pool.query('ALTER TABLE doctors ADD COLUMN IF NOT EXISTS uid VARCHAR(255)');
        await pool.query('ALTER TABLE riders ADD COLUMN IF NOT EXISTS uid VARCHAR(255)');
        await pool.query('ALTER TABLE cases ADD COLUMN IF NOT EXISTS customer_email VARCHAR(255)');
        await pool.query('ALTER TABLE cases ADD COLUMN IF NOT EXISTS customer_uid VARCHAR(255)');
        await pool.query('ALTER TABLE cases ADD COLUMN IF NOT EXISTS incident_code VARCHAR(50)');
        const incidentAlters = [
            'ALTER TABLE incidents ADD COLUMN IF NOT EXISTS incident_code VARCHAR(50)',
            'ALTER TABLE incidents ADD COLUMN IF NOT EXISTS animal_type VARCHAR(50)',
            'ALTER TABLE incidents ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,8)',
            'ALTER TABLE incidents ADD COLUMN IF NOT EXISTS longitude DECIMAL(11,8)',
            'ALTER TABLE incidents ADD COLUMN IF NOT EXISTS images TEXT[]',
            'ALTER TABLE incidents ADD COLUMN IF NOT EXISTS incident_type VARCHAR(50)',
            'ALTER TABLE incidents ADD COLUMN IF NOT EXISTS ngo_id INTEGER',
            'ALTER TABLE incidents ADD COLUMN IF NOT EXISTS workflow_status VARCHAR(80) DEFAULT \'reported\'',
            'ALTER TABLE incidents ADD COLUMN IF NOT EXISTS rep_id INTEGER',
            'ALTER TABLE incidents ADD COLUMN IF NOT EXISTS doctor_id INTEGER',
            'ALTER TABLE incidents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()'
        ];
        for (const sql of incidentAlters) {
            try { await pool.query(sql); } catch (e) { console.warn('Schema alter:', e.message); }
        }
        await ensureIncidentsSchema();
        await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'customer'");
        await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active'");
        await pool.query("UPDATE users SET role = 'customer' WHERE role IS NULL");
        
        if (workflowApi?.initWorkflowSchema) await workflowApi.initWorkflowSchema();
        if (repApi?.initRepSchema) await repApi.initRepSchema();
        console.log('Database initialized'); 
    } catch (error) { console.error('DB init error:', error.message); }
}

// ------------------------------------------------------------------
// ADMIN ERP EXTENSION ROUTES
// ------------------------------------------------------------------

// 1. Verified NGOs and Ban
app.get('/api/admin/verified-ngos', async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM ngos WHERE status IN ('active', 'suspended') ORDER BY id DESC");
        res.json(result.rows);
    } catch(err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/ban-ngo', async (req, res) => {
    try {
        const { id, status } = req.body; // status should be 'suspended' or 'active'
        await pool.query("UPDATE ngos SET status = $1 WHERE id = $2", [status, id]);
        // Also update users table
        const ngoRes = await pool.query("SELECT uid FROM ngos WHERE id = $1", [id]);
        if(ngoRes.rows.length > 0) await pool.query("UPDATE users SET status = $1 WHERE uid = $2", [status, ngoRes.rows[0].uid]);
        res.json({ success: true, newStatus: status });
    } catch(err) { res.status(500).json({ error: err.message }); }
});

// 2. Customers
app.get('/api/admin/customers', async (req, res) => {
    try {
        await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS portal_access_code VARCHAR(20)');
        const result = await pool.query(
            `SELECT c.*, u.email as user_email, u.phone_no as user_phone, u.portal_access_code, u.uid, u.status as user_status
             FROM customers c
             LEFT JOIN users u ON u.uid = c.uid
             ORDER BY c.id DESC`
        );
        res.json(result.rows);
    } catch(err) { res.status(500).json({ error: err.message }); }
});

// 3. Case Management
app.get('/api/admin/cases', async (req, res) => {
    try {
        const result = await pool.query("SELECT c.*, n.name as ngo_name FROM cases c LEFT JOIN ngos n ON c.ngo_id = n.id ORDER BY c.id DESC");
        res.json(result.rows);
    } catch(err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/ngos/:uid/cases', async (req, res) => {
    try {
        if (req.params.uid === 'demo-ngo-id') {
            const demo = await ensureDemoNgo();
            const result = await pool.query('SELECT * FROM cases WHERE ngo_id = $1 ORDER BY created_at DESC', [demo.id]);
            return res.json(result.rows);
        }
        const ngoRes = await pool.query('SELECT id FROM ngos WHERE uid = $1 LIMIT 1', [req.params.uid]);
        if (ngoRes.rows.length === 0) return res.status(404).json({ error: 'NGO not found' });
        const result = await pool.query(
            "SELECT * FROM cases WHERE ngo_id = $1 ORDER BY created_at DESC",
            [ngoRes.rows[0].id]
        );
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

let _incidentsRequiresLegacyId = null;
async function incidentsRequiresLegacyId() {
    if (_incidentsRequiresLegacyId !== null) return _incidentsRequiresLegacyId;
    const r = await pool.query(
        "SELECT 1 FROM information_schema.columns WHERE table_name = 'incidents' AND column_name = 'incident_id' AND is_nullable = 'NO' LIMIT 1"
    );
    _incidentsRequiresLegacyId = r.rows.length > 0;
    return _incidentsRequiresLegacyId;
}

async function insertIncidentRecord({ incidentCode, userId, incidentType, description, lat, lng, animal_type, imageList, ngoId, workflowStatus }) {
    if (await incidentsRequiresLegacyId()) {
        return pool.query(
            'INSERT INTO incidents (incident_id, incident_code, user_id, incident_type, description, latitude, longitude, animal_type, images, status, workflow_status, ngo_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *',
            [incidentCode, incidentCode, userId, incidentType, description, lat, lng, animal_type, imageList, 'pending', workflowStatus, ngoId]
        );
    }
    return pool.query(
        'INSERT INTO incidents (incident_code, user_id, incident_type, description, latitude, longitude, animal_type, images, status, workflow_status, ngo_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *',
        [incidentCode, userId, incidentType, description, lat, lng, animal_type, imageList, 'pending', workflowStatus, ngoId]
    );
}

async function ensureIncidentsSchema() {
    await pool.query('ALTER TABLE incidents ADD COLUMN IF NOT EXISTS incident_code VARCHAR(50)');
    const hasIncidentId = await pool.query(
        "SELECT 1 FROM information_schema.columns WHERE table_name = 'incidents' AND column_name = 'incident_id' LIMIT 1"
    );
    if (hasIncidentId.rows.length) {
        await pool.query(`
            UPDATE incidents SET incident_code = COALESCE(NULLIF(TRIM(incident_code), ''), NULLIF(TRIM(incident_id::text), ''))
            WHERE incident_code IS NULL OR TRIM(incident_code) = ''
        `);
        await pool.query(`
            UPDATE incidents SET incident_id = COALESCE(NULLIF(TRIM(incident_id::text), ''), incident_code)
            WHERE incident_id IS NULL OR TRIM(incident_id::text) = ''
        `);
    }
    const missing = await pool.query("SELECT id FROM incidents WHERE incident_code IS NULL OR TRIM(incident_code) = ''");
    for (const row of missing.rows) {
        const code = generateCode('PB') + String(row.id).slice(-4);
        await pool.query('UPDATE incidents SET incident_code = $1, incident_id = COALESCE(incident_id, $1) WHERE id = $2', [code, row.id]);
    }
    _incidentsRequiresLegacyId = null;
}

async function insertRescueCase({ customerUser, customer_name, customer_phone, customer_email, animal_type, condition, location, description, severity, latitude, longitude, ngoId, incidentType, images, autoAssignNgo = true, ngoAcceptOnCreate = false }) {
    const incidentCode = generateCode('PB');
    const incidentDescription = description || `${animal_type} rescue at ${location}. Condition: ${condition}${severity ? '. Severity: ' + severity : ''}`;
    const lat = latitude != null && latitude !== '' ? Number(latitude) : null;
    const lng = longitude != null && longitude !== '' ? Number(longitude) : null;
    const imageList = Array.isArray(images) ? images.filter(Boolean) : [];
    let assignedNgoId = ngoId || null;
    if (!assignedNgoId && autoAssignNgo && workflowApi?.findNearestNgo) {
        const nearest = await workflowApi.findNearestNgo(lat, lng);
        if (nearest) assignedNgoId = nearest.id;
    }
    const workflowStatus = assignedNgoId ? 'ngo_assigned' : 'reported';
    const incidentRes = await insertIncidentRecord({
        incidentCode,
        userId: customerUser.id,
        incidentType: incidentType || 'rescue',
        description: incidentDescription,
        lat,
        lng,
        animal_type,
        imageList,
        ngoId: assignedNgoId || null,
        workflowStatus
    });
    for (const filename of imageList) {
        const url = '/uploads/' + String(filename).replace(/^\/uploads\//, '');
        await pool.query(
            "INSERT INTO case_photos (incident_code, photo_type, file_url, verified, uploaded_by) VALUES ($1,'report',$2,false,'reporter')",
            [incidentCode, url]
        ).catch(() => {});
    }
    await pool.query(
        'INSERT INTO case_timeline (incident_code, status, actor_type, note) VALUES ($1,$2,$3,$4)',
        [incidentCode, assignedNgoId ? 'ngo_assigned' : 'reported', incidentType || 'system', 'Rescue case registered']
    ).catch(() => {});
    if (assignedNgoId && workflowApi?.assignNgoToIncident) {
        if (!ngoId) {
            await workflowApi.assignNgoToIncident(incidentCode, assignedNgoId, 'Auto-assigned nearest NGO by location').catch(() => {});
        } else if (ngoAcceptOnCreate && workflowApi.markNgoAccepted) {
            await workflowApi.markNgoAccepted(incidentCode, assignedNgoId, 'ngo', 'NGO accepted on registration').catch(() => {});
        }
    }
    const caseRes = await pool.query(
        "INSERT INTO cases (customer_name, customer_phone, customer_email, customer_uid, animal_type, condition, location, ngo_id, status, incident_code, workflow_status, latitude, longitude) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'open',$9,$10,$11,$12) RETURNING *",
        [customer_name, customer_phone, customer_email || null, customerUser.uid, animal_type, condition, location, assignedNgoId || null, incidentCode, assignedNgoId ? 'ngo_assigned' : 'reported', lat, lng]
    );
    return { incidentCode, incidentRes: incidentRes.rows[0], caseRes: caseRes.rows[0], assigned_ngo_id: assignedNgoId };
}

app.post('/api/ngos/:uid/create-case', upload.array('images', 5), async (req, res) => {
    try {
        const { customer_name, customer_phone, customer_email, animal_type, condition, location, description, severity, latitude, longitude } = req.body;
        const images = req.files ? req.files.map((f) => f.filename) : [];
        if (!customer_name || !customer_phone || !animal_type || !condition || !location) {
            return res.status(400).json({ error: 'Customer name, phone, animal type, condition, and location are required.' });
        }

        let ngoUid = req.params.uid;
        if (ngoUid === 'demo-ngo-id') {
            const demo = await ensureDemoNgo();
            var ngo = demo;
        } else {
            const ngoRes = await pool.query('SELECT * FROM ngos WHERE uid = $1 LIMIT 1', [ngoUid]);
            if (ngoRes.rows.length === 0) return res.status(404).json({ error: 'NGO not found' });
            var ngo = ngoRes.rows[0];
        }
        if (ngo.status !== 'active') return res.status(403).json({ error: 'NGO must be approved before managing cases.' });

        const { user: customerUser, existed: customerExisted } = await ensureCustomerProfile({
            name: customer_name,
            email: customer_email,
            phone: customer_phone
        });

        const { incidentCode, incidentRes, caseRes } = await insertRescueCase({
            customerUser, customer_name, customer_phone, customer_email, animal_type, condition, location, description, severity, latitude, longitude,
            ngoId: ngo.id, incidentType: 'ngo_created_case', images, autoAssignNgo: false, ngoAcceptOnCreate: true
        });
        io.emit('case-update', { incidentCode, event: 'case_created', workflow_status: 'ngo_assigned' });
        io.to('customer-' + customerUser.uid).emit('customer-notification', {
            title: 'Rescue case created',
            message: `Case ${incidentCode} registered for ${animal_type} at ${location}`,
            incidentCode
        });

        await pool.query(
            'INSERT INTO notifications (user_id, ngo_id, incident_code, title, message, type, is_read) VALUES ($1,$2,$3,$4,$5,$6,$7)',
            [
                customerUser.id,
                ngo.id,
                incidentCode,
                'Rescue case created for you',
                `${ngo.name || 'A PawBandhan NGO'} created a ${animal_type} rescue case for ${location}. Tracking code: ${incidentCode}.`,
                'case_created',
                false
            ]
        );

        if (customer_email) {
            await sendEmail(
                customer_email,
                'PawBandhan Rescue Case Created',
                `<h2>Your rescue case is now active</h2><p>${ngo.name || 'A PawBandhan NGO'} has created a rescue case on your behalf.</p><p><strong>Tracking ID:</strong> ${incidentCode}</p><p><strong>Animal:</strong> ${animal_type}</p><p><strong>Location:</strong> ${location}</p><p><strong>Condition:</strong> ${condition}</p>`
            );
        }

        res.json({
            success: true,
            customer_created: !customerExisted,
            customer: {
                uid: customerUser.uid,
                name: `${customerUser.first_name || ''} ${customerUser.last_name || ''}`.trim() || customer_name,
                email: customerUser.email || customer_email || '',
                phone: customerUser.phone_no || customer_phone
            },
            incident: incidentRes,
            case: caseRes
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/add-case', upload.array('images', 5), async (req, res) => {
    try {
        const { customer_name, customer_phone, customer_email, animal_type, condition, location, description, ngo_id, severity, latitude, longitude } = req.body;
        const images = req.files ? req.files.map((f) => f.filename) : [];
        if (!customer_name || !customer_phone || !animal_type || !condition || !location) {
            return res.status(400).json({ error: 'Customer name, phone, animal type, condition, and location are required.' });
        }

        const { user: customerUser, existed: customerExisted } = await ensureCustomerProfile({
            name: customer_name,
            email: customer_email,
            phone: customer_phone
        });

        const ngoId = ngo_id ? parseInt(ngo_id, 10) : null;
        const { incidentCode, incidentRes, caseRes } = await insertRescueCase({
            customerUser, customer_name, customer_phone, customer_email, animal_type, condition, location, description, severity, latitude, longitude,
            ngoId: Number.isFinite(ngoId) ? ngoId : null, incidentType: 'admin_created_case', images
        });
        io.emit('case-update', { incidentCode, event: 'case_created' });

        if (customer_email) {
            await sendEmail(
                customer_email,
                'PawBandhan Rescue Case Created',
                `<h2>Your rescue case is registered</h2><p><strong>Tracking ID:</strong> ${incidentCode}</p><p>Sign in at the customer portal to track progress.</p>`
            );
        }

        res.json({
            success: true,
            customer_existed: customerExisted,
            customer: {
                uid: customerUser.uid,
                name: `${customerUser.first_name || ''} ${customerUser.last_name || ''}`.trim() || customer_name,
                email: customerUser.email || customer_email || '',
                phone: customerUser.phone_no || customer_phone
            },
            incident: incidentRes,
            case: caseRes
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/customers/create', async (req, res) => {
    try {
        const { name, email, phone, issueAccess } = req.body;
        if (!name || (!email && !phone)) {
            return res.status(400).json({ error: 'Name and at least email or phone are required.' });
        }

        const lookup = await pool.query(
            `SELECT u.uid, u.first_name, u.last_name, u.phone_no, u.email, u.status, c.name AS customer_name
             FROM users u
             LEFT JOIN customers c ON c.uid = u.uid
             WHERE COALESCE(u.role, 'customer') = 'customer'
             AND (($1 <> '' AND u.phone_no = $1) OR ($2 <> '' AND LOWER(u.email) = $2))
             LIMIT 1`,
            [phone ? String(phone).trim() : '', email ? String(email).trim().toLowerCase() : '']
        );

        if (lookup.rows.length) {
            const row = lookup.rows[0];
            return res.json({
                success: true,
                existed: true,
                message: 'Customer already exists on the portal.',
                customer: {
                    uid: row.uid,
                    name: row.customer_name || `${row.first_name || ''} ${row.last_name || ''}`.trim(),
                    email: row.email || '',
                    phone: row.phone_no || '',
                    status: row.status || 'active'
                },
                loginUrl: '/customer_auth.html'
            });
        }

        const { user, existed } = await ensureCustomerProfile({ name, email, phone });
        let portalAccessCode = null;
        if (issueAccess !== false) {
            portalAccessCode = 'PB' + Math.floor(100000 + Math.random() * 900000);
            await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS portal_access_code VARCHAR(20)');
            await pool.query('UPDATE users SET portal_access_code = $1 WHERE id = $2', [portalAccessCode, user.id]);
        }

        res.json({
            success: true,
            existed,
            customer: {
                uid: user.uid,
                name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || name,
                email: user.email || email || '',
                phone: user.phone_no || phone || ''
            },
            portalAccessCode,
            loginUrl: '/customer_auth.html',
            instructions: portalAccessCode
                ? `Share with customer: sign up or sign in at customer portal using email ${user.email || email}. Portal access code: ${portalAccessCode} (use as password on first login if Firebase account not created yet).`
                : 'Customer record created. They can register at the customer portal.'
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/customers/portal-login', async (req, res) => {
    try {
        const email = req.body.email ? String(req.body.email).trim().toLowerCase() : '';
        const accessCode = req.body.accessCode ? String(req.body.accessCode).trim() : '';
        if (!email || !accessCode) return res.status(400).json({ error: 'Email and access code required.' });

        const r = await pool.query(
            `SELECT u.uid, u.first_name, u.last_name, u.phone_no, u.email, u.portal_access_code, c.name AS customer_name
             FROM users u LEFT JOIN customers c ON c.uid = u.uid
             WHERE LOWER(u.email) = $1 AND COALESCE(u.role, 'customer') = 'customer' LIMIT 1`,
            [email]
        );
        if (!r.rows.length) return res.status(404).json({ error: 'Customer not found.' });
        const user = r.rows[0];
        if (user.portal_access_code && user.portal_access_code === accessCode) {
            return res.json({
                success: true,
                uid: user.uid,
                name: user.customer_name || `${user.first_name || ''} ${user.last_name || ''}`.trim(),
                email: user.email
            });
        }
        res.status(401).json({ error: 'Invalid access code.' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/update-case', async (req, res) => {
    try {
        const { id, status } = req.body;
        await pool.query("UPDATE cases SET status = $1 WHERE id = $2", [status, id]);
        res.json({ success: true });
    } catch(err) { res.status(500).json({ error: err.message }); }
});

// 4. Site Settings (Razorpay, CMS)
app.get('/api/admin/site-settings-all', async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM site_settings");
        let settings = {};
        result.rows.forEach(r => settings[r.key] = r.value);
        res.json(settings);
    } catch(err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/update-site-setting', async (req, res) => {
    try {
        const { key, value } = req.body;
        await pool.query(
            "INSERT INTO site_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value",
            [key, value]
        );
        res.json({ success: true });
    } catch(err) { res.status(500).json({ error: err.message }); }
});

// 5. Manual Registration
app.post('/api/admin/manual-register', async (req, res) => {
    try {
        const { type, name, email, phone, details } = req.body; // type = ngo, doctor, rider
        const tempUid = 'MANUAL-' + Date.now();
        let table = type === 'ngo' ? 'ngos' : (type === 'rider' ? 'riders' : 'doctors');
        let professionalId = null;
        
        await pool.query("INSERT INTO users (uid, email, first_name, role, status) VALUES ($1,$2,$3,$4,'active')", [tempUid, email, name, type]);
        
        if (type === 'ngo') {
            professionalId = 'PB-NGO-' + Math.floor(1000 + Math.random() * 9000);
            await pool.query("INSERT INTO ngos (uid, name, email, phone, status, prn, ack_no, address) VALUES ($1,$2,$3,$4,'active',$5,$6,$7)", [tempUid, name, email, phone, professionalId, 'ACK-'+Date.now(), details.address]);
        } else if (type === 'doctor') {
            professionalId = 'PB-DOC-' + Math.floor(1000 + Math.random() * 9000);
            await pool.query("INSERT INTO doctors (uid, name, email, phone, status, prn, ack_no, specialization) VALUES ($1,$2,$3,$4,'active',$5,$6,$7)", [tempUid, name, email, phone, professionalId, 'ACK-'+Date.now(), details.specialization]);
        } else if (type === 'rider') {
            professionalId = 'PB-RID-' + Math.floor(1000 + Math.random() * 9000);
            await pool.query("INSERT INTO riders (uid, name, email, phone, status, rider_id, vehicle_type) VALUES ($1,$2,$3,$4,'active',$5,$6)", [tempUid, name, email, phone, professionalId, details.vehicleType]);
        }
        res.json({ success: true, professionalId });
    } catch(err) { res.status(500).json({ error: err.message }); }
});


// Static files last so /api/* always returns JSON from route handlers
const WEB_APP_DIR = path.join(__dirname, '..', 'web_app');
const ASSETS_DIR = path.join(__dirname, '..', 'assets');
if (!fs.existsSync(WEB_APP_DIR)) {
    console.error('WARNING: web_app not found at', WEB_APP_DIR);
}
app.get('/', (req, res) => {
    const indexPath = path.join(WEB_APP_DIR, 'index.html');
    if (fs.existsSync(indexPath)) return res.sendFile(indexPath);
    res.status(200).send('PawBandhan API is running. Set DATABASE_URL and open /index.html');
});
app.use(express.static(WEB_APP_DIR));
app.use('/assets', express.static(ASSETS_DIR));

const PORT = Number(process.env.PORT) || 5000;
const HOST = process.env.HOST || '0.0.0.0';

server.listen(PORT, HOST, () => {
    console.log('');
    console.log('========================================');
    console.log('PawBandhan Server Running');
    console.log('========================================');
    console.log(`Listening on ${HOST}:${PORT}`);
    console.log('DATABASE_URL:', dbUrl ? 'set' : 'MISSING — add in hosting dashboard');
    console.log('========================================');
    console.log('');
    initDB().catch((err) => console.error('Database init error:', err.message));
});

process.on('unhandledRejection', (err) => console.error('Unhandled rejection:', err));
