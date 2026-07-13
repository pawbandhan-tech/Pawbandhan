import { requireAdmin } from '@/lib/admin-auth';
import prisma from '@/lib/prisma';

export async function GET(request) {
  const admin = requireAdmin(request);
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const adminUser = await prisma.adminUser.findUnique({
      where: { id: admin.sub },
      select: { id: true, email: true, name: true, createdAt: true, lastLoginAt: true },
    });
    if (!adminUser) return Response.json({ error: 'Admin not found' }, { status: 404 });
    return Response.json({ admin: adminUser });
  } catch (e) {
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
