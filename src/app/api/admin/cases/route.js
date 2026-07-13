import { requireAdmin } from '@/lib/admin-auth';
import prisma from '@/lib/prisma';

export async function GET(request) {
  const admin = requireAdmin(request);
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const cases = await prisma.case.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    const ngoIds = [...new Set(cases.map(c => c.ngoId).filter(Boolean))];
    const ngos = await prisma.nGO.findMany({ where: { id: { in: ngoIds } } });
    const ngoMap = {};
    ngos.forEach(n => { ngoMap[n.id] = n.name; });

    const enriched = cases.map(c => ({
      ...c,
      ngoName: ngoMap[c.ngoId] || null,
    }));

    return Response.json(enriched);
  } catch (e) {
    console.error('[api/admin/cases]', e);
    return Response.json([]);
  }
}
