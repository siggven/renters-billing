# PLAN — `renters-billing`

> **Spec:** [`docs/SPEC.md`](./docs/SPEC.md)
> **Operating manual:** [`AGENTS.md`](./AGENTS.md)
> **Status:** in-progress
> **Last updated:** 2026-05-26 by execution agent (Kiro / claude-opus-4.7)

This file is the single source of truth for what's being worked on. The agent updates state and the decision log after every task. See `AGENTS.md` § 2 for the update protocol.

---

## Task overview

| ID | Title | State | Depends on | Acceptance |
| --- | --- | --- | --- | --- |
| T0 | Repo bootstrap + workflow artifacts | **done** | — | AC-0 |
| T0.5 | Knowledge base re-index | todo | — | AC-0.5 |
| T1 | Vite + React + TS + Tailwind scaffold + Pages deploy | todo | T0 | AC-1 |
| T2 | Supabase project + auth login | todo | T1 | AC-2 |
| T3 | DB schema + RLS migration | todo | T2 | AC-3 |
| T4 | Tenants management page | todo | T3 | AC-4 |
| T5 | Rates page + pure billing calculator (TDD) | todo | T3 | AC-5 |
| T6 | Meter readings entry page | todo | T4, T5 | AC-6 |
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

### T0.5 — Knowledge base re-index [todo]

**Objective:** Re-index `aiagents-workflow` Obsidian vault into Kiro's knowledge base for semantic retrieval.

- [ ] Run `knowledge add` with name `aiagents-workflow`, path `C:\Users\nelvi\Documents\Obsidian\aiagents_workflow`
- [ ] Verify with `knowledge show`
- [ ] Test with a search like `"agentic loop"` — confirm hits

**Acceptance:** AC-0.5
**Demo:** `/knowledge search "agentic loop"` returns relevant chunks.

---

### T1 — Vite + React + TS + Tailwind scaffold + Pages deploy [todo]

**Objective:** Empty styled placeholder app deployed live to GitHub Pages via GitHub Actions.

- [ ] `npm create vite@latest . -- --template react-ts`
- [ ] Install + configure Tailwind CSS
- [ ] Set `vite.config.ts` `base: '/renters-billing/'`
- [ ] ESLint + Prettier configs
- [ ] `package.json` scripts: `lint`, `format`, `typecheck`, `test`, `build`, `dev`, `preview`
- [ ] Vitest config + a smoke test
- [ ] Placeholder `App.tsx` with the BahayBills name and Tailwind styling
- [ ] `.github/workflows/deploy.yml` — install, lint, typecheck, test, build, deploy via `actions/deploy-pages@v4`
- [ ] **PAUSE** — user creates GitHub repo `renters-billing` (public), enables Pages from Actions
- [ ] Push to `main`, watch deploy succeed
- [ ] Verify live URL on a phone

**Depends on:** T0
**Acceptance:** AC-1

---

### T2 — Supabase project + auth login [todo]

**Objective:** Login page authenticates via Supabase email/password; protected route shows authenticated user's email.

- [ ] **PAUSE** — walk user through creating a free Supabase project (region `ap-southeast-1` Singapore)
- [ ] User copies URL + anon key into `.env.local` (gitignored) and into GitHub Actions secrets
- [ ] `npm install @supabase/supabase-js @tanstack/react-query react-router-dom`
- [ ] `src/lib/supabase.ts` — client factory using `import.meta.env.VITE_SUPABASE_URL` etc.
- [ ] `src/contexts/AuthContext.tsx` with `useAuth()` hook
- [ ] `src/components/ProtectedRoute.tsx`
- [ ] `src/pages/Login.tsx` with email/password form
- [ ] React Router v6: `/`, `/login`, `/dashboard`
- [ ] Unit-test AuthContext with a mocked Supabase client
- [ ] User creates two Supabase Auth users (Nelvi + father) in Supabase Studio
- [ ] Manual: login → dashboard → refresh persists → logout

**Depends on:** T1
**Acceptance:** AC-2

---

### T3 — DB schema + RLS migration [todo]

**Objective:** Apply the full schema with RLS so only authenticated users can access data.

- [ ] Write `supabase/migrations/0001_initial_schema.sql` covering all 5 tables + RLS policies
- [ ] Apply via Supabase Studio SQL editor
- [ ] Add `supabase/seed.sql` with placeholder tenants (3 renters + 1 non-renter)
- [ ] Verify: anon SELECT denied; authenticated SELECT allowed
- [ ] Generate TypeScript types from Supabase (manual or via `supabase gen types`)

**Depends on:** T2
**Acceptance:** AC-3

---

### T4 — Tenants management page [todo]

**Objective:** List, add, edit, deactivate tenants via UI.

- [ ] React Query hooks: `useTenants`, `useCreateTenant`, `useUpdateTenant`, `useDeactivateTenant`
- [ ] `src/pages/Tenants.tsx` with active + inactive sections
- [ ] `src/components/TenantForm.tsx` modal with validation:
  - room# required, type required
  - rent required (renters only)
  - rent_due_day 1–31 (renters only)
  - has_water defaults to true for renters, false for non-renter
- [ ] Unit-test form validation logic
- [ ] User adds the 4 actual tenants

**Depends on:** T3
**Acceptance:** AC-4

---

### T5 — Rates page + pure billing calculator (TDD) [todo]

**Objective:** Pure `calculateBill()` function with comprehensive unit tests (written FIRST), plus a UI to view and add rates.

- [ ] **TDD step 1:** write `src/lib/billing.test.ts` — all branches:
  - Renter with elec + water + rent
  - Non-renter (elec only)
  - Renter with `has_water=false`
  - Zero usage (curr === prev)
  - Negative usage → throws `InvalidReadingError`
  - Missing previous reading (first month)
  - Rate change mid-cycle picks the rate effective at reading_date
  - PHP rounding: 2dp half-up
- [ ] **TDD step 2:** implement `src/lib/billing.ts` until all tests green
- [ ] React Query hooks: `useCurrentRate`, `useAllRates`, `useAddRate`
- [ ] `src/pages/Rates.tsx` — current rate card + new-rate form
- [ ] Type definitions for `Tenant`, `Rate`, `Reading`, `Bill` in `src/types/`

**Depends on:** T3
**Acceptance:** AC-5

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
