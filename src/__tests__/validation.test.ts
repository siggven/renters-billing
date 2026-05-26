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

// ───────────────────────────────────────────────────────────────────────────
// validateReading (T6)
// ───────────────────────────────────────────────────────────────────────────

import { validateReading, type ValidateReadingArgs } from '../lib/validation';

const baseReadingArgs: ValidateReadingArgs = {
  period: '2026-05',
  reading_date: '2026-05-31',
  electricity_reading: 200,
  water_reading: 60,
  prevElectricity: 100,
  prevWater: 50,
  hasWater: true,
};

describe('validateReading — happy path', () => {
  it('accepts a valid reading with both elec + water', () => {
    expect(isValid(validateReading(baseReadingArgs))).toBe(true);
  });

  it('accepts elec-only reading for a tenant without water sub-meter', () => {
    expect(
      isValid(
        validateReading({
          ...baseReadingArgs,
          hasWater: false,
          water_reading: null,
          prevWater: null,
        }),
      ),
    ).toBe(true);
  });

  it('accepts a "blank" reading (both nulls) — caller filters these out before save', () => {
    expect(
      isValid(
        validateReading({
          ...baseReadingArgs,
          electricity_reading: null,
          water_reading: null,
        }),
      ),
    ).toBe(true);
  });

  it('accepts a reading that exactly equals the previous (zero usage)', () => {
    expect(
      isValid(
        validateReading({
          ...baseReadingArgs,
          electricity_reading: 100,
          water_reading: 50,
        }),
      ),
    ).toBe(true);
  });

  it('accepts a first reading (no previous)', () => {
    expect(
      isValid(
        validateReading({
          ...baseReadingArgs,
          electricity_reading: 200,
          water_reading: 60,
          prevElectricity: null,
          prevWater: null,
        }),
      ),
    ).toBe(true);
  });
});

describe('validateReading — period and date', () => {
  it('rejects an invalid period', () => {
    expect(
      validateReading({ ...baseReadingArgs, period: '2026-13' }).period,
    ).toBeDefined();
    expect(
      validateReading({ ...baseReadingArgs, period: 'garbage' }).period,
    ).toBeDefined();
  });

  it('rejects empty reading_date', () => {
    expect(
      validateReading({ ...baseReadingArgs, reading_date: '' }).reading_date,
    ).toBeDefined();
  });

  it('rejects malformed reading_date', () => {
    expect(
      validateReading({ ...baseReadingArgs, reading_date: '05/31/2026' })
        .reading_date,
    ).toBeDefined();
  });

  it('rejects a non-real reading_date', () => {
    expect(
      validateReading({ ...baseReadingArgs, reading_date: '2026-02-30' })
        .reading_date,
    ).toBeDefined();
  });
});

describe('validateReading — electricity_reading', () => {
  it('rejects negative electricity_reading', () => {
    expect(
      validateReading({ ...baseReadingArgs, electricity_reading: -1 })
        .electricity_reading,
    ).toBeDefined();
  });

  it('rejects NaN electricity_reading', () => {
    expect(
      validateReading({ ...baseReadingArgs, electricity_reading: Number.NaN })
        .electricity_reading,
    ).toBeDefined();
  });

  it('rejects Infinity electricity_reading', () => {
    expect(
      validateReading({
        ...baseReadingArgs,
        electricity_reading: Number.POSITIVE_INFINITY,
      }).electricity_reading,
    ).toBeDefined();
  });

  it('rejects current < previous (meter went backwards)', () => {
    expect(
      validateReading({
        ...baseReadingArgs,
        prevElectricity: 200,
        electricity_reading: 150,
      }).electricity_reading,
    ).toBeDefined();
  });

  it('accepts current >= previous', () => {
    expect(
      validateReading({
        ...baseReadingArgs,
        prevElectricity: 100,
        electricity_reading: 100,
      }).electricity_reading,
    ).toBeUndefined();
    expect(
      validateReading({
        ...baseReadingArgs,
        prevElectricity: 100,
        electricity_reading: 200,
      }).electricity_reading,
    ).toBeUndefined();
  });
});

describe('validateReading — water_reading + has_water invariant', () => {
  it('rejects water_reading on a tenant with hasWater=false', () => {
    expect(
      validateReading({
        ...baseReadingArgs,
        hasWater: false,
        water_reading: 30,
        prevWater: null,
      }).water_reading,
    ).toBeDefined();
  });

  it('accepts water_reading=null on a tenant with hasWater=false', () => {
    expect(
      validateReading({
        ...baseReadingArgs,
        hasWater: false,
        water_reading: null,
        prevWater: null,
      }).water_reading,
    ).toBeUndefined();
  });

  it('rejects negative water_reading', () => {
    expect(
      validateReading({ ...baseReadingArgs, water_reading: -1 }).water_reading,
    ).toBeDefined();
  });

  it('rejects NaN water_reading', () => {
    expect(
      validateReading({ ...baseReadingArgs, water_reading: Number.NaN })
        .water_reading,
    ).toBeDefined();
  });

  it('rejects current water < previous water', () => {
    expect(
      validateReading({
        ...baseReadingArgs,
        prevWater: 60,
        water_reading: 50,
      }).water_reading,
    ).toBeDefined();
  });

  it('accepts current water >= previous water', () => {
    expect(
      validateReading({
        ...baseReadingArgs,
        prevWater: 60,
        water_reading: 60,
      }).water_reading,
    ).toBeUndefined();
    expect(
      validateReading({
        ...baseReadingArgs,
        prevWater: 60,
        water_reading: 100,
      }).water_reading,
    ).toBeUndefined();
  });
});
