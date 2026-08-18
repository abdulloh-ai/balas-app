import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPlatformOwnerSession } from "@/lib/auth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getPlatformOwnerSession();
  if (!session) {
    return NextResponse.json({ error: "Akses ditolak. Silakan login." }, { status: 401 });
  }

  try {
    const { id } = await params;
    const tenant = await prisma.tenant.findUnique({
      where: { id },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant tidak ditemukan." }, { status: 404 });
    }

    const newStatus = tenant.subscriptionStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";

    const updatedTenant = await prisma.tenant.update({
      where: { id },
      data: { subscriptionStatus: newStatus },
    });

    return NextResponse.json({
      message: `Status Tenant berhasil diubah menjadi ${newStatus}!`,
      tenant: updatedTenant,
    });
  } catch (error) {
    console.error("Toggle Tenant Error:", error);
    return NextResponse.json({ error: "Gagal mengubah status Tenant." }, { status: 500 });
  }
}
