import { requireAdmin } from '@/lib/admin-auth';
import prisma from '@/lib/prisma';

export async function GET(request) {
  const admin = requireAdmin(request);
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const configs = await prisma.siteConfig.findMany();
    const obj = {};
    configs.forEach(c => { obj[c.key] = c.value; });
    return Response.json(obj);
  } catch (e) {
    return Response.json({});
  }
}

export async function POST(request) {
  const admin = requireAdmin(request);
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    for (const [key, value] of Object.entries(body)) {
      if (value === '' || value === null || value === undefined) continue;
      await prisma.siteConfig.upsert({
        where: { key },
        update: { value: String(value), updatedAt: new Date() },
        create: { key, value: String(value) },
      });
    }
    return Response.json({ ok: true });
  } catch (e) {
    console.error('[api/admin/site-config]', e);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
