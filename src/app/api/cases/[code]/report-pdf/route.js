import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request, { params }) {
  try {
    const { code } = await params;

    const incident = await prisma.incident.findUnique({
      where: { incidentCode: code },
      include: { timeline: true, photos: true, expenses: true }
    });

    if (!incident) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    const user = incident.userId ? await prisma.user.findUnique({ where: { id: incident.userId } }) : null;
    const ngo = incident.ngoId ? await prisma.ngO.findUnique({ where: { id: incident.ngoId } }) : null;
    const doctor = incident.doctorId ? await prisma.doctor.findUnique({ where: { id: incident.doctorId } }) : null;
    const rep = incident.repId ? await prisma.representative.findUnique({ where: { id: incident.repId } }) : null;

    return NextResponse.json({
      incident,
      timeline: incident.timeline,
      expenses: incident.expenses,
      photos: incident.photos,
      treatment: incident.treatmentReport,
      userName: user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : null,
      ngoName: ngo?.name,
      doctorName: doctor?.name,
      doctorLicense: doctor?.licenseNumber,
      hospitalName: doctor?.hospitalName,
      riderName: rep?.name,
    });
  } catch (error) {
    console.error('Report PDF error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
