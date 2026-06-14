/**
 * Fast profile route — does NOT load Express (fixes FUNCTION_INVOCATION_TIMEOUT).
 */
const { getCustomerProfile, upsertCustomerProfile } = require('../../lib/db');

function cors(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function json(res, status, body) {
    cors(res);
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(body));
}

async function readBody(req) {
    if (req.body && typeof req.body === 'object') return req.body;
    return new Promise((resolve, reject) => {
        let data = '';
        req.on('data', (chunk) => { data += chunk; });
        req.on('end', () => {
            if (!data) return resolve({});
            try { resolve(JSON.parse(data)); } catch (e) { reject(new Error('Invalid JSON body')); }
        });
        req.on('error', reject);
    });
}

function resolveUid(req) {
    if (req.query?.uid) return String(req.query.uid);
    const url = req.url || '';
    const match = url.match(/\/customers\/([^/?]+)\/profile/i);
    return match ? decodeURIComponent(match[1]) : null;
}

module.exports = async (req, res) => {
    if (req.method === 'OPTIONS') {
        cors(res);
        res.statusCode = 204;
        return res.end();
    }

    const uid = resolveUid(req);
    if (!uid) return json(res, 400, { error: 'Missing customer uid' });

    try {
        if (req.method === 'GET') {
            return json(res, 200, await getCustomerProfile(uid));
        }
        if (req.method === 'POST' || req.method === 'PATCH' || req.method === 'PUT') {
            const body = await readBody(req);
            const result = await upsertCustomerProfile(uid, body);
            return json(res, 200, result);
        }
        return json(res, 405, { error: 'Method not allowed' });
    } catch (err) {
        console.error('profile route error:', uid, err.message);
        const status = err.status || 500;
        return json(res, status, {
            error: err.message || 'Profile request failed',
            hint: status === 503 ? 'Set DATABASE_URL in Vercel → pawbandhan-tech project → Environment Variables.' : undefined
        });
    }
};
