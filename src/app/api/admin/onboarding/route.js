import { requireAdmin } from '@/lib/admin-auth';
import prisma from '@/lib/prisma';

const ENTITY_MAP = {
  ngo: 'nGO',
  doctor: 'doctor',
  rider: 'rider',
  representative: 'representative',
};

export async function GET(request) {
  const admin = requireAdmin(request);
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('entityType');
    const entityId = searchParams.get('entityId');

    if (!entityType || !entityId) {
      return Response.json({ error: 'entityType and entityId are required' }, { status: 400 });
    }

    const modelName = ENTITY_MAP[entityType];
    if (!modelName) {
      return Response.json({ error: `Invalid entityType: ${entityType}` }, { status: 400 });
    }

    const entity = await prisma[modelName].findUnique({
      where: { id: parseInt(entityId, 10) },
      select: { id: true, name: true, email: true, status: true, kycData: true, createdAt: true },
    });

    if (!entity) {
      return Response.json({ error: 'Entity not found' }, { status: 404 });
    }

    const kycData = (entity.kycData && typeof entity.kycData === 'object') ? entity.kycData : {};

    const onboardingStatus = {
      entityId: entity.id,
      entityType,
      name: entity.name,
      email: entity.email,
      currentStatus: entity.status,
      registeredAt: entity.createdAt,
      kycApproved: kycData.approvedAt || null,
      agreementPending: entity.status === 'agreement_pending',
      agreementSigned: kycData.digitalSignature?.signedAt || null,
      onboarded: kycData.onboardedAt || null,
      legalAgreement: kycData.legalAgreement || null,
      digitalSignature: kycData.digitalSignature || null,
    };

    return Response.json(onboardingStatus);
  } catch (e) {
    console.error('[api/admin/onboarding] GET', e);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request) {
  const admin = requireAdmin(request);
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { entityType, entityId, action } = await request.json();

    if (!entityType || !entityId || !action) {
      return Response.json({ error: 'entityType, entityId, and action are required' }, { status: 400 });
    }

    const modelName = ENTITY_MAP[entityType];
    if (!modelName) {
      return Response.json({ error: `Invalid entityType: ${entityType}` }, { status: 400 });
    }

    const entity = await prisma[modelName].findUnique({ where: { id: parseInt(entityId, 10) } });
    if (!entity) {
      return Response.json({ error: 'Entity not found' }, { status: 404 });
    }

    const existingKyc = (entity.kycData && typeof entity.kycData === 'object') ? entity.kycData : {};
    const now = new Date().toISOString();
    let updateData = {};

    if (action === 'initiate_agreement') {
      updateData = {
        status: 'agreement_pending',
        kycData: {
          ...existingKyc,
          legalAgreement: {
            initiatedAt: now,
            initiatedBy: admin.email,
            status: 'pending_signature',
          },
        },
      };
    } else if (action === 'sign_agreement') {
      const forwarded = request.headers.get('x-forwarded-for');
      const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
      updateData = {
        kycData: {
          ...existingKyc,
          digitalSignature: {
            signedAt: now,
            signedBy: entity.name || entity.email || entityType,
            ipAddress: ip,
          },
          legalAgreement: {
            ...existingKyc.legalAgreement,
            status: 'signed',
            signedAt: now,
          },
        },
      };
    } else if (action === 'complete_onboarding') {
      updateData = {
        status: 'active',
        kycData: {
          ...existingKyc,
          onboardedAt: now,
          onboardedBy: admin.email,
          legalAgreement: {
            ...existingKyc.legalAgreement,
            status: 'completed',
            completedAt: now,
          },
        },
      };
    } else {
      return Response.json({ error: `Invalid action: ${action}` }, { status: 400 });
    }

    const updated = await prisma[modelName].update({
      where: { id: parseInt(entityId, 10) },
      data: updateData,
    });

    return Response.json({ ok: true, entity: updated });
  } catch (e) {
    console.error('[api/admin/onboarding] POST', e);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
