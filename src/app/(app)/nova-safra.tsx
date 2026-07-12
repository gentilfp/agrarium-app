import { router } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { BarRow } from '@/components/BarRow';
import { Stepper } from '@/components/Stepper';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Select } from '@/components/ui/Select';
import {
  APLICACOES,
  CATEGORIES,
  categoryLabel,
  CONTRATO_TIPOS,
  EXAMPLE_INPUT,
  findSubcategory,
  itemAmount,
  itemLabel,
  itemNote,
  MODALIDADES,
  subcategoriesFor,
  UNITS,
  type CategoryKey,
  type ContratoTipo,
  type CostItem,
  type Modalidade,
  type Unit,
} from '@/lib/harvest';
import { useHarvest } from '@/lib/harvest-store';
import { brl, colors } from '@/lib/theme';

// Aceita vírgula decimal (pt-BR) e ponto. Retorna undefined se não for número.
function parseNum(s: string): number | undefined {
  const v = parseFloat(String(s).trim().replace(',', '.'));
  return Number.isFinite(v) ? v : undefined;
}

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// Grupo de "pílulas" selecionáveis (categoria, unidade, contrato…).
function PillGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { key: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.pillGroup}>
      <Text style={styles.pillLabel}>{label}</Text>
      <View style={styles.pillWrap}>
        {options.map((o) => {
          const active = o.key === value;
          return (
            <Pressable
              key={o.key}
              onPress={() => onChange(o.key)}
              style={[styles.pill, active && styles.pillActive]}>
              <Text style={[styles.pillText, active && styles.pillTextActive]}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function NovaSafra() {
  const { addAnalysis } = useHarvest();
  const [step, setStep] = useState(0);
  const [err, setErr] = useState<string | null>(null);

  // Passo 1 — safra e produção
  const [safra, setSafra] = useState('24/25');
  const [areaHa, setAreaHa] = useState('');
  const [tch, setTch] = useState('');
  const [producaoT, setProducaoT] = useState('');
  const [atr, setAtr] = useState('');
  const [precoAtr, setPrecoAtr] = useState('');
  const [contratoTipo, setContratoTipo] = useState<ContratoTipo>('intermediario');
  const [modalidade, setModalidade] = useState<Modalidade>('embarcada');

  // Passo 2 — itens de custo
  const [items, setItems] = useState<CostItem[]>([]);

  // Formulário de adicionar/editar item
  const [cat, setCat] = useState<CategoryKey>('tratos_soca');
  const [sub, setSub] = useState<string | undefined>(undefined);
  const [applications, setApplications] = useState<string | undefined>(undefined);
  const [mode, setMode] = useState<string | undefined>(undefined);
  const [desc, setDesc] = useState(''); // observação livre (opcional)
  const [qty, setQty] = useState('');
  const [unit, setUnit] = useState<Unit>('R$');
  const [unitPrice, setUnitPrice] = useState('');
  const [valorTotal, setValorTotal] = useState('');

  const subMeta = findSubcategory(cat, sub);

  const qtyN = parseNum(qty);
  const priceN = parseNum(unitPrice);
  const previewAmount = qtyN != null && priceN != null ? qtyN * priceN : parseNum(valorTotal);

  const custoTotal = items.reduce((s, i) => s + itemAmount(i), 0);
  const subtotals = CATEGORIES.map((c) => ({
    ...c,
    total: items.filter((i) => i.category === c.key).reduce((s, i) => s + itemAmount(i), 0),
  })).filter((c) => c.total > 0);

  function fillExample() {
    setSafra(EXAMPLE_INPUT.safra);
    setAreaHa(String(EXAMPLE_INPUT.areaHa));
    setTch(EXAMPLE_INPUT.tch != null ? String(EXAMPLE_INPUT.tch) : '');
    setProducaoT('');
    setAtr(String(EXAMPLE_INPUT.atr));
    setPrecoAtr(String(EXAMPLE_INPUT.precoAtr));
    setContratoTipo(EXAMPLE_INPUT.contratoTipo);
    setModalidade(EXAMPLE_INPUT.modalidade);
    setItems(EXAMPLE_INPUT.items.map((i) => ({ ...i, id: newId() })));
    setErr(null);
    setStep(1);
  }

  function resetItemForm() {
    setSub(undefined);
    setApplications(undefined);
    setMode(undefined);
    setDesc('');
    setQty('');
    setUnit('R$');
    setUnitPrice('');
    setValorTotal('');
  }

  // Trocar de categoria zera a subcategoria (a lista muda).
  function changeCategory(next: CategoryKey) {
    setCat(next);
    setSub(undefined);
    setApplications(undefined);
    setMode(undefined);
  }

  function addItem() {
    const amount = previewAmount;
    if (!sub) {
      setErr('Escolha a subcategoria do custo na lista.');
      return;
    }
    if (amount == null || amount <= 0) {
      setErr('Informe o valor do item (total em R$ ou quantidade × preço).');
      return;
    }
    const item: CostItem = {
      id: newId(),
      category: cat,
      subcategory: sub,
      description: desc.trim(),
      amount,
      ...(subMeta?.applications && applications ? { applications } : {}),
      ...(subMeta?.modes && mode ? { mode } : {}),
      ...(qtyN != null ? { quantity: qtyN } : {}),
      ...(qtyN != null ? { unit } : {}),
      ...(priceN != null ? { unitPrice: priceN } : {}),
    };
    setItems((prev) => [...prev, item]);
    resetItemForm();
    setErr(null);
  }

  function editItem(item: CostItem) {
    setCat(item.category);
    setSub(item.subcategory);
    setApplications(item.applications);
    setMode(item.mode);
    setDesc(itemNote(item));
    setQty(item.quantity != null ? String(item.quantity) : '');
    setUnit(item.unit ?? 'R$');
    setUnitPrice(item.unitPrice != null ? String(item.unitPrice) : '');
    setValorTotal(item.quantity != null && item.unitPrice != null ? '' : String(item.amount));
    setItems((prev) => prev.filter((i) => i.id !== item.id));
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  function goToStep2() {
    const a = parseNum(areaHa);
    const t = parseNum(tch);
    const p = parseNum(producaoT);
    const atrN = parseNum(atr);
    const precoN = parseNum(precoAtr);
    if (a == null || a <= 0) return setErr('Informe a área de cana (ha).');
    if (t == null && p == null) return setErr('Informe a produtividade (t/ha) ou a produção total (t).');
    if (atrN == null || atrN <= 0) return setErr('Informe o ATR (kg/t).');
    if (precoN == null || precoN <= 0) return setErr('Informe o preço do ATR (R$/kg).');
    setErr(null);
    setStep(1);
  }

  function submit() {
    if (items.length === 0) return setErr('Adicione pelo menos um item de custo.');
    setErr(null);
    addAnalysis({
      safra: safra.trim() || '—',
      areaHa: parseNum(areaHa) ?? 0,
      tch: parseNum(tch),
      producaoT: parseNum(producaoT),
      atr: parseNum(atr) ?? 0,
      precoAtr: parseNum(precoAtr) ?? 0,
      contratoTipo,
      modalidade,
      items,
    });
    router.push('/resultado');
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Stepper steps={['Safra', 'Custos']} current={step} />

        {step === 0 ? (
          <>
            <Text style={styles.h1}>Dados da safra</Text>
            <Field label="Safra" value={safra} onChangeText={setSafra} placeholder="24/25" />
            <Field label="Área de cana (ha)" value={areaHa} onChangeText={setAreaHa}
              keyboardType="numeric" placeholder="80" />
            <Field label="Produtividade (t/ha)" hint="ou informe a produção total abaixo"
              value={tch} onChangeText={setTch} keyboardType="numeric" placeholder="78" />
            <Field label="Produção total (t) — opcional" value={producaoT} onChangeText={setProducaoT}
              keyboardType="numeric" placeholder="6240" />
            <Field label="ATR (kg/t)" hint="da usina, ou uma referência da região"
              value={atr} onChangeText={setAtr} keyboardType="numeric" placeholder="140" />
            <Field label="Preço do ATR (R$/kg)" hint="CONSECANA da safra"
              value={precoAtr} onChangeText={setPrecoAtr} keyboardType="numeric" placeholder="0,66" />

            <PillGroup label="Tipo de produtor" options={CONTRATO_TIPOS}
              value={contratoTipo} onChange={setContratoTipo} />
            <PillGroup label="Modalidade de entrega" options={MODALIDADES}
              value={modalidade} onChange={setModalidade} />

            {err ? <Text style={styles.err}>{err}</Text> : null}

            <Button title="Continuar" onPress={goToStep2} />
            <View style={styles.gap} />
            <Button title="Preencher com exemplo" variant="outline" onPress={fillExample} />
          </>
        ) : (
          <>
            <Text style={styles.h1}>Itens de custo</Text>
            <Text style={styles.sub}>
              Lance cada gasto da safra — como uma planilha. Descreva, escolha a categoria e o valor.
            </Text>

            {/* Formulário de item */}
            <View style={styles.itemForm}>
              <Select label="Categoria" options={CATEGORIES} value={cat} onChange={changeCategory} />
              <Select
                label="Subcategoria"
                placeholder="Escolha o item de custo…"
                hint="Lista fechada — ajuda a comparar com outros produtores depois."
                options={subcategoriesFor(cat)}
                value={sub}
                onChange={setSub}
              />

              {subMeta?.applications ? (
                <Select
                  label="Nº de aplicações"
                  placeholder="Selecione…"
                  options={APLICACOES.map((a) => ({ key: a, label: a }))}
                  value={applications}
                  onChange={setApplications}
                />
              ) : null}
              {subMeta?.modes ? (
                <Select
                  label="Modalidade de aplicação"
                  placeholder="Selecione…"
                  options={subMeta.modes.map((m) => ({ key: m, label: m }))}
                  value={mode}
                  onChange={setMode}
                />
              ) : null}

              <Field label="Observação (opcional)" value={desc} onChangeText={setDesc}
                placeholder="Ex.: produto/marca, detalhe…" />

              <View style={styles.row3}>
                <View style={styles.col}>
                  <Field label="Qtd (opc.)" value={qty} onChangeText={setQty}
                    keyboardType="numeric" placeholder="20000" />
                </View>
                <View style={styles.col}>
                  <Field label="Preço unit. (opc.)" value={unitPrice} onChangeText={setUnitPrice}
                    keyboardType="numeric" placeholder="3,20" />
                </View>
              </View>
              <PillGroup label="Unidade" options={UNITS.map((u) => ({ key: u, label: u }))}
                value={unit} onChange={setUnit} />
              <Field label="Valor total (R$)" hint={
                qtyN != null && priceN != null
                  ? `Calculado de quantidade × preço: ${brl(qtyN * priceN)}`
                  : 'Se não informar quantidade e preço, digite o total aqui'
              } value={valorTotal} onChangeText={setValorTotal}
                editable={!(qtyN != null && priceN != null)}
                keyboardType="numeric" placeholder="64000" />

              <Button title={previewAmount ? `Adicionar item (${brl(previewAmount)})` : 'Adicionar item'}
                onPress={addItem} />
            </View>

            {/* Lista de itens lançados */}
            {items.length > 0 ? (
              <View style={styles.list}>
                <View style={styles.listHeader}>
                  <Text style={styles.listTitle}>{items.length} itens lançados</Text>
                  <Text style={styles.total}>{brl(custoTotal)}</Text>
                </View>
                {items.map((i) => (
                  <Pressable key={i.id} onPress={() => editItem(i)} style={styles.itemRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemDesc} numberOfLines={1}>{itemLabel(i)}</Text>
                      <Text style={styles.itemMeta} numberOfLines={1}>
                        {categoryLabel(i.category)}
                        {itemNote(i) ? ` · ${itemNote(i)}` : ''}
                        {i.applications ? ` · ${i.applications}` : ''}
                        {i.mode ? ` · ${i.mode}` : ''}
                        {i.quantity != null && i.unitPrice != null
                          ? ` · ${i.quantity} ${i.unit} × ${brl(i.unitPrice)}`
                          : ''}
                      </Text>
                    </View>
                    <Text style={styles.itemAmount}>{brl(itemAmount(i))}</Text>
                    <Pressable onPress={() => removeItem(i.id)} hitSlop={10} style={styles.remove}>
                      <Text style={styles.removeText}>✕</Text>
                    </Pressable>
                  </Pressable>
                ))}

                {/* Subtotais por categoria (prévia da decomposição) */}
                <View style={styles.subtotals}>
                  {subtotals.map((s) => (
                    <BarRow key={s.key} label={s.label}
                      pct={custoTotal > 0 ? (s.total / custoTotal) * 100 : 0} value={brl(s.total)} />
                  ))}
                </View>
              </View>
            ) : (
              <Text style={styles.empty}>Nenhum item ainda. Adicione acima ou use o exemplo no passo anterior.</Text>
            )}

            {err ? <Text style={styles.err}>{err}</Text> : null}

            <Button title="Ver relatório" onPress={submit} disabled={items.length === 0} />
            <View style={styles.gap} />
            <Button title="Voltar" variant="outline" onPress={() => setStep(0)} />
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 48, maxWidth: 520, width: '100%', alignSelf: 'center' },
  h1: { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: 6 },
  sub: { fontSize: 14, color: colors.muted, marginBottom: 16, lineHeight: 20 },
  err: { color: colors.danger, marginBottom: 12 },
  gap: { height: 10 },

  pillGroup: { marginBottom: 16 },
  pillLabel: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 6 },
  pillWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  pillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  pillText: { fontSize: 13, color: colors.text, fontWeight: '600' },
  pillTextActive: { color: colors.white },

  itemForm: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 16,
  },
  row3: { flexDirection: 'row', gap: 12 },
  col: { flex: 1 },

  list: { marginBottom: 16 },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  listTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  total: { fontSize: 18, fontWeight: '800', color: colors.primaryDark },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemDesc: { fontSize: 15, color: colors.text, fontWeight: '600' },
  itemMeta: { fontSize: 12, color: colors.muted, marginTop: 2 },
  itemAmount: { fontSize: 15, color: colors.text, fontWeight: '700' },
  remove: { paddingHorizontal: 6, paddingVertical: 4 },
  removeText: { color: colors.danger, fontSize: 16, fontWeight: '700' },
  subtotals: { marginTop: 16 },
  empty: { fontSize: 14, color: colors.muted, marginBottom: 16, fontStyle: 'italic' },
});
