import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useHarvest } from '@/api/harvests';
import { Card } from '@/components/ui/Card';
import { brl, colors, statusColor, statusLabel } from '@/lib/theme';

const BUCKET_LABELS: Record<string, string> = {
  formacao: 'Formação',
  tratos_soca: 'Tratos / insumos',
  colheita: 'Colheita (CCT)',
  arrendamento: 'Arrendamento',
  outros: 'Outros',
};

const METRIC_LABELS: Record<string, string> = {
  cost_per_kg_atr: 'Custo R$/kg ATR',
  cost_per_t: 'Custo R$/t',
  productivity_tch: 'Produtividade (t/ha)',
  atr_kg_per_t: 'ATR (kg/t)',
};

export default function HarvestResult() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: harvest, isLoading } = useHarvest(id);

  if (isLoading || !harvest) {
    return <ActivityIndicator color={colors.primary} style={{ marginTop: 60 }} />;
  }
  const a = harvest.analysis_result;
  if (!a) {
    return <View style={styles.container}><Text style={styles.muted}>Sem análise para esta safra.</Text></View>;
  }

  const scoreColor = a.score >= 70 ? colors.good : a.score >= 40 ? colors.warn : colors.danger;
  const decomp = a.recommendations.decomposition ?? {};
  const totalT = Object.values(decomp).reduce((s, v) => s + v, 0) || a.cost_per_t || 1;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Safra {harvest.season} · corte {harvest.cut_number}</Text>

      {/* Score */}
      <Card style={{ alignItems: 'center' }}>
        <View style={[styles.scoreCircle, { borderColor: scoreColor }]}>
          <Text style={[styles.scoreNum, { color: scoreColor }]}>{a.score}</Text>
        </View>
        <Text style={styles.scoreLabel}>Score Agrarium (0–100)</Text>
      </Card>

      {/* Indicadores */}
      <View style={styles.grid}>
        <Metric label="Custo / kg ATR" value={brl(a.cost_per_kg_atr, 3)} highlight />
        <Metric label="Custo / tonelada" value={brl(a.cost_per_t)} />
        <Metric label="Custo / hectare" value={brl(a.cost_per_ha)} />
        <Metric label="Produtividade" value={`${Number(harvest.productivity_tch).toFixed(1)} t/ha`} />
      </View>

      {/* Receita / margem */}
      <Card>
        <Text style={styles.cardTitle}>Receita e margem</Text>
        <Line label="Receita estimada (via ATR)" value={`${brl(a.revenue_per_t)}/t`} />
        <Line label="Margem" value={`${brl(a.margin_per_t)}/t`} color={a.margin_per_t < 0 ? colors.danger : colors.good} />
        <Line label="Ponto de equilíbrio" value={`${Number(a.break_even_tch).toFixed(1)} t/ha`} />
      </Card>

      {/* Decomposição */}
      <Card>
        <Text style={styles.cardTitle}>Composição do custo (R$/t)</Text>
        {Object.entries(decomp).map(([bucket, value]) => {
          const pct = totalT > 0 ? (value / totalT) * 100 : 0;
          return (
            <View key={bucket} style={styles.barRow}>
              <View style={styles.barHead}>
                <Text style={styles.barLabel}>{BUCKET_LABELS[bucket] ?? bucket}</Text>
                <Text style={styles.barVal}>{brl(value)}/t · {pct.toFixed(0)}%</Text>
              </View>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${Math.min(pct, 100)}%` }]} />
              </View>
            </View>
          );
        })}
      </Card>

      {/* Comparação com benchmark */}
      {a.recommendations.comparisons?.length ? (
        <Card>
          <Text style={styles.cardTitle}>Comparação com a referência</Text>
          {a.recommendations.comparisons.map((c) => (
            <View key={c.metric} style={styles.compRow}>
              <Text style={styles.compLabel}>{METRIC_LABELS[c.metric] ?? c.metric}</Text>
              <View style={styles.compRight}>
                <Text style={styles.compDelta}>{c.delta_pct > 0 ? '+' : ''}{c.delta_pct}%</Text>
                <View style={[styles.tag, { backgroundColor: statusColor(c.status) }]}>
                  <Text style={styles.tagText}>{statusLabel(c.status)}</Text>
                </View>
              </View>
            </View>
          ))}
        </Card>
      ) : null}

      {/* Recomendações */}
      <Text style={styles.cardTitle}>Recomendações</Text>
      {a.recommendations.items?.length ? (
        a.recommendations.items.map((rec, i) => (
          <Card key={i} style={{ borderLeftWidth: 4, borderLeftColor: statusColor(rec.severity) }}>
            <Text style={styles.recTitle}>{rec.title}</Text>
            <Text style={styles.recDetail}>{rec.detail}</Text>
          </Card>
        ))
      ) : (
        <Card><Text style={styles.muted}>Tudo dentro da referência. Bom trabalho! 🌱</Text></Card>
      )}
    </ScrollView>
  );
}

function Metric({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={[styles.metric, highlight && styles.metricHighlight]}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function Line({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.line}>
      <Text style={styles.muted}>{label}</Text>
      <Text style={[styles.lineVal, color ? { color } : null]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, maxWidth: 560, width: '100%', alignSelf: 'center', paddingBottom: 40 },
  title: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 12 },
  scoreCircle: { width: 96, height: 96, borderRadius: 48, borderWidth: 6, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  scoreNum: { fontSize: 36, fontWeight: '900' },
  scoreLabel: { color: colors.muted },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 12 },
  metric: { flexGrow: 1, flexBasis: '46%', backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 16 },
  metricHighlight: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  metricValue: { fontSize: 20, fontWeight: '800', color: colors.text },
  metricLabel: { color: colors.muted, marginTop: 4, fontSize: 12 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 10 },
  line: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  lineVal: { fontWeight: '700', color: colors.text },
  barRow: { marginBottom: 12 },
  barHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  barLabel: { color: colors.text, fontWeight: '600' },
  barVal: { color: colors.muted, fontSize: 12 },
  barTrack: { height: 10, backgroundColor: colors.primaryLight, borderRadius: 6, overflow: 'hidden' },
  barFill: { height: 10, backgroundColor: colors.primary, borderRadius: 6 },
  compRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 7 },
  compLabel: { color: colors.text },
  compRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  compDelta: { color: colors.muted, fontWeight: '600' },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  tagText: { color: colors.white, fontSize: 11, fontWeight: '700' },
  recTitle: { fontWeight: '700', color: colors.text, marginBottom: 4 },
  recDetail: { color: colors.muted, lineHeight: 19 },
  muted: { color: colors.muted },
});
