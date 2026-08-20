import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { name, businessName, whatsapp } = await request.json();

    if (!name || !businessName || !whatsapp) {
      return NextResponse.json(
        { error: "Nama, Nama Bisnis, dan Nomor WhatsApp wajib diisi." },
        { status: 400 }
      );
    }

    const demoReq = await prisma.demoRequest.create({
      data: {
        name: name.trim(),
        businessName: businessName.trim(),
        whatsapp: whatsapp.trim(),
        status: "PENDING",
      },
    });

    return NextResponse.json({
      message: "Permintaan demo berhasil dikirim! Tim Balas akan segera menghubungi Anda.",
      demoReq,
    });
  } catch (error) {
    console.error("POST DemoRequest Error:", error);
    return NextResponse.json(
      { error: "Gagal mengirim permintaan demo." },
      { status: 500 }
    );
  }
}
