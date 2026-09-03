"use client";

import * as React from "react";
import { useTranslation } from "@/lib/i18n";

const VIDEO_ID = "unCD3pcd0FA";

/** Loader SDK YouTube dibagi ke semua instance, hanya dimuat sekali. */
let apiPromise: Promise<void> | null = null;

function loadYouTubeApi(): Promise<void> {
  if (apiPromise) return apiPromise;
  apiPromise = new Promise<void>((resolve) => {
    // Sudah siap (mis. karena navigasi client-side sebelumnya).
    if (window.YT?.Player) {
      resolve();
      return;
    }
    // SDK memanggil callback global ini saat siap. Rantai dengan callback yang
    // mungkin sudah ada supaya tidak saling menimpa.
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
    if (!document.getElementById("youtube-iframe-api")) {
      const s = document.createElement("script");
      s.id = "youtube-iframe-api";
      s.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(s);
    }
  });
  return apiPromise;
}

/**
 * Video pembuka YouTube dengan audio. Kebijakan browser melarang autoplay
 * bersuara, jadi mulai muted lalu unmute pada interaksi pertama user
 * (scroll/klik/sentuh). Volume mengecil seiring section di-scroll keluar
 * layar, makin ke bawah, makin pelan; senyap saat video tak terlihat.
 *
 * Memakai IFrame API resmi, bukan postMessage mentah, karena kita perlu tahu
 * kapan playback berhenti. Browser kadang menghentikan video iframe yang tak
 * terlihat atau tak bersuara; lewat onStateChange kita deteksi dan lanjutkan
 * lagi, supaya video tidak pernah terlihat ter-pause saat di-scroll.
 */
export function HeroVideo() {
  const t = useTranslation("heroVideo");
  const hostRef = React.useRef<HTMLDivElement>(null);
  const sectionRef = React.useRef<HTMLElement>(null);
  const playerRef = React.useRef<YTPlayer | null>(null);
  const unmutedRef = React.useRef(false);
  const lastVolumeRef = React.useRef(-1);
  // Kalau user sengaja pause (klik), jangan dipaksa jalan terus.
  const userPausedRef = React.useRef(false);

  React.useEffect(() => {
    let cancelled = false;

    // Volume 0..100 dari seberapa section terlihat: penuh terlihat = 100,
    // ter-scroll keluar = mengecil ke 0.
    const computeVolume = () => {
      const el = sectionRef.current;
      if (!el) return 0;
      const rect = el.getBoundingClientRect();
      const h = rect.height || 1;
      const visible =
        Math.max(0, Math.min(rect.bottom, window.innerHeight)) -
        Math.max(rect.top, 0);
      const ratio = Math.max(0, Math.min(1, visible / h));
      return Math.round(ratio * 100);
    };

    // Objek player sudah ada sebelum API-nya siap, jadi keberadaan method
    // diperiksa dulu. Tanpa ini `p.unMute is not a function` memutus handler
    // scroll dan volume berhenti mengikuti posisi halaman.
    const isReady = (p: YTPlayer | null): boolean =>
      !!p &&
      typeof p.unMute === "function" &&
      typeof p.mute === "function" &&
      typeof p.isMuted === "function" &&
      typeof p.setVolume === "function";

    const applyVolume = () => {
      const p = playerRef.current;
      if (!isReady(p) || !p || !unmutedRef.current) return;
      const vol = computeVolume();
      if (vol === lastVolumeRef.current) return;
      lastVolumeRef.current = vol;
      // Selalu setVolume, inilah "volume turun perlahan" yang diinginkan.
      p.setVolume(vol);
      // Di volume 0 pakai mute() supaya browser tidak menganggap tab ini
      // sumber audio aktif, tapi playback tetap dibiarkan jalan.
      if (vol === 0) p.mute();
      else if (p.isMuted()) p.unMute();
    };

    // Interaksi pertama → unmute. (Autoplay bersuara diblokir browser.)
    const unmute = () => {
      const p = playerRef.current;
      // Belum siap: jangan tandai sudah unmute, biar dicoba lagi nanti.
      if (!isReady(p) || !p || unmutedRef.current) return;
      unmutedRef.current = true;
      const vol = computeVolume();
      lastVolumeRef.current = vol;
      p.unMute();
      p.setVolume(vol);
    };

    const onScroll = () => {
      unmute();
      applyVolume();
    };

    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      lastVolumeRef.current = -1;
      if (!userPausedRef.current) playerRef.current?.playVideo();
      applyVolume();
    };

    loadYouTubeApi().then(() => {
      if (cancelled || !hostRef.current) return;

      playerRef.current = new window.YT!.Player(hostRef.current, {
        videoId: VIDEO_ID,
        playerVars: {
          autoplay: 1,
          mute: 1,
          loop: 1,
          playlist: VIDEO_ID,
          controls: 0,
          rel: 0,
          playsinline: 1,
          modestbranding: 1,
          // Wajib cocok dengan origin halaman, tanpa ini, postMessage
          // antara iframe & parent (dasar IFrame API: playVideo(),
          // onStateChange, dst.) bisa ditolak diam-diam di domain produksi
          // HTTPS meski tetap "berhasil" di localhost HTTP.
          origin: window.location.origin,
        },
        events: {
          onReady: (e) => {
            e.target.mute();
            e.target.playVideo();
          },
          onStateChange: (e) => {
            // -1 unstarted, 0 ended, 1 playing, 2 paused, 3 buffering, 5 cued.
            // Browser bisa mem-pause video iframe yang tak terlihat atau
            // senyap. Kalau bukan user yang pause, lanjutkan lagi, ini yang
            // membuat video tidak pernah terlihat berhenti saat di-scroll.
            if (e.data === 2 && !userPausedRef.current) {
              e.target.playVideo();
            }
            // Jaga-jaga kalau loop gagal di sebagian browser.
            if (e.data === 0) e.target.playVideo();
          },
        },
      });

      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", applyVolume, { passive: true });
      window.addEventListener("click", unmute);
      window.addEventListener("touchstart", unmute, { passive: true });
      document.addEventListener("visibilitychange", onVisible);
    });

    return () => {
      cancelled = true;
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", applyVolume);
      window.removeEventListener("click", unmute);
      window.removeEventListener("touchstart", unmute);
      document.removeEventListener("visibilitychange", onVisible);
      playerRef.current?.destroy?.();
      playerRef.current = null;
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden bg-black md:h-[calc(100svh-4rem)]"
    >
      {/* SDK mengganti div ini dengan iframe berukuran sama. */}
      <div
        ref={hostRef}
        className="pointer-events-none aspect-video w-full md:absolute md:left-1/2 md:top-1/2 md:aspect-auto md:h-[56.25vw] md:min-h-full md:w-[177.78svh] md:min-w-full md:-translate-x-1/2 md:-translate-y-1/2"
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/70 to-transparent" />
      <a
        href="#hero"
        className="absolute inset-x-0 bottom-2 z-10 mx-auto flex w-fit cursor-pointer flex-col items-center gap-1 text-xs font-semibold text-white/90 transition-colors hover:text-white md:bottom-5"
      >
        {t.scrollCta}
        <span className="animate-bounce">▾</span>
      </a>
    </section>
  );
}
