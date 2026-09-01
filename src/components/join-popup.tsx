"use client";

import * as React from "react";
import { GraduationCap, HelpCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Kunci localStorage: sekali ditutup, tak muncul lagi di browser itu. */
const DISMISS_KEY = "ycs.joinPopup.dismissed";
const SHOW_AFTER_MS = 6000;

/**
 * Ajakan mendaftar jadi peserta YCS untuk SEMUA pengunjung home, termasuk
 * yang belum punya akun. Muncul sekali per browser: begitu ditutup,
 * penandanya disimpan supaya tidak mengganggu kunjungan berikutnya.
 */
export function JoinPopup() {
  const t = useTranslation("joinPopup");
  const [open, setOpen] = React.useState(false);
  const [showHelp, setShowHelp] = React.useState(false);

  React.useEffect(() => {
    // localStorage bisa melempar di mode privat atau saat site data diblokir,
    // jadi kegagalan baca dianggap "belum pernah ditutup".
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      dismissed = false;
    }
    if (dismissed) return;

    const id = setTimeout(() => setOpen(true), SHOW_AFTER_MS);
    return () => clearTimeout(id);
  }, []);

  function close() {
    setOpen(false);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Tak apa: popup tetap tertutup untuk sesi ini.
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="join-popup-title"
    >
      {/* Latar gelap, klik untuk menutup */}
      <button
        aria-label={t.close}
        onClick={close}
        className="absolute inset-0 cursor-default bg-black/50 backdrop-blur-sm"
      />

      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border bg-card shadow-2xl">
        <span
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/20 blur-2xl"
        />

        <button
          onClick={close}
          aria-label={t.close}
          className="absolute right-3 top-3 z-10 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="relative space-y-4 p-6 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/30">
            <GraduationCap className="h-7 w-7 text-white" />
          </span>

          <div>
            <h2 id="join-popup-title" className="text-xl font-extrabold tracking-tight">
              {t.title}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{t.desc}</p>
          </div>

          <p className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-400">
            {t.freeBadge}
          </p>

          <div className="space-y-2">
            <Button className="h-11 w-full rounded-full text-base" asChild>
              <a
                href="https://events.stekom.ac.id/ycs2026"
                target="_blank"
                rel="noopener noreferrer"
                onClick={close}
              >
                <GraduationCap className="h-5 w-5" />
                {t.cta}
              </a>
            </Button>
            <button
              onClick={close}
              className="w-full cursor-pointer rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {t.later}
            </button>
          </div>

          {/* Penjelasan peran, disembunyikan di balik tanda tanya supaya
              popup tetap ringkas bagi yang sudah paham. */}
          <div className="border-t pt-3 text-left">
            <button
              onClick={() => setShowHelp((v) => !v)}
              aria-expanded={showHelp}
              className="flex w-full cursor-pointer items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
            >
              <HelpCircle className="h-3.5 w-3.5" />
              {t.helpToggle}
            </button>
            <div
              className={cn(
                "space-y-2 overflow-hidden text-xs text-muted-foreground transition-all",
                showHelp ? "mt-2 max-h-96" : "max-h-0",
              )}
            >
              <p>
                <b className="text-foreground">{t.roleParticipant}</b>{" "}
                {t.roleParticipantDesc}
              </p>
              <p>
                <b className="text-foreground">{t.roleVoter}</b>{" "}
                {t.roleVoterDesc}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
