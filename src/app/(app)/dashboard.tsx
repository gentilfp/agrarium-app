import { Link, router, Stack } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { useHarvests, type Harvest } from '@/api/harvests';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/lib/auth';
import { brl, colors, statusColor } from '@/lib/theme';

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const { data: harvests, isLoading, isError, refetch } = useHarvests();

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable onPress={() => signOut()} hitSlop={8}>
              <Text style={styles.headerAction}>Sair</Text>
            </Pressable>
          ),
        }}
      />

      <View style={styles.header}>
        <Text style={styles.hello}>Olá, {user?.name?.split(' ')[0] ?? 'produtor'}</Text>
        <Text style={styles.sub}>Suas safras analisadas</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : isError ? (
        <View style={styles.center}>
          <Text style={styles.muted}>Não foi possível carregar.</Text>
          <Button title="Tentar de novo" variant="outline" onPress={() => refetch()} />
        </View>
      ) : (
        <FlatList
          data={harvests}
          keyExtractor={(h) => String(h.id)}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Card>
              <Text style={styles.muted}>Nenhuma safra ainda. Toque em “Nova safra” para começar.</Text>
            </Card>
          }
          renderItem={({ item }) => <HarvestRow harvest={item} />}
        />
      )}

      <View style={styles.fab}>
        <Button title="+ Nova safra" onPress={() => router.push('/new-harvest')} />
      </View>
    </View>
  );
}

function HarvestRow({ harvest }: { harvest: Harvest }) {
  const a = harvest.analysis_result;
  return (
    <Link href={`/harvest/${harvest.id}`} asChild>
      <Pressable>
        <Card>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.season}>Safra {harvest.season} · corte {harvest.cut_number}</Text>
              <Text style={styles.muted}>
                {Number(harvest.cane_area_ha)} ha · {Number(harvest.productivity_tch).toFixed(1)} t/ha · {Number(harvest.atr_kg_per_t)} kg ATR/t
              </Text>
              {a ? (
                <Text style={styles.metric}>
                  {brl(a.cost_per_kg_atr, 3)}/kg ATR · margem {brl(a.margin_per_t)}/t
                </Text>
              ) : null}
            </View>
            {a ? <ScoreBadge score={a.score} /> : null}
          </View>
        </Card>
      </Pressable>
    </Link>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 70 ? colors.good : score >= 40 ? colors.warn : colors.danger;
  return (
    <View style={[styles.badge, { borderColor: color }]}>
      <Text style={[styles.badgeScore, { color }]}>{score}</Text>
      <Text style={styles.badgeLabel}>score</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4 },
  hello: { fontSize: 22, fontWeight: '800', color: colors.text },
  sub: { color: colors.muted, marginTop: 2 },
  list: { padding: 16, paddingBottom: 120 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  season: { fontSize: 16, fontWeight: '700', color: colors.text },
  muted: { color: colors.muted, marginTop: 2, fontSize: 13 },
  metric: { color: colors.primaryDark, marginTop: 6, fontWeight: '600' },
  badge: { width: 56, height: 56, borderRadius: 28, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  badgeScore: { fontSize: 20, fontWeight: '800' },
  badgeLabel: { fontSize: 9, color: colors.muted, textTransform: 'uppercase' },
  fab: { position: 'absolute', left: 16, right: 16, bottom: 24, maxWidth: 480, alignSelf: 'center', width: '100%' },
  center: { alignItems: 'center', gap: 12, marginTop: 40, paddingHorizontal: 24 },
  headerAction: { color: colors.white, fontWeight: '700', marginRight: 4 },
});
