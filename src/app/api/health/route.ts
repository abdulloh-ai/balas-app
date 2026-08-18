import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    app: "Balas SaaS Platform",
    version: "0.1.0-alpha",
    timestamp: new Date().toISOString(),
  });
}
