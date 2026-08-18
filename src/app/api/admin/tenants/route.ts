import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPlatformOwnerSession } from "@/lib/auth";
import bcrypt from "bcryptjs";

const PLAN_PRICES: Record<string, number> = {
  STARTER: 149000,
  PRO: 299000,
  ENTERPRISE: 699000,
};

export async function GET() {
  const session = await getPlatformOwnerSession();
  if (!session) {
    return NextResponse.json({ error: "Akses ditolak. Silakan login terlebih dahulu." }, { status: 401 });
  }

  try {
    const tenants = await prisma.tenant.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        businessOwners: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    const activeTenants = tenants.filter((t) => t.subscriptionStatus === "ACTIVE");
    const paidTenants = tenants.filter((t) => t.subscriptionStatus === "ACTIVE" && t.paymentStatus === "SUDAH_BAYAR");

    // Hitung Total MRR Platform dari Tenant Aktif yang Sudah Bayar
    const mrr = paidTenants.reduce((total, tenant) => {
      const price = PLAN_PRICES[tenant.subscriptionPlan] || 0;
      return total + price;
    }, 0);

    return NextResponse.json({
      tenants,
      stats: {
        totalTenants: tenants.length,
        activeTenantsCount: activeTenants.length,
        paidTenantsCount: paidTenants.length,
        unpaidTenantsCount: activeTenants.length - paidTenants.length,
        mrr,
      },
    });
  } catch (error) {
    console.error("GET Tenants Error:", error);
    return NextResponse.json({ error: "Gagal mengambil data tenant." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getPlatformOwnerSession();
  if (!session) {
    return NextResponse.json({ error: "Akses ditolak." }, { status: 401 });
  }

  try {
    const {
      name,
      description,
      operatingHours,
      policies,
      subscriptionPlan = "STARTER",
      ownerName,
      ownerEmail,
      ownerPassword,
    } = await request.json();

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Nama bisnis wajib diisi." }, { status: 400 });
    }

    if (!ownerEmail || !ownerPassword || !ownerName) {
      return NextResponse.json(
        { error: "Nama, email, dan password pemilik UMKM wajib diisi." },
        { status: 400 }
      );
    }

    const existingOwner = await prisma.businessOwner.findUnique({
      where: { email: ownerEmail.trim() },
    });

    if (existingOwner) {
      return NextResponse.json(
        { error: `Email "${ownerEmail}" sudah terdaftar sebagai pemilik UMKM lain.` },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(ownerPassword, 10);

    const result = await prisma.$transaction(async (tx) => {
      const newTenant = await tx.tenant.create({
        data: {
          platformOwnerId: session.id,
          name: name.trim(),
          description: description?.trim() || null,
          operatingHours: operatingHours?.trim() || null,
          policies: policies?.trim() || null,
          subscriptionPlan,
          subscriptionStatus: "ACTIVE",
          paymentStatus: "SUDAH_BAYAR",
          lastPaidAt: new Date(),
        },
      });

      const newOwner = await tx.businessOwner.create({
        data: {
          tenantId: newTenant.id,
          email: ownerEmail.trim(),
          passwordHash,
          name: ownerName.trim(),
          role: "OWNER",
        },
      });

      return { tenant: newTenant, owner: newOwner };
    });

    return NextResponse.json(
      {
        message: `Tenant "${result.tenant.name}" & Akun Pemilik (${result.owner.email}) berhasil dibuat!`,
        tenant: result.tenant,
        createdOwner: {
          name: result.owner.name,
          email: result.owner.email,
          rawPassword: ownerPassword,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST Tenant Error:", error);
    return NextResponse.json({ error: "Gagal membuat tenant baru." }, { status: 500 });
  }
}
