/**
 * Central TanStack Query key factory. Every feature registers its keys here
 * so invalidation is discoverable and never stringly-typed at call sites.
 */
export const queryKeys = {
  admin: {
    all: ["admin"] as const,
    stats: () => [...queryKeys.admin.all, "stats"] as const,
    voteSeries: (days: number) =>
      [...queryKeys.admin.all, "vote-series", days] as const,
  },
  participants: {
    all: ["participants"] as const,
    list: () => [...queryKeys.participants.all, "list"] as const,
  },
  schools: {
    all: ["schools"] as const,
    list: () => [...queryKeys.schools.all, "list"] as const,
  },
  auth: {
    me: ["auth", "me"] as const,
  },
} as const;
