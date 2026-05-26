/**
 * Pure billing calculator. No I/O, no side effects, fully covered by
 * src/__tests__/billing.test.ts. This is the heart of the app — every bill
 * the system generates flows through this function and snapshots its rate
 * + extras values into the bills table so historical bills don't change
 * when the tenant's rates or extras are edited later.
 *
 * SPEC: docs/SPEC.md FR-18..FR-22, AC-4b, AC-5
 *
 * Design note (T4.5): rates used to live on a global `rates` table and were
 * passed to this function. We discovered each tenant actually has their own
 * ₱/kWh and ₱/m³ (plus a flat extras line like wifi), so the rate now comes
 * straight from the Tenant. The bills row continues to snapshot `elec_rate`,
 * `water_rate`, `extras_amount`, and `extras_note` so old bills stay frozen.
 */

import type { Tenant } from '../types/db';

export class InvalidReadingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidReadingError';
  }
}

export interface CalculateBillInput {
  tenant: Tenant;
  /** Previous-period electricity reading. NULL = first month for elec. */
  prevElec: number | null;
  /** Current-period electricity reading. NULL = no elec reading entered. */
  currElec: number | null;
  /** Previous-period water reading. NULL = first month for water. */
  prevWater: number | null;
  /** Current-period water reading. NULL = no water reading. Ignored if tenant.has_water=false. */
  currWater: number | null;
  /** Whether to include rent on this bill. Defaults to true (renters always pay rent). */
  includeRent?: boolean;
}

/** Shape matches the bills-table columns so T7 can pass this straight to INSERT. */
export interface BillSnapshot {
  prev_elec: number | null;
  curr_elec: number | null;
  elec_kwh: number | null;
  elec_rate: number | null;
  elec_amount: number | null;
  prev_water: number | null;
  curr_water: number | null;
  water_m3: number | null;
  water_rate: number | null;
  water_amount: number | null;
  rent_amount: number | null;
  /** Snapshotted from tenant.extras_amount at calc time. Always a number; 0 = no extras. */
  extras_amount: number;
  /** Snapshotted from tenant.extras_note. NULL when tenant has no note. */
  extras_note: string | null;
  total_amount: number;
  /** True when at least one consumption line is a first reading (no prev). */
  is_first_reading: boolean;
}

/**
 * Round to 2 decimal places using half-up (away-from-zero) rounding.
 * `Math.round(n * 100)` rounds .5 up for positive numbers, which is the
 * Philippine banking convention for currency. The +Number.EPSILON nudge
 * defends against IEEE-754 representation artifacts (e.g., 0.1 + 0.2).
 */
function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function calculateBill(input: CalculateBillInput): BillSnapshot {
  const {
    tenant,
    prevElec,
    currElec,
    prevWater,
    currWater,
    includeRent = true,
  } = input;

  // ── Electricity ────────────────────────────────────────────────────────
  let elec_kwh: number | null = null;
  let elec_rate: number | null = null;
  let elec_amount: number | null = null;
  let isFirstElec = false;

  if (currElec !== null && currElec !== undefined) {
    if (prevElec === null || prevElec === undefined) {
      // First reading — consumption is 0, rent (if any) still applies.
      elec_kwh = 0;
      elec_rate = tenant.electricity_per_kwh;
      elec_amount = 0;
      isFirstElec = true;
    } else {
      if (currElec < prevElec) {
        throw new InvalidReadingError(
          `Electricity reading went backwards: prev=${prevElec}, curr=${currElec}`,
        );
      }
      elec_kwh = round2(currElec - prevElec);
      elec_rate = tenant.electricity_per_kwh;
      elec_amount = round2(elec_kwh * elec_rate);
    }
  }

  // ── Water (only when tenant has a water sub-meter) ────────────────────
  let water_m3: number | null = null;
  let water_rate: number | null = null;
  let water_amount: number | null = null;
  let isFirstWater = false;
  let prev_water_snap: number | null = null;
  let curr_water_snap: number | null = null;

  if (tenant.has_water && currWater !== null && currWater !== undefined) {
    prev_water_snap = prevWater ?? null;
    curr_water_snap = currWater;

    // tenant.water_per_m3 should be non-null when has_water=true (enforced by
    // both validation and SQL CHECK). Defensive `?? 0` is a belt-and-braces
    // measure for the type system.
    const waterRate = tenant.water_per_m3 ?? 0;

    if (prevWater === null || prevWater === undefined) {
      water_m3 = 0;
      water_rate = waterRate;
      water_amount = 0;
      isFirstWater = true;
    } else {
      if (currWater < prevWater) {
        throw new InvalidReadingError(
          `Water reading went backwards: prev=${prevWater}, curr=${currWater}`,
        );
      }
      water_m3 = round2(currWater - prevWater);
      water_rate = waterRate;
      water_amount = round2(water_m3 * waterRate);
    }
  }

  // ── Rent (renters only, when includeRent flag is set) ─────────────────
  const rent_amount =
    tenant.type === 'renter' && includeRent ? (tenant.monthly_rent ?? 0) : null;

  // ── Extras (always snapshotted; defaults to 0 + null note) ────────────
  const extras_amount = round2(tenant.extras_amount ?? 0);
  const extras_note = tenant.extras_note ?? null;

  // ── Total ─────────────────────────────────────────────────────────────
  const total_amount = round2(
    (elec_amount ?? 0) +
      (water_amount ?? 0) +
      (rent_amount ?? 0) +
      extras_amount,
  );

  return {
    prev_elec: prevElec ?? null,
    curr_elec: currElec ?? null,
    elec_kwh,
    elec_rate,
    elec_amount,
    prev_water: prev_water_snap,
    curr_water: curr_water_snap,
    water_m3,
    water_rate,
    water_amount,
    rent_amount,
    extras_amount,
    extras_note,
    total_amount,
    is_first_reading: isFirstElec || isFirstWater,
  };
}
