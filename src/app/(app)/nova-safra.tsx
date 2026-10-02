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
import { apiError } from '@/lib/api';
import {
  APLICACOES,
  CATEGORIES,
  categoryLabel,
  CONTRACT_TYPES,
  CROPS,
  DELIVERY_MODALITIES,
  EXAMPLE_INPUT,
  findSubcategory,
  isSugarcane,
  itemAmount,
  itemLabel,
  itemNote,
  subcategoriesFor,
  UNITS,
  type CategoryKey,
  type ContractType,
  type CostItem,
  type CropSlug,
  type DeliveryModality,
  type Unit,
} from '@/lib/harvest';
import { useCreateHarvest, useReference } from '@/lib/harvests-api';
import { brl, colors } from '@/lib/theme';

// Aceita vírgula decimal (pt-BR) e ponto. Retorna undefined se não for número.
function parseNum(s: string): number | undefined {
  const v = parseFloat(String(s).trim().replace(',', '.'));
  return Number.isFinite(v) ? v : undefined;
}

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// Grupo de "pílulas". Se `optional`, tocar na pílula ativa desmarca (volta a null).
function PillGroup<T extends string>({
  label,
  hint,
  options,
  value,
  onChange,
  optional,
}: {
  label: string;
  hint?: string;
  options: { key: T; label: string }[];
  value: T | null;
  onChange: (v: T | null) => void;
  optional?: boolean;
}) {
  return (
    <View style={styles.pillGroup}>
      <Text style={styles.pillLabel}>
        {label}
        {optional ? <Text style={styles.optional}> · opcional</Text> : null}
      </Text>
      {hint ? <Text style={styles.pillHint}>{hint}</Text> : null}
      <View style={styles.pillWrap}>
        {options.map((o) => {
          const active = o.key === value;
          return (
            <Pressable
              key={o.key}
              onPress={() => onChange(optional && active ? null : o.key)}
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
  const createHarvest = useCreateHarvest();
  const [step, setStep] = useState(0);
  const [err, setErr] = useState<string | null>(null);

  // Passo 1 — cultura, safra e produção (cana: planta × soca + ATR)
  const [crop, setCrop] = useState<CropSlug>('cana-de-acucar');
  const [cropYear, setCropYear] = useState('2025/26');
  const [plantArea, setPlantArea] = useState('');
  const [ratoonArea, setRatoonArea] = useState('');
  const [totalArea, setTotalArea] = useState('');
  const [plantProd, setPlantProd] = useState('');
  const [ratoonProd, setRatoonProd] = useState('');
  const [cultivatedArea, setCultivatedArea] = useState('');
  const [productionQty, setProductionQty] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [atr, setAtr] = useState('');
  const [precoAtr, setPrecoAtr] = useState('');
  const [contractType, setContractType] = useState<ContractType | null>(null);
  const [deliveryModality, setDeliveryModality] = useState<DeliveryModality | null>(null);

  const cane = isSugarcane(crop);
  const cropUnit = CROPS.find((c) => c.slug === crop)?.unit ?? 'un';
  // Taxonomia vem do backend (GET /reference?crop=); a lista estática é o fallback.
  const reference = useReference(crop);
  const categories = reference.data?.taxonomy.categories ?? CATEGORIES;

  // Passo 2 — itens de custo
  const [items, setItems] = useState<CostItem[]>([]);

  // Formulário de adicionar/editar item
  const [cat, setCat] = useState<CategoryKey>('formation');
  const [sub, setSub] = useState<string | undefined>(undefined);
  const [applications, setApplications] = useState<string | undefined>(undefined);
  const [mode, setMode] = useState<string | undefined>(undefined);
  const [desc, setDesc] = useState('');
  const [qty, setQty] = useState('');
  const [unit, setUnit] = useState<Unit>('R$');
  const [unitPrice, setUnitPrice] = useState('');
  const [valorTotal, setValorTotal] = useState('');

  const serverSubcategories = reference.data?.taxonomy.categories.find((c) => c.key === cat)
    ?.subcategories;
  const subOptions = serverSubcategories ?? subcategoriesFor(cat);
  const subMeta = subOptions.find((s) => s.key === sub) ?? findSubcategory(cat, sub);

  const qtyN = parseNum(qty);
  const priceN = parseNum(unitPrice);
  const previewAmount = qtyN != null && priceN != null ? qtyN * priceN : parseNum(valorTotal);

  const totalProdDerived = cane
    ? (parseNum(plantProd) ?? 0) + (parseNum(ratoonProd) ?? 0)
    : (parseNum(productionQty) ?? 0);
  const custoTotal = items.reduce((s, i) => s + itemAmount(i), 0);
  const subtotals = categories.map((c) => ({
    ...c,
    total: items.filter((i) => i.category === c.key).reduce((s, i) => s + itemAmount(i), 0),
  })).filter((c) => c.total > 0);

  function changeCrop(next: CropSlug) {
    setCrop(next);
    // Categorias de cana não existem nas demais culturas — volta para Formação.
    if (!isSugarcane(next) && (cat === 'ratoon_treatments' || cat === 'harvest_cct')) {
      changeCategory('formation');
    }
    setErr(null);
  }

  function fillExample() {
    const e = EXAMPLE_INPUT;
    setCrop(e.crop);
    setCropYear(e.cropYear);
    setPlantArea(String(e.plantCaneAreaHa));
    setRatoonArea(String(e.ratoonAreaHa));
    setTotalArea(String(e.totalAreaHa));
    setPlantProd(String(e.plantCaneProductionT));
    setRatoonProd(String(e.ratoonProductionT));
    setAtr(String(e.atrKgPerT));
    setPrecoAtr(String(e.atrPrice));
    setContractType(e.contractType);
    setDeliveryModality(e.deliveryModality);
    setItems(e.items.map((i) => ({ ...i, id: newId() })));
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
    if (!cropYear.trim()) return setErr('Informe a safra (ex.: 2025/26).');
    if (cane) {
      const plantA = parseNum(plantArea);
      const ratoonA = parseNum(ratoonArea);
      const plantP = parseNum(plantProd);
      const ratoonP = parseNum(ratoonProd);
      const atrN = parseNum(atr);
      const precoN = parseNum(precoAtr);
      if ((plantA ?? 0) <= 0 && (ratoonA ?? 0) <= 0)
        return setErr('Informe a área colhida de cana-planta e/ou cana-soca (ha).');
      if ((plantP ?? 0) <= 0 && (ratoonP ?? 0) <= 0)
        return setErr('Informe a produção de cana-planta e/ou cana-soca (t).');
      if (atrN == null || atrN <= 0) return setErr('Informe o ATR (kg/t).');
      if (precoN == null || precoN <= 0) return setErr('Informe o preço do ATR (R$/kg).');
    } else {
      if ((parseNum(cultivatedArea) ?? 0) <= 0)
        return setErr('Informe a área cultivada (ha).');
    }
    setErr(null);
    setStep(1);
  }

  async function submit() {
    if (items.length === 0) return setErr('Adicione pelo menos um item de custo.');
    setErr(null);
    try {
      const harvest = await createHarvest.mutateAsync({
        crop,
        cropYear,
        plantCaneAreaHa: parseNum(plantArea),
        ratoonAreaHa: parseNum(ratoonArea),
        totalAreaHa: cane ? parseNum(totalArea) : parseNum(cultivatedArea),
        plantCaneProductionT: parseNum(plantProd),
        ratoonProductionT: parseNum(ratoonProd),
        productionQuantity: parseNum(productionQty),
        salePrice: parseNum(salePrice),
        atrKgPerT: parseNum(atr),
        atrPrice: parseNum(precoAtr),
        contractType,
        deliveryModality,
        items,
      });
      router.push({ pathname: '/resultado', params: { id: String(harvest.id) } });
    } catch (e) {
      setErr(apiError(e, 'Não foi possível salvar a safra.'));
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Stepper steps={['Safra', 'Custos']} current={step} />

        {step === 0 ? (
          <>
            <Text style={styles.h1}>Dados da safra</Text>
            {CROPS.length > 1 ? (
              <PillGroup label="Cultura" options={CROPS.map((c) => ({ key: c.slug, label: c.name }))}
                value={crop} onChange={(c) => c && changeCrop(c)} />
            ) : null}
            <Field label="Safra" value={cropYear} onChangeText={setCropYear} placeholder="2025/26" />

            {cane ? (
              <>
                <Text style={styles.groupLabel}>Área colhida (ha)</Text>
                <Text style={styles.groupHint}>
                  Separe cana-planta (1º corte) de cana-soca (2º corte em diante) — elas custam e
                  produzem de forma bem diferente.
                </Text>
                <View style={styles.row3}>
                  <View style={styles.col}>
                    <Field label="Cana-planta" value={plantArea} onChangeText={setPlantArea}
                      keyboardType="numeric" placeholder="12" />
                  </View>
                  <View style={styles.col}>
                    <Field label="Cana-soca" value={ratoonArea} onChangeText={setRatoonArea}
                      keyboardType="numeric" placeholder="68" />
                  </View>
                </View>
                <Field label="Área total (inclui reforma/rotação)" hint="opcional — só para contexto"
                  value={totalArea} onChangeText={setTotalArea} keyboardType="numeric" placeholder="90" />

                <Text style={styles.groupLabel}>Produção (t)</Text>
                <View style={styles.row3}>
                  <View style={styles.col}>
                    <Field label="Cana-planta" value={plantProd} onChangeText={setPlantProd}
                      keyboardType="numeric" placeholder="1200" />
                  </View>
                  <View style={styles.col}>
                    <Field label="Cana-soca" value={ratoonProd} onChangeText={setRatoonProd}
                      keyboardType="numeric" placeholder="5040" />
                  </View>
                </View>
                <Text style={styles.derived}>Produção total: {totalProdDerived.toLocaleString('pt-BR')} t</Text>

                <Field label="ATR (kg/t)" hint="da usina, ou uma referência da região"
                  value={atr} onChangeText={setAtr} keyboardType="numeric" placeholder="140" />
                <Field label="Preço do ATR (R$/kg)" hint="CONSECANA da safra"
                  value={precoAtr} onChangeText={setPrecoAtr} keyboardType="numeric" placeholder="1,13" />

                <PillGroup label="Tipo de produtor (contrato)" optional
                  hint="Como a usina te remunera."
                  options={CONTRACT_TYPES} value={contractType} onChange={setContractType} />
                <PillGroup label="Modalidade de entrega" optional
                  hint="Quem arca com o CTT (corte/transbordo/transporte)."
                  options={DELIVERY_MODALITIES} value={deliveryModality} onChange={setDeliveryModality} />
              </>
            ) : (
              <>
                <Field label="Área cultivada (ha)"
                  value={cultivatedArea} onChangeText={setCultivatedArea}
                  keyboardType="numeric" placeholder="100" />
                <Text style={styles.groupLabel}>Produção ({cropUnit})</Text>
                <Field label={`Quantidade produzida (${cropUnit})`} hint="opcional — para o custo por unidade"
                  value={productionQty} onChangeText={setProductionQty}
                  keyboardType="numeric" placeholder="3500" />
                <Text style={styles.derived}>
                  Produção total: {totalProdDerived.toLocaleString('pt-BR')} {cropUnit}
                </Text>
                <Field label={`Preço de venda (R$/${cropUnit})`} hint="opcional — para receita e margem"
                  value={salePrice} onChangeText={setSalePrice}
                  keyboardType="numeric" placeholder="130" />
              </>
            )}

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

            <View style={styles.itemForm}>
              <Select label="Categoria" options={categories} value={cat} onChange={changeCategory} />
              <Select
                label="Subcategoria"
                placeholder="Escolha o item de custo…"
                hint="Lista fechada — ajuda a comparar com outros produtores depois."
                options={subOptions}
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
                value={unit} onChange={(u) => setUnit((u ?? 'R$') as Unit)} />
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

            <Button title={createHarvest.isPending ? 'Enviando…' : 'Ver relatório'}
              onPress={submit} disabled={items.length === 0 || createHarvest.isPending} />
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

  groupLabel: { fontSize: 14, fontWeight: '700', color: colors.text, marginTop: 4, marginBottom: 2 },
  groupHint: { fontSize: 12, color: colors.muted, marginBottom: 8, lineHeight: 17 },
  derived: { fontSize: 13, color: colors.primaryDark, fontWeight: '700', marginBottom: 16 },

  pillGroup: { marginBottom: 16 },
  pillLabel: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 2 },
  optional: { fontSize: 12, fontWeight: '600', color: colors.muted },
  pillHint: { fontSize: 12, color: colors.muted, marginBottom: 6 },
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
