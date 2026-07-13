import prisma from '@/lib/prisma';

export async function GET(request, { params }) {
  try {
    const { uid } = await params;
    const ngo = await prisma.nGO.findFirst({ where: { uid } });
    return Response.json(ngo || {});
  } catch (e) {
    return Response.json({});
  }
}
