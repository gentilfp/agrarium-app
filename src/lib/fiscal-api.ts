// Dados fiscais da AGR-6 (React Query sobre o axios de `api.ts`).
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api, apiError } from './api';

export type FiscalDocumentDTO = {
  id: number;
  chave: string;
  emitter_document: string | null;
  emitter_name: string | null;
  emitter_uf: string | null;
  recipient_document: string | null;
  issued_at: string | null;
  nat_op: string | null;
  total_vnf: number | null;
  protocol_number: string | null;
  protocol_status: string | null;
  source: string;
  status: string;
  is_demo: boolean;
  items_count: number;
  needs_review_count: number;
};

export type FiscalItemDTO = {
  id: number;
  position: number;
  fiscal_document_id: number;
  supplier_code: string | null;
  ean: string | null;
  description: string;
  ncm: string | null;
  supplier_name: string | null;
  supplier_document: string | null;
  issued_at: string | null;
  source: string | null;
  commercial_unit: string | null;
  commercial_quantity: number | null;
  line_total: number | null;
  discount: number | null;
  product: { id: number; name: string; agronomic_category: string; brand_name: string | null } | null;
  agronomic_category: string | null;
  normalized_quantity: number | null;
  base_unit: string | null;
  price_per_base_unit: number | null;
  match_method: string | null;
  match_confidence: number | null;
  match_status: string;
  is_demo: boolean;
};

export type FiscalDocumentDetail = FiscalDocumentDTO & { items: FiscalItemDTO[] };

export type ProductDTO = {
  id: number;
  name: string;
  brand_name: string | null;
  agronomic_category: string;
  package_size: number | null;
  package_unit: string | null;
  ean: string | null;
  verified: boolean;
};

export type UploadResult = {
  filename: string;
  status: 'imported' | 'already_imported' | 'error';
  fiscal_document_id?: number;
  chave?: string;
  error?: string;
};

export type PurchaseFilters = {
  date_from?: string;
  date_to?: string;
  supplier?: string;
  category?: string;
  q?: string;
};

export type PurchaseReportDTO = {
  total_value: string;
  items_count: number;
  documents_count: number;
  by_month: { month: string; total_value: string; items_count: number }[];
  by_supplier: {
    supplier_name: string;
    supplier_document: string | null;
    total_value: string;
    items_count: number;
  }[];
  by_category: { category: string; total_value: string; items_count: number }[];
  quantities: {
    product_id: number | null;
    product_name: string;
    base_unit: string;
    quantity: number;
    items_count: number;
  }[];
  excluded_documents: Record<string, number>;
  valuation: string;
};

export const UNCLASSIFIED_BUCKET = 'unclassified';

export function lineValue(item: Pick<FiscalItemDTO, 'line_total' | 'discount'>): number | null {
  if (item.line_total == null) return null;
  return item.line_total - (item.discount ?? 0);
}

function cleanParams(obj: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v != null && v !== ''));
}

export const AGRONOMIC_CATEGORIES = [
  'nitrogen_fertilizer',
  'phosphate_fertilizer',
  'potassium_fertilizer',
  'npk_fertilizer',
  'liming_corrective',
  'herbicide',
  'fungicide',
  'insecticide',
  'seed',
  'adjuvant',
  'fuel',
  'other',
] as const;

export function useFiscalDocuments(demo = false) {
  return useQuery({
    queryKey: ['fiscal-documents', demo],
    queryFn: async () =>
      (await api.get<FiscalDocumentDTO[]>('/fiscal_documents', { params: demo ? { demo: 'true' } : {} }))
        .data,
  });
}

export function useFiscalDocument(id?: string | number, demo = false) {
  return useQuery({
    queryKey: ['fiscal-documents', String(id), demo],
    queryFn: async () =>
      (await api.get<FiscalDocumentDetail>(`/fiscal_documents/${id}`, {
        params: demo ? { demo: 'true' } : {},
      })).data,
    enabled: id != null && id !== '',
  });
}

export function useReviewItems(demo = false) {
  return useQuery({
    queryKey: ['review-items', demo],
    queryFn: async () =>
      (
        await api.get<FiscalItemDTO[]>('/fiscal_document_items', {
          params: { match_status: 'needs_review', ...(demo ? { demo: 'true' } : {}) },
        })
      ).data,
  });
}

export function useProductSearch(query: string, demo = false) {
  return useQuery({
    queryKey: ['products', query, demo],
    queryFn: async () =>
      (await api.get<ProductDTO[]>('/products', { params: { q: query, ...(demo ? { demo: 'true' } : {}) } }))
        .data,
    enabled: query.trim().length >= 2,
  });
}

export function useUploadFiscalDocuments() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (form: FormData) =>
      (await api.post<{ results: UploadResult[] }>('/fiscal_documents', form)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fiscal-documents'] });
      qc.invalidateQueries({ queryKey: ['review-items'] });
    },
  });
}

export function useCorrectItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: number; patch: Record<string, unknown> }) =>
      (await api.patch<FiscalItemDTO>(`/fiscal_document_items/${id}`, patch)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fiscal-documents'] });
      qc.invalidateQueries({ queryKey: ['review-items'] });
    },
  });
}

export function useCreateProduct() {
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) =>
      (await api.post<ProductDTO>('/products', { product: payload })).data,
  });
}

export function usePurchaseReport(filters: PurchaseFilters, demo = false) {
  return useQuery({
    queryKey: ['purchase-report', filters, demo],
    queryFn: async () =>
      (
        await api.get<PurchaseReportDTO>('/purchase_report', {
          params: cleanParams({ ...filters, ...(demo ? { demo: 'true' } : {}) }),
        })
      ).data,
  });
}

export function usePurchaseItems(filters: PurchaseFilters, page: number, demo = false) {
  return useQuery({
    queryKey: ['purchase-items', filters, page, demo],
    queryFn: async () => {
      const res = await api.get<FiscalItemDTO[]>('/fiscal_document_items', {
        params: cleanParams({ ...filters, page, per_page: 20, ...(demo ? { demo: 'true' } : {}) }),
      });
      return { items: res.data, total: Number(res.headers['x-total-count'] ?? res.data.length) };
    },
  });
}

export { apiError };
