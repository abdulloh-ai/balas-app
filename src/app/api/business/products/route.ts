import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBusinessOwnerSession } from "@/lib/auth";

export async function GET() {
  const session = await getBusinessOwnerSession();
  if (!session) {
    return NextResponse.json({ error: "Akses ditolak. Silakan login." }, { status: 401 });
  }

  try {
    // Isolasi Keras: Hanya mengambil produk milik session.tenantId
    const products = await prisma.product.findMany({
      where: { tenantId: session.tenantId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      products,
      user: session,
    });
  } catch (error) {
    console.error("GET Products Error:", error);
    return NextResponse.json({ error: "Gagal mengambil data produk." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getBusinessOwnerSession();
  if (!session) {
    return NextResponse.json({ error: "Akses ditolak. Silakan login." }, { status: 401 });
  }

  try {
    const { name, price, stock, description, imageUrl } = await request.json();

    if (!name || price === undefined || price < 0) {
      return NextResponse.json(
        { error: "Nama dan harga produk valid wajib diisi." },
        { status: 400 }
      );
    }

    // Isolasi Otomatis: tenantId DIAMBIL DARI SESI LOGIN, bukan dari body request frontend!
    const product = await prisma.product.create({
      data: {
        tenantId: session.tenantId,
        name,
        price: Number(price),
        stock: Number(stock) || 0,
        description: description || null,
        imageUrl: imageUrl || null,
      },
    });

    return NextResponse.json({
      message: "Produk berhasil ditambahkan!",
      product,
    });
  } catch (error) {
    console.error("POST Product Error:", error);
    return NextResponse.json({ error: "Gagal menambahkan produk." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await getBusinessOwnerSession();
  if (!session) {
    return NextResponse.json({ error: "Akses ditolak. Silakan login." }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID produk wajib disertakan." }, { status: 400 });
    }

    // Proteksi Lapis Ganda: Hapus HANYA jika ID produk DAN tenantId cocok dengan sesi!
    const count = await prisma.product.deleteMany({
      where: {
        id,
        tenantId: session.tenantId,
      },
    });

    if (count.count === 0) {
      return NextResponse.json(
        { error: "Produk tidak ditemukan atau tidak memiliki akses." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Produk berhasil dihapus!",
    });
  } catch (error) {
    console.error("DELETE Product Error:", error);
    return NextResponse.json({ error: "Gagal menghapus produk." }, { status: 500 });
  }
}
