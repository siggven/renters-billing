-- ============================================================================
-- 0001_initial_schema.sql — renters-billing initial database schema
--
-- Apply via Supabase Studio:
--   1. Open https://supabase.com/dashboard/project/shqmwzbniisrdsvrefrq/sql/new
--   2. Paste the entire contents of this file
--   3. Click "Run"
--
-- The script is idempotent: re-running it is safe (uses IF NOT EXISTS and
-- DROP POLICY IF EXISTS guards). It creates 5 tables, supporting indexes,
-- and Row Level Security policies that allow CRUD for any authenticated
-- user and reject all anonymous access.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Extensions
-- ----------------------------------------------------------------------------
-- pgcrypto provides gen_random_uuid(). Enabled by default on Supabase but
-- declared here for portability if the schema is ever moved to plain Postgres.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- tenants — 3 renters + 1 non-renter
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.tenants (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text        NOT NULL,
  room_number     text        NOT NULL,
  type            text        NOT NULL CHECK (type IN ('renter', 'non_renter')),
  monthly_rent    numeric(10, 2),
  rent_due_day    int         CHECK (rent_due_day BETWEEN 1 AND 31),
  has_water       boolean     NOT NULL DEFAULT false,
  active          boolean     NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),

  -- Renters must have a rent amount and a due day; non-renters must not.
  CONSTRAINT renter_must_have_rent
    CHECK (
      (type = 'renter'     AND monthly_rent IS NOT NULL) OR
      (type = 'non_renter' AND monthly_rent IS NULL)
    ),
  CONSTRAINT renter_must_have_due_day
    CHECK (
      (type = 'renter'     AND rent_due_day IS NOT NULL) OR
      (type = 'non_renter' AND rent_due_day IS NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_tenants_active ON public.tenants(active);

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenants: authenticated full access" ON public.tenants;
CREATE POLICY "tenants: authenticated full access"
  ON public.tenants
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- rates — append-only price history; latest by effective_date is the current
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.rates (
  id                   uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  effective_date       date          NOT NULL UNIQUE,
  electricity_per_kwh  numeric(10,4) NOT NULL CHECK (electricity_per_kwh >= 0),
  water_per_m3         numeric(10,4) NOT NULL CHECK (water_per_m3 >= 0),
  notes                text,
  created_at           timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rates_effective_date ON public.rates(effective_date DESC);

ALTER TABLE public.rates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rates: authenticated full access" ON public.rates;
CREATE POLICY "rates: authenticated full access"
  ON public.rates
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- readings — monthly meter readings per tenant (period in YYYY-MM format)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.readings (
  id                   uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            uuid          NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  period               text          NOT NULL CHECK (period ~ '^\d{4}-\d{2}$'),
  reading_date         date          NOT NULL,
  electricity_reading  numeric(12,2) CHECK (electricity_reading >= 0),
  water_reading        numeric(12,2) CHECK (water_reading >= 0),
  created_at           timestamptz   NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, period)
);

CREATE INDEX IF NOT EXISTS idx_readings_period       ON public.readings(period);
CREATE INDEX IF NOT EXISTS idx_readings_tenant_period ON public.readings(tenant_id, period DESC);

ALTER TABLE public.readings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "readings: authenticated full access" ON public.readings;
CREATE POLICY "readings: authenticated full access"
  ON public.readings
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- father_water_main_readings — upstream sub-meter reading and amount owed
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.father_water_main_readings (
  id                   uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  period               text          NOT NULL UNIQUE CHECK (period ~ '^\d{4}-\d{2}$'),
  reading_date         date          NOT NULL,
  reading_value        numeric(12,2) NOT NULL CHECK (reading_value >= 0),
  amount_owed_upstream numeric(10,2) CHECK (amount_owed_upstream >= 0),
  created_at           timestamptz   NOT NULL DEFAULT now()
);

ALTER TABLE public.father_water_main_readings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "father_water_main_readings: authenticated full access"
  ON public.father_water_main_readings;
CREATE POLICY "father_water_main_readings: authenticated full access"
  ON public.father_water_main_readings
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- bills — generated per tenant per period; rate values are snapshotted so
-- historical bills never change when rates are updated
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.bills (
  id            uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid          NOT NULL REFERENCES public.tenants(id),
  period        text          NOT NULL CHECK (period ~ '^\d{4}-\d{2}$'),
  generated_at  timestamptz   NOT NULL DEFAULT now(),

  -- electricity line
  prev_elec     numeric(12,2),
  curr_elec     numeric(12,2),
  elec_kwh      numeric(12,2),
  elec_rate     numeric(10,4),
  elec_amount   numeric(10,2),

  -- water line (NULL for non-renter and any tenant with has_water=false)
  prev_water    numeric(12,2),
  curr_water    numeric(12,2),
  water_m3      numeric(12,2),
  water_rate    numeric(10,4),
  water_amount  numeric(10,2),

  -- rent (NULL for non-renter)
  rent_amount   numeric(10,2),

  -- final total + payment status
  total_amount  numeric(10,2) NOT NULL CHECK (total_amount >= 0),
  status        text          NOT NULL DEFAULT 'unpaid'
                              CHECK (status IN ('unpaid', 'paid')),
  paid_date     date,
  paid_note     text,

  UNIQUE (tenant_id, period)
);

CREATE INDEX IF NOT EXISTS idx_bills_period       ON public.bills(period);
CREATE INDEX IF NOT EXISTS idx_bills_status       ON public.bills(status);
CREATE INDEX IF NOT EXISTS idx_bills_tenant_period ON public.bills(tenant_id, period DESC);

ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bills: authenticated full access" ON public.bills;
CREATE POLICY "bills: authenticated full access"
  ON public.bills
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- Smoke check at apply time — useful for confirming RLS is set the way we
-- think it is. Comment-only so the script doesn't error on re-run.
-- ============================================================================
-- After running this migration, verify with:
--
--   SELECT relname, relrowsecurity
--   FROM pg_class
--   WHERE relname IN ('tenants','rates','readings','father_water_main_readings','bills');
--
-- All five rows should show relrowsecurity = true.
--
-- Then verify policies are in place:
--
--   SELECT tablename, policyname, cmd, roles
--   FROM pg_policies
--   WHERE schemaname = 'public'
--   ORDER BY tablename;
--
-- You should see one policy per table, all with cmd='ALL' and roles='{authenticated}'.
