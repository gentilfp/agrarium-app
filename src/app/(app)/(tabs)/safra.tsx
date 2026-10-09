import { router } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { cropName, isSugarcane } from '@/lib/harvest';
import { useHarvests, type HarvestSummary } from '@/lib/harvests-api';
import { brl, colors, statusColor } from '@/lib/theme';

// AGR-23: a lista de safras saiu do painel antigo e virou a aba Safra.
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

export default function Safra() {
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
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Sua safra</Text>
      <Text style={styles.sub}>
        Lance os custos da safra e veja quanto custa cada unidade produzida, como você se compara ao
        mercado e onde dá para melhorar.
      </Text>

      <View style={styles.cta}>
        <Button title="Lançar nova safra" onPress={() => router.push('/nova-safra')} />
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
                            a.indicators.cost_per_unit_status ?? a.indicators.cost_per_kg_atr_status,
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
            Você ainda não lançou nenhuma safra. Toque em “Lançar nova safra” para começar — dá para
            usar o exemplo pré-preenchido.
          </Text>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40, maxWidth: 720, width: '100%', alignSelf: 'center' },
  title: { fontSize: 24, fontWeight: '800', color: colors.text },
  sub: { fontSize: 16, color: colors.muted, marginTop: 8, lineHeight: 22 },
  cta: { marginTop: 20, marginBottom: 24 },
  h2: { fontSize: 17, fontWeight: '800', color: colors.text, marginBottom: 10 },
  groupTitle: { fontSize: 14, fontWeight: '700', color: colors.muted, marginTop: 6, marginBottom: 2 },
  rowCard: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64 },
  statusDot: { width: 12, height: 12, borderRadius: 6 },
  rowTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  rowMeta: { fontSize: 14, color: colors.muted, marginTop: 2 },
  chevron: { fontSize: 26, color: colors.muted, fontWeight: '700' },
  emptyCard: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  emptyText: { fontSize: 16, color: colors.primaryDark, lineHeight: 22 },
});
