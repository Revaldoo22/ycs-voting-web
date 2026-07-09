import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/navbar";
import { HeroVideo } from "@/components/hero-video";
import { ParticipantGrid } from "@/components/participant-grid";
import { PrizeButtons } from "@/components/prize-buttons";
import { MaintenanceOverlay } from "@/components/maintenance-overlay";
import { EventClosedOverlay } from "@/components/event-closed-overlay";
import { VoterTodayPanel } from "@/components/voter-today";
import { RoundCountdown } from "@/components/round-countdown";

export default function HomePage() {
  return (
    <div className="min-h-screen">
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
            Youth Character Summit
          </h1>
          <p className="mx-auto max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Dukung pelajar favoritmu! Pilih peserta di bawah, beri dukungan, dan
            bantu mereka memenangkan hadiah.
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
              variant="outline"
              className="h-12 rounded-full bg-background/60 px-7 text-base backdrop-blur"
              asChild
            >
              <Link href="/top-voter">Top Voter</Link>
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

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Youth Character Summit - Universitas
        STEKOM.
      </footer>
    </div>
  );
}
