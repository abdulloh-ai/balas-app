import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPlatformOwnerSession } from "@/lib/auth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getPlatformOwnerSession();
  if (!session) {
    return NextResponse.json({ error: "Akses ditolak. Khusus Super Admin." }, { status: 401 });
  }

  try {
    const { id } = await params;
    const { paymentStatus } = await request.json();

    if (!["SUDAH_BAYAR", "BELUM_BAYAR"].includes(paymentStatus)) {
      return NextResponse.json({ error: "Status pembayaran tidak valid." }, { status: 400 });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant tidak ditemukan." }, { status: 404 });
    }

    const updated = await prisma.tenant.update({
      where: { id },
      data: {
        paymentStatus,
        lastPaidAt: paymentStatus === "SUDAH_BAYAR" ? new Date() : tenant.lastPaidAt,
      },
    });

    return NextResponse.json({
      message: `Status pembayaran tenant "${updated.name}" berhasil diubah menjadi ${paymentStatus}`,
      tenant: updated,
    });
  } catch (error) {
    console.error("PATCH Tenant Payment Status Error:", error);
    return NextResponse.json({ error: "Gagal meng-update status pembayaran tenant." }, { status: 500 });
  }
}
