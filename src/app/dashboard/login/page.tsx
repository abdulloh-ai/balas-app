"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function BusinessLoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setLoading(true);

    try {
      const res = await fetch("/api/business/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Terjadi kesalahan saat login.");
      }

      setSuccessMsg(`Selamat datang, ${data.user.name} (${data.user.tenantName})!`);
      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F3EE] text-[#1F2A24] flex items-center justify-center p-6">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-[#B8863B] text-white flex items-center justify-center font-bold text-2xl mx-auto shadow-sm">
            🏪
          </div>
          <h1 className="text-2xl font-extrabold text-[#1F2A24]">Balas Business Owner</h1>
          <p className="text-xs text-[#6B7570]">
            Portal Login Pemilik & Pengelola Toko UMKM
          </p>
        </div>

        <Card className="border-[#E2E0D8]">
          {error && (
            <div className="mb-4 p-3 bg-[#B8483F]/10 border border-[#B8483F]/20 text-[#B8483F] text-xs font-semibold rounded-xl">
              ⚠️ {error}
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 bg-[#2F6A55]/10 border border-[#2F6A55]/20 text-[#2F6A55] text-xs font-semibold rounded-xl">
              ✅ {successMsg}
            </div>
          )}

          <div className="mb-4 p-3 bg-[#F5F3EE] border border-[#E2E0D8] text-[#6B7570] text-xs rounded-xl">
            💡 Masukkan email dan password akun bisnis yang diberikan oleh Platform Owner SaaS Balas.
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#1F2A24] mb-1">Email Pemilik UMKM</label>
              <input
                type="email"
                required
                placeholder="email-toko@domain.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-[#F5F3EE]/60 border border-[#E2E0D8] rounded-xl text-sm text-[#1F2A24] focus:outline-none focus:border-[#B8863B]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1F2A24] mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Masukkan password bisnis Anda"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full px-3.5 py-2.5 pr-20 bg-[#F5F3EE]/60 border border-[#E2E0D8] rounded-xl text-sm text-[#1F2A24] focus:outline-none focus:border-[#B8863B]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 text-xs font-bold text-[#B8863B] hover:bg-[#B8863B]/10 rounded-lg transition-colors"
                >
                  {showPassword ? "Sembunyikan" : "Tampilkan"}
                </button>
              </div>
            </div>

            <Button variant="secondary" type="submit" className="w-full py-3 mt-2 bg-[#B8863B] hover:bg-[#996F2F]" disabled={loading}>
              {loading ? "Memproses..." : "Masuk ke Dashboard Toko"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
