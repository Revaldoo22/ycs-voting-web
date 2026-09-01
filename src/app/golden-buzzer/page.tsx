"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { Loader2, Zap } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { MaintenanceOverlay } from "@/components/maintenance-overlay";
import { EventClosedOverlay } from "@/components/event-closed-overlay";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { EmptyState } from "@/components/states";
import { usePublicGoldenBuzzers, type GoldenBuzzer } from "@/lib/queries";
import { cn } from "@/lib/utils";
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

      {/* Hero */}
      <section className="relative overflow-hidden border-b bg-gradient-to-b from-amber-50 to-background dark:from-amber-500/10">
        <span
          aria-hidden
          className="pointer-events-none absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-amber-400/30 blur-3xl"
        />
        <div className="container relative max-w-5xl py-10 text-center sm:py-14">
          <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-yellow-300 shadow-lg shadow-amber-400/50">
            <Zap className="h-8 w-8 text-white" />
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            {t.title}
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
            {t.subtitle}
          </p>
          {list.length > 0 && (
            <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-amber-500 px-4 py-1.5 text-xs font-bold text-white shadow-sm">
              <Zap className="h-3.5 w-3.5" />
              {t.count(list.length)}
            </p>
          )}
        </div>
      </section>

      <main className="container max-w-5xl space-y-6 py-8">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : list.length === 0 ? (
          <EmptyState title={t.emptyTitle} description={t.emptyDescription} />
        ) : (
          <>
            {/* Sorotan: satu Golden Buzzer tampil besar sendiri, lebih dari
                itu ditata jadi grid supaya tak memanjang ke bawah. */}
            <div
              className={cn(
                "grid gap-4",
                list.length === 1
                  ? "mx-auto max-w-md"
                  : "sm:grid-cols-2 lg:grid-cols-3",
              )}
            >
              {list.map((g) => (
                <BuzzerCard key={g.id} g={g} label={t.badge} />
              ))}
            </div>

            <div className="mx-auto max-w-2xl space-y-1 rounded-xl border border-amber-400/30 bg-amber-500/10 p-4 text-center">
              <p className="text-base font-bold text-amber-700 dark:text-amber-400">
                {t.congrats}
              </p>
              <p className="text-sm text-muted-foreground">{t.note}</p>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function BuzzerCard({ g, label }: { g: GoldenBuzzer; label: string }) {
  return (
    <Link href={`/peserta/${g.id}`} className="group">
      <Card className="card-lift relative h-full overflow-hidden border-2 border-amber-400/70 bg-gradient-to-b from-amber-50 to-background text-center transition-shadow hover:shadow-lg dark:from-amber-500/10">
        <span
          aria-hidden
          className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-amber-400/25 blur-2xl"
        />
        <CardContent className="relative space-y-3 p-6">
          <div className="relative mx-auto w-fit">
            {g.photo_url ? (
              <Image
                src={g.photo_url}
                alt=""
                width={112}
                height={112}
                className="h-28 w-28 rounded-full object-cover ring-4 ring-amber-400/70"
                unoptimized
              />
            ) : (
              <Avatar className="h-28 w-28 ring-4 ring-amber-400/70">
                <AvatarFallback className="bg-amber-500/15 text-2xl font-bold text-amber-700">
                  {g.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            )}
            <span className="absolute -bottom-1 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 px-3 py-0.5 text-[11px] font-extrabold text-amber-950 shadow-sm">
              <Zap className="h-3 w-3" />
              {label}
            </span>
          </div>

          <div className="pt-1">
            <p className="truncate text-lg font-bold">{g.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {g.school_name}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {g.region_name}
            </p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
