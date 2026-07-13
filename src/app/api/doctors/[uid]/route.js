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
    if (body.status !== undefined) updateData.status = body.status;

    if (body.kycData !== undefined) {
      const existing = (doctor.kycData && typeof doctor.kycData === 'object') ? doctor.kycData : {};
      const incoming = (body.kycData && typeof body.kycData === 'object') ? body.kycData : {};

      const documents = { ...(existing.documents || {}), ...(incoming.documents || {}) };

      updateData.kycData = {
        ...existing,
        ...incoming,
        documents,
        submittedAt: incoming.submittedAt || existing.submittedAt || new Date().toISOString(),
      };

      const hasDocs = Object.keys(documents).length > 0;
      if (hasDocsWithValues(documents)) {
        updateData.status = 'kyc_submitted';
      }
    }

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

function hasDocsWithValues(documents) {
  if (!documents || typeof documents !== 'object') return false;
  return Object.values(documents).some(v => {
    if (typeof v === 'string') return v.length > 0;
    return !!v;
  });
}
