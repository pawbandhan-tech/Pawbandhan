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
      orderBy: { createdAt: 'asc' },
    });

    const commissionPct = incident.commissionPct ? Number(incident.commissionPct) : await getCommissionPct();
    const subtotal = expenses.reduce((sum, e) => sum + (e.amount ? Number(e.amount) : 0), 0);
    const commission = Math.round(subtotal * commissionPct / 100 * 100) / 100;
    const grandTotal = subtotal + commission;

    return NextResponse.json({
      expenses,
      totals: {
        subtotal,
        commissionPct,
        commission,
        grandTotal,
      },
    });
  } catch (error) {
    console.error('Get case expenses error:', error);
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
    const { description, amount, category, addedBy } = body;

    if (!description || amount === undefined) {
      return NextResponse.json({ error: 'Description and amount are required' }, { status: 400 });
    }

    const expense = await prisma.caseExpense.create({
      data: {
        incidentCode: code,
        description,
        amount: parseFloat(amount),
        category: category || 'general',
        addedBy: addedBy || 'admin',
      },
    });

    // Recalculate totals
    const allExpenses = await prisma.caseExpense.findMany({
      where: { incidentCode: code },
    });

    const commissionPct = incident.commissionPct ? Number(incident.commissionPct) : await getCommissionPct();
    const subtotal = allExpenses.reduce((sum, e) => sum + (e.amount ? Number(e.amount) : 0), 0);
    const commission = Math.round(subtotal * commissionPct / 100 * 100) / 100;
    const grandTotal = subtotal + commission;

    // Update incident final cost
    await prisma.incident.update({
      where: { id: incident.id },
      data: { finalCost: grandTotal },
    });

    return NextResponse.json({
      success: true,
      expense,
      totals: {
        subtotal,
        commissionPct,
        commission,
        grandTotal,
      },
    });
  } catch (error) {
    console.error('Add case expense error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
