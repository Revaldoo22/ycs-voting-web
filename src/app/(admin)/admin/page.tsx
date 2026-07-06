"use client";

import * as React from "react";
import {
  BarChart3,
  Flame,
  GraduationCap,
  MapPin,
  School,
  Target,
  ThumbsUp,
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
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  tone: Tone;
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
            label="Total Peserta"
            value={formatNumber(stats?.total_participants)}
            tone="indigo"
          />
          <StatCard
            icon={Users}
            label="Total Voter"
            value={formatNumber(stats?.total_voters)}
            tone="violet"
          />
          <StatCard
            icon={ThumbsUp}
            label="Total Vote"
            value={formatNumber(stats?.total_votes)}
            tone="emerald"
          />
          <StatCard
            icon={Trophy}
            label="Total Poin"
            value={formatNumber(stats?.total_points)}
            tone="amber"
          />
        </div>
      )}

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
