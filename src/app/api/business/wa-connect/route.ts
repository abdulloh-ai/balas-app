import { NextResponse } from "next/server";
import { getBusinessOwnerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createTenantFonnteDevice } from "@/lib/whatsapp";

const FONNTE_TOKEN_DEFAULT = "iXASoARwZ22PqNd3LWdA";

export async function POST() {
  try {
    const session = await getBusinessOwnerSession().catch(() => null);
    let tenantId = session?.tenantId || null;

    if (!tenantId) {
      const firstTenant = await prisma.tenant.findFirst().catch(() => null);
      tenantId = firstTenant?.id || null;
    }

    let tenant = null;
    if (tenantId) {
      tenant = await prisma.tenant.findUnique({ where: { id: tenantId } }).catch(() => null);
    }

    if (!tenant) {
      return NextResponse.json({ error: "Tenant tidak ditemukan" }, { status: 404 });
    }

    let fonnteToken = (tenant as any)?.fonnteDeviceToken;
    if (!fonnteToken) {
      fonnteToken = await createTenantFonnteDevice(tenant.id, tenant.name).catch(() => null);
    }
    if (!fonnteToken) {
      fonnteToken = process.env.FONNTE_TOKEN || FONNTE_TOKEN_DEFAULT;
    }

    // 1. Panggil connect Fonnte khusus untuk token tenant ini
    await fetch("https://api.fonnte.com/connect", {
      method: "POST",
      headers: { Authorization: fonnteToken },
    }).catch(() => {});

    // 2. Poll Fonnte API /qr hingga 4 kali (jeda 2s) sampai Fonnte mengembalikan string QR WhatsApp asli
    let realQrString: string | null = null;

    for (let attempt = 1; attempt <= 4; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      try {
        const res = await fetch("https://api.fonnte.com/qr", {
          method: "POST",
          headers: { Authorization: fonnteToken },
        });

        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          console.log(`[Fonnte Fetch QR Attempt ${attempt}]:`, data);
          const foundQr = data.url || data.qr || data.image || null;
          if (foundQr && data.status !== false && !foundQr.includes("Fonnte_WhatsApp_Connect")) {
            realQrString = foundQr;
            break;
          }
        }
      } catch (fErr) {
        console.error(`Fonnte fetch QR attempt ${attempt} error:`, fErr);
      }
    }

    let qrCodeUrl = realQrString;

    if (realQrString) {
      if (!realQrString.startsWith("http") && !realQrString.startsWith("data:image")) {
        if (realQrString.includes("@") || realQrString.includes(",") || realQrString.length > 30) {
          qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(realQrString)}`;
        } else {
          qrCodeUrl = `data:image/png;base64,${realQrString}`;
        }
      }
    } else {
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
