import prisma from '@/lib/prisma';

export async function GET(request, { params }) {
  try {
    const { uid } = await params;
    const user = await prisma.user.findFirst({ where: { uid } });
    if (!user) return Response.json([]);

    const incidents = await prisma.incident.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return Response.json(incidents.map(i => ({
      id: i.id,
      incidentCode: i.incidentCode,
      animalType: i.animalType,
      status: i.status,
      workflowStatus: i.workflowStatus,
      description: i.description,
      createdAt: i.createdAt,
    })));
  } catch (e) {
    console.error('[api/users/cases-track]', e);
    return Response.json([]);
  }
}
