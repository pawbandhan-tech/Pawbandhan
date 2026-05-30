/**
 * Vercel serverless entry — serves Express API at /api/* (no Render required).
 * Set DATABASE_URL in Vercel → Project → Settings → Environment Variables.
 */
const path = require('path');
const serverless = require('serverless-http');

require('dotenv').config({ path: path.join(__dirname, '..', 'backend_api', '.env') });

const { app, dbInitPromise } = require('../backend_api/server');

const handler = serverless(app, {
    binary: ['image/*', 'application/octet-stream', 'multipart/form-data']
});

let ready = dbInitPromise;

module.exports = async (req, res) => {
    await ready;
    const orig = req.headers['x-vercel-original-url'] || req.headers['x-original-url'];
    if (orig && typeof orig === 'string' && (!req.url || req.url === '/' || req.url === '/api')) {
        req.url = orig.startsWith('/') ? orig : '/' + orig;
    }
    return handler(req, res);
};
