import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPlatformOwnerSession } from "@/lib/auth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getPlatformOwnerSession();
  if (!session) {
    return NextResponse.json({ error: "Akses ditolak. Silakan login Super Admin." }, { status: 401 });
  }

  const { id } = await params;

  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: { businessOwners: true },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant tidak ditemukan." }, { status: 404 });
    }

    const updated = await prisma.tenant.update({
      where: { id },
      data: {
        paymentStatus: "SUDAH_BAYAR",
        subscriptionStatus: "ACTIVE",
        lastPaidAt: new Date(),
      },
    });

    const owner = tenant.businessOwners[0];

    return NextResponse.json({
      message: `Verifikasi pembayaran berhasil! Akun toko ${updated.name} (Pemilik: ${owner ? owner.name : "UMKM"}) kini telah AKTIF.`,
      tenant: updated,
    });
  } catch (error) {
    console.error("PATCH Verify Tenant Error:", error);
    return NextResponse.json(
      { error: "Gagal memverifikasi pembayaran tenant." },
      { status: 500 }
    );
  }
}
