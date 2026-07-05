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
  description: string;
  category: CategoryKey;
  quantity?: number;
  unit?: Unit;
  unitPrice?: number;
  amount: number; // total em R$ (se houver quantity+unitPrice, é quantity×unitPrice)
};

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
  score: number; // 0–100
  status: Status;
  recommendations: string[];
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

const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
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
  const { score, status } = buildScore({ custoKgAtr, tch, margemKgAtr, precoAtr: input.precoAtr });
  const recommendations = buildRecommendations({
    breakdown,
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
    score,
    status,
    recommendations,
  };
}

function buildBreakdown(items: CostItem[], custoTotal: number): CategoryBreakdown[] {
  return CATEGORIES.map(({ key, label }) => {
    const total = items.filter((i) => i.category === key).reduce((s, i) => s + itemAmount(i), 0);
    return { key, label, total, pct: custoTotal > 0 ? (total / custoTotal) * 100 : 0 };
  })
    .filter((b) => b.total > 0)
    .sort((a, b) => b.total - a.total);
}

// Score 0–100 com pesos PLACEHOLDER (validar — Q13/Q14):
// eficiência de custo (R$/kg ATR) 50% · produtividade 25% · margem 25%.
function buildScore(p: {
  custoKgAtr: number;
  tch: number;
  margemKgAtr: number;
  precoAtr: number;
}): { score: number; status: Status } {
  // Custo: abaixo do benchmark é bom. Igual → 50; metade do custo → 100; dobro → 0.
  const custoScore = p.custoKgAtr > 0 ? clamp(benchCustoKgAtr / p.custoKgAtr, 0, 2) * 50 : 50;
  // Produtividade: igual ao setor → 50; o dobro → 100.
  const prodScore = clamp(p.tch / BENCHMARK.tch, 0, 2) * 50;
  // Margem: margem zero → 50; +50% do preço → 100; −50% → 0.
  const margemRatio = p.precoAtr > 0 ? clamp(p.margemKgAtr / p.precoAtr, -0.5, 0.5) : 0;
  const margemScore = (margemRatio + 0.5) * 100;

  const score = Math.round(clamp(0.5 * custoScore + 0.25 * prodScore + 0.25 * margemScore, 0, 100));
  const status: Status = score >= 60 ? 'bom' : score >= 40 ? 'atencao' : 'critico';
  return { score, status };
}

function buildRecommendations(p: {
  breakdown: CategoryBreakdown[];
  custoKgAtr: number;
  tch: number;
  breakEvenTch: number;
  margem: number;
  modalidade: Modalidade;
}): string[] {
  const recs: string[] = [];
  const cct = p.breakdown.find((b) => b.key === 'colheita_cct');
  const arr = p.breakdown.find((b) => b.key === 'arrendamento');

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
    // Tratos da soca
    { id: 'i1', description: 'Ureia (45% N)', category: 'tratos_soca', quantity: 20000, unit: 'kg', unitPrice: 3.2, amount: 64000 },
    { id: 'i2', description: 'Cloreto de potássio (KCl)', category: 'tratos_soca', quantity: 16000, unit: 'kg', unitPrice: 3.8, amount: 60800 },
    { id: 'i3', description: 'Calcário dolomítico', category: 'tratos_soca', quantity: 160, unit: 't', unitPrice: 180, amount: 28800 },
    { id: 'i4', description: 'Herbicida (glifosato)', category: 'tratos_soca', quantity: 480, unit: 'L', unitPrice: 28, amount: 13440 },
    { id: 'i5', description: 'Inseticida (controle de broca)', category: 'tratos_soca', amount: 9500 },
    { id: 'i6', description: 'Aplicação/adubação (operação)', category: 'tratos_soca', amount: 18000 },
    // Formação (reforma parcial ~12 ha)
    { id: 'i7', description: 'Mudas (reforma parcial 12 ha)', category: 'formacao', amount: 22000 },
    { id: 'i8', description: 'Preparo de solo (aração/gradagem)', category: 'formacao', amount: 16500 },
    // Colheita / CCT
    { id: 'i9', description: 'Corte mecanizado', category: 'colheita_cct', quantity: 6240, unit: 't', unitPrice: 22, amount: 137280 },
    { id: 'i10', description: 'Transbordo / carregamento', category: 'colheita_cct', amount: 34000 },
    { id: 'i11', description: 'Transporte até a usina', category: 'colheita_cct', quantity: 6240, unit: 't', unitPrice: 12, amount: 74880 },
    // Arrendamento
    { id: 'i12', description: 'Arrendamento da terra', category: 'arrendamento', quantity: 80, unit: 'ha', unitPrice: 1200, amount: 96000 },
    // Outros
    { id: 'i13', description: 'Mão de obra fixa (tratorista/apontador)', category: 'outros', amount: 42000 },
    { id: 'i14', description: 'Conservação de estradas', category: 'outros', amount: 11000 },
    { id: 'i15', description: 'Energia e diversos', category: 'outros', amount: 8000 },
  ],
};
