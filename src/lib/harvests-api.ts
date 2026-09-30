// Camada de dados das safras (React Query sobre o axios de `api.ts`). O cálculo é do
// backend — aqui só disparamos as chamadas e tipamos o que volta pronto.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from './api';
import type { CategoryKey, ContractType, CropSlug, DeliveryModality, HarvestFormInput } from './harvest';
import { isSugarcane, itemAmount } from './harvest';
import type { Status } from './theme';

// ── Tipos das respostas da API (snake_case, como o backend serializa) ─────────
export type CropDTO = { slug: string; name: string; production_unit: string };
export type CostItemDTO = {
  id: number;
  category: CategoryKey;
  subcategory: string;
  description?: string | null;
  applications?: string | null;
  application_mode?: string | null;
  quantity?: number | null;
  unit?: string | null;
  unit_price?: number | null;
  amount: number;
  label: string;
  note: string;
};

export type HarvestInputDTO = {
  id: number;
  crop_year: string;
  crop_slug: string | null;
  crop_name: string | null;
  production_unit: string | null;
  production_quantity: number | null;
  sale_price: number | null;
  contract_type: ContractType | null;
  contract_type_label: string | null;
  delivery_modality: DeliveryModality | null;
  delivery_modality_label: string | null;
  plant_cane_area_ha: number | null;
  ratoon_area_ha: number | null;
  total_area_ha: number | null;
  plant_cane_production_t: number | null;
  ratoon_production_t: number | null;
  total_production_t: number;
  atr_kg_per_t: number | null;
  atr_price: number | null;
  created_at: string;
  cost_items: CostItemDTO[];
};

export type BreakdownRow = { key: CategoryKey; label: string; total: number; pct: number };
export type SurveyCompareRow = {
  key: string;
  label: string;
  value_per_ha: number;
  ref_per_ha: number;
  delta_pct: number;
  status: Status;
};
export type BenchmarkRow = {
  key: string;
  label: string;
  value: number;
  ref: number | null;
  format: 'brl' | 'brl4' | 't_ha' | 'kg_t' | 'unit_ha';
  status: Status;
};

export type Report = {
  crop: CropDTO | null;
  area_ha: number;
  production_quantity: number;
  production_unit: string | null;
  total_production_t: number;
  tch: number;
  plant_cane_tch: number;
  ratoon_tch: number;
  atr_total_kg: number;
  total_cost: number;
  cost_per_ha: number;
  cost_per_t: number;
  cost_per_unit: number;
  cost_per_kg_atr: number;
  revenue: number | null;
  margin: number | null;
  margin_per_unit: number | null;
  margin_per_kg_atr: number | null;
  break_even_tch: number | null;
  breakdown: BreakdownRow[];
  survey_comparison: SurveyCompareRow[];
  sector_benchmark: BenchmarkRow[];
  recommendations: string[];
  has_reference: boolean;
  has_benchmark: boolean;
  reference_meta: { n: number; region: string; updated_at: string | null };
};

export type HarvestDetail = {
  id: number;
  crop_year: string;
  crop: CropDTO | null;
  created_at: string;
  input: HarvestInputDTO;
  report: Report;
};

export type HarvestSummary = {
  id: number;
  crop_year: string;
  crop: CropDTO | null;
  created_at: string;
  indicators: {
    cost_per_kg_atr: number;
    cost_per_t: number;
    margin: number | null;
    cost_per_kg_atr_status: Status;
    cost_per_unit: number;
    cost_per_unit_status: Status | null;
  };
};

// ── Monta o corpo do POST a partir do formulário (camelCase → snake_case) ─────
function toPayload(input: HarvestFormInput) {
  const cane = isSugarcane(input.crop);
  return {
    harvest: {
      crop: input.crop,
      crop_year: input.cropYear.trim() || '—',
      plant_cane_area_ha: cane ? (input.plantCaneAreaHa ?? 0) : null,
      ratoon_area_ha: cane ? (input.ratoonAreaHa ?? 0) : null,
      total_area_ha: input.totalAreaHa ?? null,
      plant_cane_production_t: cane ? (input.plantCaneProductionT ?? 0) : null,
      ratoon_production_t: cane ? (input.ratoonProductionT ?? 0) : null,
      production_quantity: cane ? null : (input.productionQuantity ?? null),
      sale_price: cane ? null : (input.salePrice ?? null),
      atr_kg_per_t: cane ? (input.atrKgPerT ?? 0) : null,
      atr_price: cane ? (input.atrPrice ?? 0) : null,
      contract_type: input.contractType,
      delivery_modality: input.deliveryModality,
      cost_items_attributes: input.items.map((i) => ({
        category: i.category,
        subcategory: i.subcategory,
        description: i.description || null,
        applications: i.applications ?? null,
        application_mode: i.mode ?? null,
        quantity: i.quantity ?? null,
        unit: i.quantity != null ? i.unit : null,
        unit_price: i.unitPrice ?? null,
        amount: itemAmount(i),
      })),
    },
  };
}

// ── Hooks ─────────────────────────────────────────────────────────────────────
export function useHarvests(filters?: { crop?: CropSlug | string; season?: string }) {
  return useQuery({
    queryKey: ['harvests', filters?.crop ?? null, filters?.season ?? null],
    queryFn: async () =>
      (await api.get<HarvestSummary[]>('/harvests', { params: filters })).data,
  });
}

export function useHarvest(id?: string | number) {
  return useQuery({
    queryKey: ['harvests', String(id)],
    queryFn: async () => (await api.get<HarvestDetail>(`/harvests/${id}`)).data,
    enabled: id != null && id !== '',
  });
}

export function useCreateHarvest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: HarvestFormInput) =>
      (await api.post<HarvestDetail>('/harvests', toPayload(input))).data,
    onSuccess: (harvest) => {
      qc.invalidateQueries({ queryKey: ['harvests'] });
      qc.setQueryData(['harvests', String(harvest.id)], harvest);
    },
  });
}

export type ReferenceData = {
  taxonomy: {
    categories: TaxonomyCategory[];
    contract_types: { key: ContractType; label: string }[];
    delivery_modalities: { key: DeliveryModality; label: string }[];
    applications: string[];
    units: string[];
  };
  reference_base: {
    n: number;
    region: string;
    updated_at: string | null;
    subcategory_medians: Record<string, number | null>;
  };
  market_benchmark: {
    crop_year: string;
    cost_per_t: number | null;
    cost_per_kg_atr: number | null;
    tch: number | null;
    atr_kg_per_t: number | null;
    atr_price: number | null;
    source: string | null;
    region: string | null;
  } | null;
};

export type TaxonomyCategory = {
  key: CategoryKey;
  label: string;
  hint: string;
  subcategories: { key: string; label: string; applications?: boolean; modes?: string[] }[];
};

export function useReference(crop?: CropSlug | string) {
  return useQuery({
    queryKey: ['reference', crop ?? null],
    queryFn: async () => (await api.get<ReferenceData>('/reference', { params: { crop } })).data,
  });
}
