// Tipos e constantes do formulário de safra. O CÁLCULO vive no backend agora
// ("frontend burro, cálculo no backend"): custo, comparação com a base e benchmark
// chegam prontos via API (ver `harvests-api.ts`). Aqui ficam só a taxonomia (lista
// fechada para o formulário) e os helpers de exibição.

// ── Categorias (chaves em inglês, espelham o CostTaxonomy do backend) ─────────
export type CategoryKey = 'formation' | 'ratoon_treatments' | 'harvest_cct' | 'land_lease' | 'other';

export const CATEGORIES: { key: CategoryKey; label: string; hint: string }[] = [
  { key: 'formation', label: 'Formação', hint: 'Preparo de solo, plantio, mudas' },
  { key: 'ratoon_treatments', label: 'Tratos da soca', hint: 'Adubos, defensivos, herbicidas' },
  { key: 'harvest_cct', label: 'Colheita / CCT', hint: 'Corte, carregamento, transporte' },
  { key: 'land_lease', label: 'Arrendamento', hint: 'Aluguel da terra' },
  { key: 'other', label: 'Outros', hint: 'Mão de obra, conservação, ITR, seguros' },
];

export const categoryLabel = (k: CategoryKey) => CATEGORIES.find((c) => c.key === k)?.label ?? k;

// ── Subcategorias (dropdown do wizard, lista fechada p/ comparar depois) ──────
export type Subcategory = {
  key: string;
  label: string;
  applications?: boolean;
  modes?: string[];
};

const MODES_GROUND_AIR = ['Terrestre - barra total', 'Aérea - avião', 'Aérea - drone'];
const MODES_SPITTLEBUG = [
  'Terrestre - barra total',
  'Terrestre - 70/30',
  'Terrestre - drench',
  'Terrestre - corte de soqueira',
  'Terrestre - vinhaça localizada',
  'Aérea - avião',
  'Aérea - drone',
];
const MODES_SPHENOPHORUS = [
  'Terrestre - drench',
  'Terrestre - corte de soqueira',
  'Terrestre - vinhaça localizada',
];
const MODES_RIPENING = ['Aéreo - avião', 'Aérea - drone', 'Não se aplica'];

export const APLICACOES = ['1 aplicação', '2 aplicações', '3 aplicações', '+ de 3 aplicações'];

export const SUBCATEGORIES: Record<CategoryKey, Subcategory[]> = {
  formation: [
    { key: 'seedlings', label: 'Mudas' },
    { key: 'soil_prep', label: 'Preparo de solo' },
    { key: 'planting', label: 'Plantio (operação)' },
    { key: 'formation_other', label: 'Outros (formação)' },
  ],
  ratoon_treatments: [
    { key: 'npk_fertilizer', label: 'Fertilizante NPK' },
    { key: 'limestone', label: 'Calcário' },
    { key: 'gypsum', label: 'Gesso' },
    { key: 'foliar_nutrition', label: 'Nutrição foliar / tecnologias complementares', applications: true, modes: MODES_GROUND_AIR },
    { key: 'borer_insecticide', label: 'Inseticida — broca', applications: true, modes: MODES_GROUND_AIR },
    { key: 'spittlebug_insecticide', label: 'Inseticida — cigarrinha', applications: true, modes: MODES_SPITTLEBUG },
    { key: 'sphenophorus_insecticide', label: 'Inseticida — Sphenophorus levis', applications: true, modes: MODES_SPHENOPHORUS },
    { key: 'herbicide', label: 'Herbicida', applications: true, modes: ['Terrestre - barra total', 'Aérea - drone'] },
    { key: 'flowering_inhibitor', label: 'Inibidor de florescimento', modes: MODES_RIPENING },
    { key: 'ripener', label: 'Maturador', modes: MODES_RIPENING },
    { key: 'application_operation', label: 'Aplicação / adubação (operação)' },
    { key: 'ratoon_other', label: 'Outros (tratos)' },
  ],
  harvest_cct: [
    { key: 'cutting', label: 'Corte' },
    { key: 'loading', label: 'Transbordo / carregamento' },
    { key: 'transport', label: 'Transporte até a usina' },
    { key: 'cct_other', label: 'Outros (CCT)' },
  ],
  land_lease: [{ key: 'land_lease', label: 'Arrendamento da terra' }],
  other: [
    { key: 'labor', label: 'Mão de obra' },
    { key: 'road_maintenance', label: 'Conservação de estradas' },
    { key: 'energy', label: 'Energia' },
    { key: 'itr_insurance', label: 'ITR / seguros' },
    { key: 'misc', label: 'Outros / diversos' },
  ],
};

export const subcategoriesFor = (c: CategoryKey) => SUBCATEGORIES[c] ?? [];
export const findSubcategory = (c: CategoryKey, key?: string) =>
  key ? subcategoriesFor(c).find((s) => s.key === key) : undefined;
export const subcategoryLabel = (c: CategoryKey, key?: string) =>
  findSubcategory(c, key)?.label ?? '';

export const UNITS = ['R$', 'kg', 'L', 't', 'ha', 'saco', 'hora', 'diária', 'un'] as const;
export type Unit = (typeof UNITS)[number];

// ── Contrato (como é remunerado) e modalidade (quem arca o CTT) — opcionais ───
export type ContractType = 'atr_fixed' | 'consecana' | 'consecana_premium';
export type DeliveryModality = 'standing_cane' | 'own_cct' | 'outsourced_cct';

export const CONTRACT_TYPES: { key: ContractType; label: string }[] = [
  { key: 'atr_fixed', label: 'ATR Fixo' },
  { key: 'consecana', label: 'CONSECANA' },
  { key: 'consecana_premium', label: 'CONSECANA + Prêmio/Incentivo' },
];

export const DELIVERY_MODALITIES: { key: DeliveryModality; label: string }[] = [
  { key: 'standing_cane', label: 'Cana em pé (livre de CTT)' },
  { key: 'own_cct', label: 'CTT próprio' },
  { key: 'outsourced_cct', label: 'CTT terceirizado (Usina/Prestador)' },
];

export const contractLabel = (k?: ContractType | null) =>
  k ? CONTRACT_TYPES.find((c) => c.key === k)?.label ?? '—' : '—';
export const modalityLabel = (k?: DeliveryModality | null) =>
  k ? DELIVERY_MODALITIES.find((m) => m.key === k)?.label ?? '—' : '—';

// ── Item de custo (modelo do wizard; `id` é só do cliente, some no envio) ─────
export type CostItem = {
  id: string;
  category: CategoryKey;
  subcategory?: string;
  description: string;
  applications?: string;
  mode?: string;
  quantity?: number;
  unit?: Unit;
  unitPrice?: number;
  amount: number;
};

export function itemLabel(item: Pick<CostItem, 'category' | 'subcategory' | 'description'>): string {
  const sub = subcategoryLabel(item.category, item.subcategory);
  if (sub) return sub;
  return item.description?.trim() || categoryLabel(item.category);
}

export function itemNote(item: Pick<CostItem, 'category' | 'subcategory' | 'description'>): string {
  const d = item.description?.trim();
  return d && d !== subcategoryLabel(item.category, item.subcategory) ? d : '';
}

export function itemAmount(item: Pick<CostItem, 'quantity' | 'unitPrice' | 'amount'>): number {
  if (item.quantity != null && item.unitPrice != null) return item.quantity * item.unitPrice;
  return item.amount || 0;
}

// Dados que o formulário coleta (safra planta/soca + itens). Vira o corpo do POST.
export type HarvestFormInput = {
  cropYear: string; // ex.: "25/26"
  plantCaneAreaHa?: number; // área colheita cana-planta
  ratoonAreaHa?: number; // área colheita cana-soca
  totalAreaHa?: number; // inclui reforma/rotação
  plantCaneProductionT?: number;
  ratoonProductionT?: number;
  atrKgPerT?: number; // kg de ATR por tonelada
  atrPrice?: number; // R$ por kg de ATR
  contractType: ContractType | null; // opcional
  deliveryModality: DeliveryModality | null; // opcional
  items: CostItem[];
};

// ── Exemplo pré-preenchido (safra com reforma parcial: 12 ha planta / 68 ha soca) ─
export const EXAMPLE_INPUT: HarvestFormInput = {
  cropYear: '25/26',
  plantCaneAreaHa: 12,
  ratoonAreaHa: 68,
  totalAreaHa: 90,
  plantCaneProductionT: 1200,
  ratoonProductionT: 5040,
  atrKgPerT: 140,
  atrPrice: 1.13,
  contractType: 'consecana',
  deliveryModality: 'outsourced_cct',
  items: [
    { id: 'i1', category: 'ratoon_treatments', subcategory: 'npk_fertilizer', description: 'Ureia (45% N)', quantity: 20000, unit: 'kg', unitPrice: 3.2, amount: 64000 },
    { id: 'i2', category: 'ratoon_treatments', subcategory: 'npk_fertilizer', description: 'Cloreto de potássio (KCl)', quantity: 16000, unit: 'kg', unitPrice: 3.8, amount: 60800 },
    { id: 'i3', category: 'ratoon_treatments', subcategory: 'limestone', description: 'Calcário dolomítico', quantity: 160, unit: 't', unitPrice: 180, amount: 28800 },
    { id: 'i4', category: 'ratoon_treatments', subcategory: 'gypsum', description: 'Gesso agrícola', amount: 16000 },
    { id: 'i5', category: 'ratoon_treatments', subcategory: 'foliar_nutrition', description: '', applications: '2 aplicações', mode: 'Aérea - drone', amount: 20800 },
    { id: 'i6', category: 'ratoon_treatments', subcategory: 'borer_insecticide', description: '', applications: '2 aplicações', mode: 'Terrestre - barra total', amount: 9500 },
    { id: 'i7', category: 'ratoon_treatments', subcategory: 'spittlebug_insecticide', description: '', applications: '2 aplicações', mode: 'Terrestre - corte de soqueira', amount: 12800 },
    { id: 'i8', category: 'ratoon_treatments', subcategory: 'herbicide', description: 'Glifosato', applications: '2 aplicações', mode: 'Terrestre - barra total', quantity: 480, unit: 'L', unitPrice: 28, amount: 13440 },
    { id: 'i9', category: 'ratoon_treatments', subcategory: 'application_operation', description: 'Operação de aplicação/adubação', amount: 18000 },
    { id: 'i10', category: 'formation', subcategory: 'seedlings', description: 'Reforma parcial 12 ha', amount: 22000 },
    { id: 'i11', category: 'formation', subcategory: 'soil_prep', description: 'Aração/gradagem', amount: 16500 },
    { id: 'i12', category: 'harvest_cct', subcategory: 'cutting', description: 'Corte mecanizado', quantity: 6240, unit: 't', unitPrice: 22, amount: 137280 },
    { id: 'i13', category: 'harvest_cct', subcategory: 'loading', description: '', amount: 34000 },
    { id: 'i14', category: 'harvest_cct', subcategory: 'transport', description: '', quantity: 6240, unit: 't', unitPrice: 12, amount: 74880 },
    { id: 'i15', category: 'land_lease', subcategory: 'land_lease', description: '', quantity: 80, unit: 'ha', unitPrice: 1200, amount: 96000 },
    { id: 'i16', category: 'other', subcategory: 'labor', description: 'Tratorista/apontador', amount: 42000 },
    { id: 'i17', category: 'other', subcategory: 'road_maintenance', description: '', amount: 11000 },
    { id: 'i18', category: 'other', subcategory: 'energy', description: 'Energia e diversos', amount: 8000 },
  ],
};
