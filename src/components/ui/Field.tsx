import { StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native';
import { colors } from '@/lib/theme';

type Props = TextInputProps & { label: string; hint?: string; error?: string };

export function Field({ label, hint, error, style, ...rest }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      <TextInput
        placeholderTextColor={colors.muted}
        style={[styles.input, !!error && styles.inputError, style]}
        {...rest}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 16 },
  label: { fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 4 },
  hint: { fontSize: 13, color: colors.muted, marginBottom: 6 },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 48,
    fontSize: 17,
    color: colors.text,
  },
  inputError: { borderColor: colors.danger },
  error: { color: colors.danger, fontSize: 13, marginTop: 4 },
});
