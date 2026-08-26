"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronRight, Loader2, Medal } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { MaintenanceOverlay } from "@/components/maintenance-overlay";
import { EventClosedOverlay } from "@/components/event-closed-overlay";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/states";
import { usePublicQualified, type QualifiedParticipant } from "@/lib/queries";
import { cn, formatNumber } from "@/lib/utils";
import { RankMedal, podiumRowClass } from "@/components/rank-medal";
import { useTranslation } from "@/lib/i18n";

export default function PublicQualifiedPage() {
  const t = useTranslation("lolos");
  const { data, isLoading } = usePublicQualified();
  // Dibungkus useMemo: `data ?? []` bikin array baru tiap render, sehingga
  // memo di bawahnya ikut dihitung ulang terus.
  const rows = React.useMemo(() => data ?? [], [data]);
  const [q, setQ] = React.useState("");
  const [round, setRound] = React.useState<string>("");

  // Gelombang yang sudah punya peserta lolos, jadi tab pemilih.
  const rounds = React.useMemo(() => {
    const seen = new Map<string, { id: string; name: string }>();
    for (const r of rows) seen.set(r.round_id, { id: r.round_id, name: r.round_name });
    return Array.from(seen.values());
  }, [rows]);

  // Default: gelombang pertama yang punya hasil.
  React.useEffect(() => {
    if (!round && rounds.length > 0) setRound(rounds[0].id);
  }, [rounds, round]);

  const shown = React.useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (!round || r.round_id === round) &&
        (!needle ||
          r.participant_name.toLowerCase().includes(needle) ||
          r.school_name.toLowerCase().includes(needle)),
    );
  }, [rows, round, q]);

  return (
    <div className="min-h-screen">
      <MaintenanceOverlay />
      <EventClosedOverlay />
      <Navbar />

      <main className="container max-w-3xl space-y-6 py-8">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Medal className="h-6 w-6 text-amber-500" />
            {t.title}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{t.subtitle}</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState title={t.emptyTitle} description={t.emptyDescription} />
        ) : (
          <>
            {/* Pemilih gelombang */}
            <div className="flex flex-wrap gap-2">
              {rounds.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setRound(r.id)}
                  className={cn(
                    "cursor-pointer rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                    round === r.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "hover:bg-muted",
                  )}
                >
                  {r.name}
                </button>
              ))}
            </div>

            <Card>
              <CardContent className="space-y-4 p-4">
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={t.searchPlaceholder}
                />
                {shown.length === 0 ? (
                  <EmptyState title={t.emptySearch} />
                ) : (
                  <div className="space-y-2">
                    <p className="px-1 text-xs text-muted-foreground">
                      {t.count(shown.length)}
                    </p>
                    {shown.map((p, i) => (
                      <QualifiedRow key={p.participant_id} p={p} rank={i + 1} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}

function QualifiedRow({
  p,
  rank,
}: {
  p: QualifiedParticipant;
  rank: number;
}) {
  return (
    <Link
      href={`/peserta/${p.participant_id}`}
      className={cn(
        "flex items-center justify-between gap-3 rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-3 text-sm transition-colors hover:border-primary/40 hover:bg-primary/5",
        podiumRowClass(rank),
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <RankMedal rank={rank} />
        {p.photo_url ? (
          <Image
            src={p.photo_url}
            alt=""
            width={36}
            height={36}
            className="h-9 w-9 shrink-0 rounded-full object-cover"
            unoptimized
          />
        ) : (
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
              {p.participant_name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        )}
        <div className="min-w-0">
          <p className="truncate font-semibold">{p.participant_name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {p.school_name} &middot; {p.region_name}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="font-semibold tabular-nums text-primary">
          {formatNumber(p.points)}
        </span>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </Link>
  );
}
