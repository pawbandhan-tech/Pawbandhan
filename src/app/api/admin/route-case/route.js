import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import { calculateDistanceKm } from '@/lib/case-workflow';
import { getRecommendedVehicle, getVehicleLabel } from '@/lib/vehicle-assignment';

export async function POST(request) {
  try {
    const auth = requireAdmin(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { incidentCode, action } = body;

    if (!incidentCode || !action) {
      return NextResponse.json({ error: 'incidentCode and action are required' }, { status: 400 });
    }

    const validActions = ['assign_nearest_ngo', 'assign_nearest_rider', 'assign_nearest_doctor'];
    if (!validActions.includes(action)) {
      return NextResponse.json({ error: `action must be one of: ${validActions.join(', ')}` }, { status: 400 });
    }

    const incident = await prisma.incident.findFirst({
      where: { incidentCode },
    });

    if (!incident) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    const incidentLat = incident.latitude ? Number(incident.latitude) : null;
    const incidentLng = incident.longitude ? Number(incident.longitude) : null;

    if (!incidentLat || !incidentLng) {
      return NextResponse.json({ error: 'Case location (lat/lng) is required for proximity matching' }, { status: 400 });
    }

    let assigned = null;
    let timelineNote = '';

    if (action === 'assign_nearest_ngo') {
      const ngos = await prisma.nGO.findMany({
        where: { status: 'active', lat: { not: null }, lng: { not: null } },
        select: { id: true, name: true, lat: true, lng: true },
      });

      if (ngos.length === 0) {
        return NextResponse.json({ error: 'No active NGOs with location data found' }, { status: 404 });
      }

      const withDistance = ngos.map(ngo => ({
        ...ngo,
        distance: calculateDistanceKm(incidentLat, incidentLng, Number(ngo.lat), Number(ngo.lng)),
      }));

      withDistance.sort((a, b) => a.distance - b.distance);
      const nearest = withDistance[0];

      await prisma.incident.update({
        where: { id: incident.id },
        data: { ngoId: nearest.id },
      });

      await prisma.case.updateMany({
        where: { incidentCode },
        data: { ngoId: nearest.id },
      });

      assigned = { id: nearest.id, name: nearest.name, distance: Math.round(nearest.distance * 10) / 10 };
      timelineNote = `Assigned nearest NGO: ${nearest.name} (${assigned.distance} km away)`;

    } else if (action === 'assign_nearest_rider') {
      const ngoFilter = incident.ngoId
        ? { ngoId: incident.ngoId, status: 'active', lat: { not: null }, lng: { not: null } }
        : { status: 'active', lat: { not: null }, lng: { not: null } };

      const riders = await prisma.rider.findMany({
        where: ngoFilter,
        select: { id: true, name: true, uid: true, lat: true, lng: true, ngoId: true, vehicleType: true },
      });

      if (riders.length === 0) {
        return NextResponse.json({ error: 'No active riders with location data found' }, { status: 404 });
      }

      const withDistance = riders.map(rider => ({
        ...rider,
        distance: calculateDistanceKm(incidentLat, incidentLng, Number(rider.lat), Number(rider.lng)),
      }));

      withDistance.sort((a, b) => a.distance - b.distance);
      const nearest = withDistance[0];

      const recommendedVehicle = getRecommendedVehicle(incident.animalType);
      const vehicleLabel = getVehicleLabel(recommendedVehicle);

      await prisma.incident.update({
        where: { id: incident.id },
        data: { repId: nearest.id },
      });

      assigned = { id: nearest.id, name: nearest.name, uid: nearest.uid, distance: Math.round(nearest.distance * 10) / 10, recommendedVehicle, vehicleLabel, animalType: incident.animalType };
      timelineNote = `Assigned nearest rider: ${nearest.name} (${assigned.distance} km away). Recommended vehicle: ${vehicleLabel} for ${incident.animalType || 'animal'}.`;

    } else if (action === 'assign_nearest_doctor') {
      const doctors = await prisma.doctor.findMany({
        where: { status: 'active', lat: { not: null }, lng: { not: null } },
        select: { id: true, name: true, lat: true, lng: true, hospitalName: true },
      });

      if (doctors.length === 0) {
        return NextResponse.json({ error: 'No active doctors with location data found' }, { status: 404 });
      }

      const withDistance = doctors.map(doc => ({
        ...doc,
        distance: calculateDistanceKm(incidentLat, incidentLng, Number(doc.lat), Number(doc.lng)),
      }));

      withDistance.sort((a, b) => a.distance - b.distance);
      const nearest = withDistance[0];

      await prisma.incident.update({
        where: { id: incident.id },
        data: { doctorId: nearest.id },
      });

      assigned = { id: nearest.id, name: nearest.name, hospital: nearest.hospitalName, distance: Math.round(nearest.distance * 10) / 10 };
      timelineNote = `Assigned nearest doctor: ${nearest.name} at ${nearest.hospitalName || 'clinic'} (${assigned.distance} km away)`;
    }

    // Create timeline entry
    const timelineEntry = await prisma.caseTimeline.create({
      data: {
        incidentCode,
        status: incident.workflowStatus || 'reported',
        actorType: 'admin',
        actorId: auth.sub,
        note: timelineNote,
        meta: { action, assigned },
      },
    });

    return NextResponse.json({
      success: true,
      assigned,
      action,
      timelineEntry,
    });
  } catch (error) {
    console.error('Route case error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
