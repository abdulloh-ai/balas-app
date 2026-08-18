import { NextResponse } from "next/server";
import { clearBusinessSession } from "@/lib/auth";

export async function POST() {
  await clearBusinessSession();
  return NextResponse.json({ message: "Logout akun bisnis sukses." });
}
