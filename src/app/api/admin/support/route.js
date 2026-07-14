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
    const agents = await prisma.supportAgent.findMany({ orderBy: { name: 'asc' } });
    return NextResponse.json({ tickets, agents });
  } catch (e) { return NextResponse.json({ tickets: [], agents: [] }); }
}

export async function POST(request) {
  const admin = requireAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { action, ticketId, status, assignedTo, assignedToUid, agentId } = body;

    if (action === 'update-status' && ticketId) {
      const ticketIdNum = parseInt(ticketId);
      const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketIdNum } });
      
      await prisma.supportTicket.update({
        where: { id: ticketIdNum },
        data: { status, assignedTo, assignedToUid,
          ...(status === 'resolved' ? { resolvedAt: new Date() } : {}),
          updatedAt: new Date(),
        },
      });

      // Release agent load if resolved/closed
      if ((status === 'resolved' || status === 'closed') && ticket?.assignedToUid) {
        const agent = await prisma.supportAgent.findUnique({ where: { uid: ticket.assignedToUid } });
        if (agent) {
          await prisma.supportAgent.update({
            where: { id: agent.id },
            data: { currentLoad: Math.max(0, (agent.currentLoad || 1) - 1) },
          });
        }
      }

      await prisma.ticketReply.create({
        data: {
          ticketId: ticketIdNum,
          message: `Status changed to ${status}${assignedTo ? `, assigned to ${assignedTo}` : ''}`,
          senderType: 'admin', senderName: admin.name || 'Admin',
        },
      });
      return NextResponse.json({ ok: true });
    }

    if (action === 'transfer' && ticketId) {
      const ticketIdNum = parseInt(ticketId);
      const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketIdNum } });
      const oldAgentUid = ticket?.assignedToUid;

      // Release old agent
      if (oldAgentUid) {
        const oldAgent = await prisma.supportAgent.findUnique({ where: { uid: oldAgentUid } });
        if (oldAgent) {
          await prisma.supportAgent.update({
            where: { id: oldAgent.id },
            data: { currentLoad: Math.max(0, (oldAgent.currentLoad || 1) - 1) },
          });
        }
      }

      // Assign new agent
      if (assignedToUid) {
        const newAgent = await prisma.supportAgent.findUnique({ where: { uid: assignedToUid } });
        if (newAgent) {
          await prisma.supportAgent.update({
            where: { id: newAgent.id },
            data: { currentLoad: (newAgent.currentLoad || 0) + 1 },
          });
        }
      }

      await prisma.supportTicket.update({
        where: { id: ticketIdNum },
        data: { assignedTo, assignedToUid, transferredFrom: ticket?.assignedTo, updatedAt: new Date() },
      });

      await prisma.ticketReply.create({
        data: {
          ticketId: ticketIdNum,
          message: `Ticket transferred${assignedTo ? ` to ${assignedTo}` : ''}`,
          senderType: 'admin', senderName: admin.name || 'Admin',
        },
      });
      return NextResponse.json({ ok: true });
    }

    if (action === 'agent-create' || action === 'agent-update' || action === 'agent-delete') {
      if (action === 'agent-delete' && body.id) {
        await prisma.supportAgent.delete({ where: { id: body.id } });
        return NextResponse.json({ ok: true });
      }
      if (body.id) {
        const { id, action: _, ...data } = body;
        await prisma.supportAgent.update({ where: { id }, data });
        return NextResponse.json({ ok: true });
      }
      const { action: _, id: _id, ...data } = body;
      await prisma.supportAgent.create({ data: { ...data, uid: `AGT-${Date.now()}` } });
      return NextResponse.json({ ok: true });
    }

    // Get creator account details
    if (action === 'creator-details' && ticketId) {
      const ticket = await prisma.supportTicket.findUnique({ where: { id: parseInt(ticketId) } });
      if (!ticket || !ticket.creatorUid) return NextResponse.json({ error: 'No creator info' }, { status: 404 });

      const user = await prisma.user.findUnique({ where: { uid: ticket.creatorUid } });
      const customer = await prisma.customer.findUnique({ where: { uid: ticket.creatorUid } });
      const cases = await prisma.incident.findMany({ where: { userId: user?.id }, orderBy: { createdAt: 'desc' }, take: 10 });
      const doctor = await prisma.doctor.findFirst({ where: { uid: ticket.creatorUid } });
      const ngo = await prisma.nGO.findFirst({ where: { uid: ticket.creatorUid } });
      const rep = await prisma.representative.findFirst({ where: { uid: ticket.creatorUid } });

      return NextResponse.json({
        user: user ? { name: user.firstName, email: user.email, phone: user.phoneNo, role: user.role, status: user.status, createdAt: user.createdAt } : null,
        customer: customer ? { name: customer.name, email: customer.email, phone: customer.phone } : null,
        doctor: doctor ? { name: doctor.name, specialization: doctor.specialization, hospital: doctor.hospitalName, status: doctor.status } : null,
        ngo: ngo ? { name: ngo.name, regNumber: ngo.regNumber, city: ngo.city, status: ngo.status } : null,
        rep: rep ? { name: rep.name, vehicleType: rep.vehicleType, status: rep.status } : null,
        cases: cases.map(c => ({
          incidentCode: c.incidentCode,
          animalType: c.animalType,
          status: c.status,
          workflowStatus: c.workflowStatus,
          paymentStatus: c.paymentStatus,
          createdAt: c.createdAt,
        })),
      });
    }

    if (action === 'agent-toggle' && agentId) {
      const agent = await prisma.supportAgent.findUnique({ where: { id: agentId } });
      if (agent) {
        await prisma.supportAgent.update({ where: { id: agentId }, data: { online: !agent.online, lastActiveAt: new Date() } });
        return NextResponse.json({ ok: true, online: !agent.online });
      }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (e) {
    console.error('[api/admin/support]', e);
    return NextResponse.json({ error: e.message || 'Failed' }, { status: 500 });
  }
}
