import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(n: number | null | undefined): string {
  return new Intl.NumberFormat("id-ID").format(n ?? 0);
}

/** Kirim event ke GA4 (gtag) bila tersedia. Aman dipanggil di mana saja. */
export function trackEvent(
  name: string,
  params?: Record<string, unknown>,
): void {
  if (typeof window === "undefined") return;
  const w = window as unknown as {
    gtag?: (...args: unknown[]) => void;
  };
  w.gtag?.("event", name, params ?? {});
}

/** Human label for a voter status code. */
export function voterStatusLabel(status: string | null | undefined): string {
  switch (status) {
    case "teman_sekolah":
      return "Teman satu sekolah";
    case "guru":
      return "Guru";
    case "keluarga":
      return "Keluarga";
    case "teman_luar":
      return "Teman di luar sekolah";
    case "peserta":
      return "Peserta";
    default:
      return "";
  }
}

/** Normalize an Indonesian phone number to a canonical 08xxxx form. */
export function normalizePhone(raw: string): string {
  let p = raw.replace(/[\s\-().]/g, "");
  if (p.startsWith("+62")) p = "0" + p.slice(3);
  else if (p.startsWith("62")) p = "0" + p.slice(2);
  return p;
}
