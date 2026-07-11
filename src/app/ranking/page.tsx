"use client";

import * as React from "react";
import { GraduationCap, School as SchoolIcon, Trophy } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { MaintenanceOverlay } from "@/components/maintenance-overlay";
import { EventClosedOverlay } from "@/components/event-closed-overlay";
import { Leaderboard } from "@/components/leaderboard";
import { SchoolRankings } from "@/components/school-rankings";
import { cn } from "@/lib/utils";

type Tab = "peserta" | "sekolah";

/** Ranking peserta & sekolah dalam satu halaman (tab). */
export default function RankingPage() {
  // Tab awal dari ?tab= (link lama /peringkat-sekolah diarahkan ke sini).
  const [tab, setTab] = React.useState<Tab>(() => {
    if (typeof window === "undefined") return "peserta";
    return new URLSearchParams(window.location.search).get("tab") === "sekolah"
      ? "sekolah"
      : "peserta";
  });

  // Simpan tab di URL agar bisa dibagikan / bertahan saat back.
  React.useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    if (tab === "sekolah") sp.set("tab", "sekolah");
    else sp.delete("tab");
    const qs = sp.toString();
    window.history.replaceState(
      window.history.state,
      "",
      qs ? `?${qs}` : window.location.pathname,
    );
  }, [tab]);

  const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: "peserta", label: "Peserta", icon: GraduationCap },
    { key: "sekolah", label: "Sekolah", icon: SchoolIcon },
  ];

  return (
    <div className="min-h-screen">
      <MaintenanceOverlay />
      <EventClosedOverlay />
      <Navbar />

      <main className="container max-w-3xl space-y-6 py-8">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Trophy className="h-6 w-6 text-primary" />
            Ranking
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Peringkat peserta dan sekolah, diperbarui realtime mengikuti
            dukungan yang masuk.
          </p>
        </div>

        {/* Pilih peserta / sekolah */}
        <div className="flex rounded-xl border p-1 text-sm font-medium">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  "flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-3 py-2 transition-colors",
                  tab === t.key
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            );
          })}
        </div>

        {tab === "peserta" ? <Leaderboard limit={100} /> : <SchoolRankings />}
      </main>
    </div>
  );
}
