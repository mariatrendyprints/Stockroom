# Stockroom

Multi-user inventory and sales tracking for a small shop — a real backend
replacing the original single-page Artifact's "ship the whole dataset to
every viewer" model with genuine server-enforced access control. Built
from `Spec.md`'s spec (not included in this repo; ask whoever generated
this project for a copy if you need to re-check behavior against it).

## Tech stack

Next.js 14 (App Router, TypeScript) · Tailwind CSS · Prisma · NextAuth
(credentials, JWT sessions) · Postgres via Supabase · deployed on Vercel.

The spec's suggested stack was "a REST API over Node/Express + Postgres,
frontend framework of your choice." This implementation folds the API
into Next.js Route Handlers instead of a separate Express service —
still a REST surface (see `src/app/api/**`), still Node underneath, just
one process instead of two. Swap it for a standalone Express service
later if you need to scale the API independently of the frontend.

## Local setup

Requires Node.js 18+ and a Postgres database to connect to — the schema
targets Postgres only (see "Database" below), so you'll need a Supabase
project (a free one is fine) even for local dev, or any other Postgres
instance.

```bash
npm install
cp .env.example .env        # fill in DATABASE_URL / DIRECT_URL from Supabase
npm run db:migrate          # applies the schema (creates it fresh first run)
npm run db:seed             # creates the first admin account + a demo item/service
npm run dev
```

Visit `http://localhost:3000`. The seed script prints the admin login it
created (`admin@stockroom.local` / `change-me-now` by default, see
`.env.example`) — **change that password** (Settings → Accounts → delete
it and create your own, or add a "change password" flow before handing
this to a team).

`npm run db:seed` is safe to re-run: it skips the admin account if that
email already exists, and skips demo data if any item already exists.

## Demo deployment (for presentations)

A second deployment with sample data and public demo logins, fully
isolated from production so visitors can poke at anything without
touching real data.

1. **Separate Supabase project** — create a new one (its own database).
   Point a local `.env` at it (`DATABASE_URL` / `DIRECT_URL`), then:
   ```bash
   npm run db:migrate      # apply the schema to the demo database
   npm run db:seed:demo     # wipe + load sample data (see below)
   ```
   `db:seed:demo` is **destructive** — it clears every table and reloads
   the sample set. That's intentional: re-run it any time to reset the
   demo to a clean state. Never run it against production.

2. **Separate Vercel project** — import the same GitHub repo into a new
   project. Env vars: the demo Supabase `DATABASE_URL` / `DIRECT_URL`, a
   fresh `NEXTAUTH_SECRET`, `NEXTAUTH_URL` set to the demo domain, and
   **`NEXT_PUBLIC_DEMO_MODE="true"`**. That last one is a build-time
   variable — if you add it after the first deploy, redeploy for it to
   take effect.

With `NEXT_PUBLIC_DEMO_MODE` on: the sign-in page shows the demo
credentials (with one-click "Fill" buttons) and the app carries a "demo
environment" banner.

**Demo logins** (created by `db:seed:demo`):
- Admin — `demo-admin@stockroom.local` / `demo1234`
- Staff — `demo-staff@stockroom.local` / `demo1234`

The sample set is Maria Trendy Prints–flavoured: bond paper, blank mugs
and tumblers, photo paper, sticker vinyl (one item deliberately Low, one
Out), four services with recipes, and ~5 days of backdated sales so the
dashboard stats and reports aren't empty.

## Roles and access control (spec §7)

- **Staff**: can only reach `/activity` — log product/service sales.
  Enforced in `src/middleware.ts` (redirects staff away from
  `/dashboard`, `/reports`, `/settings`) *and* independently in every API
  route via `requireAdmin()` (`src/lib/session.ts`). The middleware
  redirect is a UX nicety; the API check is the actual security
  boundary — hitting `/api/items` directly with a staff session returns
  `403`, not a trimmed payload.
- **Admin**: full access.
- `/api/sellable` is the one staff-reachable read endpoint that touches
  inventory — it returns item/unit/service *names and availability only*
  (see `getSellableSnapshot()` in `src/lib/inventory.ts`), never
  `costPrice`, `salesPrice`, or `amount`/`cost` on sale responses. This
  was spec's open question #2 ("should staff see any price at point of
  sale?") — resolved here as **no**, zero pricing info reaches a staff
  session, from the API on down.
- No shared PIN. Real per-person accounts (`Settings` page →
  `/api/users`), NextAuth credentials + bcrypt, JWT session carries the
  `role` claim.

## Business logic (spec §6)

All of it lives in `src/lib/inventory.ts`, independent of the HTTP
layer, so it's testable/reusable: multi-unit conversion (`factor` math),
`baseEquivalent`/low-stock status, service-sale material consumption
(all-or-nothing stock check before any mutation), product sales, sale
deletion/restock, stock conversion, and the daily-ledger opening/closing
snapshot logic.

**Open question resolved — timezone (spec §11):** "calendar day" for the
daily ledger and reports uses the **server's local time**
(`todayDateString()` in `src/lib/inventory.ts`), matching the original
Artifact's browser-local-time behavior. Fine for one shop's server in one
timezone; if you deploy across timezones, make this configurable.

## Realtime sync (spec §9)

`useLiveEvents()` (`src/hooks/useLiveEvents.ts`) revalidates the relevant
SWR cache keys on a 4-second interval, so every connected screen picks up
sales/inventory/service changes made elsewhere within a few seconds.

This started as a Server-Sent Events push backed by an in-memory listener
set — works well, but only as long as the app runs as one persistent Node
process. That's incompatible with Vercel: every request can land on a
different, short-lived serverless function instance holding no memory of
who else is connected, and there's a hard execution-time limit that an
indefinitely-open SSE connection would eventually hit. Polling has none
of that requirement, at the cost of "a few seconds" instead of "instant."
If instant cross-user sync matters more than the added infrastructure,
swap this hook for **Supabase Realtime** (Postgres change broadcasts over
websockets — a natural fit since you're already on Supabase) instead of
going back to SSE.

## What's deliberately out of scope for this MVP

Same non-goals as the spec: no multi-tenant/multi-store support, no
barcode/receipt hardware integration, no accounting-grade "who changed
what" audit trail beyond the Sale log itself (spec's flagged v2 addition,
§11). Also not built: password reset flow (an admin currently has to
delete + recreate an account to rotate a lost password) and a "change my
own password" self-service screen — worth adding before wider rollout.

## Project structure

- `src/app/(app)/**` — authenticated pages: `dashboard` (admin — stats +
  inventory/services/activity, spec §8 layout), `activity` (staff +
  admin — sell form only), `reports`, `settings`. Wrapped by
  `src/app/(app)/layout.tsx`, which requires a session.
- `src/app/login/page.tsx` — credentials sign-in.
- `src/app/api/**` — the REST surface (see spec §9 for the shape this
  follows).
- `src/lib/**` — `inventory.ts` (business rules), `auth.ts` (NextAuth
  config), `session.ts` (route-handler auth guards), `money.ts` (₱
  formatting), `prisma.ts`, `csv.ts` (report CSV export).
- `src/components/**` — `ItemsPanel`/`ServicesPanel` (admin inventory +
  recipe management, inline-editable cells), `SellForm` (product/service
  toggle, shared by staff and admin), `ActivityFeed` (admin sale log with
  undo/restock), `ConfirmButton` (two-step delete, no `confirm()`
  dialogs).
- `prisma/schema.prisma` — see spec §5. Role/type/status fields are kept
  as `String` rather than Prisma `enum`s (Prisma enums are provider-
  specific to define; this keeps the schema copy-pasteable to a
  different Postgres provider without touching the enum blocks).

## Deploying: GitHub → Supabase → Vercel

**1. Supabase (database)**
- Create a project at [supabase.com](https://supabase.com).
- Project Settings → Database → Connection string: copy the **pooled**
  connection (port 6543, "Transaction" mode) as `DATABASE_URL`, and the
  **direct** connection (port 5432) as `DIRECT_URL`. Both go in `.env`
  locally and in Vercel's env vars for the deployed app — see
  `.env.example` for why two are needed (the pooler is what stops a
  serverless host from exhausting Postgres's connection limit; Prisma
  migrations need the direct one).
- Run `npm run db:migrate` once from your machine (against that
  Supabase database) to create the schema, then `npm run db:seed` to
  create the first admin account.

**2. GitHub (source control)**
- `git init && git add -A && git commit -m "Initial commit"` (already
  done if you're reading this after asking for it — check `git log`).
- Create an empty repo on GitHub, then:
  ```bash
  git remote add origin https://github.com/<you>/<repo>.git
  git branch -M main
  git push -u origin main
  ```

**3. Vercel (hosting)**
- Import the GitHub repo at [vercel.com/new](https://vercel.com/new) —
  it auto-detects Next.js, no config needed.
- Add environment variables (Project Settings → Environment Variables):
  `DATABASE_URL`, `DIRECT_URL` (same values as Supabase above),
  `NEXTAUTH_SECRET` (`openssl rand -base64 32`), `NEXTAUTH_URL` (your
  `https://your-app.vercel.app` domain once you know it — you can deploy
  once, copy the assigned URL in, and redeploy).
- Deploy. Every subsequent `git push` to `main` auto-deploys; Vercel
  keeps every past deployment and lets you instantly roll the live site
  back to one (Deployments tab → "⋯" → Promote to Production) if a push
  breaks something — note that only reverts the *code*, not any database
  migration that shipped with it.
- Schema changes after the first deploy: run `npm run db:deploy`
  (`prisma migrate deploy`, using `DIRECT_URL`) from your machine before
  or after pushing the code that depends on it — Vercel's build doesn't
  run migrations automatically, on purpose, so you review them first.
