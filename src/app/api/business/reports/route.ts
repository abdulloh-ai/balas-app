import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBusinessOwnerSession } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await getBusinessOwnerSession();
  if (!session) {
    return NextResponse.json({ error: "Akses ditolak. Silakan login." }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "month"; // 'today', 'week', 'month', 'all'
    const lowStockThreshold = parseInt(searchParams.get("threshold") || "5", 10);

    const now = new Date();
    let startDateFilter: Date | null = null;

    if (period === "today") {
      startDateFilter = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (period === "week") {
      startDateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === "month") {
      startDateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const orderWhere: any = {
      tenantId: session.tenantId,
      status: "LUNAS",
    };

    if (startDateFilter) {
      orderWhere.createdAt = { gte: startDateFilter };
    }

    // 1. Total Pendapatan dari Pesanan Status Lunas
    const paidOrders = await prisma.order.findMany({
      where: orderWhere,
      select: { totalAmount: true },
    });

    const totalRevenue = paidOrders.reduce((sum, order) => sum + order.totalAmount, 0);

    // 2. Jumlah Pesanan Menunggu Pembayaran
    const pendingOrdersCount = await prisma.order.count({
      where: {
        tenantId: session.tenantId,
        status: "MENUNGGU_PEMBAYARAN",
      },
    });

    // 3. Jumlah Eskalasi Belum Selesai
    const unresolvedEscalationsCount = await prisma.escalation.count({
      where: {
        tenantId: session.tenantId,
        status: "BELUM_SELESAI",
      },
    });

    // 4. Daftar Produk Stok Menipis (stok <= threshold)
    const lowStockProducts = await prisma.product.findMany({
      where: {
        tenantId: session.tenantId,
        stock: { lte: lowStockThreshold },
      },
      orderBy: { stock: "asc" },
    });

    return NextResponse.json({
      period,
      totalRevenue,
      paidOrdersCount: paidOrders.length,
      pendingOrdersCount,
      unresolvedEscalationsCount,
      lowStockThreshold,
      lowStockProducts,
    });
  } catch (error) {
    console.error("GET Business Reports Error:", error);
    return NextResponse.json({ error: "Gagal mengambil data laporan bisnis." }, { status: 500 });
  }
}
