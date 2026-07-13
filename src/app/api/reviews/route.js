import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const reviews = await prisma.siteReview.findMany({
      orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
    });
    return Response.json(reviews);
  } catch (e) {
    console.error('[api/reviews]', e);
    return Response.json([]);
  }
}
