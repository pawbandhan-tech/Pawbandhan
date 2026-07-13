import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

async function getCommissionPct() {
  const config = await prisma.commissionConfig.findFirst({
    where: { active: true },
    orderBy: { createdAt: 'desc' },
  });
  return config ? Number(config.percentage) : 15;
}

export async function GET(request, { params }) {
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

    const expenses = await prisma.caseExpense.findMany({
      where: { incidentCode: code },
    });

    const commissionPct = incident.commissionPct ? Number(incident.commissionPct) : await getCommissionPct();
    const subtotal = expenses.reduce((sum, e) => sum + (e.amount ? Number(e.amount) : 0), 0);
    const commission = Math.round(subtotal * commissionPct / 100 * 100) / 100;
    const grandTotal = subtotal + commission;

    const existingPayments = await prisma.casePayment.findMany({
      where: { incidentCode: code },
      orderBy: { createdAt: 'desc' },
    });

    const totalPaid = existingPayments
      .filter(p => p.paymentStatus === 'completed')
      .reduce((sum, p) => sum + (p.totalAmount ? Number(p.totalAmount) : 0), 0);

    const donationCount = existingPayments
      .filter(p => p.paymentMethod === 'community' && p.paymentStatus === 'completed')
      .length;

    return NextResponse.json({
      paymentStatus: incident.paymentStatus || 'pending',
      paymentMethod: incident.paymentMethod || null,
      totals: {
        subtotal,
        commissionPct,
        commission,
        grandTotal,
      },
      totalPaid,
      remainingAmount: Math.max(0, grandTotal - totalPaid),
      donationCount,
      payments: existingPayments,
    });
  } catch (error) {
    console.error('Get case payment error:', error);
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
    const { paymentMethod, customerUid, amount } = body;

    if (!paymentMethod || !['direct', 'community'].includes(paymentMethod)) {
      return NextResponse.json({ error: 'Payment method must be "direct" or "community"' }, { status: 400 });
    }

    const expenses = await prisma.caseExpense.findMany({
      where: { incidentCode: code },
    });

    const commissionPct = incident.commissionPct ? Number(incident.commissionPct) : await getCommissionPct();
    const subtotal = expenses.reduce((sum, e) => sum + (e.amount ? Number(e.amount) : 0), 0);
    const commission = Math.round(subtotal * commissionPct / 100 * 100) / 100;
    const grandTotal = subtotal + commission;

    if (paymentMethod === 'direct') {
      const paymentAmount = amount ? parseFloat(amount) : grandTotal;

      const payment = await prisma.casePayment.create({
        data: {
          incidentCode: code,
          customerUid: customerUid || incident.userId?.toString() || null,
          totalAmount: paymentAmount,
          commissionAmt: commission,
          netAmount: paymentAmount - commission,
          paymentMethod: 'direct',
          paymentStatus: 'completed',
          paidAt: new Date(),
        },
      });

      await prisma.incident.update({
        where: { id: incident.id },
        data: {
          paymentMethod: 'direct',
          paymentStatus: 'paid',
          finalCost: grandTotal,
        },
      });

      return NextResponse.json({
        success: true,
        payment,
        totals: {
          subtotal,
          commissionPct,
          commission,
          grandTotal,
          paid: paymentAmount,
          remaining: 0,
        },
      });
    }

    // Community payment
    const existingPayments = await prisma.casePayment.findMany({
      where: { incidentCode: code, paymentStatus: 'completed' },
    });

    const totalPaid = existingPayments.reduce((sum, p) => sum + (p.totalAmount ? Number(p.totalAmount) : 0), 0);
    const remaining = Math.max(0, grandTotal - totalPaid);

    const donationAmount = amount ? parseFloat(amount) : remaining;

    const payment = await prisma.casePayment.create({
      data: {
        incidentCode: code,
        customerUid: customerUid || null,
        totalAmount: donationAmount,
        commissionAmt: 0,
        netAmount: donationAmount,
        paymentMethod: 'community',
        paymentStatus: 'completed',
        paidAt: new Date(),
      },
    });

    const newTotalPaid = totalPaid + donationAmount;
    const newRemaining = Math.max(0, grandTotal - newTotalPaid);
    const donationCount = existingPayments.filter(p => p.paymentMethod === 'community').length + 1;

    if (newRemaining <= 0) {
      await prisma.incident.update({
        where: { id: incident.id },
        data: {
          paymentMethod: 'community',
          paymentStatus: 'paid',
          finalCost: grandTotal,
        },
      });
    } else {
      await prisma.incident.update({
        where: { id: incident.id },
        data: {
          paymentMethod: 'community',
          paymentStatus: 'partial',
          finalCost: grandTotal,
        },
      });
    }

    return NextResponse.json({
      success: true,
      payment,
      totals: {
        subtotal,
        commissionPct,
        commission,
        grandTotal,
        totalPaid: newTotalPaid,
        remaining: newRemaining,
        donationCount,
        goalReached: newRemaining <= 0,
      },
    });
  } catch (error) {
    console.error('Process case payment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
