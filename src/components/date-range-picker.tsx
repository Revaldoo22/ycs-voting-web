"use client";

import * as React from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type DateRange = { from: string; to: string }; // YYYY-MM-DD

const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
const DOW = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

const iso = (d: Date) => {
  const x = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return x.toISOString().slice(0, 10);
};
const parse = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const fmt = (s: string) => {
  if (!s) return "";
  const d = parse(s);
  return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)} ${String(
    d.getFullYear(),
  ).slice(2)}`;
};

/** Grid 6 minggu (Senin awal) untuk bulan tertentu. */
function monthGrid(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const startDow = (first.getDay() + 6) % 7; // Senin = 0
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function DateRangePicker({
  value,
  onChange,
}: {
  value: DateRange | null;
  onChange: (r: DateRange | null) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [view, setView] = React.useState(() => {
    const base = value?.to ? parse(value.to) : new Date();
    return { y: base.getFullYear(), m: base.getMonth() };
  });
  // Pilihan sementara (belum di-apply).
  const [pick, setPick] = React.useState<{ from?: string; to?: string }>({});
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const label = value?.from
    ? `${fmt(value.from)} – ${fmt(value.to)}`
    : "Lifetime";

  function apply(r: DateRange | null) {
    onChange(r);
    setPick({});
    setOpen(false);
  }

  function clickDay(d: Date) {
    const s = iso(d);
    if (!pick.from || (pick.from && pick.to)) {
      setPick({ from: s });
    } else {
      // urutkan
      const [a, b] = [pick.from, s].sort();
      apply({ from: a, to: b });
    }
  }

  const grid = monthGrid(view.y, view.m);
  const inHover = (s: string) =>
    pick.from && !pick.to ? s === pick.from : false;
  const inRange = (s: string) =>
    value?.from ? s >= value.from && s <= value.to : false;

  const presets: { label: string; range: () => DateRange | null }[] = [
    {
      label: "Minggu ini",
      range: () => {
        const now = new Date();
        const dow = (now.getDay() + 6) % 7;
        const start = new Date(now);
        start.setDate(now.getDate() - dow);
        return { from: iso(start), to: iso(now) };
      },
    },
    {
      label: "Minggu lalu",
      range: () => {
        const now = new Date();
        const dow = (now.getDay() + 6) % 7;
        const end = new Date(now);
        end.setDate(now.getDate() - dow - 1);
        const start = new Date(end);
        start.setDate(end.getDate() - 6);
        return { from: iso(start), to: iso(end) };
      },
    },
    {
      label: "Bulan ini",
      range: () => {
        const now = new Date();
        return {
          from: iso(new Date(now.getFullYear(), now.getMonth(), 1)),
          to: iso(now),
        };
      },
    },
    {
      label: "Bulan lalu",
      range: () => {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const end = new Date(now.getFullYear(), now.getMonth(), 0);
        return { from: iso(start), to: iso(end) };
      },
    },
    { label: "Lifetime", range: () => null },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-10 items-center gap-2 rounded-xl border bg-background px-3 text-sm font-medium hover:bg-muted/40"
      >
        {label}
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 flex gap-4 rounded-2xl border bg-popover p-4 shadow-lg">
          {/* Preset kiri */}
          <div className="flex w-32 shrink-0 flex-col gap-0.5 text-sm">
            {presets.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => apply(p.range())}
                className="rounded-lg px-3 py-2 text-left transition-colors hover:bg-muted"
              >
                {p.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => apply(null)}
              className="mt-2 rounded-lg px-3 py-2 text-left font-medium text-primary hover:bg-primary/5"
            >
              Reset
            </button>
          </div>

          {/* Kalender kanan */}
          <div className="w-64">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold">
                {MONTHS[view.m]} {view.y}
              </span>
              <div className="flex gap-1">
                <button
                  type="button"
                  className="rounded p-1 hover:bg-muted"
                  onClick={() =>
                    setView((v) =>
                      v.m === 0
                        ? { y: v.y - 1, m: 11 }
                        : { y: v.y, m: v.m - 1 },
                    )
                  }
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="rounded p-1 hover:bg-muted"
                  onClick={() =>
                    setView((v) =>
                      v.m === 11
                        ? { y: v.y + 1, m: 0 }
                        : { y: v.y, m: v.m + 1 },
                    )
                  }
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-0.5 text-center text-xs text-muted-foreground">
              {DOW.map((d) => (
                <span key={d} className="py-1">
                  {d}
                </span>
              ))}
              {grid.map((d, i) => {
                if (!d) return <span key={i} />;
                const s = iso(d);
                const selected = s === pick.from || s === value?.from || s === value?.to;
                const ranged = inRange(s) || inHover(s);
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => clickDay(d)}
                    className={cn(
                      "aspect-square rounded-md text-sm transition-colors",
                      selected
                        ? "bg-primary font-semibold text-primary-foreground"
                        : ranged
                          ? "bg-primary/10"
                          : "hover:bg-muted",
                    )}
                  >
                    {d.getDate()}
                  </button>
                );
              })}
            </div>
            {pick.from && !pick.to && (
              <p className="mt-2 text-xs text-muted-foreground">
                Pilih tanggal akhir…
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
