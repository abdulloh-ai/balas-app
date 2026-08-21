import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { executeAIChatLogic } from "@/lib/ai-engine";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const challenge = searchParams.get("hub.challenge");
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");

  // Webhook Verification (WhatsApp Cloud API / Meta Standard)
  if (mode === "subscribe" && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({
    status: "active",
    message: "Balas App Production WhatsApp Webhook Endpoint is Running!",
    webhookUrl: "https://balas-app.vercel.app/api/whatsapp/webhook",
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));

    // Detect sender phone number (Fonnte / Wablas / Meta / Custom WA Gateway)
    const rawSender =
      body.sender ||
      body.phone ||
      body.from ||
      body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.from ||
      "";

    // Detect message text
    const textMessage =
      body.message ||
      body.text ||
      body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.text?.body ||
      "";

    // Detect target store / tenant ID or device ID
    const deviceId = body.device || body.device_id || body.target || "";

    if (!rawSender || !textMessage) {
      return NextResponse.json(
        { status: "ignored", reason: "Missing sender or message content" },
        { status: 200 }
      );
    }

    // Clean phone number format
    const cleanPhone = String(rawSender).replace(/[^0-9]/g, "");
    const customerPhone = cleanPhone.startsWith("62") ? "0" + cleanPhone.slice(2) : cleanPhone;

    // Cari Tenant/Toko berdasarkan deviceId atau ambil tenant pertama jika single tenant
    let tenant = null;
    if (deviceId) {
      tenant = await prisma.tenant.findFirst({
        where: { OR: [{ id: deviceId }, { name: { contains: deviceId } }] },
      });
    }

    if (!tenant) {
      tenant = await prisma.tenant.findFirst({
        orderBy: { createdAt: "asc" },
      });
    }

    if (!tenant) {
      return NextResponse.json({ error: "Tenant/Toko tidak ditemukan." }, { status: 404 });
    }

    console.log(
      `[WA Production Webhook] Chat masuk dari ${customerPhone} ke toko ${tenant.name}: "${textMessage}"`
    );

    // Eksekusi AI Engine
    const aiResult = await executeAIChatLogic(tenant.id, customerPhone, textMessage);

    // Return response payload for Fonnte / Wablas auto-reply integration
    return NextResponse.json({
      status: "success",
      reply: aiResult.reply,
      customerPhone,
      tenantId: tenant.id,
      storeName: tenant.name,
      usingApiKey: aiResult.usingApiKey,
    });
  } catch (error: any) {
    console.error("WA Webhook Error:", error);
    return NextResponse.json({ error: error.message || "Webhook processing error" }, { status: 500 });
  }
}
