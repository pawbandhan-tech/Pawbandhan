import { requireAdmin } from '@/lib/admin-auth';
import prisma from '@/lib/prisma';

export async function GET(request) {
  const admin = requireAdmin(request);
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const ngos = await prisma.nGO.findMany({ orderBy: { createdAt: 'desc' } });
    return Response.json(ngos);
  } catch (e) {
    return Response.json([]);
  }
}
