# PLAN — `renters-billing`

> **Spec:** [`docs/SPEC.md`](./docs/SPEC.md)
> **Operating manual:** [`AGENTS.md`](./AGENTS.md)
> **Status:** in-progress
> **Last updated:** 2026-05-26 23:08 by execution agent (Kiro / claude-opus-4.7) — T4.5 done

This file is the single source of truth for what's being worked on. The agent updates state and the decision log after every task. See `AGENTS.md` § 2 for the update protocol.

---

## Task overview

| ID | Title | State | Depends on | Acceptance |
| --- | --- | --- | --- | --- |
| T0 | Repo bootstrap + workflow artifacts | **done** | — | AC-0 |
| T0.5 | Knowledge base re-index | **done** | — | AC-0.5 |
| T1 | Vite + React + TS + Tailwind scaffold + Pages deploy | **done** | T0 | AC-1 |
| T2 | Supabase project + auth login | **done** | T1 | AC-2 |
| T3 | DB schema + RLS migration | **done** | T2 | AC-3 |
| T4 | Tenants management page | **done** | T3 | AC-4 |
| T5 | Rates page + pure billing calculator (TDD) | **done** | T3 | AC-5 |
| T4.5 | Per-tenant rates + extras refactor (SCOPE CHANGE) | **done** | T5 | new AC-4b |
| T6 | Meter readings entry page | todo | T4.5 | AC-6 |
| T7 | Bill generation + bill list view | todo | T5, T6 | AC-7 |
| T8 | Receipt view + save-as-image | todo | T7 | AC-8 |
| T9 | Payment tracking | todo | T7 | AC-9 |
| T10 | Dashboard + history page | todo | T9 | AC-10 |
| T11 | Polish + final wiring + father onboarding | todo | T10 | AC-11 |

States: `todo`, `in-progress`, `done`, `blocked`, `cancelled`.

---

## Tasks

### T0 — Repo bootstrap + workflow artifacts [done]

**Objective:** Create project folder, init git, materialise `docs/SPEC.md` / `PLAN.md` / `AGENTS.md` / `README.md` / `.gitignore`, commit.

- [x] Create `C:\Users\nelvi\Projects\renters-billing\`
- [x] Install Git for Windows (winget)
- [x] `git init` with `main` branch
- [x] Set local `git config user.name` / `user.email` (defaults — user can override)
- [x] Write `.gitignore` (Node, env, build, IDE, OS junk)
- [x] Write `docs/SPEC.md` (goals, NGs, FRs, NFRs, TCs, data model, AC-0..AC-11)
- [x] Write `AGENTS.md` (operating manual)
- [x] Write `README.md` (skeleton)
- [x] Write `PLAN.md` (this file)
- [x] `git add` + initial commit `chore: bootstrap repo with workflow artifacts`
- [x] Mark T0 as `done`, surface diff, STOP

**Acceptance:** AC-0
**Demo:** `git log --oneline` shows the bootstrap commit; `cat PLAN.md` shows this structured task list.

---

### T0.5 — Knowledge base re-index [done]

**Objective:** Re-index `aiagents-workflow` Obsidian vault into Kiro's knowledge base for semantic retrieval.

- [x] Run `knowledge add` with name `aiagents-workflow`, path `C:\Users\nelvi\Documents\Obsidian\aiagents_workflow`
- [x] Verify with `knowledge show` (7 items indexed; UUID `da9e3f5f-a629-4f97-86d7-9c97d9ccfc94`)
- [x] Test with a search like `"agentic loop"` — confirmed hits from `02 The Agentic Loop.md`, `03 Phase — Spec.md`, `05 Phase — Implement.md`

**Acceptance:** AC-0.5
**Demo:** `/knowledge search "agentic loop"` returns relevant chunks.

---

### T1 — Vite + React + TS + Tailwind scaffold + Pages deploy [done]

**Objective:** Empty styled placeholder app deployed live to GitHub Pages via GitHub Actions.

- [x] `npm create vite@latest . -- --template react-ts` (skipped — wrote files directly to avoid clobbering existing repo files; equivalent result)
- [x] Install + configure Tailwind CSS (v4 with `@tailwindcss/vite` plugin)
- [x] Set `vite.config.ts` `base: '/renters-billing/'`
- [x] ESLint + Prettier configs (ESLint 9 flat config + `eslint-config-prettier`)
- [x] `package.json` scripts: `lint`, `format`, `typecheck`, `test`, `build`, `dev`, `preview`
- [x] Vitest config (Vitest 3 via `defineConfig` from `vitest/config`) + smoke test
- [x] Placeholder `App.tsx` with the BahayBills name and Tailwind styling
- [x] `.github/workflows/deploy.yml` — install, lint, typecheck, test, build, deploy via `actions/deploy-pages@v4`
- [x] **PAUSED** — user created GitHub repo `siggven/renters-billing` (public), enabled Pages from Actions
- [x] Push to `main`, watch deploy succeed (Run #3, all green)
- [x] Verify live URL: https://siggven.github.io/renters-billing/ — H1, badge, footer all render; zero console errors

**Depends on:** T0
**Acceptance:** AC-1
**Live URL:** https://siggven.github.io/renters-billing/
**Final commit:** `1bff5d4 fix(T1): remove broken favicon link to clear 404 console error`

---

### T2 — Supabase project + auth login [done]

**Objective:** Login page authenticates via Supabase email/password; protected route shows authenticated user's email.

- [x] **PAUSED** — user created free Supabase project (region `ap-southeast-1` Singapore). Project ref `shqmwzbniisrdsvrefrq`
- [x] User added repo secrets `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` for GitHub Actions; local `.env.local` (gitignored) holds the same values
- [x] `npm install @supabase/supabase-js @tanstack/react-query react-router-dom`
- [x] `src/lib/supabase.ts` — singleton client; throws loud if env vars missing
- [x] `src/contexts/AuthContext.tsx` with `useAuth()` hook — `getSession()` hydration + `onAuthStateChange` subscription
- [x] `src/components/ProtectedRoute.tsx` — loading + redirect guard
- [x] `src/pages/Login.tsx` with accessible email/password form, error UI, disabled-while-submitting state
- [x] React Router v6: `/` redirects to `/dashboard`, `/dashboard` is `ProtectedRoute`-wrapped, `/login` for unauth
- [x] Unit tests for AuthContext with mocked Supabase client (5 tests, all green)
- [x] User created two Supabase Auth users (Nelvi + father) in Supabase Studio with "Auto Confirm" enabled
- [x] CI workflow injects `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` from repo secrets at build time
- [x] Inline-SVG favicon to clear default `/favicon.ico` 404
- [x] SPA fallback: `public/404.html` redirects unknown paths through a query-string round-trip; `index.html` decoder restores the URL via `history.replaceState` before React Router boots (rafrex pattern, `pathSegmentsToKeep=1`)
- [x] Live verified: redirect chain `/` → `/dashboard` → `/login`
- [x] Live verified: deep-link `/dashboard` and `/tenants` direct hits redirect cleanly through 404.html → /login (unauth)
- [x] Live verified: bad credentials → "Invalid login credentials" alert (Supabase 400 response confirms key is valid in production)
- [x] Live verified: zero console errors on the login page
- [x] User-confirmed: valid creds → `/dashboard` with email displayed; sign-out returns to `/login` (laptop)
- [x] User-confirmed: refresh on `/dashboard` while authed preserves session and stays on /dashboard (RE-TEST after 404.html fix at commit 0c604c5 — confirmed working)

**Depends on:** T1
**Acceptance:** AC-2
**Live URL:** https://siggven.github.io/renters-billing/login
**Implementation commits:** `a014808` (auth + routing) · `775a333` (favicon fix)

---

### T3 — DB schema + RLS migration [done]

**Objective:** Apply the full schema with RLS so only authenticated users can access data.

- [x] Write `supabase/migrations/0001_initial_schema.sql` covering all 5 tables + RLS policies (idempotent)
- [x] Apply via Supabase Studio SQL editor (user confirmed: 5 rows `relrowsecurity=true`, 5 policies all `cmd='ALL'` to `{authenticated}`)
- [x] Add `supabase/seed.sql` with placeholder tenants (decided to skip seeding; T4 will add tenants via UI)
- [x] Add `supabase/README.md` documenting how to apply migrations via Studio
- [x] Verify: anon SELECT denied (RLS hides rows); anon INSERT denied (42501); authed CRUD allowed on all tables (`scripts/smoke-auth.mjs` round-trip via dedicated test user)
- [x] Generate TypeScript types from Supabase (deferred to T4 when first table is consumed; will hand-write minimal types or use `supabase gen types`)

**Depends on:** T2
**Acceptance:** AC-3
**Implementation commits:** `d6a1f51` (schema + seed + README) · `2c59ede` (npm run smoke for credential-safe RLS testing)
**Verification:** `npm run smoke` — 18 checks all pass

---

### T4 — Tenants management page [done]

**Objective:** List, add, edit, deactivate tenants via UI.

- [x] React Query hooks: `useTenants`, `useCreateTenant`, `useUpdateTenant`, `useSetTenantActive`
- [x] `src/pages/Tenants.tsx` with active + inactive sections
- [x] `src/components/TenantForm.tsx` modal with validation:
  - room# required, type required
  - rent required (renters only)
  - rent_due_day 1–31 (renters only)
  - has_water defaults to true for renters, false for non-renter
- [x] Unit-test form validation logic (24 tests, all branches covered)
- [x] Pure validation in `src/lib/validation.ts` so rules can be shared with the SQL CHECK constraints
- [x] User adds the 4 actual tenants (DEFERRED — pending GitHub Actions outage recovery; will do via the live deploy URL once CI is back. Verified locally end-to-end via Playwright with the smoke user.)

**Depends on:** T3
**Acceptance:** AC-4
**Implementation commit:** `04d4e8c`
**Verification:** Local Playwright run executed full CRUD: empty state → create → display (PHP currency) → edit → deactivate → reactivate → cleanup. Zero console errors. Test row deleted via REST API after.

---

### T5 — Rates page + pure billing calculator (TDD) [done]

**Objective:** Pure `calculateBill()` function with comprehensive unit tests (written FIRST), plus a UI to view and add rates.

- [x] **TDD step 1:** wrote `src/__tests__/billing.test.ts` first — 21 tests covering all branches:
  - Renter with elec + water + rent
  - Non-renter (elec only)
  - Renter with `has_water=false`
  - Zero usage (curr === prev)
  - Negative usage → throws `InvalidReadingError`
  - Missing previous reading (first month)
  - includeRent=false flag
  - PHP rounding: 2dp half-up (parametrized cases)
- [x] **TDD step 2:** implemented `src/lib/billing.ts` until all tests green
- [x] React Query hooks: `useCurrentRate` (latest rate where effective_date <= today), `useAllRates` (history), `useAddRate`
- [x] `src/pages/Rates.tsx` — current rate card + new-rate inline form + history table
- [x] Type definitions added to `src/types/db.ts` (Rate, RateInput)
- [x] `validateRate` added with 7 unit tests (date format, range, NaN, zero accepted, etc.)
- [x] Verified via Playwright: empty state → add rate → current-rate card populated → history shows row → cleanup via REST DELETE

**Depends on:** T3
**Acceptance:** AC-5
**Implementation commit:** `0386b59`
**Total tests after T5:** 57 (21 billing + 31 validation + 5 auth)

---

### T4.5 — Per-tenant rates + extras refactor [done]

**Objective:** Replace the global Rates page model with per-tenant rates + a single optional extras line per tenant. Resolves a domain-model misalignment surfaced after T5: rates aren't actually global — each tenant has their own ₱/kWh, their own ₱/m³, and may pay extra for things like wifi.

**Scope change rationale (from user 2026-05-26):**

> "Currently our own bill for this may is 353kWh × ₱14.97 from Meralco. And for the tenant its ₱27. So the markup is what father uses to cover his own consumption. Also, Room 2 has wifi (2 devices = ₱300) and Room 3 has wifi (1 device = ₱200). I want to register a tenant with their rates and extras when I add them, and edit later."

**User decisions captured for the rework:**

1. **Extras model:** single `extras_amount` (numeric) + `extras_note` (text) per tenant. NOT a multi-row list. Example: Room 2 — extras_amount=300, extras_note="wifi 2 devices".
2. **Rates page:** REMOVE entirely. Rates live only on tenants. Drop the `rates` table.
3. **Existing data:** WIPE tenants/readings/bills tables during migration (no real data has been added yet).

**Implementation checklist:**

- [x] Update `docs/SPEC.md`:
  - FR-5/FR-6 (tenants): added `electricity_per_kwh`, `water_per_m3`, `extras_amount`, `extras_note` columns to the tenant model
  - FR-8 to FR-10 (rates): marked **REMOVED in T4.5** with strikethrough + redirect to FR-6
  - FR-18/FR-19 (bill calc): take rate from `tenant`; extras snapshotted onto bill row
  - FR-23 (receipt): mention extras line shown when amount > 0
  - Section 7 schema rewritten (tenants gets 4 new columns; bills gets 2; rates table removed)
  - New AC-4b added; AC-5 retitled "Calculator (per-tenant rates)"
- [x] Wrote `supabase/migrations/0002_per_tenant_rates.sql` (idempotent):
  - `TRUNCATE bills, readings, tenants RESTART IDENTITY CASCADE` (one-time; no-op when empty)
  - `DROP TABLE IF EXISTS public.rates CASCADE`
  - `ADD COLUMN IF NOT EXISTS electricity_per_kwh / water_per_m3 / extras_amount / extras_note` on tenants
  - `ADD COLUMN IF NOT EXISTS extras_amount / extras_note` on bills
  - Drop-then-create CHECK constraints (Postgres has no `CREATE CONSTRAINT IF NOT EXISTS`)
  - has_water=true ⇒ water_per_m3 IS NOT NULL invariant
- [x] Updated `src/types/db.ts`:
  - Tenant: added `electricity_per_kwh`, `water_per_m3 (nullable)`, `extras_amount`, `extras_note (nullable)`
  - Removed `Rate`, `RateInput` types
- [x] Updated `src/lib/validation.ts`:
  - validateTenant: requires electricity_per_kwh > 0 (everyone); water_per_m3 > 0 when has_water=true, NULL when has_water=false; extras_amount >= 0
  - Removed validateRate
- [x] Updated `src/__tests__/validation.test.ts` — dropped rate tests; added groups for electricity_per_kwh, water_per_m3 (conditional on has_water), extras. **39 tests passing.**
- [x] Updated `src/lib/billing.ts`:
  - Dropped the `rate` parameter — rate now comes from `tenant.electricity_per_kwh` / `tenant.water_per_m3`
  - Added `extras_amount` + `extras_note` to `BillSnapshot` (snapshotted from tenant)
  - Total now = elec + water + rent + extras
- [x] Updated `src/__tests__/billing.test.ts` — fixtures rewritten with per-tenant rates; new "per-tenant rates (T4.5)" + "extras line (T4.5)" sections. **29 tests passing.**
- [x] Deleted `src/hooks/useRates.ts`, `src/pages/Rates.tsx`
- [x] Removed `/rates` route from `src/App.tsx`
- [x] Removed "Rates" card from `src/pages/Dashboard.tsx`; status badge updated to "T4.5"
- [x] Updated `src/components/TenantForm.tsx` — 4 new fields (water rate conditional on has_water); form is `max-h-[90vh] overflow-y-auto` because it grew taller
- [x] Updated `src/pages/Tenants.tsx` — cards show electricity rate per tenant, water rate inline with "Yes — ₱X/m³" when has_water, extras line with note when amount > 0
- [x] Updated `scripts/smoke-auth.mjs` — dropped `rates` from the tables list; switched the RLS round-trip sentinel to `tenants` with the new T4.5 columns
- [x] Migration applied via Supabase Studio (user, 2026-05-26)
- [x] `npm run smoke` post-migration: 14/14 green (down from 18 because the rates round-trip is gone with the table)
- [x] All 4 quality gates green (lint clean / typecheck clean / 73 tests pass / build 1.26s)
- [ ] User adds the 4 actual tenants on the live site with real per-tenant rates + any extras (deferred to next session, after CI deploys this commit)

**Depends on:** T5 (uses the calculator which needed updating)
**Acceptance:** new AC-4b
**Implementation commit:** see Decision log entry below for SHA

---

### T6 — Meter readings entry page [todo]

**Objective:** Single page to enter all readings for a chosen period.

- [ ] `src/pages/Readings.tsx` with month picker (default = current month)
- [ ] Form rows: one per active tenant + one for father's water main
- [ ] Auto-load previous month's reading inline as reference
- [ ] Live consumption preview: `curr − prev = X kWh / m³`
- [ ] Validation: current ≥ previous; first reading flag if no previous
- [ ] Reading date defaults to last day of selected month
- [ ] Upsert via Supabase (UNIQUE constraint handles re-saves)

**Depends on:** T4, T5
**Acceptance:** AC-6

---

### T7 — Bill generation + bill list view [todo]

**Objective:** "Generate Bills" button creates a `bills` row per active tenant for the chosen period; list view shows totals + status.

- [ ] Implement client-side bill generation transaction:
  - For each active tenant, fetch curr + prev readings, lookup current rate
  - Call `calculateBill()`
  - Bulk insert `bills` rows with rate snapshot
  - Skip tenants who already have a bill for the period (idempotent)
- [ ] React Query hooks: `useBillsForPeriod`, `useGenerateBills`
- [ ] `src/pages/Bills.tsx` — period selector + bill list with totals + status badges
- [ ] Integration test: seed readings → generate → assert totals match calculator

**Depends on:** T5, T6
**Acceptance:** AC-7

---

### T8 — Receipt view + save-as-image [todo]

**Objective:** Mobile-friendly receipt at `/bill/:id` with line items and a "Save as image" button.

- [ ] `src/pages/BillView.tsx` — clean A6-ish layout: header (landlord + period), tenant info, line items (rent / elec with prev→curr & rate, water with prev→curr & rate), large total, generated_at, paid stamp if paid
- [ ] `npm install html2canvas`
- [ ] "Save as image" button: render `receiptDivRef` to PNG, download as `<RoomNumber>_<Period>.png`
- [ ] Avoid CSS that breaks `html2canvas` (no `oklch`, no `gap` on receipt container — use safe Tailwind utilities)
- [ ] Print stylesheet `@media print` as fallback
- [ ] Manual QA on real Android Chrome — screenshot looks correct

**Depends on:** T7
**Acceptance:** AC-8

---

### T9 — Payment tracking [todo]

**Objective:** Mark / unmark bills as paid; visual indicators on list and receipt.

- [ ] "Mark as Paid" button on bill list and bill view → modal with date picker (default today) + optional note
- [ ] "Unmark" button visible when paid
- [ ] React Query hooks: `useMarkPaid`, `useUnmark`
- [ ] PAID badge (green) / UNPAID badge (red) on bill list
- [ ] Receipt view shows "PAID on YYYY-MM-DD" stamp when paid

**Depends on:** T7
**Acceptance:** AC-9

---

### T10 — Dashboard + history page [todo]

**Objective:** Landing page (current month status) + history page with filters.

- [ ] `src/pages/Dashboard.tsx`:
  - Cards: paid/total, total collected (₱), total outstanding (₱), owed upstream for water (₱)
  - Current-month bill list with quick mark-paid action
- [ ] `src/pages/History.tsx`:
  - Filters: tenant dropdown, period range
  - Sortable table with click-through to receipt
- [ ] React Query: `useDashboardSummary`, `useBillsHistory`

**Depends on:** T9
**Acceptance:** AC-10

---

### T11 — Polish + final wiring + father onboarding [todo]

**Objective:** Top nav, loading states, error toasts, empty states, mobile responsive QA, README expansion.

- [ ] Top nav: Dashboard / Readings / Bills / Tenants / Rates / History / Logout
- [ ] Toast system (`sonner` or equivalent) for success/error feedback
- [ ] Loading skeletons on data-heavy pages
- [ ] Empty states ("No bills yet — generate one for this month")
- [ ] Mobile responsive QA on Chrome DevTools 360px + real Android
- [ ] Expand `README.md` with screenshots and "Father's quick start" (with optional Tagalog notes)
- [ ] Add Meralco bill tracking — on the Readings page, capture the Meralco bill amount (or main electricity meter reading + Meralco rate) for the period; on the Dashboard, show a "Meralco bill this month" card next to the existing "Owed upstream for water" card so father can see net margin per period (analogous to `father_water_main_readings`). Table: `father_electricity_main_readings` or extend dashboard query. **Why deferred**: original spec deliberately scoped tracking to what tenants owe; this is a "nice to have" for father's own bookkeeping.
- [ ] End-to-end manual run-through

**Depends on:** T10
**Acceptance:** AC-11

---

## Decision log

Append-only. Format: `- YYYY-MM-DD HH:MM — <decision> — <rationale>`.

- 2026-05-26 — Chose Vite + React over Next.js — GitHub Pages is static-only; SPA fits this scope without SSR overhead.
- 2026-05-26 — Chose Supabase over Firebase — Postgres + RLS gives clean SQL-based access rules; free tier ample for this load.
- 2026-05-26 — Chose `html2canvas` over server-side PDF — no server, pure client; matches the user's "screenshot via Messenger" workflow.
- 2026-05-26 — Snapshot rate values into the `bills` table at generation time — prevents historical bills changing if rates rise later.
- 2026-05-26 — Skipped late fees, partial payments, auto-backup, auto-reminders — explicit user preference; can revisit later.
- 2026-05-26 — Chose `git config` defaults (`Nelvi` / `nelvi@local`) at repo level rather than touching the global config — respects the global-config-untouched rule from `~/.kiro/steering/tool-rules.md`. User can override with `git config user.name "..."` if desired.
- 2026-05-26 — Chose to install Git for Windows via `winget install Git.Git` — required for repo init/commit and was missing on the system; reversible via `winget uninstall Git.Git`.
- 2026-05-26 — Added a global **reviewer agent** at `~/.kiro/agents/reviewer.json` and amended `AGENTS.md` § 3a — auto-review protocol — so the executor must invoke a read-only reviewer subagent after every task commit. Reviewer reads SPEC/PLAN/AGENTS, runs all four quality gates, and returns APPROVE / REQUEST CHANGES / BLOCK in a strict format. Replaces "user manually eyeballs each diff" with a structured pre-review.
- 2026-05-26 — Indexed the `aiagents-workflow` Obsidian vault into Kiro's KB (7 items, UUID `da9e3f5f-a629-4f97-86d7-9c97d9ccfc94`). Note: the `knowledge search` tool requires the UUID for `context_id`, not the friendly name — when other sessions need to search this KB, run `knowledge show` first to look up the ID.
- 2026-05-26 — Quirk observed during T0.5 review: subagents (e.g., the auto-review pipeline that spawns `kiro_default`) report a *different* UUID for the same KB than the parent session. Parent session view (`da9e3f5f-...`) is the canonical one this PLAN records; subagent view appears session-isolated. Reviewers should resolve KBs by **friendly name + items count + sample-search behavior**, not by UUID equality with the executor's record.
- 2026-05-26 — T1 issue 1: Vitest 2.1.x bundles its own Vite copy, causing duplicate-Vite TypeScript type conflicts with our top-level Vite 6. Fix: upgrade to Vitest 3.x which uses peer-deps for Vite. Final pin: `vitest ^3.0.0` (resolved 3.2.4).
- 2026-05-26 — T1 issue 2: ESLint's `@typescript-eslint/triple-slash-reference` rule rejected `/// <reference types="vitest/config" />` in `vite.config.ts`. Fix: drop the directive entirely — importing `defineConfig` from `vitest/config` already provides the test-field typing.
- 2026-05-26 — T1 issue 3: Vite template's default `<link rel="icon" href="/vite.svg" />` produced a 404 on Pages because (a) the file was never created in `public/` and (b) the absolute path skips the `/renters-billing/` base. Removed the link to satisfy AC-1's "no console errors" clause; a proper favicon will be added in T11 polish.
- 2026-05-26 — T1 done. Live at https://siggven.github.io/renters-billing/ (Run #3, commit `1bff5d4`). Stack confirmed working in CI: React 19 + Vite 6.4.2 + TS 5.7 + Tailwind 4 + Vitest 3.2.4 + ESLint 9 (flat config) + Prettier 3.4. Build size: 195 KB JS / 9 KB CSS / 0.5 KB HTML, gzipped 61 KB / 2.7 KB / 0.3 KB.
- 2026-05-26 — T2 secret-key incident: user accidentally pasted the Supabase **secret** key into chat (alongside the publishable key). Rotated immediately via Supabase dashboard before any code touched it. Going forward only the **publishable** key (`sb_publishable_...`) is used; the env var is named `VITE_SUPABASE_ANON_KEY` for continuity with the original SPEC. The new publishable/secret key format and the legacy JWT anon/service_role keys are both accepted by `@supabase/supabase-js` v2; sticking with the modern publishable format.
- 2026-05-26 — T2 chose to fail loud at module load if `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are missing (in `src/lib/supabase.ts`). Cryptic auth errors mid-session are worse than a clear "MISSING — set these env vars" thrown error.
- 2026-05-26 — T2 routing: `BrowserRouter` with `basename={import.meta.env.BASE_URL}` (which resolves to `/renters-billing/` in production). Considered HashRouter to dodge the GitHub Pages 404 issue — rejected because hash URLs are uglier in screenshots/Messenger. Solved instead with `public/404.html` SPA-fallback (rafrex pattern, `pathSegmentsToKeep=1`).
- 2026-05-26 — T2 favicon: previously cleared `/vite.svg` 404 in T1 by removing the icon link, but browsers auto-request `/favicon.ico` when no link is declared, regressing the AC-1 console-cleanliness. Fixed with an inline data-URI SVG of the 🏠 emoji — zero extra requests, no 404, brand-consistent.
- 2026-05-26 — T2 bundle size jumped from 64 KB gzipped (T1) to 139 KB (T2) due to `@supabase/supabase-js` + `@tanstack/react-query` + `react-router-dom`. Within budget. No further deps expected to add significant weight; `html2canvas` (T8) is the next one to watch.
- 2026-05-26 — T2 done. Auth flow live and user-confirmed end-to-end: sign-in, sign-out, refresh-persistence, deep-link refresh all work on https://siggven.github.io/renters-billing/. T2 commits: `a014808` (auth implementation) · `775a333` (favicon fix) · `0c604c5` (SPA 404 fallback).
- 2026-05-26 — T3 wrote idempotent migration: `CREATE TABLE IF NOT EXISTS` + `DROP POLICY IF EXISTS` before `CREATE POLICY` — safe to re-run if the user copies it twice.
- 2026-05-26 — T3 chose hosted Supabase Studio + paste-and-Run flow over the `supabase` CLI. Avoids adding a heavyweight dependency the user has to install; schema migrations are a few-times-a-year operation, not a daily one.
- 2026-05-26 — T3 added `scripts/smoke-auth.mjs` and an `npm run smoke` script for credential-safe end-to-end RLS verification. Pattern: dedicated Supabase Auth test user (`smoke@bahaybills.local`), credentials live ONLY in gitignored `.env.test.local`, never in chat or commits, never echoed in script output (sign-in success line says "<test user redacted>"). 18 checks: 5 anon SELECTs, 1 anon INSERT denial, signIn, 5 authed SELECTs, full INSERT/anon-blind/authed-visible/DELETE round-trip on `rates`, signOut. Use after every database-touching task going forward.
- 2026-05-26 — T3 done. Schema applied to live Supabase project (5 tables RLS-on, 5 policies authenticated-only). `npm run smoke` passes 18/18. AC-3 fully satisfied. T3 commits: `d6a1f51` (migration + seed + README) · `2c59ede` (smoke script).
- 2026-05-26 — T4 done locally. `04d4e8c` adds Tenants page + form + validation. 24 validation unit tests cover every branch (empty fields, NaN, out-of-range due-days, type-conditional fields). Local end-to-end via Playwright signed in as smoke user: created → displayed (PHP currency) → edited → deactivated (moved to Inactive) → reactivated → REST-DELETE cleanup. Zero console errors.
- 2026-05-26 — T5 followed strict TDD: wrote 21 billing-calculator tests first, then `src/lib/billing.ts` until all green. The calculator output shape mirrors the bills-table columns so T7 can pass it straight to INSERT, with rate-snapshotting baked in (FR-18). 7 more tests cover validateRate (date format, range, NaN, zero allowed). `0386b59` adds Rates page with current-rate card + history table + append-only inline form. End-to-end Playwright verification: rate created, current-rate card and history populated correctly, REST-DELETE cleanup. Total tests now 57.
- 2026-05-26 — GitHub Actions outage delayed the live deploy of T4 and T5. Status page reported "Actions experiencing degraded availability... authentication issues leading to failure in starting Actions runs". Locally everything works. CI runs #12 and #13 both failed at "Set up job" step (runner provisioning failure, not our code). Code is correct and quality-gated; the live URL just lags until GitHub recovers and a successful run completes. The user adds 4 real tenants and the real rate via the live site as soon as CI is back.
- 2026-05-26 — Rate-model clarification with user: "rate" in the Rates page is the **tenant-facing** rate (₱27/kWh and ₱?/m³ in their case), not the Meralco wholesale rate (₱14.97/kWh in May 2026). Father absorbs the difference — markup on tenant electricity helps cover his own household consumption. The app does NOT currently track Meralco's actual bill amount, so it can't show father's net margin. Deferred to T11 as a polish item: add a `father_electricity_main_readings`-style table + dashboard card showing "Meralco bill this month" alongside the existing "Owed upstream for water" card. Original SPEC scope unchanged for now.
- 2026-05-26 — GitHub Actions outage resolved (status: "degradation has been mitigated"). CI Run #15 (commit `009444f`, empty nudge) completed successfully — build + deploy both green. Live site at https://siggven.github.io/renters-billing/ now serves T0–T5 code: dashboard with Tenants and Rates cards, both pages functional, zero console errors. User can now sign in with their real account and add real tenants + rate.
- 2026-05-26 — **SCOPE CHANGE introduced as T4.5 (rework before T6).** Original spec assumed a global rates model (one `rates` table, all tenants charged the same per kWh / per m³). Real domain has per-tenant rates: each tenant has their own ₱/kWh and ₱/m³, plus a single optional extras line (e.g., Room 2 wifi ₱300, Room 3 wifi ₱200). User's decisions: (1) extras = single `extras_amount` + `extras_note` per tenant, NOT a multi-row list; (2) Rates page goes away entirely — rates only live on tenants; (3) existing tenants/readings/bills tables get wiped on migration (no real data yet). T4 and T5 stay marked done as historical milestones, but T4.5 supersedes their data model. T6 onward depends on T4.5, not on T4+T5 directly. Full T4.5 checklist in this PLAN.md above. Pausing here — rework will happen in a fresh session for context room.
- 2026-05-26 23:00 — T4.5 migration designed as **drop-then-create** for CHECK constraints. Postgres has no `CREATE CONSTRAINT IF NOT EXISTS`, so for re-runnability the migration uses `DROP CONSTRAINT IF EXISTS … ; ADD CONSTRAINT …` for every CHECK. `ADD COLUMN IF NOT EXISTS` covers the columns themselves. The `TRUNCATE bills, readings, tenants RESTART IDENTITY CASCADE` runs on every apply but is a no-op once the tables are empty — so re-running is safe.
- 2026-05-26 23:00 — T4.5 validation choice: app validation requires `electricity_per_kwh > 0` and `water_per_m3 > 0` (when has_water), but the **DB CHECK is `>= 0`**. Looser at the DB layer is fine — it's there to catch programming errors, not to enforce business rules. The app-level rule "rate must be positive" is a UX guard; the DB rule "non-negative" is the data-integrity floor. The 0-allowed test in the existing `validateRate` was a "free utility scenario" hypothetical that never made it to product, so we removed it.
- 2026-05-26 23:00 — T4.5 calculator output gains `extras_amount: number` (always present, defaults 0) + `extras_note: string | null`. Total now includes extras. The DB column on `bills` is nullable for forward-compat (older bills predate extras), but new bills always carry a number. Extras applies to non-renters too — the wifi case generalizes to any tenant.
- 2026-05-26 23:00 — T4.5 form-UX call: `TenantForm` is now noticeably taller (10+ inputs). Added `max-h-[90vh] overflow-y-auto` to the modal so it scrolls within the viewport instead of overflowing on smaller phones. Water rate input is conditionally rendered when `has_water=true` so non-renters and renters-without-water-meter don't see an irrelevant field. `useEffect` on `has_water` syncs `water_per_m3` (clears to null when toggled off; defaults back to 30 when toggled on).
- 2026-05-26 23:00 — T4.5 smoke-script updated. The original RLS round-trip used the `rates` table as the sentinel — but T4.5 drops that table. Switched the sentinel to `tenants` (a non-renter row with all four T4.5 columns set), which has the bonus that the smoke run also exercises the new schema's CHECK constraints. Total checks dropped from 18 to 14 (5 anon checks, 4 authed SELECTs, full INSERT/RLS/SELECT/DELETE round-trip, signOut). All 14 green post-migration.
- 2026-05-26 23:08 — T4.5 done. Live Supabase project migrated (`rates` table dropped, `tenants` + `bills` carry the new columns). 73 tests pass (39 validation + 29 billing + 5 auth). Bundle 507kB JS / 20.5kB CSS, 146kB gzipped — unchanged from T5 (the >500kB Vite warning is from supabase + react-query + react-router and predates this task). T4.5 commit: see git log post-commit. AC-4b is satisfied at the code+migration level; live tenant-creation UI verification deferred to next session.
