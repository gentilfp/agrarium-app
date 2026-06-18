import { Stack } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { useAuth } from '@/lib/auth';
import { colors } from '@/lib/theme';

export default function Dashboard() {
  const { user, signOut } = useAuth();

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable onPress={signOut} hitSlop={12} style={styles.headerBtn}>
              <Text style={styles.headerAction}>Sair</Text>
            </Pressable>
          ),
        }}
      />

      <View style={styles.center}>
        <Text style={styles.emoji}>🌱</Text>
        <Text style={styles.title}>Bem-vindo, {user?.name?.split(' ')[0] ?? 'produtor'}!</Text>
        <Text style={styles.sub}>
          Em breve você vai lançar os dados da sua safra e acompanhar seus custos por aqui.
        </Text>
        <View style={styles.btn}>
          <Button title="Sair" variant="outline" onPress={() => signOut()} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, maxWidth: 480, width: '100%', alignSelf: 'center' },
  emoji: { fontSize: 48, marginBottom: 12 },
  title: { fontSize: 24, fontWeight: '800', color: colors.text, textAlign: 'center' },
  sub: { fontSize: 15, color: colors.muted, textAlign: 'center', marginTop: 10, lineHeight: 21 },
  btn: { marginTop: 28, alignSelf: 'stretch' },
  headerBtn: { paddingVertical: 6, paddingHorizontal: 10, marginRight: 4, alignItems: 'center', justifyContent: 'center' },
  headerAction: { color: colors.white, fontSize: 16, fontWeight: '600' },
});
