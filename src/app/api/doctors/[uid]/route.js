import prisma from '@/lib/prisma';

export async function GET(request, { params }) {
  try {
    const { uid } = await params;
    const doctor = await prisma.doctor.findFirst({ where: { uid } });
    if (!doctor) return Response.json({ error: 'Doctor not found' }, { status: 404 });
    return Response.json({
      id: doctor.id,
      uid: doctor.uid,
      name: doctor.name,
      email: doctor.email,
      phone: doctor.phone,
      specialization: doctor.specialization,
      licenseNumber: doctor.licenseNumber,
      hospitalName: doctor.hospitalName,
      status: doctor.status,
      prn: doctor.prn,
      tempId: doctor.tempId,
      ackNo: doctor.ackNo,
      kycData: doctor.kycData,
      createdAt: doctor.createdAt,
    });
  } catch (e) {
    console.error('[api/doctors GET]', e);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { uid } = await params;
    const body = await request.json();
    const doctor = await prisma.doctor.findFirst({ where: { uid } });
    if (!doctor) return Response.json({ error: 'Doctor not found' }, { status: 404 });

    const updateData = {};
    if (body.specialization !== undefined) updateData.specialization = body.specialization;
    if (body.licenseNumber !== undefined) updateData.licenseNumber = body.licenseNumber;
    if (body.hospitalName !== undefined) updateData.hospitalName = body.hospitalName;
    if (body.kycData !== undefined) updateData.kycData = body.kycData;
    if (body.status !== undefined) updateData.status = body.status;

    const updated = await prisma.doctor.update({
      where: { id: doctor.id },
      data: updateData,
    });

    return Response.json({ ok: true, doctor: updated });
  } catch (e) {
    console.error('[api/doctors PUT]', e);
    return Response.json({ error: 'Update failed' }, { status: 500 });
  }
}
