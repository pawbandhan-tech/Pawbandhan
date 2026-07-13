import { requireAdmin } from '@/lib/admin-auth';
import prisma from '@/lib/prisma';

export async function GET(request) {
  const admin = requireAdmin(request);
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const [customers, ngos, doctors, riders, reps] = await Promise.all([
      prisma.customer.findMany({ orderBy: { createdAt: 'desc' } }).catch(() => []),
      prisma.nGO.findMany({ orderBy: { createdAt: 'desc' } }).catch(() => []),
      prisma.doctor.findMany({ orderBy: { createdAt: 'desc' } }).catch(() => []),
      prisma.rider.findMany({ orderBy: { createdAt: 'desc' } }).catch(() => []),
      prisma.representative.findMany({ orderBy: { createdAt: 'desc' } }).catch(() => []),
    ]);

    const all = [
      ...customers.map(c => ({ ...c, _type: 'customer', _label: c.name || c.email || 'Customer' })),
      ...ngos.map(n => ({ ...n, _type: 'ngo', _label: n.name || n.email || 'NGO' })),
      ...doctors.map(d => ({ ...d, _type: 'doctor', _label: d.name || d.email || 'Doctor' })),
      ...riders.map(r => ({ ...r, _type: 'rider', _label: r.name || r.email || 'Rider' })),
      ...reps.map(r => ({ ...r, _type: 'representative', _label: r.name || r.email || 'Representative' })),
    ];

    all.sort((a, b) => {
      const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return db - da;
    });

    return Response.json(all);
  } catch (e) {
    console.error('[api/admin/all-accounts]', e);
    return Response.json([]);
  }
}
