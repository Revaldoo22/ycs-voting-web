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
  usePublicRounds,
  useRoundResults,
  type RoundStanding,
} from "@/lib/queries";
import { cn, formatNumber } from "@/lib/utils";
import { RankMedal, podiumRowClass } from "@/components/rank-medal";
import { useTranslation } from "@/lib/i18n";

/** Node drill-down (provinsi/kabupaten), key stabil walau id null. */
type DrillGroup = {
  key: string;
  name: string;
  points: number;
  schools: number;
  /** Jumlah peserta di wilayah ini (unit yang dinilai & lolos). */
  participants: number;
  /** Jumlah sub-wilayah (kabupaten di level provinsi). */
  children: number;
};

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
  const t = useTranslation("gelombang");
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border p-3 text-left text-sm transition-colors hover:border-primary/40 hover:bg-primary/5",
        podiumRowClass(rank),
        mineLabel && "border-primary/50 bg-primary/5 ring-1 ring-inset ring-primary/30",
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <RankMedal rank={rank} />
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 truncate font-semibold">
            <span className="truncate">{group.name}</span>
            {mineLabel && <MineBadge label={mineLabel} />}
          </p>
          <p className="text-xs text-muted-foreground">
            {group.children > 0 && <>{group.children} {childLabel} · </>}
            {group.schools} {t.schools} · {group.participants} {t.participants}
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
  type Acc = DrillGroup & { childSet: Set<string>; schoolSet: Set<string> };
  const map = new Map<string, Acc>();
  for (const r of rows) {
    const key = keyOf(r);
    const g =
      map.get(key) ??
      ({
        key,
        name: nameOf(r),
        points: 0,
        schools: 0,
        participants: 0,
        children: 0,
        childSet: new Set<string>(),
        schoolSet: new Set<string>(),
      } as Acc);
    // Satu baris = satu PESERTA. Sekolah dihitung distinct karena satu
    // sekolah bisa mengirim banyak peserta.
    g.points += r.points;
    g.participants += 1;
    g.schoolSet.add(r.school_id ?? "none");
    if (childKeyOf) g.childSet.add(childKeyOf(r));
    map.set(key, g);
  }
  return Array.from(map.values())
    .map(({ childSet, schoolSet, ...g }) => ({
      ...g,
      children: childSet.size,
      schools: schoolSet.size,
    }))
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));
}

/**
 * Header kolom di atas daftar leaderboard, menjelaskan angka di kanan
 * adalah total poin.
 */
function ListHeader({ label }: { label: string }) {
  const t = useTranslation("gelombang");
  return (
    <div className="flex items-center justify-between gap-3 px-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
      <span className="pl-8">{label}</span>
      <span className="pr-6">{t.totalPoints}</span>
    </div>
  );
}

/**
 * Leaderboard peserta satu sekolah (level terdalam drill-down). Datanya dari
 * standings gelombang, jadi poin & status lolos/gugur sesuai gelombang yang
 * sedang dilihat, bukan poin global peserta.
 */
function StudentBoard({
  rows,
  /** Kuota lolos gelombang. Terisi = tarik garis batas setelah peringkat ini. */
  quota,
}: {
  rows: RoundStanding[];
  quota?: number;
}) {
  const t = useTranslation("gelombang");

  if (rows.length === 0) {
    return <EmptyState title={t.emptyActiveParticipants} />;
  }
  return (
    <div className="space-y-2">
      {!quota && <ListHeader label={t.student} />}
      {rows.map((p, i) => (
        <React.Fragment key={p.participant_id}>
          {quota != null && i === quota && (
            <div className="flex items-center gap-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              {t.cutoffLine(quota)}
              <span className="h-px flex-1 bg-border" />
            </div>
          )}
        <Link
          href={`/peserta/${p.participant_id}`}
          className={cn(
            "flex items-center justify-between gap-3 rounded-xl border p-3 text-sm transition-colors hover:border-primary/40 hover:bg-primary/5",
            p.status === "lolos" && "border-emerald-500/40 bg-emerald-500/5",
            p.status === "gugur" && "opacity-60",
            podiumRowClass(i + 1),
          )}
        >
          <div className="flex min-w-0 items-center gap-3">
            <RankMedal rank={i + 1} />
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
                  {p.participant_name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            )}
            <p className="truncate font-semibold">{p.participant_name}</p>
            {p.status === "lolos" && <Badge variant="success">{t.passed}</Badge>}
            {p.status === "gugur" && (
              <Badge variant="secondary">{t.eliminated}</Badge>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="font-semibold tabular-nums text-primary">
              {formatNumber(p.points)}
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </Link>
        </React.Fragment>
      ))}
    </div>
  );
}

type Crumb = { key: string; name: string };

export default function PublicRoundsPage() {
  const t = useTranslation("gelombang");
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

  // Tab utama: "top" = daftar peserta terbaik langsung (yang menentukan
  // lolos), "wilayah" = jelajah provinsi → kabupaten → sekolah → siswa.
  const [tab, setTab] = React.useState<"top" | "wilayah">("top");

  const provKey = (r: RoundStanding) => r.province_id ?? "none";
  const regKey = (r: RoundStanding) => r.region_id ?? "none";

  // Peringkat peserta se-Indonesia. Inilah yang dipakai menentukan lolos:
  // top_n peserta teratas, tanpa dipecah per sekolah/kabupaten.
  const topPeserta = React.useMemo(
    () =>
      [...(results ?? [])].sort(
        (a, b) =>
          b.points - a.points ||
          a.participant_name.localeCompare(b.participant_name),
      ),
    [results],
  );

  // Wilayah si voter (untuk highlight "Provinsimu/Kabupatenmu/Sekolahmu").
  // Provinsi tak ada di profil, diturunkan dari baris standings sekolah /
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

  // Level kabupaten: leaderboard SEKOLAH dalam kabupaten terpilih. Baris
  // standings adalah peserta, jadi digabung dulu per sekolah. Poin sekolah =
  // jumlah poin pesertanya; sekolah dianggap "lolos" bila punya minimal satu
  // peserta yang lolos.
  const schools = React.useMemo(() => {
    if (!region) return [];
    const rows = (results ?? []).filter(
      (r) =>
        regKey(r) === region.key && (!province || provKey(r) === province.key),
    );
    const map = new Map<
      string,
      {
        school_id: string | null;
        school_name: string;
        points: number;
        participants: number;
        lolos: number;
      }
    >();
    for (const r of rows) {
      const key = r.school_id ?? "none";
      const g =
        map.get(key) ??
        {
          school_id: r.school_id,
          school_name: r.school_name,
          points: 0,
          participants: 0,
          lolos: 0,
        };
      g.points += r.points;
      g.participants += 1;
      if (r.status === "lolos") g.lolos += 1;
      map.set(key, g);
    }
    return Array.from(map.values()).sort(
      (a, b) =>
        b.points - a.points || a.school_name.localeCompare(b.school_name),
    );
  }, [results, region, province]);

  // Level sekolah: peserta sekolah terpilih, diambil dari standings gelombang
  // ini (bukan poin global) agar status lolos/gugur ikut tampil.
  const students = React.useMemo(() => {
    if (!school) return [];
    return (results ?? [])
      .filter((r) => (r.school_id ?? "none") === school.key)
      .sort(
        (a, b) =>
          b.points - a.points ||
          a.participant_name.localeCompare(b.participant_name),
      );
  }, [results, school]);

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
      label: t.national,
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
    ? t.levelHintStudent
    : region
      ? t.levelHintSchool
      : province
        ? t.levelHintRegency
        : t.levelHintProvince;

  return (
    <div className="min-h-screen">
      <MaintenanceOverlay />
      <EventClosedOverlay />
      <Navbar />

      <main className="container max-w-3xl space-y-6 py-8">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Flag className="h-6 w-6 text-primary" />
            {t.title}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{t.subtitle}</p>
        </div>

        {isLoading ? (
          <LoadingState />
        ) : !rounds || rounds.length === 0 ? (
          <EmptyState title={t.emptyTitle} description={t.emptyDescription} />
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
                {t.votingLive}
              </div>
            )}

            {/* Tab: peringkat peserta (utama) vs jelajah wilayah */}
            <div className="inline-flex w-full rounded-xl border bg-muted/40 p-0.5 text-sm sm:w-fit">
              {(
                [
                  ["top", t.tabTopParticipants],
                  ["wilayah", t.tabByRegion],
                ] as const
              ).map(([v, label]) => (
                <button
                  key={v}
                  onClick={() => setTab(v)}
                  className={cn(
                    "flex-1 cursor-pointer rounded-lg px-4 py-1.5 font-medium transition-colors sm:flex-none",
                    tab === v
                      ? "bg-background text-foreground shadow-sm ring-1 ring-inset ring-border/60"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {tab === "top" ? (
              <Card>
                <CardContent className="space-y-4 p-4">
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Trophy className="h-3.5 w-3.5 text-accent" />
                    {round?.top_n
                      ? t.topHint(round.top_n)
                      : t.topHintNoQuota}
                  </p>
                  {loadingResults ? (
                    <div className="flex justify-center py-10">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : topPeserta.length === 0 ? (
                    <EmptyState title={t.emptySchoolsInBoard} />
                  ) : (
                    <StudentBoard rows={topPeserta} quota={round?.top_n} />
                  )}
                </CardContent>
              </Card>
            ) : (
            /* Breadcrumb drill-down */
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
                      {t.back}
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
                  <EmptyState title={t.emptySchoolsInBoard} />
                ) : school ? (
                  /* Level 4: peserta */
                  <StudentBoard rows={students} />
                ) : region ? (
                  /* Level 3: sekolah */
                  <div className="space-y-2">
                    <ListHeader label={t.school} />
                    {schools.map((row, i) => (
                      <button
                        key={row.school_id ?? "none"}
                        onClick={() =>
                          setSchool({
                            key: row.school_id ?? "none",
                            name: row.school_name,
                          })
                        }
                        className={cn(
                          "flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border p-3 text-left text-sm transition-colors hover:border-primary/40 hover:bg-primary/5",
                          row.lolos > 0 &&
                            "border-emerald-500/40 bg-emerald-500/5",
                          podiumRowClass(i + 1),
                          row.school_id === mine.schoolId &&
                            "border-primary/50 bg-primary/5 ring-1 ring-inset ring-primary/30",
                        )}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <RankMedal rank={i + 1} />
                          <div className="min-w-0">
                            <p className="flex items-center gap-1.5 truncate font-semibold">
                              <span className="truncate">{row.school_name}</span>
                              {row.school_id === mine.schoolId && (
                                <MineBadge label={t.yourSchool} />
                              )}
                              {row.lolos > 0 && (
                                <Badge variant="success">
                                  {row.lolos} {t.passed}
                                </Badge>
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {row.participants} {t.participants}
                            </p>
                          </div>
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
                    <ListHeader label={t.regency} />
                    {regencies.map((g, i) => (
                      <GroupRow
                        key={g.key}
                        rank={i + 1}
                        group={g}
                        childLabel={t.regencyChildLabel}
                        mineLabel={
                          g.key === mine.regionKey ? t.yourRegency : undefined
                        }
                        onClick={() => setRegion({ key: g.key, name: g.name })}
                      />
                    ))}
                  </div>
                ) : (
                  /* Level 1: provinsi (nasional) */
                  <div className="space-y-2">
                    <ListHeader label={t.province} />
                    {provinces.map((g, i) => (
                      <GroupRow
                        key={g.key}
                        rank={i + 1}
                        group={g}
                        childLabel={t.regencyChildLabel}
                        mineLabel={
                          g.key === mine.provinceKey ? t.yourProvince : undefined
                        }
                        onClick={() => setProvince({ key: g.key, name: g.name })}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            )}

            {tab === "wilayah" && !school && !region && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Trophy className="h-3.5 w-3.5 text-accent" />
                {t.regionPointsNote}
              </p>
            )}
          </>
        )}
      </main>
    </div>
  );
}
