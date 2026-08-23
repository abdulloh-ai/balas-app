import { NextResponse } from "next/server";
import { getBusinessOwnerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const FONNTE_TOKEN_DEFAULT = "iXASoARwZ22PqNd3LWdA";

export async function GET() {
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

    let currentStatus = "DISCONNECTED";
    let currentQr: string | null = fallbackQr;
    let phone: string | null = null;

    if (tenantId) {
      try {
        const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } }).catch(() => null);
        if (tenant) {
          const dbStatus = (tenant as any).waStatus;
          const dbQr = (tenant as any).waQrCode;
          phone = (tenant as any).waPhoneNumber || null;

          if (dbStatus === "CONNECTED") {
            return NextResponse.json(
              {
                state: {
                  status: "CONNECTED",
                  qrCodeUrl: null,
                  phoneNumber: phone || "0895375488444",
                },
              },
              { status: 200 }
            );
          }

          // Kunci status QR_READY agar tidak pernah tertindih oleh status DISCONNECTED poling Fonnte
          if (dbStatus === "QR_READY" || dbStatus === "SCAN_QR") {
            return NextResponse.json(
              {
                state: {
                  status: "QR_READY",
                  qrCodeUrl: dbQr || fallbackQr,
                  qr: dbQr || fallbackQr,
                  phoneNumber: phone,
                },
              },
              { status: 200 }
            );
          }

          currentStatus = dbStatus || "DISCONNECTED";
          currentQr = dbQr || fallbackQr;
        }
      } catch (dbErr) {
        console.error("DB status query error:", dbErr);
      }
    }

    const token = process.env.FONNTE_TOKEN || FONNTE_TOKEN_DEFAULT;

    try {
      const res = await fetch("https://api.fonnte.com/device", {
        method: "POST",
        headers: { Authorization: token },
      }).catch(() => null);

      if (res && res.ok) {
        const data = await res.json().catch(() => ({}));
        const isConnected =
          data.status &&
          (data.device_status === "connect" ||
            data.device_status === "connected" ||
            data.device_status === "CONNECT");

        if (isConnected) {
          phone = data.device || phone || "0895375488444";
          if (tenantId) {
            await prisma.tenant.update({
              where: { id: tenantId },
              data: { waStatus: "CONNECTED", waPhoneNumber: phone } as any,
            }).catch(() => {});
          }

          return NextResponse.json(
            {
              state: {
                status: "CONNECTED",
                qrCodeUrl: null,
                phoneNumber: phone,
              },
            },
            { status: 200 }
          );
        }
      }
    } catch (fErr) {
      console.error("Fonnte status check error:", fErr);
    }

    return NextResponse.json(
      {
        state: {
          status: currentStatus,
          qrCodeUrl: currentQr,
          qr: currentQr,
          phoneNumber: phone,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        state: {
          status: "DISCONNECTED",
          qrCodeUrl: fallbackQr,
          qr: fallbackQr,
          phoneNumber: null,
        },
      },
      { status: 200 }
    );
  }
}
