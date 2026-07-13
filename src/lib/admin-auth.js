import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import prisma from './prisma';

const JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'pawbandhan-dev-secret';
const JWT_EXPIRES = process.env.ADMIN_JWT_EXPIRES || '12h';

export async function seedAdmin() {
  try {
    const email = process.env.ADMIN_EMAIL || 'admin@pawbandhan.com';
    const password = process.env.ADMIN_PASSWORD || 'Admin@123';
    const existing = await prisma.adminUser.findUnique({ where: { email } });
    if (!existing) {
      const hash = await bcrypt.hash(password, 12);
      await prisma.adminUser.create({ data: { email, passwordHash: hash, name: 'Administrator' } });
      console.log('[auth] seeded admin:', email);
    }
  } catch (e) {
    console.error('[auth] seed admin failed:', e.message);
  }
}

export function signAdminToken(admin) {
  return jwt.sign(
    { sub: admin.id, email: admin.email, role: 'admin', name: admin.name },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );
}

export function verifyAdminToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

export function requireAdmin(request) {
  const auth = request.headers.get('authorization');
  if (!auth || !auth.startsWith('Bearer ')) return null;
  try {
    const payload = verifyAdminToken(auth.slice(7));
    if (payload.role !== 'admin') return null;
    return payload;
  } catch {
    return null;
  }
}
