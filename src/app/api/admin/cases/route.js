import { requireAdmin } from '@/lib/admin-auth';
import prisma from '@/lib/prisma';

export async function GET(request) {
  const admin = requireAdmin(request);
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const cases = await prisma.incident.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        ngo: { select: { name: true } },
        doctor: { select: { name: true } },
        rep: { select: { name: true } },
      },
    });

    const enriched = cases.map(c => ({
      id: c.id,
      incidentCode: c.incidentCode,
      animalType: c.animalType,
      description: c.description,
      status: c.status,
      workflowStatus: c.workflowStatus,
      ngoId: c.ngoId,
      ngoName: c.ngo?.name || null,
      doctorId: c.doctorId,
      doctorName: c.doctor?.name || null,
      repId: c.repId,
      repName: c.rep?.name || null,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));

    return Response.json(enriched);
  } catch (e) {
    console.error('[api/admin/cases]', e);
    return Response.json([]);
  }
}
