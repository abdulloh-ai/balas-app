import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  WASocket,
} from "@whiskeysockets/baileys";
import QRCode from "qrcode";
import path from "path";
import fs from "fs";
import { prisma } from "@/lib/prisma";

export interface WASessionState {
  status: "DISCONNECTED" | "CONNECTING" | "QR_READY" | "CONNECTED";
  qrCodeUrl: string | null;
  phoneNumber: string | null;
  error?: string | null;
}

// Global in-memory session manager
const sessions: Map<string, { socket: WASocket; state: WASessionState }> = new Map();

export async function getWASessionState(tenantId: string): Promise<WASessionState> {
  const session = sessions.get(tenantId);
  if (!session) {
    const sessionDir = path.join(process.cwd(), "whatsapp_sessions", tenantId);
    if (fs.existsSync(sessionDir) && fs.readdirSync(sessionDir).length > 0) {
      return { status: "DISCONNECTED", qrCodeUrl: null, phoneNumber: null };
    }
    return { status: "DISCONNECTED", qrCodeUrl: null, phoneNumber: null };
  }
  return session.state;
}

export async function initWASession(tenantId: string): Promise<WASessionState> {
  const existing = sessions.get(tenantId);
  if (existing && existing.state.status === "CONNECTED") {
    return existing.state;
  }

  const sessionDir = path.join(process.cwd(), "whatsapp_sessions", tenantId);
  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
  }

  const { state: authState, saveCreds } = await useMultiFileAuthState(sessionDir);

  const initialState: WASessionState = {
    status: "CONNECTING",
    qrCodeUrl: null,
    phoneNumber: null,
  };

  const sock = makeWASocket({
    auth: authState,
    printQRInTerminal: false,
    browser: ["Balas SaaS AI", "Chrome", "1.0.0"],
  });

  sessions.set(tenantId, { socket: sock, state: initialState });

  sock.ev.on("creds.update", saveCreds);

  // Return a promise that resolves when QR code is emitted or connection opens or 5s timeout
  return new Promise<WASessionState>((resolve) => {
    let resolved = false;

    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        const current = sessions.get(tenantId);
        resolve(current ? current.state : initialState);
      }
    }, 5000);

    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;
      const currentSession = sessions.get(tenantId);
      if (!currentSession) return;

      if (qr) {
        try {
          const qrDataUrl = await QRCode.toDataURL(qr);
          currentSession.state = {
            status: "QR_READY",
            qrCodeUrl: qrDataUrl,
            phoneNumber: null,
          };
          console.log(`[WA Gateway ${tenantId}] Kode QR Siap di-scan!`);

          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            resolve(currentSession.state);
          }
        } catch (err) {
          console.error("QR Code Error:", err);
        }
      }

      if (connection === "open") {
        const userJid = sock.user?.id || "";
        const phone = userJid.split(":")[0] || userJid.split("@")[0] || "";

        currentSession.state = {
          status: "CONNECTED",
          qrCodeUrl: null,
          phoneNumber: phone,
        };
        console.log(`[WA Gateway ${tenantId}] 🟢 TERHUBUNG KE WHATSAPP (+${phone})!`);

        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          resolve(currentSession.state);
        }
      }

      if (connection === "close") {
        const shouldReconnect =
          (lastDisconnect?.error as any)?.output?.statusCode !== DisconnectReason.loggedOut;

        console.log(
          `[WA Gateway ${tenantId}] Connection closed. Reconnecting:`,
          shouldReconnect
        );

        if (shouldReconnect) {
          currentSession.state.status = "CONNECTING";
          initWASession(tenantId);
        } else {
          currentSession.state = {
            status: "DISCONNECTED",
            qrCodeUrl: null,
            phoneNumber: null,
          };
          if (fs.existsSync(sessionDir)) {
            fs.rmSync(sessionDir, { recursive: true, force: true });
          }
        }
      }
    });

    // MENDENGARKAN CHAT MASUK DARI WHATSAPP HP ASLI PELANGGAN
    sock.ev.on("messages.upsert", async (m) => {
      try {
        if (m.type !== "notify") return;

        for (const msg of m.messages) {
          if (!msg.message || msg.key.fromMe) continue;

          const remoteJid = msg.key.remoteJid || "";
          if (!remoteJid.endsWith("@s.whatsapp.net")) continue;

          const customerPhone = remoteJid.replace("@s.whatsapp.net", "");
          const textMessage =
            msg.message.conversation ||
            msg.message.extendedTextMessage?.text ||
            "";

          if (!textMessage.trim()) continue;

          console.log(
            `[WA Gateway ${tenantId}] Chat masuk dari ${customerPhone}: "${textMessage}"`
          );

          // 1. Simpan pesan pelanggan ke DB
          await prisma.conversation.create({
            data: {
              tenantId,
              customerPhone,
              sender: "PELANGGAN",
              message: textMessage,
            },
          });

          // 2. Panggil API AI Chat Engine internal
          const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
          const aiResponse = await fetch(`${baseUrl}/api/business/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              message: textMessage,
              customerPhone,
              tenantId,
            }),
          });

          const data = await aiResponse.json();
          const replyText = data.reply || "Maaf, pesan Anda sudah diterima toko.";

          // 3. Balas chat langsung ke WhatsApp HP pelanggan!
          await sock.sendMessage(remoteJid, { text: replyText });
          console.log(
            `[WA Gateway ${tenantId}] 🤖 AI Bot membalas ke ${customerPhone}: "${replyText}"`
          );
        }
      } catch (err) {
        console.error(`[WA Gateway ${tenantId}] Message Upsert Error:`, err);
      }
    });
  });
}

export async function disconnectWASession(tenantId: string): Promise<WASessionState> {
  const session = sessions.get(tenantId);
  if (session) {
    try {
      await session.socket.logout();
    } catch (e) {
      session.socket.end(new Error("Manual disconnect"));
    }
    sessions.delete(tenantId);
  }

  const sessionDir = path.join(process.cwd(), "whatsapp_sessions", tenantId);
  if (fs.existsSync(sessionDir)) {
    fs.rmSync(sessionDir, { recursive: true, force: true });
  }

  return { status: "DISCONNECTED", qrCodeUrl: null, phoneNumber: null };
}
