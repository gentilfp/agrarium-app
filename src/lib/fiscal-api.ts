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
  // AGR-5: backend-derived inbox state (the app never computes it).
  fiscal_identity_id: number | null;
  xml_status: string;
  manifestation_deadline: string | null;
  sync_error: string | null;
  inbox_status: string;
  deadline_soon: boolean;
  actions_allowed: boolean;
};

export type FiscalManifestationDTO = {
  id: number;
  event_type: string;
  justification: string | null;
  status: string;
  provider_protocol: string | null;
  sefaz_protocol: string | null;
  error: string | null;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
};

export type FiscalIdentityDTO = {
  id: number;
  document_type: string;
  document_number: string;
  name: string | null;
  connection_status: string;
  last_synced_at: string | null;
  last_sync_error: string | null;
};

export const INBOX_STATUSES = [
  'needs_response',
  'awaiting_xml',
  'processing',
  'needs_review',
  'processed',
  'disputed',
  'failed',
  'cancelled',
] as const;

const INBOX_LABELS: Record<string, string> = {
  needs_response: 'Responder',
  awaiting_xml: 'Aguard. XML',
  processing: 'Processando',
  needs_review: 'Revisar',
  processed: 'Processada',
  disputed: 'Contestada',
  failed: 'Falhou',
  cancelled: 'Cancelada',
};

export function inboxLabel(status: string): string {
  return INBOX_LABELS[status] ?? status;
}

export type InboxFilters = {
  inbox_status?: string;
  issuer?: string;
  date_from?: string;
  date_to?: string;
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

export type FiscalDocumentDetail = FiscalDocumentDTO & {
  items: FiscalItemDTO[];
  manifestations: FiscalManifestationDTO[];
};

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

// AGR-5: inbox list with backend-derived status, per-status counts (from the
// X-Inbox-Counts response header) and connection/sync status.
export function useInboxDocuments(filters: InboxFilters, demo = false) {
  return useQuery({
    queryKey: ['fiscal-inbox', filters, demo],
    queryFn: async () => {
      const res = await api.get<FiscalDocumentDTO[]>('/fiscal_documents', {
        params: cleanParams({ ...filters, ...(demo ? { demo: 'true' } : {}) }),
      });
      let counts: Record<string, number> = {};
      const raw = res.headers['x-inbox-counts'];
      if (raw) {
        try {
          counts = JSON.parse(raw);
        } catch {
          counts = {};
        }
      }
      const filteredTotal = Number(res.headers['x-total-count'] ?? res.data.length);
      // "Todas" must mean every status in the current (non-status) filter
      // context, like the per-status chips do — X-Total-Count is post status
      // filter, which would relabel it to the filtered count.
      const total =
        Object.values(counts).reduce((sum, n) => sum + Number(n), 0) || filteredTotal;
      return { documents: res.data, counts, total };
    },
  });
}

export function useFiscalIdentities(demo = false) {
  return useQuery({
    queryKey: ['fiscal-identities', demo],
    queryFn: async () =>
      (
        await api.get<FiscalIdentityDTO[]>('/fiscal_identities', {
          params: demo ? { demo: 'true' } : {},
        })
      ).data,
  });
}

export function useManifestDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      event_type,
      justification,
      demo,
    }: {
      id: number;
      event_type: string;
      justification?: string;
      demo?: boolean;
    }) =>
      (
        await api.post<{ manifestation: FiscalManifestationDTO; already_submitted: boolean; inbox_status: string }>(
          `/fiscal_documents/${id}/manifestations`,
          { event_type, justification },
          { params: demo ? { demo: 'true' } : {} },
        )
      ).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fiscal-inbox'] });
      qc.invalidateQueries({ queryKey: ['fiscal-documents'] });
    },
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
