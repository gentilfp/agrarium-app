import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/lib/theme';

// Indicador de passos do wizard (ex.: [1] Safra · [2] Custos).
export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <View style={styles.wrap}>
      {steps.map((label, i) => {
        const active = i === current;
        const done = i < current;
        return (
          <View key={label} style={styles.step}>
            <View style={[styles.dot, (active || done) && styles.dotActive]}>
              <Text style={[styles.num, (active || done) && styles.numActive]}>{i + 1}</Text>
            </View>
            <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
              {label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  step: { flex: 1, alignItems: 'center' },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  dotActive: { backgroundColor: colors.primary },
  num: { fontSize: 13, fontWeight: '700', color: colors.muted },
  numActive: { color: colors.white },
  label: { fontSize: 12, color: colors.muted, textAlign: 'center' },
  labelActive: { color: colors.text, fontWeight: '700' },
});
