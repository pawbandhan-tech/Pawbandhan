/**
 * Vercel serverless API — Express + Neon (set DATABASE_URL in Vercel env).
 */
const path = require('path');
const serverless = require('serverless-http');

let handler;
let getDbReady;

function loadApp() {
    if (handler) return;
    require('dotenv').config({ path: path.join(__dirname, '..', 'backend_api', '.env') });
    const mod = require(path.join(__dirname, '..', 'backend_api', 'server'));
    getDbReady = mod.getDbReady;
    handler = serverless(mod.app, {
        binary: ['image/*', 'application/octet-stream', 'multipart/form-data']
    });
}

function sendError(res, status, message, detail) {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
        error: message,
        detail: detail || undefined,
        hint: status === 503
            ? 'Add DATABASE_URL in Vercel → Settings → Environment Variables (Neon connection string).'
            : undefined
    }));
}

module.exports = async (req, res) => {
    try {
        loadApp();
        await getDbReady();
        const orig = req.headers['x-vercel-original-url'] || req.headers['x-original-url'];
        if (orig && typeof orig === 'string' && (!req.url || req.url === '/' || req.url === '/api')) {
            req.url = orig.startsWith('/') ? orig : '/' + orig;
        }
        return await handler(req, res);
    } catch (err) {
        console.error('FUNCTION_INVOCATION_FAILED', err);
        sendError(res, 500, err.message || 'API failed to start', process.env.VERCEL ? String(err.stack || '').split('\n')[0] : undefined);
    }
};
