import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { generateId } from "@/lib/generate-id";

export async function POST(request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const { name, email, phone, ngoType, regNumber, panNumber, address, city, state, serviceArea, workType } =
      await request.json();

    if (!name || !email || !phone) {
      return NextResponse.json(
        { error: "Name, email, and phone are required" },
        { status: 400 }
      );
    }

    const existingNgo = await prisma.nGO.findUnique({ where: { email } });
    if (existingNgo) {
      return NextResponse.json(
        { error: "An NGO with this email already exists" },
        { status: 409 }
      );
    }

    const uid = uuidv4();

    const [user, ngo] = await prisma.$transaction([
      prisma.user.create({
        data: {
          uid,
          firstName: name,
          middleName: "",
          lastName: "",
          phoneNo: phone,
          email,
          passwordHash: "",
          accountNo: `ACC-${Date.now()}`,
          role: "ngo",
          status: "pending",
        },
      }),
      prisma.nGO.create({
        data: {
          uid,
          name,
          email,
          phone,
          ngoType: ngoType || "",
          regNumber: regNumber || "",
          panNumber: panNumber || "",
          address: address || "",
          city: city || "",
          state: state || "",
          serviceArea: serviceArea || "",
          workType: workType || "",
          status: "pending",
          prn: generateId('PB-PRN'),
          tempPrn: generateId('PB-PRN'),
          ackNo: generateId('PB-PRN'),
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      ngo: {
        id: ngo.id,
        uid: ngo.uid,
        name: ngo.name,
        email: ngo.email,
        phone: ngo.phone,
        ngoType: ngo.ngoType,
        regNumber: ngo.regNumber,
        panNumber: ngo.panNumber,
        address: ngo.address,
        city: ngo.city,
        state: ngo.state,
        serviceArea: ngo.serviceArea,
        workType: ngo.workType,
        status: ngo.status,
        prn: ngo.prn,
        tempPrn: ngo.tempPrn,
        ackNo: ngo.ackNo,
        createdAt: ngo.createdAt,
      },
    });
  } catch (error) {
    console.error("Create NGO error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
