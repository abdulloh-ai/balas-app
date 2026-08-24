import { NextResponse } from "next/server";
import { getBusinessOwnerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const FONNTE_TOKEN_DEFAULT = "iXASoARwZ22PqNd3LWdA";

export async function GET() {
  const fallbackQr = "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=Fonnte_WhatsApp_Connect_BalasApp";

  try {
    const session = await getBusinessOwnerSession().catch(() => null);
    const tenantId = session?.tenantId || null;

    if (!tenantId) {
      // Jika belum terautentikasi / belum ada sesi login, kembalikan status DISCONNECTED murni tanpa nomor default
      return NextResponse.json({
        state: {
          status: "DISCONNECTED",
          qrCodeUrl: null,
          phoneNumber: null,
        },
      }, { status: 200 });
    }

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } }).catch(() => null);
    if (!tenant) {
      return NextResponse.json({
        state: {
          status: "DISCONNECTED",
          qrCodeUrl: null,
          phoneNumber: null,
        },
      }, { status: 200 });
    }

    const fonnteToken = (tenant as any).fonnteDeviceToken || (tenantId.includes("demo_1") ? FONNTE_TOKEN_DEFAULT : null);
    const dbStatus = (tenant as any).waStatus || "DISCONNECTED";
    const dbQr = (tenant as any).waQrCode || null;
    const phone = (tenant as any).waPhoneNumber || null;

    if (dbStatus === "CONNECTED") {
      return NextResponse.json(
        {
          state: {
            status: "CONNECTED",
            qrCodeUrl: null,
            phoneNumber: phone || (tenantId.includes("demo_1") ? "0895375488444" : null),
          },
        },
        { status: 200 }
      );
    }

    // Kunci status QR_READY per-tenant agar tidak tertindih oleh status DISCONNECTED poling Fonnte
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

    if (fonnteToken) {
      try {
        const res = await fetch("https://api.fonnte.com/device", {
          method: "POST",
          headers: { Authorization: fonnteToken },
        }).catch(() => null);

        if (res && res.ok) {
          const data = await res.json().catch(() => ({}));
          const isConnected =
            data.status &&
            (data.device_status === "connect" ||
              data.device_status === "connected" ||
              data.device_status === "CONNECT");

          if (isConnected) {
            const connectedPhone = data.device || phone || null;
            await prisma.tenant.update({
              where: { id: tenantId },
              data: { waStatus: "CONNECTED", waPhoneNumber: connectedPhone } as any,
            }).catch(() => {});

            return NextResponse.json(
              {
                state: {
                  status: "CONNECTED",
                  qrCodeUrl: null,
                  phoneNumber: connectedPhone,
                },
              },
              { status: 200 }
            );
          }
        }
      } catch (fErr) {
        console.error("Fonnte status check error:", fErr);
      }
    }

    return NextResponse.json(
      {
        state: {
          status: dbStatus,
          qrCodeUrl: dbQr,
          qr: dbQr,
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
