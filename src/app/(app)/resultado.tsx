import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BarRow } from '@/components/BarRow';
import { CHART_COLORS, CompareBars, StackedBar } from '@/components/CostChart';
import { MetricCard } from '@/components/MetricCard';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
  BENCHMARK,
  benchCustoKgAtr,
  compareStatus,
  CONTRATO_TIPOS,
  itemAmount,
  itemLabel,
  itemNote,
  MODALIDADES,
  SURVEY_REFERENCE,
} from '@/lib/harvest';
import { useHarvest } from '@/lib/harvest-store';
import { brl, colors, statusColor, type Status } from '@/lib/theme';

const num = (x: number, d = 0) =>
  x.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });

function BenchRow({
  label,
  value,
  ref,
  status,
}: {
  label: string;
  value: string;
  ref: string;
  status: Status;
}) {
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
  const { latest, getById } = useHarvest();
  const [showMethod, setShowMethod] = useState(false);
  const analysis = id ? getById(id) : latest;

  if (!analysis) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyTitle}>Nenhuma análise ainda</Text>
        <Text style={styles.emptySub}>Lance os dados de uma safra para ver o relatório.</Text>
        <View style={{ alignSelf: 'stretch', marginTop: 20 }}>
          <Button title="Lançar nova safra" onPress={() => router.replace('/nova-safra')} />
        </View>
      </View>
    );
  }

  const r = analysis;
  const contrato = CONTRATO_TIPOS.find((c) => c.key === r.input.contratoTipo)?.label ?? '—';
  const modalidade = MODALIDADES.find((m) => m.key === r.input.modalidade)?.label ?? '—';
  const margemColor = r.margem >= 0 ? colors.good : colors.danger;

  const segments = r.breakdown.map((b, i) => ({
    label: b.label,
    value: brl(b.total, 0),
    pct: b.pct,
    color: CHART_COLORS[i % CHART_COLORS.length],
  }));

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.mockTag}>Estimativa · protótipo</Text>

      {/* Cabeçalho da safra */}
      <Card>
        <Text style={styles.safra}>Safra {r.input.safra}</Text>
        <Text style={styles.meta}>
          {num(r.input.areaHa)} ha · {num(r.producaoT)} t · {num(r.tch, 1)} t/ha · ATR {num(r.input.atr)} kg/t
        </Text>
        <Text style={styles.meta}>
          {contrato} · {modalidade} · preço ATR {brl(r.input.precoAtr, 2)}/kg
        </Text>
      </Card>

      {/* Indicador-chave */}
      <Card style={styles.heroCard}>
        <Text style={styles.heroLabel}>Custo por kg de ATR</Text>
        <Text style={[styles.hero, { color: statusColor(compareStatus(r.custoKgAtr, benchCustoKgAtr, true)) }]}>
          {brl(r.custoKgAtr, 4)}
        </Text>
        <Text style={styles.heroSub}>
          Margem {brl(r.margemKgAtr, 4)}/kg ATR · referência {brl(benchCustoKgAtr, 4)}
        </Text>
      </Card>

      <View style={styles.metricRow}>
        <MetricCard label="Custo / t" value={brl(r.custoT)} />
        <MetricCard label="Custo / ha" value={brl(r.custoHa)} />
      </View>

      {/* Resultado financeiro (sem classificação — comparamos com a base) */}
      <Card>
        <View style={styles.finRow}>
          <View style={styles.finCell}>
            <Text style={styles.finLabel}>Receita</Text>
            <Text style={styles.finValue}>{brl(r.receita)}</Text>
          </View>
          <View style={styles.finCell}>
            <Text style={styles.finLabel}>Margem</Text>
            <Text style={[styles.finValue, { color: margemColor }]}>{brl(r.margem)}</Text>
          </View>
          <View style={styles.finCell}>
            <Text style={styles.finLabel}>Equilíbrio</Text>
            <Text style={styles.finValue}>{num(r.breakEvenTch, 1)} t/ha</Text>
          </View>
        </View>
      </Card>

      {/* Gráfico de composição do custo */}
      <Text style={styles.h2}>Onde você está gastando</Text>
      <Card>
        <StackedBar segments={segments} />
      </Card>

      {/* Comparação com outros produtores (base Agrarium) */}
      <Text style={styles.h2}>Como você se compara</Text>
      <Card>
        {r.surveyComparison.length > 0 ? (
          <>
            <Text style={styles.compareIntro}>
              Seus insumos (R$/ha) vs. a referência da base — {SURVEY_REFERENCE.n} produtores,{' '}
              {SURVEY_REFERENCE.region}.
            </Text>
            <CompareBars rows={r.surveyComparison} format={(n) => brl(n, 0)} />
            <Text style={styles.sourceNote}>{SURVEY_REFERENCE.note}</Text>
          </>
        ) : (
          <Text style={styles.compareIntro}>
            Lance os insumos de tratos da soca (NPK, defensivos, herbicidas…) para comparar com a base.
          </Text>
        )}
      </Card>

      {/* Tabela itemizada (o "Excel") */}
      <Text style={styles.h2}>Custos discriminados</Text>
      <Card>
        {r.breakdown.map((b) => {
          const rows = r.input.items.filter((i) => i.category === b.key);
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
                    <Text style={styles.rowDesc}>{itemLabel(i)}</Text>
                    {itemNote(i) || i.applications || i.mode ? (
                      <Text style={styles.rowMeta}>
                        {[itemNote(i), i.applications, i.mode].filter(Boolean).join(' · ')}
                      </Text>
                    ) : null}
                    {i.quantity != null && i.unitPrice != null ? (
                      <Text style={styles.rowMeta}>
                        {num(i.quantity, 0)} {i.unit} × {brl(i.unitPrice)}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={styles.rowAmount}>{brl(itemAmount(i))}</Text>
                </View>
              ))}
            </View>
          );
        })}
        <View style={styles.grandTotal}>
          <Text style={styles.grandLabel}>Custo total</Text>
          <Text style={styles.grandValue}>{brl(r.custoTotal)}</Text>
        </View>
      </Card>

      {/* Decomposição em barras (detalhe por bloco) */}
      <Card>
        {r.breakdown.map((b) => (
          <BarRow
            key={b.key}
            label={b.label}
            pct={b.pct}
            value={brl(b.total)}
            color={b.key === 'colheita_cct' ? colors.warn : colors.primary}
          />
        ))}
      </Card>

      {/* Comparação com o mercado (referência do setor) */}
      <Text style={styles.h2}>Referência do setor</Text>
      <Card>
        <BenchRow label="Custo / t" value={brl(r.custoT)} ref={`${brl(BENCHMARK.custoT)}`}
          status={compareStatus(r.custoT, BENCHMARK.custoT, true)} />
        <BenchRow label="Custo / kg ATR" value={brl(r.custoKgAtr, 4)} ref={brl(benchCustoKgAtr, 4)}
          status={compareStatus(r.custoKgAtr, benchCustoKgAtr, true)} />
        <BenchRow label="Produtividade" value={`${num(r.tch, 1)} t/ha`} ref={`${BENCHMARK.tch} t/ha`}
          status={compareStatus(r.tch, BENCHMARK.tch, false)} />
        <BenchRow label="Qualidade (ATR)" value={`${num(r.input.atr)} kg/t`} ref={`${BENCHMARK.atr} kg/t`}
          status={compareStatus(r.input.atr, BENCHMARK.atr, false)} />
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

      {/* Como calculamos (transparência) */}
      <Pressable onPress={() => setShowMethod((v) => !v)} style={styles.methodToggle}>
        <Text style={styles.methodToggleText}>
          {showMethod ? '▾' : '▸'} Como calculamos
        </Text>
      </Pressable>
      {showMethod ? (
        <Card>
          <Text style={styles.methodText}>
            Custo/t = custo total ÷ produção (t){'\n'}
            Custo/ha = custo total ÷ área (ha){'\n'}
            Custo/kg ATR = custo total ÷ (ATR × produção){'\n'}
            Receita = preço do ATR × ATR × produção{'\n'}
            Margem = receita − custo total
          </Text>
          <Text style={styles.methodSource}>
            Comparação por insumo: {SURVEY_REFERENCE.note} A referência do setor vem de {BENCHMARK.source}.
            Números a validar com o agrônomo.
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
