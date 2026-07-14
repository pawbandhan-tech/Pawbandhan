import { requireAdmin } from '@/lib/admin-auth';
import prisma from '@/lib/prisma';

export async function GET(request) {
  const admin = requireAdmin(request);
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const incidents = await prisma.incident.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        user: { select: { firstName: true, lastName: true, email: true, phoneNo: true } },
        ngo: { select: { name: true } },
        doctor: { select: { name: true, hospitalName: true } },
        rep: { select: { name: true } },
      },
    });

    const enriched = incidents.map(inc => ({
      id: inc.id,
      incidentCode: inc.incidentCode,
      animalType: inc.animalType,
      injuryType: inc.injuryType,
      description: inc.description,
      status: inc.status,
      workflowStatus: inc.workflowStatus,
      ngoId: inc.ngoId,
      doctorId: inc.doctorId,
      repId: inc.repId,
      latitude: inc.latitude,
      longitude: inc.longitude,
      notes: inc.notes,
      estimatedCost: inc.estimatedCost,
      finalCost: inc.finalCost,
      commissionPct: inc.commissionPct,
      paymentMethod: inc.paymentMethod,
      paymentStatus: inc.paymentStatus,
      handoverPin: inc.handoverPin,
      dogTagId: inc.dogTagId,
      resolutionType: inc.resolutionType,
      releaseLat: inc.releaseLat,
      releaseLng: inc.releaseLng,
      releaseAddress: inc.releaseAddress,
      treatmentReport: inc.treatmentReport,
      images: inc.images,
      pickupLat: inc.pickupLat,
      pickupLng: inc.pickupLng,
      dropLat: inc.dropLat,
      dropLng: inc.dropLng,
      dropAddress: inc.dropAddress,
      userId: inc.userId,
      ngoAcceptedAt: inc.ngoAcceptedAt,
      createdAt: inc.createdAt,
      updatedAt: inc.updatedAt,
      userName: inc.user ? `${inc.user.firstName || ''} ${inc.user.lastName || ''}`.trim() : null,
      userEmail: inc.user?.email,
      userPhone: inc.user?.phoneNo,
      ngoName: inc.ngo?.name,
      doctorName: inc.doctor?.name,
      doctorHospital: inc.doctor?.hospitalName,
      repName: inc.rep?.name,
    }));

    return Response.json(enriched);
  } catch (e) {
    console.error('[api/admin/cases]', e);
    return Response.json([]);
  }
}
