"use client";

import * as React from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

/** Waktu terakhir ditutup, disimpan supaya jeda tetap berlaku antar refresh. */
const DISMISS_AT_KEY = "ycs.joinPopup.dismissedAt";
/** Jeda muncul lagi setelah ditutup. */
const SNOOZE_MS = 5 * 60 * 1000;
/** Jeda tampil setelah halaman dibuka, biar tidak menimpa konten. */
const SHOW_AFTER_MS = 6000;
/** Sudah mengklik banner: anggap selesai, jangan diganggu lagi hari itu. */
const CLICKED_SNOOZE_MS = 24 * 60 * 60 * 1000;
const REGISTER_URL = "https://events.stekom.ac.id/ycs2026";

/**
 * Ajakan mendaftar jadi peserta YCS untuk SEMUA pengunjung home, termasuk
 * yang belum punya akun. Isinya hanya banner: seluruh pesan sudah ada di
 * gambar, termasuk instruksi mengklik banner, jadi gambarnya sendiri yang
 * jadi tautan pendaftaran.
 *
 * Muncul ulang setelah refresh, dengan jeda 5 menit sejak terakhir ditutup.
 * Waktu tutup disimpan di localStorage, bukan state, supaya jeda tetap
 * berlaku walau halaman di-refresh berkali-kali. Selama halaman dibiarkan
 * terbuka, popup juga muncul kembali tiap 5 menit.
 */
export function JoinPopup() {
  const t = useTranslation("joinPopup");
  const [open, setOpen] = React.useState(false);
  // Banner gagal dimuat: sembunyikan seluruh popup. Menampilkan alt text
  // sebagai blok besar di tengah layar lebih mengganggu daripada tak ada
  // popup sama sekali.
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    // localStorage bisa melempar di mode privat atau saat site data diblokir,
    // jadi kegagalan baca dianggap "belum pernah ditutup".
    function msUntilAllowed() {
      let last = 0;
      try {
        last = Number(localStorage.getItem(DISMISS_AT_KEY)) || 0;
      } catch {
        last = 0;
      }
      const elapsed = Date.now() - last;
      return elapsed >= SNOOZE_MS ? 0 : SNOOZE_MS - elapsed;
    }

    // Tampil pertama: tunggu jeda buka halaman, atau sisa jeda 5 menit kalau
    // baru saja ditutup, mana yang lebih lama.
    const first = setTimeout(
      () => setOpen(true),
      Math.max(SHOW_AFTER_MS, msUntilAllowed()),
    );

    // Halaman yang dibiarkan terbuka: cek berkala, muncul lagi tiap 5 menit.
    const tick = setInterval(() => {
      if (msUntilAllowed() === 0) setOpen(true);
    }, 30_000);

    return () => {
      clearTimeout(first);
      clearInterval(tick);
    };
  }, []);

  /**
   * `snoozeMs` dipakai untuk menggeser waktu tutup ke depan. Pengunjung yang
   * mengklik banner sudah menuju pendaftaran, jadi tak perlu dikejar popup
   * tiap 5 menit; jedanya dibuat sehari.
   */
  const close = React.useCallback((snoozeMs = 0) => {
    setOpen(false);
    try {
      localStorage.setItem(
        DISMISS_AT_KEY,
        String(Date.now() + Math.max(0, snoozeMs - SNOOZE_MS)),
      );
    } catch {
      // Tak apa: popup tetap tertutup sampai pengecekan berkala berikutnya.
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

  if (!open || failed) return null;

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
        onClick={() => close()}
        className="absolute inset-0 cursor-default bg-black/60 backdrop-blur-sm"
      />

      <div className="relative w-full max-w-sm sm:max-w-md">
        <button
          onClick={() => close()}
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
          onClick={() => close(CLICKED_SNOOZE_MS)}
          className="block overflow-hidden rounded-2xl shadow-2xl"
        >
          <Image
            src="/pop.jpeg"
            alt={t.imageAlt}
            width={1080}
            height={1080}
            priority
            onError={() => setFailed(true)}
            className="h-auto w-full"
          unoptimized
          />
        </a>
      </div>
    </div>
  );
}
