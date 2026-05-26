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
 *      monthly_rent: required, must be > 0
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
export function validateTenant(input: TenantInput): ValidationErrors<TenantInput> {
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
      input.monthly_rent <= 0
    ) {
      errors.monthly_rent = 'Monthly rent is required (must be greater than 0)';
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
      errors.water_per_m3 = 'Water rate must be empty when the tenant has no water sub-meter';
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
