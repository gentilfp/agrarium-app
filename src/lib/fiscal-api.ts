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
  // Backend reason when actions_allowed is false (cancelled, no identity, live gate).
  actions_refusal: string | null;
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
  is_demo: boolean;
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
  needs_response: 'Esperando você',
  awaiting_xml: 'Buscando a nota completa',
  processing: 'Processando',
  needs_review: 'Classificar itens',
  processed: 'Pronta',
  disputed: 'Contestada',
  failed: 'Com problema',
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

export type ManualPurchaseInput = {
  supplier_name: string;
  supplier_document?: string;
  issued_at: string;
  items: {
    description: string;
    agronomic_category: string;
    quantity: string;
    unit: 'kg' | 'L' | 'UN';
    value: string;
  }[];
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

const CATEGORY_LABELS: Record<string, string> = {
  nitrogen_fertilizer: 'Fertilizante nitrogenado',
  phosphate_fertilizer: 'Fertilizante fosfatado',
  potassium_fertilizer: 'Fertilizante potássico',
  npk_fertilizer: 'Fertilizante NPK',
  liming_corrective: 'Calcário / corretivo',
  herbicide: 'Herbicida',
  fungicide: 'Fungicida',
  insecticide: 'Inseticida',
  seed: 'Sementes / mudas',
  adjuvant: 'Adjuvante',
  fuel: 'Combustível',
  other: 'Outros',
  [UNCLASSIFIED_BUCKET]: 'Sem classificação',
};

export function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category;
}

// Document statuses that keep a note out of the purchase report.
const EXCLUDED_STATUS_LABELS: Record<string, string> = {
  received: 'aguardando processamento',
  failed: 'com falha',
  cancelled: 'canceladas',
};

export function excludedStatusLabel(status: string): string {
  return EXCLUDED_STATUS_LABELS[status] ?? status;
}

export function useFiscalDocuments() {
  return useQuery({
    queryKey: ['fiscal-documents'],
    queryFn: async () => (await api.get<FiscalDocumentDTO[]>('/fiscal_documents')).data,
  });
}

// AGR-5: inbox list with backend-derived status, per-status counts (from the
// X-Inbox-Counts response header) and connection/sync status.
export function useInboxDocuments(filters: InboxFilters) {
  return useQuery({
    queryKey: ['fiscal-inbox', filters],
    queryFn: async () => {
      const res = await api.get<FiscalDocumentDTO[]>('/fiscal_documents', {
        params: cleanParams(filters),
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

export function useFiscalIdentities() {
  return useQuery({
    queryKey: ['fiscal-identities'],
    queryFn: async () => (await api.get<FiscalIdentityDTO[]>('/fiscal_identities')).data,
  });
}

export function useManifestDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      event_type,
      justification,
    }: {
      id: number;
      event_type: string;
      justification?: string;
    }) =>
      (
        await api.post<{ manifestation: FiscalManifestationDTO; already_submitted: boolean; inbox_status: string }>(
          `/fiscal_documents/${id}/manifestations`,
          { event_type, justification },
        )
      ).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fiscal-inbox'] });
      qc.invalidateQueries({ queryKey: ['fiscal-documents'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['price-comparisons'] });
    },
  });
}

export function useFiscalDocument(id?: string | number) {
  return useQuery({
    queryKey: ['fiscal-documents', String(id)],
    queryFn: async () =>
      (await api.get<FiscalDocumentDetail>(`/fiscal_documents/${id}`)).data,
    enabled: id != null && id !== '',
  });
}

// match_status do backend. O padrão é a fila do conferente; Compras também
// inclui 'unmatched' para mostrar a descrição do primeiro item pendente. A API
// aceita um status por requisição, então cada status vira uma chamada.
export function useReviewItems(matchStatuses: string[] = ['needs_review']) {
  return useQuery({
    queryKey: ['review-items', matchStatuses],
    queryFn: async () => {
      const responses = await Promise.all(
        matchStatuses.map((status) =>
          api.get<FiscalItemDTO[]>('/fiscal_document_items', { params: { match_status: status } }),
        ),
      );
      return responses.flatMap((res) => res.data);
    },
  });
}

export function useProductSearch(query: string) {
  return useQuery({
    queryKey: ['products', query],
    queryFn: async () =>
      (await api.get<ProductDTO[]>('/products', { params: { q: query } })).data,
    enabled: query.trim().length >= 2,
  });
}

export function useUploadFiscalDocuments() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ form }: { form: FormData }) =>
      (await api.post<{ results: UploadResult[] }>('/fiscal_documents', form)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fiscal-documents'] });
      qc.invalidateQueries({ queryKey: ['fiscal-inbox'] });
      qc.invalidateQueries({ queryKey: ['fiscal-identities'] });
      qc.invalidateQueries({ queryKey: ['review-items'] });
      qc.invalidateQueries({ queryKey: ['purchase-report'] });
      qc.invalidateQueries({ queryKey: ['purchase-items'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['price-comparisons'] });
    },
  });
}

export function useCreateManualFiscalDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ManualPurchaseInput) =>
      (await api.post<FiscalDocumentDTO>('/fiscal_documents/manual', { manual_purchase: input })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fiscal-documents'] });
      qc.invalidateQueries({ queryKey: ['fiscal-inbox'] });
      qc.invalidateQueries({ queryKey: ['review-items'] });
      qc.invalidateQueries({ queryKey: ['purchase-report'] });
      qc.invalidateQueries({ queryKey: ['purchase-items'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['price-comparisons'] });
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
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['price-comparisons'] });
    },
  });
}

export function useCreateProduct() {
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) =>
      (await api.post<ProductDTO>('/products', { product: payload })).data,
  });
}

export function usePurchaseReport(filters: PurchaseFilters) {
  return useQuery({
    queryKey: ['purchase-report', filters],
    queryFn: async () =>
      (
        await api.get<PurchaseReportDTO>('/purchase_report', {
          params: cleanParams(filters),
        })
      ).data,
  });
}

export function usePurchaseItems(filters: PurchaseFilters, page: number) {
  return useQuery({
    queryKey: ['purchase-items', filters, page],
    queryFn: async () => {
      const res = await api.get<FiscalItemDTO[]>('/fiscal_document_items', {
        params: cleanParams({ ...filters, page, per_page: 20 }),
      });
      return { items: res.data, total: Number(res.headers['x-total-count'] ?? res.data.length) };
    },
  });
}

export { apiError };
