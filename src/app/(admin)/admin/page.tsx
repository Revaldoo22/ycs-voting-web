"use client";

import * as React from "react";
import {
  BarChart3,
  Filter,
  Flame,
  GraduationCap,
  HelpCircle,
  MapPin,
  Medal,
  School,
  Target,
  ThumbsUp,
  Ticket,
  TrendingUp,
  Trophy,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DailyVotesChart,
  IntentPieChart,
  RegionBarChart,
  TopParticipantsChart,
  VoterGrowthChart,
} from "@/components/charts";
import { LoadingState, ErrorState, EmptyState } from "@/components/states";
import {
  useAdminStats,
  useDailyVoteSeries,
  useLeaderboard,
  usePmbInsight,
  useVoterGrowth,
  type SeriesRange,
} from "@/lib/queries";
import type { AdminStats } from "@/types/database";
import { formatNumber } from "@/lib/utils";
import { EventToggle } from "@/components/event-toggle";
import { RegionHeatmap } from "@/components/region-heatmap";
import {
  DateRangePicker,
  type DateRange,
} from "@/components/date-range-picker";
import { cn } from "@/lib/utils";

type Tone = "indigo" | "violet" | "sky" | "emerald" | "amber";

const TONES: Record<Tone, { chip: string }> = {
  indigo: { chip: "bg-indigo-500/12 text-indigo-600 dark:text-indigo-400" },
  violet: { chip: "bg-violet-500/12 text-violet-600 dark:text-violet-400" },
  sky: { chip: "bg-sky-500/12 text-sky-600 dark:text-sky-400" },
  emerald: { chip: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400" },
  amber: { chip: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
};

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
  detail,
  hint,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  tone: Tone;
  /** Rincian kecil di bawah angka, mis. berapa disetujui vs ditolak. */
  detail?: React.ReactNode;
  /** Penjelasan lengkap saat kursor menyentuh kartu, untuk angka yang
   *  definisinya tak terbaca dari labelnya saja. */
  hint?: string;
}) {
  const t = TONES[tone];
  return (
    <Card className="card-lift relative overflow-hidden" title={hint}>
      <CardContent className="relative flex items-start gap-3.5 p-5">
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
            t.chip,
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          {/* Ikon tanya menandai ada penjelasan di tooltip; tanpa penanda,
              tooltip tak akan pernah ditemukan orang. */}
          <p className="flex items-center gap-1 truncate text-xs font-medium text-muted-foreground">
            {label}
            {hint && <HelpCircle className="h-3 w-3 shrink-0 opacity-60" />}
          </p>
          <p className="text-2xl font-extrabold tabular-nums tracking-tight">
            {value}
          </p>
          {detail && (
            <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
              {detail}
            </p>
          )}

        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Panel angka bertingkat: satu total besar, lalu pecahannya sebagai bar
 * proporsional + daftar rincian.
 *
 * Dipakai untuk data yang punya status (vote, klaim kupon) di mana kartu
 * ringkas tidak cukup: judul kartu jadi ambigu ("Vote Disetujui" tapi
 * angkanya total?) dan rinciannya terpotong karena ruang sempit.
 */
function BreakdownCard({
  icon: Icon,
  title,
  desc,
  total,
  parts,
  footer,
}: {
  icon: React.ElementType;
  title: string;
  desc?: string;
  total: number;
  parts: { label: string; value: number; bar: string; text: string }[];
  /** Catatan di bawah rincian, mis. tindak lanjut setelah penolakan. */
  footer?: React.ReactNode;
}) {
  const pct = (n: number) => (total > 0 ? (n / total) * 100 : 0);

  return (
    <Card className="card-lift">
      <CardContent className="space-y-4 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-2 font-bold tracking-tight">
              <Icon className="h-4 w-4 text-primary" />
              {title}
            </p>
            {desc && (
              <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>
            )}
          </div>
          <p className="shrink-0 text-3xl font-extrabold tabular-nums tracking-tight">
            {formatNumber(total)}
          </p>
        </div>

        {/* Bar proporsional: sekali lihat tahu perbandingannya */}
        <div className="flex h-2.5 overflow-hidden rounded-full bg-muted">
          {parts.map((p) => (
            <div
              key={p.label}
              className={cn("h-full first:rounded-l-full last:rounded-r-full", p.bar)}
              style={{ width: `${pct(p.value)}%` }}
              title={`${p.label}: ${formatNumber(p.value)}`}
            />
          ))}
        </div>

        <div className="space-y-1.5">
          {parts.map((p) => (
            <div
              key={p.label}
              className="flex items-center justify-between gap-3 text-sm"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", p.bar)} />
                <span className="truncate text-muted-foreground">{p.label}</span>
              </span>
              <span className="shrink-0 tabular-nums">
                <span className={cn("font-bold", p.text)}>
                  {formatNumber(p.value)}
                </span>
                <span className="ml-1.5 text-xs text-muted-foreground">
                  {Math.round(pct(p.value))}%
                </span>
              </span>
            </div>
          ))}
        </div>

        {footer && (
          <div className="border-t pt-3 text-xs leading-snug text-muted-foreground">
            {footer}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Corong akun: dari punya akun sampai benar-benar vote. Tiap tahap adalah
 * himpunan bagian dari tahap sebelumnya, jadi ditampilkan sebagai bar yang
 * mengecil, bukan kartu terpisah yang mengesankan angka berdiri sendiri.
 *
 * Baris "berhenti di sini" memakai warna redup supaya panitia langsung
 * melihat di tahap mana orang paling banyak tersaring.
 */
function FunnelCard({ stats }: { stats?: AdminStats }) {
  const total = stats?.accounts_total ?? 0;
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

  const steps = [
    {
      label: "Punya akun",
      value: stats?.accounts_total ?? 0,
      desc: "login Google atau nomor WA",
      bar: "bg-violet-500",
    },
    {
      label: "Selesai onboarding",
      value: stats?.accounts_onboarded ?? 0,
      desc: "data diri lengkap, siap vote",
      bar: "bg-sky-500",
    },
    {
      label: "Pernah vote",
      value: stats?.accounts_voted ?? 0,
      desc: "benar-benar memberi dukungan",
      bar: "bg-emerald-500",
    },
  ];

  const drops = [
    {
      label: "Belum onboarding",
      value: stats?.accounts_not_onboarded ?? 0,
      desc: "punya akun tapi wizard belum selesai",
    },
    {
      label: "Onboarding tapi belum vote",
      value: stats?.accounts_onboarded_no_vote ?? 0,
      desc: "sudah siap, tinggal diajak vote",
    },
  ];

  return (
    <Card className="card-lift">
      <CardContent className="space-y-5 p-5 sm:p-6">
        <div>
          <p className="flex items-center gap-2 font-bold tracking-tight">
            <Filter className="h-4 w-4 text-primary" />
            Corong Voter
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Hanya voter murni, di luar akun peserta. Tiap tahap bagian dari
            tahap sebelumnya, jadi angkanya tidak dijumlahkan.
          </p>
        </div>

        <div className="space-y-3">
          {steps.map((s) => (
            <div key={s.label}>
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-medium">{s.label}</p>
                <p className="shrink-0 text-sm font-bold tabular-nums">
                  {formatNumber(s.value)}
                  <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                    {pct(s.value)}%
                  </span>
                </p>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn("h-full rounded-full transition-all", s.bar)}
                  style={{ width: `${Math.max(pct(s.value), 1)}%` }}
                />
              </div>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {s.desc}
              </p>
            </div>
          ))}
        </div>

        <div className="space-y-2 border-t pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Berhenti di tengah jalan
          </p>
          {drops.map((d) => (
            <div
              key={d.label}
              className="flex items-start justify-between gap-3 rounded-lg bg-muted/40 px-3 py-2"
            >
              <span className="min-w-0">
                <span className="block text-sm font-medium">{d.label}</span>
                <span className="block text-[11px] text-muted-foreground">
                  {d.desc}
                </span>
              </span>
              <span className="shrink-0 text-sm font-bold tabular-nums text-amber-600">
                {formatNumber(d.value)}
              </span>
            </div>
          ))}
          {!!stats?.voters_without_account && (
            <div className="flex items-start justify-between gap-3 rounded-lg bg-muted/40 px-3 py-2">
              <span className="min-w-0">
                <span className="block text-sm font-medium">
                  Vote tanpa akun
                </span>
                <span className="block text-[11px] text-muted-foreground">
                  nomor yang vote tapi tak punya akun terdaftar
                </span>
              </span>
              <span className="shrink-0 text-sm font-bold tabular-nums text-muted-foreground">
                {formatNumber(stats.voters_without_account)}
              </span>
            </div>
          )}
        </div>

        {/* Peserta di luar corong: mereka juga bisa mendukung peserta lain,
            tapi bukan pendukung dari luar jadi tak dicampur. */}
        <div className="space-y-2 border-t pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Di luar corong: akun peserta
          </p>
          <div className="flex items-start justify-between gap-3 rounded-lg border border-indigo-500/25 bg-indigo-500/5 px-3 py-2">
            <span className="min-w-0">
              <span className="block text-sm font-medium">
                Peserta yang ikut mendukung
              </span>
              <span className="block text-[11px] text-muted-foreground">
                dari {formatNumber(stats?.participant_accounts)} akun peserta
              </span>
            </span>
            <span className="shrink-0 text-sm font-bold tabular-nums text-indigo-600">
              {formatNumber(stats?.participant_accounts_voted)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ChartCard({
  icon: Icon,
  title,
  desc,
  className,
  children,
}: {
  icon: React.ElementType;
  title: string;
  desc: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2.5 text-base">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </span>
          <span>
            {title}
            <span className="block text-xs font-normal text-muted-foreground">
              {desc}
            </span>
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export default function AdminDashboard() {
  // null = Lifetime; else custom range dari picker.
  const [dateRange, setDateRange] = React.useState<DateRange | null>(null);
  const range: SeriesRange = dateRange
    ? { from: dateRange.from, to: dateRange.to }
    : { lifetime: true };

  const { data: stats, isLoading, isError, refetch } = useAdminStats();
  const { data: votes } = useDailyVoteSeries(range);
  // Grafik akun vs voter sengaja dikunci 7 hari terakhir, tidak mengikuti
  // picker: rentang lifetime membuat tanggalnya terlalu rapat untuk dibaca,
  // sementara yang ingin dilihat di sini justru aktivitas beberapa hari
  // terakhir.
  const { data: growth } = useVoterGrowth({ days: 7 });
  const { data: top } = useLeaderboard(8);
  const { data: pmb } = usePmbInsight();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Dashboard Admin
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Ringkasan event.
          </p>
        </div>
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      <EventToggle />

      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <>
          {/* Angka tunggal: cukup satu baris, tak perlu rincian */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={School}
              label="Total Sekolah"
              value={formatNumber(stats?.total_schools)}
              tone="sky"
              detail={<>punya peserta terdaftar</>}
              hint="Hanya sekolah yang punya peserta aktif, bukan seluruh master sekolah."
            />
            {/* "punya akun" dulu menyesatkan: semua voter wajib login, jadi
                semuanya punya akun. Yang membedakan adalah sudah mengisi
                wizard atau belum. Peserta yang mendukung peserta lain boleh
                melewati wizard, jadi mereka masuk selisihnya. */}
            <StatCard
              icon={Users}
              label="Total Voter"
              value={formatNumber(stats?.total_voters)}
              tone="violet"
              detail={
                <>
                  {formatNumber(stats?.onboarded_voters)} isi data lengkap
                  {typeof stats?.total_voters === "number" &&
                  typeof stats?.onboarded_voters === "number" &&
                  stats.total_voters > stats.onboarded_voters ? (
                    <>
                      ,{" "}
                      {formatNumber(
                        stats.total_voters - stats.onboarded_voters,
                      )}{" "}
                      peserta
                    </>
                  ) : null}
                </>
              }
              hint="Orang yang pernah vote atau mengerjakan quest, dihitung per nomor WA. Semua wajib login. Peserta yang mendukung peserta lain boleh melewati wizard, jadi masuk hitungan tanpa data lengkap."
            />
            <StatCard
              icon={ThumbsUp}
              label="Vote Sah"
              value={formatNumber(stats?.approved_votes)}
              tone="emerald"
              detail={<>sudah menyumbang poin</>}
              hint="Vote yang bukti follow-nya sudah disetujui admin. Yang menunggu review belum dihitung."
            />
            <StatCard
              icon={Trophy}
              label="Total Poin"
              value={formatNumber(stats?.total_points)}
              tone="amber"
              detail={
                stats?.bot_votes ? (
                  <>termasuk {formatNumber(stats.bot_votes)} dari boost</>
                ) : (
                  <>dari vote & quest</>
                )
              }
              hint="Akumulasi poin seluruh peserta aktif, dari vote disetujui dan quest."
            />
          </div>

          {/* Angka bertingkat: total + pecahan per status */}
          <div className="grid gap-4 lg:grid-cols-2">
            <BreakdownCard
              icon={ThumbsUp}
              title="Vote Masuk"
              desc="Status verifikasi bukti follow"
              total={
                (stats?.approved_votes ?? 0) +
                (stats?.pending_votes ?? 0) +
                (stats?.rejected_votes ?? 0)
              }
              parts={[
                {
                  label: "Disetujui",
                  value: stats?.approved_votes ?? 0,
                  bar: "bg-emerald-500",
                  text: "text-emerald-600",
                },
                {
                  label: "Menunggu review",
                  value: stats?.pending_votes ?? 0,
                  bar: "bg-amber-500",
                  text: "text-amber-600",
                },
                {
                  label: "Ditolak",
                  value: stats?.rejected_votes ?? 0,
                  bar: "bg-red-500",
                  text: "text-red-600",
                },
              ]}
              footer={
                /* Angka ditolak saja tak bisa membedakan voter yang
                   benar-benar hilang dari yang sekadar mengulang. */
                /* Hanya tampil kalau datanya benar-benar ada. Backend lama
                   tak mengirim kolom ini, dan "0 orang" di kedua sisi lebih
                   menyesatkan daripada tak ada catatan sama sekali. */
                stats?.rejected_votes &&
                (stats.recovered_voters ?? 0) + (stats.lost_voters ?? 0) > 0 ? (
                  <>
                    Dari yang ditolak,{" "}
                    <b className="text-emerald-600">
                      {formatNumber(stats.recovered_voters)} orang
                    </b>{" "}
                    mengajukan ulang dan akhirnya disetujui,{" "}
                    <b className="text-red-600">
                      {formatNumber(stats.lost_voters)} orang
                    </b>{" "}
                    tidak kembali.
                  </>
                ) : null
              }
            />
            <BreakdownCard
              icon={Ticket}
              title="Klaim Kupon"
              desc="Status verifikasi bukti follow IG/TikTok"
              total={
                (stats?.approved_claims ?? 0) +
                (stats?.pending_claims ?? 0) +
                (stats?.rejected_claims ?? 0)
              }
              parts={[
                {
                  label: "Disetujui",
                  value: stats?.approved_claims ?? 0,
                  bar: "bg-emerald-500",
                  text: "text-emerald-600",
                },
                {
                  label: "Menunggu review",
                  value: stats?.pending_claims ?? 0,
                  bar: "bg-amber-500",
                  text: "text-amber-600",
                },
                {
                  label: "Ditolak",
                  value: stats?.rejected_claims ?? 0,
                  bar: "bg-red-500",
                  text: "text-red-600",
                },
              ]}
            />
          </div>

          {/* Peserta: status keikutsertaan & jalur lolos */}
          <div className="grid gap-4 lg:grid-cols-2">
            <BreakdownCard
              icon={GraduationCap}
              title="Peserta"
              desc="Status keikutsertaan"
              total={stats?.total_participants ?? 0}
              parts={[
                {
                  label: "Aktif, sudah punya poin",
                  value: stats?.participants_with_points ?? 0,
                  bar: "bg-indigo-500",
                  text: "text-indigo-600",
                },
                {
                  label: "Aktif, belum punya poin",
                  value: Math.max(
                    0,
                    (stats?.active_participants ?? 0) -
                      (stats?.participants_with_points ?? 0),
                  ),
                  bar: "bg-slate-400",
                  text: "text-slate-600",
                },
                {
                  label: "Nonaktif",
                  value: stats?.inactive_participants ?? 0,
                  bar: "bg-red-400",
                  text: "text-red-600",
                },
              ]}
            />
            <BreakdownCard
              icon={Medal}
              title="Sudah Lolos"
              desc="Berhenti berkompetisi, tak menerima vote lagi"
              total={
                (stats?.qualified_participants ?? 0) +
                (stats?.golden_buzzers ?? 0)
              }
              parts={[
                {
                  label: "Lolos gelombang",
                  value: stats?.qualified_participants ?? 0,
                  bar: "bg-emerald-500",
                  text: "text-emerald-600",
                },
                {
                  label: "Golden Buzzer",
                  value: stats?.golden_buzzers ?? 0,
                  bar: "bg-amber-500",
                  text: "text-amber-600",
                },
              ]}
            />
          </div>
        </>
      )}

      {!isLoading && !isError && <FunnelCard stats={stats} />}

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard
          icon={BarChart3}
          title="Vote Harian"
          desc="Jumlah vote masuk per hari"
        >
          {votes && votes.length > 0 ? (
            <DailyVotesChart data={votes} />
          ) : (
            <EmptyState title="Belum ada data vote" />
          )}
        </ChartCard>

        <ChartCard
          icon={TrendingUp}
          title="Akun vs Voter Aktif"
          desc="Akun voter baru dibanding yang benar-benar vote, 7 hari terakhir"
        >
          {growth && growth.length > 0 ? (
            <VoterGrowthChart data={growth} />
          ) : (
            <EmptyState title="Belum ada data voter" />
          )}
        </ChartCard>

        <ChartCard
          icon={Target}
          title="Niat Kuliah Voter"
          desc={`Insight PMB dari ${pmb?.total ?? 0} voter ber-akun`}
        >
          {pmb && pmb.intent.length > 0 ? (
            <IntentPieChart data={pmb.intent} />
          ) : (
            <EmptyState title="Belum ada data" />
          )}
        </ChartCard>

        <ChartCard
          icon={MapPin}
          title="Voter per Kabupaten"
          desc="Sebaran asal voter ber-akun (top 12)"
        >
          {pmb && pmb.regions.length > 0 ? (
            <RegionBarChart data={pmb.regions} />
          ) : (
            <EmptyState title="Belum ada data" />
          )}
        </ChartCard>

        <ChartCard
          icon={Flame}
          title="Sebaran Daerah"
          desc="Persaingan poin antar kabupaten (Jawa Tengah)"
          className="lg:col-span-2"
        >
          <RegionHeatmap compact />
        </ChartCard>

        <ChartCard
          icon={Trophy}
          title="Peserta Teratas"
          desc="8 peserta dengan poin tertinggi"
          className="lg:col-span-2"
        >
          {top && top.length > 0 ? (
            <TopParticipantsChart
              data={top.map((p) => ({
                name: p.name,
                total_points: p.total_points,
              }))}
            />
          ) : (
            <EmptyState title="Belum ada peserta" />
          )}
        </ChartCard>
      </div>
    </div>
  );
}
