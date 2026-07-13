import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getWorkflowStage } from '@/lib/case-workflow';

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
    const { pin, action } = body;

    if (!pin || !action) {
      return NextResponse.json({ error: 'pin and action are required' }, { status: 400 });
    }

    if (!['pickup', 'dropoff', 'handover'].includes(action)) {
      return NextResponse.json({ error: 'action must be pickup, dropoff, or handover' }, { status: 400 });
    }

    if (!incident.handoverPin) {
      return NextResponse.json({ error: 'No PIN set for this case. Please generate one first.' }, { status: 400 });
    }

    if (String(pin) !== String(incident.handoverPin)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid PIN',
        message: 'The entered PIN does not match. Please try again.',
      }, { status: 400 });
    }

    // Determine target workflow status based on action
    const statusMap = {
      pickup: 'animal_picked',
      dropoff: 'delivered',
      handover: 'at_vet',
    };

    const targetStatus = statusMap[action];
    const stage = getWorkflowStage(targetStatus);

    // Update incident
    await prisma.incident.update({
      where: { id: incident.id },
      data: {
        workflowStatus: targetStatus,
        handoverPin: null, // Invalidate PIN after use
      },
    });

    // Update case record
    await prisma.case.updateMany({
      where: { incidentCode: code },
      data: { workflowStatus: targetStatus },
    });

    // Create timeline entry
    await prisma.caseTimeline.create({
      data: {
        incidentCode: code,
        status: targetStatus,
        actorType: action === 'pickup' ? 'rider' : action === 'handover' ? 'doctor' : 'rider',
        note: `PIN verified — ${stage?.label || targetStatus}`,
        meta: { action, verifiedAt: new Date().toISOString() },
      },
    });

    return NextResponse.json({
      success: true,
      message: `PIN verified. Status updated to "${stage?.label || targetStatus}".`,
      newStatus: targetStatus,
      stage: stage || null,
    });
  } catch (error) {
    console.error('Verify PIN error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
