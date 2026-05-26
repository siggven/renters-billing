/**
 * Hand-written TypeScript types that mirror the Postgres schema in
 * supabase/migrations/0001_initial_schema.sql + 0002_per_tenant_rates.sql.
 *
 * Kept in sync manually for now (the schema is small and stable). If we ever
 * outgrow this, switch to `supabase gen types typescript --project-id ...`.
 */

export type TenantType = 'renter' | 'non_renter';

export interface Tenant {
  id: string;
  name: string;
  room_number: string;
  type: TenantType;
  /** ₱/month. NULL for non-renters. */
  monthly_rent: number | null;
  /** 1..31. NULL for non-renters. */
  rent_due_day: number | null;
  has_water: boolean;
  /** ₱ per kWh charged to this tenant. T4.5 — replaces the global rates table. */
  electricity_per_kwh: number;
  /** ₱ per m³ charged to this tenant. NULL when has_water=false; required when has_water=true. */
  water_per_m3: number | null;
  /** Flat add-on charged every month (e.g., wifi share). 0 when none. */
  extras_amount: number;
  /** Free-text note describing the extras line (e.g., "wifi 2 devices"). NULL when none. */
  extras_note: string | null;
  active: boolean;
  created_at: string;
}

/** Shape passed to createTenant / updateTenant — mirrors Tenant minus server fields. */
export type TenantInput = Omit<Tenant, 'id' | 'created_at'>;

export type BillStatus = 'unpaid' | 'paid';
