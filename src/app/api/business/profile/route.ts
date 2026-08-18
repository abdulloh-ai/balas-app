import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBusinessOwnerSession } from "@/lib/auth";

export async function GET() {
  const session = await getBusinessOwnerSession();
  if (!session) {
    return NextResponse.json({ error: "Akses ditolak. Silakan login." }, { status: 401 });
  }

  try {
    // Terisolasi: Hanya mengambil tenant milik session.tenantId
    const tenant = await prisma.tenant.findUnique({
      where: { id: session.tenantId },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Data bisnis tidak ditemukan." }, { status: 404 });
    }

    return NextResponse.json({
      tenant,
      user: session,
    });
  } catch (error) {
    console.error("GET Profile Error:", error);
    return NextResponse.json({ error: "Gagal mengambil profil bisnis." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const session = await getBusinessOwnerSession();
  if (!session) {
    return NextResponse.json({ error: "Akses ditolak. Silakan login." }, { status: 401 });
  }

  try {
    const { name, description, operatingHours, policies } = await request.json();

    if (!name) {
      return NextResponse.json({ error: "Nama bisnis wajib diisi." }, { status: 400 });
    }

    // Terisolasi Keras: Hanya update Tenant yang id-nya == session.tenantId
    const updatedTenant = await prisma.tenant.update({
      where: { id: session.tenantId },
      data: {
        name,
        description: description || null,
        operatingHours: operatingHours || null,
        policies: policies || null,
      },
    });

    return NextResponse.json({
      message: "Profil bisnis berhasil diperbarui!",
      tenant: updatedTenant,
    });
  } catch (error) {
    console.error("PUT Profile Error:", error);
    return NextResponse.json({ error: "Gagal memperbarui profil bisnis." }, { status: 500 });
  }
}
