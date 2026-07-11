"use client";

import * as React from "react";
import Link from "next/link";
import { MapPin, Trophy } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState, LoadingState } from "@/components/states";
import {
  useMyProfile,
  useMySchoolRank,
  useRegions,
  useSchoolRankings,
  type SchoolRankingRow,
} from "@/lib/queries";
import { Input } from "@/components/ui/input";
import { cn, formatNumber } from "@/lib/utils";

/**
 * Dropdown kabupaten yang bisa dicari: ketik nama, muncul rekomendasi,
 * klik untuk pilih. Sudah terpilih → chip dengan tombol Ganti.
 */
function RegionCombobox({
  regions,
  value,
  onChange,
}: {
  regions: { id: string; name: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [q, setQ] = React.useState("");
  const [open, setOpen] = React.useState(false);

  const selected = regions.find((r) => r.id === value) ?? null;
  const filtered = regions.filter((r) =>
    r.name.toLowerCase().includes(q.trim().toLowerCase()),
  );

  if (selected) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-lg border border-primary bg-primary/5 p-2.5 text-sm">
        <span className="min-w-0 truncate font-medium">{selected.name}</span>
        <button
          type="button"
          className="shrink-0 cursor-pointer text-xs text-primary hover:underline"
          onClick={() => {
            onChange("");
            setQ("");
            setOpen(true);
          }}
        >
          Ganti
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <Input
        value={q}
        placeholder="Ketik nama kabupaten/kota…"
        autoComplete="off"
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
      />
      {open && filtered.length > 0 && (
        <div className="max-h-44 overflow-y-auto rounded-lg border">
          {filtered.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => {
                onChange(r.id);
                setOpen(false);
                setQ("");
              }}
              className="block w-full cursor-pointer px-3 py-2 text-left text-sm hover:bg-muted"
            >
              {r.name}
            </button>
          ))}
        </div>
      )}
      {open && q.trim() && filtered.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Kabupaten tak ditemukan. Coba kata kunci lain.
        </p>
      )}
    </div>
  );
}

/** Intensitas panas relatif → aksen baris. */
function heatBar(ratio: number): string {
  if (ratio >= 0.8) return "bg-primary";
  if (ratio >= 0.55) return "bg-primary/70";
  if (ratio >= 0.3) return "bg-primary/45";
  if (ratio > 0.1) return "bg-primary/25";
  return "bg-primary/10";
}

function RankingList({
  rows,
  highlightId,
}: {
  rows: SchoolRankingRow[];
  highlightId?: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.points));
  return (
    <div className="space-y-1.5">
      {rows.map((r) => {
        const mine = r.school_id === highlightId;
        return (
          <Link
            href={`/sekolah/${r.school_id}`}
            key={r.school_id}
            className={cn(
              "relative block cursor-pointer overflow-hidden rounded-xl border p-3 transition-colors hover:border-primary/40",
              mine
                ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                : "bg-card",
            )}
          >
            {/* Heat bar */}
            <div
              className={cn(
                "absolute inset-y-0 left-0 w-1",
                heatBar(r.points / max),
              )}
            />
            <div className="flex items-center gap-3 pl-2">
              <span
                className={cn(
                  "w-9 shrink-0 text-center text-sm font-extrabold tabular-nums",
                  r.rank <= 3 ? "text-accent" : "text-muted-foreground",
                )}
              >
                #{r.rank}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {r.school_name}
                  {mine && (
                    <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                      Sekolahmu
                    </span>
                  )}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {r.region_name} · {r.participants} peserta
                </p>
              </div>
              <span className="shrink-0 font-bold tabular-nums text-primary">
                {formatNumber(r.points)}
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

/**
 * Peringkat sekolah (kabupaten/nasional) — dipakai sebagai tab "Sekolah"
 * di halaman /ranking.
 */
export function SchoolRankings() {
  const { data: me } = useMyProfile();
  const voterReady = !!me && me.role === "voter" && me.onboarded;
  const { data: myRank } = useMySchoolRank(voterReady);

  const [tab, setTab] = React.useState<"kab" | "nasional">("nasional");
  const [regionId, setRegionId] = React.useState<string>("");
  const { data: regions } = useRegions();

  // Voter login: default ke tab kabupatennya.
  React.useEffect(() => {
    if (myRank?.region_id) {
      setRegionId((v) => v || myRank.region_id!);
      setTab("kab");
    }
  }, [myRank]);

  const activeRegion = tab === "kab" ? regionId || undefined : undefined;
  const { data: rows, isLoading } = useSchoolRankings(activeRegion);

  const regionName =
    regions?.find((r) => r.id === regionId)?.name ?? myRank?.region_name;

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Poin sekolah = akumulasi poin seluruh pesertanya.
      </p>

      {/* 2 pilihan */}
      <div className="flex rounded-xl border p-1 text-sm font-medium">
        <button
          className={cn(
            "flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-3 py-2 transition-colors",
            tab === "kab"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
          onClick={() => setTab("kab")}
        >
          <MapPin className="h-4 w-4" />
          Kabupatenmu
        </button>
        <button
          className={cn(
            "flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-3 py-2 transition-colors",
            tab === "nasional"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
          onClick={() => setTab("nasional")}
        >
          <Trophy className="h-4 w-4" />
          Nasional
        </button>
      </div>

      {/* Ringkasan posisi sekolahku */}
      {voterReady && myRank && (
        <Card className="border-primary/25 bg-primary/[0.04]">
          <CardContent className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm">
            <p className="min-w-0 truncate font-semibold">
              {myRank.school_name}
            </p>
            <p className="shrink-0 text-muted-foreground">
              <span className="font-bold text-foreground">
                #{myRank.region_rank}
              </span>
              /{myRank.region_total} di {myRank.region_name} ·{" "}
              <span className="font-bold text-foreground">
                #{myRank.global_rank}
              </span>
              /{myRank.global_total} nasional
            </p>
          </CardContent>
        </Card>
      )}

      {/* Pemilih kabupaten (tab kab, untuk pengunjung tanpa sekolah) */}
      {tab === "kab" && (
        <div className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground">
            Kabupaten{regionName ? `: ${regionName}` : ""}
          </span>
          <RegionCombobox
            regions={regions ?? []}
            value={regionId}
            onChange={setRegionId}
          />
        </div>
      )}

      {isLoading ? (
        <LoadingState />
      ) : tab === "kab" && !regionId ? (
        <EmptyState
          title="Pilih kabupaten dulu"
          description="Login sebagai pendukung agar kabupatenmu terpilih otomatis."
        />
      ) : !rows || rows.length === 0 ? (
        <EmptyState title="Belum ada sekolah" />
      ) : (
        <RankingList rows={rows} highlightId={myRank?.school_id} />
      )}
    </div>
  );
}
