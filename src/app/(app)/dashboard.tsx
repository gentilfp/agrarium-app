import { router, Stack } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/lib/auth';
import { cropName, isSugarcane } from '@/lib/harvest';
import { useHarvests, type HarvestSummary } from '@/lib/harvests-api';
import { brl, colors, statusColor } from '@/lib/theme';

function rowMeta(a: HarvestSummary): string {
  const i = a.indicators;
  if (isSugarcane(a.crop?.slug)) {
    return `${brl(i.cost_per_kg_atr, 4)}/kg ATR · ${brl(i.cost_per_t)}/t`;
  }
  const unit = a.crop?.production_unit ?? 'un';
  return `${brl(i.cost_per_unit)}/${unit} · ${brl(i.cost_per_t)}/t`;
}

function groupKey(a: HarvestSummary): string {
  return `${a.crop?.slug ?? '?'}|${a.crop_year}`;
}

function groupTitle(a: HarvestSummary): string {
  return `${cropName(a.crop?.slug)} · Safra ${a.crop_year}`;
}

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const { data: harvests, isLoading } = useHarvests();

  const groups = (harvests ?? []).reduce<{ title: string; rows: HarvestSummary[] }[]>(
    (acc, h) => {
      const last = acc[acc.length - 1];
      if (last && groupKey(last.rows[0]) === groupKey(h)) last.rows.push(h);
      else acc.push({ title: groupTitle(h), rows: [h] });
      return acc;
    },
    [],
  );

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
          Lance os custos da sua safra e veja quanto custa cada unidade produzida, como você se
          compara ao mercado e onde dá para melhorar.
        </Text>

        <View style={styles.cta}>
          <Button title="Lançar nova safra" onPress={() => router.push('/nova-safra')} />
        </View>
        <View style={styles.ctaRow}>
          <View style={styles.ctaHalf}>
            <Button title="Notas fiscais" variant="outline" onPress={() => router.push('/notas')} />
          </View>
          <View style={styles.ctaHalf}>
            <Button title="Revisar compras" variant="outline" onPress={() => router.push('/revisao')} />
          </View>
        </View>

        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 12 }} />
        ) : harvests && harvests.length > 0 ? (
          <>
            <Text style={styles.h2}>Safras analisadas</Text>
            {groups.map((g) => (
              <View key={g.title}>
                <Text style={styles.groupTitle}>{g.title}</Text>
                {g.rows.map((a) => (
                  <Pressable
                    key={a.id}
                    onPress={() => router.push({ pathname: '/resultado', params: { id: String(a.id) } })}>
                    <Card style={styles.rowCard}>
                      <View
                        style={[
                          styles.statusDot,
                          {
                            backgroundColor: statusColor(
                              a.indicators.cost_per_unit_status ??
                                a.indicators.cost_per_kg_atr_status,
                            ),
                          },
                        ]}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.rowTitle}>Safra {a.crop_year}</Text>
                        <Text style={styles.rowMeta}>{rowMeta(a)}</Text>
                      </View>
                      <Text style={styles.chevron}>›</Text>
                    </Card>
                  </Pressable>
                ))}
              </View>
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
  cta: { marginTop: 20 },
  ctaRow: { flexDirection: 'row', gap: 12, marginTop: 12, marginBottom: 24 },
  ctaHalf: { flex: 1 },
  h2: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 10 },
  groupTitle: { fontSize: 14, fontWeight: '700', color: colors.muted, marginTop: 6, marginBottom: 2 },
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
