"use client";

import * as React from "react";
import { CheckCircle2, Trophy, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState, LoadingState } from "@/components/states";
import { useRounds, useRoundStandings, type RoundStanding } from "@/lib/queries";
import { cn, formatNumber } from "@/lib/utils";

export default function AdminHasilPage() {
  const { data: rounds, isLoading } = useRounds();
  const [roundId, setRoundId] = React.useState("");
  const [view, setView] = React.useState<"kabupaten" | "nasional">("nasional");

  // Default: gelombang aktif, atau yang terakhir dibuat.
  React.useEffect(() => {
    if (!roundId && rounds && rounds.length) {
      const active = rounds.find((r) => r.status === "active");
      setRoundId(active?.id ?? rounds[rounds.length - 1].id);
    }
  }, [rounds, roundId]);

  const round = rounds?.find((r) => r.id === roundId);
  const { data, isLoading: loadingStandings } = useRoundStandings(roundId);
  const rows = data ?? [];

  const lolos = rows.filter((r) => r.status === "lolos");
  const gugur = rows.filter((r) => r.status === "gugur");
  const belum = rows.filter((r) => r.status === "active");
  const closed = round?.status === "closed";
  const totalPoin = rows.reduce((s, r) => s + r.points, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Hasil Lolos</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Sekolah yang lolos dan tidak lolos per gelombang. Hasil final muncul
            setelah gelombang ditutup.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-xl border bg-muted/40 p-0.5 text-sm">
            {(["nasional", "kabupaten"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  "cursor-pointer rounded-lg px-3.5 py-1.5 font-medium capitalize transition-colors",
                  view === v
                    ? "bg-background text-foreground shadow-sm ring-1 ring-inset ring-border/60"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {v}
              </button>
            ))}
          </div>
          <select
            className="select-ui w-52"
            value={roundId}
            onChange={(e) => setRoundId(e.target.value)}
            aria-label="Pilih gelombang"
          >
            {(rounds ?? []).map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
                {r.status === "active" ? " · berjalan" : ""}
                {r.status === "closed" ? " · selesai" : ""}
                {r.status === "draft" ? " · draft" : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading || loadingStandings ? (
        <LoadingState />
      ) : !round ? (
        <EmptyState title="Belum ada gelombang" />
      ) : (
        <>
          {/* Ringkasan */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label="Sekolah" value={rows.length} />
            <StatTile
              label={closed ? "Lolos" : "Kuota lolos"}
              value={closed ? lolos.length : round.top_n}
              tone="emerald"
            />
            <StatTile
              label={closed ? "Tidak lolos" : "Peserta"}
              value={closed ? gugur.length : rows.length}
              tone={closed ? "red" : undefined}
            />
            <StatTile label="Total Poin" value={totalPoin} />
          </div>

          {!closed ? (
            <Card>
              <CardContent className="space-y-4 p-4 sm:p-6">
                <div className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800 ring-1 ring-inset ring-amber-200">
                  <Trophy className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>
                    <b>{round.name}</b> belum ditutup — ini peringkat sementara.
                    Lolos/gugur ditetapkan saat ditutup{" "}
                    {round.select_mode === "global"
                      ? `(top ${round.top_n} nasional)`
                      : `(top ${round.top_n} per kabupaten)`}
                    .
                  </p>
                </div>
                <RankList
                  rows={belum.length ? belum : rows}
                  topN={round.top_n}
                  mode={round.select_mode}
                  view={view}
                  provisional
                />
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              <ResultCard
                title="Lolos"
                icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
                rows={lolos}
                tone="lolos"
                view={view}
              />
              <ResultCard
                title="Tidak Lolos"
                icon={<XCircle className="h-5 w-5 text-red-600" />}
                rows={gugur}
                tone="gugur"
                view={view}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ---------- pieces ---------- */

function StatTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "emerald" | "red";
}) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 text-2xl font-bold tabular-nums",
          tone === "emerald" && "text-emerald-600",
          tone === "red" && "text-red-600",
        )}
      >
        {formatNumber(value)}
      </p>
    </div>
  );
}

/** Lencana peringkat: medali untuk 1/2/3, angka untuk sisanya. */
function RankBadge({ rank }: { rank: number }) {
  const medal =
    rank === 1
      ? "bg-amber-100 text-amber-700 ring-amber-300"
      : rank === 2
        ? "bg-slate-100 text-slate-600 ring-slate-300"
        : rank === 3
          ? "bg-orange-100 text-orange-700 ring-orange-300"
          : "bg-muted text-muted-foreground ring-transparent";
  return (
    <span
      className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ring-1 ring-inset tabular-nums",
        medal,
      )}
    >
      {rank}
    </span>
  );
}

function Row({
  r,
  rank,
  showRegion,
  candidate,
  tone,
}: {
  r: RoundStanding;
  rank: number;
  showRegion: boolean;
  candidate?: boolean;
  tone?: "lolos" | "gugur";
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-xl border p-2.5 pl-2 text-sm transition-colors",
        tone === "lolos" && "border-emerald-200 bg-emerald-50/60",
        tone === "gugur" && "border-red-200 bg-red-50/50",
        !tone && "bg-card hover:bg-muted/40",
      )}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <RankBadge rank={rank} />
        <div className="min-w-0">
          <p className="truncate font-medium leading-tight">{r.school_name}</p>
          {showRegion && (
            <p className="truncate text-xs text-muted-foreground">
              {r.region_name}
            </p>
          )}
        </div>
        {candidate && (
          <Badge variant="success" className="shrink-0">
            Calon lolos
          </Badge>
        )}
      </div>
      <div className="shrink-0 text-right">
        <span className="font-semibold tabular-nums text-primary">
          {formatNumber(r.points)}
        </span>
        <span className="ml-1 text-xs text-muted-foreground">poin</span>
        {r.carry_points > 0 && (
          <p className="text-[11px] text-muted-foreground">
            +{formatNumber(r.carry_points)} bawaan
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Daftar peringkat. view=nasional → satu list; view=kabupaten → dikelompokkan.
 * provisional=true menandai calon lolos (top-N) untuk gelombang berjalan.
 */
function RankList({
  rows,
  topN,
  mode,
  view,
  provisional,
}: {
  rows: RoundStanding[];
  topN: number;
  mode: "per_region" | "global";
  view: "kabupaten" | "nasional";
  provisional?: boolean;
}) {
  if (!rows.length)
    return <EmptyState title="Belum ada sekolah di gelombang ini" />;

  if (view === "nasional") {
    const sorted = [...rows].sort((a, b) => b.points - a.points);
    return (
      <div className="max-h-[65vh] space-y-1.5 overflow-y-auto pr-1">
        {sorted.map((r, i) => (
          <Row
            key={r.school_id}
            r={r}
            rank={i + 1}
            showRegion
            candidate={provisional && mode === "global" && i < topN}
          />
        ))}
      </div>
    );
  }

  const groups = new Map<string, RoundStanding[]>();
  for (const r of rows) {
    const arr = groups.get(r.region_name) ?? [];
    arr.push(r);
    groups.set(r.region_name, arr);
  }
  for (const arr of groups.values()) arr.sort((a, b) => b.points - a.points);

  return (
    <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-1">
      {Array.from(groups.entries()).map(([region, list]) => (
        <div key={region}>
          <p className="mb-1.5 flex items-center gap-2 text-sm font-semibold">
            {region}
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {list.length}
            </span>
          </p>
          <div className="space-y-1.5">
            {list.map((r, i) => (
              <Row
                key={r.school_id}
                r={r}
                rank={i + 1}
                showRegion={false}
                candidate={provisional && mode === "per_region" && i < topN}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ResultCard({
  title,
  icon,
  rows,
  tone,
  view,
}: {
  title: string;
  icon: React.ReactNode;
  rows: RoundStanding[];
  tone: "lolos" | "gugur";
  view: "kabupaten" | "nasional";
}) {
  const groups = React.useMemo(() => {
    const map = new Map<string, RoundStanding[]>();
    for (const r of rows) {
      const arr = map.get(r.region_name) ?? [];
      arr.push(r);
      map.set(r.region_name, arr);
    }
    for (const arr of map.values()) arr.sort((a, b) => b.points - a.points);
    return Array.from(map.entries());
  }, [rows]);

  const flat = React.useMemo(
    () => [...rows].sort((a, b) => b.points - a.points),
    [rows],
  );

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="mb-3 flex items-center gap-2">
          {icon}
          <h2 className="font-semibold">{title}</h2>
          <Badge variant={tone === "lolos" ? "success" : "destructive"}>
            {rows.length}
          </Badge>
        </div>
        {rows.length === 0 ? (
          <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            Tidak ada.
          </p>
        ) : view === "nasional" ? (
          <div className="max-h-[60vh] space-y-1.5 overflow-y-auto pr-1">
            {flat.map((r, i) => (
              <Row key={r.school_id} r={r} rank={i + 1} showRegion tone={tone} />
            ))}
          </div>
        ) : (
          <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
            {groups.map(([region, list]) => (
              <div key={region}>
                <p className="mb-1.5 text-xs font-semibold text-muted-foreground">
                  {region}
                </p>
                <div className="space-y-1.5">
                  {list.map((r, i) => (
                    <Row
                      key={r.school_id}
                      r={r}
                      rank={i + 1}
                      showRegion={false}
                      tone={tone}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
