import prisma from '@/lib/prisma';

export async function GET(request, { params }) {
  try {
    const { code } = await params;
    if (!code) {
      return Response.json({ error: 'Incident code required' }, { status: 400 });
    }

    const incident = await prisma.incident.findFirst({
      where: { incidentCode: code },
      include: {
        ngo: { select: { id: true, name: true } },
        rep: { select: { id: true, name: true } },
        doctor: { select: { id: true, name: true } },
      },
    });

    if (!incident) {
      return Response.json({ error: 'Case not found' }, { status: 404 });
    }

    const timelineRecords = await prisma.caseTimeline.findMany({
      where: { incidentCode: code },
      orderBy: { createdAt: 'asc' },
    });

    const STATUS_META = {
      reported: { title: 'Rescue Reported', description: 'Animal rescue reported by citizen', icon: 'fa-flag', color: 'green' },
      accepted: { title: 'NGO Accepted', description: 'Case accepted by rescue NGO', icon: 'fa-handshake', color: 'blue' },
      dispatched: { title: 'Field Rescuer Dispatched', description: 'Rescue rider dispatched to location', icon: 'fa-motorcycle', color: 'blue' },
      en_route: { title: 'En Route', description: 'Rescuer is on the way to the location', icon: 'fa-route', color: 'blue' },
      arrived: { title: 'Rescuer Arrived', description: 'Field rescuer arrived at the location', icon: 'fa-location-dot', color: 'blue' },
      rescued: { title: 'Animal Rescued', description: 'Animal has been safely rescued', icon: 'fa-paw', color: 'green' },
      in_transit: { title: 'In Transit', description: 'Animal being transported to facility', icon: 'fa-truck-medical', color: 'blue' },
      at_facility: { title: 'At Facility', description: 'Animal arrived at treatment facility', icon: 'fa-hospital', color: 'blue' },
      in_treatment: { title: 'In Treatment', description: 'Animal is receiving medical treatment', icon: 'fa-stethoscope', color: 'blue' },
      treatment_done: { title: 'Treatment Complete', description: 'Medical treatment has been completed', icon: 'fa-check-double', color: 'green' },
      released: { title: 'Released', description: 'Animal has been released back to safe location', icon: 'fa-dove', color: 'green' },
      closed: { title: 'Case Closed', description: 'Case has been resolved and closed', icon: 'fa-circle-check', color: 'green' },
      rejected: { title: 'Case Rejected', description: 'Case was rejected', icon: 'fa-times-circle', color: 'red' },
    };

    const workflowOrder = [
      'reported', 'accepted', 'dispatched', 'en_route', 'arrived',
      'rescued', 'in_transit', 'at_facility', 'in_treatment',
      'treatment_done', 'released', 'closed',
    ];

    const timeline = [];

    if (incident.createdAt) {
      timeline.push({
        status: 'reported',
        title: 'Rescue Reported',
        description: 'Animal rescue reported by citizen',
        timestamp: incident.createdAt.toISOString(),
        icon: 'fa-flag',
        color: 'green',
      });
    }

    for (const record of timelineRecords) {
      const meta = STATUS_META[record.status] || {
        title: record.status,
        description: record.note || '',
        icon: 'fa-circle-dot',
        color: 'blue',
      };
      timeline.push({
        status: record.status,
        title: meta.title,
        description: record.note || meta.description,
        timestamp: record.createdAt.toISOString(),
        icon: meta.icon,
        color: meta.color,
      });
    }

    const currentStatus = incident.workflowStatus || incident.status || 'reported';
    const lat = incident.latitude ? Number(incident.latitude) : null;
    const lng = incident.longitude ? Number(incident.longitude) : null;

    return Response.json({
      case: {
        id: incident.id,
        incidentCode: incident.incidentCode,
        animalType: incident.animalType,
        status: incident.status,
        workflowStatus: incident.workflowStatus,
        description: incident.description,
        createdAt: incident.createdAt?.toISOString(),
        ngo: incident.ngo,
        rep: incident.rep,
        doctor: incident.doctor,
      },
      timeline,
      currentStatus,
      estimatedCompletion: null,
      location: lat && lng ? { lat, lng, address: '' } : null,
    });
  } catch (e) {
    console.error('[api/incidents/tracking]', e);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
