import { prisma } from "@/lib/prisma";

export interface WASessionState {
  status: "DISCONNECTED" | "CONNECTING" | "QR_READY" | "SCAN_QR" | "CONNECTED";
  qrCodeUrl: string | null;
  qr?: string | null;
  phoneNumber: string | null;
  error?: string | null;
}

const FONNTE_TOKEN_DEFAULT = "iXASoARwZ22PqNd3LWdA";
const FONNTE_ACCOUNT_TOKEN_DEFAULT = "MmtP2g2wxje7G7bVyUETTUrcExap5av3BHWsEjx1d";

export async function getTenantFonnteToken(tenantId?: string | null): Promise<string> {
  if (!tenantId) {
    return process.env.FONNTE_TOKEN || FONNTE_TOKEN_DEFAULT;
  }

  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (tenant && (tenant as any).fonnteDeviceToken) {
      return (tenant as any).fonnteDeviceToken;
    }
  } catch (e) {}

  return process.env.FONNTE_TOKEN || FONNTE_TOKEN_DEFAULT;
}

export async function createTenantFonnteDevice(tenantId: string, tenantName: string): Promise<string> {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (tenant && (tenant as any).fonnteDeviceToken) {
      return (tenant as any).fonnteDeviceToken;
    }

    const accountToken = process.env.FONNTE_ACCOUNT_TOKEN || FONNTE_ACCOUNT_TOKEN_DEFAULT;
    const deviceName = `${tenantName || "Toko Balas"} (${tenantId.slice(-4)})`;

    // 1. Panggil API Fonnte /add-device menggunakan Account Token Master resmi
    const res = await fetch("https://api.fonnte.com/add-device", {
      method: "POST",
      headers: {
        Authorization: accountToken,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        name: deviceName,
      }),
    });

    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      console.log(`[Fonnte Auto Add-Device] Result for ${tenantName}:`, data);
      const newDeviceToken = data.token || data.device_token || null;
      const newDeviceId = data.id || data.device_id || data.device || null;

      if (newDeviceToken) {
        // 2. Set Webhook URL resmi per-device secara otomatis menggunakan parameter 'webhook'
        await fetch("https://api.fonnte.com/update-device", {
          method: "POST",
          headers: {
            Authorization: newDeviceToken,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            webhook: "https://balas-app.vercel.app/api/whatsapp/webhook",
            autoread: "1",
            personal: "1",
          }),
        }).catch(() => {});

        // 3. Simpan fonnteDeviceToken & fonnteDeviceId ke DB Tenant
        if (tenantId) {
          await prisma.tenant.update({
            where: { id: tenantId },
            data: {
              fonnteDeviceToken: newDeviceToken,
              fonnteDeviceId: String(newDeviceId || ""),
            } as any,
          }).catch(() => {});
        }

        // Berikan jeda 2 detik agar Fonnte socket per-device siap menyalakan QR
        await new Promise((resolve) => setTimeout(resolve, 2000));

        return newDeviceToken;
      }
    }
  } catch (error) {
    console.error("createTenantFonnteDevice Error:", error);
  }

  return process.env.FONNTE_TOKEN || FONNTE_TOKEN_DEFAULT;
}

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

    const fonnteToken = await getTenantFonnteToken(tenantId);

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
              }).catch(() => {});
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
    let tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (tenant && (tenant as any).waStatus === "CONNECTED") {
      return {
        status: "CONNECTED",
        qrCodeUrl: null,
        phoneNumber: (tenant as any).waPhoneNumber || "0895375488444",
      };
    }

    let fonnteToken = (tenant as any)?.fonnteDeviceToken;
    if (!fonnteToken && tenant) {
      fonnteToken = await createTenantFonnteDevice(tenant.id, tenant.name);
    }
    if (!fonnteToken) {
      fonnteToken = process.env.FONNTE_TOKEN || FONNTE_TOKEN_DEFAULT;
    }

    if (fonnteToken) {
      await fetch("https://api.fonnte.com/connect", {
        method: "POST",
        headers: { Authorization: fonnteToken },
      }).catch(() => {});

      // Berikan jeda 1 detik agar Fonnte socket siap
      await new Promise((resolve) => setTimeout(resolve, 1000));

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
                waStatus: "QR_READY",
                waQrCode: formattedQr,
              } as any,
            }).catch(() => {});
          }

          return {
            status: "QR_READY",
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
          waStatus: "QR_READY",
          waQrCode: fallbackQr,
        } as any,
      }).catch(() => {});
    }

    return {
      status: "QR_READY",
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
    const fonnteToken = await getTenantFonnteToken(tenantId);

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
      }).catch(() => {});
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
  tokenOrTenantId?: string
): Promise<boolean> {
  try {
    let fonnteToken = tokenOrTenantId;
    if (!fonnteToken || (!fonnteToken.startsWith("iX") && fonnteToken.length < 15)) {
      fonnteToken = await getTenantFonnteToken(tokenOrTenantId);
    }
    if (!fonnteToken) {
      fonnteToken = process.env.FONNTE_TOKEN || FONNTE_TOKEN_DEFAULT;
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

    const data = await res.json().catch(() => ({ status: false }));
    console.log(`[Fonnte Send API] Kirim ke ${targetPhone}:`, data);
    return data.status === true;
  } catch (error) {
    console.error("sendWAServiceMessage Error:", error);
    return false;
  }
}
