import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/lib/theme';

// Barra da decomposição do custo (sem lib de gráfico — só Views).
export function BarRow({
  label,
  pct,
  value,
  color,
}: {
  label: string;
  pct: number;
  value: string;
  color?: string;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.head}>
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
        <Text style={styles.value}>{value}</Text>
      </View>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            { width: `${Math.max(2, Math.min(100, pct))}%`, backgroundColor: color ?? colors.primary },
          ]}
        />
      </View>
      <Text style={styles.pct}>{Math.round(pct)}% do custo</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { marginBottom: 12 },
  head: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  label: { fontSize: 14, color: colors.text, fontWeight: '600', flexShrink: 1, marginRight: 8 },
  value: { fontSize: 14, color: colors.text, fontWeight: '700' },
  track: { height: 10, borderRadius: 5, backgroundColor: colors.border, overflow: 'hidden' },
  fill: { height: 10, borderRadius: 5 },
  pct: { fontSize: 11, color: colors.muted, marginTop: 3 },
});
