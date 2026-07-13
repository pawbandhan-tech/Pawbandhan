import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';

export async function POST(request) {
  try {
    const auth = requireAdmin(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { caseId, incidentCode, status, workflowStatus, notes, ngoId, repId, doctorId } = body;

    let incident;
    if (incidentCode) {
      incident = await prisma.incident.findFirst({ where: { incidentCode } });
    } else if (caseId) {
      incident = await prisma.incident.findUnique({ where: { id: parseInt(caseId, 10) } });
    }

    if (!incident) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    const updateData = {};
    if (status !== undefined) updateData.status = status;
    if (workflowStatus !== undefined) updateData.workflowStatus = workflowStatus;
    if (notes !== undefined) updateData.notes = notes;
    if (ngoId !== undefined) updateData.ngoId = ngoId ? parseInt(ngoId, 10) : null;
    if (repId !== undefined) updateData.repId = repId ? parseInt(repId, 10) : null;
    if (doctorId !== undefined) updateData.doctorId = doctorId ? parseInt(doctorId, 10) : null;

    const [updatedIncident, timelineEntry] = await prisma.$transaction([
      prisma.incident.update({
        where: { id: incident.id },
        data: updateData,
      }),
      prisma.caseTimeline.create({
        data: {
          incidentCode: incident.incidentCode,
          status: workflowStatus || status || 'updated',
          actorType: 'admin',
          actorId: auth.sub,
          note: notes || `Case updated by admin`,
        },
      }),
    ]);

    if (workflowStatus) {
      await prisma.case.updateMany({
        where: { incidentCode: incident.incidentCode },
        data: { workflowStatus, status: status || undefined },
      });
    }

    return NextResponse.json({
      success: true,
      incident: updatedIncident,
      timelineEntry,
    });
  } catch (error) {
    console.error('Update case error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
