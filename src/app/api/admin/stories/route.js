import { requireAdmin } from '@/lib/admin-auth';
import prisma from '@/lib/prisma';

export async function GET(request) {
  const admin = requireAdmin(request);
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const stories = await prisma.successStory.findMany({ orderBy: { createdAt: 'desc' } });
    return Response.json(stories);
  } catch (e) {
    return Response.json([]);
  }
}

export async function POST(request) {
  const admin = requireAdmin(request);
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const story = await prisma.successStory.create({ data: body });
    return Response.json(story);
  } catch (e) {
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PUT(request) {
  const admin = requireAdmin(request);
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id, ...data } = await request.json();
    const story = await prisma.successStory.update({ where: { id }, data });
    return Response.json(story);
  } catch (e) {
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request) {
  const admin = requireAdmin(request);
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await request.json();
    await prisma.successStory.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
