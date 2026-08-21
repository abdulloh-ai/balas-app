import { NextResponse } from "next/server";
import { getBusinessOwnerSession } from "@/lib/auth";
import { disconnectWASession } from "@/lib/whatsapp";

export async function POST() {
  try {
    const session = await getBusinessOwnerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const state = await disconnectWASession(session.tenantId);
    return NextResponse.json({ message: "Koneksi WA berhasil diputuskan.", state });
  } catch (error) {
    console.error("WA Disconnect API Error:", error);
    return NextResponse.json({ error: "Gagal memutuskan koneksi WA." }, { status: 500 });
  }
}
