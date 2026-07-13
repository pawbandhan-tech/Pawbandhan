import { requireAdmin } from '@/lib/admin-auth';
import prisma from '@/lib/prisma';

export async function POST(request) {
  const admin = requireAdmin(request);
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const reviews = await prisma.siteReview.findMany();
    const seen = new Set();
    let deleted = 0;
    for (const r of reviews) {
      const key = `${r.name}|${r.quote}`;
      if (seen.has(key)) {
        await prisma.siteReview.delete({ where: { id: r.id } });
        deleted++;
      } else {
        seen.add(key);
      }
    }
    return Response.json({ ok: true, deleted });
  } catch (e) {
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
