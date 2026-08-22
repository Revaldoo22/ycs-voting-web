"use client";

import * as React from "react";
import {
  Crown,
  Gift,
  Loader2,
  Maximize,
  Minimize,
  Play,
  Radio,
  ScanLine,
  Smartphone,
  Ticket,
  Undo2,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState, LoadingState } from "@/components/states";
import { useConfirm } from "@/components/confirm-dialog";
import { api } from "@/lib/api-client";
import { cn, formatNumber } from "@/lib/utils";
import { SpinWheel, WheelSegment } from "@/components/spin-wheel";
import { raffleSound } from "@/lib/raffle-sound";

/** Tombol bisu/nyalakan suara untuk panggung undian. */
function SoundToggle({ className }: { className?: string }) {
  const [muted, setMuted] = React.useState(false);
  // Setelan tersimpan di localStorage; dibaca setelah mount agar render
  // server dan klien tetap sama.
  React.useEffect(() => setMuted(raffleSound.isMuted()), []);

  return (
    <button
      onClick={() => {
        const next = !muted;
        raffleSound.setMuted(next);
        setMuted(next);
        if (!next) raffleSound.quickWin();
      }}
      className={className}
      aria-label={muted ? "Nyalakan suara" : "Matikan suara"}
      title={muted ? "Nyalakan suara" : "Matikan suara"}
    >
      {muted ? (
        <VolumeX className="h-5 w-5" />
      ) : (
        <Volume2 className="h-5 w-5" />
      )}
    </button>
  );
}

type Winner = {
  code: string;
  prize: string | null;
  won_at: string;
  name: string | null;
  phone_number: string | null;
  email: string | null;
  follow_proof_url?: string | null;
};

type Summary = { total: number; remaining: number; winners: Winner[] };

export default function AdminRafflePage() {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [prize, setPrize] = React.useState("Handphone");
  const [drawing, setDrawing] = React.useState(false);
  const [reveal, setReveal] = React.useState<Winner | null>(null);
  const [liveOpen, setLiveOpen] = React.useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["raffle"],
    queryFn: () => api<Summary>("/api/admin/raffle"),
  });

  async function draw() {
    setDrawing(true);
    setReveal(null);
    raffleSound.unlock();
    const spinSound = raffleSound.reelSpin(900);
    try {
      // Jeda kecil biar terasa "diundi"
      await new Promise((r) => setTimeout(r, 900));
      const res = await api<{ winner: Winner }>("/api/admin/raffle/draw", {
        method: "POST",
        body: JSON.stringify({ prize: prize.trim() || "Handphone" }),
      });
      spinSound.stop();
      raffleSound.quickWin();
      setReveal(res.winner);
      // Undi cepat langsung mengumumkan pemenang: kunci & beri tahu voter.
      await api(`/api/admin/raffle/confirm/${res.winner.code}`, {
        method: "POST",
      }).catch(() => {});
      qc.invalidateQueries({ queryKey: ["raffle"] });
    } catch (e) {
      spinSound.stop();
      raffleSound.error();
      toast.error(e instanceof Error ? e.message : "Gagal mengundi.");
    } finally {
      setDrawing(false);
    }
  }

  function cancel(w: Winner) {
    confirm({
      title: `Batalkan kemenangan ${w.name ?? w.code}?`,
      description: "Kupon kembali ke kolam undian.",
      confirmText: "Batalkan",
      variant: "destructive",
      onConfirm: async () => {
        try {
          await api(`/api/admin/raffle/winners/${w.code}`, {
            method: "DELETE",
          });
          toast.success("Kemenangan dibatalkan.");
          setReveal((r) => (r?.code === w.code ? null : r));
          qc.invalidateQueries({ queryKey: ["raffle"] });
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Gagal membatalkan.");
        }
      },
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Undian Kupon</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Tarik pemenang acak dari kupon follow. Hadiah utama: handphone.
        </p>
      </div>

      {/* Statistik */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center gap-3.5 p-5">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Ticket className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Total Kupon
              </p>
              <p className="text-2xl font-extrabold tabular-nums">
                {formatNumber(data?.total ?? 0)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3.5 p-5">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/15 text-accent">
              <Gift className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Belum Diundi
              </p>
              <p className="text-2xl font-extrabold tabular-nums">
                {formatNumber(data?.remaining ?? 0)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Panel undi */}
      <Card className="border-primary/25">
        <CardContent className="space-y-4 p-6">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-0 flex-1 space-y-1.5">
              <Label>Hadiah</Label>
              <Input
                value={prize}
                onChange={(e) => setPrize(e.target.value)}
                placeholder="mis. Handphone"
              />
            </div>
            <Button
              size="lg"
              onClick={draw}
              disabled={drawing || (data?.remaining ?? 0) === 0}
            >
              {drawing ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Smartphone className="h-5 w-5" />
              )}
              {drawing ? "Mengundi..." : "Undi Cepat"}
            </Button>
            <Button
              size="lg"
              variant="accent"
              onClick={() => setLiveOpen(true)}
              disabled={(data?.remaining ?? 0) === 0}
            >
              <Radio className="h-5 w-5" /> Mode Live
            </Button>
            <SoundToggle className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border bg-background text-muted-foreground transition-colors hover:text-primary" />
          </div>

          {reveal && (
            <div className="rounded-2xl border-2 border-accent bg-accent/5 p-5 text-center">
              <p className="text-xs font-bold uppercase tracking-wider text-accent">
                Pemenang {reveal.prize}
              </p>
              <p className="mt-1 text-2xl font-extrabold">{reveal.name}</p>
              <p className="text-sm text-muted-foreground">
                {reveal.phone_number} · {reveal.email}
              </p>
              <p className="mt-2 font-mono text-sm font-bold text-primary">
                {reveal.code}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Daftar pemenang */}
      <section className="space-y-2">
        <p className="text-sm font-semibold">
          Pemenang ({data?.winners.length ?? 0})
        </p>
        {isLoading ? (
          <LoadingState />
        ) : !data || data.winners.length === 0 ? (
          <EmptyState title="Belum ada pemenang" />
        ) : (
          <div className="space-y-1.5">
            {data.winners.map((w) => (
              <div
                key={w.code}
                className="flex items-center justify-between gap-2 rounded-xl border bg-card p-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-semibold">
                    {w.name}{" "}
                    <span className="font-normal text-muted-foreground">
                      · {w.prize}
                    </span>
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {w.phone_number} · {w.code} ·{" "}
                    {new Date(w.won_at).toLocaleString("id-ID")}
                    {w.follow_proof_url && (
                      <>
                        {" "}·{" "}
                        <a
                          href={w.follow_proof_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          Bukti follow
                        </a>
                      </>
                    )}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="shrink-0 text-destructive"
                  onClick={() => cancel(w)}
                >
                  <Undo2 className="h-4 w-4" /> Batalkan
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>

      {liveOpen && (
        <LiveDraw
          prize={prize.trim() || "Handphone"}
          onClose={() => {
            setLiveOpen(false);
            qc.invalidateQueries({ queryKey: ["raffle"] });
          }}
        />
      )}
    </div>
  );
}

/** Sensor nomor WA untuk tayangan publik. */
function maskPhone(p: string | null): string {
  if (!p || p.length < 7) return p ?? "-";
  return p.slice(0, 4) + "****" + p.slice(-3);
}

// Palet senada tema: oranye accent + biru primary + kuning/emerald aksen.
// Semua cukup pekat agar tetap kontras di latar terang.
const CONFETTI_COLORS = ["#f97316", "#0891b2", "#0e7490", "#f59e0b", "#059669"];

function Confetti() {
  const pieces = React.useMemo(
    () =>
      Array.from({ length: 90 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.8,
        dur: 2.4 + Math.random() * 2,
        size: 6 + Math.random() * 8,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        round: Math.random() > 0.5,
      })),
    [],
  );
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((c, i) => (
        <span
          key={i}
          className="absolute top-0"
          style={{
            left: `${c.left}%`,
            width: c.size,
            height: c.size * (c.round ? 1 : 0.45),
            background: c.color,
            borderRadius: c.round ? "9999px" : "2px",
            animation: `confetti-fall ${c.dur}s linear ${c.delay}s forwards`,
          }}
        />
      ))}
    </div>
  );
}

/**
 * Susunan karakter pada gulungan reel. URUTANNYA SENGAJA DIACAK (bukan
 * A-B-C-...) supaya saat berputar tidak terlihat seperti sedang menghitung
 * alfabet. Urutannya tetap (konstan, bukan di-shuffle saat runtime) karena
 * strip diulang dan posisi karakter target dihitung dari indeks di sini,
 * jadi tiap lap harus identik.
 */
const SLOT_CHARS = "K7QA3ZM0WFJ8CTX1PVE5HN9RBLU2YGS6DIO4";

/** Ambil 8 karakter kode tanpa prefix "YCS-" dan tanpa pemisah. */
function codeDigits(code: string | null | undefined): string[] {
  if (!code) return ["?", "?", "?", "?", "?", "?", "?", "?"];
  const cleaned = code
    .toUpperCase()
    .replace(/^YCS-?/, "")
    .replace(/[^A-Z0-9]/g, "");
  const chars = cleaned.split("");
  while (chars.length < 8) {
    chars.push("?");
  }
  return chars.slice(0, 8);
}

/**
 * Baris tengah dari 5 baris yang terlihat (indeks 0..4) adalah digit
 * terpilih. Tinggi baris & jendela diatur CSS (.reel, lihat globals.css)
 * lewat satu variabel --row agar strip selalu mendarat pas di tengah.
 */
const CENTER_ROW = 2;
/** Strip diulang agar geseran panjang tetap punya karakter untuk dilewati. */
const STRIP_REPEAT = 12;
/** Durasi satu putaran reel (ms). Dipakai reel & orkestrasi agar sinkron. */
const SPIN_MS = 4200;

/**
 * Satu reel (gulungan) mesin slot: SATU strip karakter panjang yang DIGESER
 * (translateY), bukan karakter yang diganti-ganti. Dengan begitu karakter
 * mengalir naik mulus tanpa blink, dan saat berhenti ia mendarat tepat di
 * karakter target lewat transisi ease-out panjang, bukan berganti mendadak.
 *
 * `spinKey` naik tiap kali reel disuruh berputar lagi; perubahannya memicu
 * putaran baru (jarak geser besar) yang lalu melambat sampai target.
 */
function SlotReel({
  finalChar,
  spinning,
  idle,
  spinKey = 0,
}: {
  finalChar: string;
  spinning: boolean;
  /** Belum diundi sama sekali: placeholder redup, strip diam. */
  idle?: boolean;
  spinKey?: number;
}) {
  const chars = React.useMemo(
    () => Array.from({ length: STRIP_REPEAT }, () => SLOT_CHARS).join(""),
    [],
  );
  const perLap = SLOT_CHARS.length;
  const targetInLap = Math.max(0, SLOT_CHARS.indexOf(finalChar));

  // Offset (dalam satuan baris) posisi strip saat ini. Nilai 0 berarti
  // karakter indeks 0 berada di baris tengah. Mulai dari posisi acak supaya
  // reel yang belum diundi tidak semua memperlihatkan karakter yang sama.
  const [offsetRows, setOffsetRows] = React.useState(
    () => Math.floor(Math.random() * SLOT_CHARS.length),
  );
  const [duration, setDuration] = React.useState(0);

  // Saat diminta berputar: geser jauh (beberapa lap) lalu berhenti tepat di
  // target. Satu transisi ease-out panjang = mengalir cepat lalu melambat,
  // mendarat pas tanpa koreksi mendadak.
  React.useEffect(() => {
    if (!spinning) return;
    const laps = 6;
    setDuration(SPIN_MS);
    setOffsetRows((prev) => {
      // Selalu bergerak MAJU (strip naik) menuju target di lap ke-n, supaya
      // tidak pernah ada lompatan arah balik yang terlihat sebagai flicker.
      const base = Math.ceil((prev + 1) / perLap) * perLap;
      return base + laps * perLap + targetInLap;
    });

    // Setelah animasi selesai, tarik offset kembali ke lap awal TANPA
    // transisi. Karakter di posisi itu identik (strip berulang), jadi tak
    // terlihat berubah, tapi strip tidak akan pernah kehabisan baris walau
    // reel diputar berkali-kali.
    const id = setTimeout(() => {
      setDuration(0);
      setOffsetRows((prev) => (prev % perLap) + perLap);
    }, SPIN_MS + 60);
    return () => clearTimeout(id);
  }, [spinning, spinKey, perLap, targetInLap]);

  const state = idle ? "idle" : spinning ? "spin" : "locked";

  return (
    <div
      className={cn(
        "reel relative rounded-2xl transition-all duration-500",
        // Cangkang luar: bevel logam terang, memberi kesan kabinet fisik.
        "bg-gradient-to-b from-white via-slate-100 to-slate-300 p-[3px]",
        state === "idle" && "shadow-[0_2px_6px_rgba(15,23,42,0.10)]",
        state === "spin" &&
          "shadow-[0_8px_24px_-4px_rgba(8,145,178,0.45),0_0_0_1px_rgba(8,145,178,0.35)]",
        state === "locked" &&
          "-translate-y-0.5 scale-[1.04] shadow-[0_14px_32px_-6px_rgba(249,115,22,0.55),0_0_0_2px_rgba(249,115,22,0.65)]",
      )}
    >
      <div
        className={cn(
          "reel-window relative overflow-hidden rounded-[13px] transition-colors duration-500",
          state === "locked"
            ? "bg-gradient-to-b from-orange-100 via-white to-orange-100"
            : "bg-gradient-to-b from-slate-200 via-white to-slate-200",
        )}
      >
        {/* Strip SELALU dirender (tak pernah di-mount ulang) supaya transisi
            geser tidak pernah terputus / terlihat melompat. */}
        <div
          className={cn(
            "will-change-transform transition-opacity duration-300",
            idle && "opacity-0",
          )}
          style={{
            // Strip digeser naik: offset target dikurangi posisi baris tengah.
            transform: `translate3d(0, calc((${CENTER_ROW} - ${offsetRows}) * var(--row)), 0)`,
            transition: duration
              ? `transform ${duration}ms cubic-bezier(0.12, 0.62, 0, 1), opacity 300ms`
              : "opacity 300ms",
          }}
        >
          {chars.split("").map((ch, i) => (
            <div
              key={i}
              className={cn(
                "reel-row flex items-center justify-center font-mono font-extrabold tabular-nums",
                state === "locked" ? "text-accent" : "text-slate-700",
              )}
              style={{
                textShadow:
                  state === "locked"
                    ? "0 1px 0 rgba(255,255,255,0.9), 0 3px 8px rgba(249,115,22,0.45)"
                    : "0 1px 0 rgba(255,255,255,0.9), 0 2px 5px rgba(15,23,42,0.15)",
              }}
            >
              {ch}
            </div>
          ))}
        </div>

        {/* Placeholder saat belum diundi, menimpa strip yang disembunyikan. */}
        {idle && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="reel-placeholder font-mono font-extrabold text-slate-300">
              ?
            </span>
          </div>
        )}

        {/* Kabut atas & bawah: karakter di tepi memudar, fokus ke tengah. */}
        <div className="reel-fade pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-white via-white/85 to-transparent" />
        <div className="reel-fade pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-white via-white/85 to-transparent" />
        {/* Bayangan dalam supaya rongga terasa punya kedalaman. */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-slate-900/25 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-slate-900/25 to-transparent" />

        {/* Jendela baris terpilih: garis penanda + kilau kaca melintang. */}
        <div
          className={cn(
            "reel-center pointer-events-none absolute inset-x-0 border-y-2 transition-colors duration-500",
            state === "locked" ? "border-accent/80" : "border-primary/25",
          )}
        />
        <div className="reel-center pointer-events-none absolute inset-x-0 bg-gradient-to-br from-white/45 via-transparent to-white/20" />
      </div>
    </div>
  );
}

/**
 * Kabinet mesin slot: deretan reel untuk kode YCS-XXXX-XXXX. Digit diundi
 * bertahap sesuai `revealedCount`; reel yang indeksnya ada di
 * `spinningIndexes` sedang berputar (bisa lebih dari satu sekaligus).
 */
function SlotCabinet({
  digits,
  revealedCount,
  spinningIndexes,
  spinKey = 0,
}: {
  digits: string[];
  revealedCount: number;
  spinningIndexes: number[];
  /** Naik tiap ronde spin baru, memicu putaran ulang pada reel terkait. */
  spinKey?: number;
}) {
  return (
    <div
      className="rounded-3xl border border-white/60 bg-gradient-to-b from-primary/15 via-white/40 to-accent/15 p-3 sm:p-5"
      style={{
        boxShadow:
          "inset 0 2px 10px rgba(15,23,42,0.10), inset 0 -2px 8px rgba(255,255,255,0.85), 0 12px 28px -12px rgba(8,145,178,0.30)",
      }}
    >
      <div className="flex items-center justify-center gap-1.5 sm:gap-2.5">
        {digits.map((ch, i) => (
          <React.Fragment key={i}>
            {i === 4 && (
              <span className="mx-1 text-3xl font-extrabold text-primary/50 sm:text-4xl">
                -
              </span>
            )}
            <SlotReel
              finalChar={ch}
              spinning={spinningIndexes.includes(i)}
              idle={i >= revealedCount && !spinningIndexes.includes(i)}
              spinKey={spinKey}
            />
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

/**
 * Latar panggung bertema Bali, murni CSS/SVG (tanpa file gambar): gradasi
 * langit ke laut, siluet perbukitan, daun palem di dua sudut, dan taburan
 * kilau. Semua statis supaya ringan (tidak ada animasi per frame).
 */
function BaliBackdrop() {
  const sparkles = React.useMemo(
    () =>
      [
        { x: 12, y: 18, s: 14 },
        { x: 32, y: 9, s: 9 },
        { x: 68, y: 13, s: 11 },
        { x: 88, y: 26, s: 8 },
        { x: 22, y: 62, s: 10 },
        { x: 79, y: 58, s: 12 },
      ] as const,
    [],
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Langit ke laut */}
      <div className="absolute inset-0 bg-gradient-to-b from-sky-200 via-cyan-100 to-cyan-200" />
      {/* Cahaya matahari dari atas */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(900px circle at 50% -10%, rgba(255,255,255,0.85), transparent 60%), radial-gradient(700px circle at 88% 92%, rgba(249,115,22,0.16), transparent 60%)",
        }}
      />
      {/* Perbukitan / garis pantai */}
      <svg
        className="absolute inset-x-0 bottom-0 h-[38%] w-full"
        viewBox="0 0 1440 320"
        preserveAspectRatio="none"
      >
        <path
          d="M0 220 C 180 150 300 250 480 210 C 660 170 780 250 960 205 C 1140 160 1300 235 1440 195 L1440 320 L0 320 Z"
          fill="rgba(8,145,178,0.16)"
        />
        <path
          d="M0 265 C 200 215 340 285 520 255 C 720 220 860 290 1040 260 C 1220 230 1340 285 1440 258 L1440 320 L0 320 Z"
          fill="rgba(14,116,144,0.14)"
        />
      </svg>

      {/* Daun palem kiri atas */}
      <svg
        className="absolute -left-10 -top-8 h-56 w-56 opacity-60 sm:h-72 sm:w-72"
        viewBox="0 0 200 200"
        fill="none"
      >
        {[0, 26, 52, 78, 104].map((rot, i) => (
          <ellipse
            key={i}
            cx="100"
            cy="34"
            rx="13"
            ry="78"
            fill="rgba(16,132,110,0.42)"
            transform={`rotate(${rot - 40} 100 20)`}
          />
        ))}
      </svg>
      {/* Daun palem kanan atas (dicerminkan) */}
      <svg
        className="absolute -right-12 -top-10 h-52 w-52 opacity-50 sm:h-64 sm:w-64"
        viewBox="0 0 200 200"
        fill="none"
      >
        {[0, 24, 48, 72].map((rot, i) => (
          <ellipse
            key={i}
            cx="100"
            cy="34"
            rx="12"
            ry="72"
            fill="rgba(16,132,110,0.38)"
            transform={`rotate(${190 + rot} 100 20)`}
          />
        ))}
      </svg>

      {/* Bokeh lembut: titik blur, bukan bintang clip-art, agar terasa premium. */}
      {sparkles.map((sp, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-white/50 blur-[2px]"
          style={{
            left: `${sp.x}%`,
            top: `${sp.y}%`,
            width: sp.s,
            height: sp.s,
          }}
        />
      ))}
    </div>
  );
}

/**
 * Judul flat modern untuk panggung berlatar TERANG: teks gelap pekat dengan
 * aksen oranye, tanpa stroke tebal/italic. Hindari warna terang (putih/amber
 * muda) di sini karena backdrop Bali-nya biru muda, kontrasnya hilang.
 */
function StickerTitle({ prize }: { prize: string }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-700 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-white shadow-sm sm:text-xs">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-300" />
        Youth Character Summit
      </span>
      <h2
        className="text-center font-extrabold uppercase leading-[1.05] tracking-tight text-slate-900"
        style={{
          // Ikut tinggi viewport supaya judul tidak memakan ruang konsol
          // spin di jendela pendek maupun mode layar penuh.
          fontSize: "clamp(1.8rem, 6vh, 4rem)",
        }}
      >
        Undian <span className="text-orange-500">Berhadiah</span>
      </h2>
      <p className="inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-1.5 text-xs font-semibold text-slate-700 shadow-sm ring-1 ring-slate-900/10 sm:text-sm">
        <Gift className="h-4 w-4 shrink-0 text-orange-500" aria-hidden />
        Hadiah utama <span className="font-bold text-orange-600">{prize}</span>
      </p>
    </div>
  );
}

type Stage =
  | "idle"
  | "count"
  | "shuffle"
  | "slot"
  /** Nama pemenang diumumkan dulu, sebelum roda hadiah diputar. */
  | "winnerName"
  | "wheel"
  | "reveal";
type LiveStyle = "shuffle" | "slot";

/** Panggung undian layar penuh: countdown, animasi, reveal pemenang. */
function LiveDraw({
  prize,
  onClose,
}: {
  prize: string;
  onClose: () => void;
}) {
  const [stage, setStage] = React.useState<Stage>("idle");
  const [style, setStyle] = React.useState<LiveStyle>("slot");
  const [count, setCount] = React.useState(3);

  // Ambil pengaturan Spin Wheel dari backend
  const { data: settingsData } = useQuery<{ spin_wheel_mode?: string }>({
    queryKey: ["public-settings"],
    queryFn: () => api<{ spin_wheel_mode?: string }>("/api/public/settings"),
  });
  const [ticker, setTicker] = React.useState<string>("");
  const [winner, setWinner] = React.useState<Winner | null>(null);
  // Mode slot: pemenang sudah diundi backend, kodenya diungkap per digit.
  // `digits` = 8 karakter kode; `revealed` = jumlah digit yang sudah diundi;
  // `spinningIndexes` = reel yang sedang berputar (bisa >1 digit sekaligus).
  const [digits, setDigits] = React.useState<string[]>([]);
  const [revealed, setRevealed] = React.useState(0);
  const [spinningIndexes, setSpinningIndexes] = React.useState<number[]>([]);
  /** Berapa digit diundi tiap kali tombol spin ditekan (1, 2, 4, atau 8). */
  const [perSpin, setPerSpin] = React.useState(1);
  /** Naik tiap ronde spin: memicu reel menggeser stripnya lagi. */
  const [spinKey, setSpinKey] = React.useState(0);
  /**
   * Pemenang yang sudah ditandai backend tapi BELUM diumumkan (kode masih
   * diungkap digit demi digit). Kalau panggung ditutup sebelum semua digit
   * terungkap, kemenangan ini harus dibatalkan supaya kuponnya kembali ke
   * kolam undian. Di-null-kan begitu pemenang resmi diumumkan (reveal).
   */
  const pendingWinner = React.useRef<Winner | null>(null);
  const alive = React.useRef(true);
  // StrictMode dev menjalankan mount-cleanup-mount: cleanup mematikan flag,
  // jadi WAJIB dinyalakan lagi di body effect.
  React.useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  // ------------------------- Mode layar penuh -------------------------
  const stageRef = React.useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  React.useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await stageRef.current?.requestFullscreen();
      }
    } catch {
      toast.error("Layar penuh tidak didukung browser ini.");
    }
  }

  /**
   * Batalkan pemenang yang belum diumumkan (kupon kembali ke kolam undian).
   * Mengembalikan promise agar pemanggil bisa menunggu sebelum menyegarkan
   * statistik; dipanggil tanpa await pun aman (fire-and-forget).
   */
  function discardPendingWinner(): Promise<void> {
    const w = pendingWinner.current;
    if (!w) return Promise.resolve();
    pendingWinner.current = null;
    return api(`/api/admin/raffle/winners/${w.code}`, { method: "DELETE" })
      .then(() => {})
      .catch(() => {});
  }

  /** Tutup panggung; kemenangan yang belum diumumkan dibatalkan dulu. */
  async function handleClose() {
    const hadPending = !!pendingWinner.current;
    // Tunggu pembatalan selesai supaya statistik yang di-refresh oleh
    // onClose sudah mencerminkan kupon yang kembali ke kolam.
    await discardPendingWinner();
    if (hadPending) {
      toast.info("Undian dibatalkan, kupon kembali ke kolam undian.");
    }
    onClose();
  }

  // Jaring pengaman: komponen dibongkar tanpa lewat tombol tutup (mis. admin
  // pindah halaman). Pending yang belum diumumkan tetap dibatalkan. Aman di
  // StrictMode karena saat mount-cleanup-mount pending masih null.
  React.useEffect(() => {
    return () => {
      discardPendingWinner();
    };
  }, []);

  // Prefetch kandidat begitu panggung dibuka: shuffle mulai tanpa jeda.
  const poolRef = React.useRef<{ name: string; code: string }[]>([]);
  React.useEffect(() => {
    api<{ name: string; code: string }[]>("/api/admin/raffle/candidates")
      .then((c) => (poolRef.current = c))
      .catch(() => {});
  }, []);

  function refreshPool() {
    api<{ name: string; code: string }[]>("/api/admin/raffle/candidates")
      .then((c) => (poolRef.current = c))
      .catch(() => {});
  }

  /**
   * Kunci pemenang sebagai final: backend mengirim notifikasi ke voter.
   * Dipanggil hanya setelah pemenang benar-benar diumumkan di panggung.
   */
  function confirmWinner(code: string) {
    api(`/api/admin/raffle/confirm/${code}`, { method: "POST" }).catch(() => {});
  }

  async function run() {
    // Klik tombol ini adalah interaksi pengguna pertama di panggung: momen
    // yang diizinkan browser untuk membuka AudioContext.
    raffleSound.unlock();
    try {
      // Ronde baru sementara ronde slot sebelumnya belum tuntas: kemenangan
      // yang belum diumumkan dibatalkan supaya kuponnya tidak hangus.
      await discardPendingWinner();
      setWinner(null);
      setDigits([]);
      setRevealed(0);
      setSpinningIndexes([]);

      // Undi pemenang di backend SECEPAT MUNGKIN di awal agar jika kupon habis /
      // error, langsung memberikan feedback sebelum countdown dimulai.
      const drawPromise = api<{ winner: Winner }>("/api/admin/raffle/draw", {
        method: "POST",
        body: JSON.stringify({ prize }),
      });

      // 1. Countdown 3..2..1
      setStage("count");
      for (let i = 3; i >= 1; i--) {
        setCount(i);
        raffleSound.countdown(i);
        await new Promise((r) => setTimeout(r, 900));
        if (!alive.current) return;
      }
      raffleSound.countdownGo();

      // 2. Ambil hasil draw dari backend
      const res = await drawPromise;
      if (!res?.winner) {
        throw new Error("Pemenang tidak ditemukan.");
      }
      pendingWinner.current = res.winner;

      // Panggung sudah ditutup selagi menunggu: batalkan, jangan sampai
      // kupon tercatat menang padahal tidak pernah diumumkan.
      if (!alive.current) {
        await discardPendingWinner();
        return;
      }

      if (style === "slot") {
        // Kode pemenang disiapkan, lalu diungkap digit demi digit oleh admin
        // lewat tombol "Undi Digit" (8 kali klik).
        setDigits(codeDigits(res.winner.code));
        setStage("slot");
      } else {
        await runShuffle(drawPromise);
        if (!alive.current) return;
        refreshPool();
      }
    } catch (e) {
      raffleSound.error();
      console.error("Raffle draw error:", e);
      toast.error(e instanceof Error ? e.message : "Gagal mengundi.");
      setStage("idle");
    }
  }

  /** Animasi shuffle nama (gaya lama). */
  async function runShuffle(drawPromise: Promise<{ winner: Winner }>) {
    setStage("shuffle");
    const pool = poolRef.current.length
      ? poolRef.current
      : [{ name: "...", code: "" }];
    let delay = 55;
    const start = Date.now();
    while (Date.now() - start < 4600) {
      setTicker(pool[Math.floor(Math.random() * pool.length)].name ?? "?");
      raffleSound.reelLock(0);
      await new Promise((r) => setTimeout(r, delay));
      if (!alive.current) return;
      delay = Math.min(360, delay * 1.07);
    }
    const res = await drawPromise;
    setTicker(res.winner.name ?? "?");
    await new Promise((r) => setTimeout(r, 650));
    setWinner(res.winner);
    confirmWinner(res.winner.code);
    raffleSound.reveal();
    setStage("reveal");
  }

  /**
   * Undi `perSpin` digit berikutnya: reel-reel itu berputar bersamaan lalu
   * terkunci satu-satu dari kiri (jeda pendek antar reel biar dramatis).
   * Setelah digit terakhir, pemenang diungkap penuh.
   */
  async function spinDigit() {
    if (spinningIndexes.length > 0 || revealed >= digits.length) return;
    const start = revealed;
    const batch = Math.min(perSpin, digits.length - start);
    const idxs = Array.from({ length: batch }, (_, k) => start + k);

    // Semua reel dalam batch mulai berputar bersamaan; masing-masing menggeser
    // strip ke karakter targetnya dengan transisi ease-out (SPIN_MS). Karena
    // easing ada di CSS, tak perlu mengatur perlambatan manual di sini.
    setSpinKey((k) => k + 1);
    setSpinningIndexes(idxs);
    const spinSound = raffleSound.reelSpin(SPIN_MS);

    // Tunggu putaran selesai (durasi transisi reel), lalu kunci berurutan dari
    // kiri dengan jeda pendek supaya terasa satu-satu mendarat.
    await new Promise((r) => setTimeout(r, SPIN_MS));
    spinSound.stop();
    if (!alive.current) return;

    for (let k = 0; k < batch; k++) {
      setSpinningIndexes(idxs.slice(k + 1));
      setRevealed(start + k + 1);
      raffleSound.reelLock(start + k);
      if (k < batch - 1) {
        await new Promise((r) => setTimeout(r, 260));
        if (!alive.current) return;
      }
    }

    if (start + batch >= digits.length) {
      await new Promise((r) => setTimeout(r, 900));
      if (!alive.current) return;
      // Semua digit terungkap: umumkan dulu siapa pemenangnya, baru roda
      // hadiah diputar untuk menentukan hadiah yang didapat.
      raffleSound.winnerName();
      setStage("winnerName");
    }
  }

  async function handleWheelEnd(seg: WheelSegment) {
    const w = pendingWinner.current;
    if (w) {
      w.prize = seg.label;
      setWinner({ ...w, prize: seg.label });
      await api(`/api/admin/raffle/winners/${w.code}/prize`, {
        method: "POST",
        body: JSON.stringify({ prize: seg.label }),
      }).catch(() => {});
      confirmWinner(w.code);
      pendingWinner.current = null;
    }
    await new Promise((r) => setTimeout(r, 600));
    if (!alive.current) return;
    raffleSound.reveal();
    setStage("reveal");
    refreshPool();
  }

  const allRevealed = digits.length > 0 && revealed >= digits.length;
  const spinning = spinningIndexes.length > 0;
  const nextBatch = Math.min(perSpin, Math.max(0, digits.length - revealed));

  return (
    <div
      ref={stageRef}
      className="fixed inset-0 z-[200] flex flex-col overflow-auto text-slate-900"
    >
      <BaliBackdrop />
      {stage === "reveal" && <Confetti />}

      <div className="absolute right-5 top-5 z-10 flex gap-2">
        <SoundToggle className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-white/90 text-slate-600 shadow-lg backdrop-blur transition-colors hover:text-primary" />
        <button
          onClick={toggleFullscreen}
          className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-white/90 text-slate-600 shadow-lg backdrop-blur transition-colors hover:text-primary"
          aria-label={isFullscreen ? "Keluar layar penuh" : "Layar penuh"}
          title={isFullscreen ? "Keluar layar penuh" : "Layar penuh"}
        >
          {isFullscreen ? (
            <Minimize className="h-5 w-5" />
          ) : (
            <Maximize className="h-5 w-5" />
          )}
        </button>
        <button
          onClick={handleClose}
          className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-white/90 text-slate-600 shadow-lg backdrop-blur transition-colors hover:text-slate-900"
          aria-label="Tutup"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* justify-center dipakai lewat margin auto (bukan justify-center) supaya
          konten yang lebih tinggi dari viewport tetap bisa di-scroll penuh,
          tidak terpotong di bagian atas. */}
      <div className="relative z-[1] my-auto flex flex-col items-center gap-4 p-4 text-center sm:gap-5 sm:p-6">
        <StickerTitle prize={prize} />

        {stage === "idle" && (
          <div
            className="flex w-full max-w-lg flex-col items-center gap-4 rounded-[32px] bg-white/85 p-6 backdrop-blur-md"
            style={{
              boxShadow:
                "0 26px 60px -22px rgba(8,145,178,0.45), 0 2px 0 rgba(255,255,255,0.95) inset, 0 0 0 1px rgba(255,255,255,0.7)",
            }}
          >
            <p className="text-sm text-slate-600">
              Pastikan layar ini yang dibagikan ke penonton. Pilih gaya animasi
              lalu mulai.
            </p>
            {!isFullscreen && (
              <button
                onClick={toggleFullscreen}
                className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-bold text-primary transition-colors hover:bg-primary/20"
              >
                <Maximize className="h-4 w-4" /> Layar Penuh
              </button>
            )}
            {/* Pilih gaya animasi */}
            <div className="inline-flex rounded-2xl bg-slate-100 p-1">
              {(
                [
                  { v: "slot", label: "Slot Digit" },
                  { v: "shuffle", label: "Shuffle Nama" },
                ] as const
              ).map((o) => (
                <button
                  key={o.v}
                  onClick={() => setStyle(o.v)}
                  className={cn(
                    "cursor-pointer rounded-xl px-4 py-1.5 text-sm font-bold transition-all",
                    style === o.v
                      ? "bg-gradient-to-b from-cyan-500 to-primary text-white shadow-[0_3px_0_-1px_rgb(14,116,144)]"
                      : "text-slate-500 hover:text-slate-800",
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
            {style === "slot" && (
              <p className="max-w-sm text-xs text-slate-500">
                Mode slot: kode pemenang diungkap 8 digit, satu digit per klik.
              </p>
            )}
            <button
              onClick={run}
              className={cn(
                "relative flex h-14 items-center justify-center gap-3 rounded-full px-10 text-base font-black uppercase tracking-wide text-white transition-all duration-200",
                "bg-gradient-to-r from-amber-400 via-orange-500 to-pink-500",
                "shadow-[0_9px_0_-2px_rgb(190,24,93),0_18px_30px_-10px_rgba(236,72,153,0.6)]",
                "hover:brightness-105",
                "active:translate-y-1 active:shadow-[0_4px_0_-2px_rgb(190,24,93),0_10px_18px_-10px_rgba(236,72,153,0.6)]",
              )}
            >
              <span className="pointer-events-none absolute inset-x-3 top-1 h-4 rounded-full bg-white/35 blur-[2px]" />
              <Radio className="h-5 w-5 shrink-0" /> Mulai Undian
            </button>
          </div>
        )}

        {stage === "count" && (
          <p
            key={count}
            className="text-[9rem] font-black leading-none text-white"
            style={{
              animation: "ping 0.9s ease-out",
              WebkitTextStroke: "5px #f97316",
              paintOrder: "stroke fill",
              filter: "drop-shadow(0 8px 16px rgba(249,115,22,0.5))",
            }}
          >
            {count}
          </p>
        )}

        {stage === "shuffle" && (
          <div
            className="w-full max-w-2xl rounded-[32px] bg-white/85 px-6 py-14 backdrop-blur-md"
            style={{
              boxShadow:
                "0 26px 60px -22px rgba(8,145,178,0.45), 0 0 0 1px rgba(255,255,255,0.7)",
            }}
          >
            <p className="truncate text-4xl font-black text-[#1e3a5f] sm:text-6xl">
              {ticker}
            </p>
          </div>
        )}

        {stage === "slot" && (
          <div className="w-full max-w-4xl space-y-3 sm:space-y-4">
            {/* Kabinet reel: baris tengah = digit terpilih. */}
            <div
              className="rounded-[36px] bg-white/85 p-4 backdrop-blur-md sm:p-6"
              style={{
                boxShadow:
                  "0 30px 70px -24px rgba(8,145,178,0.45), 0 2px 0 rgba(255,255,255,0.95) inset, 0 0 0 1px rgba(255,255,255,0.7)",
              }}
            >
              <p className="mb-3 flex items-center justify-center gap-2.5 text-sm font-semibold uppercase tracking-[0.32em] text-slate-500">
                <ScanLine className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                Kode Pemenang
              </p>
              <SlotCabinet
                digits={digits}
                revealedCount={revealed}
                spinningIndexes={spinningIndexes}
                spinKey={spinKey}
              />
            </div>

            {/* Panel kontrol bawah, gaya konsol mesin slot. */}
            <div
              className="rounded-[32px] bg-white/85 p-3 backdrop-blur-md sm:p-4"
              style={{
                boxShadow:
                  "0 22px 50px -20px rgba(15,23,42,0.30), 0 2px 0 rgba(255,255,255,0.95) inset, 0 0 0 1px rgba(255,255,255,0.7)",
              }}
            >
              <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between sm:gap-4">
                {/* Info kiri: progres & sisa digit */}
                <div className="flex gap-2">
                  <div className="rounded-2xl bg-white px-3.5 py-2 text-left shadow-[0_4px_12px_-4px_rgba(15,23,42,0.20)] ring-1 ring-slate-100">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Terungkap
                    </p>
                    <p className="font-mono text-lg font-bold tabular-nums text-[#1e3a5f]">
                      {revealed}
                      <span className="text-slate-300"> / </span>
                      <span className="text-slate-400">{digits.length}</span>
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white px-3.5 py-2 text-left shadow-[0_4px_12px_-4px_rgba(15,23,42,0.20)] ring-1 ring-slate-100">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Per Spin
                    </p>
                    <p className="font-mono text-lg font-bold tabular-nums text-primary">
                      {perSpin}
                      <span className="ml-1 text-xs font-semibold text-slate-400">
                        digit
                      </span>
                    </p>
                  </div>
                </div>

                {/* Tombol SPIN besar di tengah, gradasi oranye ke pink */}
                <button
                  onClick={spinDigit}
                  disabled={spinning || allRevealed}
                  className={cn(
                    "group relative flex w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-full px-8 py-3.5 text-white transition-all duration-200 sm:w-auto sm:px-14",
                    "bg-gradient-to-b from-orange-400 to-orange-600",
                    "shadow-[0_8px_0_-1px_rgb(154,52,18),0_18px_30px_-12px_rgba(234,88,12,0.55)]",
                    "enabled:hover:from-orange-300 enabled:hover:to-orange-500",
                    "enabled:active:translate-y-[3px] enabled:active:shadow-[0_5px_0_-1px_rgb(154,52,18),0_10px_20px_-12px_rgba(234,88,12,0.55)]",
                    "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-300/60",
                    "disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-[0_5px_0_-1px_rgb(154,52,18)]",
                  )}
                >
                  {/* Kilau halus di separuh atas tombol */}
                  <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent" />
                  <span className="relative flex items-center gap-2.5 text-lg font-extrabold uppercase tracking-[0.06em] sm:text-2xl">
                    {spinning ? (
                      <Loader2 className="h-5 w-5 shrink-0 animate-spin" aria-hidden />
                    ) : (
                      <Play
                        className="h-5 w-5 shrink-0 fill-current"
                        aria-hidden
                      />
                    )}
                    {spinning ? "Mengundi..." : `Spin ${nextBatch} Digit`}
                  </span>
                  <span className="relative text-[11px] font-medium tracking-wide text-white/85">
                    {allRevealed
                      ? "Semua digit terungkap"
                      : `Gunakan ${nextBatch} kesempatan`}
                  </span>
                </button>

                {/* Setelan digit per spin */}
                <div className="flex flex-col items-center gap-1.5 sm:items-end">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Digit per spin
                  </p>
                  <div
                    role="group"
                    aria-label="Jumlah digit per spin"
                    className="inline-flex rounded-2xl bg-white p-1 shadow-[0_4px_12px_-4px_rgba(15,23,42,0.20)] ring-1 ring-slate-100"
                  >
                    {[1, 2, 4, 8].map((n) => (
                      <button
                        key={n}
                        onClick={() => setPerSpin(n)}
                        disabled={spinning}
                        aria-pressed={perSpin === n}
                        className={cn(
                          "h-9 w-9 cursor-pointer rounded-full font-mono text-sm font-bold transition-colors duration-200",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                          "disabled:cursor-not-allowed disabled:opacity-50",
                          perSpin === n
                            ? "bg-primary text-white"
                            : "text-slate-400 hover:bg-slate-100 hover:text-slate-700",
                        )}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Disembunyikan di layar pendek (lihat .stage-note di globals.css)
                agar konsol spin tetap terlihat tanpa perlu scroll. */}
            <p className="stage-note items-center justify-center gap-2 text-sm font-medium text-slate-600">
              <Gift className="h-4 w-4 shrink-0 text-orange-500" aria-hidden />
              Dukung terus peserta favoritmu dan menangkan {prize} impianmu
            </p>
          </div>
        )}

        {/* Pengumuman nama pemenang: jeda dramatis antara kode terungkap dan
            roda hadiah, supaya penonton tahu dulu siapa yang menang. */}
        {stage === "winnerName" && pendingWinner.current && (
          <div
            className="w-full max-w-2xl space-y-3 rounded-[36px] bg-white/90 px-6 py-10 backdrop-blur-md"
            style={{
              boxShadow:
                "0 30px 70px -24px rgba(8,145,178,0.5), 0 2px 0 rgba(255,255,255,0.95) inset, 0 0 0 2px rgba(8,145,178,0.35)",
            }}
          >
            <span className="mx-auto mb-1 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-b from-cyan-400 to-primary shadow-[0_8px_20px_-6px_rgba(8,145,178,0.65)]">
              <Crown className="h-7 w-7 text-white" aria-hidden />
            </span>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-primary">
              Pemenangnya adalah
            </p>
            <p
              className="text-4xl font-black text-[#1e3a5f] sm:text-6xl"
              style={{ textShadow: "0 3px 12px rgba(15,23,42,0.18)" }}
            >
              {pendingWinner.current.name}
            </p>
            <p className="text-lg font-semibold text-slate-500">
              {maskPhone(pendingWinner.current.phone_number)}
            </p>
            <p className="mx-auto inline-flex rounded-full bg-primary/10 px-4 py-1 font-mono text-xl font-black tracking-wider text-primary">
              {pendingWinner.current.code}
            </p>
            <p className="pt-1 text-sm text-slate-500">
              Selanjutnya, putar roda untuk menentukan hadiahnya.
            </p>
            <div className="flex justify-center pt-2">
              <button
                onClick={() => setStage("wheel")}
                className={cn(
                  "relative cursor-pointer rounded-full px-8 py-3 text-base font-extrabold uppercase tracking-wide text-white transition-all duration-200",
                  "bg-gradient-to-b from-cyan-400 to-primary",
                  "shadow-[0_7px_0_-1px_rgb(14,116,144),0_16px_26px_-12px_rgba(8,145,178,0.6)]",
                  "hover:brightness-105 active:translate-y-[3px] active:shadow-[0_4px_0_-1px_rgb(14,116,144)]",
                  "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-300/60",
                )}
              >
                Lanjut ke Roda Hadiah
              </button>
            </div>
          </div>
        )}

        {stage === "wheel" && (
          <div
            className="w-full max-w-md space-y-2.5 rounded-[28px] bg-white/90 p-4 sm:p-5 backdrop-blur-md"
            style={{
              boxShadow:
                "0 20px 50px -20px rgba(8,145,178,0.45), 0 2px 0 rgba(255,255,255,0.95) inset, 0 0 0 1px rgba(255,255,255,0.7)",
            }}
          >
            <div className="text-center space-y-0.5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-primary">
                Kode Pemenang: {pendingWinner.current?.code || "YCS-XXXX-XXXX"}
              </span>
              <h3 className="text-xl font-black text-slate-800">
                Putar Roda Hadiah
              </h3>
              <p className="text-[11px] text-slate-500 max-w-xs mx-auto leading-tight">
                Tekan tombol di bawah untuk memutar Spin Wheel 10 bagian (1 HP, 4 E-Money, 5 Tumbler) & menentukan hadiah pemenang!
              </p>
            </div>

            <SpinWheel
              mode={settingsData?.spin_wheel_mode || "ALWAYS_TUMBLER"}
              onSpinEnd={handleWheelEnd}
            />
          </div>
        )}

        {stage === "reveal" && winner && (
          <div
            className="w-full max-w-2xl space-y-3 rounded-[36px] bg-white/90 px-6 py-10 backdrop-blur-md"
            style={{
              boxShadow:
                "0 30px 70px -24px rgba(249,115,22,0.55), 0 2px 0 rgba(255,255,255,0.95) inset, 0 0 0 2px rgba(249,115,22,0.45)",
            }}
          >
            <span className="mx-auto mb-1 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-b from-amber-300 to-orange-500 shadow-[0_8px_20px_-6px_rgba(234,88,12,0.65)]">
              <Crown className="h-7 w-7 text-white" aria-hidden />
            </span>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-orange-600">
              Selamat kepada
            </p>
            <p
              className="text-4xl font-black text-[#1e3a5f] sm:text-6xl"
              style={{ textShadow: "0 3px 12px rgba(15,23,42,0.18)" }}
            >
              {winner.name}
            </p>
            <p className="text-lg font-semibold text-slate-500">
              {maskPhone(winner.phone_number)}
            </p>
            <div className="flex flex-wrap justify-center items-center gap-2 pt-1">
              <p className="inline-flex rounded-full bg-primary/10 px-4 py-1 font-mono text-xl font-black tracking-wider text-primary">
                {winner.code}
              </p>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-pink-500 px-4 py-1.5 text-sm font-extrabold text-white shadow-md">
                <Gift className="h-4 w-4" /> Hadiah: {winner.prize || prize}
              </span>
            </div>
            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={run}
                className={cn(
                  "relative rounded-full px-7 py-2.5 text-sm font-black uppercase tracking-wide text-white transition-all duration-200",
                  "bg-gradient-to-r from-amber-400 via-orange-500 to-pink-500",
                  "shadow-[0_7px_0_-2px_rgb(190,24,93),0_14px_24px_-10px_rgba(236,72,153,0.6)]",
                  "hover:brightness-105 active:translate-y-1 active:shadow-[0_3px_0_-2px_rgb(190,24,93)]",
                )}
              >
                Undi Lagi
              </button>
              <button
                onClick={handleClose}
                className="rounded-full bg-slate-100 px-7 py-2.5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-200"
              >
                Selesai
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
