import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { comparePassword, createSession, createBusinessSession } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email dan password wajib diisi." }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Cek dulu di tabel PlatformOwner (Super Admin)
    const admin = await prisma.platformOwner.findUnique({
      where: { email: cleanEmail },
    });

    if (admin) {
      const isValid = await comparePassword(password, admin.passwordHash);
      if (isValid) {
        await createSession({ id: admin.id, email: admin.email, name: admin.name });
        return NextResponse.json({
          role: "PLATFORM_OWNER",
          redirectTo: "/admin",
          name: admin.name,
          message: "Login Super Admin Berhasil!",
        });
      }
    }

    // 2. Cek di tabel BusinessOwner (Pemilik UMKM)
    const businessOwner = await prisma.businessOwner.findUnique({
      where: { email: cleanEmail },
      include: { tenant: true },
    });

    if (businessOwner) {
      const isValid = await comparePassword(password, businessOwner.passwordHash);
      if (isValid) {
        await createBusinessSession({
          id: businessOwner.id,
          tenantId: businessOwner.tenantId,
          email: businessOwner.email,
          name: businessOwner.name,
          role: businessOwner.role,
        });

        return NextResponse.json({
          role: "BUSINESS_OWNER",
          redirectTo: "/dashboard",
          name: businessOwner.name,
          tenantName: businessOwner.tenant.name,
          message: `Selamat Datang Kembali, ${businessOwner.name}!`,
        });
      }
    }

    return NextResponse.json(
      { error: "Email atau password salah. Silakan periksa kembali." },
      { status: 401 }
    );
  } catch (error) {
    console.error("Unified Login API Error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan server saat login." }, { status: 500 });
  }
}
