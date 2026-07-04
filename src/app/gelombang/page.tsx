"use client";

import * as React from "react";
import { Flag, Loader2, Trophy } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { MaintenanceOverlay } from "@/components/maintenance-overlay";
import { EventClosedOverlay } from "@/components/event-closed-overlay";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState, LoadingState } from "@/components/states";
import {
  usePublicRounds,
  useRoundResults,
  type RoundStanding,
} from "@/lib/queries";
import { cn, formatNumber } from "@/lib/utils";

export default function PublicRoundsPage() {
  const { data: rounds, isLoading } = usePublicRounds();
  const [selected, setSelected] = React.useState<string>("");

  // Default: round aktif, kalau tidak ada → yang terbaru.
  React.useEffect(() => {
    if (!selected && rounds && rounds.length > 0) {
      const active = rounds.find((r) => r.status === "active");
      setSelected((active ?? rounds[0]).id);
    }
  }, [rounds, selected]);

  const round = rounds?.find((r) => r.id === selected);
  const { data: results, isLoading: loadingResults } = useRoundResults(selected);

  // Kelompokkan per kabupaten.
  const groups = React.useMemo(() => {
    const map = new Map<string, RoundStanding[]>();
    for (const row of results ?? []) {
      const arr = map.get(row.region_name) ?? [];
      arr.push(row);
      map.set(row.region_name, arr);
    }
    return Array.from(map.entries());
  }, [results]);

  return (
    <div className="min-h-screen">
      <MaintenanceOverlay />
      <EventClosedOverlay />
      <Navbar />

      <main className="container space-y-6 py-8">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Flag className="h-6 w-6 text-primary" />
            Hasil Gelombang
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Adu voting antar sekolah per kabupaten. Sekolah teratas lolos ke
            gelombang berikutnya.
          </p>
        </div>

        {isLoading ? (
          <LoadingState />
        ) : !rounds || rounds.length === 0 ? (
          <EmptyState
            title="Belum ada gelombang"
            description="Nantikan pengumuman dari panitia."
          />
        ) : (
          <>
            {/* Pemilih gelombang */}
            <div className="flex flex-wrap gap-2">
              {rounds.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setSelected(r.id)}
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
                Gelombang ini masih berlangsung - klasemen live, hasil bisa
                berubah. Terus dukung sekolahmu!
              </div>
            )}

            {loadingResults ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : groups.length === 0 ? (
              <EmptyState title="Belum ada sekolah di gelombang ini" />
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {groups.map(([region, rows]) => (
                  <Card key={region}>
                    <CardContent className="space-y-2 p-4">
                      <p className="flex items-center gap-2 font-semibold">
                        <Trophy className="h-4 w-4 text-accent" />
                        {region}
                      </p>
                      <div className="space-y-1.5">
                        {rows.map((row, i) => (
                          <div
                            key={row.school_id}
                            className={cn(
                              "flex items-center justify-between gap-2 rounded-lg border p-2.5 text-sm",
                              row.status === "lolos" &&
                                "border-emerald-500/40 bg-emerald-500/5",
                              row.status === "gugur" && "opacity-60",
                            )}
                          >
                            <div className="flex min-w-0 items-center gap-2">
                              <span className="w-6 shrink-0 text-center text-xs font-bold text-muted-foreground">
                                {i + 1}
                              </span>
                              <span className="truncate font-medium">
                                {row.school_name}
                              </span>
                              {row.status === "lolos" && (
                                <Badge variant="success">Lolos</Badge>
                              )}
                              {row.status === "gugur" && (
                                <Badge variant="secondary">Gugur</Badge>
                              )}
                            </div>
                            <span className="shrink-0 font-semibold tabular-nums text-primary">
                              {formatNumber(row.points)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
