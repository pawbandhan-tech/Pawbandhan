import { requireAdmin } from '@/lib/admin-auth';
import prisma from '@/lib/prisma';

const ENTITY_MAP = {
  ngo: { model: 'nGO', label: 'NGO' },
  doctor: { model: 'doctor', label: 'Doctor' },
  rider: { model: 'rider', label: 'Rider' },
  representative: { model: 'representative', label: 'Representative' },
};

async function fetchPendingFromModel(modelName, entityType, label) {
  const results = await prisma[modelName].findMany({
    where: { status: { in: ['pending', 'kyc_submitted'] } },
    orderBy: { createdAt: 'desc' },
  });
  return results.map(r => ({ ...r, entityType, entityLabel: label }));
}

export async function GET(request) {
  const admin = requireAdmin(request);
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const fetches = Object.entries(ENTITY_MAP).map(([key, { model, label }]) =>
      fetchPendingFromModel(model, key, label).catch(() => [])
    );

    const [ngos, doctors, riders, representatives] = await Promise.all(fetches);
    const all = [...ngos, ...doctors, ...riders, ...representatives];

    all.sort((a, b) => {
      const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return db - da;
    });

    return Response.json({ submissions: all, total: all.length });
  } catch (e) {
    console.error('[api/admin/kyc-review] GET', e);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request) {
  const admin = requireAdmin(request);
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { entityType, entityId, action, rejectionReason } = await request.json();

    if (!entityType || !entityId || !action) {
      return Response.json({ error: 'entityType, entityId, and action are required' }, { status: 400 });
    }

    const entityConfig = ENTITY_MAP[entityType];
    if (!entityConfig) {
      return Response.json({ error: `Invalid entityType: ${entityType}` }, { status: 400 });
    }

    const entity = await prisma[entityConfig.model].findUnique({ where: { id: entityId } });
    if (!entity) {
      return Response.json({ error: `${entityConfig.label} not found` }, { status: 404 });
    }

    const existingKyc = (entity.kycData && typeof entity.kycData === 'object') ? entity.kycData : {};
    const now = new Date().toISOString();
    const adminEmail = admin.email;

    let updateData = {};

    if (action === 'approve') {
      updateData = {
        status: 'active',
        kycData: {
          ...existingKyc,
          approvedAt: now,
          approvedBy: adminEmail,
        },
      };
    } else if (action === 'reject') {
      if (!rejectionReason) {
        return Response.json({ error: 'rejectionReason is required for reject action' }, { status: 400 });
      }
      updateData = {
        status: 'rejected',
        rejectionReason,
        kycData: {
          ...existingKyc,
          rejectedAt: now,
          rejectedBy: adminEmail,
          rejectionReason,
        },
      };
    } else if (action === 'request_reupload') {
      if (!rejectionReason) {
        return Response.json({ error: 'rejectionReason (used as reuploadReason) is required' }, { status: 400 });
      }
      updateData = {
        status: 'kyc_resubmit',
        kycData: {
          ...existingKyc,
          reuploadRequestedAt: now,
          reuploadReason: rejectionReason,
        },
      };
    } else {
      return Response.json({ error: `Invalid action: ${action}` }, { status: 400 });
    }

    const updated = await prisma[entityConfig.model].update({
      where: { id: entityId },
      data: updateData,
    });

    return Response.json({ ok: true, entity: updated });
  } catch (e) {
    console.error('[api/admin/kyc-review] POST', e);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
