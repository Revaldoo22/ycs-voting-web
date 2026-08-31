"use client";

import * as React from "react";
import {
  ArrowLeftRight,
  CheckCircle2,
  Download,
  Loader2,
  Medal,
  Trophy,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState, LoadingState } from "@/components/states";
import { SelectBox } from "@/components/ui/select-box";
import { useConfirm } from "@/components/confirm-dialog";
import { api } from "@/lib/api-client";
import {
  useQualified,
  useRounds,
  useRoundStandings,
  type RoundStanding,
} from "@/lib/queries";
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
  // Satu sekolah bisa mengirim banyak peserta, jadi dihitung distinct.
  const schoolCount = new Set(rows.map((r) => r.school_id ?? "none")).size;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Hasil Lolos</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Peserta yang lolos dan tidak lolos per gelombang. Hasil final
            muncul setelah gelombang ditutup.
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
          <div className="w-52">
            <SelectBox
              value={roundId}
              onChange={setRoundId}
              aria-label="Pilih gelombang"
              placeholder="Pilih gelombang"
              options={(rounds ?? []).map((r) => ({
                value: r.id,
                label:
                  r.name +
                  (r.status === "active"
                    ? " · berjalan"
                    : r.status === "closed"
                      ? " · selesai"
                      : " · draft"),
              }))}
            />
          </div>
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
            <StatTile label="Peserta" value={rows.length} />
            <StatTile
              label={closed ? "Lolos" : "Kuota lolos"}
              value={closed ? lolos.length : (round.effective_quota ?? round.top_n)}
              tone="emerald"
            />
            <StatTile
              label={closed ? "Tidak lolos" : "Sekolah"}
              value={closed ? gugur.length : schoolCount}
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
                    <b>{round.name}</b> belum ditutup, ini peringkat sementara.
                    Lolos/gugur ditetapkan saat ditutup{" "}
                    {round.select_mode === "global"
                      ? `(top ${round.effective_quota ?? round.top_n} nasional)`
                      : `(top ${round.effective_quota ?? round.top_n} per kabupaten)`}
                    {!!round.carried_slots && round.carried_slots > 0 && (
                      <>
                        {" "}
                        — sudah termasuk {round.carried_slots} slot akumulasi
                        dari gelombang sebelumnya
                      </>
                    )}
                    .
                  </p>
                </div>
                <RankList
                  rows={belum.length ? belum : rows}
                  topN={round.effective_quota ?? round.top_n}
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

      {round && (
        <SwapPanel
          roundId={round.id}
          roundName={round.name}
          closed={closed}
          lolos={lolos}
          gugur={gugur.length ? gugur : belum}
        />
      )}

      <QualifiedAllRounds />
    </div>
  );
}

/* ---------- pieces ---------- */

/**
 * Ubah daftar peserta lolos satu gelombang: turunkan, naikkan, atau
 * dua-duanya. Jumlah kedua sisi TIDAK harus sama, jadi panitia bisa sekadar
 * mengurangi jumlah lolos (mis. 200 jadi 190) atau menambah.
 *
 * Poin menyesuaikan otomatis: yang diturunkan masuk gelombang lanjut dengan
 * carry 50% poin akhirnya, sama seperti penutupan normal.
 */
function SwapPanel({
  roundId,
  roundName,
  closed,
  lolos,
  gugur,
}: {
  roundId: string;
  roundName: string;
  closed: boolean;
  lolos: RoundStanding[];
  gugur: RoundStanding[];
}) {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [demoteIds, setDemoteIds] = React.useState<string[]>([]);
  const [promoteIds, setPromoteIds] = React.useState<string[]>([]);
  const [busy, setBusy] = React.useState(false);

  // Jumlah kedua sisi tak harus sama: boleh hanya menurunkan (mengurangi
  // jumlah lolos) atau hanya menaikkan.
  const hasPick = demoteIds.length > 0 || promoteIds.length > 0;
  const lolosAfter = lolos.length - demoteIds.length + promoteIds.length;

  // Total poin bawaan yang akan dibawa peserta turun ke gelombang berikutnya.
  const carryTotal = React.useMemo(
    () =>
      lolos
        .filter((r) => demoteIds.includes(r.participant_id))
        .reduce((sum, r) => sum + Math.floor(r.points * 0.5), 0),
    [lolos, demoteIds],
  );

  function submit() {
    if (!hasPick) return;
    const demoted = lolos.filter((r) => demoteIds.includes(r.participant_id));
    const promoted = gugur.filter((r) => promoteIds.includes(r.participant_id));
    const parts: string[] = [];
    if (promoted.length) {
      parts.push(
        `Naik jadi lolos: ${promoted.map((r) => r.participant_name).join(", ")}.`,
      );
    }
    if (demoted.length) {
      parts.push(
        `Turun jadi gugur: ${demoted.map((r) => r.participant_name).join(", ")}, ` +
          `masuk gelombang berikutnya dengan poin dipotong 50%.`,
      );
    }
    parts.push(`Jumlah lolos jadi ${lolosAfter} peserta.`);
    if (closed) {
      parts.push(
        `Perhatian: ${roundName} sudah ditutup dan hasilnya mungkin sudah diumumkan ke publik.`,
      );
    }
    confirm({
      title: "Ubah peserta lolos?",
      description: parts.join(" "),
      confirmText: "Tukar",
      variant: closed ? "destructive" : "default",
      onConfirm: async () => {
        setBusy(true);
        try {
          const res = await api<{
            promoted_count: number;
            demoted_count: number;
            lolos_total: number;
          }>(
            `/api/admin/rounds/${roundId}/swap-qualified`,
            {
              method: "POST",
              body: JSON.stringify({
                promote_ids: promoteIds,
                demote_ids: demoteIds,
              }),
            },
          );
          toast.success(
            `Selesai: ${res.promoted_count} naik, ${res.demoted_count} turun. ` +
              `Jumlah lolos sekarang ${res.lolos_total}.`,
          );
          setDemoteIds([]);
          setPromoteIds([]);
          qc.invalidateQueries({ queryKey: ["round-standings"] });
          qc.invalidateQueries({ queryKey: ["qualified"] });
          qc.invalidateQueries({ queryKey: ["winners"] });
          qc.invalidateQueries({ queryKey: ["rounds"] });
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Gagal menukar.");
        } finally {
          setBusy(false);
        }
      },
    });
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-4 sm:p-6">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <ArrowLeftRight className="h-5 w-5 text-primary" />
            Atur Peserta Lolos
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Ubah siapa yang lolos di {roundName}. Boleh menukar, atau hanya
            menurunkan untuk mengurangi jumlah lolos. Peserta yang diturunkan
            otomatis masuk gelombang berikutnya dengan poin dipotong 50%.
          </p>
        </div>

        {lolos.length === 0 ? (
          <EmptyState
            title="Belum ada peserta lolos di gelombang ini"
            description="Tutup gelombang dulu untuk menetapkan yang lolos."
          />
        ) : (
          <>
            <div className="grid gap-4 lg:grid-cols-2">
              <PickList
                label="Turunkan (sekarang lolos)"
                tone="red"
                rows={lolos}
                selected={demoteIds}
                onChange={setDemoteIds}
              />
              <PickList
                label="Naikkan (belum lolos)"
                tone="emerald"
                rows={gugur}
                selected={promoteIds}
                onChange={setPromoteIds}
              />
            </div>

            {hasPick && (
              <div className="rounded-xl border border-primary/40 bg-primary/5 p-3 text-sm">
                <p>
                  {promoteIds.length > 0 && (
                    <>
                      <b>{promoteIds.length}</b> naik jadi lolos
                      {demoteIds.length > 0 && ", "}
                    </>
                  )}
                  {demoteIds.length > 0 && (
                    <>
                      <b>{demoteIds.length}</b> turun jadi gugur
                    </>
                  )}
                  . Jumlah lolos: <b>{lolos.length}</b> &rarr;{" "}
                  <b>{lolosAfter}</b> peserta.
                </p>
                {demoteIds.length > 0 && (
                  <p className="mt-0.5 text-muted-foreground">
                    Poin bawaan yang dibawa ke gelombang berikutnya:{" "}
                    {formatNumber(carryTotal)} poin.
                  </p>
                )}
              </div>
            )}

            <Button
              className="w-full"
              variant={closed ? "destructive" : "default"}
              onClick={submit}
              disabled={busy || !hasPick}
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              <ArrowLeftRight className="h-4 w-4" />
              {hasPick
                ? `Terapkan (lolos jadi ${lolosAfter})`
                : "Pilih peserta dulu"}
            </Button>

            {closed && (
              <p className="text-xs text-amber-600">
                {roundName} sudah ditutup. Perubahan langsung terlihat di
                halaman publik.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

/** Daftar peserta dengan pencarian + centang banyak. */
function PickList({
  label,
  tone,
  rows,
  selected,
  onChange,
}: {
  label: string;
  tone: "red" | "emerald";
  rows: RoundStanding[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [q, setQ] = React.useState("");

  const filtered = React.useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter(
      (r) =>
        r.participant_name.toLowerCase().includes(needle) ||
        r.school_name.toLowerCase().includes(needle),
    );
  }, [rows, q]);

  function toggle(id: string) {
    onChange(
      selected.includes(id)
        ? selected.filter((x) => x !== id)
        : [...selected, id],
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label>{label}</Label>
        {selected.length > 0 && (
          <button
            onClick={() => onChange([])}
            className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            Kosongkan ({selected.length})
          </button>
        )}
      </div>
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Cari nama peserta atau sekolah"
      />
      {filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed p-3 text-center text-sm text-muted-foreground">
          Tidak ada yang cocok.
        </p>
      ) : (
        <div className="max-h-64 space-y-1 overflow-y-auto pr-1">
          {filtered.map((r) => {
            const on = selected.includes(r.participant_id);
            return (
              <label
                key={r.participant_id}
                className={cn(
                  "flex cursor-pointer items-center gap-2.5 rounded-lg border p-2 text-sm transition-colors",
                  on
                    ? tone === "red"
                      ? "border-red-300 bg-red-50/70"
                      : "border-emerald-300 bg-emerald-50/70"
                    : "hover:bg-muted/50",
                )}
              >
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => toggle(r.participant_id)}
                  className="h-4 w-4 shrink-0 accent-[hsl(var(--primary))]"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium leading-tight">
                    {r.participant_name}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {r.school_name}
                  </span>
                </span>
                <span className="shrink-0 font-semibold tabular-nums text-primary">
                  {formatNumber(r.points)}
                </span>
              </label>
            );
          })}
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        {rows.length} peserta
        {q.trim() && ` · ${filtered.length} cocok`}
        {selected.length > 0 && ` · ${selected.length} dipilih`}
      </p>
    </div>
  );
}

/**
 * Rekap peserta lolos LINTAS gelombang, dengan keterangan lolos dari
 * gelombang mana. Satu peserta hanya bisa lolos sekali (yang sudah lolos tak
 * ikut gelombang berikutnya), jadi daftar ini = seluruh peserta yang lolos.
 */
function QualifiedAllRounds() {
  const { data, isLoading } = useQualified();
  // useMemo: `data ?? []` bikin array baru tiap render, memo di bawah ikut
  // dihitung ulang terus.
  const rows = React.useMemo(() => data ?? [], [data]);
  const [q, setQ] = React.useState("");
  const [roundFilter, setRoundFilter] = React.useState("");

  // Gelombang yang punya peserta lolos, untuk isi dropdown filter.
  const roundOptions = React.useMemo(() => {
    const seen = new Map<string, string>();
    for (const r of rows) seen.set(r.round_id, r.round_name);
    return Array.from(seen, ([value, label]) => ({ value, label }));
  }, [rows]);

  const filtered = React.useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (!roundFilter || r.round_id === roundFilter) &&
        (!needle ||
          r.participant_name.toLowerCase().includes(needle) ||
          r.school_name.toLowerCase().includes(needle)),
    );
  }, [rows, q, roundFilter]);

  // Peserta unik: satu orang yang lolos di dua gelombang tetap dihitung satu.
  const uniquePeople = new Set(filtered.map((r) => r.participant_id)).size;

  function exportCsv() {
    const head = [
      "Peringkat",
      "Nama Peserta",
      "Sekolah",
      "Kabupaten",
      "Provinsi",
      "Lolos dari",
      "Poin",
    ];
    // Escape RFC 4180: bungkus tanda kutip, kutip di dalam digandakan.
    const cell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const body = filtered.map((r, i) =>
      [
        i + 1,
        r.participant_name,
        r.school_name,
        r.region_name,
        r.province_name,
        r.round_name,
        r.points,
      ]
        .map(cell)
        .join(","),
    );
    // BOM agar Excel membaca UTF-8 (nama dengan karakter non-ASCII).
    const csv =
      "﻿" + [head.map(cell).join(","), ...body].join("\r\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8;" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `peserta-lolos-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-4 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
              <Medal className="h-5 w-5 text-amber-500" />
              Semua Peserta Lolos
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Rekap lintas gelombang, lengkap dengan asal gelombangnya.
              {rows.length > 0 && ` ${uniquePeople} peserta.`}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={exportCsv}
            disabled={filtered.length === 0}
          >
            <Download className="h-4 w-4" />
            Ekspor CSV
          </Button>
        </div>

        {isLoading ? (
          <LoadingState />
        ) : rows.length === 0 ? (
          <EmptyState
            title="Belum ada peserta lolos"
            description="Hasil muncul setelah gelombang ditutup."
          />
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cari nama peserta atau sekolah"
                className="max-w-xs"
              />
              <div className="w-48">
                <SelectBox
                  value={roundFilter}
                  onChange={setRoundFilter}
                  placeholder="Semua gelombang"
                  options={[
                    { value: "", label: "Semua gelombang" },
                    ...roundOptions,
                  ]}
                />
              </div>
            </div>

            {filtered.length === 0 ? (
              <EmptyState title="Tidak ada yang cocok dengan pencarian" />
            ) : (
              <div className="max-h-[70vh] space-y-1.5 overflow-y-auto pr-1">
                {filtered.map((r, i) => (
                  <div
                    key={`${r.round_id}-${r.participant_id}`}
                    className="flex items-center justify-between gap-3 rounded-xl border bg-card p-2.5 pl-2 text-sm"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <RankBadge rank={i + 1} />
                      <div className="min-w-0">
                        <p className="truncate font-medium leading-tight">
                          {r.participant_name}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {r.school_name} &middot; {r.region_name}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge variant="secondary">{r.round_name}</Badge>
                      <span className="font-semibold tabular-nums text-primary">
                        {formatNumber(r.points)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

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
          <p className="truncate font-medium leading-tight">
            {r.participant_name}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {r.school_name}
            {showRegion && <> &middot; {r.region_name}</>}
          </p>
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
    return <EmptyState title="Belum ada peserta di gelombang ini" />;

  if (view === "nasional") {
    const sorted = [...rows].sort((a, b) => b.points - a.points);
    return (
      <div className="max-h-[65vh] space-y-1.5 overflow-y-auto pr-1">
        {sorted.map((r, i) => (
          <Row
            key={r.participant_id}
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
                key={r.participant_id}
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
              <Row key={r.participant_id} r={r} rank={i + 1} showRegion tone={tone} />
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
                      key={r.participant_id}
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
