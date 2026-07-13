import { requireAdmin } from '@/lib/admin-auth';
import prisma from '@/lib/prisma';

const CMS_PREFIXES = ['news_', 'announcement_', 'banner_', 'maintenance_', 'schedule_'];

function isCmsKey(key) {
  return CMS_PREFIXES.some(prefix => key.startsWith(prefix));
}

export async function GET(request) {
  const admin = requireAdmin(request);
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const configs = await prisma.siteConfig.findMany();
    const cms = {};
    configs.forEach(c => {
      if (isCmsKey(c.key)) {
        try {
          cms[c.key] = JSON.parse(c.value);
        } catch {
          cms[c.key] = c.value;
        }
      }
    });

    return Response.json(cms);
  } catch (e) {
    console.error('[api/admin/cms] GET', e);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request) {
  const admin = requireAdmin(request);
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();

    if (body.key && body.value !== undefined) {
      const value = typeof body.value === 'string' ? body.value : JSON.stringify(body.value);
      await prisma.siteConfig.upsert({
        where: { key: body.key },
        update: { value, updatedAt: new Date() },
        create: { key: body.key, value },
      });
      return Response.json({ ok: true });
    }

    if (body.action && body.id !== undefined && body.data) {
      const { action, id, data } = body;
      const collectionKey = data.collectionKey || 'news_items';

      const record = await prisma.siteConfig.findUnique({ where: { key: collectionKey } });
      let items = [];
      if (record && record.value) {
        try {
          items = JSON.parse(record.value);
          if (!Array.isArray(items)) items = [];
        } catch {
          items = [];
        }
      }

      if (action === 'create') {
        const newItem = { id: Date.now(), ...data, createdAt: new Date().toISOString() };
        items.push(newItem);
      } else if (action === 'update') {
        items = items.map(item => item.id === id ? { ...item, ...data, updatedAt: new Date().toISOString() } : item);
      } else if (action === 'delete') {
        items = items.filter(item => item.id !== id);
      } else {
        return Response.json({ error: `Invalid action: ${action}` }, { status: 400 });
      }

      await prisma.siteConfig.upsert({
        where: { key: collectionKey },
        update: { value: JSON.stringify(items), updatedAt: new Date() },
        create: { key: collectionKey, value: JSON.stringify(items) },
      });

      return Response.json({ ok: true, items });
    }

    if (body.action && body.id !== undefined) {
      const targetKey = body.collectionKey || body.key || 'news_items';

      const record = await prisma.siteConfig.findUnique({ where: { key: targetKey } });
      let items = [];
      if (record && record.value) {
        try {
          items = JSON.parse(record.value);
          if (!Array.isArray(items)) items = [];
        } catch {
          items = [];
        }
      }

      if (body.action === 'delete') {
        items = items.filter(item => item.id !== body.id);
      } else if (body.action === 'update' && body.data) {
        items = items.map(item => item.id === body.id ? { ...item, ...body.data, updatedAt: new Date().toISOString() } : item);
      } else if (body.action === 'create') {
        const newItem = { id: Date.now(), ...body.data, createdAt: new Date().toISOString() };
        items.push(newItem);
      }

      await prisma.siteConfig.upsert({
        where: { key: targetKey },
        update: { value: JSON.stringify(items), updatedAt: new Date() },
        create: { key: targetKey, value: JSON.stringify(items) },
      });

      return Response.json({ ok: true, items });
    }

    const entries = Object.entries(body);
    if (entries.length > 0) {
      for (const [key, value] of entries) {
        if (value === '' || value === null || value === undefined) continue;
        const stored = typeof value === 'string' ? value : JSON.stringify(value);
        await prisma.siteConfig.upsert({
          where: { key },
          update: { value: stored, updatedAt: new Date() },
          create: { key, value: stored },
        });
      }
      return Response.json({ ok: true });
    }

    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  } catch (e) {
    console.error('[api/admin/cms] POST', e);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
