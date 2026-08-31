"use client";

import * as React from "react";
import Link from "next/link";
import {
  Award,
  BadgeCheck,
  BookOpen,
  CalendarDays,
  ChevronDown,
  GraduationCap,
  Heart,
  Info,
  Layers,
  MessageCircle,
  Search,
  SearchX,
  ShieldCheck,
  Ticket,
  UserRound,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/lib/i18n";
import { csWaLink, CS_WA_DISPLAY } from "@/lib/contact";

/** Ratakan segala bentuk nilai dictionary (string, array, objek) jadi satu
 *  string pencarian, dipakai supaya searchbar bisa memindai isi tiap section
 *  tanpa perlu daftar field manual per section. */
function flattenToSearchText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(flattenToSearchText).join(" ");
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>)
      .map(flattenToSearchText)
      .join(" ");
  }
  return "";
}

function normalizeSearch(s: string): string {
  return s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");
}

/** Satu langkah bernomor di dalam kartu panduan (subpoin di dalam SectionCard). */
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

/**
 * Kartu section utama, bentuk SERAGAM untuk semua poin panduan (nomor bulat
 * besar + ikon + judul + deskripsi singkat opsional di header). Membuat
 * seluruh halaman terasa satu pola yang sama walau isi tiap poin beda-beda.
 */
function SectionCard({
  id,
  n,
  icon,
  title,
  desc,
  accent = "primary",
  hidden,
  children,
}: {
  id: string;
  n: number;
  icon: React.ReactNode;
  title: React.ReactNode;
  desc?: string;
  accent?: "primary" | "accent" | "emerald";
  hidden?: boolean;
  children: React.ReactNode;
}) {
  const accentClasses = {
    primary: "bg-primary/10 text-primary",
    accent: "bg-accent/10 text-accent",
    emerald: "bg-emerald-500/15 text-emerald-600",
  }[accent];
  const borderClasses = {
    primary: "border-primary/30",
    accent: "border-accent/40",
    emerald: "border-emerald-500/30",
  }[accent];

  if (hidden) return null;

  return (
    <Card id={id} className={`scroll-mt-24 ${borderClasses}`}>
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="flex flex-wrap items-center gap-2 sm:gap-3">
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold sm:h-9 sm:w-9 sm:text-base ${accentClasses}`}
          >
            {n}
          </span>
          <span className="flex flex-1 flex-wrap items-center gap-2 text-base sm:text-lg">
            {icon}
            {title}
          </span>
        </CardTitle>
        {desc && (
          <p className="pl-10 text-sm text-muted-foreground sm:pl-12">
            {desc}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4 p-4 pt-0 sm:p-6 sm:pt-0">
        {children}
      </CardContent>
    </Card>
  );
}

/**
 * Satu item Daftar Isi di sidebar, plus versi ringkas untuk dropdown mobile.
 * Scroll halus ke section (bukan lompat instan bawaan browser lewat #anchor).
 */
function TocLink({
  href,
  onNavigate,
  children,
}: {
  href: string;
  onNavigate?: () => void;
  children: React.ReactNode;
}) {
  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    const el = document.querySelector(href);
    if (!el) return;
    e.preventDefault();
    onNavigate?.();
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <a
      href={href}
      onClick={handleClick}
      className="rounded-lg px-2.5 py-2 text-sm text-primary transition-colors hover:bg-primary/10 hover:underline sm:py-1.5"
    >
      {children}
    </a>
  );
}

export function PanduanBody() {
  const t = useTranslation("panduan");
  const adminWaLink = csWaLink(t.adminWaMessage);
  const mobileTocRef = React.useRef<HTMLDetailsElement>(null);
  const [search, setSearch] = React.useState("");

  const tocItems = [
    { href: "#pendaftaran-gratis", label: t.tocFree },
    { href: "#untuk-pendukung", label: t.tocSupporter },
    { href: "#untuk-peserta", label: t.tocParticipant },
    { href: "#timeline", label: t.tocTimeline },
    { href: "#akumulasi-slot", label: t.tocSlot },
    { href: "#faq-biaya", label: t.tocFaq },
    { href: "#bantuan", label: t.tocHelp },
  ];

  // Teks pencarian per section: judul + seluruh isi (subpoin) yang relevan,
  // diratakan jadi satu string supaya searchbar bisa memindai tiap poin.
  const sectionSearchText = {
    "pendaftaran-gratis": flattenToSearchText([
      t.freeTitle,
      t.freeDescBold,
      t.freeDesc,
      t.freeChecklist,
      t.scamWarningBold,
      t.scamWarning(CS_WA_DISPLAY),
    ]),
    "untuk-pendukung": flattenToSearchText([
      t.supporterCardTitle,
      t.supporterCardDesc,
      t.supporterSteps,
      t.supporterNote1Bold,
      t.supporterNote1,
      t.supporterNote2Pre,
      t.supporterNote2Bold,
    ]),
    "untuk-peserta": flattenToSearchText([
      t.participantCardTitle,
      t.participantBadge,
      t.participantCardDesc,
      t.participantSteps,
      t.participantNote1Pre,
      t.participantNote1Bold,
      t.participantNote1End,
      t.participantNote2,
    ]),
    timeline: flattenToSearchText([
      t.timelineTitle,
      t.timelineSubtitle,
      t.timelineSteps,
      t.passStats,
      t.goldenBuzzerBold,
      t.goldenBuzzerDesc,
      t.semiFinalSelectionBold,
      t.semiFinalSelectionDesc,
      t.scholarshipRuleBold,
      t.scholarshipRuleDesc,
      t.groupRuleBold,
      t.groupRuleDesc,
    ]),
    "akumulasi-slot": flattenToSearchText([
      t.slotTitle,
      t.slotSubtitle,
      t.slotIntro,
      t.slotRuleTitle,
      t.slotRuleDesc,
      t.slotNotBurnedBold,
      t.slotNotBurnedDesc,
      t.slotExampleTitle,
      t.slotExampleRows,
      t.slotExampleResult,
      t.slotNoteTitle,
      t.slotNotes,
    ]),
    "faq-biaya": flattenToSearchText([t.faqTitle, t.faqSubtitle, t.faq]),
    bantuan: flattenToSearchText([
      t.helpTitle,
      t.helpDesc,
      t.contactAdmin(CS_WA_DISPLAY),
    ]),
  } as const;

  const normalizedQuery = normalizeSearch(search.trim());
  const isSearching = normalizedQuery.length > 0;
  function matches(sectionId: keyof typeof sectionSearchText): boolean {
    if (!isSearching) return true;
    return normalizeSearch(sectionSearchText[sectionId]).includes(
      normalizedQuery,
    );
  }
  const visibleTocItems = tocItems.filter((item) =>
    matches(item.href.slice(1) as keyof typeof sectionSearchText),
  );
  const noResults = isSearching && visibleTocItems.length === 0;

  return (
    <div className="min-h-screen bg-muted/20">
      <Navbar />

      {/* Header banner, senada dengan tema utama situs (bukan konten kartu). */}
      <div className="bg-gradient-to-r from-primary to-cyan-600 text-primary-foreground shadow-sm">
        <div className="container max-w-5xl px-4 py-8 text-center sm:py-12">
          <h1 className="flex items-center justify-center gap-2 text-2xl font-bold tracking-tight sm:text-4xl">
            <BookOpen className="h-6 w-6 shrink-0 sm:h-8 sm:w-8" />
            {t.pageTitle}
          </h1>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-primary-foreground/90 sm:text-lg">
            {t.pageSubtitle}
          </p>

          {/* Cari informasi di seluruh isi panduan (per poin, bukan per kata). */}
          <div className="relative mx-auto mt-4 max-w-md sm:mt-5">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.searchPlaceholder}
              aria-label={t.searchPlaceholder}
              className="h-11 rounded-full border-0 bg-white pl-10 pr-9 text-sm text-foreground shadow-md focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-0"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label={t.searchClear}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      <main className="container max-w-5xl px-4 py-6 sm:py-8">
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3 lg:gap-8">
          {/* ----------------------- Konten utama ----------------------- */}
          <div className="space-y-6 lg:col-span-2">
            <p className="text-center text-sm text-muted-foreground lg:text-left">
              {t.intro}
            </p>

            {/* --------------- Daftar Isi ringkas (mobile, collapsible) --------------- */}
            <details
              ref={mobileTocRef}
              className="group rounded-2xl border bg-background p-4 shadow-sm lg:hidden"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-bold text-primary">
                {t.tocTitle}
                <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" />
              </summary>
              <nav className="mt-2 flex flex-col gap-1">
                {visibleTocItems.map((item) => (
                  <TocLink
                    key={item.href}
                    href={item.href}
                    onNavigate={() => {
                      if (mobileTocRef.current) mobileTocRef.current.open = false;
                    }}
                  >
                    {item.label}
                  </TocLink>
                ))}
              </nav>
            </details>

            {/* ------------------- Tidak ada hasil pencarian ------------------- */}
            {noResults && (
              <div className="flex flex-col items-center gap-2 rounded-2xl border bg-background p-8 text-center">
                <SearchX className="h-8 w-8 text-muted-foreground" />
                <p className="font-semibold">{t.searchNoResultsTitle}</p>
                <p className="max-w-sm text-sm text-muted-foreground">
                  {t.searchNoResults(search.trim())}
                </p>
                <Button variant="outline" size="sm" onClick={() => setSearch("")}>
                  {t.searchClear}
                </Button>
              </div>
            )}

            {/* ---------------------- 1. Pendaftaran Gratis ---------------------- */}
            <SectionCard
              id="pendaftaran-gratis"
              n={1}
              icon={<Wallet className="h-5 w-5 shrink-0 text-emerald-600" />}
              title={t.freeTitle}
              accent="emerald"
              hidden={!matches("pendaftaran-gratis")}
            >
              <p className="text-sm text-muted-foreground">
                <b>{t.freeDescBold}</b> {t.freeDesc}
              </p>

              <ul className="grid gap-2 sm:grid-cols-3">
                {t.freeChecklist.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2 rounded-xl border bg-muted/40 p-3 text-sm font-medium"
                  >
                    <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <p className="flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <span>
                  <b>{t.scamWarningBold}</b> {t.scamWarning(CS_WA_DISPLAY)}
                </span>
              </p>
            </SectionCard>

            {/* ------------------- 2. Panduan pendukung umum ------------------- */}
            <SectionCard
              id="untuk-pendukung"
              n={2}
              icon={<UserRound className="h-5 w-5 shrink-0 text-primary" />}
              title={t.supporterCardTitle}
              desc={t.supporterCardDesc}
              hidden={!matches("untuk-pendukung")}
            >
              <ol className="space-y-4">
                {t.supporterSteps.map((s, i) => (
                  <Step key={s.title} n={i + 1} title={s.title} desc={s.desc} />
                ))}
              </ol>
              <div className="space-y-1.5 rounded-xl border bg-muted/40 p-3 text-xs text-muted-foreground">
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
            </SectionCard>

            {/* --------------------- 3. Panduan peserta --------------------- */}
            <SectionCard
              id="untuk-peserta"
              n={3}
              icon={<GraduationCap className="h-5 w-5 shrink-0 text-accent" />}
              title={
                <span className="flex flex-wrap items-center gap-2">
                  {t.participantCardTitle}
                  <Badge variant="accent">{t.participantBadge}</Badge>
                </span>
              }
              desc={t.participantCardDesc}
              accent="accent"
              hidden={!matches("untuk-peserta")}
            >
              <ol className="space-y-4">
                {t.participantSteps.map((s, i) => (
                  <Step key={s.title} n={i + 1} title={s.title} desc={s.desc} />
                ))}
              </ol>
              <div className="space-y-1.5 rounded-xl border bg-muted/40 p-3 text-xs text-muted-foreground">
                <p>
                  {t.participantNote1Pre} <b>{t.participantNote1Bold}</b>{" "}
                  {t.participantNote1End}
                </p>
                <p>{t.participantNote2}</p>
              </div>
            </SectionCard>

            {/* ---------------- 4. Timeline & info kegiatan YCS 2026 ---------------- */}
            <SectionCard
              id="timeline"
              n={4}
              icon={<CalendarDays className="h-5 w-5 shrink-0 text-primary" />}
              title={t.timelineTitle}
              desc={t.timelineSubtitle}
              hidden={!matches("timeline")}
            >
              <ol className="space-y-4">
                {t.timelineSteps.map((s, i) => (
                  <Step key={s.title} n={i + 1} title={s.title} desc={s.desc} />
                ))}
              </ol>

              {/* Jalur kelulusan */}
              <div className="grid grid-cols-1 gap-2 text-center sm:grid-cols-3">
                {t.passStats.map((s) => (
                  <div
                    key={s.label}
                    className="flex items-center justify-center gap-2 rounded-xl border bg-muted/40 p-3 sm:flex-col sm:gap-0"
                  >
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
            </SectionCard>

            {/* ------------- 5. Akumulasi slot antar gelombang ------------- */}
            <SectionCard
              id="akumulasi-slot"
              n={5}
              icon={<Layers className="h-5 w-5 shrink-0 text-primary" />}
              title={t.slotTitle}
              desc={t.slotSubtitle}
              hidden={!matches("akumulasi-slot")}
            >
              <p className="text-sm">{t.slotIntro}</p>

              <div className="space-y-3 rounded-xl border bg-muted/40 p-4 text-sm">
                <p className="font-semibold">{t.slotRuleTitle}</p>
                <p className="text-muted-foreground">{t.slotRuleDesc}</p>
                <p className="flex items-start gap-2">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>
                    <b>{t.slotNotBurnedBold}</b> {t.slotNotBurnedDesc}
                  </span>
                </p>
              </div>

              {/* Contoh perhitungan */}
              <div className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
                <p className="text-sm font-semibold text-primary">
                  {t.slotExampleTitle}
                </p>
                <div className="space-y-2">
                  {t.slotExampleRows.map((row) => (
                    <div
                      key={row.label}
                      className="flex items-center justify-between gap-3 rounded-lg bg-background/70 px-3 py-2 text-sm"
                    >
                      <span className="text-muted-foreground">{row.label}</span>
                      <span className="shrink-0 font-bold tabular-nums text-primary">
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-sm font-semibold">{t.slotExampleResult}</p>
              </div>

              <div className="space-y-2 rounded-xl border border-amber-400/40 bg-amber-50 p-4 text-sm text-amber-900">
                <p className="flex items-center gap-2 font-bold">
                  <Info className="h-4 w-4 shrink-0" />
                  {t.slotNoteTitle}
                </p>
                {t.slotNotes.map((n) => (
                  <p key={n} className="text-amber-900/90">
                    {n}
                  </p>
                ))}
              </div>
            </SectionCard>

            {/* -------- 6. FAQ biaya: teks jawaban sinkron dengan FAQ_JSON_LD -------- */}
            <SectionCard
              id="faq-biaya"
              n={6}
              icon={<Wallet className="h-5 w-5 shrink-0 text-emerald-600" />}
              title={t.faqTitle}
              desc={t.faqSubtitle}
              accent="emerald"
              hidden={!matches("faq-biaya")}
            >
              <dl className="space-y-4">
                {t.faq.map((qa) => (
                  <div key={qa.q} className="space-y-1">
                    <dt className="font-semibold">{qa.q}</dt>
                    <dd className="text-sm text-muted-foreground">{qa.a}</dd>
                  </div>
                ))}
              </dl>
            </SectionCard>

            {/* ------------------------- 7. Bantuan ------------------------- */}
            <SectionCard
              id="bantuan"
              n={7}
              icon={<Heart className="h-5 w-5 shrink-0 text-emerald-600" />}
              title={t.helpTitle}
              desc={t.helpDesc}
              accent="emerald"
              hidden={!matches("bantuan")}
            >
              <Button
                asChild
                className="h-auto min-h-9 w-full whitespace-normal bg-emerald-600 py-2 text-center text-white hover:bg-emerald-700 sm:w-auto"
              >
                <a href={adminWaLink} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="h-4 w-4 shrink-0" />
                  {t.contactAdmin(CS_WA_DISPLAY)}
                </a>
              </Button>
            </SectionCard>

            <p className="text-center text-xs text-muted-foreground lg:text-left">
              {t.readyToSupport}{" "}
              <Link href="/" className="text-primary hover:underline">
                {t.backToHome}
              </Link>{" "}
              {t.andChooseParticipant}
            </p>
          </div>

          {/* ------------------- Sidebar Daftar Isi (desktop) ------------------- */}
          <aside className="hidden lg:sticky lg:top-20 lg:block lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
            <div className="rounded-2xl border bg-background p-5 shadow-sm">
              <h2 className="mb-3 text-base font-bold text-primary">
                {t.tocTitle}
              </h2>
              <nav className="flex flex-col gap-1">
                {visibleTocItems.map((item) => (
                  <TocLink key={item.href} href={item.href}>
                    {item.label}
                  </TocLink>
                ))}
                {noResults && (
                  <p className="px-2.5 py-1.5 text-xs text-muted-foreground">
                    {t.searchNoResultsTitle}
                  </p>
                )}
              </nav>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
