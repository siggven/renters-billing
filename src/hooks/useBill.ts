import { useQuery } from '@tanstack/react-query';
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

export function useBillById(id: string | undefined) {
  return useQuery({
    queryKey: ['bills', 'by-id', id],
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
