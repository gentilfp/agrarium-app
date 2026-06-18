// Hooks React Query para safras. O app só consulta/cria; todo o cálculo é do backend.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export type Recommendation = {
  title: string;
  detail: string;
  severity: string;
  metric: string;
};

export type Comparison = {
  metric: string;
  value: number;
  reference: number;
  delta_pct: number;
  status: string;
};

export type AnalysisResult = {
  score: number;
  cost_per_t: number;
  cost_per_ha: number;
  cost_per_kg_atr: number;
  revenue_per_t: number;
  margin_per_t: number;
  break_even_tch: number;
  recommendations: {
    items: Recommendation[];
    comparisons: Comparison[];
    decomposition: Record<string, number>;
  };
};

export type Harvest = {
  id: number;
  season: string;
  cut_number: number;
  cane_area_ha: number;
  production_t: number;
  productivity_tch: number;
  atr_kg_per_t: number;
  producer_type: string;
  delivery_mode: string;
  analysis_result: AnalysisResult | null;
};

export type CostEntryInput = {
  category: string;
  phase?: string;
  amount: number;
  unit: 'per_ha' | 'per_t';
};

export type HarvestInput = {
  season: string;
  cut_number: number;
  cane_area_ha: number;
  production_t: number;
  atr_kg_per_t: number;
  producer_type: string;
  delivery_mode: string;
  cost_entries_attributes: CostEntryInput[];
};

export function useHarvests() {
  return useQuery({
    queryKey: ['harvests'],
    queryFn: async () => (await api.get<Harvest[]>('/harvests')).data,
  });
}

export function useHarvest(id?: string | number) {
  return useQuery({
    queryKey: ['harvest', String(id)],
    queryFn: async () => (await api.get<Harvest>(`/harvests/${id}`)).data,
    enabled: id != null,
  });
}

export function useCreateHarvest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: HarvestInput) =>
      (await api.post<Harvest>('/harvests', { harvest: payload })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['harvests'] }),
  });
}
