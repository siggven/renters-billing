import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Tenant, TenantInput } from '../types/db';

const TENANTS_KEY = ['tenants'] as const;

export function useTenants() {
  return useQuery({
    queryKey: TENANTS_KEY,
    queryFn: async (): Promise<Tenant[]> => {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .order('active', { ascending: false })
        .order('room_number', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Tenant[];
    },
  });
}

export function useCreateTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TenantInput): Promise<Tenant> => {
      const { data, error } = await supabase
        .from('tenants')
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data as Tenant;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: TENANTS_KEY }),
  });
}

export function useUpdateTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...patch
    }: { id: string } & Partial<TenantInput>): Promise<Tenant> => {
      const { data, error } = await supabase
        .from('tenants')
        .update(patch)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Tenant;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: TENANTS_KEY }),
  });
}

export function useSetTenantActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      active,
    }: {
      id: string;
      active: boolean;
    }): Promise<Tenant> => {
      const { data, error } = await supabase
        .from('tenants')
        .update({ active })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Tenant;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: TENANTS_KEY }),
  });
}
