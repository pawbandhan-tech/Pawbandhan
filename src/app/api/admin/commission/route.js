import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';

export async function GET(request) {
  try {
    const auth = requireAdmin(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const config = await prisma.commissionConfig.findFirst({
      where: { active: true },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      percentage: config ? Number(config.percentage) : 15,
      minAmount: config ? Number(config.minAmount) : 0,
      maxAmount: config ? Number(config.maxAmount) : 999999,
      description: config?.description || 'Default platform commission',
      id: config?.id || null,
    });
  } catch (error) {
    console.error('Get commission config error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const auth = requireAdmin(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { percentage, minAmount, maxAmount, description } = body;

    if (percentage === undefined || percentage === null) {
      return NextResponse.json({ error: 'Percentage is required' }, { status: 400 });
    }

    const pct = parseFloat(percentage);
    if (isNaN(pct) || pct < 0 || pct > 100) {
      return NextResponse.json({ error: 'Percentage must be between 0 and 100' }, { status: 400 });
    }

    // Deactivate old configs
    await prisma.commissionConfig.updateMany({
      where: { active: true },
      data: { active: false },
    });

    const config = await prisma.commissionConfig.create({
      data: {
        percentage: pct,
        minAmount: minAmount ? parseFloat(minAmount) : 0,
        maxAmount: maxAmount ? parseFloat(maxAmount) : 999999,
        description: description || `Platform commission set to ${pct}%`,
        active: true,
      },
    });

    return NextResponse.json({
      success: true,
      config: {
        id: config.id,
        percentage: Number(config.percentage),
        minAmount: Number(config.minAmount),
        maxAmount: Number(config.maxAmount),
        description: config.description,
      },
    });
  } catch (error) {
    console.error('Save commission config error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
