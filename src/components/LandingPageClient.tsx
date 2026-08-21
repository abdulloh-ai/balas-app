"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function LandingPageClient() {
  const singlePlan = {
    name: "Balas",
    price: 199000,
    period: "bulan",
    features: [
      "1 Nomor WhatsApp",
      "Chat tanpa batas",
      "Katalog & Stok tanpa batas",
      "Rekap Pesanan Otomatis",
      "Rekap Keuangan & Laporan",
      "Dukungan Eskalasi",
    ],
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

          <div className="flex items-center gap-3">
            <Link href="/cara-pakai" className="text-xs font-semibold text-[#2F6A55] hover:underline hidden sm:inline-block mr-2">
              📖 Cara Pakai
            </Link>
            <Link href="/login">
              <Button className="px-5 py-2.5 text-xs font-bold bg-[#2F6A55] text-white rounded-xl hover:bg-[#265746] transition-all shadow-sm">
                Masuk →
              </Button>
            </Link>
          </div>
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
          <Link href="/daftar" className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto px-8 py-4 text-sm font-bold bg-[#2F6A55] text-white rounded-2xl shadow-lg hover:bg-[#265746] transition-all transform hover:-translate-y-0.5">
              Daftar & Coba Sekarang →
            </Button>
          </Link>
          <a href="#cara-kerja" className="w-full sm:w-auto">
            <Button variant="secondary" className="w-full sm:w-auto px-8 py-4 text-sm font-bold bg-transparent text-[#1F2A24] border-2 border-[#1F2A24]/20 rounded-2xl hover:border-[#2F6A55] hover:text-[#2F6A55] transition-all">
              Lihat Cara Kerjanya ↓
            </Button>
          </a>
        </div>
      </section>

      {/* 3. BAGIAN MASALAH (POIN MASALAH BIASA) */}
      <section className="py-16 md:py-24 px-6 bg-white border-y border-[#E2E0D8]">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <h2 className="text-3xl md:text-4xl font-extrabold text-[#1F2A24] tracking-tight font-heading">
              Chat menumpuk, tapi kamu cuma satu orang.
            </h2>
            <p className="text-sm text-[#6B7570]">
              Tantangan operasional nyata yang sering menghambat pertumbuhan bisnis UMKM:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#F5F3EE] p-6 md:p-8 rounded-3xl border border-[#E2E0D8] space-y-3 flex flex-col justify-start">
              <div className="w-10 h-10 rounded-2xl bg-[#2F6A55]/10 text-[#2F6A55] flex items-center justify-center font-bold text-lg mb-1">
                ⏰
              </div>
              <p className="text-sm text-[#1F2A24] leading-relaxed">
                Pelanggan sering bertanya di luar jam kerja — larut malam atau pagi buta — dan baru bisa dibalas berjam-jam kemudian.
              </p>
            </div>

            <div className="bg-[#F5F3EE] p-6 md:p-8 rounded-3xl border border-[#E2E0D8] space-y-3 flex flex-col justify-start">
              <div className="w-10 h-10 rounded-2xl bg-[#2F6A55]/10 text-[#2F6A55] flex items-center justify-center font-bold text-lg mb-1">
                🔄
              </div>
              <p className="text-sm text-[#1F2A24] leading-relaxed">
                Pertanyaan yang sama terus berulang tiap hari: harga berapa, stok ada atau tidak, ongkos kirim berapa.
              </p>
            </div>

            <div className="bg-[#F5F3EE] p-6 md:p-8 rounded-3xl border border-[#E2E0D8] space-y-3 flex flex-col justify-start">
              <div className="w-10 h-10 rounded-2xl bg-[#2F6A55]/10 text-[#2F6A55] flex items-center justify-center font-bold text-lg mb-1">
                ⚠️
              </div>
              <p className="text-sm text-[#1F2A24] leading-relaxed">
                Chatbot otomatis lain kerap memberi jawaban salah soal stok atau harga, dan pemilik toko yang harus menanggung komplain pelanggan.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. BAGIAN CARA KERJA (ID ANCHOR cara-kerja) */}
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
            <h3 className="text-lg font-bold text-[#1F2A24]">Daftar & isi info bisnismu</h3>
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

      {/* 6. BAGIAN HARGA (HANYA 1 PAKET SINGLE PLAN "Balas" Rp 199.000/bulan) */}
      <section className="py-20 md:py-28 px-6 max-w-5xl mx-auto space-y-12">
        <div className="text-center space-y-3">
          <span className="text-xs font-bold text-[#B8863B] uppercase tracking-wider">Investasi Terjangkau</span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-[#1F2A24] tracking-tight font-heading">
            Harga yang masuk akal buat mulai
          </h2>
        </div>

        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-3xl p-8 border border-[#2F6A55] ring-2 ring-[#2F6A55]/20 flex flex-col justify-between relative shadow-sm space-y-6">
            <span className="absolute -top-3.5 right-6 px-3.5 py-1 bg-[#2F6A55] text-white text-[10px] font-bold rounded-full uppercase tracking-wider shadow-sm">
              Paket Lengkap UMKM
            </span>

            <div className="space-y-6">
              <div>
                <h3 className="text-3xl font-extrabold text-[#1F2A24] font-heading">{singlePlan.name}</h3>
                <p className="text-xs text-[#6B7570] mt-1">
                  Seluruh fitur otomatisasi WhatsApp & rekap bisnis dalam 1 paket terjangkau.
                </p>
              </div>

              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-[#1F2A24] font-mono">
                  Rp {singlePlan.price.toLocaleString("id-ID")}
                </span>
                <span className="text-xs text-[#6B7570]">/{singlePlan.period}</span>
              </div>

              <ul className="space-y-3 pt-4 border-t border-[#E2E0D8]">
                {singlePlan.features.map((feat, idx) => (
                  <li key={idx} className="flex items-center gap-2.5 text-xs text-[#1F2A24]">
                    <span className="text-[#2F6A55] font-bold text-sm">✓</span>
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-6">
              <Link href="/daftar" className="block w-full">
                <Button className="w-full py-3.5 text-sm font-bold bg-[#2F6A55] text-white rounded-xl shadow-md hover:bg-[#265746] transition-all">
                  Daftar Sekarang →
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 7. CALL-TO-ACTION PENUTUP */}
      <section className="py-20 md:py-28 px-6 bg-white border-t border-[#E2E0D8]">
        <div className="max-w-3xl mx-auto bg-[#2F6A55] text-white rounded-3xl p-8 md:p-12 text-center space-y-6 shadow-md">
          <h2 className="text-3xl md:text-4xl font-extrabold font-heading">
            Coba dulu, tanpa ribet.
          </h2>
          <p className="text-sm text-emerald-100 max-w-lg mx-auto">
            Daftar sekarang di /daftar dan rasakan bagaimana Balas menjawab chat pelanggan toko Anda secara otomatis.
          </p>
          <div className="pt-2">
            <Link href="/daftar">
              <Button className="px-8 py-4 text-sm font-bold bg-white text-[#2F6A55] hover:bg-emerald-50 rounded-2xl shadow-lg">
                Daftar & Coba Sekarang →
              </Button>
            </Link>
          </div>
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
            <span>•</span>
            <Link href="/cara-pakai" className="hover:underline">
              Cara Pakai
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
