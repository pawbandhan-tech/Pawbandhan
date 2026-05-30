const { Pool } = require('pg');
const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_HMw9Dr1VisRW@ep-broad-haze-an4j958g-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require',
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS cases (
                id SERIAL PRIMARY KEY,
                customer_name VARCHAR(255),
                customer_phone VARCHAR(50),
                animal_type VARCHAR(100),
                condition TEXT,
                location TEXT,
                status VARCHAR(50) DEFAULT 'open',
                ngo_id INTEGER REFERENCES ngos(id),
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS customers (
                id SERIAL PRIMARY KEY,
                uid VARCHAR(255) UNIQUE,
                name VARCHAR(255),
                email VARCHAR(255),
                phone VARCHAR(50),
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS reviews (
                id SERIAL PRIMARY KEY,
                author VARCHAR(255),
                content TEXT,
                rating INTEGER DEFAULT 5,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS site_settings (
                key VARCHAR(255) PRIMARY KEY,
                value TEXT
            )
        `);
        console.log("Migration 4 complete.");
    } catch(e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
run();
