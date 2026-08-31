"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { Layers, Loader2, Medal, Search } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { MaintenanceOverlay } from "@/components/maintenance-overlay";
import { EventClosedOverlay } from "@/components/event-closed-overlay";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/states";
import {
  usePublicQualified,
  usePublicRounds,
  type QualifiedParticipant,
} from "@/lib/queries";
import { cn, formatNumber } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

export default function PublicQualifiedPage() {
  const t = useTranslation("lolos");
  const { data, isLoading } = usePublicQualified();
  // Dipakai menghitung sisa slot yang digulirkan ke gelombang berikutnya.
  const { data: allRounds } = usePublicRounds();
  // Dibungkus useMemo: `data ?? []` bikin array baru tiap render, sehingga
  // memo di bawahnya ikut dihitung ulang terus.
  const rows = React.useMemo(() => data ?? [], [data]);
  const [q, setQ] = React.useState("");
  const [round, setRound] = React.useState<string>("");

  // Gelombang yang sudah punya peserta lolos, jadi tab pemilih.
  const rounds = React.useMemo(() => {
    const seen = new Map<string, { id: string; name: string }>();
    for (const r of rows) {
      seen.set(r.round_id, { id: r.round_id, name: r.round_name });
    }
    return Array.from(seen.values());
  }, [rows]);

  // Default: gelombang pertama yang punya hasil.
  React.useEffect(() => {
    if (!round && rounds.length > 0) setRound(rounds[0].id);
  }, [rounds, round]);

  /**
   * Sisa slot gelombang terpilih: kuota (top_n) dikurangi jumlah yang lolos.
   * Sesuai ketentuan akumulasi slot, sisanya ditambahkan ke gelombang
   * berikutnya, jadi kuota gelombang itu bertambah.
   */
  const slotInfo = React.useMemo(() => {
    const list = allRounds ?? [];
    const current = list.find((r) => r.id === round);
    if (!current) return null;
    // Kuota efektif dari server: dasar + akumulasi gelombang sebelumnya.
    const quota = current.effective_quota ?? current.top_n;
    if (!quota) return null;

    // Golden Buzzer jalur terpisah dan TIDAK memakai slot gelombang, jadi
    // slot terpakai murni jumlah peserta yang lolos lewat gelombang ini.
    const lolosCount =
      current.lolos_count ?? rows.filter((r) => r.round_id === round).length;
    const leftover = quota - lolosCount;
    if (leftover <= 0) return null;

    // Gelombang berikutnya = sequence terdekat di atas gelombang ini.
    const next = list
      .filter((r) => (r.sequence ?? 0) > (current.sequence ?? 0))
      .sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0))[0];
    if (!next) return null;
    const nextQuota = next.effective_quota ?? next.top_n;
    if (!nextQuota) return null;

    return {
      lolosCount,
      quota,
      leftover,
      nextName: next.name,
      // Server sudah menghitung akumulasi; kalau gelombang ini belum ditutup
      // sisanya belum masuk, jadi ditambahkan untuk gambaran.
      nextTotal:
        current.status === "closed" ? nextQuota : nextQuota + leftover,
    };
  }, [allRounds, rows, round]);

  const shown = React.useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (!round || r.round_id === round) &&
        (!needle ||
          r.participant_name.toLowerCase().includes(needle) ||
          r.school_name.toLowerCase().includes(needle)),
    );
  }, [rows, round, q]);

  // Tiga teratas dapat panggung sendiri; saat mencari, podium disembunyikan
  // supaya peringkatnya tidak menyesatkan.
  const searching = q.trim().length > 0;
  const podium = searching ? [] : shown.slice(0, 3);
  const rest = searching ? shown : shown.slice(3);

  return (
    <div className="min-h-screen">
      <MaintenanceOverlay />
      <EventClosedOverlay />
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden border-b bg-gradient-to-b from-emerald-50 to-background dark:from-emerald-500/10">
        <span
          aria-hidden
          className="pointer-events-none absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-emerald-400/20 blur-3xl"
        />
        <div className="container relative max-w-5xl py-10 text-center sm:py-14">
          <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-400 shadow-lg shadow-emerald-500/40">
            <Medal className="h-7 w-7 text-white" />
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            {t.title}
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
            {t.subtitle}
          </p>
        </div>
      </section>

      <main className="container max-w-5xl space-y-6 py-8">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState title={t.emptyTitle} description={t.emptyDescription} />
        ) : (
          <>
            {/* Pemilih gelombang */}
            <div className="flex flex-wrap justify-center gap-2">
              {rounds.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setRound(r.id)}
                  className={cn(
                    "cursor-pointer rounded-full border px-5 py-2 text-sm font-semibold transition-colors",
                    round === r.id
                      ? "border-emerald-600 bg-emerald-600 text-white shadow-sm"
                      : "hover:bg-muted",
                  )}
                >
                  {r.name}
                </button>
              ))}
            </div>

            {slotInfo && (
              <div className="mx-auto max-w-2xl rounded-xl border border-primary/30 bg-primary/5 p-3 text-sm">
                <p className="flex items-start gap-2">
                  <Layers className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>
                    {t.slotNote(
                      slotInfo.lolosCount,
                      slotInfo.quota,
                      slotInfo.leftover,
                      slotInfo.nextName,
                      slotInfo.nextTotal,
                    )}
                  </span>
                </p>
              </div>
            )}

            {/* Pencarian */}
            <div className="relative mx-auto max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t.searchPlaceholder}
                className="pl-9"
              />
            </div>

            {shown.length === 0 ? (
              <EmptyState title={t.emptySearch} />
            ) : (
              <>
                <p className="text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t.count(shown.length)}
                </p>

                {podium.length > 0 && (
                  <div className="grid items-end gap-4 sm:grid-cols-3">
                    {podium.map((p, i) => (
                      <PodiumCard key={p.participant_id} p={p} rank={i + 1} />
                    ))}
                  </div>
                )}

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {rest.map((p, i) => (
                    <WinnerCard
                      key={p.participant_id}
                      p={p}
                      rank={searching ? i + 1 : i + 4}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}

/** Kartu besar untuk peringkat 1-3, warna mengikuti medali. */
function PodiumCard({ p, rank }: { p: QualifiedParticipant; rank: number }) {
  const t = useTranslation("lolos");
  const medal =
    rank === 1
      ? {
          ring: "ring-amber-400",
          badge: "bg-gradient-to-r from-amber-400 to-yellow-300 text-amber-950",
          border: "border-amber-400/70",
          order: "sm:order-2",
        }
      : rank === 2
        ? {
            ring: "ring-slate-300",
            badge: "bg-slate-200 text-slate-700",
            border: "border-slate-300",
            order: "sm:order-1",
          }
        : {
            ring: "ring-orange-300",
            badge: "bg-orange-200 text-orange-800",
            border: "border-orange-300",
            order: "sm:order-3",
          };

  return (
    <Link
      href={`/peserta/${p.participant_id}`}
      className={cn("group", medal.order)}
    >
      <Card
        className={cn(
          "card-lift h-full border-2 text-center transition-shadow hover:shadow-lg",
          medal.border,
        )}
      >
        <CardContent className="space-y-3 p-5">
          <div className="relative mx-auto w-fit">
            {p.photo_url ? (
              <Image
                src={p.photo_url}
                alt=""
                width={96}
                height={96}
                className={cn(
                  "h-24 w-24 rounded-full object-cover ring-4",
                  medal.ring,
                )}
                unoptimized
              />
            ) : (
              <Avatar className={cn("h-24 w-24 ring-4", medal.ring)}>
                <AvatarFallback className="bg-emerald-500/10 text-xl font-bold text-emerald-700">
                  {p.participant_name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            )}
            <span
              className={cn(
                "absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full px-3 py-0.5 text-xs font-extrabold shadow-sm",
                medal.badge,
              )}
            >
              #{rank}
            </span>
          </div>

          <div className="pt-1">
            <p className="truncate font-bold">{p.participant_name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {p.school_name}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {p.region_name}
            </p>
          </div>

          <p className="text-lg font-extrabold text-emerald-600">
            {formatNumber(p.points)}
            <span className="ml-1 text-xs font-medium text-muted-foreground">
              {t.pointsLabel}
            </span>
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}

/** Kartu ringkas untuk peringkat 4 ke bawah. */
function WinnerCard({ p, rank }: { p: QualifiedParticipant; rank: number }) {
  return (
    <Link href={`/peserta/${p.participant_id}`} className="group">
      <Card className="card-lift h-full border-emerald-500/30 bg-emerald-50/30 dark:bg-emerald-500/5">
        <CardContent className="flex items-center gap-3 p-3">
          <span className="w-7 shrink-0 text-center text-sm font-bold tabular-nums text-muted-foreground">
            {rank}
          </span>
          {p.photo_url ? (
            <Image
              src={p.photo_url}
              alt=""
              width={44}
              height={44}
              className="h-11 w-11 shrink-0 rounded-full object-cover ring-2 ring-emerald-500/30"
              unoptimized
            />
          ) : (
            <Avatar className="h-11 w-11 shrink-0 ring-2 ring-emerald-500/30">
              <AvatarFallback className="bg-emerald-500/10 text-xs font-semibold text-emerald-700">
                {p.participant_name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">
              {p.participant_name}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {p.school_name}
            </p>
          </div>
          <span className="shrink-0 text-sm font-bold text-emerald-600">
            {formatNumber(p.points)}
          </span>
        </CardContent>
      </Card>
    </Link>
  );
}
