import { requireAdmin } from '@/lib/admin-auth';
import prisma from '@/lib/prisma';

const ENTITY_MAP = {
  ngo: 'nGO',
  doctor: 'doctor',
  rider: 'rider',
  representative: 'representative',
  shelter: 'nGO',
  rescue_org: 'nGO',
  boarding: 'nGO',
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
      select: { id: true, name: true, email: true, status: true, kycData: true, entityType: entityType === 'ngo' || entityType === 'shelter' || entityType === 'rescue_org' || entityType === 'boarding' ? true : false },
    });

    if (!entity) {
      return Response.json({ error: 'Entity not found' }, { status: 404 });
    }

    const kycData = (entity.kycData && typeof entity.kycData === 'object') ? entity.kycData : {};

    return Response.json({
      entityId: entity.id,
      entityType,
      name: entity.name,
      email: entity.email,
      status: entity.status,
      kycData,
    });
  } catch (e) {
    console.error('[api/admin/kyc-documents] GET', e);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request) {
  const admin = requireAdmin(request);
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { entityType, entityId, kycData } = await request.json();

    if (!entityType || !entityId || !kycData) {
      return Response.json({ error: 'entityType, entityId, and kycData are required' }, { status: 400 });
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

    const updatedKyc = {
      ...existingKyc,
      ...kycData,
      documents: kycData.documents || existingKyc.documents || [],
      lastDocumentUpdate: new Date().toISOString(),
      lastDocumentUpdateBy: admin.email,
    };

    const updated = await prisma[modelName].update({
      where: { id: parseInt(entityId, 10) },
      data: { kycData: updatedKyc },
    });

    return Response.json({ ok: true, kycData: updated.kycData });
  } catch (e) {
    console.error('[api/admin/kyc-documents] POST', e);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
