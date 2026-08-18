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

// -------------------------------------------------------------
// Definisi Function Declarations (Tools) untuk Gemini API
// -------------------------------------------------------------
const catatPesananTool = {
  name: "catat_pesanan",
  description: "WAJIB DIPANGGIL KETIKA PELANGGAN MENYATAKAN INGIN MEMBELI/MEMESAN PRODUK (misal: 'pesan 2 pack', 'mau beli 1 jar', 'order frozen beef'). LANGSUNG PANGGIL TOOL INI SAAT ITU JUGA TANPA BERTANYA LAGI!",
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
              description: "Nama produk persis sesuai katalog toko",
            },
            quantity: {
              type: "INTEGER",
              description: "Jumlah unit/pcs yang dibeli",
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
  description: "Dipanggil saat pelanggan mengirim bukti transfer/pembayaran, mengajukan komplain, nego harga khusus, atau bertanya di luar data katalog/toko.",
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

    const productCatalogText =
      tenant.products.length > 0
        ? tenant.products
            .map(
              (p) =>
                `- ${p.name}: Rp ${p.price.toLocaleString("id-ID")}, Stok: ${p.stock} pcs ${
                  p.description ? `(${p.description})` : ""
                }`
            )
            .join("\n")
        : "(Belum ada produk di katalog)";

    const systemPrompt = `Kamu adalah admin/kasir toko WA asli dari "${tenant.name}". Gaya bahasamu ramah, santai, dan fleksibel khas admin toko Indonesia (gunakan kata "Kak", emoji ramah seperti 😊).

Katalog Produk & Stok Toko Saat Ini:
${productCatalogText}

Instruksi Penting:
1. JIKA PELANGGAN MENANYAKAN PRODUK APA SAJA YANG DIJUAL / DAFTAR HARGA / MENU KATALOG (misal: "jual apa aja?", "ada produk apa aja?", "daftar harga", "katalog"), SEBUTKAN SELURUH DAFTAR PRODUK KAMI BESERTA HARGA DAN STOKNYA SECARA LENGKAP & RAMAH!
2. JIKA PELANGGAN MENYEBUTKAN INGIN MEMBELI/ORDER (misal: "pesan 2 pack", "beli frozen beef", "mau order"), KAMU HARUS LANGSUNG MEMANGGIL TOOL catat_pesanan SAAT INI JUGA! JANGAN BERTANYA LAGI!
3. JIKA PELANGGAN MENYEBUTKAN BUKTI TRANSFER/BAYAR, PANGGIL TOOL alihkan_ke_admin.`;

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
                parts: [{ text: `${systemPrompt}\n\nPesan Pelanggan WA: "${message.trim()}"` }],
              },
            ],
            tools: [{ functionDeclarations: [catatPesananTool, alihkanKeAdminTool] }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 400 },
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
// Helper Handlers untuk Tool Execution & Fallback Logic Cerdas
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
      message: "Siap Kak! Boleh tahu mau pesan produk apa dan berapa unit?",
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
        message: `Maaf Kak, produk tersebut belum tersedia di toko kami.`,
        log: `Tool catat_pesanan gagal: produk tidak ditemukan.`,
      };
    }

    const qty = Math.max(1, item.quantity || 1);

    if (targetProduct.stock < qty) {
      return {
        message: `Maaf banget Kak, stok untuk "${targetProduct.name}" tinggal sisa ${targetProduct.stock} pcs. Pesanan ${qty} pcs belum bisa diproses.`,
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
    message: `Siap Kak! Pesanan ${detailText} dengan total Rp ${totalAmount.toLocaleString("id-ID")} berhasil dicatat 😊. Silakan lakukan pembayaran agar pesanan bisa diproses ya!`,
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
    message: `Baik Kak, informasi ini sudah kami teruskan ke pemilik toko untuk diperiksa ya. Mohon tunggu sebentar 😊.`,
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

  // Pertanyaan Produk yang Dijual & Daftar Harga / Katalog
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
      return `Katalog produk toko ${tenant.name} sedang disiapkan Kak 😊.`;
    }
    const productListFormatted = products
      .map(
        (p) =>
          `• ${p.name} — Rp ${p.price.toLocaleString("id-ID")} (Stok ready: ${p.stock} pcs)`
      )
      .join("\n");

    return `Halo Kak! Di toko ${tenant.name} kami menjual:\n\n${productListFormatted}\n\nAda yang mau Kakak pesan? 😊`;
  }

  // Niat transfer / bayar / bukti
  if (query.includes("transfer") || query.includes("bukti") || query.includes("lunas") || query.includes("bayar")) {
    const res = await handleAlihkanKeAdminTool(tenantId, conversationId, {
      reason: "PEMBAYARAN",
      summary: `Pelanggan mengonfirmasi pembayaran/bukti transfer: "${userQuery}"`,
    });
    return res.message;
  }

  // Deteksi Pesanan Langsung (contoh: "mau 2 pack", "pesan 1", "beli teriyaki")
  const isOrdering = query.includes("pesan") || query.includes("beli") || query.includes("order") || query.includes("mau") || query.includes("ambil");

  if (isOrdering && products.length > 0) {
    const matched = products.find(
      (p) => query.includes(p.name.toLowerCase()) || p.name.toLowerCase().split(" ").some((w) => w.length > 3 && query.includes(w))
    );

    const targetProduct = matched || products[0];
    const qtyMatch = query.match(/(\d+)/);
    const qty = qtyMatch ? parseInt(qtyMatch[1], 10) : 1;

    const res = await handleCatatPesananTool(tenantId, "081234567890", { items: [{ productName: targetProduct.name, quantity: qty }] }, products);
    return res.message;
  }

  // Tanya jam buka
  if (query.includes("jam") || query.includes("buka") || query.includes("tutup") || query.includes("operasional")) {
    return tenant.operatingHours ? `Toko kami buka: ${tenant.operatingHours} ya Kak 😊.` : `Toko ${tenant.name} siap melayani Anda.`;
  }

  // Tanya produk spesifik
  const matchedProduct = products.find(
    (p) => query.includes(p.name.toLowerCase()) || p.name.toLowerCase().split(" ").some((w) => w.length > 3 && query.includes(w))
  );

  if (matchedProduct) {
    return `${matchedProduct.name} harganya Rp ${matchedProduct.price.toLocaleString("id-ID")}, sisa stok ready ${matchedProduct.stock} pcs Kak 😊.`;
  }

  return `Halo Kak! Ada yang bisa dibantu untuk produk di ${tenant.name}? 😊`;
}
