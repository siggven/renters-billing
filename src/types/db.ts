/**
 * Hand-written TypeScript types that mirror the Postgres schema in
 * supabase/migrations/0001_initial_schema.sql.
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
  active: boolean;
  created_at: string;
}

/** Shape passed to createTenant / updateTenant — mirrors Tenant minus server fields. */
export type TenantInput = Omit<Tenant, 'id' | 'created_at'>;

export type BillStatus = 'unpaid' | 'paid';
