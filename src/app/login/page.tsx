"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPendingVerification, setIsPendingVerification] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setIsPendingVerification(false);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "Gagal melakukan login.");
        if (data.pendingVerification) {
          setIsPendingVerification(true);
        }
        setLoading(false);
        return;
      }

      router.push(data.redirectTo || "/dashboard");
      router.refresh();
    } catch (err) {
      setErrorMsg("Terjadi kesalahan jaringan. Silakan coba lagi.");
      setLoading(false);
    }
  };

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

        <Link href="/cara-pakai" className="text-xs font-semibold text-[#2F6A55] hover:underline">
          📖 Panduan Penggunaan
        </Link>
      </header>

      {/* Main Single Form Login Card */}
      <main className="max-w-md w-full mx-auto my-auto space-y-6">
        <div className="bg-white rounded-3xl border border-[#E2E0D8] p-8 shadow-sm space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-[#2F6A55]/10 text-[#2F6A55] flex items-center justify-center font-bold text-2xl mx-auto mb-3">
              🔑
            </div>
            <h2 className="text-2xl font-extrabold text-[#1F2A24] tracking-tight">Masuk ke Akun Anda</h2>
            <p className="text-xs text-[#6B7570]">
              Satu pintu masuk untuk Pemilik UMKM dan Super Admin Platform.
            </p>
          </div>

          {errorMsg && (
            <div
              className={`p-4 rounded-2xl text-xs font-medium leading-relaxed ${
                isPendingVerification
                  ? "bg-amber-50 border border-amber-200 text-amber-900"
                  : "bg-red-50 border border-red-200 text-red-700"
              }`}
            >
              <div className="flex items-start gap-2">
                <span className="text-base">{isPendingVerification ? "⏳" : "⚠️"}</span>
                <div>
                  <p className="font-bold mb-0.5">
                    {isPendingVerification ? "Menunggu Verifikasi Pembayaran" : "Gagal Masuk"}
                  </p>
                  <p>{errorMsg}</p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#1F2A24] mb-1.5">Email Terdaftar</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
                className="w-full px-4 py-3 text-sm bg-[#F5F3EE]/50 border border-[#E2E0D8] rounded-xl focus:outline-none focus:border-[#2F6A55] text-[#1F2A24]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1F2A24] mb-1.5">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 text-sm bg-[#F5F3EE]/50 border border-[#E2E0D8] rounded-xl focus:outline-none focus:border-[#2F6A55] text-[#1F2A24]"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 text-sm font-bold bg-[#2F6A55] text-white rounded-xl shadow-md hover:bg-[#265746] transition-all"
            >
              {loading ? "Memverifikasi..." : "Masuk Sekarang →"}
            </Button>
          </form>

          <div className="pt-4 border-t border-[#E2E0D8] text-center space-y-2">
            <p className="text-xs text-[#6B7570]">Belum punya akun UMKM?</p>
            <Link
              href="/daftar"
              className="inline-block text-xs font-bold text-[#2F6A55] hover:underline bg-[#2F6A55]/10 px-4 py-2 rounded-xl border border-[#2F6A55]/20"
            >
              ✨ Daftar & Beli Paket UMKM Sekarang →
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
