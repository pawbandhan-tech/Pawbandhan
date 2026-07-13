import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

const VALID_PHOTO_TYPES = ['pre_treatment', 'during_treatment', 'post_treatment', 'medical_report'];

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

    const photos = await prisma.casePhoto.findMany({
      where: { incidentCode: code },
      orderBy: { createdAt: 'asc' },
    });

    const grouped = {};
    VALID_PHOTO_TYPES.forEach(type => { grouped[type] = []; });
    photos.forEach(photo => {
      const type = photo.photoType || 'medical_report';
      if (!grouped[type]) grouped[type] = [];
      grouped[type].push(photo);
    });

    return NextResponse.json({ photos, grouped });
  } catch (error) {
    console.error('Get case photos error:', error);
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
    const { photoType, fileUrl, uploadedBy, uploaderId } = body;

    if (!photoType || !VALID_PHOTO_TYPES.includes(photoType)) {
      return NextResponse.json({ error: `photoType must be one of: ${VALID_PHOTO_TYPES.join(', ')}` }, { status: 400 });
    }

    if (!fileUrl) {
      return NextResponse.json({ error: 'fileUrl is required' }, { status: 400 });
    }

    const photo = await prisma.casePhoto.create({
      data: {
        incidentCode: code,
        photoType,
        fileUrl,
        uploadedBy: uploadedBy || 'doctor',
        uploaderId: uploaderId || null,
      },
    });

    const photoTypeLabels = {
      pre_treatment: 'Pre-Treatment Photo',
      during_treatment: 'During Treatment Photo',
      post_treatment: 'Post-Treatment Photo',
      medical_report: 'Medical Report',
    };

    await prisma.caseTimeline.create({
      data: {
        incidentCode: code,
        status: incident.workflowStatus || 'in_treatment',
        actorType: uploadedBy || 'doctor',
        actorId: uploaderId || null,
        note: `${photoTypeLabels[photoType] || 'Photo'} uploaded`,
        meta: { photoType, photoId: photo.id },
      },
    });

    return NextResponse.json({ success: true, photo });
  } catch (error) {
    console.error('Upload case photo error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
