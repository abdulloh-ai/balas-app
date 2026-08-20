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
  isPopular: boolean;
}

export default function LandingPageClient() {
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);

  // Form State Kontak Demo
  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const res = await fetch("/api/plans");
      const data = await res.json();
      if (data.plans && data.plans.length > 0) {
        setPlans(data.plans);
      } else {
        // Fallback jika DB kosong
        setPlans([
          {
            id: "1",
            name: "Starter",
            price: 149000,
            period: "bulan",
            description: "Cocok untuk warung & toko online mikro yang baru mulai.",
            features:
              "1 Nomor WhatsApp,Hingga 500 Chat/Bulan,Katalog & Stok Sederhana,Rekap Pesanan Otomatis,Dukungan Eskalasi Penanganan",
            isPopular: true,
          },
          {
            id: "2",
            name: "Pro",
            price: 299000,
            period: "bulan",
            description: "Untuk toko online aktif dengan volume chat harian tinggi.",
            features:
              "2 Nomor WhatsApp,Chat Tanpa Batas,Katalog & Stok Tanpa Batas,Rekap Keuangan & Laporan PDF,Prioritas Support 24/7",
            isPopular: false,
          },
        ]);
      }
    } catch (err) {
      console.error("Gagal mengambil data paket:", err);
    } finally {
      setLoadingPlans(false);
    }
  };

  const handleDemoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormSuccess(null);
    setFormError(null);

    try {
      const res = await fetch("/api/demo-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, businessName, whatsapp }),
      });

      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error || "Gagal mengirim formulir.");
        setSubmitting(false);
        return;
      }

      setFormSuccess(data.message || "Permintaan demo berhasil dikirim!");
      setName("");
      setBusinessName("");
      setWhatsapp("");
    } catch (err) {
      setFormError("Terjadi kesalahan jaringan. Silakan coba lagi.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F3EE] text-[#1F2A24] font-sans antialiased selection:bg-[#2F6A55] selection:text-white">
      {/* 1. NAVIGASI ATAS */}
      <header className="sticky top-0 z-50 bg-[#F5F3EE]/90 backdrop-blur-md border-b border-[#E2E0D8]">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-[#2F6A55] text-white flex items-center justify-center font-bold text-xl tracking-wider shadow-sm">
              B
            </div>
            <span className="text-2xl font-extrabold tracking-tight text-[#1F2A24] font-heading">
              Balas
            </span>
          </Link>

          <Link href="/login">
            <Button className="px-5 py-2.5 text-xs font-bold bg-white text-[#1F2A24] border border-[#E2E0D8] rounded-xl hover:border-[#2F6A55] hover:text-[#2F6A55] transition-all shadow-sm">
              Masuk →
            </Button>
          </Link>
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section className="py-20 md:py-28 px-6 max-w-5xl mx-auto text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#2F6A55]/10 text-[#2F6A55] border border-[#2F6A55]/20 text-xs font-bold uppercase tracking-wider">
          <span className="w-2 h-2 rounded-full bg-[#2F6A55] animate-pulse"></span>
          Asisten AI WhatsApp UMKM Indonesia
        </div>

        <h1 className="text-4xl md:text-6xl font-extrabold text-[#1F2A24] tracking-tight leading-[1.15] font-heading max-w-4xl mx-auto">
          Chat pelanggan kejawab, meski kamu lagi masak.
        </h1>

        <p className="text-lg md:text-xl text-[#6B7570] max-w-3xl mx-auto leading-relaxed">
          Balas adalah admin AI yang menjawab chat WhatsApp pelangganmu — harga, stok, jam buka — hanya dari data yang kamu isi sendiri. Bukan ngarang, bukan robot kaku.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <a href="#kontak" className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto px-8 py-4 text-sm font-bold bg-[#2F6A55] text-white rounded-2xl shadow-lg hover:bg-[#265746] transition-all transform hover:-translate-y-0.5">
              Hubungi Kami untuk Coba Gratis
            </Button>
          </a>
          <a href="#cara-kerja" className="w-full sm:w-auto">
            <Button variant="secondary" className="w-full sm:w-auto px-8 py-4 text-sm font-bold bg-white text-[#1F2A24] border border-[#E2E0D8] rounded-2xl hover:border-[#2F6A55] transition-all">
              Lihat Cara Kerjanya ↓
            </Button>
          </a>
        </div>
      </section>

      {/* 3. BAGIAN MASALAH */}
      <section className="py-16 md:py-24 px-6 bg-white border-y border-[#E2E0D8]">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <h2 className="text-3xl md:text-4xl font-extrabold text-[#1F2A24] tracking-tight font-heading">
              Chat menumpuk, tapi kamu cuma satu orang.
            </h2>
            <p className="text-sm text-[#6B7570]">
              Masalah nyata yang dihadapi ribuan pemilik usaha mikro tiap hari:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#F5F3EE] p-6 rounded-3xl border border-[#E2E0D8] space-y-4 flex flex-col justify-between">
              <p className="text-sm text-[#1F2A24] leading-relaxed italic">
                &ldquo;Pelanggan tanya jam 11 malam, saya baru bales pagi. Keburu dia beli di tempat lain.&rdquo;
              </p>
              <div className="pt-4 border-t border-[#E2E0D8]/60 text-xs font-bold text-[#2F6A55]">
                — Pemilik warung frozen food
              </div>
            </div>

            <div className="bg-[#F5F3EE] p-6 rounded-3xl border border-[#E2E0D8] space-y-4 flex flex-col justify-between">
              <p className="text-sm text-[#1F2A24] leading-relaxed italic">
                &ldquo;Pertanyaan yang sama terus tiap hari: harga berapa, ready gak, ongkir berapa.&rdquo;
              </p>
              <div className="pt-4 border-t border-[#E2E0D8]/60 text-xs font-bold text-[#2F6A55]">
                — Reseller fashion online
              </div>
            </div>

            <div className="bg-[#F5F3EE] p-6 rounded-3xl border border-[#E2E0D8] space-y-4 flex flex-col justify-between">
              <p className="text-sm text-[#1F2A24] leading-relaxed italic">
                &ldquo;Saya coba chatbot lain, malah jawab ngasal soal stok. Pelanggan komplain, saya yang kena.&rdquo;
              </p>
              <div className="pt-4 border-t border-[#E2E0D8]/60 text-xs font-bold text-[#2F6A55]">
                — Pemilik bengkel motor
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. BAGIAN CARA KERJA */}
      <section id="cara-kerja" className="py-20 md:py-28 px-6 max-w-5xl mx-auto space-y-16">
        <div className="text-center space-y-3">
          <span className="text-xs font-bold text-[#B8863B] uppercase tracking-wider">Praktis & Cepat</span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-[#1F2A24] tracking-tight font-heading">
            Tiga langkah, bukan berhari-hari
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-8 rounded-3xl border border-[#E2E0D8] space-y-4 relative shadow-sm">
            <span className="text-4xl font-extrabold text-[#2F6A55]/30 font-mono">01</span>
            <h3 className="text-lg font-bold text-[#1F2A24]">Isi info bisnismu</h3>
            <p className="text-xs text-[#6B7570] leading-relaxed">
              Produk, harga, jam buka, kebijakan pengiriman — sekali isi, jadi acuan semua balasan.
            </p>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-[#E2E0D8] space-y-4 relative shadow-sm">
            <span className="text-4xl font-extrabold text-[#2F6A55]/30 font-mono">02</span>
            <h3 className="text-lg font-bold text-[#1F2A24]">Hubungkan WhatsApp-mu</h3>
            <p className="text-xs text-[#6B7570] leading-relaxed">
              Scan kode QR dari nomor yang sudah kamu pakai. Nomormu tetap punyamu sepenuhnya.
            </p>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-[#E2E0D8] space-y-4 relative shadow-sm">
            <span className="text-4xl font-extrabold text-[#2F6A55]/30 font-mono">03</span>
            <h3 className="text-lg font-bold text-[#1F2A24]">Balas otomatis jalan</h3>
            <p className="text-xs text-[#6B7570] leading-relaxed">
              Pertanyaan rutin terjawab sendiri. Hal penting seperti pembayaran tetap masuk ke kamu.
            </p>
          </div>
        </div>
      </section>

      {/* 5. BAGIAN KEPERCAYAAN */}
      <section className="py-20 md:py-28 px-6 bg-white border-y border-[#E2E0D8]">
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="text-center space-y-4">
            <h2 className="text-3xl md:text-4xl font-extrabold text-[#1F2A24] tracking-tight font-heading">
              Kalau tidak tahu, ngaku tidak tahu.
            </h2>
            <p className="text-base text-[#6B7570] max-w-2xl mx-auto">
              Chatbot lain sering mengarang jawaban demi kelihatan pintar. Balas dirancang sebaliknya.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-[#F5F3EE] border border-[#E2E0D8] space-y-2">
              <div className="w-8 h-8 rounded-full bg-[#2F6A55] text-white flex items-center justify-center text-sm font-bold mb-3">
                ✓
              </div>
              <h3 className="text-base font-bold text-[#1F2A24]">Hanya jawab dari datamu</h3>
              <p className="text-xs text-[#6B7570] leading-relaxed">
                Tidak pernah mengarang harga atau stok yang tidak kamu isi.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#F5F3EE] border border-[#E2E0D8] space-y-2">
              <div className="w-8 h-8 rounded-full bg-[#2F6A55] text-white flex items-center justify-center text-sm font-bold mb-3">
                ✓
              </div>
              <h3 className="text-base font-bold text-[#1F2A24]">Tahu kapan harus diam</h3>
              <p className="text-xs text-[#6B7570] leading-relaxed">
                Pembayaran, komplain, dan nego langsung diteruskan ke kamu.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#F5F3EE] border border-[#E2E0D8] space-y-2">
              <div className="w-8 h-8 rounded-full bg-[#2F6A55] text-white flex items-center justify-center text-sm font-bold mb-3">
                ✓
              </div>
              <h3 className="text-base font-bold text-[#1F2A24]">Kamu yang pegang kendali</h3>
              <p className="text-xs text-[#6B7570] leading-relaxed">
                Ubah info kapan saja, balasan berikutnya langsung menyesuaikan.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. BAGIAN HARGA (DINAMIS DARI DATABASE) */}
      <section className="py-20 md:py-28 px-6 max-w-5xl mx-auto space-y-12">
        <div className="text-center space-y-3">
          <span className="text-xs font-bold text-[#B8863B] uppercase tracking-wider">Investasi Terjangkau</span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-[#1F2A24] tracking-tight font-heading">
            Harga yang masuk akal buat mulai
          </h2>
        </div>

        {loadingPlans ? (
          <div className="text-center py-12 text-xs text-[#6B7570]">Memuat paket harga...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`bg-white rounded-3xl p-8 border flex flex-col justify-between relative shadow-sm ${
                  plan.isPopular ? "border-[#2F6A55] ring-2 ring-[#2F6A55]/20" : "border-[#E2E0D8]"
                }`}
              >
                {plan.isPopular && (
                  <span className="absolute -top-3.5 right-6 px-3 py-1 bg-[#2F6A55] text-white text-[10px] font-bold rounded-full uppercase tracking-wider shadow-sm">
                    Paling Populer
                  </span>
                )}

                <div className="space-y-6">
                  <div>
                    <h3 className="text-2xl font-bold text-[#1F2A24]">{plan.name}</h3>
                    <p className="text-xs text-[#6B7570] mt-1">{plan.description}</p>
                  </div>

                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl md:text-4xl font-extrabold text-[#1F2A24] font-mono">
                      Rp {plan.price.toLocaleString("id-ID")}
                    </span>
                    <span className="text-xs text-[#6B7570]">/{plan.period}</span>
                  </div>

                  <ul className="space-y-3 pt-4 border-t border-[#E2E0D8]">
                    {plan.features.split(",").map((feat, idx) => (
                      <li key={idx} className="flex items-center gap-2.5 text-xs text-[#1F2A24]">
                        <span className="text-[#2F6A55] font-bold">✓</span>
                        <span>{feat.trim()}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-8">
                  <a href="#kontak" className="block w-full">
                    <Button
                      variant={plan.isPopular ? "primary" : "secondary"}
                      className={`w-full py-3 text-xs font-bold rounded-xl ${
                        plan.isPopular ? "bg-[#2F6A55] text-white" : ""
                      }`}
                    >
                      Pilih Paket {plan.name} →
                    </Button>
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 7. BAGIAN KONTAK (PERMINTAAN DEMO) */}
      <section id="kontak" className="py-20 md:py-28 px-6 bg-white border-t border-[#E2E0D8]">
        <div className="max-w-xl mx-auto space-y-8">
          <div className="text-center space-y-3">
            <h2 className="text-3xl md:text-4xl font-extrabold text-[#1F2A24] tracking-tight font-heading">
              Coba dulu, tanpa risiko.
            </h2>
            <p className="text-xs text-[#6B7570]">
              Isi data singkat di bawah. Tim kami akan menghubungi kamu lewat WhatsApp untuk mengaturkan demo gratis.
            </p>
          </div>

          <form onSubmit={handleDemoSubmit} className="bg-[#F5F3EE] p-6 md:p-8 rounded-3xl border border-[#E2E0D8] space-y-4 shadow-sm">
            {formSuccess && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 text-[#2F6A55] text-xs font-medium rounded-xl leading-relaxed animate-pulse">
                ✅ {formSuccess}
              </div>
            )}

            {formError && (
              <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs font-medium rounded-xl leading-relaxed">
                ⚠️ {formError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-[#1F2A24] mb-1.5">Nama Lengkap</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Budi Santoso"
                className="w-full px-4 py-3 text-sm bg-white border border-[#E2E0D8] rounded-xl focus:outline-none focus:border-[#2F6A55] text-[#1F2A24]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1F2A24] mb-1.5">Nama Bisnis / Toko</label>
              <input
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Contoh: Warung Frozen Budi"
                className="w-full px-4 py-3 text-sm bg-white border border-[#E2E0D8] rounded-xl focus:outline-none focus:border-[#2F6A55] text-[#1F2A24]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1F2A24] mb-1.5">Nomor WhatsApp</label>
              <input
                type="tel"
                required
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="Contoh: 081234567890"
                className="w-full px-4 py-3 text-sm bg-white border border-[#E2E0D8] rounded-xl focus:outline-none focus:border-[#2F6A55] text-[#1F2A24]"
              />
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 text-sm font-bold bg-[#2F6A55] text-white rounded-xl shadow-md hover:bg-[#265746] transition-all mt-2"
            >
              {submitting ? "Sending..." : "Kirim Permintaan Demo →"}
            </Button>
          </form>
        </div>
      </section>

      {/* 8. FOOTER */}
      <footer className="bg-[#F5F3EE] py-12 px-6 border-t border-[#E2E0D8]">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <p className="text-xs text-[#6B7570]">
            © 2026 Balas. Dibuat untuk pemilik usaha yang capek bales chat sendirian.
          </p>
          <div className="flex items-center gap-4 text-xs font-bold text-[#2F6A55]">
            <Link href="/login" className="hover:underline">
              Masuk
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
