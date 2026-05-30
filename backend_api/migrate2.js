const { Pool } = require('pg');
const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_HMw9Dr1VisRW@ep-broad-haze-an4j958g-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require',
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        await pool.query('ALTER TABLE doctors ADD COLUMN IF NOT EXISTS specialization VARCHAR(255)');
        await pool.query('ALTER TABLE doctors ADD COLUMN IF NOT EXISTS license_number VARCHAR(100)');
        await pool.query('ALTER TABLE doctors ADD COLUMN IF NOT EXISTS hospital_name VARCHAR(255)');
        await pool.query('ALTER TABLE doctors ADD COLUMN IF NOT EXISTS kyc_data JSONB');
        
        await pool.query('ALTER TABLE ngos ADD COLUMN IF NOT EXISTS ngo_type VARCHAR(100)');
        await pool.query('ALTER TABLE ngos ADD COLUMN IF NOT EXISTS reg_number VARCHAR(100)');
        await pool.query('ALTER TABLE ngos ADD COLUMN IF NOT EXISTS pan_number VARCHAR(100)');
        await pool.query('ALTER TABLE ngos ADD COLUMN IF NOT EXISTS address TEXT');
        await pool.query('ALTER TABLE ngos ADD COLUMN IF NOT EXISTS city VARCHAR(100)');
        await pool.query('ALTER TABLE ngos ADD COLUMN IF NOT EXISTS state VARCHAR(100)');
        await pool.query('ALTER TABLE ngos ADD COLUMN IF NOT EXISTS service_area TEXT');
        await pool.query('ALTER TABLE ngos ADD COLUMN IF NOT EXISTS work_type VARCHAR(100)');
        await pool.query('ALTER TABLE ngos ADD COLUMN IF NOT EXISTS kyc_data JSONB');
        
        console.log("Migration complete.");
    } catch(e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
run();
