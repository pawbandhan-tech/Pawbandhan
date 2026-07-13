import { requireAdmin } from '@/lib/admin-auth';
import prisma from '@/lib/prisma';

const ENTITY_CONFIGS = {
  doctor: {
    model: 'doctor',
    label: 'Doctor',
    findUnique: (id) => prisma.doctor.findUnique({ where: { id } }),
    findUser: (uid) => prisma.user.findFirst({ where: { uid } }),
    findCases: (id) =>
      prisma.incident.findMany({
        where: { doctorId: id },
        orderBy: { createdAt: 'desc' },
        include: { timeline: { orderBy: { createdAt: 'desc' } }, photos: { orderBy: { createdAt: 'desc' } } },
      }),
  },
  ngo: {
    model: 'nGO',
    label: 'NGO',
    findUnique: (id) => prisma.nGO.findUnique({ where: { id } }),
    findUser: (uid) => prisma.user.findFirst({ where: { uid } }),
    findCases: (id) =>
      prisma.case.findMany({
        where: { ngoId: id },
        orderBy: { createdAt: 'desc' },
      }),
    findRiders: (id) =>
      prisma.rider.findMany({
        where: { ngoId: id },
        orderBy: { createdAt: 'desc' },
      }),
    findRepresentatives: (id) =>
      prisma.representative.findMany({
        where: { ngoId: id },
        orderBy: { createdAt: 'desc' },
      }),
  },
  rider: {
    model: 'rider',
    label: 'Rider',
    findUnique: (id) => prisma.rider.findUnique({ where: { id } }),
    findUser: (uid) => prisma.user.findFirst({ where: { uid } }),
    findCases: (id) =>
      prisma.incident.findMany({
        where: { repId: id },
        orderBy: { createdAt: 'desc' },
        include: { timeline: { orderBy: { createdAt: 'desc' } } },
      }),
    findTracking: (id) =>
      prisma.riderTracking.findMany({
        where: { riderUid: id },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
  },
  representative: {
    model: 'representative',
    label: 'Representative',
    findUnique: (id) => prisma.representative.findUnique({ where: { id } }),
    findUser: (uid) => prisma.user.findFirst({ where: { uid } }),
    findCases: (id) =>
      prisma.incident.findMany({
        where: { repId: id },
        orderBy: { createdAt: 'desc' },
        include: { timeline: { orderBy: { createdAt: 'desc' } } },
      }),
    findCheckins: (id) =>
      prisma.repCheckin.findMany({
        where: { repId: id },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
  },
  customer: {
    model: 'customer',
    label: 'Customer',
    findUnique: (id) => prisma.customer.findUnique({ where: { id } }),
    findUser: (uid) => uid ? prisma.user.findFirst({ where: { uid } }) : null,
    findCases: (id, entity) =>
      prisma.case.findMany({
        where: { customerUid: entity?.uid },
        orderBy: { createdAt: 'desc' },
      }).catch(() => []),
    findPayments: (entity) =>
      prisma.casePayment.findMany({
        where: { customerUid: entity?.uid },
        orderBy: { createdAt: 'desc' },
      }).catch(() => []),
  },
  user: {
    model: 'user',
    label: 'User',
    findUnique: (id) => prisma.user.findUnique({ where: { id } }),
    findUser: (uid) => null,
  },
};

export async function GET(request) {
  const admin = requireAdmin(request);
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const id = parseInt(searchParams.get('id'), 10);

    if (!type || !id) {
      return Response.json({ error: 'type and id query params are required' }, { status: 400 });
    }

    const config = ENTITY_CONFIGS[type];
    if (!config) {
      return Response.json({ error: `Invalid entity type: ${type}` }, { status: 400 });
    }

    const entity = await config.findUnique(id);
    if (!entity) {
      return Response.json({ error: `${config.label} not found` }, { status: 404 });
    }

    const user = config.findUser ? await config.findUser(entity.uid).catch(() => null) : null;

    const activityLogs = await prisma.activityLog.findMany({
      where: { entityType: type, entityId: id },
      orderBy: { createdAt: 'desc' },
      take: 200,
    }).catch(() => []);

    let cases = [];
    let extra = {};

    if (config.findCases) {
      cases = await config.findCases(id, entity).catch(() => []);
    }

    if (type === 'ngo') {
      const [riders, representatives] = await Promise.all([
        config.findRiders ? config.findRiders(id).catch(() => []) : [],
        config.findRepresentatives ? config.findRepresentatives(id).catch(() => []) : [],
      ]);
      extra.ngoRiders = riders;
      extra.ngoRepresentatives = representatives;
      extra.totalIncidents = await prisma.incident.count({ where: { ngoId: id } }).catch(() => 0);
    }

    if (type === 'rider') {
      extra.trackingHistory = config.findTracking ? await config.findTracking(entity.uid).catch(() => []) : [];
    }

    if (type === 'representative') {
      extra.checkins = config.findCheckins ? await config.findCheckins(id).catch(() => []) : [];
    }

    if (type === 'customer') {
      extra.payments = config.findPayments ? await config.findPayments(entity).catch(() => []) : [];
    }

    let treatmentPhotos = [];
    let treatmentReports = [];
    if (type === 'doctor' && cases.length > 0) {
      const codes = cases.map(c => c.incidentCode).filter(Boolean);
      if (codes.length > 0) {
        treatmentPhotos = await prisma.casePhoto.findMany({
          where: { incidentCode: { in: codes } },
          orderBy: { createdAt: 'desc' },
        }).catch(() => []);
        treatmentReports = cases.filter(c => c.treatmentReport).map(c => ({
          incidentCode: c.incidentCode,
          report: c.treatmentReport,
          createdAt: c.createdAt,
        }));
      }
    }

    return Response.json({
      entity,
      entityType: type,
      user,
      cases,
      activityLogs,
      treatmentPhotos,
      treatmentReports,
      ...extra,
    });
  } catch (e) {
    console.error('[api/admin/entity-detail] GET', e);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
