import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const cases = await prisma.incident.findMany({
      where: {
        OR: [
          { paymentMethod: 'community' },
          { paymentStatus: 'community_listed' },
          { paymentStatus: 'partial' },
          { workflowStatus: 'payment_pending' },
        ],
      },
      include: {
        photos: { orderBy: { createdAt: 'asc' } },
        timeline: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
      orderBy: { createdAt: 'desc' },
    });

    const results = await Promise.all(cases.map(async (c) => {
      const payments = await prisma.casePayment.findMany({
        where: { incidentCode: c.incidentCode, paymentStatus: 'completed' },
      });

      const expenses = await prisma.caseExpense.findMany({
        where: { incidentCode: c.incidentCode },
      });

      const subtotal = expenses.reduce((sum, e) => sum + (e.amount ? Number(e.amount) : 0), 0);
      const commissionPct = c.commissionPct ? Number(c.commissionPct) : 15;
      const commission = Math.round(subtotal * commissionPct / 100 * 100) / 100;
      const totalNeeded = subtotal + commission;

      const totalRaised = payments.reduce((sum, p) => sum + (p.totalAmount ? Number(p.totalAmount) : 0), 0);
      const donorCount = payments.filter(p => p.paymentMethod === 'community_donation' || p.paymentMethod === 'community').length;

      const photo = c.photos.find(p => p.photoType === 'during') || c.photos.find(p => p.photoType === 'pre') || c.photos[0];

      return {
        id: c.id,
        incidentCode: c.incidentCode,
        animalType: c.animalType,
        treatmentReport: c.treatmentReport,
        finalCost: totalNeeded,
        totalRaised,
        remaining: Math.max(0, totalNeeded - totalRaised),
        donorCount,
        photoUrl: photo?.fileUrl || null,
        workflowStatus: c.workflowStatus,
        paymentStatus: c.paymentStatus,
        createdAt: c.createdAt,
      };
    }));

    const filtered = results.filter(c => c.remaining > 0 && c.workflowStatus === 'payment_pending');

    const totalRaisedAll = filtered.reduce((sum, c) => sum + c.totalRaised, 0);
    const totalDonors = filtered.reduce((sum, c) => sum + c.donorCount, 0);

    return NextResponse.json({
      cases: filtered,
      stats: { totalRaised: totalRaisedAll, totalCases: filtered.length, totalDonors },
    });
  } catch (error) {
    console.error('Get donate cases error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
