import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Bill, Tenant } from '../types/db';

/**
 * Bill row with the joined tenant. Used by the receipt view (T8) so it can
 * render tenant info (room, name, type) without a separate fetch.
 */
export interface BillWithTenant extends Bill {
  tenant: Pick<
    Tenant,
    'id' | 'name' | 'room_number' | 'type' | 'has_water'
  >;
}

const BILL_KEYS = {
  byId: (id: string) => ['bills', 'by-id', id] as const,
  // Coarser invalidation — flips badges on the bill list across all periods
  all: ['bills'] as const,
};

export function useBillById(id: string | undefined) {
  return useQuery({
    queryKey: BILL_KEYS.byId(id ?? ''),
    queryFn: async (): Promise<BillWithTenant | null> => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('bills')
        .select(
          '*, tenant:tenants(id, name, room_number, type, has_water)',
        )
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as BillWithTenant | null;
    },
    enabled: Boolean(id),
  });
}

// ── Payment tracking (T9) ──────────────────────────────────────────────────

export interface MarkPaidArgs {
  id: string;
  /** 'YYYY-MM-DD'. Required: T8 reviewer flagged that omitting it would break the
   *  PAID stamp gate `isPaid && bill.paid_date` on the receipt view. */
  paid_date: string;
  /** Optional free-text note from the user. Empty strings are coerced to null. */
  paid_note?: string | null;
}

/**
 * Mark a bill as paid. Sets status='paid', paid_date, paid_note in one update.
 * Caller MUST supply paid_date (default to today on the UI side, never null).
 */
export function useMarkBillPaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      paid_date,
      paid_note,
    }: MarkPaidArgs): Promise<Bill> => {
      const note = paid_note?.trim() ? paid_note.trim() : null;
      const { data, error } = await supabase
        .from('bills')
        .update({ status: 'paid', paid_date, paid_note: note })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Bill;
    },
    onSuccess: (bill) => {
      qc.invalidateQueries({ queryKey: BILL_KEYS.byId(bill.id) });
      qc.invalidateQueries({ queryKey: BILL_KEYS.all });
    },
  });
}

/** Unmark a bill (mistake-correction). Clears paid_date + paid_note. */
export function useMarkBillUnpaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string }): Promise<Bill> => {
      const { data, error } = await supabase
        .from('bills')
        .update({ status: 'unpaid', paid_date: null, paid_note: null })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Bill;
    },
    onSuccess: (bill) => {
      qc.invalidateQueries({ queryKey: BILL_KEYS.byId(bill.id) });
      qc.invalidateQueries({ queryKey: BILL_KEYS.all });
    },
  });
}
