import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: parseInt(id) },
      include: { replies: { orderBy: { createdAt: 'asc' } } },
    });
    if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    return NextResponse.json(ticket);
  } catch (e) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
