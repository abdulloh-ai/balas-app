import { prisma } from "@/lib/prisma";

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

export async function executeAIChatLogic(
  tenantId: string,
  customerPhone: string,
  messageText: string
) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      products: {
        orderBy: { name: "asc" },
      },
    },
  });

  if (!tenant) {
    throw new Error("Data bisnis tidak ditemukan.");
  }

  // Simpan pesan pelanggan ke DB
  const userMsg = await prisma.conversation.create({
    data: {
      tenantId,
      customerPhone,
      sender: "PELANGGAN",
      message: messageText.trim(),
    },
  });

  // Ambil riwayat percakapan terakhir untuk konteks penuh
  const recentHistory = await prisma.conversation.findMany({
    where: { tenantId, customerPhone },
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

  const systemPrompt = `Kamu adalah admin toko ${tenant.name} yang melayani pelanggan via WhatsApp. Kamu adalah manusia yang sedang bekerja di toko ini — santai, cerdas, luwes, dan nyambung diajak ngobrol apa saja seputar toko dan jual beli. Balas super singkat, natural, cepat seperti orang ngetik di HP (1-5 kata).

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
  const isValidGeminiKey = apiKey && apiKey.startsWith("AIzaSy");

  if (isValidGeminiKey) {
    try {
      const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

      const response = await fetch(geminiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: `${systemPrompt}\n\nPesan Terbaru Pelanggan: "${messageText.trim()}"` }],
            },
          ],
          tools: [{ functionDeclarations: [catatPesananTool, alihkanKeAdminTool] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 300 },
        }),
      });

      const data = await response.json();

      if (response.ok) {
        const candidate = data.candidates?.[0]?.content?.parts?.[0];

        if (candidate?.functionCall) {
          const fnName = candidate.functionCall.name;
          const fnArgs = candidate.functionCall.args;

          if (fnName === "catat_pesanan") {
            const result = await handleCatatPesananTool(tenantId, customerPhone, fnArgs, tenant.products);
            aiReplyText = result.message;
            toolExecutionLog = result.log;
          } else if (fnName === "alihkan_ke_admin") {
            const result = await handleAlihkanKeAdminTool(tenantId, userMsg.id, fnArgs);
            aiReplyText = result.message;
            toolExecutionLog = result.log;
          }
        } else if (candidate?.text) {
          aiReplyText = candidate.text.trim();
        } else {
          aiReplyText = await processSmartLocalEngine(messageText.trim(), tenantId, customerPhone, userMsg.id, tenant, tenant.products);
        }
      } else {
        aiReplyText = await processSmartLocalEngine(messageText.trim(), tenantId, customerPhone, userMsg.id, tenant, tenant.products);
      }
    } catch (err: any) {
      aiReplyText = await processSmartLocalEngine(messageText.trim(), tenantId, customerPhone, userMsg.id, tenant, tenant.products);
    }
  } else {
    aiReplyText = await processSmartLocalEngine(messageText.trim(), tenantId, customerPhone, userMsg.id, tenant, tenant.products);
  }

  // Simpan balasan AI ke DB
  const aiMsg = await prisma.conversation.create({
    data: {
      tenantId,
      customerPhone,
      sender: "AI",
      message: aiReplyText,
    },
  });

  return {
    userMsg,
    aiMsg,
    reply: aiReplyText,
    toolExecutionLog,
    usingApiKey: Boolean(isValidGeminiKey),
  };
}

async function processSmartLocalEngine(
  userQuery: string,
  tenantId: string,
  customerPhone: string,
  conversationId: string,
  tenant: { name: string; operatingHours: string | null; policies: string | null },
  products: Array<{ id: string; name: string; price: number; stock: number }>
) {
  const query = userQuery.toLowerCase().trim();

  let title = "mas";
  if (query.includes("mbak") || query.includes("sis") || query.includes("mew")) title = "mbak";
  if (query.includes("teh")) title = "teh";
  if (query.includes("ibu") || query.includes("bu")) title = "ibu";
  if (query.includes("pak")) title = "pak";

  if (query.includes("buka") || query.includes("tutup") || query.includes("jam") || query.includes("operasional")) {
    if (query === "mas warung buka g" || query.includes("buka g") || query.includes("buka gak") || query.includes("buka tidak")) {
      return "Buka.";
    }
    return tenant.operatingHours ? `Buka ${tenant.operatingHours}.` : "Buka tiap hari jam 08.00 - 21.00 WIB.";
  }

  if (
    query.includes("jual apa") ||
    query.includes("produk apa") ||
    query.includes("daftar harga") ||
    query.includes("katalog") ||
    query.includes("ada apa aja") ||
    query.includes("masih ada apa aja") ||
    query.includes("ready apa aja")
  ) {
    if (products.length === 0) {
      return `Katalog toko ${tenant.name} belum diinput.`;
    }
    const list = products.map((p) => `${p.name} (${p.stock} pcs)`).join(", ");
    return `${list}.`;
  }

  if (query.includes("harga") || query.includes("berapaan") || query.includes("harganya")) {
    if (products.length === 0) return "Belum ada harga.";
    const priceList = products.map((p) => `${p.name} Rp ${(p.price / 1000).toFixed(0)}rb`).join(", ");
    return `${priceList}.`;
  }

  if (query.includes("ayam kampung") || query.includes("bebek") || query.includes("ikan") || query.includes("kambing") || query.includes("sapi")) {
    return `Gak ada ${title}, adanya produk ayam potong biasa.`;
  }

  if (query.includes("transfer") || query.includes("bukti") || query.includes("lunas") || query.includes("bayar") || query.includes("rekening")) {
    await handleAlihkanKeAdminTool(tenantId, conversationId, {
      reason: "PEMBAYARAN",
      summary: `Pelanggan mengonfirmasi pembayaran: "${userQuery}"`,
    });
    return `Sip ${title}, aku terusin ke owner toko ya. Ditunggu bentar!`;
  }

  const qtyMatch = query.match(/(\d+)/);
  const matched = products.find(
    (p) => query.includes(p.name.toLowerCase()) || p.name.toLowerCase().split(" ").some((w) => w.length > 2 && query.includes(w))
  );

  if ((query.includes("paha") || query.includes("dada")) && !matched) {
    return `Paha apa ${title}? Paha pentul (PP) atau paha utuh?`;
  }

  if (matched && qtyMatch) {
    const qty = parseInt(qtyMatch[1], 10);
    const res = await handleCatatPesananTool(tenantId, customerPhone, { items: [{ productName: matched.name, quantity: qty }] }, products);
    return `Sip ${title}, ${matched.name} ${qty} unit/pack.`;
  }

  if (matched && !qtyMatch) {
    return `Mau ${matched.name} berapa unit/pack ${title}?`;
  }

  if (query.includes("halo") || query.includes("hai") || query.includes("p") || query.includes("min")) {
    return `Halo ${title}, mau cari apa nih?`;
  }

  return `Buka. Ada yang mau dipesan ${title}?`;
}

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
