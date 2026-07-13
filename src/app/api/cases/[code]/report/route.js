import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request, { params }) {
  try {
    const { code } = await params;
    if (!code) {
      return NextResponse.json({ error: 'Case code required' }, { status: 400 });
    }

    const incident = await prisma.incident.findFirst({
      where: { incidentCode: code },
      select: {
        id: true,
        incidentCode: true,
        treatmentReport: true,
        estimatedCost: true,
        finalCost: true,
        workflowStatus: true,
      },
    });

    if (!incident) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    let report = null;
    if (incident.treatmentReport) {
      try {
        report = typeof incident.treatmentReport === 'string'
          ? JSON.parse(incident.treatmentReport)
          : incident.treatmentReport;
      } catch {
        report = { notes: incident.treatmentReport };
      }
    }

    return NextResponse.json({
      report,
      estimatedCost: incident.estimatedCost ? Number(incident.estimatedCost) : null,
      finalCost: incident.finalCost ? Number(incident.finalCost) : null,
    });
  } catch (error) {
    console.error('Get treatment report error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const { code } = await params;
    if (!code) {
      return NextResponse.json({ error: 'Case code required' }, { status: 400 });
    }

    const incident = await prisma.incident.findFirst({
      where: { incidentCode: code },
    });

    if (!incident) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    const body = await request.json();
    const { diagnosis, treatment, medications, notes, followUpDate, estimatedCost } = body;

    const report = {
      diagnosis: diagnosis || '',
      treatment: treatment || '',
      medications: medications || '',
      notes: notes || '',
      followUpDate: followUpDate || null,
      savedAt: new Date().toISOString(),
    };

    const updateData = {
      treatmentReport: JSON.stringify(report),
    };

    if (estimatedCost !== undefined && estimatedCost !== null && estimatedCost !== '') {
      updateData.estimatedCost = parseFloat(estimatedCost);
    }

    await prisma.incident.update({
      where: { id: incident.id },
      data: updateData,
    });

    await prisma.caseTimeline.create({
      data: {
        incidentCode: code,
        status: incident.workflowStatus || 'in_treatment',
        actorType: 'doctor',
        actorId: incident.doctorId || null,
        note: diagnosis ? `Treatment report saved: ${diagnosis}` : 'Treatment report updated',
        meta: {
          diagnosis: diagnosis || null,
          estimatedCost: estimatedCost || null,
          followUpDate: followUpDate || null,
        },
      },
    });

    return NextResponse.json({ success: true, report, estimatedCost: updateData.estimatedCost || null });
  } catch (error) {
    console.error('Save treatment report error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
