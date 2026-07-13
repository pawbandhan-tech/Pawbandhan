import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request, { params }) {
  try {
    const { code } = await params;
    const body = await request.json();
    const { amount, donorName, donorEmail, message } = body;

    if (!amount || parseFloat(amount) <= 0) {
      return NextResponse.json({ error: 'Valid donation amount is required' }, { status: 400 });
    }

    const incident = await prisma.incident.findFirst({
      where: { incidentCode: code },
    });

    if (!incident) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    const donationAmount = parseFloat(amount);

    const existingPayments = await prisma.casePayment.findMany({
      where: { incidentCode: code, paymentStatus: 'completed' },
    });

    const expenses = await prisma.caseExpense.findMany({
      where: { incidentCode: code },
    });

    const subtotal = expenses.reduce((sum, e) => sum + (e.amount ? Number(e.amount) : 0), 0);
    const commissionPct = incident.commissionPct ? Number(incident.commissionPct) : 15;
    const commission = Math.round(subtotal * commissionPct / 100 * 100) / 100;
    const totalNeeded = subtotal + commission;

    const totalRaisedBefore = existingPayments.reduce((sum, p) => sum + (p.totalAmount ? Number(p.totalAmount) : 0), 0);

    const payment = await prisma.casePayment.create({
      data: {
        incidentCode: code,
        customerUid: null,
        totalAmount: donationAmount,
        commissionAmt: 0,
        netAmount: donationAmount,
        paymentMethod: 'community_donation',
        paymentStatus: 'completed',
        donorName: donorName || null,
        donorEmail: donorEmail || null,
        donorMessage: message || null,
        paidAt: new Date(),
      },
    });

    const totalRaisedAfter = totalRaisedBefore + donationAmount;
    const newRemaining = Math.max(0, totalNeeded - totalRaisedAfter);

    if (newRemaining <= 0) {
      await prisma.incident.update({
        where: { id: incident.id },
        data: { paymentMethod: 'community', paymentStatus: 'paid', finalCost: totalNeeded },
      });
    } else {
      await prisma.incident.update({
        where: { id: incident.id },
        data: { paymentStatus: 'partial', finalCost: totalNeeded },
      });
    }

    const allPayments = await prisma.casePayment.findMany({
      where: { incidentCode: code, paymentStatus: 'completed' },
    });
    const donationCount = allPayments.filter(p => p.paymentMethod === 'community_donation' || p.paymentMethod === 'community').length;

    await prisma.caseTimeline.create({
      data: {
        incidentCode: code,
        status: incident.workflowStatus || 'payment_pending',
        actorType: 'donor',
        note: `₹${donationAmount} donated${donorName ? ` by ${donorName}` : ''}. Total raised: ₹${totalRaisedAfter.toLocaleString()}.`,
        meta: { amount: donationAmount, donorName, donorEmail, totalRaised: totalRaisedAfter, remaining: newRemaining },
      },
    });

    return NextResponse.json({
      success: true,
      payment,
      totals: {
        totalNeeded,
        totalRaised: totalRaisedAfter,
        remaining: newRemaining,
        donationCount,
        goalReached: newRemaining <= 0,
      },
    });
  } catch (error) {
    console.error('Process donation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
