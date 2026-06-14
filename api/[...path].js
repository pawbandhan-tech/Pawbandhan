/**
 * Express catch-all for /api/* (profile + health use dedicated faster routes).
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
            ? 'Add DATABASE_URL in Vercel → pawbandhan-tech → Environment Variables.'
            : undefined
    }));
}

module.exports = async (req, res) => {
    try {
        loadApp();
        // Only wait for minimal schema — full initDB runs in background on Vercel
        const ready = getDbReady();
        const timeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('API warm-up timed out')), 12000)
        );
        await Promise.race([ready, timeout]);

        const segments = req.query.path;
        const subPath = Array.isArray(segments) ? segments.join('/') : (segments || '');
        if (subPath) {
            req.url = '/api/' + subPath + (req.url?.includes('?') ? req.url.slice(req.url.indexOf('?')) : '');
        }
        return await handler(req, res);
    } catch (err) {
        console.error('API_ERROR', err.message);
        sendError(res, err.status || 500, err.message || 'API failed', process.env.VERCEL ? undefined : err.stack);
    }
};
