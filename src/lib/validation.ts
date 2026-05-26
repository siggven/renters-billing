import type { RateInput, TenantInput } from '../types/db';

/**
 * Field-level validation errors. Empty object means valid.
 * Keyed by the same field name as TenantInput.
 */
export type ValidationErrors<T> = Partial<Record<keyof T, string>>;

/**
 * Validate a tenant input against the SPEC's FR-5/FR-6 rules.
 *
 * Rules (mirroring the SQL CHECK constraints in 0001_initial_schema.sql):
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

  return errors;
}

/** True if the validation result has no errors. */
export function isValid<T>(errors: ValidationErrors<T>): boolean {
  return Object.keys(errors).length === 0;
}



/**
 * Validate a rate input against SPEC FR-8/FR-9/FR-10.
 *
 * Rules:
 *  - effective_date: required, valid YYYY-MM-DD, parseable as a real date
 *  - electricity_per_kwh: required, finite number >= 0
 *  - water_per_m3: required, finite number >= 0
 *  - notes: optional
 */
export function validateRate(input: RateInput): ValidationErrors<RateInput> {
  const errors: ValidationErrors<RateInput> = {};

  if (!input.effective_date) {
    errors.effective_date = 'Effective date is required';
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(input.effective_date)) {
    errors.effective_date = 'Effective date must be YYYY-MM-DD';
  } else {
    const d = new Date(input.effective_date);
    if (Number.isNaN(d.getTime())) {
      errors.effective_date = 'Effective date is not a real date';
    }
  }

  if (
    input.electricity_per_kwh === null ||
    input.electricity_per_kwh === undefined ||
    !Number.isFinite(input.electricity_per_kwh) ||
    input.electricity_per_kwh < 0
  ) {
    errors.electricity_per_kwh = 'Electricity rate is required (₱/kWh, ≥ 0)';
  }

  if (
    input.water_per_m3 === null ||
    input.water_per_m3 === undefined ||
    !Number.isFinite(input.water_per_m3) ||
    input.water_per_m3 < 0
  ) {
    errors.water_per_m3 = 'Water rate is required (₱/m³, ≥ 0)';
  }

  return errors;
}
