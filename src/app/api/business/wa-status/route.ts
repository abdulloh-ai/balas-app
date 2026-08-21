import { NextResponse } from "next/server";
import { getBusinessOwnerSession } from "@/lib/auth";
import { getWASessionState } from "@/lib/whatsapp";

export async function GET() {
  try {
    const session = await getBusinessOwnerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const state = await getWASessionState(session.tenantId);
    return NextResponse.json({ state });
  } catch (error) {
    console.error("WA Status API Error:", error);
    return NextResponse.json({ error: "Gagal mengambil status WA." }, { status: 500 });
  }
}
