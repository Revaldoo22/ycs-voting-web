"use client";

import * as React from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

/** Kunci localStorage: sekali ditutup, tak muncul lagi di browser itu. */
const DISMISS_KEY = "ycs.joinPopup.dismissed";
const SHOW_AFTER_MS = 6000;
const REGISTER_URL = "https://events.stekom.ac.id/ycs2026";

/**
 * Ajakan mendaftar jadi peserta YCS untuk SEMUA pengunjung home, termasuk
 * yang belum punya akun. Isinya hanya banner: seluruh pesan sudah ada di
 * gambar, termasuk instruksi mengklik banner, jadi gambarnya sendiri yang
 * jadi tautan pendaftaran.
 *
 * Muncul sekali per browser: begitu ditutup, penandanya disimpan supaya tidak
 * mengganggu kunjungan berikutnya.
 */
export function JoinPopup() {
  const t = useTranslation("joinPopup");
  const [open, setOpen] = React.useState(false);

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

  const close = React.useCallback(() => {
    setOpen(false);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Tak apa: popup tetap tertutup untuk sesi ini.
    }
  }, []);

  // Esc menutup, kebiasaan yang diharapkan dari dialog.
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t.title}
    >
      {/* Latar gelap, klik untuk menutup */}
      <button
        aria-label={t.close}
        onClick={close}
        className="absolute inset-0 cursor-default bg-black/60 backdrop-blur-sm"
      />

      <div className="relative w-full max-w-sm sm:max-w-md">
        <button
          onClick={close}
          aria-label={t.close}
          className="absolute -top-3 right-0 z-10 cursor-pointer rounded-full bg-white p-2 text-slate-700 shadow-lg transition-transform hover:scale-105 sm:-right-3"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Gambarnya sendiri jadi tautan: banner memuat instruksi
            "klik banner untuk mendaftar". */}
        <a
          href={REGISTER_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={close}
          className="block overflow-hidden rounded-2xl shadow-2xl"
        >
          <Image
            src="/pop.jpeg"
            alt={t.imageAlt}
            width={1080}
            height={1080}
            priority
            className="h-auto w-full"
          />
        </a>
      </div>
    </div>
  );
}
