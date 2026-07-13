import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const stories = await prisma.successStory.findMany({ orderBy: { createdAt: 'desc' } });
    return Response.json(stories);
  } catch (e) {
    console.error('[api/stories]', e);
    return Response.json([]);
  }
}
