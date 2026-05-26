import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Rate, RateInput } from '../types/db';

const RATES_KEY = ['rates'] as const;

/** All rates ordered most-recent first. Useful for the history list. */
export function useAllRates() {
  return useQuery({
    queryKey: RATES_KEY,
    queryFn: async (): Promise<Rate[]> => {
      const { data, error } = await supabase
        .from('rates')
        .select('*')
        .order('effective_date', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Rate[];
    },
  });
}

/**
 * The "current" rate = the rate row with the largest effective_date that is
 * <= today (ISO date). Returns null if no rate has been set yet, or if all
 * rates are future-dated.
 */
export function useCurrentRate() {
  return useQuery({
    queryKey: [...RATES_KEY, 'current'],
    queryFn: async (): Promise<Rate | null> => {
      const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
      const { data, error } = await supabase
        .from('rates')
        .select('*')
        .lte('effective_date', today)
        .order('effective_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as Rate | null;
    },
  });
}

export function useAddRate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: RateInput): Promise<Rate> => {
      const { data, error } = await supabase
        .from('rates')
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data as Rate;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: RATES_KEY }),
  });
}
