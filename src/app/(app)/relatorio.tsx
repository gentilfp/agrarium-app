import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DateField } from '@/components/ui/DateField';
import { Field } from '@/components/ui/Field';
import { Select } from '@/components/ui/Select';
import {
  AGRONOMIC_CATEGORIES,
  UNCLASSIFIED_BUCKET,
  apiError,
  categoryLabel,
  excludedStatusLabel,
  lineValue,
  usePurchaseItems,
  usePurchaseReport,
  type PurchaseFilters,
} from '@/lib/fiscal-api';
import { brl, colors } from '@/lib/theme';
import { formatDate, monthLabel } from '@/lib/format';

const EMPTY_FILTERS: PurchaseFilters = {};
const CATEGORY_OPTIONS = [
  { key: '', label: 'Todas as categorias' },
  ...[...AGRONOMIC_CATEGORIES, UNCLASSIFIED_BUCKET].map((key) => ({ key, label: categoryLabel(key) })),
] as { key: string; label: string }[];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.h2}>{title}</Text>
      {children}
    </View>
  );
}

function Row({ label, sub, value }: { label: string; sub?: string; value: string }) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        {sub ? <Text style={styles.rowSub}>{sub}</Text> : null}
      </View>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

export default function Relatorio() {
  const [draft, setDraft] = useState<PurchaseFilters>({});
  const [category, setCategory] = useState('');
  const [applied, setApplied] = useState<PurchaseFilters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);

  const report = usePurchaseReport(applied);
  const list = usePurchaseItems(applied, page);

  function apply() {
    setApplied({ ...draft, ...(category ? { category } : {}) });
    setPage(1);
  }

  function reset() {
    setDraft({ date_from: '', date_to: '' });
    setCategory('');
    setApplied(EMPTY_FILTERS);
    setPage(1);
  }

  const totalPages = Math.max(1, Math.ceil((list.data?.total ?? 0) / 20));
  const excluded = report.data
    ? Object.entries(report.data.excluded_documents).filter(([, n]) => n > 0)
    : [];

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Gastos detalhados</Text>
        <Text style={styles.sub}>
          Valor de compra em nota (vProd − vDesc) por data de emissão — não é pagamento, consumo
          nem economia de mercado.
        </Text>

        <Card>
          <DateField
            label="De"
            value={draft.date_from ?? ''}
            onChange={(iso) => setDraft((d) => ({ ...d, date_from: iso }))}
          />
          <DateField
            label="Até"
            value={draft.date_to ?? ''}
            onChange={(iso) => setDraft((d) => ({ ...d, date_to: iso }))}
          />
          <Field
            label="Fornecedor"
            value={draft.supplier ?? ''}
            onChangeText={(v) => setDraft((d) => ({ ...d, supplier: v }))}
            placeholder="nome ou documento"
          />
          <Field
            label="Buscar"
            value={draft.q ?? ''}
            onChangeText={(v) => setDraft((d) => ({ ...d, q: v }))}
            placeholder="produto, descrição…"
          />
          <Select label="Categoria" options={CATEGORY_OPTIONS} value={category} onChange={setCategory} />
          <View style={styles.filterBtns}>
            <View style={styles.filterHalf}>
              <Button title="Aplicar" onPress={apply} />
            </View>
            <View style={styles.filterHalf}>
              <Button title="Limpar" variant="outline" onPress={reset} />
            </View>
          </View>
        </Card>

        {report.isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
        ) : report.isError ? (
          <Card style={styles.errorCard}>
            <Text style={styles.errorText}>{apiError(report.error, 'Não foi possível carregar.')}</Text>
            <Button title="Tentar de novo" onPress={() => report.refetch()} />
          </Card>
        ) : report.data ? (
          <>
            <Card style={styles.totalCard}>
              <Text style={styles.totalValue}>{brl(Number(report.data.total_value))}</Text>
              <Text style={styles.totalMeta}>
                {report.data.items_count} {report.data.items_count === 1 ? 'item' : 'itens'} ·{' '}
                {report.data.documents_count}{' '}
                {report.data.documents_count === 1 ? 'documento' : 'documentos'}
              </Text>
            </Card>

            {report.data.items_count === 0 ? (
              <Card style={styles.emptyCard}>
                <Text style={styles.emptyText}>
                  Nenhuma compra encontrada. Envie XMLs em Notas fiscais ou ajuste os filtros.
                </Text>
                <Button title="Ir para Compras" variant="outline" onPress={() => router.push('/compras')} />
              </Card>
            ) : (
              <>
                <Section title="Por mês">
                  {report.data.by_month.map((m) => (
                    <Row
                      key={m.month}
                      label={monthLabel(m.month)}
                      sub={`${m.items_count} ${m.items_count === 1 ? 'item' : 'itens'}`}
                      value={brl(Number(m.total_value))}
                    />
                  ))}
                </Section>

                <Section title="Por fornecedor">
                  {report.data.by_supplier.map((s) => (
                    <Row
                      key={`${s.supplier_document}-${s.supplier_name}`}
                      label={s.supplier_name}
                      sub={`${s.items_count} ${s.items_count === 1 ? 'item' : 'itens'}`}
                      value={brl(Number(s.total_value))}
                    />
                  ))}
                </Section>

                <Section title="Por categoria">
                  {report.data.by_category.map((c) => (
                    <Row
                      key={c.category}
                      label={categoryLabel(c.category)}
                      sub={`${c.items_count} ${c.items_count === 1 ? 'item' : 'itens'}`}
                      value={brl(Number(c.total_value))}
                    />
                  ))}
                </Section>

                {report.data.quantities.length > 0 ? (
                  <Section title="Quantidades (mesmo produto e unidade)">
                    {report.data.quantities.map((q) => (
                      <Row
                        key={`${q.product_id ?? q.product_name}-${q.base_unit}`}
                        label={q.product_name}
                        sub={`${q.items_count} ${q.items_count === 1 ? 'item' : 'itens'}`}
                        value={`${q.quantity.toLocaleString('pt-BR')} ${q.base_unit}`}
                      />
                    ))}
                  </Section>
                ) : null}

                <Section title={`Compras (${list.data?.total ?? 0})`}>
                  {list.isLoading ? (
                    <ActivityIndicator color={colors.primary} />
                  ) : (list.data?.items ?? []).length === 0 ? (
                    <Text style={styles.rowSub}>Nada por aqui com estes filtros.</Text>
                  ) : (
                    list.data?.items.map((item) => (
                      <Pressable
                        key={item.id}
                        onPress={() =>
                          router.push({
                            pathname: '/notas/[id]',
                            params: { id: String(item.fiscal_document_id) },
                          })
                        }>
                        <Card style={styles.itemCard}>
                          <Text style={styles.itemDesc}>{item.description}</Text>
                          <Text style={styles.rowSub}>
                            {item.supplier_name ?? 'Emitente desconhecido'}
                            {item.issued_at ? ` · ${formatDate(item.issued_at)}` : ''}
                          </Text>
                          <Text style={styles.rowSub}>
                            {brl(lineValue(item) ?? undefined)}
                            {item.match_status === 'needs_review' || item.match_status === 'unmatched'
                              ? ' · precisa de revisão'
                              : ''}
                          </Text>
                        </Card>
                      </Pressable>
                    ))
                  )}
                  {totalPages > 1 ? (
                    <View style={styles.pager}>
                      <Button
                        title="‹ Anterior"
                        variant="outline"
                        onPress={() => setPage((p) => Math.max(1, p - 1))}
                      />
                      <Text style={styles.pageInfo}>
                        {page} de {totalPages}
                      </Text>
                      <Button
                        title="Próxima ›"
                        variant="outline"
                        onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
                      />
                    </View>
                  ) : null}
                </Section>

                {excluded.length > 0 ? (
                  <Text style={styles.note}>
                    Excluídos do total:{' '}
                    {excluded.map(([status, n]) => `${n} ${excludedStatusLabel(status)}`).join(', ')}.
                  </Text>
                ) : null}
                <Text style={styles.note}>
                  Soma das linhas (vProd − vDesc). Frete e impostos não são rateados; devoluções e
                  créditos ainda não são tratados.
                </Text>
              </>
            )}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 20, paddingBottom: 40, maxWidth: 520, width: '100%', alignSelf: 'center' },
  title: { fontSize: 24, fontWeight: '800', color: colors.text },
  sub: { fontSize: 15, color: colors.muted, marginTop: 8, marginBottom: 12, lineHeight: 21 },
  filterBtns: { flexDirection: 'row', gap: 12, marginTop: 4 },
  filterHalf: { flex: 1 },
  errorCard: { marginTop: 16, gap: 12 },
  errorText: { fontSize: 14, color: colors.danger, lineHeight: 20 },
  totalCard: { marginTop: 16, alignItems: 'center', paddingVertical: 20 },
  totalValue: { fontSize: 32, fontWeight: '800', color: colors.primaryDark },
  totalMeta: { fontSize: 13, color: colors.muted, marginTop: 4 },
  emptyCard: { marginTop: 16, gap: 12 },
  emptyText: { fontSize: 14, color: colors.primaryDark, lineHeight: 20 },
  section: { marginTop: 20 },
  h2: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowLabel: { fontSize: 15, fontWeight: '600', color: colors.text },
  rowSub: { fontSize: 13, color: colors.muted, marginTop: 2, lineHeight: 18 },
  rowValue: { fontSize: 15, fontWeight: '700', color: colors.text, marginLeft: 12 },
  itemCard: { marginBottom: 2 },
  itemDesc: { fontSize: 15, fontWeight: '700', color: colors.text },
  pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  pageInfo: { fontSize: 14, color: colors.muted },
  note: { fontSize: 12, color: colors.muted, marginTop: 12, lineHeight: 17 },
});
