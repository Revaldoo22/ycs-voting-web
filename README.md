# ycs-voting-web

Next.js frontend for **Youth Character Summit (YCS)** — public voting pages +
admin dashboard. Talks to the [`ycs-voting-api`](https://github.com/Revaldoo22/ycs-voting-api)
NestJS backend.

Stack: **Next.js 15** (App Router) · **React 19** · **TanStack Query** ·
Tailwind + shadcn/ui (Radix) · React Hook Form + Zod · Recharts · Leaflet (heatmap) ·
FingerprintJS (anti-cheat).

---

## Quick start (dev)

Backend (`ycs-voting-api`) must be running first — default `http://localhost:4000`.

```bash
npm install
cp .env.local.example .env.local   # or create .env.local (see below)
npm run dev                         # http://localhost:3000
```

Login at `/login` (admin: seed via backend `scripts/seed.mjs`), dashboard at `/admin`.

## Environment (`.env.local`)

```
API_PROXY_URL=http://localhost:4000     # backend origin (proxied via next.config)
JWT_SECRET=dev-secret-change-me         # MUST match backend JWT_SECRET (middleware verifies the cookie)
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

> `.env.local` is git-ignored — keep it out of commits.

## How it talks to the backend

`next.config.ts` **rewrites** `/api/*` and `/uploads/*` to `API_PROXY_URL`, so
the browser sees a single same-origin app. The session is an **httpOnly cookie**
— no `Authorization` header in the browser. `middleware.ts` verifies that cookie
(shared `JWT_SECRET`) to gate protected routes.

`lib/api-client.ts` is the fetch wrapper: same-origin, JSON, surfaces Nest
`ValidationPipe` messages as thrown `Error`s.

---

## Layout

```
src/
├─ app/                 App Router routes (thin — wire layout/page)
│  ├─ (admin)/admin/    dashboard: participants, quests, schools, submissions,
│  │                    voters, rounds, undian (raffle), log
│  ├─ login/            admin + Google login
│  ├─ ranking/ top-voter/ peringkat-sekolah/ heatmap/ ...  public pages
│  ├─ peserta/[id]/ sekolah/[id]/  detail pages
│  └─ providers.tsx     QueryClientProvider
├─ components/          shared UI (charts, leaderboard, sidebar, ui/* shadcn)
├─ lib/
│  ├─ api-client.ts     fetch wrapper (+ error mapping)
│  ├─ query-keys.ts     ALL TanStack query keys registered here
│  ├─ queries.ts        shared query/mutation helpers
│  ├─ validations.ts    Zod schemas (mirror backend DTOs)
│  ├─ fingerprint.ts    device fingerprint (anti-cheat)
│  └─ auth.ts vote-errors.ts export-excel.ts image-compress.ts utils.ts
└─ types/database.ts    shared response types
```

## Conventions

- **Query keys**: register in `lib/query-keys.ts` — never hardcode key strings in components.
- **Data fetching**: TanStack Query hooks; types = the backend response contract.
- **Pages stay thin** — import components/hooks, don't put logic in `page.tsx`.
- **UI**: shadcn/ui in `components/ui/*`. Add via the shadcn CLI (`components.json`).

## Scripts

| Command            | Does            |
|--------------------|-----------------|
| `npm run dev`      | dev server      |
| `npm run build`    | production build|
| `npm run start`    | serve build     |
| `npm run typecheck`| `tsc --noEmit`  |
| `npm run lint`     | next lint       |
