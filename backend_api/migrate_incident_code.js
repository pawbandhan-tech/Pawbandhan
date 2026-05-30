/**
 * Adds incident_code to legacy incidents table (had incident_id instead).
 * Run: node migrate_incident_code.js
 */
require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
    console.log('Migrating incidents schema…');

    await pool.query('ALTER TABLE incidents ADD COLUMN IF NOT EXISTS incident_code VARCHAR(50)');
    await pool.query('CREATE UNIQUE INDEX IF NOT EXISTS incidents_incident_code_uidx ON incidents (incident_code) WHERE incident_code IS NOT NULL');

    const hasIncidentId = await pool.query(
        "SELECT 1 FROM information_schema.columns WHERE table_name = 'incidents' AND column_name = 'incident_id' LIMIT 1"
    );
    if (hasIncidentId.rows.length) {
        await pool.query(`
            UPDATE incidents
            SET incident_code = COALESCE(NULLIF(TRIM(incident_code), ''), NULLIF(TRIM(incident_id::text), ''))
            WHERE incident_code IS NULL OR TRIM(incident_code) = ''
        `);
    }

    const missing = await pool.query(
        "SELECT id FROM incidents WHERE incident_code IS NULL OR TRIM(incident_code) = ''"
    );
    for (const row of missing.rows) {
        const code = 'PB' + Date.now().toString().slice(-10) + String(row.id).padStart(4, '0');
        await pool.query(
            'UPDATE incidents SET incident_code = $1, incident_id = COALESCE(NULLIF(TRIM(incident_id::text), \'\'), $1) WHERE id = $2',
            [code, row.id]
        );
    }
    await pool.query(`
        UPDATE incidents SET incident_id = incident_code
        WHERE (incident_id IS NULL OR TRIM(incident_id::text) = '') AND incident_code IS NOT NULL
    `);

    const alters = [
        "ALTER TABLE cases ADD COLUMN IF NOT EXISTS incident_code VARCHAR(50)",
        "ALTER TABLE cases ADD COLUMN IF NOT EXISTS workflow_status VARCHAR(80) DEFAULT 'reported'",
        "ALTER TABLE cases ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,8)",
        "ALTER TABLE cases ADD COLUMN IF NOT EXISTS longitude DECIMAL(11,8)",
        "ALTER TABLE incidents ADD COLUMN IF NOT EXISTS images TEXT[]",
        "ALTER TABLE incidents ADD COLUMN IF NOT EXISTS incident_type VARCHAR(50)",
        "ALTER TABLE incidents ADD COLUMN IF NOT EXISTS ngo_id INTEGER",
        "ALTER TABLE incidents ADD COLUMN IF NOT EXISTS workflow_status VARCHAR(80) DEFAULT 'reported'",
        "ALTER TABLE incidents ADD COLUMN IF NOT EXISTS rep_id INTEGER",
        "ALTER TABLE incidents ADD COLUMN IF NOT EXISTS doctor_id INTEGER"
    ];
    for (const sql of alters) {
        try {
            await pool.query(sql);
        } catch (e) {
            console.warn('Alter skipped:', e.message);
        }
    }

    const cols = await pool.query(
        "SELECT column_name FROM information_schema.columns WHERE table_name = 'incidents' AND column_name IN ('incident_code','incident_id')"
    );
    console.log('incidents keys:', cols.rows.map((r) => r.column_name).join(', '));
    console.log('Migration complete.');
}

run()
    .then(() => pool.end())
    .catch((e) => {
        console.error(e);
        pool.end();
        process.exit(1);
    });
