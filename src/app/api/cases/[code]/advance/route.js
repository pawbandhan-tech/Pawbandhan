import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getWorkflowStage, getNextStage, getProgressPercent, generatePin } from '@/lib/case-workflow';

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
    const { action, pin, notes } = body;

    if (!action || !['advance', 'set-status'].includes(action)) {
      return NextResponse.json({ error: 'action must be "advance" or "set-status"' }, { status: 400 });
    }

    const currentStatus = incident.workflowStatus || 'reported';
    const currentStage = getWorkflowStage(currentStatus);

    // If current stage requires PIN, verify it
    if (currentStage?.requiresPin && pin) {
      if (!incident.handoverPin || String(pin) !== String(incident.handoverPin)) {
        return NextResponse.json({
          success: false,
          error: 'Invalid or missing PIN for this stage',
          requiresPin: true,
        }, { status: 400 });
      }
    } else if (currentStage?.requiresPin && !pin) {
      return NextResponse.json({
        success: false,
        error: 'This stage requires a PIN for verification',
        requiresPin: true,
        currentStage,
      }, { status: 400 });
    }

    // If current stage requires payment, check payment status
    if (currentStage?.requiresPayment) {
      if (incident.paymentStatus !== 'paid') {
        return NextResponse.json({
          success: false,
          error: 'Payment is required before advancing from this stage',
          requiresPayment: true,
          paymentStatus: incident.paymentStatus || 'pending',
        }, { status: 400 });
      }
    }

    // Get next stage
    const nextStage = getNextStage(currentStatus);
    if (!nextStage) {
      return NextResponse.json({
        success: false,
        error: 'Case is already at the final stage',
        currentStage,
      }, { status: 400 });
    }

    // Generate PIN if next stage requires it
    let newPin = null;
    const updateData = {
      workflowStatus: nextStage.key,
    };

    if (nextStage.requiresPin) {
      newPin = generatePin();
      updateData.handoverPin = newPin;
    }

    // Update incident
    await prisma.incident.update({
      where: { id: incident.id },
      data: updateData,
    });

    // Update case record
    await prisma.case.updateMany({
      where: { incidentCode: code },
      data: { workflowStatus: nextStage.key },
    });

    // Create timeline entry
    await prisma.caseTimeline.create({
      data: {
        incidentCode: code,
        status: nextStage.key,
        actorType: 'admin',
        note: notes || `Workflow advanced: ${currentStage?.label || currentStatus} → ${nextStage.label}`,
        meta: {
          from: currentStatus,
          to: nextStage.key,
          pinGenerated: !!newPin,
        },
      },
    });

    return NextResponse.json({
      success: true,
      previousStage: currentStage,
      currentStage: nextStage,
      progress: getProgressPercent(nextStage.key),
      handoverPin: newPin,
      message: `Case advanced to "${nextStage.label}"`,
    });
  } catch (error) {
    console.error('Advance case workflow error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
