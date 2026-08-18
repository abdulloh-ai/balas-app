import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { comparePassword, createSession } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email dan password wajib diisi." },
        { status: 400 }
      );
    }

    const platformOwner = await prisma.platformOwner.findUnique({
      where: { email },
    });

    if (!platformOwner) {
      return NextResponse.json(
        { error: "Email atau password salah." },
        { status: 401 }
      );
    }

    const isValid = await comparePassword(password, platformOwner.passwordHash);

    if (!isValid) {
      return NextResponse.json(
        { error: "Email atau password salah." },
        { status: 401 }
      );
    }

    await createSession({
      id: platformOwner.id,
      email: platformOwner.email,
      name: platformOwner.name,
    });

    return NextResponse.json({
      message: "Login sukses!",
      user: { id: platformOwner.id, email: platformOwner.email, name: platformOwner.name },
    });
  } catch (error) {
    console.error("Login Error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan saat login." }, { status: 500 });
  }
}
