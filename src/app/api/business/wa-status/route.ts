import { NextResponse } from "next/server";
import { getBusinessOwnerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const FONNTE_TOKEN_DEFAULT = "iXASoARwZ22PqNd3LWdA";

export async function GET() {
  try {
    const session = await getBusinessOwnerSession();
    let tenantId = session?.tenantId;

    if (!tenantId) {
      const firstTenant = await prisma.tenant.findFirst();
      tenantId = firstTenant?.id;
    }

    if (!tenantId) {
      return NextResponse.json({
        state: {
          status: "DISCONNECTED",
          qrCodeUrl: null,
          phoneNumber: null,
        },
      });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (tenant && (tenant as any).waStatus === "CONNECTED") {
      return NextResponse.json({
        state: {
          status: "CONNECTED",
          qrCodeUrl: null,
          phoneNumber: (tenant as any).waPhoneNumber || "0895375488444",
        },
      });
    }

    const token = process.env.FONNTE_TOKEN || FONNTE_TOKEN_DEFAULT;

    // Request POST ke Fonnte API (https://api.fonnte.com/device)
    const res = await fetch("https://api.fonnte.com/device", {
      method: "POST",
      headers: { Authorization: token },
    });

    if (res.ok) {
      const data = await res.json();
      const isConnected =
        data.status &&
        (data.device_status === "connect" ||
          data.device_status === "connected" ||
          data.device_status === "CONNECT");

      if (isConnected) {
        const phone = data.device || (tenant ? (tenant as any).waPhoneNumber : null) || "0895375488444";

        await prisma.tenant.update({
          where: { id: tenantId },
          data: { waStatus: "CONNECTED", waPhoneNumber: phone } as any,
        });

        return NextResponse.json({
          state: {
            status: "CONNECTED",
            qrCodeUrl: null,
            phoneNumber: phone,
          },
        });
      }
    }

    const currentStatus = (tenant as any)?.waStatus || "DISCONNECTED";
    const currentQr = (tenant as any)?.waQrCode || null;

    return NextResponse.json({
      state: {
        status: currentStatus,
        qrCodeUrl: currentQr,
        qr: currentQr,
        phoneNumber: (tenant as any)?.waPhoneNumber || null,
      },
    });
  } catch (error: any) {
    console.error("WA Status API Error:", error);
    return NextResponse.json({ error: error.message || "Gagal mengambil status WA." }, { status: 500 });
  }
}
