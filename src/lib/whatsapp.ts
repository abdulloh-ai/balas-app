import { prisma } from "@/lib/prisma";

export interface WASessionState {
  status: "DISCONNECTED" | "CONNECTING" | "QR_READY" | "CONNECTED";
  qrCodeUrl: string | null;
  phoneNumber: string | null;
  error?: string | null;
}

export async function getWASessionState(tenantId: string): Promise<WASessionState> {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      return { status: "DISCONNECTED", qrCodeUrl: null, phoneNumber: null };
    }

    // Ambil Token Fonnte dari Tenant atau dari Environment Variable Vercel
    const fonnteToken = process.env.FONNTE_TOKEN || "iXASoARwZ22PqNd3LWdA";

    if (fonnteToken) {
      // Cek status perangkat langsung ke Fonnte API
      try {
        const res = await fetch("https://api.fonnte.com/device", {
          method: "POST",
          headers: { Authorization: fonnteToken },
        });

        if (res.ok) {
          const data = await res.json();
          if (data.status && (data.device_status === "connect" || data.device_status === "connected")) {
            const phone = data.device || tenant.waPhoneNumber || null;
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

    // Jika DB menyimpan status CONNECTED, return persisten CONNECTED
    if (tenant.waStatus === "CONNECTED") {
      return {
        status: "CONNECTED",
        qrCodeUrl: null,
        phoneNumber: tenant.waPhoneNumber || null,
      };
    }

    return {
      status: (tenant.waStatus as any) || "DISCONNECTED",
      qrCodeUrl: tenant.waQrCode || null,
      phoneNumber: tenant.waPhoneNumber || null,
    };
  } catch (error) {
    console.error("getWASessionState Error:", error);
    return { status: "DISCONNECTED", qrCodeUrl: null, phoneNumber: null };
  }
}

export async function initWASession(tenantId: string): Promise<WASessionState> {
  try {
    const fonnteToken = process.env.FONNTE_TOKEN || "iXASoARwZ22PqNd3LWdA";

    if (fonnteToken) {
      // Panggil QR Code Fonnte API
      const res = await fetch("https://api.fonnte.com/qr", {
        method: "POST",
        headers: { Authorization: fonnteToken },
      });

      if (res.ok) {
        const data = await res.json();
        const qrUrl = data.url || data.qr || null;

        if (qrUrl) {
          // Update status di DB Supabase Cloud (Persisten)
          await prisma.tenant.update({
            where: { id: tenantId },
            data: {
              waStatus: "QR_READY",
              waQrCode: qrUrl,
            },
          });

          return {
            status: "QR_READY",
            qrCodeUrl: qrUrl,
            phoneNumber: null,
          };
        }
      }
    }

    // Fallback QR jika belum terpasang FONNTE_TOKEN (Tampilkan info QR Fonnte)
    const sampleQr =
      "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=Fonnte_WhatsApp_Connect_BalasApp";

    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        waStatus: "QR_READY",
        waQrCode: sampleQr,
      },
    });

    return {
      status: "QR_READY",
      qrCodeUrl: sampleQr,
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
    const fonnteToken = process.env.FONNTE_TOKEN || "iXASoARwZ22PqNd3LWdA";

    if (fonnteToken) {
      await fetch("https://api.fonnte.com/disconnect", {
        method: "POST",
        headers: { Authorization: fonnteToken },
      }).catch(() => {});
    }

    // Kosongkan status di Supabase Cloud DB
    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        waStatus: "DISCONNECTED",
        waQrCode: null,
        waPhoneNumber: null,
      },
    });

    return { status: "DISCONNECTED", qrCodeUrl: null, phoneNumber: null };
  } catch (error) {
    console.error("disconnectWASession Error:", error);
    return { status: "DISCONNECTED", qrCodeUrl: null, phoneNumber: null };
  }
}

// Fungsi untuk mengirim pesan WA balasan via Fonnte API
export async function sendWAServiceMessage(
  targetPhone: string,
  message: string,
  token?: string
): Promise<boolean> {
  try {
    const fonnteToken = token || process.env.FONNTE_TOKEN || "iXASoARwZ22PqNd3LWdA";
    if (!fonnteToken) {
      console.warn("FONNTE_TOKEN belum dipasang di Environment Variable Vercel.");
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
