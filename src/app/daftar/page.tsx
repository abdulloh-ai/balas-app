"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

interface PlanItem {
  id: string;
  name: string;
  price: number;
  period: string;
  description: string;
  features: string;
}

export default function DaftarPage() {
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string>("STARTER");
  const [loadingPlans, setLoadingPlans] = useState(true);

  // Form State
  const [businessName, setBusinessName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [whatsapp, setWhatsapp] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Confirmation view state after submit
  const [registrationData, setRegistrationData] = useState<{
    tenantId: string;
    businessName: string;
    ownerName: string;
    email: string;
    whatsapp: string;
    plan: string;
  } | null>(null);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const res = await fetch("/api/plans");
      const data = await res.json();
      if (data.plans && data.plans.length > 0) {
        setPlans(data.plans);
        setSelectedPlan(data.plans[0].name);
      } else {
        setPlans([
          {
            id: "1",
            name: "Balas",
            price: 199000,
            period: "bulan",
            description: "Seluruh fitur otomatisasi WhatsApp & rekap bisnis dalam 1 paket terjangkau.",
            features: "1 Nomor WhatsApp, Chat Tanpa Batas, Rekap Pesanan Otomatis",
          },
        ]);
        setSelectedPlan("Balas");
      }
    } catch (err) {
      console.error("Fetch plans error:", err);
    } finally {
      setLoadingPlans(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    if (password.length < 8) {
      setErrorMsg("Password minimal 8 karakter.");
      setSubmitting(false);
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg("Konfirmasi password tidak cocok dengan password di atas.");
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName,
          name,
          email,
          password,
          confirmPassword,
          whatsapp,
          planName: selectedPlan,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "Gagal melakukan pendaftaran.");
        setSubmitting(false);
        return;
      }

      setRegistrationData(data.registration);
    } catch (err) {
      setErrorMsg("Terjadi kesalahan jaringan. Silakan coba lagi.");
    } finally {
      setSubmitting(false);
    }
  };

  // IF SUBMITTED: SHOW CONFIRMATION PAGE WITH MANUAL PAYMENT INSTRUCTIONS
  if (registrationData) {
    return (
      <div className="min-h-screen bg-[#F5F3EE] text-[#1F2A24] flex flex-col justify-between p-6 md:p-12">
        <header className="max-w-xl w-full mx-auto flex justify-between items-center pb-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#2F6A55] text-white flex items-center justify-center font-bold text-xl">
              B
            </div>
            <span className="text-2xl font-extrabold tracking-tight text-[#1F2A24]">Balas</span>
          </Link>
        </header>

        <main className="max-w-xl w-full mx-auto my-auto space-y-6">
          <div className="bg-white rounded-3xl border border-[#E2E0D8] p-8 shadow-sm space-y-6 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-[#2F6A55] flex items-center justify-center font-bold text-3xl mx-auto">
              ✓
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl md:text-3xl font-extrabold text-[#1F2A24] tracking-tight">
                Pendaftaran Berhasil!
              </h1>
              <p className="text-xs text-[#6B7570] max-w-md mx-auto leading-relaxed">
                Terima kasih, <strong>{registrationData.ownerName}</strong>! Akun untuk toko{" "}
                <strong>{registrationData.businessName}</strong> telah berhasil dibuat.
              </p>
            </div>

            {/* Rekening Pembayaran Manual */}
            <div className="bg-[#F5F3EE] p-6 rounded-2xl border border-[#E2E0D8] text-left space-y-4">
              <div className="flex items-center justify-between border-b border-[#E2E0D8] pb-3">
                <span className="text-xs font-bold text-[#2F6A55] uppercase tracking-wider">
                  Instruksi Pembayaran Manual
                </span>
                <span className="px-2.5 py-1 bg-amber-100 text-amber-800 font-bold text-[10px] rounded-full">
                  Menunggu Verifikasi
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <p className="text-[#6B7570]">
                  Silakan lakukan transfer pembayaran biaya berlangganan paket{" "}
                  <strong className="text-[#1F2A24]">{registrationData.plan}</strong> ke rekening resmi berikut:
                </p>

                <div className="p-4 bg-white rounded-xl border border-[#E2E0D8] font-mono space-y-1">
                  <div className="text-[#6B7570] text-[11px]">Bank BCA (PT Balas Solusi UMKM)</div>
                  <div className="text-lg font-bold text-[#1F2A24]">1234 - 5678 - 90</div>
                  <div className="text-[11px] text-[#2F6A55] font-sans font-medium">
                    Atas Nama: Hanif Abdulloh (Platform Owner)
                  </div>
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 leading-relaxed font-medium">
                  💬 <strong>Pesan:</strong> &ldquo;Akun akan aktif setelah pembayaran kami verifikasi, biasanya dalam 1x24 jam.&rdquo;
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <a
                href={`https://wa.me/6281234567890?text=Halo%20Admin%20Balas,%20saya%20sudah%20melakukan%20pendaftaran%20toko%20${encodeURIComponent(
                  registrationData.businessName
                )}%20(${encodeURIComponent(registrationData.email)})%20dan%20ingin%20mengirimkan%20bukti%20pembayaran.`}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full"
              >
                <Button className="w-full py-3.5 text-sm font-bold bg-[#2F6A55] text-white rounded-xl shadow-md hover:bg-[#265746] flex items-center justify-center gap-2">
                  <span>💬 Kirim Bukti Transfer via WhatsApp Admin</span>
                </Button>
              </a>

              <Link href="/login" className="block w-full">
                <Button variant="secondary" className="w-full py-3 text-xs font-bold rounded-xl">
                  Ke Halaman Login →
                </Button>
              </Link>
            </div>
          </div>
        </main>

        <footer className="max-w-xl w-full mx-auto pt-6 text-center text-xs text-[#6B7570]">
          Balas SaaS Platform © 2026 — Dibuat untuk pemilik usaha yang capek bales chat sendirian.
        </footer>
      </div>
    );
  }

  // REGISTRATION FORM VIEW
  return (
    <div className="min-h-screen bg-[#F5F3EE] text-[#1F2A24] flex flex-col justify-between p-6 md:p-12">
      {/* Header */}
      <header className="max-w-4xl w-full mx-auto flex justify-between items-center pb-6 border-b border-[#E2E0D8]">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-[#2F6A55] text-white flex items-center justify-center font-bold text-xl">
            B
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-[#1F2A24] leading-none">Balas</h1>
            <p className="text-xs text-[#6B7570] font-medium mt-0.5">Daftar Akun UMKM Baru</p>
          </div>
        </Link>

        <div className="flex items-center gap-4 text-xs font-bold">
          <Link href="/login" className="text-[#1F2A24] hover:underline">
            Sudah Ada Akun? Login →
          </Link>
        </div>
      </header>

      {/* Main Form */}
      <main className="max-w-4xl w-full mx-auto py-10 space-y-8">
        <div className="text-center space-y-3 max-w-xl mx-auto">
          <span className="px-3.5 py-1 bg-[#2F6A55]/10 text-[#2F6A55] text-xs font-bold rounded-full border border-[#2F6A55]/20">
            ✨ Pendaftaran Mandiri UMKM
          </span>
          <h1 className="text-3xl md:text-4xl font-extrabold text-[#1F2A24] tracking-tight">
            Mulai Otomatisasi WhatsApp Tokomu
          </h1>
          <p className="text-xs md:text-sm text-[#6B7570]">
            Isi formulir di bawah ini, pilih paket berlangganan, dan aktifkan admin AI toko Anda.
          </p>
        </div>

        {errorMsg && (
          <div className="max-w-2xl mx-auto p-4 bg-red-50 border border-red-200 text-red-700 text-xs font-medium rounded-2xl">
            ⚠️ {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-8">
          {/* STEP 1: PILIH PAKET BERLANGGANAN */}
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-[#E2E0D8] space-y-4 shadow-sm">
            <h2 className="text-lg font-bold text-[#1F2A24] flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#2F6A55] text-white text-xs flex items-center justify-center">
                1
              </span>
              Paket Berlangganan
            </h2>

            <div className="p-5 rounded-2xl border border-[#2F6A55] bg-[#2F6A55]/5 ring-2 ring-[#2F6A55]/30 space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-bold text-base text-[#1F2A24]">Balas</span>
                <span className="px-2.5 py-0.5 bg-[#2F6A55] text-white text-[10px] font-bold rounded-full">
                  Paket Lengkap UMKM
                </span>
              </div>
              <p className="text-xs text-[#6B7570]">
                Seluruh fitur otomatisasi WhatsApp & rekap bisnis dalam 1 paket terjangkau.
              </p>

              <div className="pt-2 border-t border-[#E2E0D8]">
                <span className="text-xl font-extrabold text-[#1F2A24] font-mono">
                  Rp 199.000
                </span>
                <span className="text-[11px] text-[#6B7570]"> /bulan</span>
              </div>
            </div>
          </div>

          {/* STEP 2: ISI DATA DIRI & TOKO */}
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-[#E2E0D8] space-y-4 shadow-sm">
            <h2 className="text-lg font-bold text-[#1F2A24] flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#2F6A55] text-white text-xs flex items-center justify-center">
                2
              </span>
              Informasi Toko & Akun Login
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-[#1F2A24] mb-1.5">Nama Bisnis / Toko *</label>
                <input
                  type="text"
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Contoh: Katering Mama Dian"
                  className="w-full px-4 py-3 bg-[#F5F3EE]/50 border border-[#E2E0D8] rounded-xl text-xs text-[#1F2A24] focus:outline-none focus:border-[#2F6A55]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#1F2A24] mb-1.5">Nama Pemilik / PIC *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Dian Sastro"
                  className="w-full px-4 py-3 bg-[#F5F3EE]/50 border border-[#E2E0D8] rounded-xl text-xs text-[#1F2A24] focus:outline-none focus:border-[#2F6A55]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#1F2A24] mb-1.5">
                  Email (Username Login) *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="dian@mamadian.com"
                  className="w-full px-4 py-3 bg-[#F5F3EE]/50 border border-[#E2E0D8] rounded-xl text-xs text-[#1F2A24] focus:outline-none focus:border-[#2F6A55]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#1F2A24] mb-1.5">
                  Nomor WhatsApp Kontak Pemilik *
                </label>
                <input
                  type="tel"
                  required
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="081234567890 (Untuk dihubungi Admin Platform)"
                  className="w-full px-4 py-3 bg-[#F5F3EE]/50 border border-[#E2E0D8] rounded-xl text-xs text-[#1F2A24] focus:outline-none focus:border-[#2F6A55]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#1F2A24] mb-1.5">Password (Min. 8 karakter) *</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-[#F5F3EE]/50 border border-[#E2E0D8] rounded-xl text-xs text-[#1F2A24] focus:outline-none focus:border-[#2F6A55]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#1F2A24] mb-1.5">Konfirmasi Password *</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-[#F5F3EE]/50 border border-[#E2E0D8] rounded-xl text-xs text-[#1F2A24] focus:outline-none focus:border-[#2F6A55]"
                />
              </div>
            </div>
          </div>

          <Button
            type="submit"
            disabled={submitting}
            className="w-full py-4 text-sm font-bold bg-[#2F6A55] text-white rounded-2xl shadow-lg hover:bg-[#265746] transition-all"
          >
            {submitting ? "Memproses Pendaftaran..." : "Daftar & Lanjut Pembayaran →"}
          </Button>
        </form>
      </main>

      {/* Footer */}
      <footer className="max-w-4xl w-full mx-auto pt-6 text-center text-xs text-[#6B7570] border-t border-[#E2E0D8]">
        Balas SaaS Platform © 2026 — Dibuat untuk pemilik usaha yang capek bales chat sendirian.
      </footer>
    </div>
  );
}
