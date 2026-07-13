import { requireAdmin } from '@/lib/admin-auth';
import prisma from '@/lib/prisma';

export async function GET(request) {
  const admin = requireAdmin(request);
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('entityType');
    const entityId = searchParams.get('entityId');
    const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 500);

    const where = {};
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = parseInt(entityId, 10);

    const logs = await prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return Response.json(logs);
  } catch (e) {
    console.error('[api/admin/activity-log] GET', e);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request) {
  const admin = requireAdmin(request);
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { entityType, entityId, entityUid, action, details } = await request.json();

    if (!entityType || !entityId || !action) {
      return Response.json({ error: 'entityType, entityId, and action are required' }, { status: 400 });
    }

    let ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null;
    if (ip && ip.includes(',')) ip = ip.split(',')[0].trim();

    const log = await prisma.activityLog.create({
      data: {
        entityType,
        entityId: parseInt(entityId, 10),
        entityUid: entityUid || null,
        action,
        details: details || undefined,
        ip,
      },
    });

    return Response.json({ ok: true, log });
  } catch (e) {
    console.error('[api/admin/activity-log] POST', e);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
