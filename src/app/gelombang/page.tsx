"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ChevronLeft,
  ChevronRight,
  Flag,
  Loader2,
  MapPin,
  School as SchoolIcon,
  Trophy,
  Users,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { MaintenanceOverlay } from "@/components/maintenance-overlay";
import { EventClosedOverlay } from "@/components/event-closed-overlay";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { EmptyState, LoadingState } from "@/components/states";
import {
  useMyProfile,
  useParticipants,
  usePublicRounds,
  useRoundResults,
  type RoundStanding,
} from "@/lib/queries";
import { cn, formatNumber } from "@/lib/utils";

/** Node drill-down (provinsi/kabupaten) — key stabil walau id null. */
type DrillGroup = {
  key: string;
  name: string;
  points: number;
  schools: number;
  /** Jumlah sub-wilayah (kabupaten di level provinsi). */
  children: number;
};

function rankTone(i: number) {
  if (i === 0) return "text-amber-500";
  if (i === 1) return "text-slate-400";
  if (i === 2) return "text-orange-400";
  return "text-muted-foreground";
}

/** Chip penanda wilayah/sekolah milik voter login. */
function MineBadge({ label }: { label: string }) {
  return (
    <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary ring-1 ring-inset ring-primary/30">
      {label}
    </span>
  );
}

/** Baris leaderboard wilayah yang bisa diklik untuk drill-down. */
function GroupRow({
  rank,
  group,
  childLabel,
  mineLabel,
  onClick,
}: {
  rank: number;
  group: DrillGroup;
  childLabel: string;
  /** Terisi = ini wilayah si voter → di-highlight. */
  mineLabel?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border p-3 text-left text-sm transition-colors hover:border-primary/40 hover:bg-primary/5",
        mineLabel && "border-primary/50 bg-primary/5 ring-1 ring-inset ring-primary/30",
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={cn(
            "w-7 shrink-0 text-center text-sm font-bold tabular-nums",
            rankTone(rank - 1),
          )}
        >
          {rank}
        </span>
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 truncate font-semibold">
            <span className="truncate">{group.name}</span>
            {mineLabel && <MineBadge label={mineLabel} />}
          </p>
          <p className="text-xs text-muted-foreground">
            {group.children > 0 && <>{group.children} {childLabel} · </>}
            {group.schools} sekolah
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="font-semibold tabular-nums text-primary">
          {formatNumber(group.points)}
        </span>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </button>
  );
}

/** Agregasi standings jadi leaderboard wilayah (provinsi atau kabupaten). */
function groupBy(
  rows: RoundStanding[],
  keyOf: (r: RoundStanding) => string,
  nameOf: (r: RoundStanding) => string,
  childKeyOf?: (r: RoundStanding) => string,
): DrillGroup[] {
  const map = new Map<string, DrillGroup & { childSet: Set<string> }>();
  for (const r of rows) {
    const key = keyOf(r);
    const g =
      map.get(key) ??
      ({ key, name: nameOf(r), points: 0, schools: 0, children: 0, childSet: new Set() } as DrillGroup & {
        childSet: Set<string>;
      });
    g.points += r.points;
    g.schools += 1;
    if (childKeyOf) g.childSet.add(childKeyOf(r));
    map.set(key, g);
  }
  return Array.from(map.values())
    .map(({ childSet, ...g }) => ({ ...g, children: childSet.size }))
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));
}

/**
 * Header kolom di atas daftar leaderboard — menjelaskan angka di kanan
 * adalah total poin.
 */
function ListHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
      <span className="pl-8">{label}</span>
      <span className="pr-6">Total Poin</span>
    </div>
  );
}

/** Leaderboard siswa satu sekolah (level terdalam drill-down). */
function StudentBoard({ schoolId }: { schoolId: string }) {
  const { data: participants, isLoading } = useParticipants(schoolId);
  const list = (participants ?? []).filter((p) => p.status === "active");

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (list.length === 0) {
    return <EmptyState title="Belum ada peserta aktif di sekolah ini" />;
  }
  return (
    <div className="space-y-2">
      <ListHeader label="Siswa" />
      {list.map((p, i) => (
        <Link
          key={p.id}
          href={`/peserta/${p.id}`}
          className="flex items-center justify-between gap-3 rounded-xl border p-3 text-sm transition-colors hover:border-primary/40 hover:bg-primary/5"
        >
          <div className="flex min-w-0 items-center gap-3">
            <span
              className={cn(
                "w-7 shrink-0 text-center text-sm font-bold tabular-nums",
                rankTone(i),
              )}
            >
              {i + 1}
            </span>
            {p.photo_url ? (
              <Image
                src={p.photo_url}
                alt=""
                width={36}
                height={36}
                className="h-9 w-9 shrink-0 rounded-full object-cover"
                unoptimized
              />
            ) : (
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                  {p.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            )}
            <p className="truncate font-semibold">{p.name}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="font-semibold tabular-nums text-primary">
              {formatNumber(p.total_points)}
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </Link>
      ))}
    </div>
  );
}

type Crumb = { key: string; name: string };

export default function PublicRoundsPage() {
  const { data: rounds, isLoading } = usePublicRounds();
  const [selected, setSelected] = React.useState<string>("");

  // Drill-down: nasional → provinsi → kabupaten → sekolah → siswa.
  const [province, setProvince] = React.useState<Crumb | null>(null);
  const [region, setRegion] = React.useState<Crumb | null>(null);
  const [school, setSchool] = React.useState<Crumb | null>(null);

  // Default: round aktif, kalau tidak ada → yang terbaru.
  React.useEffect(() => {
    if (!selected && rounds && rounds.length > 0) {
      const active = rounds.find((r) => r.status === "active");
      setSelected((active ?? rounds[0]).id);
    }
  }, [rounds, selected]);

  const round = rounds?.find((r) => r.id === selected);
  const { data: results, isLoading: loadingResults } = useRoundResults(selected);
  const { data: me } = useMyProfile();

  const provKey = (r: RoundStanding) => r.province_id ?? "none";
  const regKey = (r: RoundStanding) => r.region_id ?? "none";

  // Wilayah si voter (untuk highlight "Provinsimu/Kabupatenmu/Sekolahmu").
  // Provinsi tak ada di profil — diturunkan dari baris standings sekolah /
  // kabupaten yang cocok.
  const mine = React.useMemo(() => {
    const rows = results ?? [];
    const row =
      (me?.school_id && rows.find((r) => r.school_id === me.school_id)) ||
      (me?.region_id && rows.find((r) => r.region_id === me.region_id)) ||
      null;
    return {
      schoolId: me?.school_id ?? null,
      regionKey: row ? regKey(row) : null,
      provinceKey: row ? provKey(row) : null,
    };
  }, [results, me?.school_id, me?.region_id]);

  // Level nasional: leaderboard provinsi.
  const provinces = React.useMemo(
    () =>
      groupBy(results ?? [], provKey, (r) => r.province_name, regKey),
    [results],
  );

  // Level provinsi: leaderboard kabupaten dalam provinsi terpilih.
  const regencies = React.useMemo(() => {
    if (!province) return [];
    return groupBy(
      (results ?? []).filter((r) => provKey(r) === province.key),
      regKey,
      (r) => r.region_name,
    );
  }, [results, province]);

  // Level kabupaten: leaderboard sekolah dalam kabupaten terpilih.
  const schools = React.useMemo(() => {
    if (!region) return [];
    return [...(results ?? [])]
      .filter(
        (r) =>
          regKey(r) === region.key &&
          (!province || provKey(r) === province.key),
      )
      .sort((a, b) => b.points - a.points || a.school_name.localeCompare(b.school_name));
  }, [results, region, province]);

  function selectRound(id: string) {
    setSelected(id);
    setProvince(null);
    setRegion(null);
    setSchool(null);
  }

  function back() {
    if (school) return setSchool(null);
    if (region) return setRegion(null);
    if (province) return setProvince(null);
  }

  const crumbs: { label: string; onClick?: () => void }[] = [
    {
      label: "Nasional",
      onClick: () => {
        setProvince(null);
        setRegion(null);
        setSchool(null);
      },
    },
    ...(province
      ? [
          {
            label: province.name,
            onClick: () => {
              setRegion(null);
              setSchool(null);
            },
          },
        ]
      : []),
    ...(region ? [{ label: region.name, onClick: () => setSchool(null) }] : []),
    ...(school ? [{ label: school.name }] : []),
  ];

  const levelHint = school
    ? "Leaderboard siswa sekolah ini. Klik siswa untuk mendukung."
    : region
      ? "Leaderboard sekolah di kabupaten/kota ini. Klik sekolah untuk lihat siswanya."
      : province
        ? "Leaderboard kabupaten/kota di provinsi ini. Klik untuk lihat sekolahnya."
        : "Leaderboard provinsi se-nasional. Klik provinsi untuk menjelajah ke bawah.";

  return (
    <div className="min-h-screen">
      <MaintenanceOverlay />
      <EventClosedOverlay />
      <Navbar />

      <main className="container max-w-3xl space-y-6 py-8">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Flag className="h-6 w-6 text-primary" />
            Klasemen
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Adu voting dari tingkat nasional sampai siswa: provinsi → kabupaten
            → sekolah → siswa.
          </p>
        </div>

        {isLoading ? (
          <LoadingState />
        ) : !rounds || rounds.length === 0 ? (
          <EmptyState
            title="Klasemen belum tersedia"
            description="Nantikan pengumuman dari panitia."
          />
        ) : (
          <>
            {/* Pemilih gelombang */}
            <div className="flex flex-wrap gap-2">
              {rounds.map((r) => (
                <button
                  key={r.id}
                  onClick={() => selectRound(r.id)}
                  className={cn(
                    "cursor-pointer rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                    selected === r.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "hover:bg-muted",
                  )}
                >
                  {r.name}
                  {r.status === "active" && (
                    <span className="ml-1.5 inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-400 align-middle" />
                  )}
                </button>
              ))}
            </div>

            {round?.status === "active" && (
              <div className="rounded-xl border border-primary/25 bg-primary/5 p-3 text-center text-sm font-medium text-primary">
                Voting masih berlangsung - klasemen live, hasil bisa berubah.
                Terus dukung sekolahmu!
              </div>
            )}

            {/* Breadcrumb drill-down */}
            <Card>
              <CardContent className="space-y-4 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  {(province || region || school) && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2"
                      onClick={back}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Kembali
                    </Button>
                  )}
                  <nav className="flex flex-wrap items-center gap-1 text-sm">
                    {crumbs.map((c, i) => {
                      const last = i === crumbs.length - 1;
                      return (
                        <React.Fragment key={`${c.label}-${i}`}>
                          {i > 0 && (
                            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                          {last || !c.onClick ? (
                            <span className="font-semibold">{c.label}</span>
                          ) : (
                            <button
                              onClick={c.onClick}
                              className="cursor-pointer text-muted-foreground hover:text-primary hover:underline"
                            >
                              {c.label}
                            </button>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </nav>
                </div>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  {school ? (
                    <Users className="h-3.5 w-3.5" />
                  ) : region ? (
                    <SchoolIcon className="h-3.5 w-3.5" />
                  ) : (
                    <MapPin className="h-3.5 w-3.5" />
                  )}
                  {levelHint}
                </p>

                {loadingResults ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (results ?? []).length === 0 ? (
                  <EmptyState title="Belum ada sekolah di klasemen ini" />
                ) : school ? (
                  /* Level 4: siswa */
                  <StudentBoard schoolId={school.key} />
                ) : region ? (
                  /* Level 3: sekolah */
                  <div className="space-y-2">
                    <ListHeader label="Sekolah" />
                    {schools.map((row, i) => (
                      <button
                        key={row.school_id}
                        onClick={() =>
                          setSchool({ key: row.school_id, name: row.school_name })
                        }
                        className={cn(
                          "flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border p-3 text-left text-sm transition-colors hover:border-primary/40 hover:bg-primary/5",
                          row.status === "lolos" &&
                            "border-emerald-500/40 bg-emerald-500/5",
                          row.status === "gugur" && "opacity-60",
                          row.school_id === mine.schoolId &&
                            "border-primary/50 bg-primary/5 ring-1 ring-inset ring-primary/30",
                        )}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span
                            className={cn(
                              "w-7 shrink-0 text-center text-sm font-bold tabular-nums",
                              rankTone(i),
                            )}
                          >
                            {i + 1}
                          </span>
                          <span className="truncate font-semibold">
                            {row.school_name}
                          </span>
                          {row.school_id === mine.schoolId && (
                            <MineBadge label="Sekolahmu" />
                          )}
                          {row.status === "lolos" && (
                            <Badge variant="success">Lolos</Badge>
                          )}
                          {row.status === "gugur" && (
                            <Badge variant="secondary">Gugur</Badge>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="font-semibold tabular-nums text-primary">
                            {formatNumber(row.points)}
                          </span>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </button>
                    ))}
                  </div>
                ) : province ? (
                  /* Level 2: kabupaten */
                  <div className="space-y-2">
                    <ListHeader label="Kabupaten/Kota" />
                    {regencies.map((g, i) => (
                      <GroupRow
                        key={g.key}
                        rank={i + 1}
                        group={g}
                        childLabel="kabupaten"
                        mineLabel={
                          g.key === mine.regionKey ? "Kabupatenmu" : undefined
                        }
                        onClick={() => setRegion({ key: g.key, name: g.name })}
                      />
                    ))}
                  </div>
                ) : (
                  /* Level 1: provinsi (nasional) */
                  <div className="space-y-2">
                    <ListHeader label="Provinsi" />
                    {provinces.map((g, i) => (
                      <GroupRow
                        key={g.key}
                        rank={i + 1}
                        group={g}
                        childLabel="kabupaten"
                        mineLabel={
                          g.key === mine.provinceKey ? "Provinsimu" : undefined
                        }
                        onClick={() => setProvince({ key: g.key, name: g.name })}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {!school && !region && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Trophy className="h-3.5 w-3.5 text-accent" />
                Poin wilayah = jumlah poin seluruh sekolah peserta di wilayah
                itu (termasuk poin bawaan dari babak sebelumnya).
              </p>
            )}
          </>
        )}
      </main>
    </div>
  );
}
