import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { businessName, name, email, password, confirmPassword, whatsapp, planName } = await request.json();

    if (!businessName || !name || !email || !password || !whatsapp) {
      return NextResponse.json({ error: "Semua kolom pendaftaran wajib diisi." }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password minimal 8 karakter." }, { status: 400 });
    }

    if (confirmPassword && password !== confirmPassword) {
      return NextResponse.json({ error: "Konfirmasi password tidak cocok." }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Cek apakah email sudah terdaftar sebagai BusinessOwner atau PlatformOwner
    const existingOwner = await prisma.businessOwner.findUnique({
      where: { email: cleanEmail },
    });

    const existingAdmin = await prisma.platformOwner.findUnique({
      where: { email: cleanEmail },
    });

    if (existingOwner || existingAdmin) {
      return NextResponse.json(
        { error: "Email ini sudah terdaftar. Silakan login di /login." },
        { status: 400 }
      );
    }

    // Ambil Platform Owner utama (Super Admin)
    const admin = await prisma.platformOwner.findFirst();

    if (!admin) {
      return NextResponse.json(
        { error: "Sistem belum dikonfigurasi. Platform Owner belum terdaftar." },
        { status: 500 }
      );
    }

    const passwordHash = await hashPassword(password);
    const selectedPlan = planName || "STARTER";

    // Transaksi DB: Buat Tenant & BusinessOwner dengan Status MENUNGGU_VERIFIKASI
    const result = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          platformOwnerId: admin.id,
          name: businessName.trim(),
          description: `Toko online ${businessName.trim()}`,
          operatingHours: "Setiap hari 08.00 - 21.00 WIB",
          policies: "Pengiriman cepat & terpercaya",
          subscriptionStatus: "MENUNGGU_VERIFIKASI",
          subscriptionPlan: selectedPlan,
          paymentStatus: "MENUNGGU_VERIFIKASI",
        },
      });

      const owner = await tx.businessOwner.create({
        data: {
          tenantId: tenant.id,
          email: cleanEmail,
          passwordHash,
          name: name.trim(),
          phone: whatsapp.trim(),
          role: "OWNER",
        },
      });

      // Tambahkan 2 Produk Contoh Bawaan
      await tx.product.createMany({
        data: [
          {
            tenantId: tenant.id,
            name: "Produk Contoh 1",
            price: 50000,
            stock: 10,
            description: "Deskripsi singkat produk pertama Anda",
          },
          {
            tenantId: tenant.id,
            name: "Produk Contoh 2",
            price: 75000,
            stock: 5,
            description: "Deskripsi singkat produk kedua Anda",
          },
        ],
      });

      return { tenant, owner };
    });

    return NextResponse.json({
      message: "Pendaftaran berhasil! Silakan lakukan pembayaran untuk verifikasi.",
      registration: {
        tenantId: result.tenant.id,
        businessName: result.tenant.name,
        ownerName: result.owner.name,
        email: result.owner.email,
        whatsapp: result.owner.phone,
        plan: selectedPlan,
        status: "MENUNGGU_VERIFIKASI",
      },
    });
  } catch (error) {
    console.error("Registration API Error:", error);
    return NextResponse.json({ error: "Gagal memproses pendaftaran akun." }, { status: 500 });
  }
}
