"use client";

import * as React from "react";

const VIDEO_ID = "unCD3pcd0FA";

/**
 * Video pembuka YouTube dengan audio. Kebijakan browser melarang autoplay
 * bersuara, jadi mulai muted lalu unmute pada interaksi pertama user
 * (scroll/klik/sentuh). Volume mengecil seiring section di-scroll keluar
 * layar — makin ke bawah, makin pelan; hilang saat video tak terlihat.
 */
export function HeroVideo() {
  const iframeRef = React.useRef<HTMLIFrameElement>(null);
  const sectionRef = React.useRef<HTMLElement>(null);
  const unmutedRef = React.useRef(false);
  const lastVolumeRef = React.useRef(-1);
  const [origin, setOrigin] = React.useState("");

  // enablejsapi butuh parameter origin yang cocok dengan halaman, kalau tidak
  // YouTube mengabaikan postMessage kita. window belum ada saat render server,
  // jadi iframe baru dipasang setelah origin diketahui.
  React.useEffect(() => setOrigin(window.location.origin), []);

  // Kirim perintah ke YouTube IFrame lewat postMessage (tanpa load SDK).
  const command = React.useCallback((func: string, args: unknown[] = []) => {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: "command", func, args }),
      "https://www.youtube.com",
    );
  }, []);

  React.useEffect(() => {
    // Volume 0..100 dari seberapa section terlihat: penuh terlihat = 100,
    // ter-scroll keluar = mengecil ke 0.
    const computeVolume = () => {
      const el = sectionRef.current;
      if (!el) return 0;
      const rect = el.getBoundingClientRect();
      const h = rect.height || 1;
      // Bagian tinggi section yang masih di viewport (dari atas).
      const visible = Math.max(0, Math.min(rect.bottom, window.innerHeight)) -
        Math.max(rect.top, 0);
      const ratio = Math.max(0, Math.min(1, visible / h));
      return Math.round(ratio * 100);
    };

    const applyVolume = () => {
      if (!unmutedRef.current) return;
      const vol = computeVolume();
      // Jangan spam postMessage tiap event scroll — hanya kirim kalau berubah.
      if (vol === lastVolumeRef.current) return;
      lastVolumeRef.current = vol;
      command("setVolume", [vol]);
      // Volume 0 + iframe tak terlihat bikin sebagian browser menghentikan
      // playback. Jadi saat senyap kita mute (bukan volume 0) dan tetap
      // memastikan video jalan, supaya suara langsung ada lagi saat di-scroll
      // balik ke atas.
      if (vol === 0) {
        command("mute");
      } else {
        command("unMute");
      }
      command("playVideo");
    };

    // Interaksi pertama → unmute + volume awal. (Autoplay bersuara diblokir.)
    const unmute = () => {
      if (unmutedRef.current) return;
      unmutedRef.current = true;
      const vol = computeVolume();
      lastVolumeRef.current = vol;
      command("unMute");
      command("setVolume", [vol]);
      command("playVideo");
    };

    const onScroll = () => {
      unmute();
      applyVolume();
    };

    // Kalau tab sempat disembunyikan, browser bisa menghentikan playback.
    // Saat user kembali, lanjutkan lagi dengan volume sesuai posisi scroll.
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      lastVolumeRef.current = -1;
      command("playVideo");
      applyVolume();
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", applyVolume, { passive: true });
    window.addEventListener("click", unmute);
    window.addEventListener("touchstart", unmute, { passive: true });
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", applyVolume);
      window.removeEventListener("click", unmute);
      window.removeEventListener("touchstart", unmute);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [command, origin]);

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden bg-black md:h-[calc(100svh-4rem)]"
    >
      {origin && (
        <iframe
          ref={iframeRef}
          className="pointer-events-none aspect-video w-full md:absolute md:left-1/2 md:top-1/2 md:aspect-auto md:h-[56.25vw] md:min-h-full md:w-[177.78svh] md:min-w-full md:-translate-x-1/2 md:-translate-y-1/2"
          // enablejsapi=1 wajib untuk kontrol volume via postMessage, dan
          // origin wajib menyertainya supaya perintah kita tidak diabaikan.
          src={`https://www.youtube.com/embed/${VIDEO_ID}?autoplay=1&mute=1&loop=1&playlist=${VIDEO_ID}&controls=0&rel=0&playsinline=1&modestbranding=1&enablejsapi=1&origin=${encodeURIComponent(origin)}`}
          title="Youth Character Summit"
          allow="autoplay; encrypted-media; picture-in-picture"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/70 to-transparent" />
      <a
        href="#hero"
        className="absolute inset-x-0 bottom-2 z-10 mx-auto flex w-fit cursor-pointer flex-col items-center gap-1 text-xs font-semibold text-white/90 transition-colors hover:text-white md:bottom-5"
      >
        Scroll untuk mulai mendukung
        <span className="animate-bounce">▾</span>
      </a>
    </section>
  );
}
