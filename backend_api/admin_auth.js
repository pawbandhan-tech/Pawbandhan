const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || 'pawbandhan-dev-admin-secret-change-in-production';
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@pawbandhan.com').trim().toLowerCase();

function signToken(admin) {
    return jwt.sign(
        { sub: admin.id, email: admin.email, role: 'admin', name: admin.name },
        JWT_SECRET,
        { expiresIn: process.env.ADMIN_JWT_EXPIRES || '12h' }
    );
}

function requireAdmin(req, res, next) {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
    if (!token) {
        return res.status(401).json({ error: 'Admin authentication required' });
    }
    try {
        const payload = jwt.verify(token, JWT_SECRET);
        if (payload.role !== 'admin') {
            return res.status(403).json({ error: 'Invalid admin session' });
        }
        req.admin = payload;
        next();
    } catch (e) {
        return res.status(401).json({ error: 'Session expired. Please sign in again.' });
    }
}

async function ensureAdminTable(pool) {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS admin_users (
            id SERIAL PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            name VARCHAR(255) DEFAULT 'Administrator',
            active BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT NOW(),
            last_login_at TIMESTAMP
        );
    `);
}

async function seedAdminUser(pool) {
    const email = ADMIN_EMAIL;
    const existing = await pool.query('SELECT id FROM admin_users WHERE LOWER(email) = $1', [email]);
    if (existing.rows.length) return;

    const password = process.env.ADMIN_PASSWORD;
    if (!password) {
        if (process.env.NODE_ENV === 'production') {
            console.warn('ADMIN_PASSWORD is not set — create an admin user in Neon or set ADMIN_PASSWORD on Render.');
        } else {
            const hash = await bcrypt.hash('Admin@123', 12);
            await pool.query(
                'INSERT INTO admin_users (email, password_hash, name) VALUES ($1, $2, $3)',
                [email, hash, 'PawBandhan Admin']
            );
            console.log('Dev admin seeded:', email, '(set ADMIN_PASSWORD in production)');
        }
        return;
    }
    const hash = await bcrypt.hash(password, 12);
    await pool.query(
        'INSERT INTO admin_users (email, password_hash, name) VALUES ($1, $2, $3)',
        [email, hash, 'PawBandhan Admin']
    );
    console.log('Admin user ready:', email);
}

function registerAdminAuth(app, pool) {
    if (!pool) {
        console.warn('Admin auth disabled — no database connection');
        return;
    }

    ensureAdminTable(pool)
        .then(() => seedAdminUser(pool))
        .catch((err) => console.error('Admin auth init failed:', err.message));

    app.post('/api/admin/login', async (req, res) => {
        try {
            const email = (req.body.email || '').trim().toLowerCase();
            const password = req.body.password || '';
            if (!email || !password) {
                return res.status(400).json({ error: 'Email and password are required' });
            }
            const result = await pool.query(
                'SELECT id, email, password_hash, name, active FROM admin_users WHERE LOWER(email) = $1',
                [email]
            );
            if (!result.rows.length || !result.rows[0].active) {
                return res.status(401).json({ error: 'Invalid email or password' });
            }
            const admin = result.rows[0];
            const valid = await bcrypt.compare(password, admin.password_hash);
            if (!valid) {
                return res.status(401).json({ error: 'Invalid email or password' });
            }
            await pool.query('UPDATE admin_users SET last_login_at = NOW() WHERE id = $1', [admin.id]);
            const token = signToken(admin);
            res.json({
                success: true,
                token,
                admin: { id: admin.id, email: admin.email, name: admin.name }
            });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    app.get('/api/admin/me', requireAdmin, (req, res) => {
        res.json({
            success: true,
            admin: { id: req.admin.sub, email: req.admin.email, name: req.admin.name }
        });
    });

    app.use((req, res, next) => {
        if (!req.path.startsWith('/api/admin')) return next();
        if (req.method === 'POST' && req.path === '/api/admin/login') return next();
        return requireAdmin(req, res, next);
    });
}

module.exports = { registerAdminAuth, requireAdmin };
