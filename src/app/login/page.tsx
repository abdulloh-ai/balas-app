"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function LoginSelectorPage() {
  return (
    <div className="min-h-screen bg-[#F5F3EE] flex flex-col justify-between p-6 md:p-12 text-[#1F2A24]">
      {/* Top Header */}
      <header className="max-w-md w-full mx-auto flex justify-between items-center pb-6">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-[#2F6A55] text-white flex items-center justify-center font-bold text-xl tracking-wider shadow-sm">
            B
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-[#1F2A24] leading-none">Balas</h1>
            <p className="text-xs text-[#6B7570] font-medium mt-0.5">Admin AI WhatsApp UMKM</p>
          </div>
        </Link>
        <Link href="/" className="text-xs font-medium text-[#2F6A55] hover:underline">
          ← Kembali ke Beranda
        </Link>
      </header>

      {/* Login Role Selector Card */}
      <main className="max-w-md w-full mx-auto my-auto space-y-6">
        <div className="bg-white rounded-3xl border border-[#E2E0D8] p-8 shadow-sm text-center space-y-6">
          <div className="w-12 h-12 rounded-2xl bg-[#2F6A55]/10 text-[#2F6A55] flex items-center justify-center font-bold text-2xl mx-auto">
            🔑
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-[#1F2A24] tracking-tight">Pilih Pintu Masuk</h2>
            <p className="text-xs text-[#6B7570] leading-relaxed">
              Silakan pilih portal masuk sesuai dengan peran Anda di platform Balas.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            {/* Tombol 1: Saya Pemilik UMKM */}
            <Link href="/dashboard/login" className="block w-full">
              <Button
                variant="primary"
                className="w-full py-4 text-sm font-bold bg-[#2F6A55] text-white rounded-2xl shadow-sm hover:bg-[#265746] transition-all flex items-center justify-center gap-2"
              >
                <span>🏪 Saya Pemilik UMKM</span>
                <span>→</span>
              </Button>
            </Link>

            {/* Tombol 2: Saya Pemilik Platform */}
            <Link href="/admin/login" className="block w-full">
              <Button
                variant="secondary"
                className="w-full py-4 text-sm font-bold bg-white text-[#1F2A24] border border-[#E2E0D8] rounded-2xl hover:border-[#2F6A55] transition-all flex items-center justify-center gap-2"
              >
                <span>👑 Saya Pemilik Platform</span>
                <span>→</span>
              </Button>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-md w-full mx-auto pt-6 text-center text-xs text-[#6B7570]">
        Balas SaaS Platform © 2026 — Dibuat untuk pemilik usaha yang capek bales chat sendirian.
      </footer>
    </div>
  );
}
