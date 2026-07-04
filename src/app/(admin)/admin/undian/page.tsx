"use client";

import * as React from "react";
import { Gift, Loader2, Radio, Smartphone, Ticket, Undo2, X } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState, LoadingState } from "@/components/states";
import { useConfirm } from "@/components/confirm-dialog";
import { api } from "@/lib/api-client";
import { formatNumber } from "@/lib/utils";

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
    try {
      // Jeda kecil biar terasa "diundi"
      await new Promise((r) => setTimeout(r, 900));
      const res = await api<{ winner: Winner }>("/api/admin/raffle/draw", {
        method: "POST",
        body: JSON.stringify({ prize: prize.trim() || "Handphone" }),
      });
      setReveal(res.winner);
      qc.invalidateQueries({ queryKey: ["raffle"] });
    } catch (e) {
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

const CONFETTI_COLORS = ["#f97316", "#0891b2", "#22d3ee", "#fbbf24", "#34d399"];

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

type Stage = "idle" | "count" | "spin" | "reveal";

/** Panggung undian layar penuh: countdown, shuffle nama melambat, reveal. */
function LiveDraw({
  prize,
  onClose,
}: {
  prize: string;
  onClose: () => void;
}) {
  const [stage, setStage] = React.useState<Stage>("idle");
  const [count, setCount] = React.useState(3);
  const [ticker, setTicker] = React.useState<string>("");
  const [winner, setWinner] = React.useState<Winner | null>(null);
  const alive = React.useRef(true);
  // StrictMode dev menjalankan mount-cleanup-mount: cleanup mematikan flag,
  // jadi WAJIB dinyalakan lagi di body effect.
  React.useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  // Prefetch kandidat begitu panggung dibuka: shuffle mulai tanpa jeda.
  const poolRef = React.useRef<{ name: string; code: string }[]>([]);
  React.useEffect(() => {
    api<{ name: string; code: string }[]>("/api/admin/raffle/candidates")
      .then((c) => (poolRef.current = c))
      .catch(() => {});
  }, []);

  async function run() {
    try {
      setWinner(null);
      // 1. Countdown 3..2..1
      setStage("count");
      for (let i = 3; i >= 1; i--) {
        setCount(i);
        await new Promise((r) => setTimeout(r, 900));
        if (!alive.current) return;
      }

      // 2. Shuffle langsung jalan (pool prefetch); draw diproses paralel
      // di background - animasi tidak pernah menunggu jaringan.
      setStage("spin");
      const drawPromise = api<{ winner: Winner }>("/api/admin/raffle/draw", {
        method: "POST",
        body: JSON.stringify({ prize }),
      });
      const pool = poolRef.current.length
        ? poolRef.current
        : [{ name: "...", code: "" }];
      let delay = 55;
      const start = Date.now();
      while (Date.now() - start < 4600) {
        setTicker(pool[Math.floor(Math.random() * pool.length)].name ?? "?");
        await new Promise((r) => setTimeout(r, delay));
        if (!alive.current) return;
        delay = Math.min(360, delay * 1.07); // makin lambat, makin tegang
      }
      const res = await drawPromise; // umumnya sudah selesai jauh sebelum ini
      setTicker(res.winner.name ?? "?");
      await new Promise((r) => setTimeout(r, 650));

      // 3. Reveal + confetti; segarkan pool untuk ronde berikutnya
      setWinner(res.winner);
      setStage("reveal");
      api<{ name: string; code: string }[]>("/api/admin/raffle/candidates")
        .then((c) => (poolRef.current = c))
        .catch(() => {});
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal mengundi.");
      setStage("idle");
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-[#06222e] text-white">
      {/* Latar glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(700px circle at 50% 20%, rgba(8,145,178,0.35), transparent 60%), radial-gradient(600px circle at 80% 90%, rgba(249,115,22,0.18), transparent 60%)",
        }}
      />
      {stage === "reveal" && <Confetti />}

      <button
        onClick={onClose}
        className="absolute right-5 top-5 z-10 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
        aria-label="Tutup"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="relative z-[1] flex flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
        <p className="text-sm font-bold uppercase tracking-[0.3em] text-cyan-300">
          Youth Character Summit
        </p>
        <h2 className="text-3xl font-extrabold sm:text-5xl">
          Undian {prize}
        </h2>

        {stage === "idle" && (
          <>
            <p className="max-w-md text-white/70">
              Pastikan layar ini yang dibagikan ke penonton. Klik mulai dan
              biarkan nama-nama berputar.
            </p>
            <Button size="lg" variant="accent" onClick={run}>
              <Radio className="h-5 w-5" /> Mulai Undian
            </Button>
          </>
        )}

        {stage === "count" && (
          <p
            key={count}
            className="text-[9rem] font-extrabold leading-none text-accent"
            style={{ animation: "ping 0.9s ease-out" }}
          >
            {count}
          </p>
        )}

        {stage === "spin" && (
          <div className="w-full max-w-2xl rounded-3xl border border-white/15 bg-white/5 px-6 py-14 backdrop-blur">
            <p className="truncate text-4xl font-extrabold sm:text-6xl">
              {ticker}
            </p>
          </div>
        )}

        {stage === "reveal" && winner && (
          <div className="w-full max-w-2xl space-y-4 rounded-3xl border-2 border-accent bg-white/[0.07] px-6 py-12 backdrop-blur">
            <p className="text-sm font-bold uppercase tracking-widest text-accent">
              Selamat kepada
            </p>
            <p className="text-4xl font-extrabold sm:text-6xl">{winner.name}</p>
            <p className="text-lg text-white/80">
              {maskPhone(winner.phone_number)}
            </p>
            <p className="font-mono text-xl font-bold text-cyan-300">
              {winner.code}
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <Button variant="accent" onClick={run}>
                Undi Lagi
              </Button>
              <Button
                variant="outline"
                className="border-white/30 bg-transparent text-white hover:bg-white/10"
                onClick={onClose}
              >
                Selesai
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
