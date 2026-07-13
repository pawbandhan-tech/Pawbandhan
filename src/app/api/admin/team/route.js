import { requireAdmin } from '@/lib/admin-auth';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const members = await prisma.teamMember.findMany({ orderBy: { sortOrder: 'asc' } });
    return NextResponse.json(members);
  } catch (e) { return NextResponse.json([]); }
}

export async function POST(request) {
  const admin = requireAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await request.json();
    if (body.action === 'delete' && body.id) {
      await prisma.teamMember.delete({ where: { id: body.id } });
      return NextResponse.json({ ok: true });
    }
    if (body.id) {
      const { id, action, ...data } = body;
      await prisma.teamMember.update({ where: { id }, data });
      return NextResponse.json({ ok: true });
    }
    const member = await prisma.teamMember.create({ data: body });
    return NextResponse.json({ ok: true, member });
  } catch (e) { return NextResponse.json({ error: 'Failed' }, { status: 500 }); }
}
