import type { Metadata } from "next";
import { PanduanBody } from "./panduan-body";

const pageTitle =
  "Panduan & Pendaftaran GRATIS - Youth Character Summit Universitas STEKOM";
const pageDescription =
  "Pendaftaran Youth Character Summit 2026 100% GRATIS tanpa biaya apa pun. Tidak ada biaya pendaftaran, biaya administrasi, atau uang partisipasi. Ikuti panduan cara daftar dan cara mendukung peserta di sini.";

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  keywords: [
    "pendaftaran gratis",
    "Youth Character Summit gratis",
    "daftar YCS 2026 tanpa biaya",
    "lomba pelajar gratis",
    "beasiswa gratis SMA SMK",
    "panduan pendaftaran Youth Character Summit",
    "Universitas STEKOM",
    "biaya pendaftaran YCS",
  ],
  alternates: { canonical: "/panduan" },
  openGraph: {
    title: pageTitle,
    description: pageDescription,
    type: "article",
    locale: "id_ID",
    url: "/panduan",
  },
  twitter: {
    card: "summary_large_image",
    title: pageTitle,
    description: pageDescription,
  },
};

/**
 * Structured data: FAQPage untuk pertanyaan biaya (berpeluang muncul sebagai
 * rich result di Google) + HowTo ringkas untuk alur pendaftaran gratis.
 */
const FAQ_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Apakah pendaftaran Youth Character Summit gratis?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Ya, pendaftaran Youth Character Summit 2026 Universitas STEKOM sepenuhnya gratis. Tidak ada biaya pendaftaran, biaya administrasi, biaya seleksi, maupun biaya penjurian sepeser pun.",
      },
    },
    {
      "@type": "Question",
      name: "Berapa biaya pendaftaran Youth Character Summit 2026?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Biayanya Rp0. Seluruh tahapan mulai dari pendaftaran, seleksi Golden Buzzer, penilaian semi finalis, sampai pengumuman finalis tidak memungut biaya apa pun dari peserta maupun sekolah.",
      },
    },
    {
      "@type": "Question",
      name: "Apakah mendukung atau vote peserta dikenakan biaya?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Tidak. Memberi dukungan atau vote untuk peserta juga gratis. Kamu hanya perlu masuk dengan akun Google, dan setiap akun mendapat satu vote selama event.",
      },
    },
    {
      "@type": "Question",
      name: "Bagaimana jika ada orang yang meminta uang untuk pendaftaran?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Abaikan dan segera laporkan ke admin resmi Youth Character Summit lewat WhatsApp +62 878-4877-5292. Panitia tidak pernah meminta pembayaran dalam bentuk apa pun.",
      },
    },
    {
      "@type": "Question",
      name: "Apakah beasiswa yang didapat peserta juga gratis tanpa potongan?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Ya. Beasiswa Rp3.000.000 untuk semi finalis dan Rp5.000.000 untuk finalis diberikan tanpa potongan biaya administrasi apa pun.",
      },
    },
  ],
};

export default function GuidePage() {
  return (
    <>
      <script
        type="application/ld+json"
        // Rich result FAQ untuk pertanyaan biaya pendaftaran.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSON_LD) }}
      />
      <PanduanBody />
    </>
  );
}
