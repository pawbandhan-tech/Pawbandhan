import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { ticketId, message, senderType, senderUid, senderName } = body;

    if (!ticketId || !message) {
      return NextResponse.json({ error: 'Ticket ID and message required' }, { status: 400 });
    }

    const [reply] = await prisma.$transaction([
      prisma.ticketReply.create({
        data: {
          ticketId: parseInt(ticketId),
          message,
          senderType: senderType || 'user',
          senderUid: senderUid || '',
          senderName: senderName || 'User',
        },
      }),
      prisma.supportTicket.update({
        where: { id: parseInt(ticketId) },
        data: { updatedAt: new Date(), status: senderType === 'admin' ? 'in_progress' : undefined },
      }),
    ]);

    return NextResponse.json({ ok: true, reply });
  } catch (e) {
    console.error('[api/support/reply]', e);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
