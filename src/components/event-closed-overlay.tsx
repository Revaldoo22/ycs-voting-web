"use client";

import {
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  GraduationCap,
  PartyPopper,
  Rocket,
  Sparkles,
  Wallet,
  Wifi,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/lib/queries";
import { useTranslation } from "@/lib/i18n";

const PMB_URL =
  "https://pmb.stekom.ac.id/?utm_source=fkp&utm_medium=overlay&utm_campaign=festival_karakter_pelajar&utm_content=event_closed";

const REASON_ICONS = [
  CalendarClock,
  Wallet,
  GraduationCap,
  BadgeCheck,
  Rocket,
  Wifi,
];

/**
 * Full-screen overlay shown on home & voter pages when the admin closes the
 * event (app_settings.event_open = false). Berisi info event sudah ditutup,
 * ajakan untuk event berikutnya + promosi PMB Universitas STEKOM dengan CTA
 * ber-UTM ke pmb.stekom.ac.id.
 */
export function EventClosedOverlay() {
  const { data: settings } = useSettings();
  const t = useTranslation("eventClosedOverlay");
  if (!settings || settings.event_open) return null;

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-gradient-to-br from-primary via-blue-600 to-indigo-700">
      {/* dekorasi blur */}
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-white/10 blur-3xl" />

      <div className="container relative flex min-h-full flex-col items-center justify-center gap-5 py-10">
        {/* Event closed notice */}
        <div className="w-full max-w-3xl overflow-hidden rounded-3xl border bg-card shadow-2xl">
          <div className="space-y-3 bg-gradient-to-b from-primary/10 to-transparent p-6 text-center sm:p-8">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
              <PartyPopper className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              {t.title}
            </h1>
            <p className="mx-auto max-w-xl text-muted-foreground">
              {settings.closed_message || t.defaultMessage}
            </p>
          </div>
        </div>

        {/* STEKOM promo */}
        <div className="w-full max-w-3xl space-y-5 rounded-3xl border bg-card p-6 shadow-2xl sm:p-8">
          <div className="space-y-2 text-center">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium">
              <Sparkles className="h-4 w-4 text-primary" />
              {t.promoTag}
            </div>
            <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
              {t.promoTitle}
            </h2>
            <p className="mx-auto max-w-xl text-sm text-muted-foreground">
              {t.promoDescription}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {t.reasons.map(({ title, desc }, i) => {
              const Icon = REASON_ICONS[i];
              return (
              <div
                key={title}
                className="group flex gap-3 rounded-2xl border bg-background/60 p-4 transition-colors hover:border-primary/40 hover:bg-primary/[0.04]"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-base font-bold text-primary ring-1 ring-primary/15">
                  {i + 1}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold leading-tight">
                    <Icon className="h-4 w-4 shrink-0 text-primary" />
                    {title}
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {desc}
                  </p>
                </div>
              </div>
              );
            })}
          </div>

          {/* CTA */}
          <div className="space-y-3 rounded-2xl bg-gradient-to-r from-primary/10 to-indigo-500/10 p-5 text-center">
            <p className="flex items-center justify-center gap-1.5 text-sm font-medium">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              {t.registrationOpen}
            </p>
            <Button size="lg" className="w-full sm:w-auto" asChild>
              <a href={PMB_URL} target="_blank" rel="noopener noreferrer">
                {t.cta}
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
            <p className="text-xs text-muted-foreground">{t.ctaInfo}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
