const { Pool } = require('pg');
const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_HMw9Dr1VisRW@ep-broad-haze-an4j958g-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require',
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        await pool.query(`
            ALTER TABLE representatives ADD COLUMN IF NOT EXISTS tracking_id VARCHAR(50) UNIQUE;
            ALTER TABLE representatives ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
            ALTER TABLE representatives ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMP;
            ALTER TABLE representatives ADD COLUMN IF NOT EXISTS last_lat DECIMAL(10,8);
            ALTER TABLE representatives ADD COLUMN IF NOT EXISTS last_lng DECIMAL(11,8);
            ALTER TABLE representatives ADD COLUMN IF NOT EXISTS last_location_at TIMESTAMP;
            ALTER TABLE representatives ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false;

            CREATE TABLE IF NOT EXISTS rep_checkins (
                id SERIAL PRIMARY KEY,
                rep_id INTEGER REFERENCES representatives(id),
                selfie_url TEXT,
                lat DECIMAL(10,8),
                lng DECIMAL(11,8),
                created_at TIMESTAMP DEFAULT NOW()
            );
            CREATE TABLE IF NOT EXISTS rep_timeslots (
                id SERIAL PRIMARY KEY,
                rep_id INTEGER REFERENCES representatives(id),
                day_of_week INTEGER,
                start_time VARCHAR(10),
                end_time VARCHAR(10),
                created_at TIMESTAMP DEFAULT NOW()
            );
            CREATE TABLE IF NOT EXISTS rep_reviews (
                id SERIAL PRIMARY KEY,
                rep_id INTEGER REFERENCES representatives(id),
                incident_code VARCHAR(50),
                author VARCHAR(255),
                rating INTEGER DEFAULT 5,
                comment TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);
        console.log('Migration 6 complete.');
    } catch (e) { console.error(e); }
    finally { pool.end(); }
}
run();
