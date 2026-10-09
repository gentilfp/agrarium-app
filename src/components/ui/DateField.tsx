import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { colors } from '@/lib/theme';

type Props = {
  label: string;
  hint?: string;
  /** Data em ISO (AAAA-MM-DD) ou vazio. */
  value?: string;
  /** Recebe ISO (AAAA-MM-DD) quando a data está completa e válida, senão ''. */
  onChange: (iso: string) => void;
  error?: string;
  placeholder?: string;
};

// AGR-23: entrada de data em DD/MM/AAAA, com barras automáticas. Sem date
// picker nativo (não funciona igual em web e native) — o valor trafega em ISO.
function digitsOf(iso?: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? '');
  return match ? `${match[3]}${match[2]}${match[1]}` : '';
}

function toDisplay(digits: string): string {
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function toIso(digits: string): string | null {
  if (digits.length !== 8) return null;
  const day = Number(digits.slice(0, 2));
  const month = Number(digits.slice(2, 4));
  const year = Number(digits.slice(4));
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return `${digits.slice(4)}-${digits.slice(2, 4)}-${digits.slice(0, 2)}`;
}

export function DateField({ label, hint, value, onChange, error, placeholder = 'DD/MM/AAAA' }: Props) {
  const [text, setText] = useState(() => toDisplay(digitsOf(value)));
  const [invalid, setInvalid] = useState(false);
  // Último valor que este campo emitiu. Evita reescrever o que o usuário está
  // digitando quando o pai guarda o mesmo ISO que acabamos de enviar.
  const emitted = useRef<string>(value ?? '');

  useEffect(() => {
    const current = value ?? '';
    if (current === emitted.current) return;
    emitted.current = current;
    setText(toDisplay(digitsOf(current)));
    setInvalid(false);
  }, [value]);

  function handleChange(input: string) {
    const digits = input.replace(/\D/g, '').slice(0, 8);
    setText(toDisplay(digits));
    const iso = toIso(digits);
    setInvalid(digits.length === 8 && iso === null);
    emitted.current = iso ?? '';
    onChange(iso ?? '');
  }

  const message = error ?? (invalid ? 'Data inválida. Use DD/MM/AAAA.' : undefined);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      <TextInput
        value={text}
        onChangeText={handleChange}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        keyboardType="number-pad"
        maxLength={10}
        style={[styles.input, !!message && styles.inputError]}
      />
      {message ? <Text style={styles.error}>{message}</Text> : null}
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
