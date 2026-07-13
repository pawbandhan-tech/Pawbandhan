import prisma from '@/lib/prisma';

export async function GET(request, { params }) {
  try {
    const { uid } = await params;
    const ngo = await prisma.nGO.findFirst({ where: { uid } });
    if (!ngo) return Response.json({ error: 'NGO not found' }, { status: 404 });
    return Response.json({
      id: ngo.id,
      uid: ngo.uid,
      name: ngo.name,
      email: ngo.email,
      phone: ngo.phone,
      ngoType: ngo.ngoType,
      regNumber: ngo.regNumber,
      panNumber: ngo.panNumber,
      address: ngo.address,
      city: ngo.city,
      state: ngo.state,
      serviceArea: ngo.serviceArea,
      workType: ngo.workType,
      status: ngo.status,
      prn: ngo.prn,
      tempPrn: ngo.tempPrn,
      ackNo: ngo.ackNo,
      kycData: ngo.kycData,
      createdAt: ngo.createdAt,
    });
  } catch (e) {
    console.error('[api/ngos GET]', e);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { uid } = await params;
    const body = await request.json();
    const ngo = await prisma.nGO.findFirst({ where: { uid } });
    if (!ngo) return Response.json({ error: 'NGO not found' }, { status: 404 });

    const updateData = {};
    const fields = ['ngoType', 'regNumber', 'panNumber', 'address', 'city', 'state', 'serviceArea', 'workType', 'kycData', 'status'];
    for (const f of fields) {
      if (body[f] !== undefined) updateData[f] = body[f];
    }

    const updated = await prisma.nGO.update({
      where: { id: ngo.id },
      data: updateData,
    });

    return Response.json({ ok: true, ngo: updated });
  } catch (e) {
    console.error('[api/ngos PUT]', e);
    return Response.json({ error: 'Update failed' }, { status: 500 });
  }
}
