import { router } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { MetricCard } from '@/components/MetricCard';
import { apiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { priceBadge, useDashboard, type PriceComparisonItem } from '@/lib/dashboard-api';
import { categoryLabel } from '@/lib/fiscal-api';
import { monthLabel, shortMonth } from '@/lib/format';
import { brl, colors } from '@/lib/theme';

// AGR-23: Início. Mostra exatamente o que GET /dashboard devolve — nenhuma
// conta é feita aqui, só formatação.
function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action?: { label: string; onPress: () => void };
  children: React.ReactNode;
}) {
  return (
    <Card>
      <View style={styles.panelHead}>
        <Text style={styles.h2}>{title}</Text>
        {action ? (
          <Pressable onPress={action.onPress} hitSlop={10}>
            <Text style={styles.link}>{action.label}</Text>
          </Pressable>
        ) : null}
      </View>
      {children}
    </Card>
  );
}

function ShareBar({ label, value, pct }: { label: string; value: string; pct: number }) {
  return (
    <View style={styles.shareRow}>
      <View style={styles.shareHead}>
        <Text style={styles.shareLabel} numberOfLines={1}>
          {label}
        </Text>
        <Text style={styles.shareValue}>{value}</Text>
      </View>
      <View style={styles.shareTrack}>
        <View style={[styles.shareFill, { width: `${Math.max(2, Math.min(100, pct))}%` }]} />
      </View>
      <Text style={styles.sharePct}>{pct.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%</Text>
    </View>
  );
}

function PriceLine({ item }: { item: PriceComparisonItem }) {
  const badge = priceBadge(item.status, item.diff_pct);
  return (
    <View style={styles.priceRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.priceName}>{item.product_name ?? 'Produto'}</Text>
        <Text style={styles.priceValues}>
          Você: {brl(Number(item.user_avg_price))}/{item.base_unit} · Média:{' '}
          {item.market_avg_price ? `${brl(Number(item.market_avg_price))}/${item.base_unit}` : '—'}
        </Text>
      </View>
      <View style={[styles.badge, { backgroundColor: badge.color }]}>
        <Text style={styles.badgeText}>{badge.label}</Text>
      </View>
    </View>
  );
}

export default function Inicio() {
  const { user } = useAuth();
  const { data, isLoading, isError, error, refetch } = useDashboard();
  const wide = useWindowDimensions().width >= 768;
  const firstName = user?.name?.split(' ')[0] ?? 'produtor';

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
          <Text style={styles.errorText}>{apiError(error, 'Não foi possível carregar seus números.')}</Text>
          <Button title="Tentar de novo" onPress={() => refetch()} />
        </Card>
      </View>
    );
  }

  const total = Number(data.total_value);
  const change = data.change_pct;
  const maxMonth = Math.max(0, ...data.by_month.map((m) => Number(m.total_value)));
  const isEmpty = data.documents_count === 0;
  const alerts: { text: string; action: string; href: '/compras' | '/revisao' }[] = [];
  if (data.pending.needs_response > 0) {
    alerts.push({
      text: `${data.pending.needs_response} ${data.pending.needs_response === 1 ? 'nota esperando' : 'notas esperando'} sua resposta`,
      action: 'Ver notas',
      href: '/compras',
    });
  }
  if (data.pending.needs_review_items > 0) {
    alerts.push({
      text: `${data.pending.needs_review_items} ${data.pending.needs_review_items === 1 ? 'compra sem categoria' : 'compras sem categoria'}`,
      action: 'Arrumar',
      href: '/revisao',
    });
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Olá, {firstName}</Text>
      <Text style={styles.sub}>
        Período de {monthLabel(data.period.from.slice(0, 7))} a {monthLabel(data.period.to.slice(0, 7))}
      </Text>

      {alerts.map((a) => (
        <Card key={a.text} style={styles.alertCard}>
          <Text style={styles.alertText}>{a.text}</Text>
          <Button
            title={a.action}
            variant="outline"
            onPress={() =>
              a.href === '/compras'
                ? router.push({ pathname: '/compras', params: { filtro: 'esperando' } })
                : router.push('/revisao')
            }
          />
        </Card>
      ))}

      {isEmpty ? (
        <Card style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Você ainda não tem compras</Text>
          <Text style={styles.emptyText}>
            Registre suas compras de insumos para ver quanto você gasta, onde o dinheiro vai e se
            seus preços estão bons.
          </Text>
          <Button title="Adicionar compra" onPress={() => router.push('/adicionar-compra')} />
          <View style={{ height: 10 }} />
          <Button
            title="Enviar nota fiscal (XML)"
            variant="outline"
            onPress={() => router.push('/adicionar-compra')}
          />
        </Card>
      ) : (
        <>
          <View style={styles.stats}>
            <MetricCard
              label="Gasto no período"
              value={brl(total)}
              sub={`${data.items_count} ${data.items_count === 1 ? 'item' : 'itens'}`}
              highlight
            />
            <MetricCard
              label="Comparado ao período anterior"
              value={change == null ? '—' : `${change > 0 ? '▲' : '▼'} ${Math.abs(change).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`}
              sub={change == null ? 'sem histórico' : undefined}
              color={change == null ? colors.muted : change > 0 ? colors.danger : colors.good}
            />
            <MetricCard
              label="Notas no período"
              value={String(data.documents_count)}
              sub={`${brl(Number(data.previous_total_value))} antes`}
            />
          </View>

          <View style={wide ? styles.columns : undefined}>
            <View style={wide ? styles.column : undefined}>
              <Panel title="Gasto por mês">
                <View style={styles.chart}>
                  {data.by_month.map((m) => (
                    <View key={m.month} style={styles.chartCol}>
                      <View style={styles.chartTrack}>
                        <View
                          accessible
                          accessibilityLabel={`${monthLabel(m.month)}: ${brl(Number(m.total_value))}`}
                          style={[
                            styles.chartBar,
                            {
                              height:
                                maxMonth > 0
                                  ? Math.max(4, (Number(m.total_value) / maxMonth) * 96)
                                  : 4,
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.chartLabel}>{shortMonth(m.month)}</Text>
                    </View>
                  ))}
                </View>
              </Panel>

              <Panel
                title="Onde vai o dinheiro"
                action={{ label: 'Ver tudo', onPress: () => router.push('/relatorio') }}>
                {data.top_categories.length > 0 ? (
                  data.top_categories.map((c) => (
                    <ShareBar
                      key={c.category}
                      label={categoryLabel(c.category)}
                      value={brl(Number(c.total_value))}
                      pct={c.share_pct}
                    />
                  ))
                ) : (
                  <Text style={styles.mutedText}>Ainda sem categorias para mostrar.</Text>
                )}
              </Panel>
            </View>

            <View style={wide ? styles.column : undefined}>
              <Panel
                title="Seus preços vs. média"
                action={{ label: 'Comparar todos', onPress: () => router.push('/precos') }}>
                {data.price_highlights.length > 0 ? (
                  data.price_highlights.map((item) => (
                    <PriceLine key={`${item.product_id}-${item.base_unit}`} item={item} />
                  ))
                ) : (
                  <Text style={styles.mutedText}>
                    Quando você tiver mais compras, mostramos aqui se pagou caro ou barato.
                  </Text>
                )}
              </Panel>

              <Panel title="Maiores fornecedores">
                {data.top_suppliers.length > 0 ? (
                  data.top_suppliers.map((s) => (
                    <View key={`${s.supplier_document}-${s.supplier_name}`} style={styles.supplierRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.supplierName} numberOfLines={1}>
                          {s.supplier_name}
                        </Text>
                        <Text style={styles.mutedSmall}>
                          {s.items_count} {s.items_count === 1 ? 'item' : 'itens'}
                        </Text>
                      </View>
                      <Text style={styles.supplierValue}>{brl(Number(s.total_value))}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.mutedText}>Ainda sem fornecedores para mostrar.</Text>
                )}
              </Panel>
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 48, maxWidth: 1100, width: '100%', alignSelf: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  title: { fontSize: 26, fontWeight: '800', color: colors.text },
  sub: { fontSize: 16, color: colors.muted, marginTop: 6, marginBottom: 16, lineHeight: 22 },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderColor: colors.warn,
    backgroundColor: '#fdf3d5',
  },
  alertText: { flex: 1, fontSize: 16, fontWeight: '700', color: colors.text, lineHeight: 22 },
  emptyCard: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: colors.primaryDark },
  emptyText: { fontSize: 16, color: colors.primaryDark, marginTop: 6, marginBottom: 14, lineHeight: 22 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 4 },
  columns: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  column: { flex: 1 },
  panelHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  h2: { fontSize: 17, fontWeight: '800', color: colors.text },
  link: { fontSize: 15, fontWeight: '700', color: colors.primary },
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  chartCol: { flex: 1, alignItems: 'center' },
  chartTrack: { height: 96, width: '100%', justifyContent: 'flex-end' },
  chartBar: { backgroundColor: colors.primary, borderRadius: 4, width: '100%' },
  chartLabel: { fontSize: 11, color: colors.muted, marginTop: 4 },
  shareRow: { marginBottom: 10 },
  shareHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  shareLabel: { fontSize: 15, color: colors.text, fontWeight: '600', flexShrink: 1, marginRight: 8 },
  shareValue: { fontSize: 15, color: colors.text, fontWeight: '700' },
  shareTrack: { height: 10, borderRadius: 5, backgroundColor: colors.border, overflow: 'hidden' },
  shareFill: { height: 10, borderRadius: 5, backgroundColor: colors.primary },
  sharePct: { fontSize: 12, color: colors.muted, marginTop: 3 },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  priceName: { fontSize: 16, fontWeight: '700', color: colors.text },
  priceValues: { fontSize: 14, color: colors.muted, marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, maxWidth: 130 },
  badgeText: { color: colors.white, fontSize: 12, fontWeight: '800' },
  supplierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  supplierName: { fontSize: 16, fontWeight: '700', color: colors.text },
  supplierValue: { fontSize: 15, fontWeight: '700', color: colors.text },
  mutedText: { fontSize: 15, color: colors.muted, lineHeight: 21 },
  mutedSmall: { fontSize: 13, color: colors.muted, marginTop: 2 },
  errorText: { fontSize: 16, color: colors.danger, lineHeight: 22 },
});
