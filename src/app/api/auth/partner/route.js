import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, password, name, phone, role, action } = body;

    if (!email || !password) {
      return Response.json({ error: 'Email and password required' }, { status: 400 });
    }

    // ─── REGISTER ───
    if (action === 'register') {
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return Response.json({ error: 'Email already registered' }, { status: 409 });
      }

      const uid = uuidv4();
      const hash = await bcrypt.hash(password, 12);

      const user = await prisma.user.create({
        data: {
          uid, email, passwordHash: hash,
          firstName: name || email.split('@')[0],
          phoneNo: phone || '', role, status: 'pending',
        },
      });

      const base = { uid, email, phone: phone || '', name: name || '', status: 'pending' };

      if (role === 'doctor') {
        await prisma.doctor.create({ data: base });
      } else if (role === 'ngo') {
        await prisma.nGO.create({ data: base });
      } else if (role === 'representative') {
        await prisma.representative.create({ data: base });
      } else if (role === 'rider') {
        await prisma.rider.create({ data: base });
      }

      return Response.json({ uid, name: name || user.firstName });
    }

    // ─── LOGIN ───

    // Helper: verify linked user password
    async function verifyPassword(uid) {
      const u = await prisma.user.findUnique({ where: { uid } });
      if (!u || !u.passwordHash) return true; // no password set = allow
      return bcrypt.compare(password, u.passwordHash);
    }

    // 1) Try entity table by email (use findFirst since email may not be unique on all models)
    if (role === 'doctor') {
      const doc = await prisma.doctor.findFirst({ where: { email } });
      if (doc) {
        if (!(await verifyPassword(doc.uid))) {
          return Response.json({ error: 'Invalid password' }, { status: 401 });
        }
        return Response.json({ uid: doc.uid || doc.id, name: doc.name });
      }
    } else if (role === 'ngo') {
      const ngo = await prisma.nGO.findFirst({ where: { email } });
      if (ngo) {
        if (!(await verifyPassword(ngo.uid))) {
          return Response.json({ error: 'Invalid password' }, { status: 401 });
        }
        return Response.json({ uid: ngo.uid || ngo.id, name: ngo.name });
      }
    } else if (role === 'representative') {
      const rep = await prisma.representative.findFirst({ where: { email } });
      if (rep) {
        if (!(await verifyPassword(rep.uid))) {
          return Response.json({ error: 'Invalid password' }, { status: 401 });
        }
        return Response.json({ uid: rep.uid || rep.id, name: rep.name });
      }
    } else if (role === 'rider') {
      const rider = await prisma.rider.findFirst({ where: { email } });
      if (rider) {
        if (!(await verifyPassword(rider.uid))) {
          return Response.json({ error: 'Invalid password' }, { status: 401 });
        }
        return Response.json({ uid: rider.uid || rider.id, name: rider.name });
      }
    }

    // 2) Try user table
    const user = await prisma.user.findFirst({ where: { email, role } });
    if (user) {
      if (user.passwordHash) {
        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
          return Response.json({ error: 'Invalid password' }, { status: 401 });
        }
      }
      return Response.json({ uid: user.uid, name: user.firstName });
    }

    // 3) Admin SSO — check admin_users
    const admin = await prisma.adminUser.findUnique({ where: { email } });
    if (admin && admin.passwordHash) {
      const valid = await bcrypt.compare(password, admin.passwordHash);
      if (valid && (admin.role === 'admin' || admin.role === 'co-admin')) {
        let anyEntity = null;
        if (role === 'doctor') anyEntity = await prisma.doctor.findFirst();
        else if (role === 'ngo') anyEntity = await prisma.nGO.findFirst();
        else if (role === 'representative') anyEntity = await prisma.representative.findFirst();
        else if (role === 'rider') anyEntity = await prisma.rider.findFirst();

        if (anyEntity) {
          return Response.json({
            uid: anyEntity.uid || anyEntity.id,
            name: admin.name || 'Admin',
          });
        }

        return Response.json({
          uid: admin.email,
          name: admin.name || 'Admin',
        });
      }
      return Response.json({ error: 'Invalid password' }, { status: 401 });
    }

    return Response.json({ error: 'Account not found. Please sign up first.' }, { status: 404 });
  } catch (e) {
    console.error('[api/auth/partner]', e.message, e.stack);
    return Response.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}
