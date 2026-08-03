"use client";

import Link from "next/link";
import {
  Award,
  BadgeCheck,
  BookOpen,
  CalendarDays,
  GraduationCap,
  Heart,
  Info,
  MessageCircle,
  ShieldCheck,
  Ticket,
  UserRound,
  Wallet,
  Zap,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/lib/i18n";

const ADMIN_WA_DISPLAY = "+62 888-8555-591";

/** Satu langkah bernomor di dalam kartu panduan. */
function Step({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
        {n}
      </span>
      <div className="min-w-0">
        <p className="font-semibold">{title}</p>
        <p className="text-sm text-muted-foreground">{desc}</p>
      </div>
    </li>
  );
}

export function PanduanBody() {
  const t = useTranslation("panduan");
  const adminWaLink =
    "https://wa.me/628888555591?text=" + encodeURIComponent(t.adminWaMessage);

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="container max-w-5xl space-y-8 py-8">
        <div className="space-y-2 text-center">
          <h1 className="flex items-center justify-center gap-2 text-2xl font-bold tracking-tight">
            <BookOpen className="h-6 w-6 text-primary" />
            {t.pageTitle}
          </h1>
          <p className="mx-auto max-w-2xl text-sm text-muted-foreground">
            {t.intro}
          </p>
        </div>

        {/* ------------- Penegasan pendaftaran gratis (SEO utama) ------------- */}
        <section
          aria-labelledby="pendaftaran-gratis"
          className="rounded-2xl border border-emerald-500/40 bg-emerald-500/5 p-5 sm:p-6"
        >
          <div className="flex flex-col items-center gap-3 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15">
              <Wallet className="h-6 w-6 text-emerald-600" />
            </span>
            <h2
              id="pendaftaran-gratis"
              className="text-xl font-extrabold tracking-tight sm:text-2xl"
            >
              {t.freeTitle}
            </h2>
            <p className="mx-auto max-w-2xl text-sm text-muted-foreground">
              <b>{t.freeDescBold}</b> {t.freeDesc}
            </p>
          </div>

          <ul className="mt-5 grid gap-2 sm:grid-cols-3">
            {t.freeChecklist.map((item) => (
              <li
                key={item}
                className="flex items-start gap-2 rounded-xl border bg-background/60 p-3 text-sm font-medium"
              >
                <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <p className="mt-4 flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <span>
              <b>{t.scamWarningBold}</b> {t.scamWarning(ADMIN_WA_DISPLAY)}
            </span>
          </p>
        </section>

        <div className="grid gap-6 md:grid-cols-2">
          {/* ------------------- Panduan pendukung umum ------------------- */}
          <Card className="border-primary/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserRound className="h-5 w-5 text-primary" />
                {t.supporterCardTitle}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {t.supporterCardDesc}
              </p>
            </CardHeader>
            <CardContent>
              <ol className="space-y-4">
                {t.supporterSteps.map((s, i) => (
                  <Step key={s.title} n={i + 1} title={s.title} desc={s.desc} />
                ))}
              </ol>
              <div className="mt-4 space-y-1.5 rounded-xl border bg-muted/40 p-3 text-xs text-muted-foreground">
                <p>
                  <b>{t.supporterNote1Bold}</b> {t.supporterNote1}
                </p>
                <p>
                  {t.supporterNote2Pre}{" "}
                  <Ticket className="inline h-3.5 w-3.5" />{" "}
                  <b>{t.supporterNote2Bold}</b>
                  {t.supporterNote2End}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* --------------------- Panduan peserta --------------------- */}
          <Card className="border-accent/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-accent" />
                {t.participantCardTitle} <Badge variant="accent">{t.participantBadge}</Badge>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {t.participantCardDesc}
              </p>
            </CardHeader>
            <CardContent>
              <ol className="space-y-4">
                {t.participantSteps.map((s, i) => (
                  <Step key={s.title} n={i + 1} title={s.title} desc={s.desc} />
                ))}
              </ol>
              <div className="mt-4 space-y-1.5 rounded-xl border bg-muted/40 p-3 text-xs text-muted-foreground">
                <p>
                  {t.participantNote1Pre} <b>{t.participantNote1Bold}</b>{" "}
                  {t.participantNote1End}
                </p>
                <p>{t.participantNote2}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ---------------- Timeline & info kegiatan YCS 2026 ---------------- */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              {t.timelineTitle}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {t.timelineSubtitle}
            </p>
          </CardHeader>
          <CardContent className="space-y-5">
            <ol className="space-y-4">
              {t.timelineSteps.map((s, i) => (
                <Step key={s.title} n={i + 1} title={s.title} desc={s.desc} />
              ))}
            </ol>

            {/* Jalur kelulusan */}
            <div className="grid grid-cols-3 gap-2 text-center">
              {t.passStats.map((s) => (
                <div key={s.label} className="rounded-xl border bg-muted/40 p-3">
                  <p className="text-2xl font-extrabold text-primary">{s.n}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="space-y-3 rounded-xl border bg-muted/40 p-4 text-sm">
              <p className="flex items-start gap-2">
                <Zap className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                <span>
                  <b>{t.goldenBuzzerBold}</b> {t.goldenBuzzerDesc}
                </span>
              </p>
              <p className="flex items-start gap-2">
                <Award className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>
                  <b>{t.semiFinalSelectionBold}</b> {t.semiFinalSelectionDesc}
                </span>
              </p>
              <p className="flex items-start gap-2">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>
                  <b>{t.scholarshipRuleBold}</b> {t.scholarshipRuleDesc}
                </span>
              </p>
              <p className="flex items-start gap-2">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>
                  <b>{t.groupRuleBold}</b> {t.groupRuleDesc}
                </span>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* -------- FAQ biaya: teks jawaban sinkron dengan FAQ_JSON_LD -------- */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-emerald-600" />
              {t.faqTitle}
            </CardTitle>
            <p className="text-sm text-muted-foreground">{t.faqSubtitle}</p>
          </CardHeader>
          <CardContent>
            <dl className="space-y-4">
              {t.faq.map((qa) => (
                <div key={qa.q} className="space-y-1">
                  <dt className="font-semibold">{qa.q}</dt>
                  <dd className="text-sm text-muted-foreground">{qa.a}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        {/* ------------------------- Bantuan ------------------------- */}
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
            <Heart className="h-6 w-6 text-emerald-600" />
            <div>
              <p className="font-semibold">{t.helpTitle}</p>
              <p className="text-sm text-muted-foreground">{t.helpDesc}</p>
            </div>
            <Button
              asChild
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <a href={adminWaLink} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-4 w-4" />
                {t.contactAdmin(ADMIN_WA_DISPLAY)}
              </a>
            </Button>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          {t.readyToSupport}{" "}
          <Link href="/" className="text-primary hover:underline">
            {t.backToHome}
          </Link>{" "}
          {t.andChooseParticipant}
        </p>
      </main>
    </div>
  );
}
