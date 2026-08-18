import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { comparePassword, createBusinessSession } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email dan password wajib diisi." },
        { status: 400 }
      );
    }

    const businessOwner = await prisma.businessOwner.findUnique({
      where: { email },
      include: {
        tenant: true,
      },
    });

    if (!businessOwner) {
      return NextResponse.json(
        { error: "Email atau password pemilik bisnis salah." },
        { status: 401 }
      );
    }

    // Cek apakah Tenant dalam keadaan Aktif
    if (businessOwner.tenant.subscriptionStatus !== "ACTIVE") {
      return NextResponse.json(
        { error: "Akses akun bisnis Anda sedang dinonaktifkan oleh Platform Owner." },
        { status: 403 }
      );
    }

    const isValid = await comparePassword(password, businessOwner.passwordHash);

    if (!isValid) {
      return NextResponse.json(
        { error: "Email atau password pemilik bisnis salah." },
        { status: 401 }
      );
    }

    await createBusinessSession({
      id: businessOwner.id,
      tenantId: businessOwner.tenantId,
      email: businessOwner.email,
      name: businessOwner.name,
      role: businessOwner.role,
    });

    return NextResponse.json({
      message: "Login bisnis sukses!",
      user: {
        id: businessOwner.id,
        tenantId: businessOwner.tenantId,
        email: businessOwner.email,
        name: businessOwner.name,
        tenantName: businessOwner.tenant.name,
      },
    });
  } catch (error) {
    console.error("Business Login Error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan saat login bisnis." }, { status: 500 });
  }
}
