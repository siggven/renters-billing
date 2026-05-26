-- ============================================================================
-- 0003_father_electricity_main_readings.sql — T11 Meralco-tracking
--
-- Adds a parallel table to father_water_main_readings (from 0001) for
-- father's own electricity bookkeeping. The headline column is
-- `amount_billed` — what Meralco actually invoiced father for the period.
-- Optional `reading_value` is the cumulative kWh on the Meralco-side meter
-- for father's records.
--
-- Apply via Supabase Studio:
--   1. Open https://supabase.com/dashboard/project/shqmwzbniisrdsvrefrq/sql/new
--   2. Paste the entire contents of this file
--   3. Click "Run"
--
-- Idempotent: re-running on an already-migrated schema is a no-op (uses
-- `CREATE TABLE IF NOT EXISTS`, `DROP POLICY IF EXISTS` before `CREATE POLICY`,
-- and `CREATE INDEX IF NOT EXISTS`).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.father_electricity_main_readings (
  id            uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  period        text          NOT NULL UNIQUE CHECK (period ~ '^\d{4}-\d{2}$'),
  reading_date  date          NOT NULL,
  -- Headline column: ₱ Meralco billed father this period. Required because
  -- the dashboard's "Meralco bill this month" card is driven by this value.
  amount_billed numeric(10, 2) NOT NULL CHECK (amount_billed >= 0),
  -- Optional informational meter reading on the Meralco side. Father may or
  -- may not bother to record it.
  reading_value numeric(12, 2) CHECK (reading_value IS NULL OR reading_value >= 0),
  created_at    timestamptz   NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 2. Row Level Security — same shape as every other table: authenticated
--    users get full access; anonymous users get nothing.
-- ----------------------------------------------------------------------------
ALTER TABLE public.father_electricity_main_readings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "father_electricity_main_readings: authenticated full access"
  ON public.father_electricity_main_readings;
CREATE POLICY "father_electricity_main_readings: authenticated full access"
  ON public.father_electricity_main_readings
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- Verification (manual — run in SQL editor after applying):
--
--   SELECT relname, relrowsecurity
--   FROM pg_class
--   WHERE relname = 'father_electricity_main_readings';
--   -- expect: 1 row, relrowsecurity = true
--
--   SELECT policyname, cmd, roles
--   FROM pg_policies
--   WHERE tablename = 'father_electricity_main_readings';
--   -- expect: 1 row, cmd='ALL', roles='{authenticated}'
--
-- After verifying, run `npm run smoke` locally to confirm RLS is enforced
-- end-to-end (the smoke script is updated in this same commit to include the
-- new table in the anon-deny + authed-SELECT lists).
-- ============================================================================
