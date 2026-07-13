import prisma from '@/lib/prisma';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request) {
  try {
    let body;
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      const fd = await request.formData();
      body = {
        description: fd.get('description') || '',
        animalType: fd.get('animalType') || '',
        latitude: fd.get('latitude') || '',
        longitude: fd.get('longitude') || '',
        location: fd.get('location') || '',
        userId: fd.get('userId') || '',
      };
    } else {
      body = await request.json();
    }

    const incidentCode = `PB-${uuidv4().slice(0, 8).toUpperCase()}`;

    let userId = null;
    if (body.userId) {
      const user = await prisma.user.findFirst({ where: { uid: body.userId } });
      if (user) userId = user.id;
    }

    const incident = await prisma.incident.create({
      data: {
        incidentCode,
        userId,
        animalType: body.animalType || '',
        description: body.description || '',
        latitude: body.latitude ? parseFloat(body.latitude) : null,
        longitude: body.longitude ? parseFloat(body.longitude) : null,
        status: 'pending',
        workflowStatus: 'reported',
        images: [],
      },
    });

    // Auto-create case
    await prisma.case.create({
      data: {
        animalType: body.animalType || '',
        condition: body.description || '',
        location: body.location || '',
        status: 'open',
        incidentCode,
        workflowStatus: 'reported',
        latitude: incident.latitude,
        longitude: incident.longitude,
      },
    });

    return Response.json({ ok: true, incidentCode, id: incident.id });
  } catch (e) {
    console.error('[api/incidents/report]', e);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
