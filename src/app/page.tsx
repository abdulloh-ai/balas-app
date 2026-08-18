import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#F5F3EE] text-[#1F2A24] flex flex-col justify-between p-6 md:p-12">
      {/* Top Brand Header */}
      <header className="max-w-5xl w-full mx-auto flex justify-between items-center pb-8 border-b border-[#E2E0D8]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#2F6A55] text-white flex items-center justify-center font-bold text-xl tracking-wider shadow-sm">
            B
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-[#1F2A24] leading-none">Balas</h1>
            <p className="text-xs text-[#6B7570] font-medium mt-0.5">Operational Assistant & WA Automation UMKM</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#2F6A55]/10 text-[#2F6A55] text-xs font-semibold rounded-full border border-[#2F6A55]/20">
            <span className="w-2 h-2 rounded-full bg-[#2F6A55] animate-pulse"></span>
            Tahap Inisialisasi Project
          </span>
        </div>
      </header>

      {/* Main Hero & Portal Navigator */}
      <main className="max-w-5xl w-full mx-auto py-12 space-y-10">
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <h2 className="text-3xl md:text-4xl font-extrabold text-[#1F2A24] tracking-tight leading-tight">
            Asisten Otomatisasi WA & Rekap Operasional Mikro
          </h2>
          <p className="text-[#6B7570] text-base md:text-lg leading-relaxed">
            Platform yang membantu UMKM melayani chat pelanggan 24/7, mengecek stok barang, mencatat pesanan, dan menyusun laporan keuangan harian secara otomatis.
          </p>
        </div>

        {/* 2 Lapis Portal Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
          {/* Lapis 1: Platform Owner */}
          <Card className="hover:border-[#2F6A55]/40 transition-all flex flex-col justify-between h-full">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="px-2.5 py-1 bg-[#2F6A55]/10 text-[#2F6A55] text-xs font-bold rounded-lg uppercase tracking-wider">
                  Lapis 1: Platform Owner
                </span>
                <span className="text-xs text-[#6B7570]">Super Admin</span>
              </div>
              <h3 className="text-xl font-bold text-[#1F2A24]">Dashboard Platform</h3>
              <p className="text-sm text-[#6B7570] leading-relaxed">
                Panel pengawasan khusus pemilik SaaS untuk memantau seluruh UMKM berlangganan, kesehatan bot WA, serta kuota penggunaan AI.
              </p>
            </div>
            <div className="pt-6">
              <Link href="/admin" className="w-full inline-block">
                <Button variant="primary" className="w-full py-3">
                  Masuk Dashboard Platform →
                </Button>
              </Link>
            </div>
          </Card>

          {/* Lapis 2: Business Owner */}
          <Card className="hover:border-[#2F6A55]/40 transition-all flex flex-col justify-between h-full">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="px-2.5 py-1 bg-[#B8863B]/10 text-[#B8863B] text-xs font-bold rounded-lg uppercase tracking-wider">
                  Lapis 2: Business Owner
                </span>
                <span className="text-xs text-[#6B7570]">Pemilik UMKM</span>
              </div>
              <h3 className="text-xl font-bold text-[#1F2A24]">Dashboard Bisnis</h3>
              <p className="text-sm text-[#6B7570] leading-relaxed">
                Panel kerja harian pemilik toko untuk scan QR Code WA, mengelola data produk & stok, konfirmasi pesanan, dan lihat rekap omset.
              </p>
            </div>
            <div className="pt-6">
              <Link href="/dashboard" className="w-full inline-block">
                <Button variant="secondary" className="w-full py-3">
                  Masuk Dashboard Bisnis →
                </Button>
              </Link>
            </div>
          </Card>
        </div>

        {/* Note Lapis 3 */}
        <div className="bg-white border border-[#E2E0D8] rounded-2xl p-5 text-center max-w-xl mx-auto space-y-1">
          <p className="text-xs font-bold text-[#1F2A24] uppercase tracking-wider">💡 Informasi Lapis 3 (End Customer)</p>
          <p className="text-xs text-[#6B7570]">
            Pelanggan toko <span className="font-semibold text-[#1F2A24]">TIDAK memiliki akses ke dashboard web</span>. Seluruh interaksi pembelian dan tanya jawab dilakukan 100% via aplikasi WhatsApp biasa.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-5xl w-full mx-auto pt-8 border-t border-[#E2E0D8] text-center text-xs text-[#6B7570]">
        Balas SaaS Platform © 2026 — Desain & Operasional Khusus UMKM Indonesia
      </footer>
    </div>
  );
}
