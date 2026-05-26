import { describe, it, expect } from 'vitest';
import { isValid, validateTenant } from '../lib/validation';
import type { TenantInput } from '../types/db';

const baseRenter: TenantInput = {
  name: 'Juan',
  room_number: 'Room 1',
  type: 'renter',
  monthly_rent: 3500,
  rent_due_day: 5,
  has_water: true,
  electricity_per_kwh: 27,
  water_per_m3: 30,
  extras_amount: 0,
  extras_note: null,
  active: true,
};

const baseNonRenter: TenantInput = {
  name: 'Mang Ben',
  room_number: 'Neighbor',
  type: 'non_renter',
  monthly_rent: null,
  rent_due_day: null,
  has_water: false,
  electricity_per_kwh: 27,
  water_per_m3: null,
  extras_amount: 0,
  extras_note: null,
  active: true,
};

describe('validateTenant — renter', () => {
  it('accepts a valid renter', () => {
    expect(isValid(validateTenant(baseRenter))).toBe(true);
  });

  it('rejects empty name', () => {
    expect(validateTenant({ ...baseRenter, name: '' }).name).toBeDefined();
  });

  it('rejects whitespace-only name', () => {
    expect(validateTenant({ ...baseRenter, name: '   ' }).name).toBeDefined();
  });

  it('rejects empty room_number', () => {
    expect(validateTenant({ ...baseRenter, room_number: '' }).room_number).toBeDefined();
  });

  it('requires monthly_rent for renters', () => {
    expect(validateTenant({ ...baseRenter, monthly_rent: null }).monthly_rent).toBeDefined();
  });

  it('rejects zero or negative rent', () => {
    expect(validateTenant({ ...baseRenter, monthly_rent: 0 }).monthly_rent).toBeDefined();
    expect(validateTenant({ ...baseRenter, monthly_rent: -1 }).monthly_rent).toBeDefined();
  });

  it('rejects NaN rent', () => {
    expect(validateTenant({ ...baseRenter, monthly_rent: Number.NaN }).monthly_rent).toBeDefined();
  });

  it('requires rent_due_day for renters', () => {
    expect(validateTenant({ ...baseRenter, rent_due_day: null }).rent_due_day).toBeDefined();
  });

  it.each([0, 32, -1, 100, 1.5])(
    'rejects out-of-range / non-integer rent_due_day: %s',
    (day) => {
      expect(validateTenant({ ...baseRenter, rent_due_day: day }).rent_due_day).toBeDefined();
    },
  );

  it.each([1, 5, 15, 31])('accepts valid rent_due_day: %s', (day) => {
    expect(validateTenant({ ...baseRenter, rent_due_day: day }).rent_due_day).toBeUndefined();
  });
});

describe('validateTenant — non_renter', () => {
  it('accepts a valid non-renter', () => {
    expect(isValid(validateTenant(baseNonRenter))).toBe(true);
  });

  it('rejects monthly_rent on a non-renter', () => {
    expect(
      validateTenant({ ...baseNonRenter, monthly_rent: 1000 }).monthly_rent,
    ).toBeDefined();
  });

  it('rejects rent_due_day on a non-renter', () => {
    expect(
      validateTenant({ ...baseNonRenter, rent_due_day: 5 }).rent_due_day,
    ).toBeDefined();
  });

  it('still requires name and room_number', () => {
    const errors = validateTenant({
      ...baseNonRenter,
      name: '',
      room_number: '',
    });
    expect(errors.name).toBeDefined();
    expect(errors.room_number).toBeDefined();
  });
});

describe('validateTenant — type', () => {
  it('rejects an invalid type', () => {
    const errors = validateTenant({
      ...baseRenter,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      type: 'guest' as any,
    });
    expect(errors.type).toBeDefined();
  });
});

describe('validateTenant — electricity_per_kwh (T4.5)', () => {
  it('requires electricity_per_kwh > 0 for renters', () => {
    expect(
      validateTenant({ ...baseRenter, electricity_per_kwh: 0 }).electricity_per_kwh,
    ).toBeDefined();
    expect(
      validateTenant({ ...baseRenter, electricity_per_kwh: -1 }).electricity_per_kwh,
    ).toBeDefined();
    expect(
      validateTenant({
        ...baseRenter,
        electricity_per_kwh: Number.NaN,
      }).electricity_per_kwh,
    ).toBeDefined();
  });

  it('requires electricity_per_kwh > 0 for non-renters too', () => {
    expect(
      validateTenant({ ...baseNonRenter, electricity_per_kwh: 0 })
        .electricity_per_kwh,
    ).toBeDefined();
  });

  it.each([0.0001, 12.5, 27, 999.9999])(
    'accepts positive electricity rate: %s',
    (rate) => {
      expect(
        validateTenant({ ...baseRenter, electricity_per_kwh: rate })
          .electricity_per_kwh,
      ).toBeUndefined();
    },
  );
});

describe('validateTenant — water_per_m3 (T4.5)', () => {
  it('requires water_per_m3 > 0 when has_water=true', () => {
    expect(
      validateTenant({ ...baseRenter, has_water: true, water_per_m3: null })
        .water_per_m3,
    ).toBeDefined();
    expect(
      validateTenant({ ...baseRenter, has_water: true, water_per_m3: 0 })
        .water_per_m3,
    ).toBeDefined();
    expect(
      validateTenant({ ...baseRenter, has_water: true, water_per_m3: -5 })
        .water_per_m3,
    ).toBeDefined();
    expect(
      validateTenant({
        ...baseRenter,
        has_water: true,
        water_per_m3: Number.NaN,
      }).water_per_m3,
    ).toBeDefined();
  });

  it('accepts a valid water rate when has_water=true', () => {
    expect(
      validateTenant({ ...baseRenter, has_water: true, water_per_m3: 30 })
        .water_per_m3,
    ).toBeUndefined();
  });

  it('requires water_per_m3 to be NULL when has_water=false', () => {
    expect(
      validateTenant({
        ...baseRenter,
        has_water: false,
        water_per_m3: 30,
      }).water_per_m3,
    ).toBeDefined();
  });

  it('accepts water_per_m3=null when has_water=false', () => {
    expect(
      validateTenant({
        ...baseRenter,
        has_water: false,
        water_per_m3: null,
      }).water_per_m3,
    ).toBeUndefined();
  });
});

describe('validateTenant — extras (T4.5)', () => {
  it('accepts extras_amount=0 with no note', () => {
    expect(
      validateTenant({ ...baseRenter, extras_amount: 0, extras_note: null })
        .extras_amount,
    ).toBeUndefined();
  });

  it('accepts a positive extras_amount with a note', () => {
    expect(
      validateTenant({
        ...baseRenter,
        extras_amount: 300,
        extras_note: 'wifi 2 devices',
      }).extras_amount,
    ).toBeUndefined();
  });

  it('accepts a positive extras_amount without a note', () => {
    expect(
      isValid(
        validateTenant({
          ...baseRenter,
          extras_amount: 200,
          extras_note: null,
        }),
      ),
    ).toBe(true);
  });

  it('rejects negative extras_amount', () => {
    expect(
      validateTenant({ ...baseRenter, extras_amount: -1 }).extras_amount,
    ).toBeDefined();
  });

  it('rejects NaN extras_amount', () => {
    expect(
      validateTenant({ ...baseRenter, extras_amount: Number.NaN }).extras_amount,
    ).toBeDefined();
  });
});

describe('isValid', () => {
  it('returns true for empty errors', () => {
    expect(isValid({})).toBe(true);
  });

  it('returns false when any field has an error', () => {
    expect(isValid({ name: 'required' })).toBe(false);
  });
});
