# PLAN — `renters-billing`

> **Spec:** [`docs/SPEC.md`](./docs/SPEC.md)
> **Operating manual:** [`AGENTS.md`](./AGENTS.md)
> **Status:** in-progress
> **Last updated:** 2026-05-27 03:50 by execution agent (Kiro / claude-opus-4.7) — README expansion shipped; only end-to-end manual run-through remains for AC-11

---

## ⏯ Resume here next session

**You are paused mid-T11. The Meralco feature and the README expansion are both done. Only the final AC-11 sub-item remains: a fresh end-to-end manual run-through.**

What's left:

1. **End-to-end manual run-through** (final AC-11 sign-off) — walk the entire flow as a fresh user (login → tenants → readings → bills → receipts → dashboard) on the live deploy, on an actual Android phone if possible. Goal: prove the father can self-serve from the README quick-start. Note any rough edges as a punch-list; fold trivial fixes into a `polish(T11)` commit and pause for anything bigger.

When ready, tell the agent **"go"** and it will either drive the run-through itself via Playwright (one final agent-led pass), or surface the README + screenshots and let you do the run-through manually on your phone — your call.

The README is at HEAD with screenshots in `docs/screenshots/` (~349 KB). All 4 quality gates green.

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
| T6 | Meter readings entry page | **done** | T4.5 | AC-6 |
| T7 | Bill generation + bill list view | **done** | T5, T6 | AC-7 |
| T8 | Receipt view + save-as-image | **done** | T7 | AC-8 |
| T9 | Payment tracking | **done** | T7 | AC-9 |
| T10 | Dashboard + history page | **done** | T9 | AC-10 |
| T11 | Polish + final wiring + father onboarding | **in-progress** | T10 | AC-11 |

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
- [x] User added the 4 actual tenants on the live site with real per-tenant rates + extras (2026-05-26 23:50). Verified end-to-end via read-only count: 4 tenants (3 renters + 1 non-renter), 3 with water sub-meter, 2 with extras (₱200 + ₱300), elec ₱27/kWh consistently, water rates differ per renter (₱90 / ₱100), `has_water ⇒ water_per_m3 IS NOT NULL` invariant holds across all rows.

**Depends on:** T5 (uses the calculator which needed updating)
**Acceptance:** new AC-4b
**Implementation commit:** see Decision log entry below for SHA

---

### T6 — Meter readings entry page [done]

**Objective:** Single page to enter all readings for a chosen period.

- [x] `src/pages/Readings.tsx` with month picker (default = current month, in Asia/Manila)
- [x] Form rows: one per active tenant + one for father's water main
- [x] Auto-load previous month's reading inline as reference (`usePreviousReadings` returns the most-recent reading where `period < chosenPeriod`, per tenant)
- [x] Live consumption preview: `curr − prev = X kWh / m³`, plus `× tenant rate = ₱amount`
- [x] Validation: current ≥ previous; first reading flag if no previous; water-vs-has_water invariant; NaN/Infinity guard
- [x] Reading date defaults to last day of selected period; user-editable
- [x] Upsert via Supabase (UNIQUE constraint handles re-saves) — `useUpsertReadings` (onConflict='tenant_id,period') + `useUpsertFatherWaterMain` (onConflict='period')
- [x] All 4 quality gates green: lint clean, typecheck clean, 127 tests (29 billing + 59 validation + 34 period + 5 auth), build 1.39s
- [x] Live integration test against the production DB exercised the full data path: 4-row upsert, re-upsert verified idempotent (FR-16), CHECK rejects negative readings, cleanup clean

**Depends on:** T4.5 (per-tenant rates) — readings call out the per-tenant rate in their consumption preview
**Acceptance:** AC-6
**Implementation commit:** see Decision log below for SHA

---

### T7 — Bill generation + bill list view [done]

**Objective:** "Generate Bills" button creates a `bills` row per active tenant for the chosen period; list view shows totals + status.

- [x] Implement client-side bill generation transaction:
  - For each active tenant, fetch curr + prev readings, lookup current rate (from tenant after T4.5)
  - Call `calculateBill()` (which already snapshots elec_rate, water_rate, extras_amount, extras_note)
  - Bulk insert `bills` rows
  - Skip tenants who already have a bill for the period (idempotent via the orchestration layer; UNIQUE (tenant_id, period) provides DB-level backstop)
- [x] React Query hooks: `useBillsForPeriod`, `useInsertBills`
- [x] `src/pages/Bills.tsx` — period selector + bill list with totals (billed / collected / outstanding) + status badges + skipped-tenant hints inline
- [x] Pure orchestration helper `buildBillInsertsForPeriod()` in `src/lib/bills.ts` + 12 TDD tests covering: skip already-billed, skip no-reading, first-reading bills with rent+extras, snapshot stability, has_water=false short-circuit, InvalidReadingError → skipped
- [x] Live integration smoke against the production Supabase project: seeded prev + curr readings, computed expected totals from each tenant's actual rates, bulk-inserted 4 bills, totals matched (Neighbor ₱2,700 / Room 2 ₱7,400 / Room 1 ₱10,100 / Room 3 ₱7,400), duplicate insert rejected with Postgres 23505 (unique_violation), cleanup clean
- [x] All 4 quality gates green: lint clean, typecheck clean, 139 tests (29 billing + 12 bills + 59 validation + 34 period + 5 auth), build 2.71s

**Depends on:** T5 (calculator), T6 (readings)
**Acceptance:** AC-7
**Implementation commit:** see Decision log below for SHA

---

### T8 — Receipt view + save-as-image [done]

**Objective:** Mobile-friendly receipt at `/bill/:id` with line items and a "Save as image" button.

- [x] `src/pages/BillView.tsx` — clean centered card layout: header (BahayBills + period), tenant info, line items (electricity with prev→curr & rate, water with prev→curr & rate, rent, extras with note when amount > 0), large total row, generated_at timestamp, paid stamp if paid (green outlined badge); UNPAID note otherwise
- [x] `npm install html2canvas` (1.4.1)
- [x] "Save as image" button: dynamic-imports `html2canvas` only on click → renders the receipt ref to PNG → triggers download as `<RoomNumber>_<Period>.png` (room name sanitized to `[a-zA-Z0-9_-]`)
- [x] Avoid CSS that breaks `html2canvas`: receipt uses arbitrary `[color:#xyz]` / `[bg:#xyz]` / `border-[#xyz]` Tailwind utilities throughout (Tailwind v4 emits `oklch()` for many palette tokens which html2canvas 1.4.1 cannot parse)
- [x] Print stylesheet `@media print` inlined into the page via a `<style>` tag — hides `.no-print` chrome, resets backgrounds, drops shadows/borders for a paper-friendly fallback
- [x] Bill cards on /bills now Link to /bill/:id
- [x] Manual QA on the live deploy via Playwright: receipt rendered correctly, "Save as image" produced a valid PNG (data URL starts with `iVBORw0KGgo`, the PNG signature) with the correct filename `Room_2_1970-01.png`. No console errors. Sentinel bill cleaned up.

**Depends on:** T7
**Acceptance:** AC-8
**Implementation commit:** `c2c10db`

---

### T9 — Payment tracking [done]

**Objective:** Mark / unmark bills as paid; visual indicators on list and receipt.

- [x] "Mark as Paid" button on bill list (inline per card) and bill view → modal with date picker (default today, Asia/Manila) + optional note
- [x] "Unmark" button visible when paid (with confirm dialog on bill view; same on list cards)
- [x] React Query hooks: `useMarkBillPaid` (paid_date is required at the type level — addresses T8 reviewer flag) + `useMarkBillUnpaid` (clears paid_date + paid_note)
- [x] PAID badge (green) / UNPAID badge (amber) on bill list — already in T7; now flips immediately after mutation via query invalidation
- [x] Receipt view shows "PAID on YYYY-MM-DD" stamp when paid (already gated on `isPaid && bill.paid_date`)
- [x] T8 reviewer flag #1: extracted `safeFilename` to `src/lib/filename.ts` + 8 TDD tests
- [x] All 4 quality gates green: lint clean, typecheck clean, 147 tests (29 billing + 12 bills + 8 filename + 59 validation + 34 period + 5 auth), build 1.48s
- [x] Live UI smoke on the deploy URL: seeded unpaid sentinel, marked paid via modal (with note), verified DB row + PAID stamp + Unmark button; unmarked, verified DB revert + stamp removal; cleanup clean

**Depends on:** T7
**Acceptance:** AC-9
**Implementation commit:** `83a4f8c`

---

### T10 — Dashboard + history page [done]

**Objective:** Landing page (current month status) + history page with filters.

- [x] `src/pages/Dashboard.tsx`:
  - 4 summary cards (`SummaryCard` subcomponent): paid/total count, total collected (₱), total outstanding (₱), owed upstream for water (₱ from `father_water_main_readings.amount_owed_upstream` for the current period)
  - Current-month bill list — compact cards with PAID/UNPAID badges + inline mark-paid quick action (uses the same `MarkPaidModal` as `/bills`)
  - Quick-link nav strip at the bottom (Tenants / Readings / Bills / History)
- [x] `src/pages/History.tsx`:
  - Filters: tenant dropdown (All tenants + named active), period from + period to (`type="month"` inputs)
  - Sortable table: Period, Tenant, Total, Status, Generated. Column header click toggles sort direction; ▲/▼ indicator visible on the active column
  - Summary footer (Total billed / Collected / Outstanding) recomputes when filters change
  - Row click → `useNavigate` to `/bill/:id` (client-side, preserves auth + state)
- [x] React Query: `useBillsHistory({ tenantId?, periodFrom?, periodTo? })`. Server-side filters via `eq` / `gte` / `lte` on the `bills` table. `BillWithTenant` consolidated to `src/hooks/useBills.ts` so `useBillsForPeriod` and `useBillsHistory` share one type.
- [x] T9 reviewer nits closed: paid_note empty-string coercion now lives only in the modal (mutation forwards as-is); shared `buildUnmarkConfirmMessage` helper exported from `useBill.ts` and used by Dashboard / Bills / BillView so all three confirms read the same.
- [x] All 4 quality gates green: lint clean, typecheck clean, 147 tests pass, build 1.42s
- [x] Live verification on deploy: dashboard renders empty-state for current month (May 2026) cleanly; history page tested with 12 sentinel bills across 3 periods (4 tenants × 3 months × mixed paid/unpaid). Sort indicator + tenant filter + period range filter + summary-footer math + row-click navigation all verified

**Depends on:** T9
**Acceptance:** AC-10
**Implementation commit:** `30d85d2`

---

### T11 — Polish + final wiring + father onboarding [in-progress]

**Objective:** Top nav, loading states, error toasts, empty states, mobile responsive QA, README expansion.

- [x] Top nav: BahayBills + Dashboard / Tenants / Readings / Bills / History / Sign out (Rates removed in T4.5; not in nav). Persistent sticky `<TopNav>` component with active-link highlighting via `NavLink`; horizontal scroll on small viewports keeps all 5 links visible at 360px without a hamburger.
- [x] Toast system (`sonner` 1.x). `<Toaster />` mounted at root (theme=dark, position=bottom-center). Replaced inline saveSuccess/saveError state with `toast.success` / `toast.error` calls on: Tenants (create/update/deactivate), Readings (save), Bills (generate + mark/unmark), BillView (mark/unmark), Dashboard (inline mark/unmark). Saved Readings validation errors stay as in-page banners (per-row blockers the user must fix before save).
- [x] Loading skeletons on data-heavy pages (`<LoadingSkeleton>` with `role='status'` + `aria-busy`). Used on Dashboard's current-month list and History's table.
- [x] Empty states reviewed across every page; copy points to the next action (e.g., "No bills generated for May 2026 yet. Generate them →").
- [x] T10 reviewer carry-overs:
  * History table rows: `tabIndex=0` + `role='link'` + `onKeyDown=Enter/Space` + focus-visible ring.
  * Sortable column headers refactored to a config-driven map with `tabIndex=0` + Enter/Space + `aria-sort='ascending'/'descending'/'none'`.
  * `SummaryCard` "Paid / Total" tone now goes neutral (total=0) → warn (partial paid) → good (fully paid).
- [x] Mobile responsive QA: TopNav horizontal-scroll, summary cards `grid-cols-2 sm:grid-cols-4`, `max-w-3xl/4xl` page wrappers. All flows tested on the deploy via Playwright.
- [x] Expand `README.md` with screenshots and "Father's quick start" (with optional Tagalog notes) — shipped at HEAD with 7 screenshots in `docs/screenshots/` (~349 KB) captured against sentinel data with DOM-text redaction; helper scripts at `scripts/{seed,cleanup}-screenshot-sentinel.mjs` for future refreshes.
- [x] Add Meralco bill tracking — `father_electricity_main_readings` table + Readings UI + Dashboard "Meralco bill this month" card next to "Owed upstream for water". Migration 0003 applied to the live Supabase project; `npm run smoke` 16/16 green. Live end-to-end UI verified on the deploy: Readings page Meralco section saves + reloads correctly via the Supabase round-trip; Dashboard's "Meralco bill (this month)" card populates with the saved value (PHP-formatted) and shows the right hint branch.
- [ ] End-to-end manual run-through — once the above two are in.

**Depends on:** T10
**Acceptance:** AC-11
**Polish commit:** `71bd665`

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
- 2026-05-26 23:50 — **AC-4b fully satisfied.** User added the 4 actual tenants on the live site (https://siggven.github.io/renters-billing/tenants). Verified via a read-only count against the live DB: 4 tenants (3 renters + 1 non-renter), 3 with water sub-meter, 2 with extras lines (₱200 wifi-1-device for one room, ₱300 wifi-2-devices for another), elec consistently ₱27/kWh (markup over Meralco's ₱14.97), water rates differ per renter (₱90 and ₱100/m³ — useful data point: the per-tenant water rate isn't always uniform either, vindicating the T4.5 design call). The `has_water ⇒ water_per_m3 IS NOT NULL` SQL invariant holds across all rows. T4.5 is now complete end-to-end (data model + UI + live data).
- 2026-05-27 00:00 — T6 design choice: `period` is text 'YYYY-MM' everywhere (matching the SQL `text CHECK ~ '^\d{4}-\d{2}$'` columns), rather than `Date`. Rationale: avoids JS Date timezone shifts (e.g., `new Date('2026-05')` parses as UTC midnight which becomes 2026-04-30 in Asia/Manila), keeps lexical sort = chronological sort, mirrors what Postgres stores. Period helpers (`isValidPeriod`, `lastDayOfPeriod`, `periodCompare`, `shiftPeriod`, `formatPeriodLabel`, `getCurrentPeriod`) are pure and 34/34 tests cover leap years, year-end rollover, and Asia/Manila TZ via `Intl.DateTimeFormat` (rather than relying on the host's local TZ).
- 2026-05-27 00:00 — T6 `usePreviousReadings` design: returns a `Map<tenantId, Reading>` of the most-recent reading where `period < chosenPeriod`, per tenant. Implementation: single Supabase query with `.lt('period', chosen)` + `.order('tenant_id').order('period', desc)`, then client-side fold taking the first row per tenant. Handles "user skipped a month" correctly (prev = most recent, not necessarily immediately-prior month). Small data assumption (tens of rows) makes client-side folding fine; if the readings table grows huge, switch to a Postgres view with `DISTINCT ON (tenant_id) … ORDER BY tenant_id, period DESC`.
- 2026-05-27 00:00 — T6 form-state seed pattern: local form state holds the user's edits; a `useEffect` keyed on `period|tenants.length|dataUpdatedAt-readings|dataUpdatedAt-father` re-seeds only when the period changes or after a save (post-mutation refetch invalidates the timestamp). React Query refetches that don't actually change data don't reseed — so a user typing in one row isn't clobbered when another query invalidates. Tracked via a `useRef<string>` that holds the last-seeded key.
- 2026-05-27 00:00 — T6 save semantics: blank tenant rows are *skipped* on save (per FR-12 nullability). Rows with garbage text input → surfaced as per-row "Must be a number" errors. Father main row is independent — saves only if `reading_value` is non-empty. Empty save (no tenant rows + no father reading) is rejected with a clear message rather than silently no-op'ing. After a successful save, the state auto-reseeds from the now-fresh server data, so re-entering values for the same period naturally upserts (FR-16).
- 2026-05-27 00:00 — T6 chose to skip a per-rate Reading TDD test file in favour of (a) thorough `validateReading` unit tests (20 tests covering blank rows, NaN, negative, current<prev, water-vs-has_water invariant) + (b) a one-shot live integration test that exercises the actual `useUpsertReadings` / `useUpsertFatherWaterMain` data path against the production Supabase project. The integration test verified: 4 rows upsert, re-upsert with different values produces no duplicates and replaces values, DB CHECK rejects negative readings (Postgres 23514). Cleanup left the DB in pristine state.
- 2026-05-27 00:30 — T6 done. 127 tests pass (29 billing + 59 validation + 34 period + 5 auth). Bundle 524kB JS / 21kB CSS, 149kB gzipped (from 507/20.5/146 in T4.5 — the +17kB JS is the Readings page + period helpers, in line with expectations). T6 commit: see git log post-commit. Post-deploy live UI verification deferred to next session if user wants it; AC-6 satisfied at the data-plane level via the integration smoke.
- 2026-05-27 00:55 — T6 follow-up `8c29da8`: stale-closure bug fix in `handleSave`. The gate `Object.keys(collectedErrors).length > 0 || fatherError !== null` read the React state captured at function-call time, not the value just queued by `setFatherError(...)` a few lines above. Edge case: valid tenant rows + invalid father reading → tenant rows persisted while father error showed in the UI alongside the success banner. Fix introduces a local `fatherHasError` boolean alongside each `setFatherError(...)` call. Reviewer-flagged on `a38869b`.
- 2026-05-27 01:00 — T7 design split: pure orchestration (`buildBillInsertsForPeriod`) lives in `src/lib/bills.ts` and is unit-tested in isolation; the I/O step (`useInsertBills`) is a thin React Query mutation that takes a pre-built `BillInsert[]` and bulk-inserts. The Bills page composes them via a `useMemo` that runs `buildBillInsertsForPeriod` against already-loaded query data. Benefits: orchestration is testable without a DB, the page can show "skipped" hints inline (computed by the same call), the mutation has nothing to fail on except network errors.
- 2026-05-27 01:00 — T7 idempotency strategy: two layers. (1) Page-level: `buildBillInsertsForPeriod` skips any tenant that already has a bill for the period and surfaces them as `skipped: { reason: 'already-billed' }` in the UI. (2) DB-level: `bills.UNIQUE (tenant_id, period)` from migration 0001 backstops with a Postgres `23505` unique_violation if a duplicate insert ever sneaks through. Live smoke proved both layers work — orchestration filtered duplicates, and forcing a duplicate insert raised 23505.
- 2026-05-27 01:00 — T7 chose to NOT have a "regenerate" button at this stage. If the user fixes a typo'd reading after generating a bill, they'll need to delete the bill row from Supabase Studio first. Rationale: AC-7 mandates idempotency; "regenerate" would invite confusion about which historical bills are authoritative. Will revisit in T11 polish if real-world use surfaces a need.
- 2026-05-27 01:00 — T7 skip reasons exposed in the UI: `already-billed`, `no-reading`, `invalid-reading` (curr < prev). Each is rendered with a clear plain-English label in the "Not billed" section. `invalid-reading` is the only one that requires user action on the Readings page; the others are informational.
- 2026-05-27 01:00 — T7 totals strategy: page computes `billed` (sum of total_amount), `collected` (sum where status='paid'), `outstanding` (sum where status='unpaid') in a `useMemo`. T9 (payment tracking) will start flipping `status` so these become live; for now everything is unpaid by default. T10's dashboard summary cards will reuse this exact computation pattern.
- 2026-05-27 01:00 — T7 lint cleanup: had to wrap `bills = billsQuery.data ?? []` in its own `useMemo` because the `?? []` fallback creates a fresh array reference every render, which `react-hooks/exhaustive-deps` correctly flagged on the dependent `billsByTenant` and `totals` `useMemo`s. Same pattern is worth applying retroactively in `Readings.tsx` (T6) but no warnings there since the dependent memos use the data-update timestamp instead.
- 2026-05-27 01:15 — T7 done. 139 tests pass (was 127, +12 for the bills orchestration helper). Bundle 535kB JS / 21.7kB CSS, 151kB gzipped. Live integration smoke against production Supabase verified: 4 bills generated with totals matching calculator output (`100 kWh × tenant rate + 10 m³ × tenant water rate + monthly_rent + extras_amount`), DB-level UNIQUE constraint backstops orchestration's idempotency, cleanup clean. T7 commit: see git log post-commit. Live UI verification on the deployed site is the next step — currently part of the same session.
- 2026-05-27 01:30 — T8 — chose to keep html2canvas (per TC-5) over alternatives like html-to-image. Tradeoffs: html2canvas is well-known, battle-tested, and handles edge cases the user's father might encounter on Android Chrome; cost is bundle size (~150kB gzipped) and the Tailwind v4 oklch-incompatibility. Mitigation for cost: dynamic `import('html2canvas')` in the click handler so the bills list page never pays. Mitigation for oklch: receipt uses arbitrary `[color:#xyz]` / `[bg-#xyz]` Tailwind utilities throughout — bypasses the design palette entirely for the screenshot region. Both paid off in the live test (PNG generated cleanly).
- 2026-05-27 01:30 — T8 print stylesheet pattern: inlined via a `<style>` tag inside the BillView component instead of a global CSS file. Reasons: (1) the print rules only apply to this route, so colocating them with the JSX matches the file's responsibility; (2) the `@media print` block uses `.no-print` and `.receipt-card` class names that are scoped to this component anyway; (3) avoids a global-CSS edit which would invalidate every cached chunk on next deploy. Trade-off: the rules can't easily be unit-tested, but the only thing they do is hide chrome and reset backgrounds — visually verifiable.
- 2026-05-27 01:30 — T8 download UX: build the PNG → create a transient `<a download="...">` → click → remove. Filename is `<RoomNumber>_<Period>.png` with the room sanitized via `replace(/[^a-zA-Z0-9_-]/g, '_')` so spaces, slashes, etc. don't break filesystem rules on any OS. Verified live: filename came out as `Room_2_1970-01.png`. No need for a server: html2canvas + data: URL + click is fully client-side, in line with NG4 (no automated backup, no server).
- 2026-05-27 01:30 — T8 chose to fetch the bill with the joined tenant in a single Supabase call (`select('*, tenant:tenants(...)')`) rather than two queries. Reasons: receipt always needs both, the join is small (one row each), and PostgREST handles the embed natively. Less round-trip latency on Android 4G (NFR-4).
- 2026-05-27 01:30 — T8 reviewer-flagged manualChunks split is now naturally handled: the dynamic import for html2canvas produces its own 202kB / 48kB-gzipped chunk (`html2canvas.esm-*.js`), separate from the main bundle. We didn't need to add a `manualChunks` config. The main chunk still warns (>500kB at 544kB) — that's the supabase + react-router + react-query + tailwind core; deferring an explicit vendor split to T11 polish per the existing "watch this on T8" note in PLAN.
- 2026-05-27 01:35 — T8 done. 139 tests still pass (no new test files needed — BillView is mostly rendering, the calculation work was already covered in T5 + T7). Bundle breakdown: index 544kB / 154kB gz (main app), html2canvas chunk 202kB / 48kB gz (lazy). Live verification: receipt rendered correctly on https://siggven.github.io/renters-billing/bill/:id, "Save as image" produced a valid PNG with the right filename, no console errors. Sentinel bill cleaned up; smoke creds rotated note: still exposed via Playwright b64 from earlier sessions — user should rotate when convenient. AC-8 fully satisfied. T8 commit: `c2c10db`.
- 2026-05-27 01:50 — T9 design choice: paid_date is required at the TypeScript type level on `useMarkBillPaid` (`MarkPaidArgs.paid_date: string` — non-optional). Rationale: T8 reviewer flagged that the receipt's PAID-stamp gate is `isPaid && bill.paid_date` — if a future caller marks paid without a date, the badge silently disappears. The modal defaults `paid_date` to today in Asia/Manila so the user never has to think about it. Mutating the DB without a date is now impossible from the app side; if it ever happens via SQL Studio, the receipt will fall through to a `Status: PAID` text only, which is a survivable degraded state.
- 2026-05-27 01:50 — T9 modal lives in `src/components/MarkPaidModal.tsx` and is reused on both `BillView` and `Bills`. The page passes `title`, `subtitle`, an `onConfirm` callback that wraps the right mutation, and an `isSubmitting` flag. Click-outside cancels (unless submitting). Empty/whitespace `paid_note` is coerced to null inside the mutation, so the DB never stores `""`.
- 2026-05-27 01:50 — T9 Bills.tsx inline buttons: each card is wrapped in `<Link to="/bill/:id">`; the inline mark/unmark button uses `e.preventDefault(); e.stopPropagation();` to avoid navigating when clicked. Trade-off: tabbing through the list now hits the button THEN the link, which is slightly noisier but matches the visual focus order. Tested on real keyboard nav.
- 2026-05-27 01:50 — T9 inline-unmark uses `window.confirm(...)` for now rather than a styled confirmation modal. Reasoning: keeping component count down for T9; window.confirm's native UX is acceptable for "did you mean to undo this?". A styled confirm could ship in T11 polish if the father finds it jarring on Android Chrome.
- 2026-05-27 01:50 — T9 closed out two T8 reviewer flags as part of this commit: (1) `safeFilename` extracted to `src/lib/filename.ts` + 8 tests covering spaces, unsafe punctuation, unicode, path traversal, idempotency, empty input; (2) `useMarkBillPaid` requires `paid_date` at the type level (see entry above). Reviewer's preference for tracking these in the same PR as T9 honoured.
- 2026-05-27 01:55 — T9 done. 147 tests pass (was 139, +8 for filename). Bundle: main 549kB / 155kB gz (+5kB for the modal + mutations), html2canvas chunk unchanged. Live UI smoke on https://siggven.github.io/renters-billing/bill/:id verified: marked unpaid bill paid via the modal (date defaulted to today, note "cash via Messenger" persisted), DB row showed `status='paid'`/`paid_date='2026-05-27'`/`paid_note='cash via Messenger'`, PAID stamp + Unmark button rendered immediately. Unmarked the bill via window.confirm, DB row reverted to `status='unpaid'`/`paid_date=null`/`paid_note=null`, PAID stamp removed and Mark-as-paid button restored. Cleanup left bills(1970-01)=0. AC-9 fully satisfied. T9 commit: `83a4f8c`.
- 2026-05-27 02:00 — T10 split: instead of a single `useDashboardSummary` hook, the Dashboard composes `useBillsForPeriod(currentPeriod)` + `useFatherWaterMainForPeriod(currentPeriod)` + `useTenants` and computes the four summary stats inside a `useMemo`. Reasoning: the three queries are all already individually cached/invalidated by other pages, so the dashboard pays no extra network cost when navigating around. A bespoke summary hook would have been a third copy of the bills-for-period query.
- 2026-05-27 02:00 — T10 history filters use server-side gte/lte/eq on `period`/`tenant_id`. The bills table is small and unindexed beyond what migration 0001 created (`idx_bills_period`, `idx_bills_tenant_period`), so even with thousands of rows the queries stay sub-100ms. Sort happens client-side after fetch — keeps the cache key simpler (server query never changes when only the sort flips).
- 2026-05-27 02:00 — T10 row-click navigation in History: `useNavigate()` on the `<tr>`'s `onClick`, not a wrapping `<Link>`. A Link wrapping a `<tr>` requires `display: contents` which fights table layout in Safari, and a Link inside a single cell only makes that cell clickable. The downside is the row isn't keyboard-focusable by default — keyboard users currently have to use the column header (Tab → Enter to sort, Tab past), which is suboptimal. T11 polish item: add `tabIndex=0` + `onKeyDown=Enter` on the row, or render the row as a styled-div grid instead of an HTML table.
- 2026-05-27 02:00 — T10 reviewer-nits cleanup: paid_note empty-coercion deduplication moved the responsibility cleanly to the modal layer (single source of truth, predictable from the form's perspective). Shared `buildUnmarkConfirmMessage({ tenantLabel?, periodLabel? })` helper exported from `useBill.ts` keeps the wording aligned across Dashboard/Bills/BillView. Both helpers traded a tiny amount of indirection for substantially better consistency.
- 2026-05-27 02:00 — T10 BillWithTenant consolidation: previously declared in both `useBills.ts` and `useBill.ts`. Now lives in `useBills.ts` only; `useBill.ts` imports it. Reason: that's where the joined `select` actually happens (in `useBillsForPeriod` and the new `useBillsHistory`); the singleton hook just consumes the type.
- 2026-05-27 02:00 — T10 dashboard quick-link strip: replaced the older "nav cards" with a thin 4-column row of Tenants / Readings / Bills / History links. Reason: the summary cards + current-month list now do the heavy lifting, so the navigation can be unobtrusive. Mobile-friendly grid (`grid-cols-2 sm:grid-cols-4`).
- 2026-05-27 02:05 — T10 done. 147 tests still pass (no new tests — both pages are rendering + filtering, math is covered by T5 + T7 + T9). Bundle: main 560kB / 157kB gz (+11kB for the new pages), html2canvas chunk unchanged. Live verification on https://siggven.github.io/renters-billing/: dashboard rendered the new summary cards + empty-state copy correctly; history page tested with 12 sentinel bills across 3 periods, sort/filter/totals/click-through all work. Cleanup clean. AC-10 fully satisfied. T10 commit: `30d85d2`.
- 2026-05-27 02:25 — T11 chose `sonner` (^2.0.7) over a hand-rolled toast component. ~25kB raw / ~7kB gzipped, framework-agnostic API (`toast.success`, `toast.error`), accessible by default (role=status / role=alert), themeable. Mounted at the root with `theme='dark' position='bottom-center' richColors closeButton` so toasts don't get clipped by the BillView's no-print guard at the top. Worth its weight in code-deletion: the previous approach had 5+ pages each carrying their own saveSuccess/saveError state and JSX banners.
- 2026-05-27 02:25 — T11 TopNav design: NavLink-driven; `end={item.to === '/dashboard'}` so the Dashboard link doesn't claim every nested route. Horizontal-scroll fallback (`overflow-x-auto`) on the inner UL so all 5 links stay visible at 360px without a hamburger — for two real users a hamburger would be needless complexity. Sign-out button stays visible alongside; no profile dropdown. Sticky positioning so it stays visible while the user scrolls a long Bills/Readings page.
- 2026-05-27 02:25 — T11 chose to keep saveError as an in-page banner on Readings while replacing other inline state with toasts. Reasoning: validation errors there list specific row+field problems the user must address before a save will succeed; a toast that disappears would be the wrong affordance for "go fix these inputs." Toasts are right when the action is over and the result is informational ('saved', 'unmarked', 'generated 4 bills').
- 2026-05-27 02:25 — T11 a11y closure for History: refactored the 5 `<th onClick>` blocks into a config-driven `.map()` that emits `tabIndex=0`, `role='columnheader'`, `aria-sort='ascending'/'descending'/'none'`, plus an `onKeyDown` handler binding Enter/Space to the same sort callback. Rows similarly gain `tabIndex=0` + `role='link'` + Enter/Space `onKeyDown`. Focus-visible rings via Tailwind. Now the entire history view is keyboard-operable.
- 2026-05-27 02:25 — T11 BillView print-stylesheet update: `@media print { header[class*='sticky'], .no-print { display: none !important; } }`. Targets the new TopNav by its sticky-positioning class so it doesn't appear in the printed receipt or the html2canvas screenshot.
- 2026-05-27 02:30 — T11 polish landed (commit `71bd665`). 11 files changed, +369/-298. 147 tests still pass. Bundle: main 594kB / 167kB gz (+34kB / +10kB gz vs T10 — sonner accounts for the bulk; TopNav + Skeleton + dashboard/history/tenants/readings/bills/billview rewrites for the rest). html2canvas lazy chunk unchanged. Live deploy verified via Playwright: TopNav renders consistently across Dashboard / Tenants / History, active-link highlighting confirmed on each page, Toaster region mounted, no console errors. **T11 still in-progress**: Meralco bill tracking + README expansion + end-to-end manual run-through remain (each in its own commit). AC-11 not yet declared satisfied — gated on the README quick-start the father will follow.

- 2026-05-27 02:55 — **Session-pause checkpoint.** T11 Meralco-tracking code is complete and committed. Migration 0003 (`father_electricity_main_readings`) is non-destructive (just `CREATE TABLE IF NOT EXISTS` + RLS policy) and is pending user application via Supabase Studio. All 4 quality gates green. The new ⏯ `Resume here next session` block at the top of this file documents the exact next steps. Two T11 items still ahead after migration: README expansion + end-to-end manual run-through.

- 2026-05-27 03:05 — **T11 Meralco substep fully verified end-to-end.** User applied migration 0003 in Supabase Studio. `npm run smoke` post-migration: 17/17 green (was 14 → +3 because the smoke script now exercises the new `father_electricity_main_readings` table for both anon-deny and authed-SELECT). Live UI verification on the deploy URL via Playwright: signed in as smoke user → /readings shows the new "Father's Meralco bill" section with both inputs (Bill amount required, Meter reading optional) → switched to sentinel period 1970-01, saved ₱5285.50 + 12345 kWh → toast "Saved readings for January 1970." → hard reload → values persisted (read-back via `useFatherElectricityMainForPeriod` hook from Supabase). Then to validate the dashboard branch: switched back to current period 2026-05, saved sentinel ₱9999.99 → /dashboard's "Meralco bill (this month)" card rendered "₱9,999.99" with hint "Meralco invoiced ₱9,999.99" (collected=0 branch hit correctly). Both sentinels deleted via authed DELETE; dashboard card returned to "—" / "No Meralco entry yet". Zero application console errors (only the documented GH-Pages SPA-fallback 404s from rafrex 404.html — see T2 entry above). T11 now has only README expansion + end-to-end run-through left to satisfy AC-11.

- 2026-05-27 03:50 — **README expansion shipped.** Captured 7 screenshots via Playwright on the live deploy with DOM-text redaction so the public repo never embeds real tenant identities (IRENE / MABEL / RUBY / REGINE → TENANT A/B/C/D, smoke@bahaybills.local → you@example.com). Approach: `scripts/seed-screenshot-sentinel.mjs` insert plausible readings + bills for periods 2023-12 + 2024-01 (one paid, three unpaid for variety), Playwright walks login → dashboard → tenants → readings → bills → receipt → history, runs a TreeWalker text-node redaction before each `page.screenshot`, then `scripts/cleanup-screenshot-sentinel.mjs` deletes everything seeded (verified 0 rows remain). The two helper scripts are kept under `scripts/` and documented under "Updating the screenshots" in the README's developer-setup block, so the next refresh follows the same pattern.

- 2026-05-27 03:50 — README structure and Tagalog approach. Top of file: hero + live URL + spec/plan/agents links. Then the **Father's quick-start (Para sa Tatay)** block — 4 numbered steps with a Tagalog parenthetical or two per step (per NG8: optional Tagalog notes in README only). I kept the Tagalog deliberately minimal because the executor doesn't speak Tagalog natively — only confident phrases ("Sa buwang ito" = this month, "Bayad na" = paid, "Hindi pa bayad" = unpaid, "I-save" = save, "Pindutin" = tap, "Para sa Tatay" = for father, "Walang i-install" = nothing to install, "Kasaysayan" = history). User can expand or refine when reviewing. Below that: the **Monthly flow** (5 steps) for whoever runs the readings, then tech stack, developer setup with migrations + smoke instructions, and the screenshot-update procedure for future refreshes.

- 2026-05-27 03:50 — Folded two reviewer-flagged nits in the same commit (no separate `chore:` commit needed since they're trivial). (1) Triple blank line between the father-water-main and Meralco-main sections in `src/hooks/useReadings.ts` collapsed to a single blank line. (2) PLAN.md 2026-05-27 03:05 entry corrected from "16/16 green" to "17/17 green" — the smoke script actually emits 17 ✓ lines (5 anon SELECTs + 1 anon-INSERT denial + 1 signIn + 5 authed SELECTs + 4-line tenants round-trip + signOut), so the +3 from the previous baseline of 14 (not +2 as originally noted). All 4 quality gates re-ran green: lint clean, typecheck clean, 147/147 tests in 1.31s, build in 1.70s. Bundle index unchanged at 598.39 kB / 167.70 kB gz (whitespace-only code change).