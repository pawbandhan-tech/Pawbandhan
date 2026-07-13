import { verifyAdminToken } from '@/lib/admin-auth';
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || 'pawbandhan-dev-secret';

export async function POST(request) {
  try {
    const auth = verifyAdminToken(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { portalType, entityUid } = body;

    if (auth.role !== 'admin' && auth.role !== 'co-admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const portalToken = jwt.sign(
      {
        uid: entityUid || auth.email,
        portalType,
        accessType: 'admin_override',
        adminId: auth.sub || auth.id,
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return NextResponse.json({
      success: true,
      portalToken,
      portalType,
      redirectUrl: portalType === 'doctor' ? `/doctor/dashboard`
        : portalType === 'ngo' ? `/ngo/dashboard`
        : portalType === 'rider' ? `/rep/dashboard`
        : portalType === 'customer' ? `/dashboard`
        : `/admin`
    });
  } catch (error) {
    console.error('SSO error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
