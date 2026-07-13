import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { calculateDistanceKm, estimateEtaMinutes } from '@/lib/case-workflow';

export async function GET(request, { params }) {
  try {
    const { code } = await params;
    if (!code) {
      return NextResponse.json({ error: 'Case code required' }, { status: 400 });
    }

    const incident = await prisma.incident.findFirst({
      where: { incidentCode: code },
    });

    if (!incident) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    // Get latest tracking entry for this case
    const latestTracking = await prisma.riderTracking.findFirst({
      where: { incidentCode: code },
      orderBy: { createdAt: 'desc' },
    });

    if (!latestTracking) {
      return NextResponse.json({
        riderLocation: null,
        riderName: null,
        riderPhone: null,
        vehicleInfo: null,
        status: incident.workflowStatus || 'reported',
        eta: null,
        message: 'No rider assigned or tracking data available',
      });
    }

    // Get rider info
    let riderInfo = null;
    if (latestTracking.riderUid) {
      riderInfo = await prisma.rider.findFirst({
        where: { uid: latestTracking.riderUid },
        select: {
          name: true,
          phone: true,
          vehicleType: true,
          vehicleNumber: true,
        },
      });
    }

    // Calculate ETA if we have both pickup and rider locations
    let eta = null;
    const targetLat = incident.pickupLat ? Number(incident.pickupLat) : incident.latitude ? Number(incident.latitude) : null;
    const targetLng = incident.pickupLng ? Number(incident.pickupLng) : incident.longitude ? Number(incident.longitude) : null;

    if (latestTracking.lat && latestTracking.lng && targetLat && targetLng) {
      const distance = calculateDistanceKm(
        Number(latestTracking.lat), Number(latestTracking.lng),
        targetLat, targetLng
      );
      const speedKmh = latestTracking.speed ? Number(latestTracking.speed) * 3.6 : 30;
      eta = estimateEtaMinutes(distance, speedKmh);
    }

    return NextResponse.json({
      riderLocation: {
        lat: Number(latestTracking.lat),
        lng: Number(latestTracking.lng),
        heading: latestTracking.heading ? Number(latestTracking.heading) : null,
      },
      riderName: riderInfo?.name || null,
      riderPhone: riderInfo?.phone || null,
      vehicleInfo: riderInfo ? {
        type: riderInfo.vehicleType,
        number: riderInfo.vehicleNumber,
      } : null,
      status: latestTracking.status || incident.workflowStatus,
      eta,
      lastUpdated: latestTracking.createdAt?.toISOString() || null,
    });
  } catch (error) {
    console.error('Get rider tracking error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const { code } = await params;
    if (!code) {
      return NextResponse.json({ error: 'Case code required' }, { status: 400 });
    }

    const incident = await prisma.incident.findFirst({
      where: { incidentCode: code },
    });

    if (!incident) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    const body = await request.json();
    const { riderUid, lat, lng, heading, speed, status } = body;

    if (!riderUid || lat === undefined || lng === undefined) {
      return NextResponse.json({ error: 'riderUid, lat, and lng are required' }, { status: 400 });
    }

    const tracking = await prisma.riderTracking.create({
      data: {
        riderUid,
        incidentCode: code,
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        heading: heading ? parseFloat(heading) : null,
        speed: speed ? parseFloat(speed) : null,
        status: status || 'en_route',
      },
    });

    // Also update rider's current location
    await prisma.rider.updateMany({
      where: { uid: riderUid },
      data: {
        lat: parseFloat(lat),
        lng: parseFloat(lng),
      },
    });

    return NextResponse.json({
      success: true,
      tracking: {
        id: tracking.id,
        lat: Number(tracking.lat),
        lng: Number(tracking.lng),
        heading: tracking.heading ? Number(tracking.heading) : null,
        speed: tracking.speed ? Number(tracking.speed) : null,
        status: tracking.status,
        createdAt: tracking.createdAt?.toISOString(),
      },
    });
  } catch (error) {
    console.error('Update rider tracking error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
