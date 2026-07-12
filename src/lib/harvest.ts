// Motor de cálculo do custo de produção da cana — MOCKUP (cálculo no cliente).
//
// As fórmulas e os benchmarks vêm de `docs/custos-de-producao.md`. Enquanto o modelo
// não é validado com o agrônomo (ver `docs/questions.md`), toda a conta vive aqui, no
// frontend. Depois de fechado, isto migra para o backend ("frontend burro, cálculo no
// backend"). Os números de benchmark e os pesos do score são ESTIMATIVAS a validar.

import { brl, type Status } from './theme';

// ── Categorias (os "blocos" de custo do §2 do doc) ────────────────────────────
export type CategoryKey = 'formacao' | 'tratos_soca' | 'colheita_cct' | 'arrendamento' | 'outros';

export const CATEGORIES: { key: CategoryKey; label: string; hint: string }[] = [
  { key: 'formacao', label: 'Formação', hint: 'Preparo de solo, plantio, mudas' },
  { key: 'tratos_soca', label: 'Tratos da soca', hint: 'Adubos, defensivos, herbicidas' },
  { key: 'colheita_cct', label: 'Colheita / CCT', hint: 'Corte, carregamento, transporte' },
  { key: 'arrendamento', label: 'Arrendamento', hint: 'Aluguel da terra' },
  { key: 'outros', label: 'Outros', hint: 'Mão de obra, conservação, ITR, seguros' },
];

export const categoryLabel = (k: CategoryKey) => CATEGORIES.find((c) => c.key === k)?.label ?? k;

// ── Subcategorias (dropdown do wizard) ────────────────────────────────────────
// Menos texto livre: o produtor escolhe a subcategoria numa lista fechada, para
// conseguirmos AGRUPAR e comparar depois (base Agrarium). A taxonomia dos tratos
// da soca vem direto do questionário "Custos Cana Soca" (jun–jul/2026).
//
// - `refHa`  : referência R$/ha da base (mediana do questionário, apenas insumo).
// - `modes`  : modalidades de aplicação (dropdown) quando fizer sentido.
// - `applications`: pede o nº de aplicações (dropdown).
export type Subcategory = {
  key: string;
  label: string;
  refHa?: number;
  applications?: boolean;
  modes?: string[];
};

// Modalidades reaproveitadas entre insumos.
const MODOS_TERRESTRE_AEREO = ['Terrestre - barra total', 'Aérea - avião', 'Aérea - drone'];
const MODOS_CIGARRINHA = [
  'Terrestre - barra total',
  'Terrestre - 70/30',
  'Terrestre - drench',
  'Terrestre - corte de soqueira',
  'Terrestre - vinhaça localizada',
  'Aérea - avião',
  'Aérea - drone',
];
const MODOS_SPHENOPHORUS = [
  'Terrestre - drench',
  'Terrestre - corte de soqueira',
  'Terrestre - vinhaça localizada',
];
const MODOS_MATURACAO = ['Aéreo - avião', 'Aérea - drone', 'Não se aplica'];

export const APLICACOES = ['1 aplicação', '2 aplicações', '3 aplicações', '+ de 3 aplicações'];

export const SUBCATEGORIES: Record<CategoryKey, Subcategory[]> = {
  formacao: [
    { key: 'mudas', label: 'Mudas' },
    { key: 'preparo_solo', label: 'Preparo de solo' },
    { key: 'plantio', label: 'Plantio (operação)' },
    { key: 'formacao_outros', label: 'Outros (formação)' },
  ],
  // Tratos da soca — insumos do questionário (R$/ha, apenas insumo) + operações.
  tratos_soca: [
    { key: 'npk', label: 'Fertilizante NPK', refHa: 1700 },
    { key: 'calcario', label: 'Calcário', refHa: 300 },
    { key: 'gesso', label: 'Gesso', refHa: 210 },
    {
      key: 'foliar',
      label: 'Nutrição foliar / tecnologias complementares',
      refHa: 190,
      applications: true,
      modes: MODOS_TERRESTRE_AEREO,
    },
    { key: 'broca', label: 'Inseticida — broca', refHa: 85, applications: true, modes: MODOS_TERRESTRE_AEREO },
    { key: 'cigarrinha', label: 'Inseticida — cigarrinha', refHa: 150, applications: true, modes: MODOS_CIGARRINHA },
    {
      key: 'sphenophorus',
      label: 'Inseticida — Sphenophorus levis',
      refHa: 230,
      applications: true,
      modes: MODOS_SPHENOPHORUS,
    },
    { key: 'herbicida', label: 'Herbicida', refHa: 365, applications: true, modes: ['Terrestre - barra total', 'Aérea - drone'] },
    { key: 'inibidor', label: 'Inibidor de florescimento', refHa: 34, modes: MODOS_MATURACAO },
    { key: 'maturador', label: 'Maturador', refHa: 68, modes: MODOS_MATURACAO },
    { key: 'tratos_aplicacao', label: 'Aplicação / adubação (operação)' },
    { key: 'tratos_outros', label: 'Outros (tratos)' },
  ],
  colheita_cct: [
    { key: 'corte', label: 'Corte' },
    { key: 'transbordo', label: 'Transbordo / carregamento' },
    { key: 'transporte', label: 'Transporte até a usina' },
    { key: 'cct_outros', label: 'Outros (CCT)' },
  ],
  arrendamento: [{ key: 'arrend_terra', label: 'Arrendamento da terra' }],
  outros: [
    { key: 'mao_obra', label: 'Mão de obra' },
    { key: 'conservacao', label: 'Conservação de estradas' },
    { key: 'energia', label: 'Energia' },
    { key: 'itr_seguro', label: 'ITR / seguros' },
    { key: 'outros_diversos', label: 'Outros / diversos' },
  ],
};

export const subcategoriesFor = (c: CategoryKey) => SUBCATEGORIES[c] ?? [];
export const findSubcategory = (c: CategoryKey, key?: string) =>
  key ? subcategoriesFor(c).find((s) => s.key === key) : undefined;
export const subcategoryLabel = (c: CategoryKey, key?: string) =>
  findSubcategory(c, key)?.label ?? '';

export const UNITS = ['R$', 'kg', 'L', 't', 'ha', 'saco', 'hora', 'diária', 'un'] as const;
export type Unit = (typeof UNITS)[number];

// ── Perfil de contrato (liga/desliga o CCT no bolso do produtor — §7) ─────────
export type ContratoTipo = 'basico' | 'intermediario' | 'integral' | 'completo' | 'spot';
export type Modalidade = 'em_pe' | 'embarcada' | 'na_esteira';

export const CONTRATO_TIPOS: { key: ContratoTipo; label: string }[] = [
  { key: 'basico', label: 'Básico' },
  { key: 'intermediario', label: 'Intermediário' },
  { key: 'integral', label: 'Integral' },
  { key: 'completo', label: 'Completo' },
  { key: 'spot', label: 'Spot' },
];

export const MODALIDADES: { key: Modalidade; label: string }[] = [
  { key: 'em_pe', label: 'Cana em pé' },
  { key: 'embarcada', label: 'Cana embarcada' },
  { key: 'na_esteira', label: 'Cana na esteira' },
];

// ── Item de custo discriminado (cada coisa que o produtor comprou) ────────────
export type CostItem = {
  id: string;
  category: CategoryKey;
  subcategory?: string; // chave da lista fechada (dropdown) — usada para agrupar/comparar
  description: string; // rótulo da subcategoria, ou uma observação livre opcional
  applications?: string; // nº de aplicações (dropdown), quando aplicável
  mode?: string; // modalidade de aplicação (dropdown), quando aplicável
  quantity?: number;
  unit?: Unit;
  unitPrice?: number;
  amount: number; // total em R$ (se houver quantity+unitPrice, é quantity×unitPrice)
};

// Nome de exibição do item: rótulo da subcategoria; a descrição livre vira detalhe.
export function itemLabel(item: Pick<CostItem, 'category' | 'subcategory' | 'description'>): string {
  const sub = subcategoryLabel(item.category, item.subcategory);
  if (sub) return sub;
  return item.description?.trim() || categoryLabel(item.category);
}

// Detalhe secundário (a observação livre, quando existe e não é o próprio rótulo).
export function itemNote(item: Pick<CostItem, 'category' | 'subcategory' | 'description'>): string {
  const d = item.description?.trim();
  return d && d !== subcategoryLabel(item.category, item.subcategory) ? d : '';
}

// Valor total de um item: prioriza quantidade × preço unitário quando ambos existem.
export function itemAmount(item: Pick<CostItem, 'quantity' | 'unitPrice' | 'amount'>): number {
  if (item.quantity != null && item.unitPrice != null) return item.quantity * item.unitPrice;
  return item.amount || 0;
}

export type HarvestInput = {
  safra: string; // ex.: "24/25"
  areaHa: number;
  producaoT?: number; // opcional; se ausente, derivamos de tch × área
  tch?: number; // opcional; produtividade t/ha
  atr: number; // kg de ATR por tonelada
  precoAtr: number; // R$ por kg de ATR
  contratoTipo: ContratoTipo;
  modalidade: Modalidade;
  items: CostItem[];
};

export type CategoryBreakdown = { key: CategoryKey; label: string; total: number; pct: number };

// Comparação insumo a insumo (R$/ha) contra a base Agrarium — o "compare com outros".
export type SurveyCompareRow = {
  key: string;
  label: string;
  value: number; // R$/ha do produtor
  ref: number; // R$/ha de referência (mediana da base)
  deltaPct: number; // (value − ref) / ref × 100
  status: Status;
};

export type HarvestResult = {
  input: HarvestInput;
  producaoT: number;
  tch: number;
  atrTotalKg: number;
  custoTotal: number;
  custoHa: number;
  custoT: number;
  custoKgAtr: number; // ⭐ indicador-chave
  receita: number;
  margem: number; // R$ total
  margemKgAtr: number; // preço do ATR − custo por kg de ATR
  breakEvenTch: number; // produtividade (t/ha) que zera a margem
  breakdown: CategoryBreakdown[]; // categorias com gasto, da maior para a menor
  surveyComparison: SurveyCompareRow[]; // insumos comparados com a base (R$/ha)
  recommendations: string[];
};

// ── Base de referência (o "DB" com que comparamos) ────────────────────────────
// Enquanto não há backend, a referência vem do questionário "Custos Cana Soca".
// Depois isto vira uma consulta ao banco (região × porte). Ver `docs/questions.md`.
export const SURVEY_REFERENCE = {
  n: 16,
  region: 'Centro-Sul (SP/MG/MS)',
  window: 'jun–jul/2026',
  note: 'Mediana R$/ha, apenas insumo (custo direto). Base Agrarium — questionário Custos Cana Soca.',
};

// ── Benchmarks do setor (ESTIMATIVA — §8 do doc, a validar com o agrônomo) ────
export const BENCHMARK = {
  custoT: 111, // R$/t (waterfall PECEGE 19/20–20/21)
  tch: 75, // t/ha médio Centro-Sul
  atr: 144, // kg/t nacional
  precoAtr: 0.66, // R$/kg (simulação 20/21)
  // Composição-alvo do custo por bloco (§6): Colheita/CCT é o maior.
  mixColheitaCctPct: 41,
  arrendamentoPctMax: 25,
  source: 'PECEGE / módulo "Gestão Econômica da Cana" (safras 19/20–20/21) — estimativa a validar',
};

// Custo de referência por kg de ATR, derivado do benchmark (~R$ 0,77/kg).
export const benchCustoKgAtr = BENCHMARK.custoT / BENCHMARK.atr;

// Status de comparação com uma referência (usado no relatório e no painel).
export function compareStatus(value: number, ref: number, lowerIsBetter: boolean): Status {
  if (ref <= 0) return 'bom';
  const ratio = value / ref;
  if (lowerIsBetter) return ratio <= 1 ? 'bom' : ratio <= 1.15 ? 'atencao' : 'critico';
  return ratio >= 1 ? 'bom' : ratio >= 0.85 ? 'atencao' : 'critico';
}

const num = (x: number, digits = 0) =>
  x.toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits });

// ── O cálculo ─────────────────────────────────────────────────────────────────
export function computeHarvest(input: HarvestInput): HarvestResult {
  const areaHa = input.areaHa || 0;
  const producaoT =
    input.producaoT && input.producaoT > 0 ? input.producaoT : (input.tch ?? 0) * areaHa;
  const tch = areaHa > 0 ? producaoT / areaHa : 0;
  const atrTotalKg = input.atr * producaoT;

  const custoTotal = input.items.reduce((s, i) => s + itemAmount(i), 0);
  const custoHa = areaHa > 0 ? custoTotal / areaHa : 0;
  const custoT = producaoT > 0 ? custoTotal / producaoT : 0;
  const custoKgAtr = atrTotalKg > 0 ? custoTotal / atrTotalKg : 0;

  const receita = input.precoAtr * atrTotalKg;
  const margem = receita - custoTotal;
  const margemKgAtr = input.precoAtr - custoKgAtr;

  // Produtividade que zera a margem, tratando o custo total como fixo:
  // receita(tch) = precoAtr × atr × tch × área  =  custoTotal.
  const receitaPorTch = input.precoAtr * input.atr * areaHa;
  const breakEvenTch = receitaPorTch > 0 ? custoTotal / receitaPorTch : 0;

  const breakdown = buildBreakdown(input.items, custoTotal);
  const surveyComparison = buildSurveyComparison(input.items, areaHa);
  const recommendations = buildRecommendations({
    breakdown,
    survey: surveyComparison,
    custoKgAtr,
    tch,
    breakEvenTch,
    margem,
    modalidade: input.modalidade,
  });

  return {
    input,
    producaoT,
    tch,
    atrTotalKg,
    custoTotal,
    custoHa,
    custoT,
    custoKgAtr,
    receita,
    margem,
    margemKgAtr,
    breakEvenTch,
    breakdown,
    surveyComparison,
    recommendations,
  };
}

// Compara os insumos lançados (convertidos p/ R$/ha) com a mediana da base.
// Só entram subcategorias que têm referência (`refHa`) — os tratos da soca.
function buildSurveyComparison(items: CostItem[], areaHa: number): SurveyCompareRow[] {
  if (areaHa <= 0) return [];
  return SUBCATEGORIES.tratos_soca
    .filter((s) => s.refHa != null)
    .map((s) => {
      const total = items
        .filter((i) => i.category === 'tratos_soca' && i.subcategory === s.key)
        .reduce((sum, i) => sum + itemAmount(i), 0);
      const value = total / areaHa;
      const ref = s.refHa as number;
      const deltaPct = ref > 0 ? ((value - ref) / ref) * 100 : 0;
      return { key: s.key, label: s.label, value, ref, deltaPct, status: compareStatus(value, ref, true) };
    })
    .filter((r) => r.value > 0); // só mostra o que o produtor de fato lançou
}

function buildBreakdown(items: CostItem[], custoTotal: number): CategoryBreakdown[] {
  return CATEGORIES.map(({ key, label }) => {
    const total = items.filter((i) => i.category === key).reduce((s, i) => s + itemAmount(i), 0);
    return { key, label, total, pct: custoTotal > 0 ? (total / custoTotal) * 100 : 0 };
  })
    .filter((b) => b.total > 0)
    .sort((a, b) => b.total - a.total);
}

function buildRecommendations(p: {
  breakdown: CategoryBreakdown[];
  survey: SurveyCompareRow[];
  custoKgAtr: number;
  tch: number;
  breakEvenTch: number;
  margem: number;
  modalidade: Modalidade;
}): string[] {
  const recs: string[] = [];
  const cct = p.breakdown.find((b) => b.key === 'colheita_cct');
  const arr = p.breakdown.find((b) => b.key === 'arrendamento');

  // Maior desvio acima da base de insumos (o "compare com outros" vira conselho).
  const acima = p.survey
    .filter((s) => s.deltaPct > 15)
    .sort((a, b) => b.value - b.ref - (a.value - a.ref))[0];
  if (acima) {
    recs.push(
      `Em ${acima.label.toLowerCase()} você gasta ${brl(acima.value)}/ha, ${num(acima.deltaPct)}% acima da referência da base (~${brl(acima.ref)}/ha). Vale revisar produto/dose.`,
    );
  }

  if (cct && cct.pct > BENCHMARK.mixColheitaCctPct + 5) {
    const extra =
      p.modalidade === 'na_esteira'
        ? ' Como você entrega "na esteira", o transporte inteiro pesa no seu custo — reveja o raio até a usina.'
        : ' Reveja o raio de transporte e a negociação do CCT.';
    recs.push(
      `Colheita/CCT é ${num(cct.pct)}% do seu custo, acima da referência do setor (~${BENCHMARK.mixColheitaCctPct}%).${extra}`,
    );
  }

  if (arr && arr.pct > BENCHMARK.arrendamentoPctMax) {
    recs.push(
      `Arrendamento pesa ${num(arr.pct)}% do custo — acima do usual (~15–23%). Vale renegociar o contrato da terra.`,
    );
  }

  if (p.breakEvenTch > 0 && p.tch < p.breakEvenTch) {
    recs.push(
      `Sua produtividade (${num(p.tch, 1)} t/ha) está abaixo do ponto de equilíbrio (~${num(p.breakEvenTch, 1)} t/ha): neste cenário a receita não cobre os custos.`,
    );
  } else if (p.tch < BENCHMARK.tch) {
    recs.push(
      `Produtividade (${num(p.tch, 1)} t/ha) abaixo da média do setor (~${BENCHMARK.tch} t/ha). Avalie reforma do canavial e ajuste de adubação.`,
    );
  }

  // Insight-chave do produto: custo eficiente, mas margem apertada pelo preço do ATR.
  if (p.custoKgAtr <= benchCustoKgAtr && p.margem < 0) {
    recs.push(
      'Seu custo por kg de ATR está abaixo da referência do setor — sua operação é eficiente. A margem apertada vem do preço do ATR, não do seu custo.',
    );
  } else if (p.custoKgAtr > benchCustoKgAtr) {
    recs.push(
      `Seu custo por kg de ATR (${brl(p.custoKgAtr, 4)}) está acima da referência (~${brl(benchCustoKgAtr, 4)}). É a principal alavanca para melhorar a margem.`,
    );
  }

  if (p.margem < 0) {
    recs.push('Margem negativa neste cenário: revise custos, produtividade ou renegocie preço/arrendamento.');
  }

  if (recs.length === 0) {
    recs.push('Seus indicadores estão dentro ou acima da referência do setor. Bom trabalho!');
  }
  return recs;
}

// ── Exemplo pré-preenchido para a demo (safra soca com reforma parcial, 80 ha) ─
export const EXAMPLE_INPUT: HarvestInput = {
  safra: '24/25',
  areaHa: 80,
  tch: 78,
  atr: 140,
  precoAtr: 0.66,
  contratoTipo: 'intermediario',
  modalidade: 'embarcada',
  items: [
    // Tratos da soca — insumos (subcategoria da lista fechada; amount = R$/ha × 80 ha)
    { id: 'i1', category: 'tratos_soca', subcategory: 'npk', description: 'Ureia (45% N)', quantity: 20000, unit: 'kg', unitPrice: 3.2, amount: 64000 },
    { id: 'i2', category: 'tratos_soca', subcategory: 'npk', description: 'Cloreto de potássio (KCl)', quantity: 16000, unit: 'kg', unitPrice: 3.8, amount: 60800 },
    { id: 'i3', category: 'tratos_soca', subcategory: 'calcario', description: 'Calcário dolomítico', quantity: 160, unit: 't', unitPrice: 180, amount: 28800 },
    { id: 'i4', category: 'tratos_soca', subcategory: 'gesso', description: 'Gesso agrícola', amount: 16000 },
    { id: 'i5', category: 'tratos_soca', subcategory: 'foliar', description: '', applications: '2 aplicações', mode: 'Aérea - drone', amount: 20800 },
    { id: 'i6', category: 'tratos_soca', subcategory: 'broca', description: '', applications: '2 aplicações', mode: 'Terrestre - barra total', amount: 9500 },
    { id: 'i7', category: 'tratos_soca', subcategory: 'cigarrinha', description: '', applications: '2 aplicações', mode: 'Terrestre - corte de soqueira', amount: 12800 },
    { id: 'i8', category: 'tratos_soca', subcategory: 'herbicida', description: 'Glifosato', applications: '2 aplicações', mode: 'Terrestre - barra total', quantity: 480, unit: 'L', unitPrice: 28, amount: 13440 },
    { id: 'i9', category: 'tratos_soca', subcategory: 'tratos_aplicacao', description: 'Operação de aplicação/adubação', amount: 18000 },
    // Formação (reforma parcial ~12 ha)
    { id: 'i10', category: 'formacao', subcategory: 'mudas', description: 'Reforma parcial 12 ha', amount: 22000 },
    { id: 'i11', category: 'formacao', subcategory: 'preparo_solo', description: 'Aração/gradagem', amount: 16500 },
    // Colheita / CCT
    { id: 'i12', category: 'colheita_cct', subcategory: 'corte', description: 'Corte mecanizado', quantity: 6240, unit: 't', unitPrice: 22, amount: 137280 },
    { id: 'i13', category: 'colheita_cct', subcategory: 'transbordo', description: '', amount: 34000 },
    { id: 'i14', category: 'colheita_cct', subcategory: 'transporte', description: '', quantity: 6240, unit: 't', unitPrice: 12, amount: 74880 },
    // Arrendamento
    { id: 'i15', category: 'arrendamento', subcategory: 'arrend_terra', description: '', quantity: 80, unit: 'ha', unitPrice: 1200, amount: 96000 },
    // Outros
    { id: 'i16', category: 'outros', subcategory: 'mao_obra', description: 'Tratorista/apontador', amount: 42000 },
    { id: 'i17', category: 'outros', subcategory: 'conservacao', description: '', amount: 11000 },
    { id: 'i18', category: 'outros', subcategory: 'energia', description: 'Energia e diversos', amount: 8000 },
  ],
};
