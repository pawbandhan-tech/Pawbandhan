import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

const LOGO_KEY = "logo_url";

export async function GET(request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const config = await prisma.siteConfig.findUnique({
      where: { key: LOGO_KEY },
    });

    return NextResponse.json({
      success: true,
      logoUrl: config ? config.value : null,
    });
  } catch (error) {
    console.error("Get logo error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const { logoUrl } = await request.json();

    if (!logoUrl) {
      return NextResponse.json(
        { error: "logoUrl is required" },
        { status: 400 }
      );
    }

    const config = await prisma.siteConfig.upsert({
      where: { key: LOGO_KEY },
      update: { value: logoUrl },
      create: { key: LOGO_KEY, value: logoUrl },
    });

    return NextResponse.json({
      success: true,
      logoUrl: config.value,
    });
  } catch (error) {
    console.error("Set logo error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
