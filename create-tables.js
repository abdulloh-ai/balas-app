import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

async function main() {
  const p = new PrismaClient({
    datasources: {
      db: {
        url: "postgresql://postgres.cvlhbiwyrtxzohszsohn:Hanif%23260822@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres",
      },
    },
  });

  try {
    console.log("Memulai pembuatan tabel di Supabase...");

    await p.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "PlatformOwner" (
        "id" TEXT PRIMARY KEY,
        "email" TEXT UNIQUE NOT NULL,
        "passwordHash" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL
      );
    `);

    await p.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Tenant" (
        "id" TEXT PRIMARY KEY,
        "platformOwnerId" TEXT NOT NULL REFERENCES "PlatformOwner"("id") ON DELETE CASCADE,
        "name" TEXT NOT NULL,
        "description" TEXT,
        "operatingHours" TEXT,
        "policies" TEXT,
        "subscriptionStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
        "subscriptionPlan" TEXT NOT NULL DEFAULT 'STARTER',
        "paymentStatus" TEXT NOT NULL DEFAULT 'SUDAH_BAYAR',
        "lastPaidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL
      );
    `);

    await p.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "BusinessOwner" (
        "id" TEXT PRIMARY KEY,
        "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
        "email" TEXT UNIQUE NOT NULL,
        "passwordHash" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "role" TEXT NOT NULL DEFAULT 'OWNER',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL
      );
    `);

    await p.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Product" (
        "id" TEXT PRIMARY KEY,
        "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
        "name" TEXT NOT NULL,
        "price" DOUBLE PRECISION NOT NULL,
        "stock" INTEGER NOT NULL DEFAULT 0,
        "description" TEXT,
        "imageUrl" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL
      );
    `);

    await p.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Order" (
        "id" TEXT PRIMARY KEY,
        "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
        "customerName" TEXT,
        "customerPhone" TEXT,
        "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "status" TEXT NOT NULL DEFAULT 'MENUNGGU_PEMBAYARAN',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL
      );
    `);

    await p.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "OrderItem" (
        "id" TEXT PRIMARY KEY,
        "orderId" TEXT NOT NULL REFERENCES "Order"("id") ON DELETE CASCADE,
        "productId" TEXT REFERENCES "Product"("id") ON DELETE SET NULL,
        "productName" TEXT NOT NULL,
        "price" DOUBLE PRECISION NOT NULL,
        "quantity" INTEGER NOT NULL DEFAULT 1
      );
    `);

    await p.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Conversation" (
        "id" TEXT PRIMARY KEY,
        "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
        "customerPhone" TEXT NOT NULL,
        "sender" TEXT NOT NULL DEFAULT 'PELANGGAN',
        "message" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await p.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Escalation" (
        "id" TEXT PRIMARY KEY,
        "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
        "conversationId" TEXT REFERENCES "Conversation"("id") ON DELETE SET NULL,
        "reason" TEXT NOT NULL DEFAULT 'LAINNYA',
        "summary" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'BELUM_SELESAI',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL
      );
    `);

    await p.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "DemoRequest" (
        "id" TEXT PRIMARY KEY,
        "name" TEXT NOT NULL,
        "businessName" TEXT NOT NULL,
        "whatsapp" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'PENDING',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await p.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Plan" (
        "id" TEXT PRIMARY KEY,
        "name" TEXT NOT NULL,
        "price" DOUBLE PRECISION NOT NULL,
        "period" TEXT NOT NULL DEFAULT 'bulan',
        "description" TEXT NOT NULL,
        "features" TEXT NOT NULL,
        "isPopular" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL
      );
    `);

    console.log("✅ SELURUH TABEL SUPABASE BERHASIL DIBUAT!");

    // Seed Data Awal: PlatformOwner & Plans & Demo Tenant
    const adminCount = await p.platformOwner.count();
    if (adminCount === 0) {
      const pwdHash = await bcrypt.hash("hanif260822", 10);
      const admin = await p.platformOwner.create({
        data: {
          id: "admin_super_1",
          email: "hanifabdullohhanifabdulloh@gmail.com",
          name: "Hanif Abdulloh (Platform Owner)",
          passwordHash: pwdHash,
        },
      });

      const tenant = await p.tenant.create({
        data: {
          id: "tenant_demo_1",
          platformOwnerId: admin.id,
          name: "Toko Sembako Maju Jaya",
          description: "Menjual beras, minyak goreng, gula, tepung, telur, dan bahan pokok rumah tangga.",
          operatingHours: "Setiap Hari (Senin - Minggu) pukul 07.00 - 21.00 WIB",
          policies: "Bebas ongkir untuk pengiriman radius 3 km dengan minimal belanja Rp 50.000.",
          subscriptionPlan: "STARTER",
          subscriptionStatus: "ACTIVE",
          paymentStatus: "SUDAH_BAYAR",
        },
      });

      const ownerPwdHash = await bcrypt.hash("demo12345", 10);
      await p.businessOwner.create({
        data: {
          tenantId: tenant.id,
          email: "demo@maju-jaya.com",
          name: "Budi Santoso",
          passwordHash: ownerPwdHash,
          role: "OWNER",
        },
      });

      await p.product.createMany({
        data: [
          { tenantId: tenant.id, name: "Beras Premium 5kg", price: 72000, stock: 25, description: "Beras pulen kualita super" },
          { tenantId: tenant.id, name: "Miyak Goreng 2 Liter", price: 34000, stock: 40, description: "Minyak kelapa sawit jernih" },
          { tenantId: tenant.id, name: "Telur Ayam 1kg", price: 28000, stock: 15, description: "Telur ayam segar langsing dari peternak" },
        ],
      });

      console.log("✅ SEED DATA AKUN SUPER ADMIN & TENANT DEMO BERHASIL!");
    }

    const planCount = await p.plan.count();
    if (planCount === 0) {
      await p.plan.createMany({
        data: [
          {
            name: "Starter",
            price: 149000,
            description: "Cocok untuk warung & toko online mikro yang baru mulai.",
            features: "1 Nomor WhatsApp,Hingga 500 Chat/Bulan,Katalog & Stok Sederhana,Rekap Pesanan Otomatis,Dukungan Eskalasi Penanganan",
            isPopular: true,
          },
          {
            name: "Pro",
            price: 299000,
            description: "Untuk toko online aktif dengan volume chat harian tinggi.",
            features: "2 Nomor WhatsApp,Chat Tanpa Batas,Katalog & Stok Tanpa Batas,Rekap Keuangan & Laporan PDF,Prioritas Support 24/7",
            isPopular: false,
          },
        ],
      });
      console.log("✅ SEED DATA PAKET HARGA SAAS BERHASIL!");
    }
  } catch (err) {
    console.error("❌ ERROR SCRIPT:", err);
  } finally {
    await p.$disconnect();
  }
}

main();
