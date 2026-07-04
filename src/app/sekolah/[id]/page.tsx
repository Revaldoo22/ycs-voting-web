"use client";

import * as React from "react";
import { use } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  ChevronRight,
  MapPin,
  School as SchoolIcon,
  Trophy,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/navbar";
import { MaintenanceOverlay } from "@/components/maintenance-overlay";
import { EventClosedOverlay } from "@/components/event-closed-overlay";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { api } from "@/lib/api-client";
import { useParticipants } from "@/lib/queries";
import { formatNumber } from "@/lib/utils";

type SchoolDetail = {
  school_id: string;
  school_name: string;
  region_id: string | null;
  region_name: string;
  points: number;
  global_rank: number;
  global_total: number;
  region_rank: number;
  region_total: number;
};

export default function SchoolPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const {
    data: school,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["school-detail", id],
    queryFn: () => api<SchoolDetail | null>(`/api/public/schools/${id}/detail`),
  });
  const { data: participants, isLoading: loadingP } = useParticipants(id);

  const active = (participants ?? [])
    .filter((p) => p.status === "active")
    .sort((a, b) => b.total_points - a.total_points);

  return (
    <div className="min-h-screen">
      <MaintenanceOverlay />
      <EventClosedOverlay />
      <Navbar />

      <main className="container max-w-3xl space-y-6 py-8">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/peringkat-sekolah">
            <ArrowLeft className="h-4 w-4" /> Kembali ke Peringkat
          </Link>
        </Button>

        {isLoading ? (
          <LoadingState />
        ) : isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : !school ? (
          <EmptyState title="Sekolah tidak ditemukan" />
        ) : (
          <>
            {/* Header sekolah */}
            <Card>
              <CardContent className="space-y-4 p-6">
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <SchoolIcon className="h-6 w-6" />
                  </span>
                  <div className="min-w-0">
                    <h1 className="truncate text-xl font-bold">
                      {school.school_name}
                    </h1>
                    <p className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" /> {school.region_name}
                    </p>
                  </div>
                  <span className="ml-auto shrink-0 text-right">
                    <span className="block text-2xl font-extrabold tabular-nums text-primary">
                      {formatNumber(school.points)}
                    </span>
                    <span className="text-xs text-muted-foreground">poin</span>
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg border bg-muted/30 p-3 text-center">
                    <p className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" /> {school.region_name}
                    </p>
                    <p className="text-xl font-extrabold tabular-nums">
                      #{school.region_rank}
                      <span className="text-xs font-medium text-muted-foreground">
                        /{school.region_total}
                      </span>
                    </p>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-3 text-center">
                    <p className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                      <Trophy className="h-3.5 w-3.5" /> Nasional
                    </p>
                    <p className="text-xl font-extrabold tabular-nums">
                      #{school.global_rank}
                      <span className="text-xs font-medium text-muted-foreground">
                        /{school.global_total}
                      </span>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Peserta */}
            <section>
              <h2 className="mb-3 text-lg font-semibold">
                Peserta ({active.length})
              </h2>
              {loadingP ? (
                <LoadingState />
              ) : active.length === 0 ? (
                <EmptyState title="Belum ada peserta aktif" />
              ) : (
                <div className="space-y-1.5">
                  {active.map((p, i) => (
                    <Link
                      key={p.id}
                      href={`/peserta/${p.id}`}
                      className="group flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors hover:border-primary/40 hover:bg-primary/[0.03]"
                    >
                      <span className="w-6 shrink-0 text-center text-sm font-bold text-muted-foreground">
                        {i + 1}
                      </span>
                      <Avatar className="h-10 w-10 shrink-0">
                        {p.photo_url ? (
                          <Image
                            src={p.photo_url}
                            alt={p.name}
                            width={40}
                            height={40}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                            {p.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">
                          {p.name}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {formatNumber(p.total_points)} poin
                        </p>
                      </div>
                      <span className="flex shrink-0 items-center gap-0.5 text-xs font-semibold text-primary">
                        Dukung
                        <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
