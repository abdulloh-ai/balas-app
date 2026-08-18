import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Balas — Operational AI Assistant & WA Automation untuk UMKM",
  description: "Platform asisten operasional dan otomatisasi WhatsApp chat, stok, pesanan, dan laporan keuangan untuk UMKM Mikro Indonesia.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="antialiased bg-[#F5F3EE] text-[#1F2A24] selection:bg-[#2F6A55] selection:text-white">
        {children}
      </body>
    </html>
  );
}
