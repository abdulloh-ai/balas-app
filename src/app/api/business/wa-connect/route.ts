import { NextResponse } from "next/server";
import { getBusinessOwnerSession } from "@/lib/auth";
import { initWASession } from "@/lib/whatsapp";

export async function POST() {
  try {
    const session = await getBusinessOwnerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const state = await initWASession(session.tenantId);
    return NextResponse.json({ message: "Inisialisasi koneksi WA...", state });
  } catch (error) {
    console.error("WA Connect API Error:", error);
    return NextResponse.json({ error: "Gagal memulai koneksi WA." }, { status: 500 });
  }
}
