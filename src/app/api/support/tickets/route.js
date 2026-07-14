import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

function generateTicketCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let seg1 = '', seg2 = '';
  for (let i = 0; i < 4; i++) seg1 += chars[Math.floor(Math.random() * chars.length)];
  for (let i = 0; i < 4; i++) seg2 += chars[Math.floor(Math.random() * chars.length)];
  return `PB-TKT-${seg1}-${seg2}`;
}

async function autoAssign(priority) {
  const agents = await prisma.supportAgent.findMany({
    where: { active: true, online: true },
    orderBy: { currentLoad: 'asc' },
  });
  if (agents.length === 0) return null;

  // Find agent with lowest load that is under max
  for (const agent of agents) {
    if ((agent.currentLoad || 0) < (agent.maxLoad || 10)) {
      await prisma.supportAgent.update({
        where: { id: agent.id },
        data: { currentLoad: (agent.currentLoad || 0) + 1 },
      });
      return { name: agent.name, uid: agent.uid };
    }
  }
  return null;
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
  } catch (e) { return NextResponse.json([]); }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { subject, description, category, priority, creatorUid, creatorEmail, creatorName, createdBy, isLiveChat } = body;
    if (!subject || !description) {
      return NextResponse.json({ error: 'Subject and description required' }, { status: 400 });
    }

    // Auto-assign to least-loaded agent
    const assigned = await autoAssign(priority || 'medium');

    const ticket = await prisma.supportTicket.create({
      data: {
        ticketCode: generateTicketCode(),
        subject, description,
        category: category || 'general',
        priority: priority || 'medium',
        status: 'open',
        createdBy: createdBy || 'customer',
        creatorUid: creatorUid || '',
        creatorEmail: creatorEmail || '',
        creatorName: creatorName || '',
        isLiveChat: isLiveChat || false,
        assignedTo: assigned?.name || null,
        assignedToUid: assigned?.uid || null,
      },
    });

    return NextResponse.json({ ok: true, ticket });
  } catch (e) {
    console.error('[api/support/tickets]', e);
    return NextResponse.json({ error: 'Failed to create ticket' }, { status: 500 });
  }
}
