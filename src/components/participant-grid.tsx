"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronRight, Globe2, MapPin, School as SchoolIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CardSkeletonGrid, EmptyState, ErrorState } from "@/components/states";
import { useMyProfile, useParticipants } from "@/lib/queries";
import { formatNumber } from "@/lib/utils";

const PAGE_SIZE = 20;

type Scope = "school" | "region" | "all";

export function ParticipantGrid() {
  const { data, isLoading, isError, refetch } = useParticipants();
  const { data: me } = useMyProfile();
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [scope, setScope] = React.useState<Scope>("all");

  // Filter lingkup muncul selama akun login punya identitas sekolah/daerah —
  // baik voter yang sudah onboarding maupun peserta (email cocok record
  // peserta → school_id/region_id terisi dari /me walau belum onboarding).
  const voterReady = !!me && (!!me.school_id || !!me.region_id);
  React.useEffect(() => {
    if (voterReady && me?.school_id) setScope("school");
  }, [voterReady, me?.school_id]);

  React.useEffect(() => setPage(1), [search, scope]);

  if (isLoading) return <CardSkeletonGrid />;
  if (isError) return <ErrorState onRetry={() => refetch()} />;

  const active = (data ?? [])
    .filter((p) => p.status === "active")
    .sort((a, b) => a.name.localeCompare(b.name, "id"));

  // Filter lingkup (sekolahku / kabupatenku / semua) untuk voter login.
  const scoped =
    !voterReady || scope === "all"
      ? active
      : active.filter((p) => {
          const sc = p.schools;
          if (scope === "school") return !!sc?.id && sc.id === me?.school_id;
          return !!sc?.region_id && sc.region_id === me?.region_id;
        });

  const q = search.trim().toLowerCase();
  const list = q
    ? scoped.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.schools?.name?.toLowerCase().includes(q)
      )
    : scoped;

  if (active.length === 0)
    return (
      <EmptyState
        title="Belum ada peserta"
        description="Peserta akan tampil setelah ditambahkan panitia."
      />
    );

  const pageCount = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const paged = list.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const SCOPES: { key: Scope; label: string; icon: React.ElementType }[] = [
    { key: "school", label: "Sekolahku", icon: SchoolIcon },
    { key: "region", label: "Kabupatenku", icon: MapPin },
    { key: "all", label: "Semua", icon: Globe2 },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Cari peserta atau sekolah..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:max-w-sm"
        />
        {voterReady && (
          <div className="flex rounded-xl border p-1 text-sm font-medium">
            {SCOPES.map((sc) => {
              const Icon = sc.icon;
              return (
                <button
                  key={sc.key}
                  onClick={() => setScope(sc.key)}
                  className={cn(
                    "flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 transition-colors",
                    scope === sc.key
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {sc.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
      {list.length === 0 ? (
        <EmptyState
          title={
            q
              ? "Tidak ada peserta cocok pencarian"
              : scope === "school"
                ? "Belum ada peserta dari sekolahmu"
                : scope === "region"
                  ? "Belum ada peserta dari kabupatenmu"
                  : "Belum ada peserta"
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {paged.map((p) => (
            <Link key={p.id} href={`/peserta/${p.id}`} className="group">
              <Card className="card-lift h-full overflow-hidden rounded-2xl border-border/60">
                <div className="relative aspect-square w-full overflow-hidden bg-muted">
                  {p.photo_url ? (
                    <>
                      <Image
                        src={p.photo_url}
                        alt={p.name}
                        fill
                        sizes="(max-width:768px) 50vw, (max-width:1280px) 25vw, 20vw"
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/30 to-transparent" />
                    </>
                  ) : (
                    <div className="flex h-full items-center justify-center bg-muted">
                      <Avatar className="h-14 w-14 ring-2 ring-primary/20">
                        <AvatarFallback className="bg-primary/10 font-semibold text-primary">
                          {p.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  )}
                  <span className="absolute right-2 top-2 rounded-full border border-white/30 bg-black/45 px-2.5 py-0.5 text-xs font-bold text-white backdrop-blur-sm">
                    {formatNumber(p.total_points)} poin
                  </span>
                </div>
                <CardContent className="p-3">
                  <p className="truncate text-sm font-semibold">{p.name}</p>
                  <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                    <SchoolIcon className="h-3 w-3 shrink-0" />
                    <span className="truncate">{p.schools?.name ?? "-"}</span>
                  </p>
                  <div className="mt-2 flex items-center justify-end text-xs font-semibold text-primary">
                    Dukung
                    <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {list.length > PAGE_SIZE && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={current <= 1}
            onClick={() => setPage(current - 1)}
          >
            Sebelumnya
          </Button>
          <span className="text-sm text-muted-foreground">
            Hal {current} / {pageCount}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={current >= pageCount}
            onClick={() => setPage(current + 1)}
          >
            Berikutnya
          </Button>
        </div>
      )}
    </div>
  );
}
