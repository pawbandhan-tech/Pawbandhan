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

export async function PUT(request, { params }) {
  try {
    const { uid } = await params;
    const { name, phone, gender } = await request.json();

    const user = await prisma.user.findFirst({ where: { uid } });
    if (!user) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    const firstName = name || user.firstName;

    await prisma.user.update({
      where: { id: user.id },
      data: { firstName, phoneNo: phone || user.phoneNo, gender: gender || user.gender },
    });

    await prisma.customer.updateMany({
      where: { uid },
      data: { name: name || undefined, phone: phone || undefined, gender: gender || undefined },
    });

    return Response.json({ ok: true, name: firstName, phone: phone || user.phoneNo, gender: gender || user.gender });
  } catch (e) {
    console.error('[api/users/profile PUT]', e);
    return Response.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
