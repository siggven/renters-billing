import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Bill, BillInsert, Tenant } from '../types/db';

const BILLS_KEY = ['bills'] as const;

/** Bill row with the joined tenant. Used by both the bills list and history. */
export interface BillWithTenant extends Bill {
  tenant: Pick<Tenant, 'id' | 'name' | 'room_number' | 'type' | 'has_water'>;
}

/** All bills for the chosen period, ordered by tenant room number. */
export function useBillsForPeriod(period: string) {
  return useQuery({
    queryKey: [...BILLS_KEY, 'period', period],
    queryFn: async (): Promise<BillWithTenant[]> => {
      const { data, error } = await supabase
        .from('bills')
        .select('*, tenant:tenants(id, name, room_number, type, has_water)')
        .eq('period', period)
        .order('tenant_id');
      if (error) throw error;
      return (data ?? []) as BillWithTenant[];
    },
    enabled: Boolean(period),
  });
}

/**
 * Bulk-insert bills. The orchestration (which tenants to bill, what values to
 * snapshot) lives in `buildBillInsertsForPeriod` so this mutation is just the
 * I/O step. Empty arrays short-circuit without a network call.
 */
export function useInsertBills() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rows: BillInsert[]): Promise<Bill[]> => {
      if (rows.length === 0) return [];
      const { data, error } = await supabase
        .from('bills')
        .insert(rows)
        .select();
      if (error) throw error;
      return (data ?? []) as Bill[];
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: BILLS_KEY }),
  });
}

// ── History (T10) ───────────────────────────────────────────────────────────

export interface BillsHistoryFilters {
  /** Filter to a specific tenant. null/undefined = all tenants. */
  tenantId?: string | null;
  /** Lower bound 'YYYY-MM' (inclusive). undefined = no lower bound. */
  periodFrom?: string;
  /** Upper bound 'YYYY-MM' (inclusive). undefined = no upper bound. */
  periodTo?: string;
}

/**
 * Bills filtered by tenant + period range. Used by the History page (T10).
 *
 * The dataset is small (~50 rows/year × few tenants) so we don't paginate.
 * Sort is most-recent-first; the page can re-sort client-side.
 */
export function useBillsHistory(filters: BillsHistoryFilters) {
  return useQuery({
    queryKey: [
      ...BILLS_KEY,
      'history',
      filters.tenantId ?? null,
      filters.periodFrom ?? null,
      filters.periodTo ?? null,
    ],
    queryFn: async (): Promise<BillWithTenant[]> => {
      let q = supabase
        .from('bills')
        .select('*, tenant:tenants(id, name, room_number, type, has_water)')
        .order('period', { ascending: false })
        .order('tenant_id', { ascending: true });
      if (filters.tenantId) q = q.eq('tenant_id', filters.tenantId);
      if (filters.periodFrom) q = q.gte('period', filters.periodFrom);
      if (filters.periodTo) q = q.lte('period', filters.periodTo);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as BillWithTenant[];
    },
  });
}
