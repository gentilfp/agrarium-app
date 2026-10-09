import { StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/lib/auth';
import { colors } from '@/lib/theme';

// AGR-23: um único aviso, só para a conta de demonstração. Todo o resto do app
// mostra apenas os dados do próprio produtor.
export function DemoBanner() {
  const { user } = useAuth();
  if (!user?.demo) return null;

  return (
    <View style={styles.bar}>
      <Text style={styles.text}>
        Conta de demonstração · dados fictícios · nada é enviado à SEFAZ
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: '#fdf3d5',
    borderBottomWidth: 1,
    borderBottomColor: colors.warn,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  text: { fontSize: 13, fontWeight: '700', color: '#7a5410', textAlign: 'center', lineHeight: 18 },
});
