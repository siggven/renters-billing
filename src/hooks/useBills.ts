import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Bill, BillInsert } from '../types/db';

const BILLS_KEY = ['bills'] as const;

/** All bills for the chosen period, ordered by tenant room number. */
export function useBillsForPeriod(period: string) {
  return useQuery({
    queryKey: [...BILLS_KEY, 'period', period],
    queryFn: async (): Promise<Bill[]> => {
      const { data, error } = await supabase
        .from('bills')
        .select('*, tenant:tenants(room_number, name, type)')
        .eq('period', period)
        .order('tenant_id');
      if (error) throw error;
      return (data ?? []) as Bill[];
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
