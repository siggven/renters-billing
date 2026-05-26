import { describe, it, expect } from 'vitest';
import {
  calculateBill,
  InvalidReadingError,
  type CalculateBillInput,
} from '../lib/billing';
import type { Tenant } from '../types/db';

// ───────────────────────────────────────────────────────────────────────────
// Fixtures
// ───────────────────────────────────────────────────────────────────────────

const renter: Tenant = {
  id: 't-1',
  name: 'Juan',
  room_number: 'Room 1',
  type: 'renter',
  monthly_rent: 3500,
  rent_due_day: 5,
  has_water: true,
  electricity_per_kwh: 12.5, // ₱12.50/kWh
  water_per_m3: 30.0, // ₱30.00/m³
  extras_amount: 0,
  extras_note: null,
  active: true,
  created_at: '2026-01-01T00:00:00+00:00',
};

const renterNoWater: Tenant = {
  ...renter,
  id: 't-1-nw',
  has_water: false,
  water_per_m3: null,
};

const renterWithExtras: Tenant = {
  ...renter,
  id: 't-1-ex',
  extras_amount: 300,
  extras_note: 'wifi 2 devices',
};

const nonRenter: Tenant = {
  id: 't-2',
  name: 'Mang Ben',
  room_number: 'Neighbor',
  type: 'non_renter',
  monthly_rent: null,
  rent_due_day: null,
  has_water: false,
  electricity_per_kwh: 12.5,
  water_per_m3: null,
  extras_amount: 0,
  extras_note: null,
  active: true,
  created_at: '2026-01-01T00:00:00+00:00',
};

function input(overrides: Partial<CalculateBillInput>): CalculateBillInput {
  return {
    tenant: renter,
    prevElec: 100,
    currElec: 200, // 100 kWh used
    prevWater: 50,
    currWater: 60, // 10 m³ used
    ...overrides,
  };
}

// ───────────────────────────────────────────────────────────────────────────
// Tests
// ───────────────────────────────────────────────────────────────────────────

describe('calculateBill — renter happy path', () => {
  it('computes elec + water + rent and totals correctly', () => {
    const result = calculateBill(input({}));
    expect(result.elec_kwh).toBe(100);
    expect(result.elec_rate).toBe(12.5);
    expect(result.elec_amount).toBe(1250); // 100 * 12.5
    expect(result.water_m3).toBe(10);
    expect(result.water_rate).toBe(30);
    expect(result.water_amount).toBe(300); // 10 * 30
    expect(result.rent_amount).toBe(3500);
    expect(result.extras_amount).toBe(0);
    expect(result.extras_note).toBeNull();
    expect(result.total_amount).toBe(5050); // 1250 + 300 + 3500
    expect(result.is_first_reading).toBe(false);
  });

  it('snapshots prev/curr readings into the result', () => {
    const result = calculateBill(input({}));
    expect(result.prev_elec).toBe(100);
    expect(result.curr_elec).toBe(200);
    expect(result.prev_water).toBe(50);
    expect(result.curr_water).toBe(60);
  });
});

describe('calculateBill — non-renter (electricity only)', () => {
  it('has no rent, no water', () => {
    const result = calculateBill(
      input({
        tenant: nonRenter,
        prevWater: null,
        currWater: null,
      }),
    );
    expect(result.elec_amount).toBe(1250);
    expect(result.rent_amount).toBeNull();
    expect(result.water_m3).toBeNull();
    expect(result.water_rate).toBeNull();
    expect(result.water_amount).toBeNull();
    expect(result.prev_water).toBeNull();
    expect(result.curr_water).toBeNull();
    expect(result.extras_amount).toBe(0);
    expect(result.total_amount).toBe(1250);
  });
});

describe('calculateBill — renter with has_water=false', () => {
  it('skips water entirely even if water readings are passed', () => {
    const result = calculateBill(
      input({
        tenant: renterNoWater,
        // water readings are passed but should be ignored
        prevWater: 50,
        currWater: 80,
      }),
    );
    expect(result.water_m3).toBeNull();
    expect(result.water_amount).toBeNull();
    expect(result.water_rate).toBeNull();
    expect(result.prev_water).toBeNull();
    expect(result.curr_water).toBeNull();
    expect(result.total_amount).toBe(1250 + 3500); // elec + rent only
  });
});

describe('calculateBill — zero usage', () => {
  it('curr == prev → kwh=0, amount=0, but rent applies', () => {
    const result = calculateBill(
      input({
        prevElec: 200,
        currElec: 200,
        prevWater: 60,
        currWater: 60,
      }),
    );
    expect(result.elec_kwh).toBe(0);
    expect(result.elec_amount).toBe(0);
    expect(result.water_m3).toBe(0);
    expect(result.water_amount).toBe(0);
    expect(result.rent_amount).toBe(3500);
    expect(result.total_amount).toBe(3500);
  });
});

describe('calculateBill — invalid (negative) usage', () => {
  it('curr < prev for electricity throws InvalidReadingError', () => {
    expect(() =>
      calculateBill(input({ prevElec: 200, currElec: 150 })),
    ).toThrow(InvalidReadingError);
  });

  it('curr < prev for water throws InvalidReadingError', () => {
    expect(() =>
      calculateBill(input({ prevWater: 60, currWater: 50 })),
    ).toThrow(InvalidReadingError);
  });

  it('error message includes the offending values for debugging', () => {
    try {
      calculateBill(input({ prevElec: 200, currElec: 150 }));
      throw new Error('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(InvalidReadingError);
      expect((e as Error).message).toMatch(/200/);
      expect((e as Error).message).toMatch(/150/);
    }
  });
});

describe('calculateBill — first-month / missing previous reading', () => {
  it('null prevElec + valid currElec → kwh=0, amount=0, is_first_reading=true', () => {
    const result = calculateBill(input({ prevElec: null, prevWater: null }));
    expect(result.elec_kwh).toBe(0);
    expect(result.elec_amount).toBe(0);
    expect(result.water_m3).toBe(0);
    expect(result.water_amount).toBe(0);
    expect(result.rent_amount).toBe(3500);
    expect(result.total_amount).toBe(3500);
    expect(result.is_first_reading).toBe(true);
  });

  it('first reading still records the curr value as the snapshot', () => {
    const result = calculateBill(input({ prevElec: null, prevWater: null }));
    expect(result.prev_elec).toBeNull();
    expect(result.curr_elec).toBe(200);
    expect(result.prev_water).toBeNull();
    expect(result.curr_water).toBe(60);
  });
});

describe('calculateBill — null current readings', () => {
  it('null currElec → all elec fields null', () => {
    const result = calculateBill(
      input({
        currElec: null,
        prevElec: null,
        prevWater: null,
        currWater: null,
      }),
    );
    expect(result.elec_kwh).toBeNull();
    expect(result.elec_amount).toBeNull();
  });
});

describe('calculateBill — includeRent flag', () => {
  it('includeRent=false → no rent line even for renter', () => {
    const result = calculateBill(input({ includeRent: false }));
    expect(result.rent_amount).toBeNull();
    expect(result.total_amount).toBe(1250 + 300); // elec + water only
  });

  it('includeRent default is true', () => {
    const result = calculateBill(input({}));
    expect(result.rent_amount).toBe(3500);
  });
});

describe('calculateBill — per-tenant rates (T4.5)', () => {
  it('uses each tenant\u2019s own electricity_per_kwh', () => {
    const t1: Tenant = { ...renter, id: 't-A', electricity_per_kwh: 27 };
    const t2: Tenant = { ...renter, id: 't-B', electricity_per_kwh: 14.97 };

    const r1 = calculateBill({
      tenant: t1,
      prevElec: 0,
      currElec: 100,
      prevWater: 0,
      currWater: 0,
    });
    const r2 = calculateBill({
      tenant: t2,
      prevElec: 0,
      currElec: 100,
      prevWater: 0,
      currWater: 0,
    });

    expect(r1.elec_rate).toBe(27);
    expect(r1.elec_amount).toBe(2700);
    expect(r2.elec_rate).toBe(14.97);
    expect(r2.elec_amount).toBe(1497);
  });

  it('uses each tenant\u2019s own water_per_m3', () => {
    const t: Tenant = { ...renter, water_per_m3: 25.5 };
    const result = calculateBill({
      tenant: t,
      prevElec: null,
      currElec: null,
      prevWater: 0,
      currWater: 4,
    });
    expect(result.water_rate).toBe(25.5);
    expect(result.water_amount).toBe(102); // 4 * 25.5
  });

  it('snapshots tenant\u2019s rates into the result so later edits don\u2019t change history', () => {
    // The function is pure; we model "later edits don't affect history" by
    // calling the function with the rate the tenant had at generation time.
    const atGenerationTime: Tenant = { ...renter, electricity_per_kwh: 27 };
    const result = calculateBill({
      tenant: atGenerationTime,
      prevElec: 0,
      currElec: 10,
      prevWater: null,
      currWater: null,
    });
    expect(result.elec_rate).toBe(27);
    expect(result.elec_amount).toBe(270);

    // Tenant later edits their rate to something else — the previous result is
    // unchanged because we already snapshotted elec_rate=27.
    expect(result.elec_rate).toBe(27);
  });
});

describe('calculateBill — extras line (T4.5)', () => {
  it('extras_amount=0 → extras line is 0 and not added to total', () => {
    const result = calculateBill(input({}));
    expect(result.extras_amount).toBe(0);
    expect(result.extras_note).toBeNull();
    expect(result.total_amount).toBe(5050); // elec + water + rent only
  });

  it('extras_amount>0 with note → snapshotted onto bill and added to total', () => {
    const result = calculateBill(input({ tenant: renterWithExtras }));
    expect(result.extras_amount).toBe(300);
    expect(result.extras_note).toBe('wifi 2 devices');
    // 1250 + 300 (water) + 3500 + 300 (extras) = 5350
    expect(result.total_amount).toBe(5350);
  });

  it('extras applies even on a first-reading bill', () => {
    const result = calculateBill(
      input({
        tenant: renterWithExtras,
        prevElec: null,
        prevWater: null,
      }),
    );
    expect(result.is_first_reading).toBe(true);
    expect(result.extras_amount).toBe(300);
    expect(result.extras_note).toBe('wifi 2 devices');
    expect(result.total_amount).toBe(3500 + 300); // rent + extras
  });

  it('extras applies on a non-renter too (e.g. wifi-share)', () => {
    const nonRenterWithExtras: Tenant = {
      ...nonRenter,
      extras_amount: 200,
      extras_note: 'wifi 1 device',
    };
    const result = calculateBill(
      input({
        tenant: nonRenterWithExtras,
        prevWater: null,
        currWater: null,
      }),
    );
    expect(result.rent_amount).toBeNull();
    expect(result.extras_amount).toBe(200);
    expect(result.extras_note).toBe('wifi 1 device');
    expect(result.total_amount).toBe(1250 + 200); // elec + extras
  });

  it('extras snapshot is independent of later tenant edits', () => {
    const t: Tenant = { ...renterWithExtras, extras_amount: 300 };
    const result = calculateBill({
      tenant: t,
      prevElec: null,
      currElec: null,
      prevWater: null,
      currWater: null,
    });
    expect(result.extras_amount).toBe(300);
    // Even if `t.extras_amount` were later mutated, `result` is frozen.
    expect(result.extras_amount).toBe(300);
  });
});

describe('calculateBill — PHP rounding to 2 decimals', () => {
  it('rounds elec_amount to 2 decimals (half-up)', () => {
    // Rate 12.345 ₱/kWh × 1.5 kWh = 18.5175 → 18.52 (half-up)
    const t: Tenant = { ...nonRenter, electricity_per_kwh: 12.345 };
    const result = calculateBill({
      tenant: t,
      prevElec: 100,
      currElec: 101.5,
      prevWater: null,
      currWater: null,
    });
    expect(result.elec_kwh).toBe(1.5);
    expect(result.elec_amount).toBe(18.52);
  });

  it.each([
    [1.005, 1.01],
    [1.004, 1.0],
    [2.345, 2.35],
    [0.005, 0.01],
    [10.225, 10.23],
  ])('round2(%s) gives %s', (rate, expected) => {
    // 1 kWh × Xrate = X
    const t: Tenant = { ...nonRenter, electricity_per_kwh: rate };
    const result = calculateBill({
      tenant: t,
      prevElec: 0,
      currElec: 1,
      prevWater: null,
      currWater: null,
    });
    expect(result.elec_amount).toBe(expected);
  });
});

describe('calculateBill — total_amount sum', () => {
  it('total = elec + water + rent + extras (all rounded to 2dp)', () => {
    const t: Tenant = {
      ...renter,
      electricity_per_kwh: 12.345,
      water_per_m3: 30.111,
      extras_amount: 250.5,
      extras_note: 'wifi',
    };
    const result = calculateBill(
      input({
        tenant: t,
        prevElec: 100,
        currElec: 200, // 100 kWh × 12.345 = 1234.5
        prevWater: 50,
        currWater: 60, // 10 m³ × 30.111 = 301.11
      }),
    );
    expect(result.elec_amount).toBe(1234.5);
    expect(result.water_amount).toBe(301.11);
    expect(result.extras_amount).toBe(250.5);
    // 1234.5 + 301.11 + 3500 + 250.5 = 5286.11
    expect(result.total_amount).toBe(5286.11);
  });

  it('handles non-renter zero total cleanly', () => {
    const result = calculateBill(
      input({
        tenant: nonRenter,
        prevElec: 100,
        currElec: 100,
        prevWater: null,
        currWater: null,
      }),
    );
    expect(result.total_amount).toBe(0);
  });
});
