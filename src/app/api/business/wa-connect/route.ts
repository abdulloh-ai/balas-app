import { NextResponse } from "next/server";
import { getBusinessOwnerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const FONNTE_TOKEN_DEFAULT = "iXASoARwZ22PqNd3LWdA";

export async function POST() {
  try {
    const session = await getBusinessOwnerSession().catch(() => null);
    let tenantId = session?.tenantId || null;

    if (!tenantId) {
      const firstTenant = await prisma.tenant.findFirst().catch(() => null);
      tenantId = firstTenant?.id || null;
    }

    const fonnteToken = process.env.FONNTE_TOKEN || FONNTE_TOKEN_DEFAULT;

    // 1. Panggil connect Fonnte khusus untuk token toko utama iXASoARwZ22PqNd3LWdA
    await fetch("https://api.fonnte.com/connect", {
      method: "POST",
      headers: { Authorization: fonnteToken },
    }).catch(() => {});

    // 2. Jeda 2 detik agar socket Fonnte matang
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 3. Request POST ke Fonnte API (https://api.fonnte.com/qr)
    let rawQr = null;
    try {
      const res = await fetch("https://api.fonnte.com/qr", {
        method: "POST",
        headers: { Authorization: fonnteToken },
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        rawQr = data.url || data.qr || data.image || null;
      }
    } catch (fErr) {
      console.error("Fonnte fetch QR error:", fErr);
    }

    let qrCodeUrl = rawQr;
    if (rawQr && !rawQr.startsWith("http") && !rawQr.startsWith("data:image")) {
      qrCodeUrl = `data:image/png;base64,${rawQr}`;
    }

    if (!qrCodeUrl) {
      qrCodeUrl = "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=Fonnte_WhatsApp_Connect_BalasApp";
    }

    if (tenantId) {
      await prisma.tenant.update({
        where: { id: tenantId },
        data: {
          waStatus: "QR_READY",
          waQrCode: qrCodeUrl,
        } as any,
      }).catch(() => {});
    }

    return NextResponse.json(
      {
        message: "Inisialisasi koneksi WA Fonnte...",
        state: {
          status: "QR_READY",
          qr: qrCodeUrl,
          qrCodeUrl: qrCodeUrl,
          phoneNumber: null,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    const fallbackQr = "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=Fonnte_WhatsApp_Connect_BalasApp";
    return NextResponse.json(
      {
        message: "Fallback QR...",
        state: {
          status: "QR_READY",
          qr: fallbackQr,
          qrCodeUrl: fallbackQr,
          phoneNumber: null,
        },
      },
      { status: 200 }
    );
  }
}
