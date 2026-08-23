import { NextResponse } from "next/server";
import { getBusinessOwnerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const FONNTE_TOKEN_DEFAULT = "iXASoARwZ22PqNd3LWdA";

export async function POST() {
  try {
    const session = await getBusinessOwnerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = process.env.FONNTE_TOKEN || FONNTE_TOKEN_DEFAULT;

    // 1. Panggil connect Fonnte
    await fetch("https://api.fonnte.com/connect", {
      method: "POST",
      headers: { Authorization: token },
    }).catch(() => {});

    // 2. Request POST ke Fonnte API (https://api.fonnte.com/qr)
    const res = await fetch("https://api.fonnte.com/qr", {
      method: "POST",
      headers: { Authorization: token },
    });

    let rawQr = null;
    if (res.ok) {
      const data = await res.json();
      rawQr = data.url || data.qr || data.image || null;
    }

    let qrCodeUrl = rawQr;
    if (rawQr && !rawQr.startsWith("http") && !rawQr.startsWith("data:image")) {
      qrCodeUrl = `data:image/png;base64,${rawQr}`;
    }

    if (!qrCodeUrl) {
      qrCodeUrl = "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=Fonnte_WhatsApp_Connect_BalasApp";
    }

    if (session.tenantId) {
      await prisma.tenant.update({
        where: { id: session.tenantId },
        data: {
          waStatus: "SCAN_QR",
          waQrCode: qrCodeUrl,
        } as any,
      });
    }

    return NextResponse.json({
      message: "Inisialisasi koneksi WA Fonnte...",
      state: {
        status: "SCAN_QR",
        qr: qrCodeUrl,
        qrCodeUrl: qrCodeUrl,
        phoneNumber: null,
      },
    });
  } catch (error: any) {
    console.error("WA Connect API Error:", error);
    return NextResponse.json({ error: error.message || "Gagal memulai koneksi WA." }, { status: 500 });
  }
}
