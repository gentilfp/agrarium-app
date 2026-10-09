// AGR-22/AGR-23: Início (GET /dashboard) e Preços (GET /price_comparisons).
// Somente leitura — todo cálculo vive no backend; aqui só há formatação.
import { useQuery } from '@tanstack/react-query';

import { api } from './api';
import { colors } from './theme';

export type PriceStatus = 'above' | 'below' | 'in_line' | 'insufficient_data';

export type PriceComparisonItem = {
  product_id: number;
  product_name: string | null;
  category: string | null;
  base_unit: string;
  user_avg_price: string;
  last_price: string | null;
  last_purchase_on: string | null;
  total_spent: string;
  market_avg_price: string | null;
  market_min_price: string | null;
  diff_pct: number | null;
  status: PriceStatus;
  producers_count: number;
  samples_count: number;
};

export type PriceComparisonDTO = {
  items: PriceComparisonItem[];
  source_note: string;
};

export type DashboardDTO = {
  period: { from: string; to: string };
  previous_period: { from: string; to: string };
  total_value: string;
  previous_total_value: string;
  change_pct: number | null;
  documents_count: number;
  items_count: number;
  by_month: { month: string; total_value: string }[];
  top_categories: { category: string; total_value: string; share_pct: number }[];
  top_suppliers: {
    supplier_name: string;
    supplier_document: string | null;
    total_value: string;
    items_count: number;
  }[];
  pending: { needs_response: number; needs_review_items: number };
  price_highlights: PriceComparisonItem[];
  demo: boolean;
};

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => (await api.get<DashboardDTO>('/dashboard')).data,
  });
}

export function usePriceComparisons() {
  return useQuery({
    queryKey: ['price-comparisons'],
    queryFn: async () => (await api.get<PriceComparisonDTO>('/price_comparisons')).data,
  });
}

function pct(value: number): string {
  return `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
}

export type PriceBadge = { label: string; color: string };

// Etiqueta única para "você vs. média", usada em Início e em Preços.
export function priceBadge(status: PriceStatus, diffPct: number | null): PriceBadge {
  if (status === 'above') {
    return { label: `${pct(diffPct ?? 0)} acima da média`, color: colors.danger };
  }
  if (status === 'below') {
    return { label: `${pct(Math.abs(diffPct ?? 0))} abaixo da média`, color: colors.good };
  }
  if (status === 'in_line') {
    return { label: 'Na média', color: colors.warn };
  }
  return { label: 'Poucos dados ainda', color: colors.muted };
}
