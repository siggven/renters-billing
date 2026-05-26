import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type {
  FatherElectricityMainReading,
  FatherElectricityMainReadingInput,
  FatherWaterMainReading,
  FatherWaterMainReadingInput,
  Reading,
  ReadingInput,
} from '../types/db';

const READINGS_KEY = ['readings'] as const;
const FATHER_KEY = ['father_water_main_readings'] as const;
const FATHER_ELEC_KEY = ['father_electricity_main_readings'] as const;

// ── Per-tenant readings ────────────────────────────────────────────────────

/** All readings for the chosen period, one row per tenant who has data this month. */
export function useReadingsForPeriod(period: string) {
  return useQuery({
    queryKey: [...READINGS_KEY, 'period', period],
    queryFn: async (): Promise<Reading[]> => {
      const { data, error } = await supabase
        .from('readings')
        .select('*')
        .eq('period', period);
      if (error) throw error;
      return (data ?? []) as Reading[];
    },
    enabled: Boolean(period),
  });
}

/**
 * The most-recent reading for each tenant strictly before `period`.
 * Used to populate the "previous" reference column on the entry form and to
 * validate `current ≥ previous` per FR-14.
 *
 * Postgres-side: filter `period < cutoff`, sort by tenant then period desc.
 * Client-side: fold to a Map<tenantId, Reading> taking the first occurrence
 * per tenant (which is the most recent thanks to the period-desc sort).
 */
export function usePreviousReadings(period: string) {
  return useQuery({
    queryKey: [...READINGS_KEY, 'previous', period],
    queryFn: async (): Promise<Map<string, Reading>> => {
      const { data, error } = await supabase
        .from('readings')
        .select('*')
        .lt('period', period)
        .order('tenant_id', { ascending: true })
        .order('period', { ascending: false });
      if (error) throw error;
      const map = new Map<string, Reading>();
      for (const row of (data ?? []) as Reading[]) {
        if (!map.has(row.tenant_id)) {
          map.set(row.tenant_id, row);
        }
      }
      return map;
    },
    enabled: Boolean(period),
  });
}

/**
 * Bulk upsert readings for a period. Conflicts on (tenant_id, period) — re-saving
 * the same period replaces the old values, satisfying FR-16.
 */
export function useUpsertReadings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rows: ReadingInput[]): Promise<Reading[]> => {
      if (rows.length === 0) return [];
      const { data, error } = await supabase
        .from('readings')
        .upsert(rows, { onConflict: 'tenant_id,period' })
        .select();
      if (error) throw error;
      return (data ?? []) as Reading[];
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: READINGS_KEY }),
  });
}

// ── Father's water-main readings ───────────────────────────────────────────

/** Father's main reading for the chosen period, or null. */
export function useFatherWaterMainForPeriod(period: string) {
  return useQuery({
    queryKey: [...FATHER_KEY, 'period', period],
    queryFn: async (): Promise<FatherWaterMainReading | null> => {
      const { data, error } = await supabase
        .from('father_water_main_readings')
        .select('*')
        .eq('period', period)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as FatherWaterMainReading | null;
    },
    enabled: Boolean(period),
  });
}

/** The most recent father-main reading strictly before `period`, or null. */
export function usePreviousFatherWaterMain(period: string) {
  return useQuery({
    queryKey: [...FATHER_KEY, 'previous', period],
    queryFn: async (): Promise<FatherWaterMainReading | null> => {
      const { data, error } = await supabase
        .from('father_water_main_readings')
        .select('*')
        .lt('period', period)
        .order('period', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as FatherWaterMainReading | null;
    },
    enabled: Boolean(period),
  });
}

/** Upsert father's main reading. Conflicts on `period` (UNIQUE constraint). */
export function useUpsertFatherWaterMain() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: FatherWaterMainReadingInput,
    ): Promise<FatherWaterMainReading> => {
      const { data, error } = await supabase
        .from('father_water_main_readings')
        .upsert(input, { onConflict: 'period' })
        .select()
        .single();
      if (error) throw error;
      return data as FatherWaterMainReading;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: FATHER_KEY }),
  });
}



// ── Father's Meralco-main bookkeeping (T11) ─────────────────────────────────

/** Father's Meralco-main reading for the chosen period, or null. */
export function useFatherElectricityMainForPeriod(period: string) {
  return useQuery({
    queryKey: [...FATHER_ELEC_KEY, 'period', period],
    queryFn: async (): Promise<FatherElectricityMainReading | null> => {
      const { data, error } = await supabase
        .from('father_electricity_main_readings')
        .select('*')
        .eq('period', period)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as FatherElectricityMainReading | null;
    },
    enabled: Boolean(period),
  });
}

/** The most recent Meralco-main reading strictly before `period`, or null. */
export function usePreviousFatherElectricityMain(period: string) {
  return useQuery({
    queryKey: [...FATHER_ELEC_KEY, 'previous', period],
    queryFn: async (): Promise<FatherElectricityMainReading | null> => {
      const { data, error } = await supabase
        .from('father_electricity_main_readings')
        .select('*')
        .lt('period', period)
        .order('period', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as FatherElectricityMainReading | null;
    },
    enabled: Boolean(period),
  });
}

/** Upsert father's Meralco-main reading. Conflicts on `period` (UNIQUE). */
export function useUpsertFatherElectricityMain() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: FatherElectricityMainReadingInput,
    ): Promise<FatherElectricityMainReading> => {
      const { data, error } = await supabase
        .from('father_electricity_main_readings')
        .upsert(input, { onConflict: 'period' })
        .select()
        .single();
      if (error) throw error;
      return data as FatherElectricityMainReading;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: FATHER_ELEC_KEY }),
  });
}
