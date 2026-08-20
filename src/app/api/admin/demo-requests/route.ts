import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPlatformOwnerSession } from "@/lib/auth";

export async function GET() {
  const session = await getPlatformOwnerSession();
  if (!session) {
    return NextResponse.json({ error: "Akses ditolak. Silakan login Super Admin." }, { status: 401 });
  }

  try {
    const demoRequests = await prisma.demoRequest.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ demoRequests });
  } catch (error) {
    console.error("GET DemoRequests Error:", error);
    return NextResponse.json({ error: "Gagal mengambil daftar permintaan demo." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await getPlatformOwnerSession();
  if (!session) {
    return NextResponse.json({ error: "Akses ditolak. Silakan login Super Admin." }, { status: 401 });
  }

  try {
    const { id, status } = await request.json();

    if (!id || !status) {
      return NextResponse.json({ error: "ID dan Status wajib diisi." }, { status: 400 });
    }

    const updated = await prisma.demoRequest.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json({
      message: `Status permintaan demo berhasil diubah menjadi ${status}!`,
      demoRequest: updated,
    });
  } catch (error) {
    console.error("PATCH DemoRequest Error:", error);
    return NextResponse.json({ error: "Gagal memperbarui status permintaan demo." }, { status: 500 });
  }
}
