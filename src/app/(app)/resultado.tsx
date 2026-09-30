import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BarRow } from '@/components/BarRow';
import { CHART_COLORS, CompareBars, StackedBar } from '@/components/CostChart';
import { MetricCard } from '@/components/MetricCard';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useHarvest, type BenchmarkRow } from '@/lib/harvests-api';
import { cropName, isSugarcane } from '@/lib/harvest';
import { brl, colors, statusColor, type Status } from '@/lib/theme';

const num = (x: number, d = 0) =>
  x.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });

function fmtBench(row: BenchmarkRow, unit: string): { value: string; ref: string } {
  const ref = (v: number | null, f: (n: number) => string) => (v == null ? '—' : f(v));
  switch (row.format) {
    case 'brl':
      return { value: brl(row.value, 0), ref: ref(row.ref, (n) => brl(n, 0)) };
    case 'brl4':
      return { value: brl(row.value, 4), ref: ref(row.ref, (n) => brl(n, 4)) };
    case 't_ha':
      return { value: `${num(row.value, 1)} t/ha`, ref: ref(row.ref, (n) => `${num(n, 0)} t/ha`) };
    case 'kg_t':
      return { value: `${num(row.value, 0)} kg/t`, ref: ref(row.ref, (n) => `${num(n, 0)} kg/t`) };
    case 'unit_ha':
      return { value: `${num(row.value, 1)} ${unit}/ha`, ref: ref(row.ref, (n) => `${num(n, 0)} ${unit}/ha`) };
  }
}

function BenchRow({ label, value, ref, status }: { label: string; value: string; ref: string; status: Status }) {
  return (
    <View style={styles.benchRow}>
      <Text style={styles.benchLabel}>{label}</Text>
      <View style={styles.benchVals}>
        <Text style={[styles.benchValue, { color: statusColor(status) }]}>{value}</Text>
        <Text style={styles.benchRef}>ref. {ref}</Text>
      </View>
    </View>
  );
}

export default function Resultado() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { data, isLoading, isError } = useHarvest(id);
  const [showMethod, setShowMethod] = useState(false);

  if (isLoading) {
    return (
      <View style={styles.emptyWrap}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyTitle}>Não foi possível abrir a análise</Text>
        <Text style={styles.emptySub}>Lance os dados de uma safra para ver o relatório.</Text>
        <View style={{ alignSelf: 'stretch', marginTop: 20 }}>
          <Button title="Lançar nova safra" onPress={() => router.replace('/nova-safra')} />
        </View>
      </View>
    );
  }

  const { input, report: r } = data;
  const cane = isSugarcane(data.crop?.slug ?? input.crop_slug);
  const cropLabel = cropName(data.crop?.slug ?? input.crop_slug);
  const unit = r.production_unit ?? 't';
  const margemColor = r.margin == null ? colors.muted : r.margin >= 0 ? colors.good : colors.danger;
  const kgAtrBench = r.sector_benchmark.find((b) => b.key === 'cost_per_kg_atr');
  const meta = r.reference_meta;

  const segments = r.breakdown.map((b, i) => ({
    label: b.label,
    value: brl(b.total, 0),
    pct: b.pct,
    color: CHART_COLORS[i % CHART_COLORS.length],
  }));

  const compareRows = r.survey_comparison.map((s) => ({
    key: s.key,
    label: s.label,
    value: s.value_per_ha,
    ref: s.ref_per_ha,
    deltaPct: s.delta_pct,
    status: s.status,
  }));

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.mockTag}>Estimativa · protótipo</Text>

      {/* Cabeçalho da safra */}
      <Card>
        <Text style={styles.safra}>
          {cropLabel} · Safra {input.crop_year}
        </Text>
        {cane ? (
          <>
            <Text style={styles.meta}>
              {num(input.plant_cane_area_ha ?? 0)} ha planta · {num(input.ratoon_area_ha ?? 0)} ha soca ·{' '}
              {num(r.total_production_t)} t · {num(r.tch, 1)} t/ha · ATR {num(input.atr_kg_per_t ?? 0)} kg/t
            </Text>
            <Text style={styles.meta}>
              {input.contract_type_label ?? 'Contrato não informado'} ·{' '}
              {input.delivery_modality_label ?? 'Modalidade não informada'} · preço ATR{' '}
              {brl(input.atr_price ?? 0, 2)}/kg
            </Text>
          </>
        ) : (
          <Text style={styles.meta}>
            {num(r.area_ha)} ha · {num(r.production_quantity)} {unit} · {num(r.tch, 1)} {unit}/ha
            {input.sale_price != null ? ` · venda ${brl(input.sale_price, 2)}/${unit}` : ''}
          </Text>
        )}
      </Card>

      {/* Indicador-chave */}
      <Card style={styles.heroCard}>
        {cane ? (
          <>
            <Text style={styles.heroLabel}>Custo por kg de ATR</Text>
            <Text style={[styles.hero, { color: statusColor(kgAtrBench?.status) }]}>
              {brl(r.cost_per_kg_atr, 4)}
            </Text>
            <Text style={styles.heroSub}>
              Margem {r.margin_per_kg_atr == null ? '—' : brl(r.margin_per_kg_atr, 4)}/kg ATR
              {kgAtrBench ? ` · referência ${brl(kgAtrBench.ref ?? 0, 4)}` : ''}
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.heroLabel}>Custo por {unit}</Text>
            <Text style={styles.hero}>{brl(r.cost_per_unit)}</Text>
            <Text style={styles.heroSub}>
              {num(r.production_quantity)} {unit} em {num(r.area_ha)} ha
            </Text>
          </>
        )}
      </Card>

      <View style={styles.metricRow}>
        <MetricCard label={cane ? 'Custo / t' : `Custo / ${unit}`} value={brl(r.cost_per_unit)} />
        <MetricCard label="Custo / ha" value={brl(r.cost_per_ha)} />
      </View>

      {/* Resultado financeiro */}
      <Card>
        <View style={styles.finRow}>
          <View style={styles.finCell}>
            <Text style={styles.finLabel}>Receita</Text>
            <Text style={styles.finValue}>{r.revenue == null ? '—' : brl(r.revenue)}</Text>
          </View>
          <View style={styles.finCell}>
            <Text style={styles.finLabel}>Margem</Text>
            <Text style={[styles.finValue, { color: margemColor }]}>
              {r.margin == null ? '—' : brl(r.margin)}
            </Text>
          </View>
          <View style={styles.finCell}>
            {cane && r.break_even_tch != null ? (
              <>
                <Text style={styles.finLabel}>Equilíbrio</Text>
                <Text style={styles.finValue}>{num(r.break_even_tch, 1)} t/ha</Text>
              </>
            ) : (
              <>
                <Text style={styles.finLabel}>Margem/{unit}</Text>
                <Text style={styles.finValue}>
                  {r.margin_per_unit == null ? '—' : brl(r.margin_per_unit)}
                </Text>
              </>
            )}
          </View>
        </View>
      </Card>

      {/* Composição do custo */}
      <Text style={styles.h2}>Onde você está gastando</Text>
      <Card>
        <StackedBar segments={segments} />
      </Card>

      {/* Comparação com outros produtores (base viva) */}
      <Text style={styles.h2}>Como você se compara</Text>
      <Card>
        {compareRows.length > 0 ? (
          <>
            <Text style={styles.compareIntro}>
              Seus insumos (R$/ha) vs. a referência da base — {meta.n} produtor(es), {meta.region}.
            </Text>
            <CompareBars rows={compareRows} format={(n) => brl(n, 0)} />
            <Text style={styles.sourceNote}>
              Mediana R$/ha da base, recalculada a cada nova safra lançada.
            </Text>
          </>
        ) : (
          <Text style={styles.compareIntro}>
            {cane
              ? 'Lance os insumos de tratos da soca (NPK, defensivos, herbicidas…) para comparar com a base.'
              : 'Sem dados de comparação para esta cultura ainda — seus lançamentos viram a referência.'}
          </Text>
        )}
      </Card>

      {/* Tabela itemizada */}
      <Text style={styles.h2}>Custos discriminados</Text>
      <Card>
        {r.breakdown.map((b) => {
          const rows = input.cost_items.filter((i) => i.category === b.key);
          return (
            <View key={b.key} style={styles.group}>
              <View style={styles.groupHead}>
                <Text style={styles.groupTitle}>{b.label}</Text>
                <Text style={styles.groupTotal}>
                  {brl(b.total)} · {num(b.pct)}%
                </Text>
              </View>
              {rows.map((i) => (
                <View key={i.id} style={styles.tableRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowDesc}>{i.label}</Text>
                    {i.note || i.applications || i.application_mode ? (
                      <Text style={styles.rowMeta}>
                        {[i.note, i.applications, i.application_mode].filter(Boolean).join(' · ')}
                      </Text>
                    ) : null}
                    {i.quantity != null && i.unit_price != null ? (
                      <Text style={styles.rowMeta}>
                        {num(i.quantity, 0)} {i.unit} × {brl(i.unit_price)}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={styles.rowAmount}>{brl(i.amount)}</Text>
                </View>
              ))}
            </View>
          );
        })}
        <View style={styles.grandTotal}>
          <Text style={styles.grandLabel}>Custo total</Text>
          <Text style={styles.grandValue}>{brl(r.total_cost)}</Text>
        </View>
      </Card>

      {/* Decomposição em barras */}
      <Card>
        {r.breakdown.map((b) => (
          <BarRow
            key={b.key}
            label={b.label}
            pct={b.pct}
            value={brl(b.total)}
            color={b.key === 'harvest_cct' ? colors.warn : colors.primary}
          />
        ))}
      </Card>

      {/* Referência do setor */}
      <Text style={styles.h2}>Referência do setor</Text>
      <Card>
        {r.sector_benchmark.length > 0 ? (
          r.sector_benchmark.map((row) => {
            const f = fmtBench(row, unit);
            return <BenchRow key={row.key} label={row.label} value={f.value} ref={f.ref} status={row.status} />;
          })
        ) : (
          <Text style={styles.compareIntro}>
            Sem referência do setor para {cropLabel} ainda — valendo-se dos seus próprios números.
          </Text>
        )}
      </Card>

      {/* Recomendações */}
      <Text style={styles.h2}>Recomendações</Text>
      <Card>
        {r.recommendations.map((rec, idx) => (
          <View key={idx} style={styles.recRow}>
            <Text style={styles.recBullet}>•</Text>
            <Text style={styles.recText}>{rec}</Text>
          </View>
        ))}
      </Card>

      {/* Como calculamos */}
      <Pressable onPress={() => setShowMethod((v) => !v)} style={styles.methodToggle}>
        <Text style={styles.methodToggleText}>{showMethod ? '▾' : '▸'} Como calculamos</Text>
      </Pressable>
      {showMethod ? (
        <Card>
          <Text style={styles.methodText}>
            {cane ? (
              <>
                Custo/t = custo total ÷ produção (t){'\n'}
                Custo/ha = custo total ÷ área colhida (planta + soca){'\n'}
                Custo/kg ATR = custo total ÷ (ATR × produção){'\n'}
                Receita = preço do ATR × ATR × produção{'\n'}
                Margem = receita − custo total
              </>
            ) : (
              <>
                Custo/{unit} = custo total ÷ produção ({unit}){'\n'}
                Custo/ha = custo total ÷ área cultivada{'\n'}
                Receita = preço de venda × produção{'\n'}
                Margem = receita − custo total
              </>
            )}
          </Text>
          <Text style={styles.methodSource}>
            Comparação por insumo: mediana R$/ha da base viva ({meta.n} produtores, {meta.region}),
            recalculada a cada nova safra lançada. Números a validar com o agrônomo.
          </Text>
        </Card>
      ) : null}

      <View style={styles.actions}>
        <Button title="Lançar outra safra" onPress={() => router.replace('/nova-safra')} />
        <View style={{ height: 10 }} />
        <Button title="Voltar ao painel" variant="outline" onPress={() => router.replace('/dashboard')} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 48, maxWidth: 560, width: '100%', alignSelf: 'center' },
  mockTag: {
    alignSelf: 'flex-start',
    fontSize: 11,
    fontWeight: '700',
    color: colors.warn,
    backgroundColor: '#fdf3e3',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 10,
    overflow: 'hidden',
  },
  safra: { fontSize: 18, fontWeight: '800', color: colors.text },
  meta: { fontSize: 13, color: colors.muted, marginTop: 3 },

  heroCard: { alignItems: 'center', backgroundColor: colors.primaryLight, borderColor: colors.primary },
  heroLabel: { fontSize: 14, color: colors.primaryDark, fontWeight: '600' },
  hero: { fontSize: 44, fontWeight: '900', marginTop: 2 },
  heroSub: { fontSize: 12, color: colors.muted, marginTop: 2 },

  metricRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },

  finRow: { flexDirection: 'row' },
  finCell: { flex: 1 },
  finLabel: { fontSize: 12, color: colors.muted },
  finValue: { fontSize: 15, fontWeight: '700', color: colors.text, marginTop: 2 },

  h2: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 8, marginTop: 4 },

  compareIntro: { fontSize: 13, color: colors.muted, marginBottom: 14, lineHeight: 18 },
  sourceNote: { fontSize: 11, color: colors.muted, marginTop: 6, lineHeight: 16, fontStyle: 'italic' },

  group: { marginBottom: 6 },
  groupHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.bg,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginTop: 6,
  },
  groupTitle: { fontSize: 14, fontWeight: '800', color: colors.text },
  groupTotal: { fontSize: 13, fontWeight: '700', color: colors.muted },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowDesc: { fontSize: 14, color: colors.text },
  rowMeta: { fontSize: 11, color: colors.muted, marginTop: 1 },
  rowAmount: { fontSize: 14, color: colors.text, fontWeight: '600' },
  grandTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 2,
    borderTopColor: colors.text,
  },
  grandLabel: { fontSize: 15, fontWeight: '800', color: colors.text },
  grandValue: { fontSize: 18, fontWeight: '900', color: colors.primaryDark },

  benchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  benchLabel: { fontSize: 14, color: colors.text, fontWeight: '600' },
  benchVals: { alignItems: 'flex-end' },
  benchValue: { fontSize: 15, fontWeight: '800' },
  benchRef: { fontSize: 11, color: colors.muted },

  recRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  recBullet: { fontSize: 15, color: colors.primary, fontWeight: '900', lineHeight: 20 },
  recText: { flex: 1, fontSize: 14, color: colors.text, lineHeight: 20 },

  methodToggle: { paddingVertical: 10 },
  methodToggleText: { fontSize: 14, fontWeight: '700', color: colors.primary },
  methodText: { fontSize: 13, color: colors.text, lineHeight: 22 },
  methodSource: { fontSize: 12, color: colors.muted, marginTop: 10, lineHeight: 18 },

  actions: { marginTop: 16 },

  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: colors.bg },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
  emptySub: { fontSize: 14, color: colors.muted, marginTop: 8, textAlign: 'center' },
});
