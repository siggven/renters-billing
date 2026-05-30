import type { TenantInput } from '../types/db';

/**
 * Field-level validation errors. Empty object means valid.
 * Keyed by the same field name as TenantInput.
 */
export type ValidationErrors<T> = Partial<Record<keyof T, string>>;

/**
 * Validate a tenant input against the SPEC's FR-5/FR-6 rules.
 *
 * Rules (mirroring the SQL CHECK constraints in 0001_initial_schema.sql +
 * 0002_per_tenant_rates.sql):
 *  - name: required, non-empty after trim
 *  - room_number: required, non-empty after trim
 *  - type: must be 'renter' or 'non_renter'
 *  - if type=renter:
 *      monthly_rent: required, must be >= 0
 *      rent_due_day: required, integer 1..31
 *  - if type=non_renter:
 *      monthly_rent must be null
 *      rent_due_day must be null
 *  - has_water: any boolean (no constraint by type — non-renters typically false but allowed)
 *  - electricity_per_kwh: required, finite, > 0
 *      (DB allows >= 0, but a real tenant always pays *some* per-kWh; 0 here
 *      is almost certainly a forgotten field, so we surface it.)
 *  - water_per_m3:
 *      - if has_water=true: required, finite, > 0 (same reasoning as elec)
 *      - if has_water=false: must be null
 *  - extras_amount: required, finite, >= 0 (0 = no extras line)
 *  - extras_note: optional; when extras_amount > 0 we don't require a note,
 *      but it's encouraged for clarity.
 */
export function validateTenant(
  input: TenantInput,
): ValidationErrors<TenantInput> {
  const errors: ValidationErrors<TenantInput> = {};

  if (!input.name?.trim()) {
    errors.name = 'Name is required';
  }

  if (!input.room_number?.trim()) {
    errors.room_number = 'Room number is required';
  }

  if (input.type !== 'renter' && input.type !== 'non_renter') {
    errors.type = 'Type must be renter or non-renter';
  }

  if (input.type === 'renter') {
    if (
      input.monthly_rent === null ||
      input.monthly_rent === undefined ||
      Number.isNaN(input.monthly_rent) ||
      input.monthly_rent < 0
    ) {
      errors.monthly_rent =
        'Monthly rent is required (must be 0 or a positive number)';
    }
    if (
      input.rent_due_day === null ||
      input.rent_due_day === undefined ||
      !Number.isInteger(input.rent_due_day) ||
      input.rent_due_day < 1 ||
      input.rent_due_day > 31
    ) {
      errors.rent_due_day = 'Due day must be a whole number between 1 and 31';
    }
  } else if (input.type === 'non_renter') {
    if (input.monthly_rent !== null && input.monthly_rent !== undefined) {
      errors.monthly_rent = 'Non-renters do not have rent';
    }
    if (input.rent_due_day !== null && input.rent_due_day !== undefined) {
      errors.rent_due_day = 'Non-renters do not have a rent due day';
    }
  }

  // Electricity rate (everyone pays per kWh)
  if (
    input.electricity_per_kwh === null ||
    input.electricity_per_kwh === undefined ||
    !Number.isFinite(input.electricity_per_kwh) ||
    input.electricity_per_kwh <= 0
  ) {
    errors.electricity_per_kwh =
      'Electricity rate is required (₱/kWh, must be greater than 0)';
  }

  // Water rate — required only when tenant has a water sub-meter
  if (input.has_water) {
    if (
      input.water_per_m3 === null ||
      input.water_per_m3 === undefined ||
      !Number.isFinite(input.water_per_m3) ||
      input.water_per_m3 <= 0
    ) {
      errors.water_per_m3 =
        'Water rate is required when the tenant has a water sub-meter (₱/m³, must be greater than 0)';
    }
  } else {
    // has_water=false → water_per_m3 must be null
    if (input.water_per_m3 !== null && input.water_per_m3 !== undefined) {
      errors.water_per_m3 =
        'Water rate must be empty when the tenant has no water sub-meter';
    }
  }

  // Extras (everyone — defaults to 0)
  if (
    input.extras_amount === null ||
    input.extras_amount === undefined ||
    !Number.isFinite(input.extras_amount) ||
    input.extras_amount < 0
  ) {
    errors.extras_amount = 'Extras amount must be 0 or a positive number';
  }

  return errors;
}

/** True if the validation result has no errors. */
export function isValid<T>(errors: ValidationErrors<T>): boolean {
  return Object.keys(errors).length === 0;
}

// ── Reading validation (T6) ────────────────────────────────────────────────

import { isValidPeriod } from './period';

/**
 * Inputs for validateReading. Pure — no I/O. The caller (Readings page) is
 * responsible for fetching prev readings from the DB and passing them in.
 */
export interface ValidateReadingArgs {
  /** 'YYYY-MM' for this reading's period. */
  period: string;
  /** 'YYYY-MM-DD' the reading was taken on (defaults to last day of period). */
  reading_date: string;
  /** Cumulative electricity meter value at reading_date. NULL = field blank. */
  electricity_reading: number | null;
  /** Cumulative water meter value. NULL = blank or tenant has no sub-meter. */
  water_reading: number | null;
  /** Most recent prior electricity reading for this tenant. NULL = first month. */
  prevElectricity: number | null;
  /** Most recent prior water reading for this tenant. NULL = first month / no sub-meter. */
  prevWater: number | null;
  /** Drives the water-vs-no-sub-meter invariant. */
  hasWater: boolean;
}

type ReadingErrorKey =
  | 'period'
  | 'reading_date'
  | 'electricity_reading'
  | 'water_reading';

/**
 * Validate a single reading row. Returns field-level errors keyed by the
 * matching column on the readings table. An empty object means valid.
 *
 * Rules (mirroring SPEC FR-12 + FR-14 and the SQL CHECK constraints):
 *  - period: must match 'YYYY-MM'
 *  - reading_date: must match 'YYYY-MM-DD' and be a real calendar date
 *  - electricity_reading (when present): finite, >= 0; >= prevElectricity if set
 *  - water_reading:
 *      - if hasWater=false: must be null (entering water for a non-meter tenant
 *        is a UI invariant violation; the page hides the field anyway, but we
 *        guard against bypass)
 *      - if hasWater=true and present: finite, >= 0; >= prevWater if set
 *  - "blank" rows (both numerics null) are valid — the caller filters them out
 *    before save.
 */
export function validateReading(
  args: ValidateReadingArgs,
): Partial<Record<ReadingErrorKey, string>> {
  const errors: Partial<Record<ReadingErrorKey, string>> = {};

  if (!isValidPeriod(args.period)) {
    errors.period = 'Period must be YYYY-MM';
  }

  if (!args.reading_date) {
    errors.reading_date = 'Reading date is required';
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(args.reading_date)) {
    errors.reading_date = 'Reading date must be YYYY-MM-DD';
  } else {
    // Verify it's a real calendar date — JS Date will silently roll '2026-02-30'
    // forward to '2026-03-02', which we want to reject.
    const [y, m, d] = args.reading_date.split('-').map(Number);
    const probe = new Date(Date.UTC(y, m - 1, d));
    if (
      probe.getUTCFullYear() !== y ||
      probe.getUTCMonth() !== m - 1 ||
      probe.getUTCDate() !== d
    ) {
      errors.reading_date = 'Reading date is not a real calendar date';
    }
  }

  // Electricity
  if (
    args.electricity_reading !== null &&
    args.electricity_reading !== undefined
  ) {
    if (
      !Number.isFinite(args.electricity_reading) ||
      args.electricity_reading < 0
    ) {
      errors.electricity_reading = 'Electricity reading must be ≥ 0';
    } else if (
      args.prevElectricity !== null &&
      args.prevElectricity !== undefined &&
      args.electricity_reading < args.prevElectricity
    ) {
      errors.electricity_reading = `Electricity reading must be ≥ previous (${args.prevElectricity})`;
    }
  }

  // Water
  if (!args.hasWater) {
    if (args.water_reading !== null && args.water_reading !== undefined) {
      errors.water_reading =
        'Water reading is not allowed for tenants without a water sub-meter';
    }
  } else if (args.water_reading !== null && args.water_reading !== undefined) {
    if (!Number.isFinite(args.water_reading) || args.water_reading < 0) {
      errors.water_reading = 'Water reading must be ≥ 0';
    } else if (
      args.prevWater !== null &&
      args.prevWater !== undefined &&
      args.water_reading < args.prevWater
    ) {
      errors.water_reading = `Water reading must be ≥ previous (${args.prevWater})`;
    }
  }

  return errors;
}
