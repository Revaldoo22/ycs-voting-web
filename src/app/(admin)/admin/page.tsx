"use client";

import * as React from "react";
import {
  BarChart3,
  Filter,
  Flame,
  GraduationCap,
  MapPin,
  Medal,
  School,
  Target,
  ThumbsUp,
  Ticket,
  TrendingUp,
  Trophy,
  Users,
  Zap,
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
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  tone: Tone;
  /** Rincian kecil di bawah angka, mis. berapa disetujui vs ditolak. */
  detail?: React.ReactNode;
}) {
  const t = TONES[tone];
  return (
    <Card className="card-lift relative overflow-hidden">
      <CardContent className="relative flex items-center gap-3.5 p-5">
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
            t.chip,
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-muted-foreground">
            {label}
          </p>
          <p className="text-2xl font-extrabold tabular-nums tracking-tight">
            {value}
          </p>
          {detail && (
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
              {detail}
            </p>
          )}
        </div>
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
      desc: "wizard selesai (peserta bisa vote tanpa ini)",
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
            Corong Akun
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Angkanya tidak dijumlahkan. Peserta dari web pendaftaran bisa vote
            tanpa onboarding, jadi tahap pernah vote bisa melebihi tahap di
            atasnya.
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
  const { data: growth } = useVoterGrowth(range);
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard
            icon={School}
            label="Total Sekolah"
            value={formatNumber(stats?.total_schools)}
            tone="sky"
          />
          <StatCard
            icon={GraduationCap}
            label="Peserta Aktif"
            value={formatNumber(stats?.active_participants)}
            tone="indigo"
            detail={
              <>
                {formatNumber(stats?.participants_with_points)} punya poin
                {!!stats?.inactive_participants && (
                  <> &middot; {formatNumber(stats.inactive_participants)} nonaktif</>
                )}
              </>
            }
          />
          <StatCard
            icon={Users}
            label="Total Voter"
            value={formatNumber(stats?.total_voters)}
            tone="violet"
            detail={
              <>{formatNumber(stats?.onboarded_voters)} punya akun terdaftar</>
            }
          />
          <StatCard
            icon={ThumbsUp}
            label="Vote Disetujui"
            value={formatNumber(stats?.approved_votes)}
            tone="emerald"
            detail={
              <>
                {formatNumber(stats?.pending_votes)} menunggu &middot;{" "}
                {formatNumber(stats?.rejected_votes)} ditolak
              </>
            }
          />
          <StatCard
            icon={Trophy}
            label="Total Poin"
            value={formatNumber(stats?.total_points)}
            tone="amber"
            detail={
              stats?.bot_votes ? (
                <>termasuk {formatNumber(stats.bot_votes)} poin boost admin</>
              ) : undefined
            }
          />
        </div>
      )}

      {/* Rincian kelolosan & klaim kupon: angka yang sering ditanyakan
          panitia tapi tidak muat di kartu utama. */}
      {!isLoading && !isError && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={Medal}
            label="Lolos Gelombang"
            value={formatNumber(stats?.qualified_participants)}
            tone="emerald"
            detail={<>tidak termasuk Golden Buzzer</>}
          />
          <StatCard
            icon={Zap}
            label="Golden Buzzer"
            value={formatNumber(stats?.golden_buzzers)}
            tone="amber"
            detail={<>dipilih panitia, lepas dari gelombang</>}
          />
          <StatCard
            icon={Ticket}
            label="Kupon Disetujui"
            value={formatNumber(stats?.approved_claims)}
            tone="sky"
            detail={
              <>
                {formatNumber(stats?.pending_claims)} menunggu &middot;{" "}
                {formatNumber(stats?.rejected_claims)} ditolak
              </>
            }
          />
          <StatCard
            icon={School}
            label="Total Sekolah"
            value={formatNumber(stats?.total_schools)}
            tone="violet"
            detail={<>sekolah yang punya peserta</>}
          />
        </div>
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
          title="Pertumbuhan Voter"
          desc="Akumulasi voter unik per hari"
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
