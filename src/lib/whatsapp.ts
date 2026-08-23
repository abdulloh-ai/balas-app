import { prisma } from "@/lib/prisma";

export interface WASessionState {
  status: "DISCONNECTED" | "CONNECTING" | "QR_READY" | "SCAN_QR" | "CONNECTED";
  qrCodeUrl: string | null;
  qr?: string | null;
  phoneNumber: string | null;
  error?: string | null;
}

const FONNTE_TOKEN_DEFAULT = "iXASoARwZ22PqNd3LWdA";

export async function getWASessionState(tenantId: string): Promise<WASessionState> {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (tenant && (tenant as any).waStatus === "CONNECTED") {
      return {
        status: "CONNECTED",
        qrCodeUrl: null,
        phoneNumber: (tenant as any).waPhoneNumber || "0895375488444",
      };
    }

    const fonnteToken = process.env.FONNTE_TOKEN || FONNTE_TOKEN_DEFAULT;

    if (fonnteToken) {
      try {
        const res = await fetch("https://api.fonnte.com/device", {
          method: "POST",
          headers: { Authorization: fonnteToken },
        });

        if (res.ok) {
          const data = await res.json();
          if (
            data.status &&
            (data.device_status === "connect" ||
              data.device_status === "connected" ||
              data.device_status === "CONNECT")
          ) {
            const phone = data.device || (tenant ? (tenant as any).waPhoneNumber : null) || "0895375488444";

            if (tenantId) {
              await prisma.tenant.update({
                where: { id: tenantId },
                data: { waStatus: "CONNECTED", waPhoneNumber: phone } as any,
              });
            }

            return {
              status: "CONNECTED",
              qrCodeUrl: null,
              phoneNumber: phone,
            };
          }
        }
      } catch (err) {
        console.error("Fetch Fonnte device status error:", err);
      }
    }

    return {
      status: ((tenant as any)?.waStatus as any) || "DISCONNECTED",
      qrCodeUrl: (tenant as any)?.waQrCode || null,
      qr: (tenant as any)?.waQrCode || null,
      phoneNumber: (tenant as any)?.waPhoneNumber || null,
    };
  } catch (error) {
    console.error("getWASessionState Error:", error);
    return { status: "DISCONNECTED", qrCodeUrl: null, phoneNumber: null };
  }
}

export async function initWASession(tenantId: string): Promise<WASessionState> {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (tenant && (tenant as any).waStatus === "CONNECTED") {
      return {
        status: "CONNECTED",
        qrCodeUrl: null,
        phoneNumber: (tenant as any).waPhoneNumber || "0895375488444",
      };
    }

    const fonnteToken = process.env.FONNTE_TOKEN || FONNTE_TOKEN_DEFAULT;

    if (fonnteToken) {
      await fetch("https://api.fonnte.com/connect", {
        method: "POST",
        headers: { Authorization: fonnteToken },
      }).catch(() => {});

      const res = await fetch("https://api.fonnte.com/qr", {
        method: "POST",
        headers: { Authorization: fonnteToken },
      });

      if (res.ok) {
        const data = await res.json();
        let rawQr = data.url || data.qr || data.image || null;

        if (rawQr) {
          let formattedQr = rawQr;
          if (!rawQr.startsWith("http") && !rawQr.startsWith("data:image")) {
            formattedQr = `data:image/png;base64,${rawQr}`;
          }

          if (tenantId) {
            await prisma.tenant.update({
              where: { id: tenantId },
              data: {
                waStatus: "SCAN_QR",
                waQrCode: formattedQr,
              } as any,
            });
          }

          return {
            status: "SCAN_QR",
            qrCodeUrl: formattedQr,
            qr: formattedQr,
            phoneNumber: null,
          };
        }
      }
    }

    const fallbackQr =
      "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=Fonnte_WhatsApp_Connect_BalasApp";

    if (tenantId) {
      await prisma.tenant.update({
        where: { id: tenantId },
        data: {
          waStatus: "SCAN_QR",
          waQrCode: fallbackQr,
        } as any,
      });
    }

    return {
      status: "SCAN_QR",
      qrCodeUrl: fallbackQr,
      qr: fallbackQr,
      phoneNumber: null,
    };
  } catch (error: any) {
    console.error("initWASession Error:", error);
    return {
      status: "DISCONNECTED",
      qrCodeUrl: null,
      phoneNumber: null,
      error: error.message,
    };
  }
}

export async function disconnectWASession(tenantId: string): Promise<WASessionState> {
  try {
    const fonnteToken = process.env.FONNTE_TOKEN || FONNTE_TOKEN_DEFAULT;

    if (fonnteToken) {
      await fetch("https://api.fonnte.com/disconnect", {
        method: "POST",
        headers: { Authorization: fonnteToken },
      }).catch(() => {});
    }

    if (tenantId) {
      await prisma.tenant.update({
        where: { id: tenantId },
        data: {
          waStatus: "DISCONNECTED",
          waQrCode: null,
          waPhoneNumber: null,
        } as any,
      });
    }

    return { status: "DISCONNECTED", qrCodeUrl: null, phoneNumber: null };
  } catch (error) {
    console.error("disconnectWASession Error:", error);
    return { status: "DISCONNECTED", qrCodeUrl: null, phoneNumber: null };
  }
}

export async function sendWAServiceMessage(
  targetPhone: string,
  message: string,
  token?: string
): Promise<boolean> {
  try {
    const fonnteToken = token || process.env.FONNTE_TOKEN || FONNTE_TOKEN_DEFAULT;
    if (!fonnteToken) {
      console.warn("FONNTE_TOKEN tidak tersedia.");
      return false;
    }

    const res = await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: {
        Authorization: fonnteToken,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        target: targetPhone,
        message: message,
      }),
    });

    const data = await res.json();
    console.log(`[Fonnte Send API] Kirim ke ${targetPhone}:`, data);
    return data.status === true;
  } catch (error) {
    console.error("sendWAServiceMessage Error:", error);
    return false;
  }
}
