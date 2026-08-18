import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBusinessOwnerSession } from "@/lib/auth";

export async function GET() {
  const session = await getBusinessOwnerSession();
  if (!session) {
    return NextResponse.json({ error: "Akses ditolak. Silakan login." }, { status: 401 });
  }

  try {
    const escalations = await prisma.escalation.findMany({
      where: { tenantId: session.tenantId },
      orderBy: { createdAt: "desc" },
      include: {
        conversation: true,
      },
    });

    return NextResponse.json({ escalations });
  } catch (error) {
    console.error("GET Escalations Error:", error);
    return NextResponse.json({ error: "Gagal mengambil daftar eskalasi." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await getBusinessOwnerSession();
  if (!session) {
    return NextResponse.json({ error: "Akses ditolak. Silakan login." }, { status: 401 });
  }

  try {
    const { escalationId } = await request.json();

    if (!escalationId) {
      return NextResponse.json({ error: "ID Eskalasi wajib diisi." }, { status: 400 });
    }

    const updated = await prisma.escalation.updateMany({
      where: {
        id: escalationId,
        tenantId: session.tenantId,
      },
      data: {
        status: "SELESAI",
      },
    });

    if (updated.count === 0) {
      return NextResponse.json({ error: "Eskalasi tidak ditemukan." }, { status: 404 });
    }

    return NextResponse.json({
      message: "Catatan eskalasi berhasil ditandai SELESAI!",
    });
  } catch (error) {
    console.error("PATCH Escalation Error:", error);
    return NextResponse.json({ error: "Gagal memperbarui status eskalasi." }, { status: 500 });
  }
}
