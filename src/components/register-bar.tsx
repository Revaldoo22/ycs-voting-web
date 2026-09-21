"use client";

import { ArrowRight } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { REGISTER_URL } from "@/lib/event-links";

/**
 * Baris ajakan mendaftar yang SELALU ada di paling atas halaman.
 *
 * Banyak pengunjung mendarat di sini justru karena mencari pendaftaran:
 * halaman ini yang muncul di pencarian, sedangkan pendaftarannya ada di
 * situs event. Popup ajakan bisa ditutup dan tidur seharian, jadi tidak
 * bisa diandalkan; baris ini tidak bisa ditutup.
 *
 * Sengaja TIDAK sticky: tugasnya jadi hal pertama yang terbaca saat halaman
 * dibuka, bukan menempel dan memakan tinggi layar sepanjang orang menggulir.
 */
export function RegisterBar() {
  const t = useTranslation("home");
  return (
    <a
      href={REGISTER_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex w-full items-center justify-center gap-x-2 gap-y-0.5 border-b border-primary/20 bg-primary/10 px-4 py-2.5 text-center text-sm transition-colors hover:bg-primary/15 max-sm:flex-wrap"
    >
      <span className="font-semibold text-foreground">
        {t.registerBarQuestion}
      </span>
      {/* Kalimat penjelas: di layar sempit disembunyikan supaya baris tetap
          satu tarikan baca, pertanyaan + ajakan sudah cukup jelas. */}
      <span className="hidden text-muted-foreground sm:inline">
        {t.registerBarText}
      </span>
      <span className="inline-flex items-center gap-1 font-semibold text-primary underline-offset-4 group-hover:underline">
        {t.registerBarCta}
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </span>
    </a>
  );
}
