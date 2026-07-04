"use client";

import Link from "next/link";
import { Heart, MapPin, School as SchoolIcon, Star, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useMyProfile, useMySchoolRank, useVoterToday } from "@/lib/queries";
import { formatNumber } from "@/lib/utils";

/** Peringkat sekolah si voter: global & dalam kabupaten. */
function SchoolRankCard({ enabled }: { enabled: boolean }) {
  const { data: rank } = useMySchoolRank(enabled);
  if (!rank) return null;
  return (
    <Card className="border-accent/30 bg-accent/[0.04]">
      <CardContent className="space-y-3 p-4">
        <div className="flex min-w-0 items-center gap-2">
          <SchoolIcon className="h-4 w-4 shrink-0 text-accent" />
          <p className="min-w-0 truncate text-sm font-semibold">
            {rank.school_name}
          </p>
          <span className="ml-auto shrink-0 text-xs text-muted-foreground">
            {formatNumber(rank.points)} poin
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border bg-background p-2.5 text-center">
            <p className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
              <Trophy className="h-3.5 w-3.5" /> Global
            </p>
            <p className="text-xl font-extrabold tabular-nums">
              #{rank.global_rank}
              <span className="text-xs font-medium text-muted-foreground">
                /{rank.global_total}
              </span>
            </p>
          </div>
          <div className="rounded-lg border bg-background p-2.5 text-center">
            <p className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" /> {rank.region_name}
            </p>
            <p className="text-xl font-extrabold tabular-nums">
              #{rank.region_rank}
              <span className="text-xs font-medium text-muted-foreground">
                /{rank.region_total}
              </span>
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/** Ringkasan aktivitas hari ini untuk voter login: vote masuk + kuota fav20. */
export function VoterTodayPanel() {
  const { data: me } = useMyProfile();
  const enabled = !!me && me.role === "voter" && me.onboarded;
  const { data } = useVoterToday(enabled);

  if (!enabled || !data) return null;

  const daily = data.votes.filter((v) => v.vote_kind === "daily5");

  return (
    <div className="grid gap-3 lg:grid-cols-[1fr,340px]">
    <Card className="border-primary/20 bg-primary/[0.03]">
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold">
            Aktivitas vote-mu hari ini
          </p>
          <div className="flex items-center gap-2 text-xs">
            <Badge variant="outline" className="gap-1">
              <Heart className="h-3 w-3" /> {daily.length} harian
            </Badge>
            <Badge variant="accent" className="gap-1">
              <Star className="h-3 w-3" /> Favorit {data.fav_quota.used}/
              {data.fav_quota.max}
            </Badge>
          </div>
        </div>

        {data.votes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Belum ada vote hari ini - dukung pesertamu di bawah!
          </p>
        ) : (
          <ul className="flex flex-wrap gap-1.5">
            {data.votes.map((v, i) => (
              <li key={i}>
                <Link
                  href={`/peserta/${v.participant_id}`}
                  className="inline-flex items-center gap-1 rounded-full border bg-background px-2.5 py-1 text-xs font-medium transition-colors hover:bg-muted"
                >
                  {v.vote_kind === "fav20" ? (
                    <Star className="h-3 w-3 text-accent" />
                  ) : (
                    <Heart className="h-3 w-3 text-primary" />
                  )}
                  {v.participant_name}
                  <span className="text-muted-foreground">
                    +{formatNumber(v.points)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
    <SchoolRankCard enabled={enabled} />
    </div>
  );
}
