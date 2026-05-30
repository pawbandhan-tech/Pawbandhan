/**
 * Migration 5: Representatives + case workflow
 * Run: node migrate5.js
 */
const { Pool } = require('pg');
const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_HMw9Dr1VisRW@ep-broad-haze-an4j958g-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require',
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
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
            "ALTER TABLE incidents ADD COLUMN IF NOT EXISTS ngo_id INTEGER REFERENCES ngos(id)",
            "ALTER TABLE incidents ADD COLUMN IF NOT EXISTS workflow_status VARCHAR(80) DEFAULT 'reported'",
            "ALTER TABLE incidents ADD COLUMN IF NOT EXISTS rep_id INTEGER REFERENCES representatives(id)",
            "ALTER TABLE incidents ADD COLUMN IF NOT EXISTS doctor_id INTEGER REFERENCES doctors(id)",
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
            "ALTER TABLE notifications ADD COLUMN IF NOT EXISTS rep_id INTEGER REFERENCES representatives(id)"
        ];
        for (const sql of alters) await pool.query(sql);

        console.log('Migration 5 complete: representatives + workflow tables.');
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
run();
