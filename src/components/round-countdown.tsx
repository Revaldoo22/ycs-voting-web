"use client";

import * as React from "react";
import Link from "next/link";
import { Flag, Timer } from "lucide-react";
import { useActiveRound } from "@/lib/queries";

function pad(n: number) {
  return String(Math.max(0, n)).padStart(2, "0");
}

/** Banner gelombang aktif + hitung mundur ke ends_at (bila dijadwalkan). */
export function RoundCountdown() {
  const { data: round } = useActiveRound();
  const [now, setNow] = React.useState(() => Date.now());

  React.useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!round) return null;

  const end = round.ends_at ? new Date(round.ends_at).getTime() : null;
  const left = end ? end - now : null;
  const over = left !== null && left <= 0;

  const d = left ? Math.floor(left / 86_400_000) : 0;
  const h = left ? Math.floor((left % 86_400_000) / 3_600_000) : 0;
  const m = left ? Math.floor((left % 3_600_000) / 60_000) : 0;
  const s = left ? Math.floor((left % 60_000) / 1000) : 0;

  return (
    <Link
      href="/gelombang"
      className="mx-auto flex w-fit max-w-full cursor-pointer items-center gap-3 rounded-full border border-primary/25 bg-primary/5 py-2 pl-4 pr-5 text-sm font-medium transition-colors hover:bg-primary/10"
    >
      <Flag className="h-4 w-4 shrink-0 text-primary" />
      <span className="min-w-0 truncate">
        <strong>{round.name}</strong> sedang berlangsung
      </span>
      {left !== null &&
        (over ? (
          <span className="shrink-0 rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-bold text-destructive">
            Berakhir
          </span>
        ) : (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-xs font-bold tabular-nums text-primary-foreground">
            <Timer className="h-3 w-3" />
            {d > 0 && `${d}h `}
            {pad(h)}:{pad(m)}:{pad(s)}
          </span>
        ))}
    </Link>
  );
}
