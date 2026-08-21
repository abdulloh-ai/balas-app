import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { comparePassword, createSession, createBusinessSession } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email dan password wajib diisi." },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Cek apakah pengguna adalah PlatformOwner (Super Admin)
    const platformOwner = await prisma.platformOwner.findUnique({
      where: { email: cleanEmail },
    });

    if (platformOwner) {
      const isValid = await comparePassword(password, platformOwner.passwordHash);
      if (!isValid) {
        return NextResponse.json(
          { error: "Email atau password salah." },
          { status: 401 }
        );
      }

      await createSession({
        id: platformOwner.id,
        email: platformOwner.email,
        name: platformOwner.name,
      });

      return NextResponse.json({
        message: "Login Super Admin berhasil!",
        role: "PLATFORM_OWNER",
        redirectTo: "/admin",
      });
    }

    // 2. Cek apakah pengguna adalah BusinessOwner (Pemilik UMKM)
    const businessOwner = await prisma.businessOwner.findUnique({
      where: { email: cleanEmail },
      include: { tenant: true },
    });

    if (businessOwner) {
      const isValid = await comparePassword(password, businessOwner.passwordHash);
      if (!isValid) {
        return NextResponse.json(
          { error: "Email atau password salah." },
          { status: 401 }
        );
      }

      const tenant = businessOwner.tenant;

      // Cek Status Verifikasi Pembayaran UMKM
      if (
        tenant.paymentStatus === "MENUNGGU_VERIFIKASI" ||
        tenant.subscriptionStatus === "MENUNGGU_VERIFIKASI"
      ) {
        return NextResponse.json(
          {
            error:
              "Akun kamu masih menunggu verifikasi pembayaran, hubungi admin jika sudah lebih dari 1x24 jam.",
            pendingVerification: true,
          },
          { status: 403 }
        );
      }

      if (tenant.subscriptionStatus === "INACTIVE") {
        return NextResponse.json(
          {
            error:
              "Status langganan akun kamu tidak aktif. Silakan hubungi Super Admin untuk mengaktifkan kembali.",
          },
          { status: 403 }
        );
      }

      await createBusinessSession({
        id: businessOwner.id,
        tenantId: tenant.id,
        email: businessOwner.email,
        name: businessOwner.name,
        role: businessOwner.role,
      });

      return NextResponse.json({
        message: "Login Pemilik UMKM berhasil!",
        role: "BUSINESS_OWNER",
        redirectTo: "/dashboard",
      });
    }

    return NextResponse.json(
      { error: "Email atau password tidak ditemukan. Silakan daftar di /daftar." },
      { status: 404 }
    );
  } catch (error) {
    console.error("Unified Login API Error:", error);
    return NextResponse.json(
      { error: "Gagal memproses verifikasi login." },
      { status: 500 }
    );
  }
}
