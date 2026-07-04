"use client";

import dynamic from "next/dynamic";
import { Flame, Trophy } from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { MaintenanceOverlay } from "@/components/maintenance-overlay";
import { EventClosedOverlay } from "@/components/event-closed-overlay";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/states";
import { useHeatmap } from "@/lib/queries";
import { formatNumber } from "@/lib/utils";

// Leaflet menyentuh window — render client-only.
const HeatmapMap = dynamic(() => import("@/components/heatmap-map"), {
  ssr: false,
  loading: () => <LoadingState />,
});

export default function HeatmapPage() {
  const { data: rows } = useHeatmap();
  const top3 = (rows ?? []).slice(0, 3);

  return (
    <div className="min-h-screen">
      <MaintenanceOverlay />
      <EventClosedOverlay />
      <Navbar />

      <main className="container space-y-6 py-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
              <Flame className="h-6 w-6 text-primary" />
              Heatmap Jawa Tengah
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Makin pekat warnanya, makin panas persaingan votingnya. Arahkan
              kursor ke kabupaten untuk detail.
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/peringkat-sekolah">
              <Trophy className="h-4 w-4" /> Peringkat Sekolah
            </Link>
          </Button>
        </div>

        {/* Podium kabupaten */}
        {top3.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-3">
            {top3.map((r, i) => (
              <div
                key={r.region_id}
                className="flex items-center gap-3 rounded-xl border bg-card p-3"
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-extrabold ${
                    i === 0
                      ? "bg-amber-400/20 text-amber-600"
                      : i === 1
                        ? "bg-slate-300/30 text-slate-600"
                        : "bg-orange-400/20 text-orange-600"
                  }`}
                >
                  #{i + 1}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {r.region_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatNumber(r.points)} poin · {r.schools} sekolah
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        <HeatmapMap />
      </main>
    </div>
  );
}
