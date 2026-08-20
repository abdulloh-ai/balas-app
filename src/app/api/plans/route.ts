import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const plans = await prisma.plan.findMany({
      orderBy: { price: "asc" },
    });

    return NextResponse.json({ plans });
  } catch (error) {
    console.error("GET Plans Error:", error);
    return NextResponse.json({ error: "Gagal mengambil data paket harga." }, { status: 500 });
  }
}
