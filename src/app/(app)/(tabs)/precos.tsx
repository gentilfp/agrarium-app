import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { apiError } from '@/lib/api';
import { priceBadge, usePriceComparisons, type PriceComparisonItem } from '@/lib/dashboard-api';
import { formatDate } from '@/lib/format';
import { brl, colors } from '@/lib/theme';

// AGR-23: Preços — o seu preço médio por produto comparado com a média de
// outros produtores que autorizaram o compartilhamento. Só referência.
function PriceCard({ item }: { item: PriceComparisonItem }) {
  const badge = priceBadge(item.status, item.diff_pct);
  const hasMarket = item.status !== 'insufficient_data' && item.market_avg_price != null;

  return (
    <Card>
      <View style={styles.head}>
        <Text style={styles.name}>{item.product_name ?? 'Produto'}</Text>
        <View style={[styles.badge, { backgroundColor: badge.color }]}>
          <Text style={styles.badgeText}>{badge.label}</Text>
        </View>
      </View>
      <Text style={styles.price}>
        Você pagou {brl(Number(item.user_avg_price))}/{item.base_unit}
      </Text>
      {hasMarket ? (
        <Text style={styles.market}>
          Média: {brl(Number(item.market_avg_price))}/{item.base_unit} · {item.producers_count}{' '}
          {item.producers_count === 1 ? 'produtor' : 'produtores'}
        </Text>
      ) : null}
      {item.last_purchase_on ? (
        <Text style={styles.date}>Última compra: {formatDate(item.last_purchase_on)}</Text>
      ) : null}
    </Card>
  );
}

export default function Precos() {
  const { data, isLoading, isError, error, refetch } = usePriceComparisons();

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View style={styles.center}>
        <Card style={{ width: '100%', maxWidth: 480, gap: 12 }}>
          <Text style={styles.errorText}>{apiError(error, 'Não foi possível carregar os preços.')}</Text>
          <Button title="Tentar de novo" onPress={() => refetch()} />
        </Card>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Preços</Text>
      <Text style={styles.sub}>
        Compare o que você pagou com a média de outros produtores. É só uma referência.
      </Text>

      {data.items.length > 0 ? (
        <>
          {data.items.map((item) => (
            <PriceCard key={`${item.product_id}-${item.base_unit}`} item={item} />
          ))}
          <Text style={styles.note}>{data.source_note}</Text>
        </>
      ) : (
        <Card style={styles.emptyCard}>
          <Text style={styles.emptyText}>
            Quando você tiver compras, mostramos aqui se pagou caro ou barato.
          </Text>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 48, maxWidth: 720, width: '100%', alignSelf: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  title: { fontSize: 26, fontWeight: '800', color: colors.text },
  sub: { fontSize: 16, color: colors.muted, marginTop: 8, marginBottom: 16, lineHeight: 22 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  name: { flex: 1, fontSize: 18, fontWeight: '800', color: colors.text },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, maxWidth: 150 },
  badgeText: { color: colors.white, fontSize: 12, fontWeight: '800' },
  price: { fontSize: 17, fontWeight: '700', color: colors.primaryDark },
  market: { fontSize: 15, color: colors.text, marginTop: 4, lineHeight: 21 },
  date: { fontSize: 14, color: colors.muted, marginTop: 6 },
  note: { fontSize: 13, color: colors.muted, marginTop: 6, lineHeight: 19 },
  emptyCard: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  emptyText: { fontSize: 16, color: colors.primaryDark, lineHeight: 22 },
  errorText: { fontSize: 16, color: colors.danger, lineHeight: 22 },
});
