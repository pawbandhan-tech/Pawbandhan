import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const members = await prisma.teamMember.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } });
    return NextResponse.json(members);
  } catch (e) { return NextResponse.json([]); }
}
