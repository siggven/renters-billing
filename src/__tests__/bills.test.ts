import { describe, it, expect } from 'vitest';
import { buildBillInsertsForPeriod } from '../lib/bills';
import type { Reading, Tenant } from '../types/db';

// ───────────────────────────────────────────────────────────────────────────
// Fixtures
// ───────────────────────────────────────────────────────────────────────────

const renter1: Tenant = {
  id: 't-1',
  name: 'MABEL',
  room_number: 'Room 1',
  type: 'renter',
  monthly_rent: 3500,
  rent_due_day: 5,
  has_water: true,
  electricity_per_kwh: 27,
  water_per_m3: 90,
  extras_amount: 0,
  extras_note: null,
  active: true,
  created_at: '2026-01-01T00:00:00+00:00',
};

const renter2WithExtras: Tenant = {
  ...renter1,
  id: 't-2',
  name: 'RUBY',
  room_number: 'Room 2',
  extras_amount: 300,
  extras_note: 'wifi 2 devices',
};

const nonRenter: Tenant = {
  id: 't-3',
  name: 'IRENE',
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
  created_at: '2026-01-01T00:00:00+00:00',
};

const inactiveTenant: Tenant = {
  ...renter1,
  id: 't-inactive',
  active: false,
};

function reading(
  tenantId: string,
  period: string,
  electricity: number | null,
  water: number | null,
): Reading {
  return {
    id: `r-${tenantId}-${period}`,
    tenant_id: tenantId,
    period,
    reading_date: `${period}-15`,
    electricity_reading: electricity,
    water_reading: water,
    created_at: '2026-05-15T00:00:00+00:00',
  };
}

// ───────────────────────────────────────────────────────────────────────────
// Tests
// ───────────────────────────────────────────────────────────────────────────

describe('buildBillInsertsForPeriod — happy path', () => {
  it('builds a renter bill with elec + water + rent and zero extras', () => {
    const result = buildBillInsertsForPeriod({
      tenants: [renter1],
      readings: [reading('t-1', '2026-05', 200, 60)],
      previousReadings: new Map([['t-1', reading('t-1', '2026-04', 100, 50)]]),
      existingBills: [],
      period: '2026-05',
    });

    expect(result.skipped).toEqual([]);
    expect(result.inserts).toHaveLength(1);

    const bill = result.inserts[0];
    expect(bill.tenant_id).toBe('t-1');
    expect(bill.period).toBe('2026-05');
    expect(bill.elec_kwh).toBe(100);
    expect(bill.elec_rate).toBe(27);
    expect(bill.elec_amount).toBe(2700); // 100 × 27
    expect(bill.water_m3).toBe(10);
    expect(bill.water_rate).toBe(90);
    expect(bill.water_amount).toBe(900); // 10 × 90
    expect(bill.rent_amount).toBe(3500);
    expect(bill.extras_amount).toBe(0);
    expect(bill.extras_note).toBeNull();
    expect(bill.total_amount).toBe(2700 + 900 + 3500); // 7100
  });

  it('snapshots extras_amount and extras_note from the tenant onto the bill', () => {
    const result = buildBillInsertsForPeriod({
      tenants: [renter2WithExtras],
      readings: [reading('t-2', '2026-05', 200, 60)],
      previousReadings: new Map([['t-2', reading('t-2', '2026-04', 100, 50)]]),
      existingBills: [],
      period: '2026-05',
    });

    expect(result.inserts).toHaveLength(1);
    const bill = result.inserts[0];
    expect(bill.extras_amount).toBe(300);
    expect(bill.extras_note).toBe('wifi 2 devices');
    // total = 2700 + 900 + 3500 + 300 = 7400
    expect(bill.total_amount).toBe(7400);
  });

  it('builds a non-renter bill with elec only, no rent, no water, zero extras', () => {
    const result = buildBillInsertsForPeriod({
      tenants: [nonRenter],
      readings: [reading('t-3', '2026-05', 150, null)],
      previousReadings: new Map([
        ['t-3', reading('t-3', '2026-04', 100, null)],
      ]),
      existingBills: [],
      period: '2026-05',
    });

    expect(result.inserts).toHaveLength(1);
    const bill = result.inserts[0];
    expect(bill.elec_amount).toBe(50 * 27); // 1350
    expect(bill.water_amount).toBeNull();
    expect(bill.water_rate).toBeNull();
    expect(bill.rent_amount).toBeNull();
    expect(bill.extras_amount).toBe(0);
    expect(bill.total_amount).toBe(1350);
  });
});

describe('buildBillInsertsForPeriod — skip rules', () => {
  it('skips inactive tenants', () => {
    const result = buildBillInsertsForPeriod({
      tenants: [inactiveTenant],
      readings: [reading('t-inactive', '2026-05', 200, 60)],
      previousReadings: new Map(),
      existingBills: [],
      period: '2026-05',
    });
    expect(result.inserts).toHaveLength(0);
    // Inactive tenants don't even appear in the skipped list — they're filtered
    // out before iteration begins; the page caller is expected to pass active
    // tenants only.
    expect(result.skipped).toEqual([]);
  });

  it('skips a tenant who already has a bill for this period (FR-21 idempotent)', () => {
    const result = buildBillInsertsForPeriod({
      tenants: [renter1, renter2WithExtras],
      readings: [
        reading('t-1', '2026-05', 200, 60),
        reading('t-2', '2026-05', 200, 60),
      ],
      previousReadings: new Map([
        ['t-1', reading('t-1', '2026-04', 100, 50)],
        ['t-2', reading('t-2', '2026-04', 100, 50)],
      ]),
      existingBills: [{ tenant_id: 't-1' }],
      period: '2026-05',
    });
    expect(result.inserts).toHaveLength(1);
    expect(result.inserts[0].tenant_id).toBe('t-2');
    expect(result.skipped).toHaveLength(1);
    expect(result.skipped[0].tenant.id).toBe('t-1');
    expect(result.skipped[0].reason).toBe('already-billed');
  });

  it('skips a tenant with no current reading', () => {
    const result = buildBillInsertsForPeriod({
      tenants: [renter1, renter2WithExtras],
      readings: [reading('t-2', '2026-05', 200, 60)], // only renter2 has a reading
      previousReadings: new Map(),
      existingBills: [],
      period: '2026-05',
    });
    expect(result.inserts).toHaveLength(1);
    expect(result.inserts[0].tenant_id).toBe('t-2');
    expect(result.skipped).toHaveLength(1);
    expect(result.skipped[0].tenant.id).toBe('t-1');
    expect(result.skipped[0].reason).toBe('no-reading');
  });

  it('skips a tenant whose reading has null electricity and null water', () => {
    const result = buildBillInsertsForPeriod({
      tenants: [renter1],
      readings: [reading('t-1', '2026-05', null, null)],
      previousReadings: new Map(),
      existingBills: [],
      period: '2026-05',
    });
    expect(result.inserts).toHaveLength(0);
    expect(result.skipped).toHaveLength(1);
    expect(result.skipped[0].reason).toBe('no-reading');
  });

  it('skips a tenant whose current reading is below previous (InvalidReadingError)', () => {
    const result = buildBillInsertsForPeriod({
      tenants: [renter1],
      readings: [reading('t-1', '2026-05', 50, 30)], // went backwards
      previousReadings: new Map([['t-1', reading('t-1', '2026-04', 100, 50)]]),
      existingBills: [],
      period: '2026-05',
    });
    expect(result.inserts).toHaveLength(0);
    expect(result.skipped).toHaveLength(1);
    expect(result.skipped[0].reason).toBe('invalid-reading');
  });
});

describe('buildBillInsertsForPeriod — first reading (FR-20)', () => {
  it('creates a bill for a renter on their first reading: kwh/m³ = 0, rent + extras still apply', () => {
    const result = buildBillInsertsForPeriod({
      tenants: [renter2WithExtras],
      readings: [reading('t-2', '2026-05', 200, 60)],
      previousReadings: new Map(), // no prev
      existingBills: [],
      period: '2026-05',
    });
    expect(result.inserts).toHaveLength(1);
    const bill = result.inserts[0];
    expect(bill.elec_kwh).toBe(0);
    expect(bill.elec_amount).toBe(0);
    expect(bill.water_m3).toBe(0);
    expect(bill.water_amount).toBe(0);
    expect(bill.rent_amount).toBe(3500);
    expect(bill.extras_amount).toBe(300);
    expect(bill.total_amount).toBe(3800); // rent + extras only
  });
});

describe('buildBillInsertsForPeriod — has_water=false short-circuit', () => {
  it('ignores water readings on a non-renter (or any tenant with has_water=false)', () => {
    const result = buildBillInsertsForPeriod({
      tenants: [nonRenter],
      // Even if we accidentally pass a water reading, calculator should ignore it.
      readings: [reading('t-3', '2026-05', 200, 999)],
      previousReadings: new Map([
        ['t-3', reading('t-3', '2026-04', 100, null)],
      ]),
      existingBills: [],
      period: '2026-05',
    });
    expect(result.inserts).toHaveLength(1);
    const bill = result.inserts[0];
    expect(bill.water_m3).toBeNull();
    expect(bill.water_amount).toBeNull();
    expect(bill.water_rate).toBeNull();
  });
});

describe('buildBillInsertsForPeriod — multi-tenant batch', () => {
  it('processes multiple tenants in one call, mixing skip + insert correctly', () => {
    const result = buildBillInsertsForPeriod({
      tenants: [renter1, renter2WithExtras, nonRenter],
      readings: [
        reading('t-1', '2026-05', 200, 60),
        // t-2 has no reading
        reading('t-3', '2026-05', 150, null),
      ],
      previousReadings: new Map([
        ['t-1', reading('t-1', '2026-04', 100, 50)],
        ['t-3', reading('t-3', '2026-04', 100, null)],
      ]),
      existingBills: [{ tenant_id: 't-3' }], // already billed
      period: '2026-05',
    });
    expect(result.inserts).toHaveLength(1);
    expect(result.inserts[0].tenant_id).toBe('t-1');

    expect(result.skipped).toHaveLength(2);
    const reasons = result.skipped.map((s) => ({
      id: s.tenant.id,
      reason: s.reason,
    }));
    expect(reasons).toContainEqual({ id: 't-2', reason: 'no-reading' });
    expect(reasons).toContainEqual({ id: 't-3', reason: 'already-billed' });
  });
});

describe('buildBillInsertsForPeriod — period propagation', () => {
  it('every insert has the supplied period', () => {
    const result = buildBillInsertsForPeriod({
      tenants: [renter1, renter2WithExtras],
      readings: [
        reading('t-1', '2026-07', 200, 60),
        reading('t-2', '2026-07', 200, 60),
      ],
      previousReadings: new Map([
        ['t-1', reading('t-1', '2026-06', 100, 50)],
        ['t-2', reading('t-2', '2026-06', 100, 50)],
      ]),
      existingBills: [],
      period: '2026-07',
    });
    expect(result.inserts).toHaveLength(2);
    for (const b of result.inserts) {
      expect(b.period).toBe('2026-07');
    }
  });
});
