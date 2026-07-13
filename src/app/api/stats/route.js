import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const [rescueCount, ngoCount, doctorCount, riderCount] = await Promise.all([
      prisma.incident.count(),
      prisma.nGO.count({ where: { status: 'active' } }).catch(() => 0),
      prisma.doctor.count({ where: { status: 'active' } }).catch(() => 0),
      prisma.rider.count({ where: { status: 'active' } }).catch(() => 0),
    ]);

    const [rescueOverride, ngoOverride, doctorOverride, riderOverride] = await Promise.all([
      prisma.siteConfig.findUnique({ where: { key: 'stat_rescues_override' } }),
      prisma.siteConfig.findUnique({ where: { key: 'stat_ngos_override' } }),
      prisma.siteConfig.findUnique({ where: { key: 'stat_doctors_override' } }),
      prisma.siteConfig.findUnique({ where: { key: 'stat_riders_override' } }),
    ]);

    const toNum = (v) => { const n = parseInt(v); return isNaN(n) ? 0 : n; };

    return Response.json({
      rescues: rescueOverride?.value ? toNum(rescueOverride.value) : rescueCount,
      ngos: ngoOverride?.value ? toNum(ngoOverride.value) : ngoCount,
      doctors: doctorOverride?.value ? toNum(doctorOverride.value) : doctorCount,
      riders: riderOverride?.value ? toNum(riderOverride.value) : riderCount,
    });
  } catch (e) {
    console.error('[api/stats]', e);
    return Response.json({ rescues: 0, ngos: 0, doctors: 0, riders: 0 });
  }
}
