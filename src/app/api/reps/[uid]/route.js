import prisma from '@/lib/prisma';

export async function GET(request, { params }) {
  try {
    const { uid } = await params;
    const rep = await prisma.representative.findFirst({ where: { uid } });
    if (!rep) return Response.json({ error: 'Representative not found' }, { status: 404 });
    return Response.json({
      id: rep.id,
      uid: rep.uid,
      name: rep.name,
      email: rep.email,
      phone: rep.phone,
      vehicleType: rep.vehicleType,
      vehicleNumber: rep.vehicleNumber,
      licenseNumber: rep.licenseNumber,
      status: rep.status,
      repId: rep.repId,
      trackingId: rep.trackingId,
      isOnline: rep.isOnline,
      kycData: rep.kycData,
      ngoId: rep.ngoId,
      createdAt: rep.createdAt,
    });
  } catch (e) {
    console.error('[api/reps GET]', e);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { uid } = await params;
    const body = await request.json();
    const rep = await prisma.representative.findFirst({ where: { uid } });
    if (!rep) return Response.json({ error: 'Representative not found' }, { status: 404 });

    const updateData = {};
    if (body.vehicleType !== undefined) updateData.vehicleType = body.vehicleType;
    if (body.vehicleNumber !== undefined) updateData.vehicleNumber = body.vehicleNumber;
    if (body.licenseNumber !== undefined) updateData.licenseNumber = body.licenseNumber;
    if (body.kycData !== undefined) updateData.kycData = body.kycData;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.isOnline !== undefined) updateData.isOnline = body.isOnline;
    if (body.lastLat !== undefined) updateData.lastLat = body.lastLat;
    if (body.lastLng !== undefined) updateData.lastLng = body.lastLng;
    if (body.lastLocationAt !== undefined) updateData.lastLocationAt = body.lastLocationAt;

    const updated = await prisma.representative.update({
      where: { id: rep.id },
      data: updateData,
    });

    return Response.json({ ok: true, rep: updated });
  } catch (e) {
    console.error('[api/reps PUT]', e);
    return Response.json({ error: 'Update failed' }, { status: 500 });
  }
}
