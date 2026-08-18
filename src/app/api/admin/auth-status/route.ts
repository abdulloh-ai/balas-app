import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const count = await prisma.platformOwner.count();
    return NextResponse.json({
      exists: count > 0,
      count,
    });
  } catch (error) {
    return NextResponse.json({ error: "Gagal mengecek status autentikasi" }, { status: 500 });
  }
}
