const { Pool } = require('pg');
const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_HMw9Dr1VisRW@ep-broad-haze-an4j958g-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require',
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        await pool.query('ALTER TABLE ngos ADD COLUMN IF NOT EXISTS uid VARCHAR(255)');
        await pool.query('ALTER TABLE doctors ADD COLUMN IF NOT EXISTS uid VARCHAR(255)');
        await pool.query('ALTER TABLE riders ADD COLUMN IF NOT EXISTS uid VARCHAR(255)');
        console.log("Migration complete.");
    } catch(e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
run();
