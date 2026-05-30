require('dotenv').config();
const { Pool } = require('pg');
if (!process.env.DATABASE_URL) {
    console.error('Set DATABASE_URL in backend_api/.env');
    process.exit(1);
}
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        let result = await pool.query(
            'UPDATE doctors SET name=$1, email=$2, phone=$3, specialization=$4, license_number=$5, hospital_name=$6, kyc_data=$7, status=$8 WHERE uid=$9 RETURNING *',
            ['name', 'email', 'phone', 'specialization', 'licenseNumber', 'hospitalName', JSON.stringify({}), 'pending', 'demo-doc-id']
        );
        if (result.rows.length === 0) {
            result = await pool.query(
                'INSERT INTO doctors (uid, name, email, phone, specialization, license_number, hospital_name, kyc_data, status, ack_no) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *',
                ['demo-doc-id', 'name', 'email', 'phone', 'specialization', 'licenseNumber', 'hospitalName', JSON.stringify({}), 'pending', 'ACK-DOC-' + Date.now().toString().slice(-6)]
            );
        }
        console.log("Success", result.rows[0].ack_no);
    } catch(e) {
        console.error("Caught error:", e.message);
    } finally {
        pool.end();
    }
}
run();
