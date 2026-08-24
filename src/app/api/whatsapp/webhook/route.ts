import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { executeAIChatLogic } from "@/lib/ai-engine";
import { sendWAServiceMessage } from "@/lib/whatsapp";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const challenge = searchParams.get("hub.challenge");
  const mode = searchParams.get("hub.mode");

  // Webhook Verification Standard
  if (mode === "subscribe" && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({
    status: "active",
    message: "Balas App Production WhatsApp Webhook Endpoint is Active & Running!",
    webhookUrl: "https://balas-app.vercel.app/api/whatsapp/webhook",
  });
}

export async function POST(request: Request) {
  try {
    let body: any = {};
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await request.formData();
      body = Object.fromEntries(formData.entries());
    } else {
      body = await request.json().catch(() => ({}));
    }

    // Deteksi nomor HP pengirim (Fonnte: sender/phone, Wablas: phone, Meta: messages[0].from)
    const rawSender =
      body.sender ||
      body.phone ||
      body.from ||
      body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.from ||
      "";

    // Deteksi isi pesan
    const textMessage =
      body.message ||
      body.text ||
      body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.text?.body ||
      "";

    // Deteksi ID Perangkat WA Toko (Device)
    const devicePhone = body.device || body.target || "";
    const deviceToken = body.token || body.device_token || "";

    if (!rawSender || !textMessage) {
      return NextResponse.json(
        { status: "ignored", reason: "Missing sender or text content" },
        { status: 200 }
      );
    }

    // ABAIKAN PESAN JIKA BERASAL DARI BALASAN BOT SENDIRI (MENCEGAH LOOPING 16 KALI)
    if (
      textMessage.includes("sent via fonnte.com") ||
      textMessage.toLowerCase().includes("buka. ad yg mau di pesan") ||
      textMessage.toLowerCase().includes("ada yang bisa kami bantu") ||
      textMessage.toLowerCase().includes("terima kasih telah menghubungi")
    ) {
      return NextResponse.json(
        { status: "ignored", reason: "Bot self-loop message prevented" },
        { status: 200 }
      );
    }

    // Clean customer phone number
    const cleanPhone = String(rawSender).replace(/[^0-9]/g, "");
    const customerPhone = cleanPhone.startsWith("62") ? "0" + cleanPhone.slice(2) : cleanPhone;
    const targetPhone = cleanPhone.startsWith("0") ? "62" + cleanPhone.slice(1) : cleanPhone;

    // Cari Tenant/Toko secara presisi di Supabase Cloud DB berdasarkan deviceToken / devicePhone
    let tenant = null;
    if (deviceToken || devicePhone) {
      tenant = await prisma.tenant.findFirst({
        where: {
          OR: [
            { fonnteDeviceToken: deviceToken },
            { fonnteDeviceId: String(devicePhone) },
            { waPhoneNumber: String(devicePhone) },
            { id: String(devicePhone) },
            { name: { contains: String(devicePhone) } },
          ],
        },
      }).catch(() => null);
    }

    if (!tenant) {
      tenant = await prisma.tenant.findFirst({
        orderBy: { createdAt: "asc" },
      }).catch(() => null);
    }

    if (!tenant) {
      return NextResponse.json({ error: "Tenant/Toko tidak ditemukan di DB" }, { status: 404 });
    }

    // UPDATE STATUS KONEKSI PERSISTEN DI SUPABASE CLOUD DB (Safe catch)
    try {
      await prisma.tenant.update({
        where: { id: tenant.id },
        data: {
          waStatus: "CONNECTED",
          waPhoneNumber: devicePhone || (tenant as any).waPhoneNumber || "Active",
        } as any,
      }).catch(() => {});
    } catch (e) {}

    console.log(
      `[WA Production Webhook] Pesan dari ${customerPhone} (target: ${targetPhone}) ke toko ${tenant.name}: "${textMessage}"`
    );

    // Eksekusi AI Engine khusus katalog toko tenant ini (Gemini AI + Tool Catat Pesanan & Eskalasi)
    const aiResult = await executeAIChatLogic(tenant.id, customerPhone, textMessage).catch((aiErr) => {
      console.error("AI Logic Error:", aiErr);
      return { reply: "Halo! Terima kasih telah menghubungi kami. Pesan Anda sudah diterima toko.", usingApiKey: false };
    });

    const replyText = aiResult.reply || "Maaf, pesan Anda sudah diterima toko.";
    const tenantFonnteToken = (tenant as any).fonnteDeviceToken || tenant.id;

    // Kirim HANYA 1 kali balasan resmi via Fonnte API menggunakan token Fonnte milik toko ini
    await sendWAServiceMessage(targetPhone, replyText, tenantFonnteToken).catch(() => {});

    // Kembalikan JSON response standar tanpa menggandakan balasan
    return NextResponse.json({
      status: "success",
      customerPhone,
      targetPhone,
      tenantId: tenant.id,
      storeName: tenant.name,
      usingApiKey: aiResult.usingApiKey,
    });
  } catch (error: any) {
    console.error("WA Production Webhook Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal webhook error" },
      { status: 500 }
    );
  }
}
