# 🚀 Balas - Platform SaaS Otomatisasi WhatsApp & Operasional UMKM

Platform SaaS *all-in-one* yang membantu UMKM Indonesia mengotomatisasi percakapan pelanggan via WhatsApp, mengecek stok, mencatat pesanan, dan membuat laporan keuangan harian.

---

## 📂 Struktur Folder Proyek

```
D:\_jawab\
├── PLANNING.md              # Dokumen perencanaan strategis & analisis pasar Balas
├── README.md                # Dokumentasi petunjuk penggunaan & struktur proyek
├── prisma/                  # Konfigurasi ORM Prisma (Database PostgreSQL)
│   └── schema.prisma        # File skema database (Siap diisi pada fase berikutnya)
├── src/
│   ├── app/
│   │   ├── admin/           # [Lapis 1] Halaman Dashboard Platform Owner (Super Admin)
│   │   │   └── page.tsx
│   │   ├── dashboard/       # [Lapis 2] Halaman Dashboard Business Owner (Pemilik UMKM)
│   │   │   └── page.tsx
│   │   ├── api/             # API Routes Backend bawaan Next.js
│   │   │   └── health/      # API Health check (/api/health)
│   │   ├── layout.tsx       # Root layout aplikasi
│   │   └── page.tsx         # Halaman utama / portal navigasi
│   └── components/
│       └── ui/              # Komponen UI reusable (Card, Button, dll.)
├── public/                  # Asset statis (gambar, favicon, logo)
├── package.json             # Dependensi proyek
└── tailwind.config.ts / postcss.config.mjs  # Konfigurasi styling Tailwind CSS
```

---

## 🛠️ Cara Menjalankan Proyek Secara Lokal

1. **Buka Terminal / PowerShell** di direktori proyek:
   ```bash
   cd D:\_jawab
   ```

2. **Jalankan Development Server:**
   ```bash
   npm run dev
   ```

3. **Akses di Browser:**
   - **Portal Beranda Utama:** [http://localhost:3000](http://localhost:3000)
   - **Dashboard Platform Owner (Super Admin):** [http://localhost:3000/admin](http://localhost:3000/admin)
   - **Dashboard Business Owner (UMKM):** [http://localhost:3000/dashboard](http://localhost:3000/dashboard)
   - **API Health Check:** [http://localhost:3000/api/health](http://localhost:3000/api/health)

---

## 📝 Catatan Pengembangan
- **Prisma ORM** telah terinstal (`@prisma/client` & `prisma`) dan diinisialisasi di folder `prisma/`.
- Tidak ada skema/tabel database maupun logika bisnis yang dibuat pada tahap ini sesuai kebutuhan kerangka awal.
