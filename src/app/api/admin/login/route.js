import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { signAdminToken, seedAdmin } from '@/lib/admin-auth';

export async function POST(request) {
  await seedAdmin();
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return Response.json({ error: 'Email and password required' }, { status: 400 });
    }
    const admin = await prisma.adminUser.findUnique({ where: { email } });
    if (!admin) {
      return Response.json({ error: 'Invalid credentials' }, { status: 401 });
    }
    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) {
      return Response.json({ error: 'Invalid credentials' }, { status: 401 });
    }
    await prisma.adminUser.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    });
    const token = signAdminToken(admin);
    return Response.json({ token, admin: { id: admin.id, email: admin.email, name: admin.name } });
  } catch (e) {
    console.error('[api/admin/login]', e);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
