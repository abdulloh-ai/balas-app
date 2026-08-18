import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBusinessOwnerSession } from "@/lib/auth";

export async function GET() {
  const session = await getBusinessOwnerSession();
  if (!session) {
    return NextResponse.json({ error: "Akses ditolak. Silakan login." }, { status: 401 });
  }

  try {
    const orders = await prisma.order.findMany({
      where: { tenantId: session.tenantId },
      orderBy: { createdAt: "desc" },
      include: {
        items: true,
      },
    });

    return NextResponse.json({ orders });
  } catch (error) {
    console.error("GET Orders Error:", error);
    return NextResponse.json({ error: "Gagal mengambil daftar pesanan." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await getBusinessOwnerSession();
  if (!session) {
    return NextResponse.json({ error: "Akses ditolak. Silakan login." }, { status: 401 });
  }

  try {
    const { orderId, action } = await request.json();

    if (!orderId || !["LUNAS", "DIBATALKAN"].includes(action)) {
      return NextResponse.json({ error: "Order ID dan aksi valid wajib diisi." }, { status: 400 });
    }

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        tenantId: session.tenantId,
      },
      include: { items: true },
    });

    if (!order) {
      return NextResponse.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });
    }

    if (action === "LUNAS") {
      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: { status: "LUNAS" },
        include: { items: true },
      });

      return NextResponse.json({
        message: "Pesanan berhasil ditandai LUNAS!",
        order: updatedOrder,
      });
    }

    if (action === "DIBATALKAN") {
      // Batalkan & kembalikan stok produk jika sebelumnya belum dibatalkan
      if (order.status !== "DIBATALKAN") {
        await prisma.$transaction(async (tx) => {
          await tx.order.update({
            where: { id: orderId },
            data: { status: "DIBATALKAN" },
          });

          // Kembalikan stok setiap produk
          for (const item of order.items) {
            if (item.productId) {
              await tx.product.update({
                where: { id: item.productId },
                data: {
                  stock: { increment: item.quantity },
                },
              });
            }
          }
        });
      }

      return NextResponse.json({
        message: "Pesanan berhasil dibatalkan dan stok produk telah dikembalikan!",
      });
    }
  } catch (error) {
    console.error("PATCH Order Error:", error);
    return NextResponse.json({ error: "Gagal memperbarui status pesanan." }, { status: 500 });
  }
}
