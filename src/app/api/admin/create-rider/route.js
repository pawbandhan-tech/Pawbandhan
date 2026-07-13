import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

function generateRandomDigits(length) {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += Math.floor(Math.random() * 10).toString();
  }
  return result;
}

export async function POST(request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const { name, email, phone, vehicleType, vehicleNumber, licenseNumber, ngoId } =
      await request.json();

    if (!name || !email || !phone) {
      return NextResponse.json(
        { error: "Name, email, and phone are required" },
        { status: 400 }
      );
    }

    const existingRider = await prisma.rider.findUnique({ where: { email } });
    if (existingRider) {
      return NextResponse.json(
        { error: "A rider with this email already exists" },
        { status: 409 }
      );
    }

    if (ngoId) {
      const ngo = await prisma.nGO.findUnique({ where: { id: ngoId } });
      if (!ngo) {
        return NextResponse.json(
          { error: "NGO not found" },
          { status: 404 }
        );
      }
    }

    const uid = uuidv4();

    const user = await prisma.user.create({
      data: {
        uid,
        firstName: name,
        middleName: "",
        lastName: "",
        phoneNo: phone,
        email,
        passwordHash: "",
        accountNo: `ACC-${Date.now()}`,
        role: "rider",
        status: "pending",
      },
    });

    const rider = await prisma.rider.create({
      data: {
        uid,
        ngoId: ngoId || null,
        name,
        email,
        phone,
        vehicleType: vehicleType || "",
        vehicleNumber: vehicleNumber || "",
        licenseNumber: licenseNumber || "",
        status: "pending",
        riderId: `RID-${generateRandomDigits(4)}`,
      },
    });

    return NextResponse.json({
      success: true,
      rider: {
        id: rider.id,
        uid: rider.uid,
        ngoId: rider.ngoId,
        name: rider.name,
        email: rider.email,
        phone: rider.phone,
        vehicleType: rider.vehicleType,
        vehicleNumber: rider.vehicleNumber,
        licenseNumber: rider.licenseNumber,
        status: rider.status,
        riderId: rider.riderId,
        createdAt: rider.createdAt,
      },
    });
  } catch (error) {
    console.error("Create rider error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
