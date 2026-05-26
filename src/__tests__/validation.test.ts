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
  active: true,
};

const baseNonRenter: TenantInput = {
  name: 'Mang Ben',
  room_number: 'Neighbor',
  type: 'non_renter',
  monthly_rent: null,
  rent_due_day: null,
  has_water: false,
  active: true,
};

describe('validateTenant', () => {
  describe('renter', () => {
    it('accepts a valid renter', () => {
      const errors = validateTenant(baseRenter);
      expect(isValid(errors)).toBe(true);
    });

    it('rejects empty name', () => {
      const errors = validateTenant({ ...baseRenter, name: '' });
      expect(errors.name).toBeDefined();
    });

    it('rejects whitespace-only name', () => {
      const errors = validateTenant({ ...baseRenter, name: '   ' });
      expect(errors.name).toBeDefined();
    });

    it('rejects empty room_number', () => {
      const errors = validateTenant({ ...baseRenter, room_number: '' });
      expect(errors.room_number).toBeDefined();
    });

    it('requires monthly_rent for renters', () => {
      const errors = validateTenant({ ...baseRenter, monthly_rent: null });
      expect(errors.monthly_rent).toBeDefined();
    });

    it('rejects zero or negative rent', () => {
      expect(validateTenant({ ...baseRenter, monthly_rent: 0 }).monthly_rent).toBeDefined();
      expect(validateTenant({ ...baseRenter, monthly_rent: -1 }).monthly_rent).toBeDefined();
    });

    it('rejects NaN rent', () => {
      const errors = validateTenant({ ...baseRenter, monthly_rent: Number.NaN });
      expect(errors.monthly_rent).toBeDefined();
    });

    it('requires rent_due_day for renters', () => {
      const errors = validateTenant({ ...baseRenter, rent_due_day: null });
      expect(errors.rent_due_day).toBeDefined();
    });

    it.each([0, 32, -1, 100, 1.5])(
      'rejects out-of-range / non-integer rent_due_day: %s',
      (day) => {
        const errors = validateTenant({ ...baseRenter, rent_due_day: day });
        expect(errors.rent_due_day).toBeDefined();
      },
    );

    it.each([1, 5, 15, 31])('accepts valid rent_due_day: %s', (day) => {
      const errors = validateTenant({ ...baseRenter, rent_due_day: day });
      expect(errors.rent_due_day).toBeUndefined();
    });
  });

  describe('non_renter', () => {
    it('accepts a valid non-renter', () => {
      const errors = validateTenant(baseNonRenter);
      expect(isValid(errors)).toBe(true);
    });

    it('rejects monthly_rent on a non-renter', () => {
      const errors = validateTenant({ ...baseNonRenter, monthly_rent: 1000 });
      expect(errors.monthly_rent).toBeDefined();
    });

    it('rejects rent_due_day on a non-renter', () => {
      const errors = validateTenant({ ...baseNonRenter, rent_due_day: 5 });
      expect(errors.rent_due_day).toBeDefined();
    });

    it('still requires name and room_number', () => {
      const errors = validateTenant({ ...baseNonRenter, name: '', room_number: '' });
      expect(errors.name).toBeDefined();
      expect(errors.room_number).toBeDefined();
    });
  });

  describe('type', () => {
    it('rejects an invalid type', () => {
      const errors = validateTenant({
        ...baseRenter,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        type: 'guest' as any,
      });
      expect(errors.type).toBeDefined();
    });
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
