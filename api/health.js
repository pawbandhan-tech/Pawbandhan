const { getPool, ensureProfileSchema } = require('./lib/db');

module.exports = async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    const out = {
        ok: true,
        service: 'pawbandhan-api',
        database: Boolean(process.env.DATABASE_URL),
        route: 'fast-health'
    };

    if (req.query?.db === '1' && process.env.DATABASE_URL) {
        try {
            await ensureProfileSchema();
            const pool = getPool();
            await pool.query('SELECT 1');
            out.databaseOk = true;
        } catch (e) {
            out.databaseOk = false;
            out.dbError = e.message;
        }
    }

    res.statusCode = 200;
    res.end(JSON.stringify(out));
};
