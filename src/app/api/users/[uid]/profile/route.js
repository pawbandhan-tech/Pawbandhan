import prisma from '@/lib/prisma';

export async function GET(request, { params }) {
  try {
    const { uid } = await params;
    const customer = await prisma.customer.findFirst({ where: { uid } });
    const user = await prisma.user.findFirst({ where: { uid } });
    return Response.json({
      uid,
      name: customer?.name || [user?.firstName, user?.lastName].filter(Boolean).join(' ') || '',
      email: customer?.email || user?.email || '',
      phone: customer?.phone || user?.phoneNo || '',
      gender: customer?.gender || user?.gender || '',
    });
  } catch (e) {
    console.error('[api/users/profile]', e);
    return Response.json({});
  }
}
