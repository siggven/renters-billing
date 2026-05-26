# SPEC — Renters Billing Web App

> **Status:** approved (interview phase complete 2026-05-26)
> **Owner:** Nelvi (on-site, primary user)
> **Stakeholder:** Father (remote, property owner)
> **Spec format:** plain-text Markdown, GitHub-Flavored. Source of truth for what to build.

---

## 1. Goals

- **G1** Replace the manual paper-based billing process for a small property in the Philippines.
- **G2** Let the on-site user (Nelvi) record monthly meter readings, generate per-tenant bills, and track payments — from a laptop or Android phone.
- **G3** Let the remote owner (father) view bills and history at any time from his Android phone.
- **G4** Produce a clean, mobile-friendly receipt that can be screenshot-shared via Messenger to renters.
- **G5** Run on a free hosting stack (GitHub Pages + Supabase free tier) with no recurring cost.
- **G6** Preserve historical accuracy: a bill generated under rate X must always render with rate X, even after rates change.

## 2. Non-Goals

- **NG1** No automated reminders (SMS / email / push). The user notifies renters manually via Messenger.
- **NG2** No partial-payment tracking. Renters always pay in full.
- **NG3** No late-fee / penalty calculation.
- **NG4** No automated backup. The user will export CSVs from Supabase Studio when desired.
- **NG5** No public signup. Only two users exist: Nelvi and his father, created manually in Supabase Studio.
- **NG6** No multi-property / multi-landlord support. Single property, single owner.
- **NG7** No native mobile app. Web app only (works in mobile browser; PWA deferred).
- **NG8** No internationalization. PHP currency, English UI, optional Tagalog notes in README only.
- **NG9** No automated reading capture (OCR from photos). Readings entered manually.

## 3. Property & Metering Setup (domain reality)

```
ELECTRICITY:
  Meralco main meter (father's account)
    ├── Renter 1 sub-meter
    ├── Renter 2 sub-meter
    ├── Renter 3 sub-meter
    └── Non-renter sub-meter (electricity only — no rent, no water)

WATER:
  Upstream owner's main meter (third party — flat ₱/m³ to father)
    └── Father's water meter (acts as sub-meter to upstream)
          ├── Renter 1 sub-meter
          ├── Renter 2 sub-meter
          └── Renter 3 sub-meter
```

**Implications:**
- The user must read 4 electricity sub-meters + 3 renter water sub-meters + 1 father-water-main-meter every month.
- Father's water-main reading is informational: it tells the user how much father owes the upstream owner. It is **not** billed back to renters.
- Sum of renter water usage ≤ father's water-main usage (the rest is the household's own consumption). The app may flag a discrepancy but does not enforce.

## 4. Functional Requirements

### Authentication
- **FR-1** Users authenticate with email + password via Supabase Auth.
- **FR-2** Unauthenticated visitors are redirected to `/login`. All other routes require a session.
- **FR-3** Sessions persist across browser refresh (Supabase handles via localStorage).
- **FR-4** Logout clears the session and returns to `/login`.

### Tenants
- **FR-5** The user can list, create, edit, and deactivate tenants.
- **FR-6** A tenant has: name, room number, type (`renter` / `non_renter`), monthly_rent (renters only), rent_due_day 1–31 (renters only), has_water (default true for renters, false for non-renter), `electricity_per_kwh` (₱/kWh, > 0), `water_per_m3` (₱/m³, > 0; required when has_water=true, NULL otherwise), `extras_amount` (₱/month, ≥ 0; default 0; covers wifi or other flat add-ons), `extras_note` (free text, optional), active flag.
- **FR-7** Deactivated tenants are excluded from monthly readings and bill generation but remain visible under an "Inactive" section.

### Rates
- **FR-8 [REMOVED in T4.5]** ~~A rate is a triple `(effective_date, electricity_per_kwh, water_per_m3)` with optional notes.~~ Rates are now per-tenant — see FR-6 (`electricity_per_kwh`, `water_per_m3`).
- **FR-9 [REMOVED in T4.5]** ~~The user can view the current rate and add a new rate with a future or past effective_date. Rates are append-only history; no edits or deletes via the UI.~~ The global `rates` table is dropped. Editing a tenant updates that tenant's rates going forward; old bills keep their snapshotted rate values (FR-18).
- **FR-10 [REMOVED in T4.5]** ~~"Current rate" = the rate row with the largest `effective_date <= today`.~~ Each tenant carries its own current rate. Historical bills retain rate snapshots in the `bills` row.

### Meter Readings
- **FR-11** Each calendar month (`YYYY-MM`) has at most one reading row per active tenant + one father-water-main reading.
- **FR-12** A reading captures: tenant_id (nullable for father-main), period, reading_date, electricity_reading (nullable if tenant is water-only — not applicable here), water_reading (nullable for non-renter and for father-main electricity).
- **FR-13** Reading entry shows the previous month's reading inline as a reference.
- **FR-14** Validation: current reading must be ≥ previous reading. If no previous reading exists, the entry is flagged as a "first reading" and allowed.
- **FR-15** Reading date defaults to the last day of the selected period.
- **FR-16** Saving is idempotent: re-entering values for the same period upserts (uses unique constraint).

### Bill Generation
- **FR-17** "Generate Bills" for a chosen period iterates active tenants and creates one bill per tenant.
- **FR-18** Bill computation snapshots the rate values into the bill row (`elec_rate`, `water_rate`) so future tenant-rate edits do not alter history. The extras line (`extras_amount`, `extras_note`) is also snapshotted at generation time.
- **FR-19** Bill computation: `elec_amount = (curr_elec − prev_elec) × tenant.electricity_per_kwh`, `water_amount = (curr_water − prev_water) × tenant.water_per_m3` (when `has_water=true`), `rent_amount = tenant.monthly_rent` (renters only), `extras_amount = tenant.extras_amount` (always snapshotted; defaults 0), `total_amount = elec_amount + water_amount + rent_amount + extras_amount`.
- **FR-20** First-month bills (no previous reading): consumption = 0, amount = 0, but rent and extras still apply for renters.
- **FR-21** Bill generation is idempotent: if a bill already exists for `(tenant_id, period)`, skip rather than duplicate.
- **FR-22** All amounts are stored and displayed in PHP (₱), rounded to 2 decimal places (half-up).

### Receipt View
- **FR-23** A bill can be opened at `/bill/:id` showing: landlord name, period, tenant info, line items (rent / electricity / water with prev → curr readings and rate per unit / extras with note), large total, generated_at timestamp, paid stamp if paid. The extras line is shown only when `extras_amount > 0`.
- **FR-24** A "Save as image" button downloads the receipt as a PNG file named `<RoomNumber>_<Period>.png`.
- **FR-25** The receipt is mobile-responsive and renders cleanly when screenshot.
- **FR-26** A print stylesheet provides a paper-friendly fallback.

### Payment Tracking
- **FR-27** The user can mark an unpaid bill as paid, optionally specifying a paid_date (default today) and a free-text note.
- **FR-28** The user can unmark a paid bill (mistake-correction).
- **FR-29** Bill list shows a green PAID badge for paid bills, red UNPAID otherwise.
- **FR-30** A paid bill's receipt view displays a "PAID on <date>" stamp visible in the saved image.

### Dashboard & History
- **FR-31** The dashboard shows summary cards for the current month: count paid / total, total collected (₱), total outstanding (₱), amount owed upstream for water (₱).
- **FR-32** The dashboard lists current-month bills with quick mark-paid action.
- **FR-33** The history page lists past bills with filter by tenant and by period range. Clicking a row opens the receipt view.

## 5. Non-Functional Requirements

- **NFR-1 (Cost)** Total recurring cost = ₱0. Must run within Supabase free tier (500MB DB, 50k MAU) and GitHub Pages free tier.
- **NFR-2 (Privacy)** Application data is private to the two authenticated users. Anonymous queries against any table must be rejected by Row Level Security.
- **NFR-3 (Reliability)** Bill amounts must remain stable after rates change — historical bills must always reflect the rate in force at generation time.
- **NFR-4 (Performance)** Page interactive within 3 seconds on a mid-range Android device on 4G.
- **NFR-5 (Mobile-friendly)** All pages usable on a 360px-wide viewport. Receipt view especially must screenshot to a clean image.
- **NFR-6 (Accessibility)** Form labels associated with inputs; sufficient contrast; keyboard navigation works for all interactive controls.
- **NFR-7 (Observability)** Errors surface to the user via toast (or equivalent); critical errors logged to browser console with enough context to diagnose.
- **NFR-8 (Maintainability)** All code in TypeScript with strict mode. Linter and formatter pass on every commit. Test suite runs in <30 seconds.
- **NFR-9 (Portability)** No vendor lock-in beyond Supabase. SQL schema is plain Postgres; the app could move to a self-hosted Postgres + Auth0 with limited rework.

## 6. Technical Constraints

- **TC-1** Frontend: React 18 + Vite + TypeScript (strict).
- **TC-2** Styling: Tailwind CSS only — no other CSS frameworks.
- **TC-3** Backend: Supabase (Postgres + Auth + RLS). No custom server.
- **TC-4** Hosting: GitHub Pages, deployed via GitHub Actions on push to `main`.
- **TC-5** Receipt-to-image: `html2canvas` (pure client-side; avoids a server-side PDF service).
- **TC-6** Tests: Vitest + React Testing Library. The pure billing calculator has 100% branch coverage.
- **TC-7** Code quality: ESLint + Prettier. CI must pass `npm run lint && npm run typecheck && npm run test && npm run build` before any deploy.
- **TC-8** Currency: PHP throughout. Display with `Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' })` — symbol "₱".
- **TC-9** Time zone: Asia/Manila (UTC+8) for date display; UTC in storage.
- **TC-10** Browser support: latest Chrome (Android + desktop) and latest Edge. Safari support best-effort.

## 7. Data Model (canonical)

See [PLAN.md → Task 3 / 0001_initial_schema.sql] for the initial migration and [Task 4.5 / 0002_per_tenant_rates.sql] for the scope-change migration. Summary tables and constraints (after T4.5):

```sql
tenants (
  id uuid PK,
  name text NOT NULL,
  room_number text NOT NULL,
  type text CHECK IN ('renter','non_renter'),
  monthly_rent numeric(10,2) NULL,
  rent_due_day int CHECK 1..31 NULL,
  has_water boolean DEFAULT false,
  -- T4.5: per-tenant rates + single extras line
  electricity_per_kwh numeric(10,4) NOT NULL DEFAULT 0 CHECK (>= 0),
  water_per_m3 numeric(10,4) NULL CHECK (>= 0),  -- required when has_water=true
  extras_amount numeric(10,2) NOT NULL DEFAULT 0 CHECK (>= 0),
  extras_note text NULL,
  active boolean DEFAULT true,
  created_at timestamptz,
  CHECK ((has_water=true AND water_per_m3 IS NOT NULL) OR has_water=false)
);

-- rates table REMOVED in T4.5 (per-tenant model superseded the global one).

readings (
  id uuid PK,
  tenant_id uuid FK tenants(id) ON DELETE CASCADE,
  period text 'YYYY-MM' NOT NULL,
  reading_date date NOT NULL,
  electricity_reading numeric(12,2),
  water_reading numeric(12,2),
  created_at timestamptz,
  UNIQUE (tenant_id, period)
);

father_water_main_readings (
  id uuid PK,
  period text 'YYYY-MM' UNIQUE,
  reading_date date,
  reading_value numeric(12,2),
  amount_owed_upstream numeric(10,2),
  created_at timestamptz
);

bills (
  id uuid PK,
  tenant_id uuid FK tenants(id),
  period text 'YYYY-MM',
  generated_at timestamptz,
  prev_elec, curr_elec, elec_kwh, elec_rate, elec_amount,
  prev_water, curr_water, water_m3, water_rate, water_amount,
  rent_amount,
  extras_amount numeric(10,2) NULL,  -- T4.5: snapshotted from tenant
  extras_note text NULL,             -- T4.5: snapshotted from tenant
  total_amount numeric NOT NULL,
  status text CHECK IN ('unpaid','paid') DEFAULT 'unpaid',
  paid_date date NULL,
  paid_note text NULL,
  UNIQUE (tenant_id, period)
);
```

**RLS policies:** all four tables (`tenants`, `readings`, `father_water_main_readings`, `bills`) have RLS enabled with a single policy of the form
`(auth.uid() IS NOT NULL)` for `SELECT/INSERT/UPDATE/DELETE` — i.e., any authenticated user can do anything; anonymous users can do nothing.

## 8. Acceptance Criteria

Each criterion is testable in Given/When/Then form. Tasks in `PLAN.md` reference these by ID.

- **AC-0** *Repo bootstrap.* **Given** an empty `Projects` folder, **when** Task 0 completes, **then** `C:\Users\nelvi\Projects\renters-billing\` exists with `docs/SPEC.md`, `PLAN.md`, `AGENTS.md`, `README.md`, `.gitignore` all committed in an initial git commit.

- **AC-0.5** *KB index.* **Given** the `aiagents-workflow` Obsidian vault, **when** Task 0.5 runs, **then** `knowledge show` lists `aiagents-workflow` as an active context and `knowledge search` returns hits from the vault.

- **AC-1** *Live deploy.* **Given** the deployed GitHub Pages URL, **when** the page loads on an Android Chrome browser, **then** a styled placeholder page appears with no console errors and the build pipeline ran green on the latest commit.

- **AC-2** *Auth.* **Given** an unauthenticated visitor, **when** they visit `/`, **then** they are redirected to `/login`. **Given** valid credentials, **when** they submit the login form, **then** they land on `/dashboard` showing their email; **when** they refresh, the session persists; **when** they log out, they return to `/login`.

- **AC-3** *DB & RLS.* **Given** a Supabase anonymous client, **when** it queries any of the 5 tables, **then** the request is denied. **Given** an authenticated client, **when** it performs CRUD, **then** all operations succeed.

- **AC-4** *Tenants CRUD.* **Given** the tenants page, **when** the user adds a renter (name, room#, rent, due-day), **then** the tenant appears in the active list; **when** they deactivate that tenant, **then** it appears under "Inactive" and is excluded from active-tenant lookups.

- **AC-4b** *Per-tenant rates + extras (T4.5).* **Given** the tenants page, **when** the user adds a renter with name / room# / rent / due-day / `electricity_per_kwh` / `water_per_m3` (when has_water) / optional `extras_amount` + `extras_note`, **then** the tenant appears in the active list with all those fields visible. **When** a bill is generated for that renter, **then** `calculateBill()` uses the tenant's per-tenant rates (not a global rate) and the bill total includes any non-zero `extras_amount` snapshotted from the tenant. Old bills retain their snapshotted rates and extras even if the tenant's values are later edited.

- **AC-5** *Calculator (per-tenant rates).* **Given** the test suite for `calculateBill()`, **when** `npm run test` runs, **then** 100% of cases pass including: renter all line items (rent + elec + water + extras), non-renter elec only, no-water renter, zero usage, negative usage throws, missing previous reading is first-month, tenants with different per-tenant rates produce different totals, extras_amount=0 produces no extras line, extras_amount>0 with note snapshots both into the bill, PHP rounding 2dp half-up.

- **AC-6** *Readings entry.* **Given** a chosen period and meter values for all active tenants + father-main, **when** the user saves, **then** `readings` rows exist for every active tenant and one `father_water_main_readings` row exists; **when** the user re-enters values for the same period, **then** the previous values are upserted.

- **AC-7** *Bill generation.* **Given** readings for a period and a current rate, **when** the user clicks "Generate Bills", **then** one `bills` row exists per active tenant with totals matching `calculateBill()` output; **when** the user clicks again, **then** no duplicates are created.

- **AC-8** *Receipt save-as-image.* **Given** an open bill on Android Chrome, **when** the user clicks "Save as image", **then** a PNG downloads matching the on-screen receipt; **when** sent via Messenger, the image renders legibly.

- **AC-9** *Payment.* **Given** an unpaid bill, **when** the user marks it paid (date + optional note), **then** the badge turns green, the receipt shows "PAID on <date>", and the database reflects the change. **When** the user unmarks it, **then** all paid fields revert.

- **AC-10** *Dashboard & history.* **Given** existing bills across multiple periods, **when** the dashboard loads, **then** the summary cards display correct counts and totals for the current month; **when** the user opens history and filters by tenant + period range, **then** the table shows the correct subset and rows are clickable to open the receipt.

- **AC-11** *Father onboarding.* **Given** the father's first-time login on Android, **when** he follows the README quick-start, **then** he can independently view current-month bills, mark / view payments, and browse history without further help.

## 9. Open questions / future considerations

- *Future:* PWA install support so the app can launch from the home screen.
- *Future:* CSV export button in the UI (currently relies on Supabase Studio).
- *Future:* Optional Tagalog UI translation if the father prefers.
- *Future:* OCR meter-reading capture from photos.
- *Future:* Late fees / partial payments if the father's policy changes.

## 10. Document discipline

- This document is the spec. The agent must read it before starting any task.
- Scope changes during implementation must update this file in the same commit.
- The Decision log lives in `PLAN.md`, not here. This file is requirements; the plan tracks how we get there.
