import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/lib/theme';

export type SelectOption<T extends string> = { key: T; label: string };

// Dropdown fechado (web + native), via Modal — substitui texto livre por escolha
// numa lista, para conseguirmos agrupar/comparar depois.
export function Select<T extends string>({
  label,
  hint,
  placeholder = 'Selecione…',
  options,
  value,
  onChange,
}: {
  label?: string;
  hint?: string;
  placeholder?: string;
  options: SelectOption<T>[];
  value?: T;
  onChange: (v: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.key === value);

  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      <Pressable style={styles.control} onPress={() => setOpen(true)}>
        <Text style={[styles.value, !selected && styles.placeholder]} numberOfLines={1}>
          {selected?.label ?? placeholder}
        </Text>
        <Text style={styles.caret}>▾</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            {label ? <Text style={styles.sheetTitle}>{label}</Text> : null}
            <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
              {options.map((o) => {
                const active = o.key === value;
                return (
                  <Pressable
                    key={o.key}
                    style={[styles.option, active && styles.optionActive]}
                    onPress={() => {
                      onChange(o.key);
                      setOpen(false);
                    }}>
                    <Text style={[styles.optionText, active && styles.optionTextActive]}>{o.label}</Text>
                    {active ? <Text style={styles.check}>✓</Text> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 4 },
  hint: { fontSize: 12, color: colors.muted, marginBottom: 6 },
  control: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  value: { fontSize: 16, color: colors.text, flex: 1, marginRight: 8 },
  placeholder: { color: colors.muted },
  caret: { fontSize: 14, color: colors.muted },

  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', padding: 24 },
  sheet: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 8,
    maxHeight: '70%',
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  sheetTitle: { fontSize: 14, fontWeight: '700', color: colors.muted, padding: 12, paddingBottom: 6 },
  list: { flexGrow: 0 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  optionActive: { backgroundColor: colors.primaryLight },
  optionText: { fontSize: 16, color: colors.text, flex: 1, marginRight: 8 },
  optionTextActive: { color: colors.primaryDark, fontWeight: '700' },
  check: { fontSize: 16, color: colors.primary, fontWeight: '800' },
});
