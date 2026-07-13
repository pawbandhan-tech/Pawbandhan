import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const configs = await prisma.siteConfig.findMany();
    const obj = {};
    configs.forEach(c => { obj[c.key] = c.value; });
    return Response.json(obj);
  } catch (e) {
    console.error('[api/site-config]', e);
    return Response.json({});
  }
}
