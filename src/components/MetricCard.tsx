import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/lib/theme';

// Cartão de indicador para a tela de resultado (R$/ha, R$/t, R$/kg ATR…).
export function MetricCard({
  label,
  value,
  sub,
  color,
  highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
  highlight?: boolean;
}) {
  return (
    <View style={[styles.card, highlight && styles.highlight]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, highlight && styles.valueHighlight, color ? { color } : null]}>
        {value}
      </Text>
      {sub ? <Text style={styles.sub}>{sub}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 96,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  highlight: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  label: { fontSize: 12, color: colors.muted, marginBottom: 4 },
  value: { fontSize: 18, fontWeight: '800', color: colors.text },
  valueHighlight: { fontSize: 22, color: colors.primaryDark },
  sub: { fontSize: 11, color: colors.muted, marginTop: 2 },
});
