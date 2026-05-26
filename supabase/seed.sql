-- ============================================================================
-- seed.sql — OPTIONAL placeholder data
--
-- This file is OPTIONAL. The renters-billing UI (T4 and T5) lets you add
-- tenants and rates directly. If you want some starter rows so the schema
-- isn't empty when you first log in, paste this into Supabase Studio's SQL
-- Editor and click "Run". You can edit or delete these rows later via the UI.
--
-- These are DELIBERATELY low/round values with "REPLACE" labels so it's
-- obvious they aren't real billing data.
-- ============================================================================

-- 4 placeholder tenants (3 renters + 1 non-renter)
INSERT INTO public.tenants (name, room_number, type, monthly_rent, rent_due_day, has_water, active)
VALUES
  ('REPLACE — Renter Room 1',  'Room 1',   'renter',     1.00,  5, true,  true),
  ('REPLACE — Renter Room 2',  'Room 2',   'renter',     1.00,  5, true,  true),
  ('REPLACE — Renter Room 3',  'Room 3',   'renter',     1.00, 15, true,  true),
  ('REPLACE — Non-renter',     'Neighbor', 'non_renter', NULL, NULL, false, true)
ON CONFLICT DO NOTHING;

-- One placeholder rate. Set effective_date = first of this month so it
-- applies to the current period. Replace with real values via the Rates page.
INSERT INTO public.rates (effective_date, electricity_per_kwh, water_per_m3, notes)
VALUES
  (date_trunc('month', current_date)::date, 1.0000, 1.0000,
   'REPLACE — placeholder rate. Set real values via Rates page in the app.')
ON CONFLICT (effective_date) DO NOTHING;
