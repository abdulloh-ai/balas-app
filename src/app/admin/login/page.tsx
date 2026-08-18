"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function AdminLoginPage() {
  const router = useRouter();
  const [hasOwner, setHasOwner] = useState<boolean | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  useEffect(() => {
    fetch("/api/admin/auth-status")
      .then((res) => res.json())
      .then((data) => {
        setHasOwner(data.exists);
        if (!data.exists) {
          setIsRegistering(true);
        }
      })
      .catch(() => setHasOwner(true));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setLoading(true);

    const endpoint = isRegistering ? "/api/admin/register" : "/api/admin/login";

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Terjadi kesalahan.");
      }

      setSuccessMsg(data.message);
      setTimeout(() => {
        router.push("/admin");
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
          <div className="w-12 h-12 rounded-2xl bg-[#2F6A55] text-white flex items-center justify-center font-bold text-2xl mx-auto shadow-sm">
            B
          </div>
          <h1 className="text-2xl font-extrabold text-[#1F2A24]">Balas Platform Owner</h1>
          <p className="text-xs text-[#6B7570]">
            {isRegistering
              ? "Registrasi Akun Pertama Super Admin Platform"
              : "Login Khusus Pengelola Platform SaaS"}
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

          {!hasOwner && hasOwner !== null && (
            <div className="mb-4 p-3 bg-[#B8863B]/10 border border-[#B8863B]/20 text-[#B8863B] text-xs rounded-xl">
              💡 Belum ada akun PlatformOwner terdaftar. Masukkan Email & Password yang Anda inginkan di bawah ini.
            </div>
          )}

          {hasOwner && !isRegistering && (
            <div className="mb-4 text-[#6B7570] text-xs text-center">
              🔒 Akses khusus Super Admin. Pendaftaran akun baru telah ditutup secara otomatis.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegistering && (
              <div>
                <label className="block text-xs font-bold text-[#1F2A24] mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Pemilik SaaS Balas"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#F5F3EE]/60 border border-[#E2E0D8] rounded-xl text-sm text-[#1F2A24] focus:outline-none focus:border-[#2F6A55]"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-[#1F2A24] mb-1">Email Platform Owner</label>
              <input
                type="email"
                required
                placeholder="email-anda@domain.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-[#F5F3EE]/60 border border-[#E2E0D8] rounded-xl text-sm text-[#1F2A24] focus:outline-none focus:border-[#2F6A55]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1F2A24] mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Masukkan password Anda"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full px-3.5 py-2.5 pr-20 bg-[#F5F3EE]/60 border border-[#E2E0D8] rounded-xl text-sm text-[#1F2A24] focus:outline-none focus:border-[#2F6A55]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 text-xs font-bold text-[#2F6A55] hover:bg-[#2F6A55]/10 rounded-lg transition-colors"
                >
                  {showPassword ? "Sembunyikan" : "Tampilkan"}
                </button>
              </div>
            </div>

            <Button variant="primary" type="submit" className="w-full py-3 mt-2" disabled={loading}>
              {loading
                ? "Memproses..."
                : isRegistering
                ? "Buat Akun PlatformOwner Pertama"
                : "Masuk ke Dashboard Admin"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
