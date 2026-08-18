import { PrismaClient, OrderStatus, SenderRole, EscalationReason, EscalationStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Memulai seeding data awal ke database Balas...");

  const adminHash = await bcrypt.hash("admin123", 10);
  const raniHash = await bcrypt.hash("rani123", 10);

  // 1. Buat 1 PlatformOwner (Super Admin) jika belum ada
  const platformOwner = await prisma.platformOwner.upsert({
    where: { email: "admin@balas.id" },
    update: { passwordHash: adminHash },
    create: {
      email: "admin@balas.id",
      passwordHash: adminHash,
      name: "Super Admin Balas",
    },
  });
  console.log(`✅ PlatformOwner dibuat: ${platformOwner.name} (${platformOwner.email}) | Password: admin123`);

  // 2. Buat 1 Tenant (UMKM Toko Rani)
  const existingTenant = await prisma.tenant.findFirst({
    where: { name: "Toko Rani Culinary" },
  });

  const tenant =
    existingTenant ||
    (await prisma.tenant.create({
      data: {
        platformOwnerId: platformOwner.id,
        name: "Toko Rani Culinary",
        description: "Penyedia Makanan PO Rumahan & Frozen Food Berkualitas",
        operatingHours: "Senin - Sabtu (08.00 - 20.00 WIB)",
        policies: "Pengiriman via GoSend/GrabExpress. Transfer BCA sebelum jam 14.00 WIB dikirim hari yang sama.",
        subscriptionStatus: "ACTIVE",
        subscriptionPlan: "PRO",
      },
    }));
  console.log(`✅ Tenant dibuat/ditemukan: ${tenant.name}`);

  // 3. Buat 1 BusinessOwner (Pemilik UMKM)
  const businessOwner = await prisma.businessOwner.upsert({
    where: { email: "rani@tokorani.id" },
    update: { passwordHash: raniHash },
    create: {
      tenantId: tenant.id,
      email: "rani@tokorani.id",
      passwordHash: raniHash,
      name: "Mbak Rani",
      role: "OWNER",
    },
  });
  console.log(`✅ BusinessOwner dibuat: ${businessOwner.name} (${businessOwner.email}) | Password: rani123`);

  // 4. Buat 3 Produk Dummy jika belum ada produk
  const productCount = await prisma.product.count({ where: { tenantId: tenant.id } });
  if (productCount === 0) {
    const p1 = await prisma.product.create({
      data: {
        tenantId: tenant.id,
        name: "Frozen Beef Teriyaki (500g)",
        price: 45000,
        stock: 15,
        description: "Daging sapi teriyaki siap saji kemasan frozen vacuum 500gr.",
      },
    });

    const p2 = await prisma.product.create({
      data: {
        tenantId: tenant.id,
        name: "Kebab Daging PO (Isi 5)",
        price: 35000,
        stock: 20,
        description: "Kebab daging sapi bumbu spesial isi 5 pcs per pack.",
      },
    });

    const p3 = await prisma.product.create({
      data: {
        tenantId: tenant.id,
        name: "Sambal Cumi Jar 150g",
        price: 28000,
        stock: 8,
        description: "Sambal cumi pedas gurih kemasan botol kaca 150gram.",
      },
    });
    console.log(`✅ 3 Produk Dummy dibuat: ${p1.name}, ${p2.name}, ${p3.name}`);
  }

  console.log("\n🎉 Seeding data awal Balas sukses 100%!");
}

main()
  .catch((e) => {
    console.error("❌ Error saat seeding data:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
