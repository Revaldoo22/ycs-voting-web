"use client";

// Data hooks — SAME signatures as the old Supabase version, but every call
// now hits the NestJS API (same-origin /api/*, proxied by next.config).
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type {
  AdminStats,
  AppSettings,
  DailyVoteSeriesRow,
  ParticipantContent,
  ParticipantWithSchool,
  PointHistoryRow,
  Profile,
  Quest,
  School,
  Submission,
  TopSupporter,
  TopVoter,
  VoterGrowthRow,
} from "@/types/database";

const qs = (
  params: Record<string, string | number | boolean | undefined | null>,
) => {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "" && v !== false)
      search.set(k, String(v));
  }
  const s = search.toString();
  return s ? `?${s}` : "";
};

// ----------------------------- Profile ------------------------------
export type MyProfile = {
  id: string;
  avatar_url: string | null;
  name: string | null;
  email: string | null;
  phone_number: string | null;
  role: Profile["role"];
  school_id: string | null;
  school: string | null;
  class: string | null;
  status: string | null;
  region_id: string | null;
  region: string | null;
  college_intent: "ya" | "tidak" | "ragu" | null;
  onboarded: boolean;
  followed: boolean;
  /** Voter ini juga terdaftar sebagai peserta (email cocok). */
  is_participant: boolean;
  /** ID peserta miliknya sendiri (tak boleh vote ini). */
  self_participant_id: string | null;
};

export function useMyProfile() {
  return useQuery({
    queryKey: ["profile", "me"],
    queryFn: async (): Promise<MyProfile | null> => {
      try {
        const { user } = await api<{ user: MyProfile }>("/api/auth/me");
        return user;
      } catch {
        return null;
      }
    },
  });
}

// --------------------------- Admin voters ---------------------------
export type AdminVoter = {
  voter_phone: string;
  voter_name: string;
  voter_email: string | null;
  voter_status: string | null;
  voter_school: string | null;
  voter_class: string | null;
  region: string | null;
  college_intent: "ya" | "tidak" | "ragu" | null;
  votes: number;
  quests: number;
  points: number;
  first_seen: string | null;
  last_seen: string | null;
};

export type VoterFilters = {
  participantId?: string;
  from?: string;
  to?: string;
  search?: string;
  status?: string;
  school?: string;
  limit?: number;
  offset?: number;
  sort?: "recent" | "points_desc" | "points_asc";
};

function voterQs(f: VoterFilters) {
  return {
    participant_id: f.participantId,
    from: f.from,
    to: f.to,
    search: f.search,
    status: f.status,
    school: f.school,
  };
}

export function useAdminVoters(filters: VoterFilters) {
  return useQuery({
    queryKey: ["admin-voters", filters],
    queryFn: () =>
      api<AdminVoter[]>(
        `/api/admin/voters${qs({
          ...voterQs(filters),
          limit: filters.limit ?? 25,
          offset: filters.offset ?? 0,
          sort: filters.sort ?? "recent",
        })}`,
      ),
  });
}

export function useAdminVotersCount(filters: VoterFilters) {
  return useQuery({
    queryKey: ["admin-voters-count", { ...filters, limit: 0, offset: 0 }],
    queryFn: () =>
      api<number>(`/api/admin/voters/count${qs(voterQs(filters))}`),
  });
}

/** All voters matching the filters (no paging) — for the Excel export. */
export async function fetchAllAdminVoters(
  filters: VoterFilters,
): Promise<AdminVoter[]> {
  const PAGE = 1000;
  const all: AdminVoter[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const batch = await api<AdminVoter[]>(
      `/api/admin/voters${qs({
        ...voterQs(filters),
        limit: PAGE,
        offset,
        sort: filters.sort ?? "recent",
      })}`,
    );
    all.push(...batch);
    if (batch.length < PAGE) break;
  }
  return all;
}

export type PointLogRow = {
  kind: "vote" | "quest";
  source: string;
  voter_name: string;
  voter_phone: string;
  points: number;
  created_at: string;
};

export function useParticipantPointLog(participantId?: string) {
  return useQuery({
    queryKey: ["participant-point-log", participantId],
    enabled: !!participantId,
    queryFn: () =>
      api<PointLogRow[]>(`/api/admin/participants/${participantId}/point-log`),
  });
}

export function useParticipantSupporters(participantId?: string) {
  return useQuery({
    queryKey: ["participant-supporters", participantId],
    enabled: !!participantId,
    queryFn: () =>
      api<AdminVoter[]>(`/api/admin/participants/${participantId}/supporters`),
  });
}

export type ActivityLogRow = {
  kind: "daily5" | "quest";
  source: string;
  voter_name: string;
  voter_phone: string;
  participant_name: string;
  points: number;
  status: string;
  created_at: string;
};

export type ActivityFilters = {
  kind?: string;
  participantId?: string;
  from?: string;
  to?: string;
  search?: string;
  qstatus?: string;
  limit?: number;
  offset?: number;
};

function activityQs(f: ActivityFilters) {
  return {
    kind: f.kind || "all",
    participant_id: f.participantId,
    from: f.from,
    to: f.to,
    search: f.search,
    qstatus: f.qstatus,
  };
}

export function useActivityLog(filters: ActivityFilters) {
  return useQuery({
    queryKey: ["activity-log", filters],
    queryFn: () =>
      api<ActivityLogRow[]>(
        `/api/admin/activity-log${qs({
          ...activityQs(filters),
          limit: filters.limit ?? 30,
          offset: filters.offset ?? 0,
        })}`,
      ),
  });
}

export function useActivityLogCount(filters: ActivityFilters) {
  return useQuery({
    queryKey: ["activity-log-count", { ...filters, limit: 0, offset: 0 }],
    queryFn: () =>
      api<number>(`/api/admin/activity-log/count${qs(activityQs(filters))}`),
  });
}

export type VoterDistRow = {
  participant_id: string;
  participant_name: string;
  school_name: string | null;
  votes: number;
  quests: number;
  points: number;
};

export function useVoterDistribution(phone?: string) {
  return useQuery({
    queryKey: ["voter-distribution", phone],
    enabled: !!phone,
    queryFn: () =>
      api<VoterDistRow[]>(`/api/admin/voters/distribution${qs({ phone })}`),
  });
}

// ----------------------------- Settings -----------------------------
export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: () => api<AppSettings | null>("/api/public/settings"),
  });
}

// ----------------------------- Schools ------------------------------
export function useSchools() {
  return useQuery({
    queryKey: ["schools"],
    queryFn: () => api<School[]>("/api/public/schools"),
  });
}

export function useSchoolsWithParticipants() {
  return useQuery({
    queryKey: ["schools", "with-participants"],
    queryFn: () =>
      api<Pick<School, "id" | "name">[]>(
        "/api/public/schools?with_participants=1",
      ),
  });
}

// --------------------------- Participants ----------------------------
export function useParticipants(schoolId?: string | null) {
  return useQuery({
    queryKey: ["participants", schoolId ?? "all"],
    queryFn: () =>
      api<ParticipantWithSchool[]>(
        `/api/public/participants${qs({ school_id: schoolId ?? undefined })}`,
      ),
  });
}

/** Admin list — includes the login phone number per participant. */
export function useAdminParticipants() {
  return useQuery({
    queryKey: ["participants", "admin"],
    queryFn: () => api<ParticipantWithSchool[]>("/api/admin/participants"),
  });
}

export function useLeaderboard(limit = 50) {
  return useQuery({
    queryKey: ["leaderboard", limit],
    queryFn: () =>
      api<ParticipantWithSchool[]>(`/api/public/leaderboard${qs({ limit })}`),
    refetchInterval: 15_000, // papan skor terasa live
  });
}

export function useMyParticipant() {
  return useQuery({
    queryKey: ["participant", "me"],
    queryFn: async (): Promise<ParticipantWithSchool | null> => {
      try {
        return await api<ParticipantWithSchool>("/api/participant/me");
      } catch {
        return null;
      }
    },
  });
}

// ------------------------- Participant contents ----------------------
export function useParticipantContents(participantId?: string) {
  return useQuery({
    queryKey: ["participant-contents", participantId],
    enabled: !!participantId,
    queryFn: () =>
      api<ParticipantContent[]>(
        `/api/public/participants/${participantId}/contents`,
      ),
  });
}

export function useDoneContentIds(
  participantId: string,
  questId: string,
  email: string,
) {
  return useQuery({
    queryKey: ["done-content", participantId, questId, email.toLowerCase()],
    enabled: !!participantId && !!questId && !!email,
    queryFn: () =>
      api<string[]>(
        `/api/public/done-content${qs({
          participant_id: participantId,
          quest_id: questId,
          email,
        })}`,
      ),
  });
}

/** The logged-in participant's own content links. */
export function useMyContents() {
  return useQuery({
    queryKey: ["my-contents"],
    queryFn: async (): Promise<ParticipantContent[]> => {
      try {
        return await api<ParticipantContent[]>("/api/participant/contents");
      } catch {
        return [];
      }
    },
  });
}

// ------------------------------ Quests -------------------------------
export function useQuests(activeOnly = false) {
  return useQuery({
    queryKey: ["quests", activeOnly],
    queryFn: () =>
      api<Quest[]>(`/api/public/quests${activeOnly ? "?active=1" : ""}`),
  });
}

/** Admin CRUD list (same shape; separate for cache isolation). */
export function useAdminQuests() {
  return useQuery({
    queryKey: ["quests", "admin"],
    queryFn: () => api<Quest[]>("/api/admin/quests"),
  });
}

// --------------------------- Submissions -----------------------------
export type SubmissionRow = Submission & {
  participants: {
    name: string;
    school_id: string;
    schools: { name: string } | null;
  } | null;
  quests: { name: string; point: number; proof_type: string } | null;
  participant_contents: { url: string; kind: string } | null;
  submission_proofs: { url: string }[] | null;
};

export function useSubmissions(status?: string) {
  return useQuery({
    queryKey: ["submissions", status ?? "all"],
    queryFn: () =>
      api<SubmissionRow[]>(`/api/admin/submissions${qs({ status })}`),
  });
}

export function useSubmissionCounts() {
  return useQuery({
    queryKey: ["submissions", "counts"],
    queryFn: () =>
      api<{ pending: number; approved: number; rejected: number; all: number }>(
        "/api/admin/submissions/counts",
      ),
  });
}

type ReviewVars = {
  id: string;
  status: "approved" | "rejected";
  note?: string;
};

export function useReviewSubmission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, note }: ReviewVars) =>
      api(`/api/admin/submissions/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status, note }),
      }),
    // Optimistic: drop the item from pending lists + adjust counters.
    onMutate: async ({ id, status }: ReviewVars) => {
      await qc.cancelQueries({ queryKey: ["submissions"] });
      const prevLists = qc.getQueriesData({ queryKey: ["submissions"] });
      qc.setQueriesData({ queryKey: ["submissions"] }, (old: unknown) => {
        if (!Array.isArray(old)) return old;
        return old.filter((s) => (s as { id: string }).id !== id);
      });
      qc.setQueryData(
        ["submissions", "counts"],
        (
          c:
            | { pending: number; approved: number; rejected: number; all: number }
            | undefined,
        ) =>
          c
            ? {
                ...c,
                pending: Math.max(0, c.pending - 1),
                approved: c.approved + (status === "approved" ? 1 : 0),
                rejected: c.rejected + (status === "rejected" ? 1 : 0),
              }
            : c,
      );
      return { prevLists };
    },
    onError: (_err, _vars, ctx) => {
      ctx?.prevLists?.forEach(([key, val]) => qc.setQueryData(key, val));
      qc.invalidateQueries({ queryKey: ["submissions", "counts"] });
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["participants"] });
      qc.invalidateQueries({ queryKey: ["leaderboard"] });
    },
  });
}

// ----------------------------- Aggregates -----------------------------
export function useAdminStats() {
  return useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => api<AdminStats>("/api/admin/stats"),
  });
}

export type SeriesRange = {
  days?: number;
  from?: string;
  to?: string;
  lifetime?: boolean;
};

export function useDailyVoteSeries(range: SeriesRange = { days: 14 }) {
  return useQuery({
    queryKey: ["daily-vote-series", range],
    queryFn: () =>
      api<DailyVoteSeriesRow[]>(`/api/admin/vote-series${qs({ ...range })}`),
  });
}

export function useVoterGrowth(range: SeriesRange = { days: 14 }) {
  return useQuery({
    queryKey: ["voter-growth", range],
    queryFn: () =>
      api<VoterGrowthRow[]>(`/api/admin/voter-growth${qs({ ...range })}`),
  });
}

export function usePointHistory(participantId?: string) {
  return useQuery({
    queryKey: ["point-history", participantId],
    enabled: !!participantId,
    queryFn: () =>
      api<PointHistoryRow[]>(
        `/api/public/participants/${participantId}/point-history`,
      ),
  });
}

export function useMyRank(participantId?: string) {
  return useQuery({
    queryKey: ["my-rank", participantId],
    enabled: !!participantId,
    queryFn: () =>
      api<number | null>(`/api/public/participants/${participantId}/rank`),
  });
}

export function useTopSupporters(participantId?: string, limit = 10) {
  return useQuery({
    queryKey: ["top-supporters", participantId, limit],
    enabled: !!participantId,
    queryFn: () =>
      api<TopSupporter[]>(
        `/api/public/participants/${participantId}/top-supporters${qs({ limit })}`,
      ),
  });
}

export function useSupporterCount(participantId?: string) {
  return useQuery({
    queryKey: ["supporter-count", participantId],
    enabled: !!participantId,
    queryFn: () =>
      api<number>(`/api/public/participants/${participantId}/supporter-count`),
  });
}

export function useTopVoters(limit = 5) {
  return useQuery({
    queryKey: ["top-voters", limit],
    queryFn: () => api<TopVoter[]>(`/api/public/top-voters${qs({ limit })}`),
  });
}

// ------------------------- Regions & Rounds --------------------------
export type Region = {
  id: string;
  name: string;
  code: string;
  level?: "province" | "regency" | "district";
  parent_id?: string | null;
};

export type Round = {
  id: string;
  name: string;
  status: "draft" | "active" | "closed";
  starts_at: string | null;
  ends_at: string | null;
  scheduled_close_at: string | null;
  select_mode: "per_region" | "global";
  sequence: number;
  top_n: number;
  created_at: string;
  school_count?: number;
  lolos_count?: number;
  total_points?: number;
};

export type RoundStanding = {
  school_id: string;
  school_name: string;
  status: "active" | "lolos" | "gugur";
  region_id: string | null;
  region_name: string;
  province_id: string | null;
  province_name: string;
  carry_points: number;
  round_points: number;
  points: number;
  votes: number;
};

export type HeatmapRow = {
  region_id: string;
  region_name: string;
  code: string | null;
  province_name: string | null;
  province_code: string | null;
  schools: number;
  participants: number;
  points: number;
  votes: number;
};

/** Kabupaten/kota (regency) — dipakai filter admin, akun voter, peringkat. */
export function useRegions() {
  return useQuery({
    queryKey: ["regions", "regency"],
    queryFn: () => api<Region[]>("/api/public/regions?level=regency"),
  });
}

export function useRounds() {
  return useQuery({
    queryKey: ["rounds"],
    queryFn: () => api<Round[]>("/api/admin/rounds"),
  });
}

export function useRoundStandings(roundId?: string) {
  return useQuery({
    queryKey: ["round-standings", roundId],
    enabled: !!roundId,
    queryFn: () => api<RoundStanding[]>(`/api/admin/rounds/${roundId}/standings`),
  });
}

export function useActiveRound() {
  return useQuery({
    queryKey: ["active-round"],
    queryFn: () => api<Round | null>("/api/public/active-round"),
  });
}

export function useHeatmap(roundId?: string) {
  return useQuery({
    queryKey: ["heatmap", roundId ?? "all"],
    queryFn: () =>
      api<HeatmapRow[]>(
        `/api/public/heatmap${roundId ? `?round_id=${roundId}` : ""}`,
      ),
  });
}

export function usePublicRounds() {
  return useQuery({
    queryKey: ["public-rounds"],
    queryFn: () => api<Round[]>("/api/public/rounds"),
  });
}

export function useRoundResults(roundId?: string) {
  return useQuery({
    queryKey: ["round-results", roundId],
    enabled: !!roundId,
    queryFn: () =>
      api<RoundStanding[]>(`/api/public/rounds/${roundId}/results`),
    refetchInterval: 15_000,
  });
}

export type VoterToday = {
  votes: {
    vote_kind: "daily5";
    points: number;
    created_at: string;
    /** pending = bukti follow masih direview admin (poin belum masuk). */
    status: "pending" | "approved";
    participant_id: string;
    participant_name: string;
  }[];
  has_voted: boolean;
};

export function useVoterToday(enabled: boolean) {
  return useQuery({
    queryKey: ["voter-today"],
    enabled,
    queryFn: () => api<VoterToday>("/api/voter/today"),
  });
}

export type MySchoolRank = {
  school_id: string;
  region_id: string | null;
  school_name: string;
  region_name: string;
  points: number;
  global_rank: number;
  global_total: number;
  region_rank: number;
  region_total: number;
};

export function useMySchoolRank(enabled: boolean) {
  return useQuery({
    queryKey: ["my-school-rank"],
    enabled,
    queryFn: () => api<MySchoolRank | null>("/api/voter/school-rank"),
  });
}

export type SchoolRankingRow = {
  school_id: string;
  school_name: string;
  region_id: string | null;
  region_name: string;
  participants: number;
  points: number;
  rank: number;
};

export function useSchoolRankings(regionId?: string) {
  return useQuery({
    queryKey: ["school-rankings", regionId ?? "all"],
    queryFn: () =>
      api<SchoolRankingRow[]>(
        `/api/public/school-rankings${regionId ? `?region_id=${regionId}` : ""}`,
      ),
    refetchInterval: 20_000,
  });
}

export type PmbInsight = {
  total: number;
  intent: { intent: string; count: number }[];
  regions: { region: string; count: number }[];
};

export function usePmbInsight() {
  return useQuery({
    queryKey: ["pmb-insight"],
    queryFn: () => api<PmbInsight>("/api/admin/pmb-insight"),
  });
}

export type CouponRow = {
  code: string;
  source: string;
  created_at: string;
  owner_name: string | null;
};

export function useMyCoupons(enabled: boolean) {
  return useQuery({
    queryKey: ["my-coupons"],
    enabled,
    queryFn: () => api<CouponRow[]>("/api/voter/coupons"),
  });
}

// --------------------------- Notifications ---------------------------
export type NotificationRow = {
  id: string;
  type: "vote_rejected" | string;
  title: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

export type NotificationsResult = {
  items: NotificationRow[];
  unread: number;
};

export function useMyNotifications(enabled: boolean) {
  return useQuery({
    queryKey: ["my-notifications"],
    enabled,
    queryFn: () => api<NotificationsResult>("/api/voter/notifications"),
    // Terasa hidup: cek notifikasi baru berkala.
    refetchInterval: 30_000,
  });
}

/** Tandai notifikasi dibaca. ids kosong = tandai semua. */
export function useMarkNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids?: string[]) =>
      api("/api/voter/notifications/read", {
        method: "PATCH",
        body: JSON.stringify({ ids: ids ?? [] }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-notifications"] });
    },
  });
}
