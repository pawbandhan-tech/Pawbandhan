import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const configs = await prisma.siteConfig.findMany({
      where: { key: { startsWith: 'chat_' } },
    });
    const data = {};
    configs.forEach(c => { data[c.key] = c.value; });
    return NextResponse.json(data);
  } catch (e) { return NextResponse.json({}); }
}
