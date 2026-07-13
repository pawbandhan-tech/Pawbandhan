import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

export async function POST(request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const { id, status, role } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    if (!status && !role) {
      return NextResponse.json(
        { error: "At least one of status or role must be provided" },
        { status: 400 }
      );
    }

    const validStatuses = ["pending", "active", "suspended", "rejected"];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
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
    if (role && !validRoles.includes(role)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${validRoles.join(", ")}` },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const updateData = {};
    if (status) updateData.status = status;
    if (role) updateData.role = role;

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    if (status) {
      const entityRole = updatedUser.role;

      if (entityRole === "ngo") {
        await prisma.nGO.updateMany({
          where: { uid: updatedUser.uid },
          data: { status },
        });
      } else if (entityRole === "doctor") {
        await prisma.doctor.updateMany({
          where: { uid: updatedUser.uid },
          data: { status },
        });
      } else if (entityRole === "rider") {
        await prisma.rider.updateMany({
          where: { uid: updatedUser.uid },
          data: { status },
        });
      } else if (entityRole === "representative") {
        await prisma.representative.updateMany({
          where: { uid: updatedUser.uid },
          data: { status },
        });
      }
    }

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        uid: updatedUser.uid,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
        phoneNo: updatedUser.phoneNo,
        role: updatedUser.role,
        status: updatedUser.status,
        accountNo: updatedUser.accountNo,
        createdAt: updatedUser.createdAt,
      },
    });
  } catch (error) {
    console.error("Update user error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
