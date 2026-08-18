import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, createSession } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const count = await prisma.platformOwner.count();

    // Dibatasi: Hanya izinkan pendaftaran 1 akun PlatformOwner pertama
    if (count > 0) {
      return NextResponse.json(
        { error: "Akses registrasi ditutup. Akun PlatformOwner sudah terdaftar." },
        { status: 403 }
      );
    }

    const { email, password, name } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Email, nama, dan password wajib diisi." },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);

    const platformOwner = await prisma.platformOwner.create({
      data: {
        email,
        passwordHash,
        name,
      },
    });

    await createSession({
      id: platformOwner.id,
      email: platformOwner.email,
      name: platformOwner.name,
    });

    return NextResponse.json({
      message: "Akun PlatformOwner berhasil dibuat!",
      user: { id: platformOwner.id, email: platformOwner.email, name: platformOwner.name },
    });
  } catch (error) {
    console.error("Register Error:", error);
    return NextResponse.json({ error: "Gagal mendaftarkan PlatformOwner." }, { status: 500 });
  }
}
