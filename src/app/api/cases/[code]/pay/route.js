import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

async function getCommissionPct() {
  const config = await prisma.commissionConfig.findFirst({
    where: { active: true },
    orderBy: { createdAt: 'desc' },
  });
  return config ? Number(config.percentage) : 15;
}

export async function POST(request, { params }) {
  try {
    const { code } = await params;
    const body = await request.json();
    const { amount, paymentMethod, customerUid } = body;

    if (!paymentMethod || !['upi', 'card', 'netbanking', 'community', 'partial'].includes(paymentMethod)) {
      return NextResponse.json({ error: 'Invalid payment method' }, { status: 400 });
    }

    const incident = await prisma.incident.findFirst({
      where: { incidentCode: code },
    });

    if (!incident) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    const expenses = await prisma.caseExpense.findMany({ where: { incidentCode: code } });
    const commissionPct = incident.commissionPct ? Number(incident.commissionPct) : await getCommissionPct();
    const subtotal = expenses.reduce((sum, e) => sum + (e.amount ? Number(e.amount) : 0), 0);
    const commission = Math.round(subtotal * commissionPct / 100 * 100) / 100;
    const grandTotal = subtotal + commission;

    const existingPayments = await prisma.casePayment.findMany({
      where: { incidentCode: code, paymentStatus: 'completed' },
    });
    const totalPaid = existingPayments.reduce((sum, p) => sum + (p.totalAmount ? Number(p.totalAmount) : 0), 0);
    const remaining = Math.max(0, grandTotal - totalPaid);

    if (paymentMethod === 'community' || paymentMethod === 'partial') {
      const payAmount = amount ? parseFloat(amount) : 0;
      const communityRemaining = paymentMethod === 'partial'
        ? Math.max(0, remaining - payAmount)
        : remaining;

      if (payAmount > 0) {
        const pct = Math.min(100, (payAmount / grandTotal) * 100);
        const payCommission = Math.round(payAmount * commissionPct / 100 * 100) / 100;
        await prisma.casePayment.create({
          data: {
            incidentCode: code,
            customerUid: customerUid || incident.userId?.toString() || null,
            totalAmount: payAmount,
            commissionAmt: payCommission,
            netAmount: payAmount - payCommission,
            paymentMethod: 'direct',
            paymentStatus: 'completed',
            paidAt: new Date(),
          },
        });
      }

      const newPaymentStatus = communityRemaining <= 0 ? 'paid' : paymentMethod === 'partial' ? 'community_listed' : 'community_listed';

      await prisma.incident.update({
        where: { id: incident.id },
        data: {
          paymentMethod: 'community',
          paymentStatus: newPaymentStatus,
          finalCost: grandTotal,
        },
      });

      await prisma.caseTimeline.create({
        data: {
          incidentCode: code,
          status: incident.workflowStatus || 'payment_pending',
          actorType: 'customer',
          note: paymentMethod === 'partial'
            ? `Customer paid ₹${payAmount}. Remaining ₹${communityRemaining} listed for community donations.`
            : `Case listed for community donations. Total needed: ₹${grandTotal}.`,
          meta: { paymentMethod, payAmount, communityRemaining, grandTotal },
        },
      });

      const allPayments = await prisma.casePayment.findMany({
        where: { incidentCode: code, paymentStatus: 'completed' },
      });
      const totalPaidNow = allPayments.reduce((sum, p) => sum + (p.totalAmount ? Number(p.totalAmount) : 0), 0);

      return NextResponse.json({
        success: true,
        totals: { subtotal, commissionPct, commission, grandTotal, totalPaid: totalPaidNow, remaining: Math.max(0, grandTotal - totalPaidNow) },
      });
    }

    const directPayAmount = amount ? parseFloat(amount) : remaining;
    const directCommission = Math.round(directPayAmount * commissionPct / 100 * 100) / 100;

    await prisma.casePayment.create({
      data: {
        incidentCode: code,
        customerUid: customerUid || incident.userId?.toString() || null,
        totalAmount: directPayAmount,
        commissionAmt: directCommission,
        netAmount: directPayAmount - directCommission,
        paymentMethod: paymentMethod,
        paymentStatus: 'completed',
        paidAt: new Date(),
      },
    });

    const newTotalPaid = totalPaid + directPayAmount;
    const fullyPaid = newTotalPaid >= grandTotal;

    await prisma.incident.update({
      where: { id: incident.id },
      data: {
        paymentMethod: paymentMethod,
        paymentStatus: fullyPaid ? 'paid' : 'partial',
        finalCost: grandTotal,
      },
    });

    const nextWorkflow = fullyPaid ? 'ready_for_drop' : incident.workflowStatus;

    if (fullyPaid) {
      await prisma.incident.update({
        where: { id: incident.id },
        data: { workflowStatus: 'ready_for_drop' },
      });
    }

    await prisma.caseTimeline.create({
      data: {
        incidentCode: code,
        status: incident.workflowStatus || 'payment_pending',
        actorType: 'customer',
        note: `Payment of ₹${directPayAmount} via ${paymentMethod}. ${fullyPaid ? 'Case fully paid.' : `Remaining: ₹${Math.max(0, grandTotal - newTotalPaid)}.`}`,
        meta: { paymentMethod, directPayAmount, totalPaid: newTotalPaid, grandTotal, fullyPaid },
      },
    });

    return NextResponse.json({
      success: true,
      totals: {
        subtotal, commissionPct, commission, grandTotal,
        totalPaid: newTotalPaid,
        remaining: Math.max(0, grandTotal - newTotalPaid),
      },
    });
  } catch (error) {
    console.error('Process pay error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
