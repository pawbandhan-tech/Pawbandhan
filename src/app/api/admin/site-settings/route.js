import { requireAdmin } from '@/lib/admin-auth';
import prisma from '@/lib/prisma';

export async function GET(request) {
  const admin = requireAdmin(request);
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const [configs, settings] = await Promise.all([
      prisma.siteConfig.findMany(),
      prisma.siteSetting.findMany(),
    ]);

    const result = {};
    configs.forEach(c => {
      try {
        result[c.key] = JSON.parse(c.value);
      } catch {
        result[c.key] = c.value;
      }
    });

    settings.forEach(s => {
      const prefixedKey = `setting_${s.key}`;
      try {
        result[prefixedKey] = JSON.parse(s.value);
      } catch {
        result[prefixedKey] = s.value;
      }
    });

    return Response.json(result);
  } catch (e) {
    console.error('[api/admin/site-settings] GET', e);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request) {
  const admin = requireAdmin(request);
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const entries = Object.entries(body);

    if (entries.length === 0) {
      return Response.json({ error: 'No settings provided' }, { status: 400 });
    }

    const results = [];

    for (const [key, value] of entries) {
      if (value === '' || value === null || value === undefined) continue;
      const stored = typeof value === 'string' ? value : JSON.stringify(value);

      if (key.startsWith('setting_')) {
        const rawKey = key.replace(/^setting_/, '');
        await prisma.siteSetting.upsert({
          where: { key: rawKey },
          update: { value: stored, updatedAt: new Date() },
          create: { key: rawKey, value: stored },
        });
        results.push({ key: rawKey, table: 'site_settings' });
      } else {
        await prisma.siteConfig.upsert({
          where: { key },
          update: { value: stored, updatedAt: new Date() },
          create: { key, value: stored },
        });
        results.push({ key, table: 'site_config' });
      }
    }

    return Response.json({ ok: true, updated: results });
  } catch (e) {
    console.error('[api/admin/site-settings] POST', e);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
