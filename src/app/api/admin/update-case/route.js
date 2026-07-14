import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';

function generatePin() { return String(Math.floor(1000 + Math.random() * 9000)); }

const PIN_REQUIRED_STATUSES = ['animal_picked', 'at_vet', 'delivered'];

export async function POST(request) {
  try {
    const auth = requireAdmin(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { id, incidentCode } = body;

    let incident;
    if (id) {
      incident = await prisma.incident.findUnique({ where: { id: parseInt(id, 10) } });
    } else if (incidentCode) {
      incident = await prisma.incident.findFirst({ where: { incidentCode } });
    }
    if (!incident) return NextResponse.json({ error: 'Case not found' }, { status: 404 });

    const updateData = { updatedAt: new Date() };
    const fields = ['status', 'workflowStatus', 'notes', 'description', 'animalType', 'injuryType',
      'estimatedCost', 'finalCost', 'commissionPct', 'paymentMethod', 'paymentStatus',
      'handoverPin', 'dogTagId', 'resolutionType', 'releaseAddress', 'treatmentReport',
      'pickupLat', 'pickupLng', 'dropLat', 'dropLng', 'dropAddress'];

    fields.forEach(f => {
      if (body[f] !== undefined && body[f] !== '') updateData[f] = body[f];
    });

    if (body.ngoId !== undefined) updateData.ngoId = body.ngoId ? parseInt(body.ngoId) : null;
    if (body.doctorId !== undefined) updateData.doctorId = body.doctorId ? parseInt(body.doctorId) : null;
    if (body.repId !== undefined) updateData.repId = body.repId ? parseInt(body.repId) : null;
    if (body.latitude !== undefined) updateData.latitude = body.latitude || null;
    if (body.longitude !== undefined) updateData.longitude = body.longitude || null;
    if (body.releaseLat !== undefined) updateData.releaseLat = body.releaseLat || null;
    if (body.releaseLng !== undefined) updateData.releaseLng = body.releaseLng || null;

    const targetStatus = body.workflowStatus || body.status;
    let generatedPin = null;
    if (targetStatus && PIN_REQUIRED_STATUSES.includes(targetStatus)) {
      generatedPin = generatePin();
      updateData.handoverPin = generatedPin;
    }

    const [updatedIncident] = await prisma.$transaction([
      prisma.incident.update({ where: { id: incident.id }, data: updateData }),
      prisma.caseTimeline.create({
        data: {
          incidentCode: incident.incidentCode,
          status: targetStatus || 'updated',
          actorType: 'admin',
          actorId: auth.sub,
          note: body.notes || `Case updated by ${auth.email}`,
        },
      }),
    ]);

    if (incident.incidentCode) {
      await prisma.case.updateMany({
        where: { incidentCode: incident.incidentCode },
        data: {
          status: body.status || undefined,
          workflowStatus: body.workflowStatus || undefined,
          ngoId: body.ngoId !== undefined ? (body.ngoId ? parseInt(body.ngoId) : undefined) : undefined,
          doctorId: body.doctorId !== undefined ? (body.doctorId ? parseInt(body.doctorId) : undefined) : undefined,
          repId: body.repId !== undefined ? (body.repId ? parseInt(body.repId) : undefined) : undefined,
        },
      });
    }

    const res = { success: true, incident: updatedIncident };
    if (generatedPin) res.handoverPin = generatedPin;
    return NextResponse.json(res);
  } catch (e) {
    console.error('[api/admin/update-case]', e);
    return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 500 });
  }
}
