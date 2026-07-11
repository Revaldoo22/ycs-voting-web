"use client";

import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useLeaderboard } from "@/lib/queries";
import { formatNumber, cn } from "@/lib/utils";
import { CardSkeletonGrid, EmptyState, ErrorState } from "@/components/states";
import { PhotoLightbox } from "@/components/photo-lightbox";
import { RankMedal, podiumRowClass } from "@/components/rank-medal";

export function Leaderboard({ limit = 50 }: { limit?: number }) {
  const { data, isLoading, isError, refetch } = useLeaderboard(limit);
  // Foto yang sedang di-zoom (pop-up, latar blur).
  const [zoom, setZoom] = React.useState<{ src: string; alt: string } | null>(
    null,
  );

  if (isLoading) return <CardSkeletonGrid count={3} />;
  if (isError) return <ErrorState onRetry={() => refetch()} />;
  if (!data || data.length === 0)
    return (
      <EmptyState
        title="Belum ada peserta"
        description="Leaderboard akan tampil saat peserta sudah ditambahkan."
      />
    );

  return (
    <>
      <ol className="space-y-2">
        {data.map((p, i) => {
          const rank = i + 1;
          return (
            <li
              key={p.id}
              className={cn(
                "flex items-center gap-3 rounded-xl border bg-card p-3 shadow-sm transition-colors",
                podiumRowClass(rank)
              )}
            >
              <div className="flex w-8 shrink-0 items-center justify-center">
                <RankMedal rank={rank} />
              </div>
              <button
                type="button"
                onClick={() =>
                  p.photo_url && setZoom({ src: p.photo_url, alt: p.name })
                }
                className={cn("shrink-0", p.photo_url && "cursor-zoom-in")}
                aria-label={
                  p.photo_url ? `Perbesar foto ${p.name}` : undefined
                }
              >
                <Avatar className="h-11 w-11 border">
                  {p.photo_url && <AvatarImage src={p.photo_url} alt={p.name} />}
                  <AvatarFallback>{p.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{p.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {p.schools?.name ?? "-"}
                </p>
              </div>
              <Badge variant={rank <= 3 ? "accent" : "secondary"} className="shrink-0">
                {formatNumber(p.total_points)} poin
              </Badge>
            </li>
          );
        })}
      </ol>

      {zoom && (
        <PhotoLightbox
          src={zoom.src}
          alt={zoom.alt}
          open
          onClose={() => setZoom(null)}
        />
      )}
    </>
  );
}
