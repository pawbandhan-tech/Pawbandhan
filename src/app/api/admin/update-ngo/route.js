import { requireAdmin } from '@/lib/admin-auth';
import prisma from '@/lib/prisma';

export async function POST(request) {
  const admin = requireAdmin(request);
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { id, ...data } = body;
    if (!id) return Response.json({ error: 'NGO ID required' }, { status: 400 });
    const ngo = await prisma.nGO.update({ where: { id }, data });
    return Response.json(ngo);
  } catch (e) {
    console.error('[api/admin/update-ngo]', e);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
