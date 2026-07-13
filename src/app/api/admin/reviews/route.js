import { requireAdmin } from '@/lib/admin-auth';
import prisma from '@/lib/prisma';

export async function GET(request) {
  const admin = requireAdmin(request);
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const reviews = await prisma.siteReview.findMany({
      orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
    });
    return Response.json(reviews);
  } catch (e) {
    return Response.json([]);
  }
}

export async function POST(request) {
  const admin = requireAdmin(request);
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const review = await prisma.siteReview.create({ data: body });
    return Response.json(review);
  } catch (e) {
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PUT(request) {
  const admin = requireAdmin(request);
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id, ...data } = await request.json();
    const review = await prisma.siteReview.update({ where: { id }, data });
    return Response.json(review);
  } catch (e) {
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request) {
  const admin = requireAdmin(request);
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await request.json();
    await prisma.siteReview.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
