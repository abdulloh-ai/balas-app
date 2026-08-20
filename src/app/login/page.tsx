"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function UnifiedLoginPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form Login State
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Form Register State
  const [regBusinessName, setRegBusinessName] = useState("");
  const [regOwnerName, setRegOwnerName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "Gagal masuk. Silakan cek email & password.");
        setLoading(false);
        return;
      }

      setSuccessMsg(`${data.message} Mengalihkan ke ${data.redirectTo}...`);

      setTimeout(() => {
        router.push(data.redirectTo);
        router.refresh();
      }, 800);
    } catch (err) {
      setErrorMsg("Terjadi kesalahan jaringan. Coba lagi.");
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: regBusinessName,
          name: regOwnerName,
          email: regEmail,
          password: regPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "Gagal mendaftar.");
        setLoading(false);
        return;
      }

      setSuccessMsg(`${data.message} Mengalihkan ke Dashboard Bisnis...`);

      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 800);
    } catch (err) {
      setErrorMsg("Terjadi kesalahan jaringan saat mendaftar.");
      setLoading(false);
    }
  };

  const fillSuperAdminCredentials = () => {
    setLoginEmail("hanifabdullohhanifabdulloh@gmail.com");
    setLoginPassword("hanif260822");
    setActiveTab("login");
  };

  return (
    <div className="min-h-screen bg-[#F5F3EE] flex flex-col justify-between p-4 md:p-8 text-[#1F2A24]">
      {/* Header Brand */}
      <header className="max-w-md w-full mx-auto flex justify-between items-center pb-6">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-[#2F6A55] text-white flex items-center justify-center font-bold text-xl tracking-wider shadow-sm group-hover:scale-105 transition-all">
            B
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-[#1F2A24] leading-none">Balas</h1>
            <p className="text-xs text-[#6B7570] font-medium mt-0.5">SaaS Operasional WA UMKM</p>
          </div>
        </Link>
        <Link href="/" className="text-xs font-medium text-[#2F6A55] hover:underline">
          ← Kembali ke Beranda
        </Link>
      </header>

      {/* Main Login Card */}
      <main className="max-w-md w-full mx-auto my-auto">
        <div className="bg-white rounded-3xl border border-[#E2E0D8] p-6 md:p-8 shadow-sm space-y-6">
          {/* Tab Switcher: Login vs Register */}
          <div className="flex bg-[#F5F3EE] p-1 rounded-2xl border border-[#E2E0D8]">
            <button
              onClick={() => {
                setActiveTab("login");
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${
                activeTab === "login"
                  ? "bg-white text-[#1F2A24] shadow-sm"
                  : "text-[#6B7570] hover:text-[#1F2A24]"
              }`}
            >
              🔑 Masuk (Login)
            </button>
            <button
              onClick={() => {
                setActiveTab("register");
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${
                activeTab === "register"
                  ? "bg-[#2F6A55] text-white shadow-sm"
                  : "text-[#6B7570] hover:text-[#1F2A24]"
              }`}
            >
              ✨ Daftar Akun UMKM
            </button>
          </div>

          {/* Feedback Messages */}
          {errorMsg && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs font-medium rounded-xl leading-relaxed">
              ⚠️ {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-[#2F6A55] text-xs font-medium rounded-xl leading-relaxed animate-pulse">
              ✅ {successMsg}
            </div>
          )}

          {/* TAB 1: FORM LOGIN (UNIFIED ROLE DETECTION) */}
          {activeTab === "login" && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-[#1F2A24]">Selamat Datang Kembali</h2>
                <p className="text-xs text-[#6B7570]">
                  Sistem otomatis mengarahkan Anda ke Dashboard UMKM atau Panel Super Admin sesuai akun.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-[#1F2A24] mb-1.5">Email Akun</label>
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="nama@email.com"
                    className="w-full px-4 py-2.5 text-sm bg-[#F5F3EE] border border-[#E2E0D8] rounded-xl focus:outline-none focus:border-[#2F6A55] text-[#1F2A24]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1F2A24] mb-1.5">Password</label>
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 text-sm bg-[#F5F3EE] border border-[#E2E0D8] rounded-xl focus:outline-none focus:border-[#2F6A55] text-[#1F2A24]"
                  />
                </div>
              </div>

              <Button type="submit" disabled={loading} className="w-full py-3 text-sm font-bold mt-2">
                {loading ? "Memproses..." : "Masuk ke Aplikasi →"}
              </Button>

              {/* Demo Helper Button */}
              <div className="pt-2 border-t border-[#E2E0D8] text-center">
                <button
                  type="button"
                  onClick={fillSuperAdminCredentials}
                  className="text-xs text-[#2F6A55] font-semibold hover:underline"
                >
                  💡 Klik di sini untuk isi otomatis Kredensial Super Admin / Demo
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: FORM REGISTER MANDIRI UMKM */}
          {activeTab === "register" && (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-[#1F2A24]">Daftarkan UMKM Anda</h2>
                <p className="text-xs text-[#6B7570]">
                  Gratis pembuatan akun awal. Siap melayani chat WA 24/7 dan rekap omset toko Anda.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-[#1F2A24] mb-1.5">Nama Toko / Bisnis UMKM</label>
                  <input
                    type="text"
                    required
                    value={regBusinessName}
                    onChange={(e) => setRegBusinessName(e.target.value)}
                    placeholder="Contoh: Toko Katering Berkah"
                    className="w-full px-4 py-2.5 text-sm bg-[#F5F3EE] border border-[#E2E0D8] rounded-xl focus:outline-none focus:border-[#2F6A55] text-[#1F2A24]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1F2A24] mb-1.5">Nama Anda (Pemilik Toko)</label>
                  <input
                    type="text"
                    required
                    value={regOwnerName}
                    onChange={(e) => setRegOwnerName(e.target.value)}
                    placeholder="Contoh: Rani Novita"
                    className="w-full px-4 py-2.5 text-sm bg-[#F5F3EE] border border-[#E2E0D8] rounded-xl focus:outline-none focus:border-[#2F6A55] text-[#1F2A24]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1F2A24] mb-1.5">Email Login</label>
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="rani@toko.com"
                    className="w-full px-4 py-2.5 text-sm bg-[#F5F3EE] border border-[#E2E0D8] rounded-xl focus:outline-none focus:border-[#2F6A55] text-[#1F2A24]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1F2A24] mb-1.5">Buat Password</label>
                  <input
                    type="password"
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="w-full px-4 py-2.5 text-sm bg-[#F5F3EE] border border-[#E2E0D8] rounded-xl focus:outline-none focus:border-[#2F6A55] text-[#1F2A24]"
                  />
                </div>
              </div>

              <Button type="submit" disabled={loading} variant="primary" className="w-full py-3 text-sm font-bold mt-2 bg-[#2F6A55]">
                {loading ? "Mendaftarkan..." : "✨ Buat Akun & Masuk Dashboard"}
              </Button>
            </form>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-md w-full mx-auto pt-6 text-center text-xs text-[#6B7570]">
        Balas SaaS Platform © 2026 — Desain & Operasional Khusus UMKM Indonesia
      </footer>
    </div>
  );
}
