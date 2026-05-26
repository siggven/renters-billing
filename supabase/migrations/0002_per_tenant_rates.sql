-- ============================================================================
-- 0002_per_tenant_rates.sql — T4.5 scope-change migration
--
-- Replaces the global `rates` table with per-tenant rate columns on `tenants`,
-- and adds a single optional extras line per tenant (with snapshots on bills).
--
-- Apply via Supabase Studio:
--   1. Open https://supabase.com/dashboard/project/shqmwzbniisrdsvrefrq/sql/new
--   2. Paste the entire contents of this file
--   3. Click "Run"
--
-- The script is idempotent: re-running it on an already-migrated schema is a
-- no-op. The TRUNCATE on the first apply wipes all tenants/readings/bills —
-- this is intentional. T4 captured no real production data; the user
-- explicitly confirmed the wipe (see PLAN.md Decision log 2026-05-26).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Wipe existing data (one-time on first apply; no-op on re-run when empty)
--
--    TRUNCATE … RESTART IDENTITY CASCADE leaves tables empty and resets any
--    sequences. CASCADE is required because `bills` and `readings` reference
--    `tenants.id`. Running TRUNCATE on already-empty tables is a no-op.
-- ----------------------------------------------------------------------------
TRUNCATE public.bills, public.readings, public.tenants RESTART IDENTITY CASCADE;

-- ----------------------------------------------------------------------------
-- 2. Drop the global rates table — rates are now per-tenant.
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS public.rates CASCADE;

-- ----------------------------------------------------------------------------
-- 3. Add per-tenant rate columns + extras line to `tenants`.
--
--    electricity_per_kwh — required for everyone (default 0 keeps the column
--    NOT NULL on insert when the form forgets to send it; app validation
--    enforces > 0 for real tenants).
--    water_per_m3 — nullable; required only when has_water=true (enforced by
--    constraint below).
--    extras_amount + extras_note — single optional flat add-on per tenant
--    (e.g., "wifi 2 devices ₱300"). Default 0; NULL note when no extras.
-- ----------------------------------------------------------------------------
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS electricity_per_kwh numeric(10, 4) NOT NULL DEFAULT 0;

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS water_per_m3        numeric(10, 4);

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS extras_amount       numeric(10, 2) NOT NULL DEFAULT 0;

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS extras_note         text;

-- ----------------------------------------------------------------------------
-- 4. CHECK constraints.
--
--    Drop-then-create pattern so re-running the migration after constraint
--    edits is safe (Postgres doesn't have CREATE CONSTRAINT IF NOT EXISTS).
-- ----------------------------------------------------------------------------
ALTER TABLE public.tenants
  DROP CONSTRAINT IF EXISTS tenants_electricity_per_kwh_nonneg;
ALTER TABLE public.tenants
  ADD  CONSTRAINT tenants_electricity_per_kwh_nonneg
       CHECK (electricity_per_kwh >= 0);

ALTER TABLE public.tenants
  DROP CONSTRAINT IF EXISTS tenants_water_per_m3_nonneg;
ALTER TABLE public.tenants
  ADD  CONSTRAINT tenants_water_per_m3_nonneg
       CHECK (water_per_m3 IS NULL OR water_per_m3 >= 0);

ALTER TABLE public.tenants
  DROP CONSTRAINT IF EXISTS tenants_extras_amount_nonneg;
ALTER TABLE public.tenants
  ADD  CONSTRAINT tenants_extras_amount_nonneg
       CHECK (extras_amount >= 0);

-- has_water=true ⇒ water_per_m3 IS NOT NULL.
-- has_water=false ⇒ water_per_m3 may be NULL or set; we don't force NULL
--   because a tenant might toggle has_water back on later.
ALTER TABLE public.tenants
  DROP CONSTRAINT IF EXISTS tenants_has_water_requires_water_rate;
ALTER TABLE public.tenants
  ADD  CONSTRAINT tenants_has_water_requires_water_rate
       CHECK (has_water = false OR water_per_m3 IS NOT NULL);

-- ----------------------------------------------------------------------------
-- 5. Snapshot extras onto bills (so historical bills don't change when the
--    tenant's extras_amount/note is later edited).
-- ----------------------------------------------------------------------------
ALTER TABLE public.bills
  ADD COLUMN IF NOT EXISTS extras_amount numeric(10, 2);

ALTER TABLE public.bills
  ADD COLUMN IF NOT EXISTS extras_note   text;

ALTER TABLE public.bills
  DROP CONSTRAINT IF EXISTS bills_extras_amount_nonneg;
ALTER TABLE public.bills
  ADD  CONSTRAINT bills_extras_amount_nonneg
       CHECK (extras_amount IS NULL OR extras_amount >= 0);

-- ============================================================================
-- Verification (manual — run in SQL editor after applying):
--
--   -- Confirm rates table is gone
--   SELECT to_regclass('public.rates');                  -- expect: NULL
--
--   -- Confirm new tenant columns exist
--   SELECT column_name, data_type, is_nullable, column_default
--   FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='tenants'
--     AND column_name IN ('electricity_per_kwh','water_per_m3','extras_amount','extras_note')
--   ORDER BY column_name;
--
--   -- Confirm new bills columns exist
--   SELECT column_name, data_type, is_nullable
--   FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='bills'
--     AND column_name IN ('extras_amount','extras_note');
--
--   -- Confirm CHECK constraints
--   SELECT conname FROM pg_constraint
--   WHERE conrelid = 'public.tenants'::regclass AND contype='c'
--   ORDER BY conname;
--
-- After verifying, run `npm run smoke` locally to confirm RLS is still enforced.
-- ============================================================================
