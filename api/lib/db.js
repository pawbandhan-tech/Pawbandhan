/**
 * Lightweight Neon pool for fast Vercel routes (profile, health).
 * Avoids loading the full Express server on cold start.
 */
const { Pool } = require('pg');

function normalizeDatabaseUrl(url) {
    if (!url) return url;
    return url
        .replace(/([?&])channel_binding=[^&]*&?/gi, '$1')
        .replace(/[?&]$/, '')
        .replace(/\?&/, '?');
}

let pool = null;
let profileSchemaReady = false;

function getPool() {
    if (pool) return pool;
    const dbUrl = normalizeDatabaseUrl(process.env.DATABASE_URL);
    if (!dbUrl) return null;
    pool = new Pool({
        connectionString: dbUrl,
        ssl: !dbUrl.includes('localhost') ? { rejectUnauthorized: false } : false,
        max: 1,
        idleTimeoutMillis: 5000,
        connectionTimeoutMillis: 10000
    });
    return pool;
}

async function ensureProfileSchema() {
    const p = getPool();
    if (!p) throw Object.assign(new Error('DATABASE_URL is not set in Vercel environment variables.'), { status: 503 });
    if (profileSchemaReady) return;
    await p.query(`
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            uid VARCHAR(255) UNIQUE,
            first_name VARCHAR(100),
            last_name VARCHAR(100),
            phone_no VARCHAR(20),
            email VARCHAR(255),
            account_no VARCHAR(50),
            role VARCHAR(20) DEFAULT 'customer',
            status VARCHAR(20) DEFAULT 'active',
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
    `);
    await p.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS gender VARCHAR(30)');
    await p.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS portal_access_code VARCHAR(20)');
    await p.query('ALTER TABLE customers ADD COLUMN IF NOT EXISTS gender VARCHAR(30)');
    profileSchemaReady = true;
}

function generateCode(prefix) {
    return prefix + Date.now() + Math.floor(Math.random() * 10000);
}

async function getCustomerProfile(uid) {
    const p = getPool();
    if (!p) throw Object.assign(new Error('Database not configured.'), { status: 503 });
    await ensureProfileSchema();
    const u = await p.query(
        `SELECT u.uid, u.first_name, u.last_name, u.email, u.phone_no, u.account_no, u.portal_access_code,
                COALESCE(u.gender, c.gender) AS gender, c.name AS customer_name
         FROM users u LEFT JOIN customers c ON c.uid = u.uid WHERE u.uid = $1`,
        [uid]
    );
    if (!u.rows.length) {
        return { uid, name: '', email: null, phone: null, gender: null, accountNo: null, hasPortalAccess: false, isNew: true };
    }
    const row = u.rows[0];
    const fullName = (row.customer_name || `${row.first_name || ''} ${row.last_name || ''}`.trim()) || '';
    return {
        uid: row.uid,
        name: fullName,
        email: row.email,
        phone: row.phone_no,
        gender: row.gender || null,
        accountNo: row.account_no,
        hasPortalAccess: Boolean(row.portal_access_code),
        isNew: false
    };
}

async function upsertCustomerProfile(uid, body) {
    const p = getPool();
    if (!p) throw Object.assign(new Error('Database not configured.'), { status: 503 });
    await ensureProfileSchema();

    const name = body.name != null ? String(body.name).trim() : '';
    const phone = body.phone != null ? String(body.phone).trim() : null;
    const gender = body.gender != null ? String(body.gender).trim() : null;
    if (!name) throw Object.assign(new Error('Name is required'), { status: 400 });

    const parts = name.split(/\s+/).filter(Boolean);
    const firstName = parts[0] || name;
    const lastName = parts.slice(1).join(' ') || '';
    const emailIn = body.email != null ? String(body.email).trim().toLowerCase() : null;

    const client = await p.connect();
    try {
        await client.query('BEGIN');
        let existing = await client.query('SELECT uid, email FROM users WHERE uid = $1', [uid]);

        if (!existing.rows.length) {
            const accountNo = generateCode('PB');
            await client.query(
                `INSERT INTO users (uid, first_name, last_name, phone_no, email, account_no, role, status, gender)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
                [uid, firstName, lastName, phone, emailIn || `customer-${uid.slice(0, 8)}@pawbandhan.local`, accountNo, 'customer', 'active', gender]
            );
            existing = await client.query('SELECT uid, email FROM users WHERE uid = $1', [uid]);
        } else {
            await client.query(
                `UPDATE users SET first_name = $1, last_name = $2, phone_no = COALESCE($3, phone_no),
                 gender = COALESCE($4, gender), email = COALESCE($5, email) WHERE uid = $6`,
                [firstName, lastName, phone, gender, emailIn, uid]
            );
        }

        const email = emailIn || existing.rows[0].email;
        const cust = await client.query('SELECT id FROM customers WHERE uid = $1', [uid]);
        if (cust.rows.length) {
            await client.query(
                `UPDATE customers SET name = $1, phone = COALESCE($2, phone), email = COALESCE($3, email),
                 gender = COALESCE($4, gender) WHERE uid = $5`,
                [name, phone, email, gender, uid]
            );
        } else {
            await client.query(
                'INSERT INTO customers (uid, name, email, phone, gender) VALUES ($1, $2, $3, $4, $5)',
                [uid, name, email, phone, gender]
            );
        }
        await client.query('COMMIT');
        return { success: true, uid, name, email, phone, gender };
    } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        throw err;
    } finally {
        client.release();
    }
}

module.exports = { getPool, ensureProfileSchema, getCustomerProfile, upsertCustomerProfile };
