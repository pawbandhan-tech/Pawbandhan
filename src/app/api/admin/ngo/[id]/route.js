import { requireAdmin } from '@/lib/admin-auth';
import prisma from '@/lib/prisma';

export async function GET(request, { params }) {
  const admin = requireAdmin(request);
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    const ngo = await prisma.nGO.findUnique({ where: { id: parseInt(id) } });
    if (!ngo) return Response.json({ error: 'NGO not found' }, { status: 404 });
    return Response.json(ngo);
  } catch (e) {
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
