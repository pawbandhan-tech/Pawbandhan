import prisma from '@/lib/prisma';

export async function GET(request, { params }) {
  try {
    const { uid } = await params;
    const ngo = await prisma.nGO.findFirst({ where: { uid } });
    if (!ngo) return Response.json([]);

    const cases = await prisma.case.findMany({
      where: { ngoId: ngo.id },
      orderBy: { createdAt: 'desc' },
    });

    return Response.json(cases);
  } catch (e) {
    return Response.json([]);
  }
}
