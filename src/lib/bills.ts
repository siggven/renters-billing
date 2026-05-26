/**
 * Bill-generation orchestration. Pure function — no I/O.
 *
 * Given the set of active tenants, their meter readings for a chosen period,
 * each tenant's most-recent prior reading, and the bills that already exist
 * for that period, returns:
 *   - `inserts`: BillInsert[] ready to bulk-upsert into the bills table
 *   - `skipped`: { tenant, reason } pairs for tenants that were not billed
 *
 * Skip reasons:
 *   - `already-billed`  — a bill for (tenant_id, period) already exists (FR-21)
 *   - `no-reading`      — the tenant has no reading for this period, OR the
 *                         reading's electricity_reading and water_reading are
 *                         both null
 *   - `invalid-reading` — calculateBill threw InvalidReadingError (curr < prev)
 *
 * SPEC: docs/SPEC.md FR-17..FR-22, AC-7
 */

import { calculateBill, InvalidReadingError } from './billing';
import type { BillInsert, Reading, Tenant } from '../types/db';

export type SkipReason = 'already-billed' | 'no-reading' | 'invalid-reading';

export interface SkippedTenant {
  tenant: Tenant;
  reason: SkipReason;
}

export interface BuildBillInsertsResult {
  inserts: BillInsert[];
  skipped: SkippedTenant[];
}

export interface BuildBillInsertsArgs {
  /**
   * Active tenants to consider. Inactive tenants should be filtered out by the
   * caller (they're silently dropped here, not surfaced as `skipped`).
   */
  tenants: Tenant[];
  /** All readings for `period`. */
  readings: Reading[];
  /**
   * Most-recent reading per tenant where `period < the period being billed`.
   * Pass an empty Map when there is no prior history.
   */
  previousReadings: Map<string, Reading>;
  /** Bills that already exist for `period`. Only `tenant_id` is read. */
  existingBills: Array<{ tenant_id: string }>;
  /** 'YYYY-MM' for the period being billed. */
  period: string;
}

export function buildBillInsertsForPeriod(
  args: BuildBillInsertsArgs,
): BuildBillInsertsResult {
  const { tenants, readings, previousReadings, existingBills, period } = args;

  const readingByTenant = new Map<string, Reading>();
  for (const r of readings) {
    readingByTenant.set(r.tenant_id, r);
  }

  const billedTenantIds = new Set(existingBills.map((b) => b.tenant_id));

  const inserts: BillInsert[] = [];
  const skipped: SkippedTenant[] = [];

  for (const tenant of tenants) {
    if (!tenant.active) {
      // Filtered silently — caller should pass active tenants only.
      continue;
    }

    if (billedTenantIds.has(tenant.id)) {
      skipped.push({ tenant, reason: 'already-billed' });
      continue;
    }

    const reading = readingByTenant.get(tenant.id);
    if (!reading) {
      skipped.push({ tenant, reason: 'no-reading' });
      continue;
    }

    // A reading with neither electricity nor water value isn't billable.
    const hasAnyValue =
      reading.electricity_reading !== null || reading.water_reading !== null;
    if (!hasAnyValue) {
      skipped.push({ tenant, reason: 'no-reading' });
      continue;
    }

    const prev = previousReadings.get(tenant.id) ?? null;

    let snapshot;
    try {
      snapshot = calculateBill({
        tenant,
        prevElec: prev?.electricity_reading ?? null,
        currElec: reading.electricity_reading ?? null,
        prevWater: prev?.water_reading ?? null,
        currWater: reading.water_reading ?? null,
        // Renters always pay rent on every bill (FR-19/FR-20).
        // Non-renters get rent_amount=null automatically inside calculateBill.
        includeRent: true,
      });
    } catch (err) {
      if (err instanceof InvalidReadingError) {
        skipped.push({ tenant, reason: 'invalid-reading' });
        continue;
      }
      throw err;
    }

    inserts.push({
      tenant_id: tenant.id,
      period,
      prev_elec: snapshot.prev_elec,
      curr_elec: snapshot.curr_elec,
      elec_kwh: snapshot.elec_kwh,
      elec_rate: snapshot.elec_rate,
      elec_amount: snapshot.elec_amount,
      prev_water: snapshot.prev_water,
      curr_water: snapshot.curr_water,
      water_m3: snapshot.water_m3,
      water_rate: snapshot.water_rate,
      water_amount: snapshot.water_amount,
      rent_amount: snapshot.rent_amount,
      extras_amount: snapshot.extras_amount,
      extras_note: snapshot.extras_note,
      total_amount: snapshot.total_amount,
    });
  }

  return { inserts, skipped };
}
