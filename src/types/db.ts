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

// ── Readings ────────────────────────────────────────────────────────────────

/**
 * Per-tenant monthly meter reading. UNIQUE (tenant_id, period) — re-saving the
 * same period upserts the existing row.
 */
export interface Reading {
  id: string;
  tenant_id: string;
  /** 'YYYY-MM' (text), enforced by SQL regex. */
  period: string;
  /** 'YYYY-MM-DD' — defaults to the last day of the period. */
  reading_date: string;
  /** Cumulative meter value (NOT consumption). NULL when not yet recorded. */
  electricity_reading: number | null;
  /** Cumulative meter value. NULL for non-renters and tenants with has_water=false. */
  water_reading: number | null;
  created_at: string;
}

/** Shape passed to upsertReading. */
export type ReadingInput = Omit<Reading, 'id' | 'created_at'>;

/**
 * Father's water-main reading — sub-meter from the upstream owner. Informational:
 * tells the user how much father owes upstream that month. Not billed back to renters.
 */
export interface FatherWaterMainReading {
  id: string;
  period: string;
  reading_date: string;
  /** Cumulative meter value at the main meter. */
  reading_value: number;
  /** ₱ owed to the upstream owner this period. NULL = unknown. */
  amount_owed_upstream: number | null;
  created_at: string;
}

export type FatherWaterMainReadingInput = Omit<
  FatherWaterMainReading,
  'id' | 'created_at'
>;

/**
 * Father's Meralco-side bookkeeping per period (T11). The headline column is
 * `amount_billed` — what Meralco actually invoiced. `reading_value` is an
 * optional kWh reading for father's own records.
 */
export interface FatherElectricityMainReading {
  id: string;
  period: string;
  reading_date: string;
  /** ₱ Meralco billed father this period. */
  amount_billed: number;
  /** Cumulative kWh on the Meralco-side meter. NULL = not recorded. */
  reading_value: number | null;
  created_at: string;
}

export type FatherElectricityMainReadingInput = Omit<
  FatherElectricityMainReading,
  'id' | 'created_at'
>;

// ── Bills ───────────────────────────────────────────────────────────────────

export type BillStatus = 'unpaid' | 'paid';

/**
 * A generated bill row. Snapshots all rate values, the extras line, and the
 * meter readings used at generation time so historical bills never change
 * when a tenant's rates or extras are later edited.
 *
 * UNIQUE (tenant_id, period) — bill generation is idempotent (FR-21).
 */
export interface Bill {
  id: string;
  tenant_id: string;
  period: string;
  generated_at: string;

  // electricity line
  prev_elec: number | null;
  curr_elec: number | null;
  elec_kwh: number | null;
  elec_rate: number | null;
  elec_amount: number | null;

  // water line — null for non-renters and tenants with has_water=false
  prev_water: number | null;
  curr_water: number | null;
  water_m3: number | null;
  water_rate: number | null;
  water_amount: number | null;

  // rent — null for non-renters
  rent_amount: number | null;

  // extras (T4.5) — snapshotted from tenant; 0 when no extras
  extras_amount: number | null;
  extras_note: string | null;

  total_amount: number;
  status: BillStatus;
  paid_date: string | null;
  paid_note: string | null;
}

/** Insert shape — server fills `id`, `generated_at`, defaults `status='unpaid'`. */
export type BillInsert = Omit<
  Bill,
  'id' | 'generated_at' | 'status' | 'paid_date' | 'paid_note'
> & {
  // Allow callers to opt into setting these explicitly if needed.
  status?: BillStatus;
  paid_date?: string | null;
  paid_note?: string | null;
};
