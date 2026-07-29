import type { Metadata } from "next";
import Link from "next/link";
import { GraduationCap, ShieldCheck, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/navbar";
import { HeroVideo } from "@/components/hero-video";
import { ParticipantGrid } from "@/components/participant-grid";
import { PrizeButtons } from "@/components/prize-buttons";
import { MaintenanceOverlay } from "@/components/maintenance-overlay";
import { EventClosedOverlay } from "@/components/event-closed-overlay";
import { VoterTodayPanel } from "@/components/voter-today";
import { RoundCountdown } from "@/components/round-countdown";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://idola.stekom.ac.id";

const homeTitle =
  "Youth Character Summit 2026 | Pendaftaran Gratis | Universitas STEKOM";
const homeDescription =
  "Pendaftaran Youth Character Summit 2026 100% GRATIS, tidak ada biaya dan tidak ada transfer dalam bentuk apa pun. Kompetisi karakter pelajar SMA/SMK dengan beasiswa hingga Rp5.000.000.";

export const metadata: Metadata = {
  title: homeTitle,
  description: homeDescription,
  keywords: [
    "Youth Character Summit 2026",
    "YCS 2026",
    "pendaftaran gratis",
    "YCS 2026 gratis",
    "apakah YCS 2026 berbayar",
    "biaya pendaftaran YCS 2026",
    "kompetisi pelajar SMA SMK",
    "beasiswa pelajar",
    "Universitas STEKOM",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    title: homeTitle,
    description: homeDescription,
    type: "website",
    locale: "id_ID",
    url: siteUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: homeTitle,
    description: homeDescription,
  },
};

/**
 * Event structured data dengan offers.price "0" — inilah yang memungkinkan
 * Google menampilkan label "Free" pada rich result.
 */
const EVENT_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "Event",
  name: "Youth Character Summit 2026",
  description: homeDescription,
  startDate: "2026-12-23T08:00:00+08:00",
  endDate: "2026-12-23T17:00:00+08:00",
  eventStatus: "https://schema.org/EventScheduled",
  eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
  image: [`${siteUrl}/logo.png`],
  location: {
    "@type": "Place",
    name: "Bali",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Bali",
      addressCountry: "ID",
    },
  },
  organizer: {
    "@type": "Organization",
    name: "Universitas STEKOM",
    url: "https://stekom.ac.id",
  },
  isAccessibleForFree: true,
  offers: {
    "@type": "Offer",
    name: "Pendaftaran Peserta Youth Character Summit 2026",
    price: "0",
    priceCurrency: "IDR",
    availability: "https://schema.org/InStock",
    validFrom: "2026-07-21T00:00:00+07:00",
    url: siteUrl,
  },
};

/** FAQ biaya — teks di halaman dan di JSON-LD dirender dari sumber yang sama. */
const COST_FAQ = [
  {
    q: "Apakah YCS 2026 berbayar?",
    a: "Tidak. Pendaftaran 100% gratis, tidak ada transfer dalam bentuk apa pun.",
  },
  {
    q: "Berapa biaya pendaftaran Youth Character Summit 2026?",
    a: "Rp0. Tidak ada biaya pendaftaran, biaya administrasi, biaya seleksi, maupun biaya penjurian, baik untuk peserta maupun sekolah.",
  },
  {
    q: "Apakah mendukung atau vote peserta dikenakan biaya?",
    a: "Tidak. Memberi dukungan atau vote juga gratis. Kamu hanya perlu masuk dengan akun Google.",
  },
  {
    q: "Bagaimana jika ada yang meminta uang untuk pendaftaran?",
    a: "Abaikan dan laporkan ke admin resmi. Panitia tidak pernah meminta pembayaran dengan alasan apa pun.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(EVENT_JSON_LD) }}
      />
      <MaintenanceOverlay />
      <EventClosedOverlay />
      <Navbar />

      {/* Video pembuka (audio on, volume mengecil saat di-scroll). */}
      <HeroVideo />

      {/* Hero */}
      <section id="hero" className="relative scroll-mt-16 overflow-hidden border-b">
        <div className="container space-y-6 py-16 text-center md:py-24">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-semibold text-primary">
            <GraduationCap className="h-4 w-4" />
            Universitas STEKOM
          </div>
          <RoundCountdown />
          <h1 className="mx-auto max-w-3xl text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-6xl">
            Youth Character Summit 2026
          </h1>
          <p className="mx-auto max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            <b>Pendaftaran 100% gratis, tanpa biaya apa pun.</b> Dukung pelajar
            favoritmu! Pilih peserta di bawah, beri dukungan, dan bantu mereka
            memenangkan hadiah.
          </p>
          <p className="mx-auto inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
            <Wallet className="h-4 w-4" />
            Gratis - Rp0 biaya pendaftaran
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Button
              size="lg"
              className="h-12 rounded-full px-7 text-base shadow-lg shadow-primary/25"
              asChild
            >
              <Link href="/ranking">Peringkat Sementara</Link>
            </Button>
            <Button
              size="lg"
              variant="accent"
              className="h-12 rounded-full px-7 text-base shadow-lg shadow-accent/25"
              asChild
            >
              <a
                href="https://events.stekom.ac.id/ycs2026"
                target="_blank"
                rel="noopener noreferrer"
              >
                <GraduationCap className="h-5 w-5" />
                Jadi Peserta YCS
              </a>
            </Button>
          </div>
          <PrizeButtons />
        </div>
      </section>

      {/* All participants */}
      <section id="peserta" className="container scroll-mt-20 py-8">
        <div className="mb-6">
          <VoterTodayPanel />
        </div>
        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Daftar Peserta
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Klik peserta untuk memberi dukungan &amp; mengerjakan quest.
          </p>
        </div>
        <ParticipantGrid />
      </section>

      {/* FAQ biaya — jawaban wajib terlihat di halaman agar rich result FAQ valid. */}
      <section
        id="faq-biaya"
        aria-labelledby="faq-biaya-title"
        className="border-t bg-muted/30 py-12"
      >
        <div className="container max-w-3xl">
          <div className="mb-6 text-center">
            <h2
              id="faq-biaya-title"
              className="text-2xl font-bold tracking-tight sm:text-3xl"
            >
              Apakah YCS 2026 Berbayar?
            </h2>
            <p className="mt-2 text-base font-semibold text-emerald-700 dark:text-emerald-400">
              Tidak. Pendaftaran 100% gratis, tidak ada transfer dalam bentuk apa
              pun.
            </p>
          </div>

          <dl className="space-y-4">
            {COST_FAQ.map(({ q, a }) => (
              <div key={q} className="rounded-xl border bg-background p-4">
                <dt className="font-semibold">{q}</dt>
                <dd className="mt-1 text-sm text-muted-foreground">{a}</dd>
              </div>
            ))}
          </dl>

          <p className="mt-5 flex items-start justify-center gap-2 text-center text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <span>
              Informasi resmi hanya dari kanal Universitas STEKOM. Selengkapnya
              di{" "}
              <Link href="/panduan" className="text-primary hover:underline">
                halaman panduan
              </Link>
              .
            </span>
          </p>
        </div>
      </section>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Youth Character Summit - Universitas
        STEKOM.
      </footer>
    </div>
  );
}
