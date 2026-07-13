import prisma from '@/lib/prisma';

export async function GET(request, { params }) {
  try {
    const { uid } = await params;
    const user = await prisma.user.findFirst({ where: { uid } });
    if (!user) return Response.json([]);

    const notifications = await prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 40,
    });

    return Response.json(notifications);
  } catch (e) {
    console.error('[api/users/notifications]', e);
    return Response.json([]);
  }
}
