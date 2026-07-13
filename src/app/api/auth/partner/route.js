import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

function getEntityTable(role) {
  if (role === 'doctor') return 'doctor';
  if (role === 'ngo') return 'nGO';
  if (role === 'representative' || role === 'rep') return 'representative';
  if (role === 'rider') return 'rider';
  return null;
}

const roleConfig = {
  doctor: { nameField: 'name', idField: 'uid' },
  ngo: { nameField: 'name', idField: 'uid' },
  representative: { nameField: 'name', idField: 'uid' },
  rider: { nameField: 'name', idField: 'uid' },
};

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, password, name, phone, role, action } = body;

    if (!email || !password) {
      return Response.json({ error: 'Email and password required' }, { status: 400 });
    }

    const entityTable = getEntityTable(role);
    if (!entityTable) {
      return Response.json({ error: 'Invalid role' }, { status: 400 });
    }

    const cfg = roleConfig[role] || roleConfig.doctor;

    if (action === 'register') {
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return Response.json({ error: 'Email already registered' }, { status: 409 });
      }

      // Check entity table too
      const existingEntity = await prisma[entityTable].findUnique({ where: { email } });
      if (existingEntity) {
        return Response.json({ error: 'Account already exists with this email' }, { status: 409 });
      }

      const uid = uuidv4();
      const hash = await bcrypt.hash(password, 12);

      const user = await prisma.user.create({
        data: {
          uid,
          email,
          passwordHash: hash,
          firstName: name || email.split('@')[0],
          phoneNo: phone || '',
          role,
          status: 'pending',
        },
      });

      const entityData = {
        uid,
        email,
        phone: phone || '',
        name: name || '',
        status: 'pending',
      };
      await prisma[entityTable].create({ data: entityData });

      return Response.json({ uid, name: name || user.firstName });
    }

    // LOGIN
    // 1) Try the entity table first
    const entity = await prisma[entityTable].findUnique({ where: { email } });
    if (entity) {
      const linkedUser = await prisma.user.findUnique({ where: { uid: entity.uid } });
      if (linkedUser && linkedUser.passwordHash) {
        const valid = await bcrypt.compare(password, linkedUser.passwordHash);
        if (valid) {
          return Response.json({ uid: entity[cfg.idField] || entity.uid, name: entity[cfg.nameField] });
        }
        return Response.json({ error: 'Invalid password' }, { status: 401 });
      }
      // Entity exists but no linked user with password — allow login with entity uid
      return Response.json({ uid: entity[cfg.idField] || entity.uid, name: entity[cfg.nameField] });
    }

    // 2) Try user table (for partners registered via /api/admin/create-user)
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

    // 3) Admin SSO fallback — check admin_users table
    const admin = await prisma.adminUser.findUnique({ where: { email } });
    if (admin && admin.passwordHash) {
      const valid = await bcrypt.compare(password, admin.passwordHash);
      if (valid && (admin.role === 'admin' || admin.role === 'co-admin')) {
        // Admin has access — find any entity of this type to proxy into
        const anyEntity = await prisma[entityTable].findFirst();
        if (anyEntity) {
          return Response.json({
            uid: anyEntity[cfg.idField] || anyEntity.uid,
            name: admin.name || 'Admin',
            adminSso: true,
          });
        }
        // No entities of this type exist yet — create a temp session with admin uid
        return Response.json({
          uid: admin.email,
          name: admin.name || 'Admin',
          adminSso: true,
          noEntities: true,
        });
      }
      return Response.json({ error: 'Invalid password' }, { status: 401 });
    }

    return Response.json({ error: 'Account not found. Please sign up first.' }, { status: 404 });
  } catch (e) {
    console.error('[api/auth/partner]', e);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
