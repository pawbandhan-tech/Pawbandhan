import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { generateId } from "@/lib/generate-id";

export async function POST(request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const { email, password, name, phone, role } = await request.json();

    if (!email || !password || !name || !phone || !role) {
      return NextResponse.json(
        { error: "Email, password, name, phone, and role are required" },
        { status: 400 }
      );
    }

    const validRoles = [
      "admin",
      "staff",
      "co-admin",
      "customer",
      "ngo",
      "doctor",
      "rider",
      "representative",
    ];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${validRoles.join(", ")}` },
        { status: 400 }
      );
    }

    if (role === "admin" || role === "staff" || role === "co-admin") {
      const existing = await prisma.adminUser.findUnique({
        where: { email },
      });
      if (existing) {
        return NextResponse.json(
          { error: "An admin user with this email already exists" },
          { status: 409 }
        );
      }

      const passwordHash = await bcrypt.hash(password, 12);
      const adminUser = await prisma.adminUser.create({
        data: {
          email,
          passwordHash,
          name,
          active: true,
          role: role,
        },
      });

      return NextResponse.json({
        success: true,
        user: {
          id: adminUser.id,
          email: adminUser.email,
          name: adminUser.name,
          role,
          active: adminUser.active,
          createdAt: adminUser.createdAt,
        },
      });
    }

    if (role === "customer") {
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });
      if (existingUser) {
        return NextResponse.json(
          { error: "A user with this email already exists" },
          { status: 409 }
        );
      }

      const existingCustomer = await prisma.customer.findFirst({
        where: { email },
      });
      if (existingCustomer) {
        return NextResponse.json(
          { error: "A customer with this email already exists" },
          { status: 409 }
        );
      }

      const uid = uuidv4();
      const passwordHash = await bcrypt.hash(password, 12);
      const accountNo = generateId('PB-ACC');

      const user = await prisma.user.create({
        data: {
          uid,
          firstName: name.split(" ")[0] || name,
          middleName: name.split(" ").length > 2 ? name.split(" ").slice(1, -1).join(" ") : "",
          lastName: name.split(" ").length > 1 ? name.split(" ").slice(-1)[0] : "",
          phoneNo: phone,
          email,
          passwordHash,
          accountNo,
          role: "customer",
          status: "active",
        },
      });

      const customer = await prisma.customer.create({
        data: {
          uid,
          name,
          email,
          phone,
        },
      });

      return NextResponse.json({
        success: true,
        user: {
          id: user.id,
          uid: user.uid,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          status: user.status,
          accountNo: user.accountNo,
        },
        customer: {
          id: customer.id,
          uid: customer.uid,
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
        },
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 }
      );
    }

    const uid = uuidv4();
    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        uid,
        firstName: name.split(" ")[0] || name,
        middleName: name.split(" ").length > 2 ? name.split(" ").slice(1, -1).join(" ") : "",
        lastName: name.split(" ").length > 1 ? name.split(" ").slice(-1)[0] : "",
        phoneNo: phone,
        email,
        passwordHash,
        accountNo: generateId('PB-ACC'),
        role,
        status: "pending",
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        uid: user.uid,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phoneNo: user.phoneNo,
        role: user.role,
        status: user.status,
        accountNo: user.accountNo,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Create user error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
