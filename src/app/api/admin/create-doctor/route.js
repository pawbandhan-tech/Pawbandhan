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

    const { name, email, phone, specialization, licenseNumber, hospitalName } =
      await request.json();

    if (!name || !email || !phone) {
      return NextResponse.json(
        { error: "Name, email, and phone are required" },
        { status: 400 }
      );
    }

    const existingDoctor = await prisma.doctor.findUnique({ where: { email } });
    if (existingDoctor) {
      return NextResponse.json(
        { error: "A doctor with this email already exists" },
        { status: 409 }
      );
    }

    const uid = uuidv4();

    const [user, doctor] = await prisma.$transaction([
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
          role: "doctor",
          status: "pending",
        },
      }),
      prisma.doctor.create({
        data: {
          uid,
          name,
          email,
          phone,
          specialization: specialization || "",
          licenseNumber: licenseNumber || "",
          hospitalName: hospitalName || "",
          status: "pending",
          prn: generateId('PB-DOC'),
          tempId: generateId('PB-DOC'),
          ackNo: generateId('PB-DOC'),
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      doctor: {
        id: doctor.id,
        uid: doctor.uid,
        name: doctor.name,
        email: doctor.email,
        phone: doctor.phone,
        specialization: doctor.specialization,
        licenseNumber: doctor.licenseNumber,
        hospitalName: doctor.hospitalName,
        status: doctor.status,
        prn: doctor.prn,
        tempId: doctor.tempId,
        ackNo: doctor.ackNo,
        createdAt: doctor.createdAt,
      },
    });
  } catch (error) {
    console.error("Create doctor error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
