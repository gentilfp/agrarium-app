import { router, Stack } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/lib/auth';
import { benchCustoKgAtr, compareStatus } from '@/lib/harvest';
import { useHarvest } from '@/lib/harvest-store';
import { brl, colors, statusColor } from '@/lib/theme';

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const { analyses } = useHarvest();

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

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Olá, {user?.name?.split(' ')[0] ?? 'produtor'}! 🌱</Text>
        <Text style={styles.sub}>
          Lance os custos da sua safra e veja quanto custa cada kg de ATR, como você se compara
          ao mercado e onde dá para melhorar.
        </Text>

        <View style={styles.cta}>
          <Button title="Lançar nova safra" onPress={() => router.push('/nova-safra')} />
        </View>

        {analyses.length > 0 ? (
          <>
            <Text style={styles.h2}>Safras analisadas</Text>
            {analyses.map((a) => (
              <Pressable
                key={a.id}
                onPress={() => router.push({ pathname: '/resultado', params: { id: a.id } })}>
                <Card style={styles.rowCard}>
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: statusColor(compareStatus(a.custoKgAtr, benchCustoKgAtr, true)) },
                    ]}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>Safra {a.input.safra}</Text>
                    <Text style={styles.rowMeta}>
                      {brl(a.custoKgAtr, 4)}/kg ATR · {brl(a.custoT)}/t
                    </Text>
                  </View>
                  <Text style={styles.chevron}>›</Text>
                </Card>
              </Pressable>
            ))}
          </>
        ) : (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              Você ainda não lançou nenhuma safra. Toque em “Lançar nova safra” para começar —
              dá para usar o exemplo pré-preenchido.
            </Text>
          </Card>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 20, paddingBottom: 40, maxWidth: 520, width: '100%', alignSelf: 'center' },
  title: { fontSize: 24, fontWeight: '800', color: colors.text },
  sub: { fontSize: 15, color: colors.muted, marginTop: 8, lineHeight: 21 },
  cta: { marginTop: 20, marginBottom: 24 },
  h2: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 10 },
  rowCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusDot: { width: 12, height: 12, borderRadius: 6 },
  rowTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  rowMeta: { fontSize: 13, color: colors.muted, marginTop: 2 },
  chevron: { fontSize: 26, color: colors.muted, fontWeight: '700' },
  emptyCard: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  emptyText: { fontSize: 14, color: colors.primaryDark, lineHeight: 20 },
  headerBtn: { paddingVertical: 6, paddingHorizontal: 10, marginRight: 4, alignItems: 'center', justifyContent: 'center' },
  headerAction: { color: colors.white, fontSize: 16, fontWeight: '600' },
});
