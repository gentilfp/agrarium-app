import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { apiError } from '@/lib/api';
import {
  categoryLabel,
  inboxLabel,
  useCorrectItem,
  useFiscalIdentities,
  useInboxDocuments,
  useManifestDocument,
  useReviewItems,
  type FiscalDocumentDTO,
  type FiscalItemDTO,
} from '@/lib/fiscal-api';
import { formatDate } from '@/lib/format';
import { brl, colors } from '@/lib/theme';

// AGR-23: Compras — um só lugar para as notas. "Sim, comprei" / "Não reconheço"
// ficam no próprio cartão; o XML completo continua sendo buscado pelo backend.
const NO_FILTERS = {};

type ChipKey = 'todas' | 'esperando' | 'prontas' | 'outras';

const CHIPS: { key: ChipKey; label: string; statuses: string[] | null }[] = [
  { key: 'todas', label: 'Todas', statuses: null },
  { key: 'esperando', label: 'Esperando você', statuses: ['needs_response'] },
  { key: 'prontas', label: 'Prontas', statuses: ['processed', 'needs_review'] },
  {
    key: 'outras',
    label: 'Outras',
    statuses: ['awaiting_xml', 'processing', 'failed', 'cancelled', 'disputed'],
  },
];

// Categorias mais comuns na lavoura de cana, para classificar sem sair da tela.
const QUICK_CATEGORIES = ['npk_fertilizer', 'nitrogen_fertilizer', 'herbicide', 'fuel'];

// O POST volta assim que a resposta entra na fila; o registro é concluído logo
// depois. Estas esperas releem a lista até a nota sair de "Esperando você",
// para o status mudar sem recarregar a página.
const SETTLE_DELAYS_MS = [600, 1200, 2000, 3000, 4000];

function chipCount(chip: (typeof CHIPS)[number], counts: Record<string, number>): number {
  if (!chip.statuses) return Object.values(counts).reduce((sum, n) => sum + Number(n), 0);
  return chip.statuses.reduce((sum, status) => sum + Number(counts[status] ?? 0), 0);
}

export default function Compras() {
  const { filtro } = useLocalSearchParams<{ filtro?: string }>();
  const [chip, setChip] = useState<ChipKey>(filtro === 'esperando' ? 'esperando' : 'todas');
  const { data, isLoading, isError, error, refetch, isRefetching } = useInboxDocuments(NO_FILTERS);
  const identities = useFiscalIdentities();
  const reviewItems = useReviewItems(['needs_review', 'unmatched']);
  const manifest = useManifestDocument();
  const correct = useCorrectItem();

  const [confirmDoc, setConfirmDoc] = useState<FiscalDocumentDTO | null>(null);
  const [results, setResults] = useState<Record<number, { text: string; ok: boolean }>>({});
  const [handled, setHandled] = useState<number[]>([]);

  const docs = data?.documents ?? [];
  const counts = data?.counts ?? {};
  const sync = identities.data?.[0];

  // Primeiro item pendente de cada nota (a lista já vem do backend).
  const pendingByDocument = useMemo(() => {
    const map = new Map<number, FiscalItemDTO>();
    for (const item of reviewItems.data ?? []) {
      if (!map.has(item.fiscal_document_id)) map.set(item.fiscal_document_id, item);
    }
    return map;
  }, [reviewItems.data]);

  const active = CHIPS.find((c) => c.key === chip) ?? CHIPS[0];
  // Uma nota que acabou de ser respondida continua visível para mostrar o
  // resultado, mesmo que já tenha saído do filtro atual.
  const visible = docs.filter(
    (d) =>
      !active.statuses || active.statuses.includes(d.inbox_status) || handled.includes(d.id),
  );

  async function respond(doc: FiscalDocumentDTO, eventType: 'confirmacao_operacao' | 'desconhecimento_operacao') {
    setConfirmDoc(null);
    try {
      await manifest.mutateAsync({ id: doc.id, event_type: eventType });
      setHandled((current) => (current.includes(doc.id) ? current : [...current, doc.id]));
      setResults((current) => ({
        ...current,
        [doc.id]: { text: 'Resposta enviada — aguardando o registro…', ok: true },
      }));
      void settle(doc.id, eventType);
    } catch (err) {
      setResults((current) => ({
        ...current,
        [doc.id]: { text: apiError(err, 'Não foi possível enviar a resposta.'), ok: false },
      }));
    }
  }

  async function settle(docId: number, eventType: 'confirmacao_operacao' | 'desconhecimento_operacao') {
    const done =
      eventType === 'confirmacao_operacao'
        ? '✓ Resposta registrada. Obrigado!'
        : '✓ Desconhecimento registrado. Esta nota sai dos seus gastos.';
    for (const delay of SETTLE_DELAYS_MS) {
      await new Promise((resolve) => setTimeout(resolve, delay));
      const fresh = await refetch();
      const updated = fresh.data?.documents.find((d) => d.id === docId);
      if (updated && updated.inbox_status !== 'needs_response') {
        setResults((current) => ({ ...current, [docId]: { text: done, ok: true } }));
        return;
      }
    }
    setResults((current) => ({
      ...current,
      [docId]: {
        text: 'Resposta enviada — o registro ainda está sendo processado. Atualize para ver.',
        ok: true,
      },
    }));
  }

  async function classify(doc: FiscalDocumentDTO, item: FiscalItemDTO, category: string) {
    try {
      await correct.mutateAsync({ id: item.id, patch: { agronomic_category: category } });
      setResults((current) => ({
        ...current,
        [doc.id]: { text: `✓ Item classificado como ${categoryLabel(category)}.`, ok: true },
      }));
    } catch (err) {
      setResults((current) => ({
        ...current,
        [doc.id]: { text: apiError(err, 'Não foi possível classificar o item.'), ok: false },
      }));
    }
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} />}>
        <Text style={styles.title}>Suas notas</Text>
        <Text style={styles.sub}>
          As notas que chegaram no seu CPF/CNPJ. Responda o que precisa e acompanhe a busca da nota
          completa.
        </Text>

        <Button title="+ Adicionar compra" onPress={() => router.push('/adicionar-compra')} />

        <Card style={styles.syncCard}>
          <Text style={styles.syncTitle}>CNPJ conectado</Text>
          {sync ? (
            <Text style={styles.syncText}>
              {sync.connection_status === 'active'
                ? '● Sincronizado'
                : `● ${sync.connection_status}`}
              {sync.last_synced_at ? ` · última busca ${formatDate(sync.last_synced_at)}` : ' · nunca sincronizado'}
              {sync.last_sync_error ? `\n⚠ ${sync.last_sync_error}` : ''}
            </Text>
          ) : (
            <Text style={styles.syncText}>
              Nenhum CNPJ conectado ainda. Você pode adicionar compras manualmente.
            </Text>
          )}
        </Card>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
          {CHIPS.map((c) => (
            <Pressable
              key={c.key}
              onPress={() => setChip(c.key)}
              style={[styles.chip, chip === c.key ? styles.chipActive : styles.chipIdle]}>
              <Text style={[styles.chipText, chip === c.key ? styles.chipTextActive : styles.chipTextIdle]}>
                {c.label} ({chipCount(c, counts)})
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {isLoading ? (
          <ActivityIndicator color={colors.primary} />
        ) : isError ? (
          <Card style={styles.errorCard}>
            <Text style={styles.errorText}>{apiError(error, 'Não foi possível carregar suas notas.')}</Text>
            <Button title="Tentar de novo" onPress={() => refetch()} />
          </Card>
        ) : visible.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              {docs.length === 0
                ? 'Você ainda não tem notas. Toque em “+ Adicionar compra” para registrar a primeira.'
                : 'Nada neste filtro. Toque em “Todas” para ver o resto.'}
            </Text>
          </Card>
        ) : (
          visible.map((doc) => {
            const pending = pendingByDocument.get(doc.id);
            const result = results[doc.id];
            return (
              <Card key={doc.id}>
                <Pressable
                  onPress={() =>
                    router.push({ pathname: '/notas/[id]', params: { id: String(doc.id) } })
                  }
                  accessibilityRole="button"
                  accessibilityLabel={`Abrir nota de ${doc.emitter_name ?? 'emitente desconhecido'}`}>
                  <View style={styles.docHead}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.docTitle}>{doc.emitter_name ?? 'Emitente desconhecido'}</Text>
                      <Text style={styles.docMeta}>
                        {doc.issued_at ? `${formatDate(doc.issued_at)} · ` : ''}
                        {doc.total_vnf != null ? `${brl(doc.total_vnf)} · ` : ''}
                        {inboxLabel(doc.inbox_status)}
                        {doc.deadline_soon && doc.manifestation_deadline
                          ? ` · responda até ${formatDate(doc.manifestation_deadline)}`
                          : ''}
                      </Text>
                    </View>
                    <Text style={styles.chevron}>›</Text>
                  </View>
                </Pressable>

                {doc.inbox_status === 'needs_response' ? (
                  <View style={styles.actions}>
                    <View style={styles.actionHalf}>
                      <Button
                        title="Sim, comprei"
                        onPress={() => respond(doc, 'confirmacao_operacao')}
                        loading={manifest.isPending}
                      />
                    </View>
                    <View style={styles.actionHalf}>
                      <Button
                        title="Não reconheço"
                        variant="outline"
                        onPress={() => setConfirmDoc(doc)}
                      />
                    </View>
                  </View>
                ) : null}

                {pending ? (
                  <View style={styles.classify}>
                    <Text style={styles.classifyLabel}>
                      Sem categoria: “{pending.description}”
                    </Text>
                    <View style={styles.categoryChips}>
                      {QUICK_CATEGORIES.map((key) => (
                        <Pressable
                          key={key}
                          onPress={() => classify(doc, pending, key)}
                          style={styles.categoryChip}>
                          <Text style={styles.categoryChipText}>{categoryLabel(key)}</Text>
                        </Pressable>
                      ))}
                      <Pressable
                        onPress={() => router.push('/revisao')}
                        style={styles.categoryChip}>
                        <Text style={styles.categoryChipText}>Outro…</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : null}

                {result ? (
                  <Text style={result.ok ? styles.resultText : styles.resultError}>{result.text}</Text>
                ) : null}
              </Card>
            );
          })
        )}

        <View style={styles.footer}>
          <Button
            title="Ver gastos detalhados"
            variant="outline"
            onPress={() => router.push('/relatorio')}
          />
        </View>
      </ScrollView>

      <Modal
        visible={confirmDoc !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmDoc(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Não reconheço esta nota</Text>
            <Text style={styles.modalText}>
              Você declara que não conhece esta operação — proteção contra fraude e notas emitidas
              por engano em seu nome. A resposta é registrada e não pode ser desfeita.
            </Text>
            <View style={{ marginTop: 12 }}>
              <Button
                title="Confirmar"
                onPress={() =>
                  confirmDoc ? respond(confirmDoc, 'desconhecimento_operacao') : undefined
                }
                loading={manifest.isPending}
              />
            </View>
            <View style={{ marginTop: 8 }}>
              <Button title="Cancelar" variant="outline" onPress={() => setConfirmDoc(null)} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 20, paddingBottom: 48, maxWidth: 720, width: '100%', alignSelf: 'center' },
  title: { fontSize: 26, fontWeight: '800', color: colors.text },
  sub: { fontSize: 16, color: colors.muted, marginTop: 8, marginBottom: 16, lineHeight: 22 },
  syncCard: { marginTop: 16, marginBottom: 12 },
  syncTitle: { fontSize: 14, fontWeight: '800', color: colors.muted },
  syncText: { fontSize: 15, color: colors.text, marginTop: 4, lineHeight: 21 },
  chips: { marginBottom: 12 },
  chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, borderWidth: 1, marginRight: 8 },
  chipIdle: { borderColor: colors.border, backgroundColor: colors.card },
  chipActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  chipText: { fontSize: 14, fontWeight: '700' },
  chipTextIdle: { color: colors.muted },
  chipTextActive: { color: colors.primaryDark },
  docHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  docTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  docMeta: { fontSize: 14, color: colors.muted, marginTop: 3, lineHeight: 20 },
  chevron: { fontSize: 26, color: colors.muted, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 14 },
  actionHalf: { flex: 1 },
  classify: { marginTop: 14 },
  classifyLabel: { fontSize: 14, color: colors.text, marginBottom: 8, lineHeight: 20 },
  categoryChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  categoryChipText: { fontSize: 14, fontWeight: '700', color: colors.primary },
  resultText: { fontSize: 15, fontWeight: '700', color: colors.primaryDark, marginTop: 12, lineHeight: 21 },
  resultError: { fontSize: 15, fontWeight: '700', color: colors.danger, marginTop: 12, lineHeight: 21 },
  errorCard: { gap: 12 },
  errorText: { fontSize: 16, color: colors.danger, lineHeight: 22 },
  emptyCard: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  emptyText: { fontSize: 16, color: colors.primaryDark, lineHeight: 22 },
  footer: { marginTop: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 },
  modalBox: { backgroundColor: colors.card, borderRadius: 14, padding: 20 },
  modalTitle: { fontSize: 19, fontWeight: '800', color: colors.text },
  modalText: { fontSize: 16, color: colors.text, marginTop: 8, lineHeight: 23 },
});
