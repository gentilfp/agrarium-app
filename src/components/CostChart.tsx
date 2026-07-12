import { StyleSheet, Text, View } from 'react-native';
import { colors, statusColor, type Status } from '@/lib/theme';

// Paleta para os segmentos do gráfico (categorias de custo).
export const CHART_COLORS = ['#3d7a1f', '#6fae3f', '#d98a1e', '#8a6d3b', '#4f7fb8', '#9b59b6'];

// ── Gráfico de composição: barra empilhada + legenda ──────────────────────────
// "Onde você está gastando" de forma visual (sem lib de gráfico — só Views).
export function StackedBar({
  segments,
}: {
  segments: { label: string; value: string; pct: number; color: string }[];
}) {
  return (
    <View>
      <View style={styles.stack}>
        {segments.map((s, i) => (
          <View
            key={s.label}
            style={{
              flexGrow: Math.max(0.5, s.pct),
              backgroundColor: s.color,
              borderTopLeftRadius: i === 0 ? 8 : 0,
              borderBottomLeftRadius: i === 0 ? 8 : 0,
              borderTopRightRadius: i === segments.length - 1 ? 8 : 0,
              borderBottomRightRadius: i === segments.length - 1 ? 8 : 0,
            }}
          />
        ))}
      </View>
      <View style={styles.legend}>
        {segments.map((s) => (
          <View key={s.label} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: s.color }]} />
            <Text style={styles.legendLabel} numberOfLines={1}>
              {s.label}
            </Text>
            <Text style={styles.legendValue}>
              {Math.round(s.pct)}% · {s.value}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ── Gráfico comparativo: você vs. referência da base (por insumo) ─────────────
export function CompareBars({
  rows,
  format,
}: {
  rows: { key: string; label: string; value: number; ref: number; deltaPct: number; status: Status }[];
  format: (n: number) => string;
}) {
  const max = Math.max(1, ...rows.flatMap((r) => [r.value, r.ref]));
  return (
    <View>
      <View style={styles.keyRow}>
        <View style={styles.keyItem}>
          <View style={[styles.dot, { backgroundColor: colors.primary }]} />
          <Text style={styles.keyText}>Você</Text>
        </View>
        <View style={styles.keyItem}>
          <View style={[styles.dot, { backgroundColor: colors.border }]} />
          <Text style={styles.keyText}>Referência da base</Text>
        </View>
      </View>
      {rows.map((r) => {
        const sign = r.deltaPct > 0 ? '+' : '';
        return (
          <View key={r.key} style={styles.cmpRow}>
            <View style={styles.cmpHead}>
              <Text style={styles.cmpLabel} numberOfLines={1}>
                {r.label}
              </Text>
              <View style={[styles.deltaChip, { backgroundColor: statusColor(r.status) }]}>
                <Text style={styles.deltaText}>
                  {sign}
                  {Math.round(r.deltaPct)}%
                </Text>
              </View>
            </View>
            <View style={styles.barPair}>
              <View style={[styles.bar, { width: `${(r.value / max) * 100}%`, backgroundColor: colors.primary }]} />
            </View>
            <View style={styles.barPair}>
              <View style={[styles.bar, { width: `${(r.ref / max) * 100}%`, backgroundColor: colors.border }]} />
            </View>
            <Text style={styles.cmpVals}>
              {format(r.value)}/ha · ref. {format(r.ref)}/ha
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { flexDirection: 'row', height: 22, borderRadius: 8, overflow: 'hidden', gap: 1 },
  legend: { marginTop: 12, gap: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 12, height: 12, borderRadius: 3, marginRight: 8 },
  legendLabel: { fontSize: 13, color: colors.text, flex: 1, marginRight: 8 },
  legendValue: { fontSize: 13, color: colors.muted, fontWeight: '600' },

  keyRow: { flexDirection: 'row', gap: 16, marginBottom: 14 },
  keyItem: { flexDirection: 'row', alignItems: 'center' },
  keyText: { fontSize: 12, color: colors.muted },

  cmpRow: { marginBottom: 16 },
  cmpHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  cmpLabel: { fontSize: 13, color: colors.text, fontWeight: '600', flex: 1, marginRight: 8 },
  deltaChip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  deltaText: { fontSize: 11, fontWeight: '800', color: colors.white },
  barPair: { height: 9, backgroundColor: colors.bg, borderRadius: 5, marginBottom: 3, overflow: 'hidden' },
  bar: { height: 9, borderRadius: 5, minWidth: 3 },
  cmpVals: { fontSize: 11, color: colors.muted, marginTop: 2 },
});
