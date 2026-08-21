import { Metadata } from "next";
import LandingPageClient from "@/components/LandingPageClient";

export const metadata: Metadata = {
  title: "Balas — Admin AI WhatsApp untuk UMKM Indonesia",
  description:
    "Balas otomatis menjawab chat WhatsApp pelangganmu, mencatat pesanan, dan menjaga stok tetap akurat. Daftar dan coba sekarang untuk UMKM Indonesia.",
  openGraph: {
    title: "Balas — Admin AI WhatsApp untuk UMKM Indonesia",
    description:
      "Balas otomatis menjawab chat WhatsApp pelangganmu, mencatat pesanan, dan menjaga stok tetap akurat. Daftar dan coba sekarang untuk UMKM Indonesia.",
    url: "https://balas.id",
    siteName: "Balas",
    locale: "id_ID",
    type: "website",
  },
};

export default function Home() {
  return <LandingPageClient />;
}
