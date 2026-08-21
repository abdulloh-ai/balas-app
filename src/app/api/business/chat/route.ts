import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBusinessOwnerSession } from "@/lib/auth";
import { executeAIChatLogic } from "@/lib/ai-engine";

export async function GET() {
  const session = await getBusinessOwnerSession();
  if (!session) {
    return NextResponse.json({ error: "Akses ditolak. Silakan login." }, { status: 401 });
  }

  try {
    const conversations = await prisma.conversation.findMany({
      where: { tenantId: session.tenantId },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ conversations });
  } catch (error) {
    console.error("GET Chat Error:", error);
    return NextResponse.json({ error: "Gagal mengambil riwayat percakapan." }, { status: 500 });
  }
}

export async function DELETE() {
  const session = await getBusinessOwnerSession();
  if (!session) {
    return NextResponse.json({ error: "Akses ditolak. Silakan login." }, { status: 401 });
  }

  try {
    const deleted = await prisma.conversation.deleteMany({
      where: { tenantId: session.tenantId },
    });

    return NextResponse.json({
      message: `Seluruh riwayat chat (${deleted.count} pesan) berhasil dihapus total dari database.`,
      deletedCount: deleted.count,
    });
  } catch (error) {
    console.error("DELETE Chat Error:", error);
    return NextResponse.json({ error: "Gagal menghapus riwayat chat dari database." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message, customerPhone = "081234567890", tenantId: bodyTenantId } = body;

    let targetTenantId: string | null = null;
    const session = await getBusinessOwnerSession();

    if (session) {
      targetTenantId = session.tenantId;
    } else if (bodyTenantId) {
      targetTenantId = bodyTenantId;
    }

    if (!targetTenantId) {
      return NextResponse.json({ error: "Akses ditolak. Silakan login." }, { status: 401 });
    }

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json({ error: "Pesan chat tidak boleh kosong." }, { status: 400 });
    }

    const result = await executeAIChatLogic(targetTenantId, customerPhone, message);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("POST Chat Error:", error);
    return NextResponse.json({ error: error.message || "Gagal memproses pesan chat." }, { status: 500 });
  }
}
