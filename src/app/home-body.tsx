"use client";

import * as React from "react";
import Link from "next/link";
import { GraduationCap, ShieldCheck, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Navbar } from "@/components/navbar";
import { HeroVideo } from "@/components/hero-video";
import { ParticipantGrid } from "@/components/participant-grid";
import { JoinPopup } from "@/components/join-popup";
import { ClaimCouponDialog } from "@/components/claim-coupon-dialog";
import { MaintenanceOverlay } from "@/components/maintenance-overlay";
import { EventClosedOverlay } from "@/components/event-closed-overlay";
import { VoterTodayPanel } from "@/components/voter-today";
import { RoundCountdown } from "@/components/round-countdown";
import { useMyProfile, useVoterToday } from "@/lib/queries";
import { useTranslation } from "@/lib/i18n";

function PrizeBanner() {
  const t = useTranslation("home");
  const tPeserta = useTranslation("peserta");
  const { data: me } = useMyProfile();
  const { data: voterToday } = useVoterToday(true);
  const [claimOpen, setClaimOpen] = React.useState(false);

  const isParticipant = !!me?.is_participant;
  const followed = !!me?.followed;
  // Sudah pernah vote & belum klaim kupon: klik gambar langsung ke syarat
  // klaim (skip penjelasan "Cara Dapat Kupon", sudah tidak relevan lagi).
  const alreadyVoted = !!voterToday?.has_voted;
  const skipToClaimStep = alreadyVoted && !isParticipant && !followed;

  function goToParticipants() {
    document.getElementById("peserta")?.scrollIntoView({ behavior: "smooth" });
  }

  const bannerImage = (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/hp.png"
        alt=""
        className="h-40 w-full shrink-0 object-contain p-3 sm:h-auto sm:w-48 sm:p-2"
      />
      <div className="flex flex-1 flex-col justify-center gap-1.5 p-4 text-center sm:p-5 sm:pl-1 sm:text-left">
        <span className="mx-auto inline-flex w-fit items-center gap-1.5 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400 sm:mx-0">
          <Ticket className="h-3.5 w-3.5" />
          {t.prizeBannerTag}
        </span>
        <p className="text-lg font-extrabold leading-tight sm:text-xl">
          {t.prizeBannerTitle}
        </p>
        <p className="text-sm text-muted-foreground">{t.prizeBannerDesc}</p>
        <span className="mt-1 text-xs font-semibold text-primary">
          {skipToClaimStep ? tPeserta.claimTeaserCta : t.prizeBannerCta} →
        </span>
      </div>
    </>
  );

  if (skipToClaimStep) {
    return (
      <>
        <button
          type="button"
          onClick={() => setClaimOpen(true)}
          className="mx-auto flex max-w-xl flex-col items-stretch overflow-hidden rounded-2xl border-2 border-dashed border-amber-400/60 bg-gradient-to-r from-amber-50 to-orange-50 text-left shadow-lg shadow-amber-500/10 transition-transform hover:scale-[1.01] dark:from-amber-950/40 dark:to-orange-950/40 sm:flex-row"
        >
          {bannerImage}
        </button>
        <ClaimCouponDialog
          open={claimOpen}
          onOpenChange={setClaimOpen}
          onClaimed={() => setClaimOpen(false)}
        />
      </>
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="mx-auto flex max-w-xl flex-col items-stretch overflow-hidden rounded-2xl border-2 border-dashed border-amber-400/60 bg-gradient-to-r from-amber-50 to-orange-50 text-left shadow-lg shadow-amber-500/10 transition-transform hover:scale-[1.01] dark:from-amber-950/40 dark:to-orange-950/40 sm:flex-row"
        >
          {bannerImage}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5 text-amber-600" />
            {t.prizeDialogTitle}
          </DialogTitle>
        </DialogHeader>
        <ol className="space-y-3 text-sm">
          {[t.prizeDialogStep1, t.prizeDialogStep2, t.prizeDialogStep3].map(
            (step, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-xs font-bold text-amber-700 dark:text-amber-400">
                  {i + 1}
                </span>
                <span className="pt-0.5 text-muted-foreground">{step}</span>
              </li>
            ),
          )}
        </ol>
        <DialogClose asChild>
          <Button className="w-full" onClick={goToParticipants}>
            {t.prizeDialogCta}
          </Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}

export function HomeBody() {
  const t = useTranslation("home");

  return (
    <div className="min-h-screen">
      <MaintenanceOverlay />
      <EventClosedOverlay />
      <JoinPopup />
      <Navbar />

      {/* Video pembuka (audio on, volume mengecil saat di-scroll). */}
      <HeroVideo />

      {/* Hero */}
      <section id="hero" className="relative scroll-mt-16 overflow-hidden border-b">
        <div className="container space-y-5 py-14 text-center md:py-20">
          {/* Dua penanda sebaris: penyelenggara & gelombang berjalan. Dulu
              bertumpuk sebagai dua baris pil sendiri-sendiri. */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-semibold text-primary">
              <GraduationCap className="h-4 w-4" />
              {t.badge}
            </span>
            <RoundCountdown />
          </div>

          <h1 className="mx-auto max-w-3xl text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-6xl">
            {t.heroTitle}
          </h1>

          {/* Badge gratis dijadikan bagian kalimat pembuka, bukan pil
              terpisah, supaya tidak menambah satu baris lagi. */}
          <p className="mx-auto max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            <b className="text-emerald-700 dark:text-emerald-400">
              {t.heroDescBold}
            </b>{" "}
            {t.heroDesc}
          </p>

          <PrizeBanner />

          <div className="flex flex-wrap items-center justify-center gap-3 pt-1 [&+a]:!mt-3">
            <Button
              size="lg"
              className="h-12 rounded-full px-7 text-base shadow-lg shadow-primary/25"
              asChild
            >
              <Link href="/gelombang">{t.rankingCta}</Link>
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
                {t.joinCta}
              </a>
            </Button>
          </div>

          {/* Tautan ke bio.stekom.ac.id: kumpulan tautan resmi (events, CS,
              dll). Sengaja dibedakan dari tombol "Daftar Jadi Peserta" yang
              langsung ke formulir, agar dua CTA ini tak rancu. Diberi baris
              sendiri: disandingkan dengan tombol besar, tautan teks polos
              tampak seperti elemen yang tercecer. */}
          <a
            href="https://bio.stekom.ac.id/daftarycs2026"
            target="_blank"
            rel="noopener"
            className="mx-auto block w-fit text-sm font-medium text-muted-foreground underline underline-offset-4 transition-colors hover:text-primary"
          >
            {t.registerBacklink}
          </a>
        </div>
      </section>

      {/* All participants */}
      <section id="peserta" className="container scroll-mt-20 py-8">
        <div className="mb-6">
          <VoterTodayPanel />
        </div>
        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {t.participantsTitle}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t.participantsSubtitle}
          </p>
        </div>
        <ParticipantGrid />
      </section>

      {/* FAQ biaya, jawaban wajib terlihat di halaman agar rich result FAQ valid. */}
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
              {t.faqTitle}
            </h2>
            <p className="mt-2 text-base font-semibold text-emerald-700 dark:text-emerald-400">
              {t.faqSubtitle}
            </p>
          </div>

          <dl className="space-y-4">
            {t.faq.map(({ q, a }) => (
              <div key={q} className="rounded-xl border bg-background p-4">
                <dt className="font-semibold">{q}</dt>
                <dd className="mt-1 text-sm text-muted-foreground">{a}</dd>
              </div>
            ))}
          </dl>

          <p className="mt-5 flex items-start justify-center gap-2 text-center text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <span>
              {t.officialInfoNote}{" "}
              <Link href="/panduan" className="text-primary hover:underline">
                {t.guidePageLink}
              </Link>
              .
            </span>
          </p>
        </div>
      </section>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} {t.footer}
      </footer>
    </div>
  );
}
