import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function CaraPakaiPage() {
  const steps = [
    {
      num: "01",
      title: "Daftar & Pilih Paket di Halaman /daftar",
      desc: "Isi nama bisnis, nama Anda, email (sebagai username login), password (minimal 8 karakter), nomor WhatsApp kontak, dan pilih paket berlangganan yang sesuai.",
    },
    {
      num: "02",
      title: "Lakukan Pembayaran Sesuai Instruksi",
      desc: "Transfer biaya berlangganan sesuai nominal paket ke nomor rekening resmi Bank BCA yang tertera di layar konfirmasi pendaftaran.",
    },
    {
      num: "03",
      title: "Tunggu Verifikasi dari Admin",
      desc: "Tim Admin Platform Balas akan memverifikasi mutasi pembayaran Anda (maksimal 1x24 jam). Anda juga bisa mengirim bukti transfer ke WA Admin untuk verifikasi lebih cepat.",
    },
    {
      num: "04",
      title: "Login di /login Menggunakan Akun Terdaftar",
      desc: "Setelah verifikasi disetujui, login di halaman /login menggunakan email dan password yang telah Anda buat saat pendaftaran.",
    },
    {
      num: "05",
      title: "Isi Info Bisnis & Produk di Dashboard",
      desc: "Masukkan deskripsi toko, jam operasional, kebijakan pengiriman, serta daftar produk beserta harga & stok pada Dashboard UMKM Anda.",
    },
    {
      num: "06",
      title: "Hubungkan Nomor WhatsApp Bisnis",
      desc: "Scan kode QR dari nomor WhatsApp toko yang sudah Anda pakai. Nomor WhatsApp Anda tetap milik Anda sepenuhnya.",
    },
    {
      num: "07",
      title: "AI Mulai Membalas Chat Pelanggan Otomatis",
      desc: "Admin AI Balas akan langsung menjawab pertanyaan harga, stok, dan jam buka 24/7 hanya berdasarkan data yang Anda isi sendiri.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#F5F3EE] text-[#1F2A24] flex flex-col justify-between p-6 md:p-12">
      {/* Top Header */}
      <header className="max-w-4xl w-full mx-auto flex justify-between items-center pb-6 border-b border-[#E2E0D8]">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-[#2F6A55] text-white flex items-center justify-center font-bold text-xl">
            B
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-[#1F2A24] leading-none">Balas</h1>
            <p className="text-xs text-[#6B7570] font-medium mt-0.5">Panduan Penggunaan Publik</p>
          </div>
        </Link>

        <div className="flex items-center gap-3 text-xs font-bold">
          <Link href="/login">
            <Button variant="secondary" className="px-4 py-2 text-xs">
              Masuk →
            </Button>
          </Link>
          <Link href="/daftar">
            <Button className="px-4 py-2 text-xs bg-[#2F6A55] text-white">
              Daftar Sekarang →
            </Button>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl w-full mx-auto py-12 space-y-12">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <span className="px-3.5 py-1 bg-[#2F6A55]/10 text-[#2F6A55] text-xs font-bold rounded-full border border-[#2F6A55]/20">
            📖 Panduan Alur Pengguna Baru
          </span>
          <h1 className="text-3xl md:text-4xl font-extrabold text-[#1F2A24] tracking-tight font-heading">
            Cara Pakai Platform Balas
          </h1>
          <p className="text-sm text-[#6B7570]">
            7 langkah mudah dari pendaftaran mandiri hingga bot AI WhatsApp toko Anda aktif melayani pelanggan 24/7.
          </p>
        </div>

        {/* Steps List */}
        <div className="space-y-4 max-w-3xl mx-auto">
          {steps.map((s, idx) => (
            <div
              key={idx}
              className="bg-white p-6 md:p-8 rounded-3xl border border-[#E2E0D8] flex flex-col md:flex-row items-start gap-6 shadow-sm hover:border-[#2F6A55]/40 transition-all"
            >
              <div className="w-12 h-12 rounded-2xl bg-[#2F6A55]/10 text-[#2F6A55] flex items-center justify-center font-extrabold font-mono text-xl shrink-0">
                {s.num}
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-[#1F2A24]">{s.title}</h3>
                <p className="text-xs md:text-sm text-[#6B7570] leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="bg-[#2F6A55] text-white rounded-3xl p-8 md:p-12 text-center space-y-6 max-w-3xl mx-auto shadow-md">
          <h2 className="text-2xl md:text-3xl font-extrabold">Siap Memulai Otomatisasi Tokomu?</h2>
          <p className="text-xs md:text-sm text-emerald-100 max-w-md mx-auto">
            Daftar sekarang di /daftar dan biarkan admin AI menjawab chat pelangganmu 24/7.
          </p>
          <div className="pt-2">
            <Link href="/daftar">
              <Button className="px-8 py-3.5 text-sm font-bold bg-white text-[#2F6A55] hover:bg-emerald-50 rounded-xl shadow-md">
                Daftar & Beli Paket Sekarang →
              </Button>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-4xl w-full mx-auto pt-6 text-center text-xs text-[#6B7570] border-t border-[#E2E0D8]">
        Balas SaaS Platform © 2026 — Dibuat untuk pemilik usaha yang capek bales chat sendirian.
      </footer>
    </div>
  );
}
