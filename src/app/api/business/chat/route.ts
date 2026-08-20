import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBusinessOwnerSession } from "@/lib/auth";

export async function GET() {
  const session = await getBusinessOwnerSession();
  if (!session) {
    return NextResponse.json({ error: "Akses ditolak. Silakan login." }, { status: 401 });
  }

  try {
    const conversations = await prisma.conversation.findMany({
      where: { tenantId: session.tenantId },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ conversations });
  } catch (error) {
    console.error("GET Chat Error:", error);
    return NextResponse.json({ error: "Gagal mengambil riwayat percakapan." }, { status: 500 });
  }
}

export async function DELETE() {
  const session = await getBusinessOwnerSession();
  if (!session) {
    return NextResponse.json({ error: "Akses ditolak. Silakan login." }, { status: 401 });
  }

  try {
    // Hapus total seluruh riwayat percakapan tenant dari database
    const deleted = await prisma.conversation.deleteMany({
      where: { tenantId: session.tenantId },
    });

    return NextResponse.json({
      message: `Seluruh riwayat chat (${deleted.count} pesan) berhasil dihapus total dari database.`,
      deletedCount: deleted.count,
    });
  } catch (error) {
    console.error("DELETE Chat Error:", error);
    return NextResponse.json({ error: "Gagal menghapus riwayat chat dari database." }, { status: 500 });
  }
}

// -------------------------------------------------------------
// PURE AI TOOL DECLARATIONS
// -------------------------------------------------------------
const catatPesananTool = {
  name: "catat_pesanan",
  description:
    "Dipanggil saat pelanggan menyatakan pesanan produk dan jumlahnya secara pasti.",
  parameters: {
    type: "OBJECT",
    properties: {
      items: {
        type: "ARRAY",
        description: "Daftar item produk yang dipesan pelanggan",
        items: {
          type: "OBJECT",
          properties: {
            productName: {
              type: "STRING",
              description: "Nama produk persis sesuai data toko",
            },
            quantity: {
              type: "INTEGER",
              description: "Jumlah unit/pcs yang dibeli secara pasti",
            },
          },
          required: ["productName", "quantity"],
        },
      },
      customerName: {
        type: "STRING",
        description: "Nama pelanggan jika disebutkan, atau default Pelanggan WA",
      },
    },
    required: ["items"],
  },
};

const alihkanKeAdminTool = {
  name: "alihkan_ke_admin",
  description:
    "Dipanggil saat pelanggan mengirim bukti transfer, komplain serius, nego harga khusus, atau meminta bicara langsung dengan owner toko.",
  parameters: {
    type: "OBJECT",
    properties: {
      reason: {
        type: "STRING",
        enum: ["PEMBAYARAN", "KOMPLAIN", "NEGO_HARGA", "PERTANYAAN_DILUAR_DATA", "LAINNYA"],
        description: "Alasan pengalihan percakapan ke pemilik toko",
      },
      summary: {
        type: "STRING",
        description: "Ringkasan singkat masalah atau detail transfer pelanggan",
      },
    },
    required: ["reason", "summary"],
  },
};

export async function POST(request: Request) {
  const session = await getBusinessOwnerSession();
  if (!session) {
    return NextResponse.json({ error: "Akses ditolak. Silakan login." }, { status: 401 });
  }

  try {
    const { message, customerPhone = "081234567890" } = await request.json();

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json({ error: "Pesan chat tidak boleh kosong." }, { status: 400 });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: session.tenantId },
      include: {
        products: {
          orderBy: { name: "asc" },
        },
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Data bisnis tidak ditemukan." }, { status: 404 });
    }

    // Simpan pesan pelanggan ke DB
    const userMsg = await prisma.conversation.create({
      data: {
        tenantId: session.tenantId,
        customerPhone,
        sender: "PELANGGAN",
        message: message.trim(),
      },
    });

    // Ambil riwayat percakapan terakhir untuk konteks penuh
    const recentHistory = await prisma.conversation.findMany({
      where: { tenantId: session.tenantId, customerPhone },
      orderBy: { createdAt: "desc" },
      take: 10,
    });
    recentHistory.reverse();

    const historyFormatted = recentHistory
      .map((c) => `${c.sender === "PELANGGAN" ? "Pelanggan" : "Admin Toko"}: "${c.message}"`)
      .join("\n");

    const productCatalogText =
      tenant.products.length > 0
        ? tenant.products
            .map(
              (p) =>
                `- ${p.name}: Rp ${p.price.toLocaleString("id-ID")}, Stok ready: ${p.stock} pcs${
                  p.description ? ` (${p.description})` : ""
                }`
            )
            .join("\n")
        : "(Belum ada produk di katalog)";

    // PURE NATURAL AI SYSTEM PROMPT — PERSIS SEPERTI MODEL LLM BEBAS REASONING
    const systemPrompt = `Kamu adalah admin toko ${tenant.name} yang melayani pelanggan via WhatsApp. Kamu adalah manusia yang sedang bekerja di toko ini — santai, cerdas, luwes, dan nyambung diajak ngobrol apa saja seputar toko dan jual beli. Gunakan penalaran bahasa natural penuh (pure AI reasoning) persis seperti kemampuan AI conversational pada umumnya.

Info Toko:
- Nama Toko: ${tenant.name}
- Deskripsi: ${tenant.description || "Toko terpercaya"}
- Jam Operasional: ${tenant.operatingHours || "08.00 - 21.00 WIB"}
- Kebijakan/Info: ${tenant.policies || "Pengiriman cepat & aman"}
- Katalog Produk & Stok Saat Ini:
${productCatalogText}

RIWAYAT CHAT:
${historyFormatted}`;

    let aiReplyText = "";
    let toolExecutionLog: string | null = null;
    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey) {
      try {
        const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

        console.log(`🤖 [PURE_AI_MODEL] Mengirim chat langsung ke Gemini LLM...`);

        const response = await fetch(geminiEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [{ text: `${systemPrompt}\n\nPesan Terbaru Pelanggan: "${message.trim()}"` }],
              },
            ],
            tools: [{ functionDeclarations: [catatPesananTool, alihkanKeAdminTool] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 500 },
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          console.error("❌ [GEMINI_API_ERROR]", response.status, data);
          if (response.status === 429) {
            aiReplyText = "Waduh maaf banget, server AI lagi padat sebentar. Boleh coba kirim ulang 3 detik lagi ya! 🙏";
            toolExecutionLog = "⚠️ RATE LIMIT 429 EXCEEDED";
          } else {
            aiReplyText = `Maaf, terjadi gangguan server AI (${response.status}). Boleh coba lagi sebentar ya.`;
          }
        } else {
          const candidate = data.candidates?.[0]?.content?.parts?.[0];

          if (candidate?.functionCall) {
            const fnName = candidate.functionCall.name;
            const fnArgs = candidate.functionCall.args;
            console.log(`⚡ [GEMINI_TOOL_CALL] AI memanggil Tool: "${fnName}"`, fnArgs);

            if (fnName === "catat_pesanan") {
              const result = await handleCatatPesananTool(session.tenantId, customerPhone, fnArgs, tenant.products);
              aiReplyText = result.message;
              toolExecutionLog = result.log;
            } else if (fnName === "alihkan_ke_admin") {
              const result = await handleAlihkanKeAdminTool(session.tenantId, userMsg.id, fnArgs);
              aiReplyText = result.message;
              toolExecutionLog = result.log;
            }
          } else if (candidate?.text) {
            aiReplyText = candidate.text.trim();
          } else {
            aiReplyText = "Ada yang bisa dibantu tentang produk toko kami?";
          }
        }
      } catch (err: any) {
        console.error("💥 [GEMINI_EXCEPTION]", err);
        aiReplyText = "Waduh maaf, ada gangguan koneksi sebentar. Boleh kirim ulang?";
      }
    } else {
      aiReplyText = "Maaf, API Key AI belum terpasang di server.";
    }

    // Simpan balasan AI ke DB
    const aiMsg = await prisma.conversation.create({
      data: {
        tenantId: session.tenantId,
        customerPhone,
        sender: "AI",
        message: aiReplyText,
      },
    });

    return NextResponse.json({
      userMsg,
      aiMsg,
      toolExecutionLog,
      usingApiKey: Boolean(apiKey),
    });
  } catch (error) {
    console.error("POST Chat Error:", error);
    return NextResponse.json({ error: "Gagal memproses pesan simulasi chat." }, { status: 500 });
  }
}

// -------------------------------------------------------------
// Helper Handlers untuk Tool Execution
// -------------------------------------------------------------
async function handleCatatPesananTool(
  tenantId: string,
  customerPhone: string,
  args: any,
  products: Array<{ id: string; name: string; price: number; stock: number }>
) {
  const items = args.items || [];
  if (items.length === 0) {
    return {
      message: "Boleh, mau pesan produk yang mana dan berapa unit/pack?",
      log: "Tool catat_pesanan dipanggil tanpa item.",
    };
  }

  let totalAmount = 0;
  const orderItemsToCreate: Array<{ productId: string; productName: string; price: number; quantity: number }> = [];

  for (const item of items) {
    const matchedProduct = products.find(
      (p) =>
        p.name.toLowerCase() === item.productName.toLowerCase() ||
        p.name.toLowerCase().includes(item.productName.toLowerCase()) ||
        item.productName.toLowerCase().includes(p.name.toLowerCase())
    );

    const targetProduct = matchedProduct || products[0];

    if (!targetProduct) {
      return {
        message: `Waduh maaf, produk itu belum ada di katalog toko kita.`,
        log: `Tool catat_pesanan gagal: produk tidak ditemukan.`,
      };
    }

    const qty = Math.max(1, item.quantity || 1);

    if (targetProduct.stock < qty) {
      return {
        message: `Stok ${targetProduct.name} sisa ${targetProduct.stock} pcs nih, belum cukup kalau pesan ${qty} pcs.`,
        log: `Tool catat_pesanan gagal: stok ${targetProduct.name} kurang.`,
      };
    }

    totalAmount += targetProduct.price * qty;
    orderItemsToCreate.push({
      productId: targetProduct.id,
      productName: targetProduct.name,
      price: targetProduct.price,
      quantity: qty,
    });
  }

  // Potong Stok & Buat Order
  await prisma.$transaction(async (tx) => {
    for (const item of orderItemsToCreate) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } },
      });
    }

    await tx.order.create({
      data: {
        tenantId,
        customerName: args.customerName || "Pelanggan WA",
        customerPhone,
        totalAmount,
        status: "MENUNGGU_PEMBAYARAN",
        items: {
          create: orderItemsToCreate,
        },
      },
    });
  });

  const detailText = orderItemsToCreate.map((i) => `${i.productName} (${i.quantity}x)`).join(", ");
  return {
    message: `Sip! Pesanan ${detailText} total Rp ${totalAmount.toLocaleString("id-ID")} udah dicatat ya. Nanti kalau udah transfer kirim buktinya ke sini ya!`,
    log: `Tool catat_pesanan SUKSES: Order dibuat Rp ${totalAmount} & stok terpotong.`,
  };
}

async function handleAlihkanKeAdminTool(tenantId: string, conversationId: string, args: any) {
  const reason = args.reason || "LAINNYA";
  const summary = args.summary || "Pelanggan membutuhkan konfirmasi langsung dari pemilik toko.";

  await prisma.escalation.create({
    data: {
      tenantId,
      conversationId,
      reason,
      summary,
      status: "BELUM_SELESAI",
    },
  });

  return {
    message: `Oke siap, pesan kamu udah aku terusin ke owner toko ya. Ditunggu sebentar ya!`,
    log: `Tool alihkan_ke_admin SUKSES: Record Eskalasi dibuat (Reason: ${reason}).`,
  };
}
