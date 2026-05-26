import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Bill } from '../types/db';
import type { BillWithTenant } from './useBills';

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
 *
 * Note: the caller (MarkPaidModal) already coerces empty/whitespace notes to
 * null before invoking this, so the mutation forwards `paid_note` as-is.
 */
export function useMarkBillPaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      paid_date,
      paid_note,
    }: MarkPaidArgs): Promise<Bill> => {
      const { data, error } = await supabase
        .from('bills')
        .update({ status: 'paid', paid_date, paid_note: paid_note ?? null })
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

/**
 * Shared confirmation message used by every "Unmark as paid" affordance
 * (bill list inline button, bill view button, dashboard quick action).
 *
 * Pass the human-friendly tenant + period descriptors when available; the
 * helper falls back to a generic message when context is missing.
 */
export function buildUnmarkConfirmMessage(args: {
  tenantLabel?: string | null;
  periodLabel?: string | null;
}): string {
  const ctx =
    args.tenantLabel && args.periodLabel
      ? ` for ${args.tenantLabel} (${args.periodLabel})`
      : '';
  return `Unmark this bill${ctx} as paid? The PAID stamp will be removed.`;
}
