"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid hsl(var(--border))",
  background: "hsl(var(--card))",
  color: "hsl(var(--foreground))",
  fontSize: 12,
  boxShadow: "0 4px 20px rgb(0 0 0 / 0.08)",
};

const fmtDay = (d: string) =>
  new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short" });

export function PointGrowthChart({
  data,
}: {
  data: { day: string; cumulative: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id="pts" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(192 91% 36%)" stopOpacity={0.4} />
            <stop offset="95%" stopColor="hsl(192 91% 36%)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="day" tickFormatter={fmtDay} fontSize={12} minTickGap={8} tickMargin={6} />
        <YAxis fontSize={12} allowDecimals={false} />
        <Tooltip
          contentStyle={tooltipStyle}
          labelFormatter={(l) => fmtDay(l as string)}
          formatter={(v) => [`${v} poin`, "Kumulatif"]}
        />
        <Area
          type="monotone"
          dataKey="cumulative"
          stroke="hsl(192 91% 36%)"
          fill="url(#pts)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function DailyVotesChart({
  data,
}: {
  data: { day: string; votes: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="day" tickFormatter={fmtDay} fontSize={12} minTickGap={8} tickMargin={6} />
        <YAxis fontSize={12} allowDecimals={false} />
        <Tooltip
          contentStyle={tooltipStyle}
          labelFormatter={(l) => fmtDay(l as string)}
          formatter={(v) => [`${v} vote`, "Harian"]}
        />
        <Bar dataKey="votes" fill="hsl(38 92% 50%)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/**
 * Dua garis harian: akun voter baru vs orang yang benar-benar vote hari itu.
 * Bukan akumulasi, supaya naik-turun aktivitas per hari terlihat. Jarak
 * kedua garis menunjukkan berapa akun yang mendaftar tapi tak ikut vote.
 */
export function VoterGrowthChart({
  data,
}: {
  data: { day: string; accounts: number; voters: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        {/* interval={0} memaksa SEMUA tanggal tampil. Rentangnya dikunci
            7 hari, jadi labelnya pasti muat dan tak ada hari yang
            terlewat seperti saat recharts menyeleksi sendiri. */}
        <XAxis
          dataKey="day"
          tickFormatter={fmtDay}
          fontSize={12}
          interval={0}
          tickMargin={6}
        />
        <YAxis fontSize={12} allowDecimals={false} />
        <Tooltip
          contentStyle={tooltipStyle}
          labelFormatter={(l) => fmtDay(l as string)}
          formatter={(v, name) => [
            `${v} orang`,
            name === "accounts" ? "Akun baru" : "Vote hari itu",
          ]}
        />
        <Legend
          verticalAlign="top"
          height={28}
          formatter={(v) => (v === "accounts" ? "Akun baru" : "Vote hari itu")}
          wrapperStyle={{ fontSize: 12 }}
        />
        {/* type="linear", bukan monotone: ini data harian, jadi garis
            melengkung menyiratkan ada nilai di antara tanggal padahal tidak.
            Titik ditampilkan supaya nilai tiap hari terlihat jelas. */}
        <Line
          type="linear"
          dataKey="accounts"
          stroke="hsl(192 91% 36%)"
          strokeWidth={2}
          dot={{ r: 3 }}
        />
        <Line
          type="linear"
          dataKey="voters"
          stroke="hsl(24 95% 53%)"
          strokeWidth={2}
          dot={{ r: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function TopParticipantsChart({
  data,
}: {
  data: { name: string; total_points: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 0, right: 20, left: 10, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis type="number" fontSize={12} allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="name"
          fontSize={12}
          width={110}
          tickFormatter={(n: string) => (n.length > 14 ? n.slice(0, 13) + "…" : n)}
        />
        <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v} poin`, "Total"]} />
        <Bar dataKey="total_points" fill="hsl(192 91% 36%)" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

const INTENT_META: Record<string, { label: string; color: string }> = {
  ya: { label: "Ya, mau kuliah", color: "hsl(152 69% 40%)" },
  ragu: { label: "Masih ragu", color: "hsl(38 92% 50%)" },
  tidak: { label: "Tidak", color: "hsl(0 72% 51%)" },
  belum_isi: { label: "Belum isi", color: "hsl(220 9% 65%)" },
};

export function IntentPieChart({
  data,
}: {
  data: { intent: string; count: number }[];
}) {
  const rows = data.map((d) => ({
    ...d,
    name: INTENT_META[d.intent]?.label ?? d.intent,
    color: INTENT_META[d.intent]?.color ?? "hsl(192 91% 36%)",
  }));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={rows}
          dataKey="count"
          nameKey="name"
          innerRadius={55}
          outerRadius={90}
          paddingAngle={3}
          strokeWidth={0}
          label={(e) => `${e.name ?? ""} (${(e as { count?: number }).count ?? 0})`}
          fontSize={12}
        >
          {rows.map((r, i) => (
            <Cell key={i} fill={r.color} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v} voter`, ""]} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function RegionBarChart({
  data,
}: {
  data: { region: string; count: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 0, right: 20, left: 10, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis type="number" fontSize={12} allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="region"
          fontSize={11}
          width={120}
          tickFormatter={(n: string) => (n.length > 16 ? n.slice(0, 15) + "…" : n)}
        />
        <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v} voter`, ""]} />
        <Bar dataKey="count" fill="hsl(192 91% 36%)" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
