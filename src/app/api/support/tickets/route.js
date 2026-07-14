import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

function generateTicketCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'PB-TKT-';
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get('uid');
    const email = searchParams.get('email');

    let where = {};
    if (uid) where.creatorUid = uid;
    if (email) where.creatorEmail = email;

    const tickets = await prisma.supportTicket.findMany({
      where,
      include: { replies: { orderBy: { createdAt: 'asc' } } },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json(tickets);
  } catch (e) {
    return NextResponse.json([]);
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { subject, description, category, priority, creatorUid, creatorEmail, creatorName, createdBy } = body;

    if (!subject || !description) {
      return NextResponse.json({ error: 'Subject and description required' }, { status: 400 });
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        ticketCode: generateTicketCode(),
        subject,
        description,
        category: category || 'general',
        priority: priority || 'medium',
        status: 'open',
        createdBy: createdBy || 'customer',
        creatorUid: creatorUid || '',
        creatorEmail: creatorEmail || '',
        creatorName: creatorName || '',
      },
    });

    return NextResponse.json({ ok: true, ticket });
  } catch (e) {
    console.error('[api/support/tickets]', e);
    return NextResponse.json({ error: 'Failed to create ticket' }, { status: 500 });
  }
}
