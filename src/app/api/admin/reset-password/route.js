import { requireAdmin } from '@/lib/admin-auth';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

const ENTITY_MAP = {
  customer: { model: 'customer', userLink: 'uid' },
  user: { model: null, userLink: 'self' },
  ngo: { model: 'nGO', userLink: 'uid' },
  doctor: { model: 'doctor', userLink: 'uid' },
  rider: { model: 'rider', userLink: 'uid' },
  representative: { model: 'representative', userLink: 'uid' },
};

export async function POST(request) {
  const admin = requireAdmin(request);
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { entityType, entityId, newPassword } = await request.json();

    if (!entityType || !entityId || !newPassword) {
      return Response.json({ error: 'entityType, entityId, and newPassword are required' }, { status: 400 });
    }

    const config = ENTITY_MAP[entityType];
    if (!config) {
      return Response.json({ error: `Invalid entityType: ${entityType}` }, { status: 400 });
    }

    const hash = await bcrypt.hash(newPassword, 12);
    let userUid = null;
    let userName = null;

    if (config.userLink === 'self') {
      const user = await prisma.user.findUnique({ where: { id: parseInt(entityId, 10) } });
      if (!user) return Response.json({ error: 'User not found' }, { status: 404 });
      await prisma.user.update({ where: { id: user.id }, data: { passwordHash: hash } });
      userUid = user.uid;
      userName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email;
    } else if (config.model) {
      const entity = await prisma[config.model].findUnique({ where: { id: parseInt(entityId, 10) } });
      if (!entity) return Response.json({ error: `${entityType} not found` }, { status: 404 });

      userUid = entity.uid;
      userName = entity.name || entity.email;

      if (entity.uid) {
        const user = await prisma.user.findFirst({ where: { uid: entity.uid } });
        if (user) {
          await prisma.user.update({ where: { id: user.id }, data: { passwordHash: hash } });
        }
      }
    }

    await prisma.activityLog.create({
      data: {
        entityType,
        entityId: parseInt(entityId, 10),
        entityUid: userUid,
        action: 'admin_password_reset',
        details: { adminEmail: admin.email, targetName: userName },
      },
    });

    return Response.json({ ok: true, message: 'Password reset successfully' });
  } catch (e) {
    console.error('[api/admin/reset-password] POST', e);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
