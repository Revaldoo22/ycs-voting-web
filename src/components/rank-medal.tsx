import { Crown, Medal, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Medali peringkat: top 3 dapat lencana gold/silver/bronze bergradasi
 * dengan ring dan glow; sisanya angka biasa. Dipakai di klasemen
 * (provinsi/kabupaten/sekolah/siswa) dan ranking sekolah.
 */
const MEDALS = [
  {
    icon: Crown,
    badge:
      "bg-gradient-to-br from-yellow-200 via-amber-400 to-yellow-600 text-amber-950 ring-2 ring-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.65)]",
  },
  {
    icon: Medal,
    badge:
      "bg-gradient-to-br from-slate-100 via-slate-300 to-slate-500 text-slate-800 ring-2 ring-slate-300 shadow-[0_0_10px_rgba(148,163,184,0.6)]",
  },
  {
    icon: Trophy,
    badge:
      "bg-gradient-to-br from-orange-200 via-orange-400 to-amber-700 text-orange-950 ring-2 ring-orange-300 shadow-[0_0_10px_rgba(251,146,60,0.6)]",
  },
];

/** Aksen baris untuk top 3 — border dan gradasi latar mewah tapi halus. */
export const PODIUM_ROW = [
  "border-amber-400/70 bg-gradient-to-r from-amber-400/15 via-amber-300/5 to-transparent",
  "border-slate-400/70 bg-gradient-to-r from-slate-300/20 via-slate-200/5 to-transparent",
  "border-orange-400/70 bg-gradient-to-r from-orange-400/15 via-orange-300/5 to-transparent",
];

export function podiumRowClass(rank: number): string | undefined {
  return rank >= 1 && rank <= 3 ? PODIUM_ROW[rank - 1] : undefined;
}

export function RankMedal({ rank }: { rank: number }) {
  if (rank >= 1 && rank <= 3) {
    const m = MEDALS[rank - 1];
    const Icon = m.icon;
    return (
      <span
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
          m.badge,
        )}
        aria-label={`Peringkat ${rank}`}
        title={`Peringkat ${rank}`}
      >
        <Icon className="h-4 w-4" />
      </span>
    );
  }
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center text-sm font-bold tabular-nums text-muted-foreground">
      {rank}
    </span>
  );
}
