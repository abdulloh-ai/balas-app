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
// Definisi Function Declarations (Tools) untuk Gemini API
// -------------------------------------------------------------
const catatPesananTool = {
  name: "catat_pesanan",
  description:
    "HANYA DIPANGGIL KETIKA PELANGGAN SUDAH MENYEBUTKAN PRODUK SPESIFIK DAN JUMLAHNYA DENGAN JELAS (misal: 'pesan 2 pack frozen beef teriyaki', 'mau 1 jar cookies'). JANGAN PERNAH PANGGIL TOOL INI KETIKA PRODUK ATAU JUMLAH BELUM JELAS!",
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
    "Dipanggil saat pelanggan mengirim bukti transfer/pembayaran, mengajukan komplain serius, nego harga khusus, atau meminta penanganan langsung oleh owner toko.",
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

    // Ambil riwayat percakapan terakhir untuk memberi konteks percakapan
    const recentHistory = await prisma.conversation.findMany({
      where: { tenantId: session.tenantId, customerPhone },
      orderBy: { createdAt: "desc" },
      take: 8,
    });
    recentHistory.reverse();

    const historyFormatted = recentHistory
      .map((c) => `${c.sender === "PELANGGAN" ? "Pembeli" : "Admin Toko"}: "${c.message}"`)
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

    const systemPrompt = `Kamu adalah admin toko ${tenant.name} yang membalas chat pelanggan. Kamu adalah manusia yang sedang kerja, bukan asisten AI formal. Balas SEPERSIS mungkin seperti orang asli mengetik cepat di HP: singkat, santai, natural, boleh pakai bahasa gaul wajar, tidak perlu selalu sopan-formal berlebihan.

Kamu BEBAS menjawab apapun yang berkaitan dengan konteks toko dan obrolan jual-beli — dengan gaya bahasa apapun yang dipakai pelanggan, topik apapun seputar produk/toko, obrolan ringan, bercanda wajar, dll. Gunakan penalaran normal untuk memahami maksud orang, jangan terpaku pada pola/contoh tertentu saja.

Data yang kamu punya tentang toko ini (WAJIB dipatuhi, ini bukan pembatasan gaya bicara, tapi soal akurasi fakta):
- Nama Toko: ${tenant.name}
- Deskripsi: ${tenant.description || "Toko online terpercaya"}
- Jam Operasional: ${tenant.operatingHours || "Setiap hari 08.00 - 21.00 WIB"}
- Kebijakan/Info Toko: ${tenant.policies || "Pengiriman cepat dan terpercaya"}
- Daftar Produk & Stok Saat Ini:
${productCatalogText}

TIGA ATURAN YANG TIDAK BOLEH DILANGGAR APAPUN ALASANNYA (karena ini toko sungguhan, transaksi sungguhan, bukan obrolan biasa):
1. JANGAN PERNAH menyebutkan harga, stok, atau detail produk yang TIDAK ADA di data di atas — kalau tidak tahu, akui saja dengan santai, jangan mengarang.
2. JANGAN PERNAH mencatat pesanan (memanggil tool catat_pesanan) KECUALI pelanggan sudah menyebutkan produk spesifik DAN jumlahnya dengan jelas. Kalau belum jelas, tanya dulu, jangan menebak.
3. JANGAN PERNAH mengklaim kamu manusia jika ditanya LANGSUNG dan JELAS apakah kamu AI/bot — jawab jujur dengan santai lalu lanjutkan membantu.

Di luar tiga aturan itu, kamu punya kebebasan penuh untuk merespons secara natural, cerdas, dan kontekstual — seperti kemampuan reasoning AI pada umumnya, bukan chatbot berbasis skrip/pola tetap.

RIWAYAT CHAT:
${historyFormatted}`;

    let aiReplyText = "";
    let toolExecutionLog: string | null = null;
    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey) {
      try {
        const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

        const response = await fetch(geminiEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [{ text: `${systemPrompt}\n\nPesan Terbaru Pembeli: "${message.trim()}"` }],
              },
            ],
            tools: [{ functionDeclarations: [catatPesananTool, alihkanKeAdminTool] }],
            generationConfig: { temperature: 0.75, maxOutputTokens: 500 },
          }),
        });

        const data = await response.json();
        const candidate = data.candidates?.[0]?.content?.parts?.[0];

        if (candidate?.functionCall) {
          const fnName = candidate.functionCall.name;
          const fnArgs = candidate.functionCall.args;

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
          aiReplyText = await processFallbackLogic(message.trim(), session.tenantId, userMsg.id, tenant, tenant.products);
        }
      } catch (err) {
        console.error("Gemini Tool API Error:", err);
        aiReplyText = await processFallbackLogic(message.trim(), session.tenantId, userMsg.id, tenant, tenant.products);
      }
    } else {
      aiReplyText = await processFallbackLogic(message.trim(), session.tenantId, userMsg.id, tenant, tenant.products);
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
// Helper Handlers untuk Tool Execution & Fallback Logic Alami
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
        message: `Waduh maaf produk itu gak ada di toko kita.`,
        log: `Tool catat_pesanan gagal: produk tidak ditemukan.`,
      };
    }

    const qty = Math.max(1, item.quantity || 1);

    if (targetProduct.stock < qty) {
      return {
        message: `Stok ${targetProduct.name} sisa ${targetProduct.stock} pcs bro/sis, gak cukup buat ${qty} pcs.`,
        log: `Tool catat_pesanan gagal: stok ${targetProduct.name} kurang (${targetProduct.stock} < ${qty}).`,
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
    message: `Sip! Pesanan ${detailText} total Rp ${totalAmount.toLocaleString("id-ID")} udh dicatet ya. Tinggal transfer terus kirim buktinya ke sini ya!`,
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
    message: `Oke siap, pesan kamu udh aku terusin ke bos/owner toko ya. Ditunggu bentar ya!`,
    log: `Tool alihkan_ke_admin SUKSES: Record Eskalasi dibuat (Reason: ${reason}).`,
  };
}

async function processFallbackLogic(
  userQuery: string,
  tenantId: string,
  conversationId: string,
  tenant: { name: string; operatingHours: string | null; policies: string | null },
  products: Array<{ id: string; name: string; price: number; stock: number }>
) {
  const query = userQuery.toLowerCase();

  // Pertanyaan Produk / Katalog
  if (
    query.includes("jual apa") ||
    query.includes("produk apa") ||
    query.includes("daftar harga") ||
    query.includes("katalog") ||
    query.includes("menu") ||
    query.includes("ada apa aja") ||
    query.includes("list produk")
  ) {
    if (products.length === 0) {
      return `Katalog produk toko ${tenant.name} belum diinput nih boss.`;
    }
    const productListFormatted = products
      .map((p) => `• ${p.name} - Rp ${p.price.toLocaleString("id-ID")} (Stok: ${p.stock})`)
      .join("\n");

    return `Di ${tenant.name} kita ada:\n${productListFormatted}\n\nMau ambil yang mana?`;
  }

  // Niat transfer / bayar / bukti
  if (query.includes("transfer") || query.includes("bukti") || query.includes("lunas") || query.includes("bayar")) {
    const res = await handleAlihkanKeAdminTool(tenantId, conversationId, {
      reason: "PEMBAYARAN",
      summary: `Pelanggan mengonfirmasi pembayaran/bukti transfer: "${userQuery}"`,
    });
    return res.message;
  }

  // Deteksi Pesanan Langsung (HANYA JIKA JUMLAH & PRODUK SUDAH JELAS)
  const qtyMatch = query.match(/(\d+)/);
  const matched = products.find(
    (p) => query.includes(p.name.toLowerCase()) || p.name.toLowerCase().split(" ").some((w) => w.length > 3 && query.includes(w))
  );

  const isExplicitOrder =
    matched && qtyMatch && (query.includes("pesan") || query.includes("beli") || query.includes("order") || query.includes("mau") || query.includes("ambil"));

  if (isExplicitOrder) {
    const qty = parseInt(qtyMatch[1], 10);
    const res = await handleCatatPesananTool(tenantId, "081234567890", { items: [{ productName: matched.name, quantity: qty }] }, products);
    return res.message;
  }

  if (matched && !qtyMatch && (query.includes("pesan") || query.includes("beli") || query.includes("order") || query.includes("mau"))) {
    return `Mau pesan ${matched.name} berapa pcs/pack? Sebutin jumlahnya ya biar aku catetin.`;
  }

  // Tanya jam buka
  if (query.includes("jam") || query.includes("buka") || query.includes("tutup") || query.includes("operasional")) {
    return tenant.operatingHours ? `Kita buka: ${tenant.operatingHours}` : `Buka setiap hari ya.`;
  }

  // Tanya produk spesifik
  if (matched) {
    return `${matched.name} harganya Rp ${matched.price.toLocaleString("id-ID")}, sisa stok ${matched.stock} pcs.`;
  }

  return `Yo! Ada yang bisa dibantu tentang produk ${tenant.name}?`;
}
