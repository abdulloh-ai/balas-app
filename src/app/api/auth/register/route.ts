import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, createBusinessSession } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { businessName, name, email, password } = await request.json();

    if (!businessName || !name || !email || !password) {
      return NextResponse.json({ error: "Semua kolom pendaftaran wajib diisi." }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password minimal 6 karakter." }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Cek apakah email sudah terdaftar
    const existingOwner = await prisma.businessOwner.findUnique({
      where: { email: cleanEmail },
    });

    if (existingOwner) {
      return NextResponse.json({ error: "Email ini sudah terdaftar. Silakan login." }, { status: 400 });
    }

    // Ambil Platform Owner utama (Super Admin) dari DB untuk menghubungkan Tenant baru
    const admin = await prisma.platformOwner.findFirst();

    if (!admin) {
      return NextResponse.json(
        { error: "Sistem belum dikonfigurasi. Platform Owner belum terdaftar." },
        { status: 500 }
      );
    }

    const passwordHash = await hashPassword(password);

    // Transaksi DB: Buat Tenant + BusinessOwner + Produk Contoh Bawaan
    const result = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          platformOwnerId: admin.id,
          name: businessName.trim(),
          description: `Toko online ${businessName.trim()}`,
          operatingHours: "Setiap hari 08.00 - 21.00 WIB",
          policies: "Pengiriman cepat & terpercaya",
          subscriptionStatus: "ACTIVE",
          subscriptionPlan: "STARTER",
          paymentStatus: "SUDAH_BAYAR",
        },
      });

      const owner = await tx.businessOwner.create({
        data: {
          tenantId: tenant.id,
          email: cleanEmail,
          passwordHash,
          name: name.trim(),
          role: "OWNER",
        },
      });

      // Tambahkan 2 Produk Contoh Bawaan agar toko langsung bisa diuji
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

    // Buat Sesi JWT Login Otomatis
    await createBusinessSession({
      id: result.owner.id,
      tenantId: result.tenant.id,
      email: result.owner.email,
      name: result.owner.name,
      role: result.owner.role,
    });

    return NextResponse.json({
      message: `Pendaftaran Toko ${result.tenant.name} Berhasil!`,
      redirectTo: "/dashboard",
      tenantName: result.tenant.name,
    });
  } catch (error) {
    console.error("Registration API Error:", error);
    return NextResponse.json({ error: "Gagal memproses pendaftaran akun." }, { status: 500 });
  }
}
