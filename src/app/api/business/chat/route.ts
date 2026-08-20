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
    "Dipanggil saat pelanggan sudah cukup jelas menyatakan barang dan jumlah yang mereka mau dipesan. Jika belum jelas, tanyakan dengan wajar seperti percakapan normal.",
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
    "Dipanggil saat pelanggan mengirim bukti transfer/pembayaran, komplain serius, nego harga khusus, atau meminta penanganan langsung oleh owner toko.",
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

    const systemPrompt = `Kamu adalah ${tenant.name}. Kamu ngobrol sama pelanggan lewat WhatsApp seperti manusia biasa yang kerja di toko ini — bukan customer service formal, bukan asisten AI yang baku. Ngobrol natural, bebas, apa adanya, seperti kamu benar-benar orangnya.

Kamu boleh menjawab apapun, dengan gaya apapun, topik apapun yang muncul dalam obrolan — santai, bercanda, to the point, sesuai konteks chat yang berjalan. Tidak ada skrip atau pola tetap yang harus diikuti. Gunakan penalaran dan pemahaman bahasa natural sepenuhnya, seperti kemampuan AI pada umumnya dalam berbahasa dan memahami maksud orang.

Info toko yang kamu tahu:
- Nama Bisnis: ${tenant.name}
- Deskripsi Singkat: ${tenant.description || "Toko online terpercaya"}
- Jam Operasional: ${tenant.operatingHours || "Setiap hari 08.00 - 21.00 WIB"}
- Kebijakan/Info Toko: ${tenant.policies || "Pengiriman cepat & terpercaya"}
- Daftar Produk, Harga, & Stok Saat Ini:
${productCatalogText}

Kamu berbicara TENTANG toko ini menggunakan info di atas. Untuk hal yang benar-benar tidak kamu ketahui datanya, jawab saja apa adanya bahwa kamu belum tahu — sama seperti orang biasa akan bilang 'kurang tahu saya' untuk hal yang memang tidak dia ketahui, bukan mengarang jawaban.

Untuk mencatat pesanan: lakukan saat pelanggan sudah cukup jelas menyatakan barang dan jumlah yang mereka mau (panggil tool catat_pesanan). Kalau belum jelas, tanyakan dengan wajar seperti percakapan normal — bukan karena aturan kaku, tapi karena memang begitu cara kerja transaksi yang masuk akal.

RIWAYAT PERCAKAPAN:
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
                parts: [{ text: `${systemPrompt}\n\nPesan Terbaru Pelanggan: "${message.trim()}"` }],
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
        message: `Waduh kurang tahu deh, produk itu belum ada di daftar toko kita.`,
        log: `Tool catat_pesanan gagal: produk tidak ditemukan.`,
      };
    }

    const qty = Math.max(1, item.quantity || 1);

    if (targetProduct.stock < qty) {
      return {
        message: `Stok ${targetProduct.name} sisa ${targetProduct.stock} pcs nih, belum cukup kalau pesan ${qty} pcs.`,
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
      return `Katalog produk toko ${tenant.name} belum ada datanya nih.`;
    }
    const productListFormatted = products
      .map((p) => `• ${p.name} - Rp ${p.price.toLocaleString("id-ID")} (Stok: ${p.stock})`)
      .join("\n");

    return `Di ${tenant.name} ada ini nih:\n${productListFormatted}\n\nMau pesan yang mana?`;
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
    return `Mau pesan ${matched.name} berapa pcs/pack? Sebutin jumlahnya ya biar aku catet.`;
  }

  // Tanya jam buka
  if (query.includes("jam") || query.includes("buka") || query.includes("tutup") || query.includes("operasional")) {
    return tenant.operatingHours ? `Kita buka: ${tenant.operatingHours}` : `Buka setiap hari ya.`;
  }

  // Tanya produk spesifik
  if (matched) {
    return `${matched.name} harganya Rp ${matched.price.toLocaleString("id-ID")}, stok sisa ${matched.stock} pcs.`;
  }

  return `Ada yang bisa dibantu tentang produk ${tenant.name}?`;
}
