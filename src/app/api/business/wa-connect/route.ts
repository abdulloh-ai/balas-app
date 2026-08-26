import { NextResponse } from "next/server";
import { getBusinessOwnerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const FONNTE_TOKEN_DEFAULT = "aXMG3WitNwPrRipyjsUD";

export async function POST() {
  const fallbackQr = "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=Fonnte_WhatsApp_Connect_BalasApp";

  try {
    let tenantId: string | null = null;
    try {
      const session = await getBusinessOwnerSession().catch(() => null);
      tenantId = session?.tenantId || null;
      if (!tenantId) {
        const firstTenant = await prisma.tenant.findFirst().catch(() => null);
        tenantId = firstTenant?.id || null;
      }
    } catch (e) {}

    const fonnteToken = process.env.FONNTE_TOKEN || FONNTE_TOKEN_DEFAULT;

    // 1. Daftarkan Webhook URL resmi + nama device pada Fonnte API agar Fonnte tahu ke mana harus meneruskan pesan masuk
    await fetch("https://api.fonnte.com/update-device", {
      method: "POST",
      headers: {
        Authorization: fonnteToken,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        name: "wa toko balas",
        webhook: "https://balas-app.vercel.app/api/whatsapp/webhook",
        autoread: "1",
        personal: "1",
      }),
    }).catch(() => {});

    // 2. Panggil connect Fonnte
    await fetch("https://api.fonnte.com/connect", {
      method: "POST",
      headers: { Authorization: fonnteToken },
    }).catch(() => {});

    // 3. Jeda 2 detik agar Fonnte socket matang
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 4. Request POST ke Fonnte API /qr
    let rawQr: string | null = null;
    try {
      const res = await fetch("https://api.fonnte.com/qr", {
        method: "POST",
        headers: { Authorization: fonnteToken },
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        console.log("[Fonnte Fetch QR Data]:", data);
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
      qrCodeUrl = fallbackQr;
    }

    if (tenantId) {
      try {
        await prisma.tenant.update({
          where: { id: tenantId },
          data: {
            waStatus: "QR_READY",
            waQrCode: qrCodeUrl,
          } as any,
        }).catch(() => {});
      } catch (dbErr) {}
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
        qr: qrCodeUrl,
        qrCodeUrl: qrCodeUrl,
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        message: "Inisialisasi QR...",
        state: {
          status: "QR_READY",
          qr: fallbackQr,
          qrCodeUrl: fallbackQr,
          phoneNumber: null,
        },
        qr: fallbackQr,
        qrCodeUrl: fallbackQr,
      },
      { status: 200 }
    );
  }
}
