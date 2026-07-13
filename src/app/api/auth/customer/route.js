import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, password, name, phone, role, action } = body;

    if (!email || !password) {
      return Response.json({ error: 'Email and password required' }, { status: 400 });
    }

    if (action === 'register') {
      // Check if user exists
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return Response.json({ error: 'Email already registered' }, { status: 409 });
      }

      const uid = uuidv4();
      const hash = await bcrypt.hash(password, 12);

      const user = await prisma.user.create({
        data: {
          uid,
          email,
          firstName: name || email.split('@')[0],
          phoneNo: phone || '',
          role: role || 'customer',
          status: 'active',
        },
      });

      // Create customer record
      if (!role || role === 'customer') {
        await prisma.customer.create({
          data: { uid, name: name || '', email, phone: phone || '' },
        });
      }

      return Response.json({ uid: user.uid, name: user.firstName, id: user.id });
    }

    // Login
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Try customer portal login with access code
      const customer = await prisma.customer.findFirst({ where: { email } });
      if (customer) {
        return Response.json({ uid: customer.uid, name: customer.name, id: customer.id });
      }
      return Response.json({ error: 'Account not found. Please sign up first.' }, { status: 404 });
    }

    return Response.json({ uid: user.uid, name: user.firstName, id: user.id });
  } catch (e) {
    console.error('[api/auth/customer]', e);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
