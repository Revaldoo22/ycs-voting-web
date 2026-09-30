"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";

/** Baca satu query param dari URL saat ini (aman dipanggil di server: null). */
export function getParam(key: string): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get(key);
}

/**
 * Cerminkan state halaman ke query string (replaceState, tanpa menambah
 * riwayat). Dengan begitu tombol Kembali dari halaman detail memulihkan
 * filter/tab/level yang tadi dipilih, dan URL-nya bisa dibagikan.
 *
 * Nilai kosong (null/undefined/"") menghapus param-nya. Param lain di URL
 * dibiarkan, jadi beberapa komponen boleh memakai hook ini di halaman yang
 * sama selama nama param-nya tidak bentrok.
 */
export function useSyncSearchParams(
  values: Record<string, string | null | undefined>,
) {
  const serialized = JSON.stringify(values);
  React.useEffect(() => {
    const next = JSON.parse(serialized) as Record<
      string,
      string | null | undefined
    >;
    const sp = new URLSearchParams(window.location.search);
    for (const [k, v] of Object.entries(next)) {
      if (v) sp.set(k, v);
      else sp.delete(k);
    }
    const qs = sp.toString();
    window.history.replaceState(
      window.history.state,
      "",
      qs ? `${window.location.pathname}?${qs}` : window.location.pathname,
    );
  }, [serialized]);
}

/** Jumlah perpindahan halaman di dalam aplikasi sejak halaman ini dimuat. */
let inAppNavigations = 0;

/** Pasang sekali di root; menghitung perpindahan halaman untuk useSmartBack. */
export function NavTracker() {
  const pathname = usePathname();
  const first = React.useRef(true);
  React.useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    inAppNavigations += 1;
  }, [pathname]);
  return null;
}

/**
 * Aksi "Kembali" yang aman: kalau pengunjung datang dari halaman lain di situs
 * ini, mundur satu langkah riwayat (posisi scroll dan filter halaman asal
 * utuh). Kalau halaman dibuka langsung dari link luar, router.back() akan
 * membuang pengunjung keluar situs, jadi diarahkan ke `fallback`.
 */
export function useSmartBack(fallback: string = "/") {
  const router = useRouter();
  return React.useCallback(() => {
    let cameFromSite = inAppNavigations > 0;
    if (!cameFromSite && document.referrer) {
      try {
        cameFromSite = new URL(document.referrer).origin === window.location.origin;
      } catch {
        // referrer tidak bisa di-parse: anggap dari luar.
      }
    }
    if (cameFromSite) router.back();
    else router.push(fallback);
  }, [router, fallback]);
}
