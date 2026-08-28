"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronRight, Loader2, Zap } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { MaintenanceOverlay } from "@/components/maintenance-overlay";
import { EventClosedOverlay } from "@/components/event-closed-overlay";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { EmptyState } from "@/components/states";
import { usePublicGoldenBuzzers, type GoldenBuzzer } from "@/lib/queries";
import { formatNumber } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

export default function PublicGoldenBuzzerPage() {
  const t = useTranslation("goldenBuzzer");
  const { data, isLoading } = usePublicGoldenBuzzers();
  const list = React.useMemo(() => data ?? [], [data]);

  return (
    <div className="min-h-screen">
      <MaintenanceOverlay />
      <EventClosedOverlay />
      <Navbar />

      <main className="container max-w-3xl space-y-6 py-8">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Zap className="h-6 w-6 text-amber-500" />
            {t.title}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{t.subtitle}</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : list.length === 0 ? (
          <EmptyState title={t.emptyTitle} description={t.emptyDescription} />
        ) : (
          <>
            <p className="text-xs text-muted-foreground">{t.count(list.length)}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {list.map((g) => (
                <BuzzerCard key={g.id} g={g} label={t.badge} />
              ))}
            </div>
            <p className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-center text-sm font-medium text-amber-700 dark:text-amber-400">
              {t.note}
            </p>
          </>
        )}
      </main>
    </div>
  );
}

function BuzzerCard({ g, label }: { g: GoldenBuzzer; label: string }) {
  return (
    <Link href={`/peserta/${g.id}`} className="group">
      <Card className="card-lift h-full border-amber-400/60 bg-amber-50/40 dark:bg-amber-500/5">
        <CardContent className="flex items-center gap-3 p-4">
          {g.photo_url ? (
            <Image
              src={g.photo_url}
              alt=""
              width={56}
              height={56}
              className="h-14 w-14 shrink-0 rounded-full object-cover ring-2 ring-amber-400/60"
              unoptimized
            />
          ) : (
            <Avatar className="h-14 w-14 shrink-0 ring-2 ring-amber-400/60">
              <AvatarFallback className="bg-amber-500/15 font-semibold text-amber-700">
                {g.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          )}
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 truncate font-semibold">
              <span className="truncate">{g.name}</span>
              <Badge variant="warning" className="shrink-0">
                <Zap className="h-3 w-3" />
                {label}
              </Badge>
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {g.school_name} &middot; {g.region_name}
            </p>
            <p className="mt-0.5 text-xs font-semibold text-amber-700 dark:text-amber-500">
              {formatNumber(g.total_points)} poin
            </p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" />
        </CardContent>
      </Card>
    </Link>
  );
}
