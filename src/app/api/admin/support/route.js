import { requireAdmin } from '@/lib/admin-auth';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const admin = requireAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const tickets = await prisma.supportTicket.findMany({
      include: { replies: { orderBy: { createdAt: 'asc' } } },
      orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
    });
    return NextResponse.json(tickets);
  } catch (e) { return NextResponse.json([]); }
}

export async function POST(request) {
  const admin = requireAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { action, ticketId, status, assignedTo } = body;

    if (action === 'update-status' && ticketId) {
      await prisma.supportTicket.update({
        where: { id: parseInt(ticketId) },
        data: { status, assignedTo, ...(status === 'resolved' ? { resolvedAt: new Date() } : {}), updatedAt: new Date() },
      });

      await prisma.ticketReply.create({
        data: {
          ticketId: parseInt(ticketId),
          message: `Status changed to ${status}${assignedTo ? `, assigned to ${assignedTo}` : ''}`,
          senderType: 'admin',
          senderName: admin.name || 'Admin',
        },
      });

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (e) { return NextResponse.json({ error: 'Failed' }, { status: 500 }); }
}
