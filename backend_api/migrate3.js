const { Pool } = require('pg');
const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_HMw9Dr1VisRW@ep-broad-haze-an4j958g-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require',
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        await pool.query("ALTER TABLE doctors ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending'");
        await pool.query('ALTER TABLE doctors ADD COLUMN IF NOT EXISTS prn VARCHAR(50)');
        await pool.query('ALTER TABLE doctors ADD COLUMN IF NOT EXISTS temp_id VARCHAR(50)');
        await pool.query('ALTER TABLE doctors ADD COLUMN IF NOT EXISTS ack_no VARCHAR(50)');

        await pool.query("ALTER TABLE ngos ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending'");
        await pool.query('ALTER TABLE ngos ADD COLUMN IF NOT EXISTS prn VARCHAR(50)');
        await pool.query('ALTER TABLE ngos ADD COLUMN IF NOT EXISTS temp_prn VARCHAR(50)');
        await pool.query('ALTER TABLE ngos ADD COLUMN IF NOT EXISTS ack_no VARCHAR(50)');

        await pool.query("ALTER TABLE riders ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending'");
        
        console.log("Migration 3 complete.");
    } catch(e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
run();
