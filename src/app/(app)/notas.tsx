import { router } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
  apiError,
  inboxLabel,
  SIMULATED_FISCAL_BANNER,
  useFiscalIdentities,
  useInboxDocuments,
  useUploadFiscalDocuments,
  type UploadResult,
} from '@/lib/fiscal-api';
import { brl, colors } from '@/lib/theme';

function badgeColor(status: string) {
  if (status === 'failed') return colors.danger;
  if (status === 'needs_response' || status === 'needs_review' || status === 'awaiting_xml')
    return colors.warn;
  return colors.primary;
}

export default function Notas() {
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [demo, setDemo] = useState(false);
  const { data, isLoading, refetch, isRefetching } = useInboxDocuments(
    statusFilter ? { inbox_status: statusFilter } : {},
    demo,
  );
  const identities = useFiscalIdentities(demo);
  const upload = useUploadFiscalDocuments();
  const [results, setResults] = useState<UploadResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const docs = data?.documents ?? [];
  const counts = data?.counts ?? {};
  const sync = identities.data?.[0];

  async function pickAndUpload() {
    setError(null);
    setResults(null);
    const picked = await DocumentPicker.getDocumentAsync({
      type: ['text/xml', 'application/xml'],
      multiple: true,
      copyToCacheDirectory: true,
    });
    if (picked.canceled || picked.assets.length === 0) return;

    const form = new FormData();
    for (const asset of picked.assets) {
      const webFile = (asset as { file?: File }).file;
      if (webFile) {
        form.append('files[]', webFile, asset.name);
      } else {
        form.append('files[]', {
          uri: asset.uri,
          name: asset.name,
          type: asset.mimeType ?? 'text/xml',
        } as unknown as Blob);
      }
    }

    try {
      const payload = await upload.mutateAsync({ form, demo });
      setResults(payload.results);
      refetch();
    } catch (err) {
      setError(apiError(err, 'Falha no envio dos XMLs.'));
    }
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} />}>
        <Text style={styles.title}>Caixa de entrada fiscal</Text>
        <Text style={styles.sub}>
          Notas descobertas para o seu CPF/CNPJ. Veja o que precisa de resposta e acompanhe a
          busca do XML e o processamento.
        </Text>

        <View style={styles.demoRow}>
          <Text style={styles.demoText}>Dados de demonstração</Text>
          <Switch value={demo} onValueChange={setDemo} accessibilityLabel="Dados de demonstração" />
        </View>
        {demo ? (
          <>
            <Text style={styles.demoBadge}>Mostrando apenas registros de demonstração</Text>
            <Text style={styles.demoBadge}>{SIMULATED_FISCAL_BANNER}</Text>
          </>
        ) : null}

        <Card style={styles.syncCard}>
          <Text style={styles.syncTitle}>Conexão fiscal</Text>
          {sync ? (
            <Text style={styles.syncText}>
              {sync.connection_status === 'active' ? '● Sincronizado' : `● ${sync.connection_status}`}
              {sync.is_demo ? ' (simulado)' : ''}
              {sync.last_synced_at
                ? ` · última sync ${new Date(sync.last_synced_at).toLocaleString('pt-BR')}`
                : ' · nunca sincronizado'}
              {sync.last_sync_error ? `\n⚠ ${sync.last_sync_error}` : ''}
            </Text>
          ) : (
            <Text style={styles.syncText}>Nenhuma identidade fiscal conectada ainda.</Text>
          )}
        </Card>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
          <FilterChip
            label={`Todas (${data?.total ?? 0})`}
            active={statusFilter === null}
            onPress={() => setStatusFilter(null)}
          />
          {Object.entries(counts).map(([status, count]) => (
            <FilterChip
              key={status}
              label={`${inboxLabel(status)} (${count})`}
              active={statusFilter === status}
              onPress={() => setStatusFilter(statusFilter === status ? null : status)}
            />
          ))}
        </ScrollView>

        {isLoading ? (
          <ActivityIndicator color={colors.primary} />
        ) : docs.length > 0 ? (
          docs.map((d) => (
            <Pressable
              key={d.id}
              onPress={() =>
                router.push({
                  pathname: '/notas/[id]',
                  params: { id: String(d.id), ...(demo || d.is_demo ? { demo: 'true' } : {}) },
                })
              }>
              <Card style={styles.rowCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{d.emitter_name ?? 'Emitente desconhecido'}</Text>
                  <Text style={styles.rowMeta}>
                    {d.issued_at ? `${new Date(d.issued_at).toLocaleDateString('pt-BR')} · ` : ''}
                    {d.total_vnf != null ? `${brl(d.total_vnf)} · ` : ''}
                    {inboxLabel(d.inbox_status)}
                    {d.needs_review_count > 0 ? ` · ${d.needs_review_count} p/ revisar` : ''}
                    {d.deadline_soon && d.manifestation_deadline
                      ? ` · vence ${new Date(d.manifestation_deadline).toLocaleDateString('pt-BR')}`
                      : ''}
                  </Text>
                </View>
                <Text style={[styles.badge, { color: badgeColor(d.inbox_status) }]}>
                  {inboxLabel(d.inbox_status)}
                </Text>
                <Text style={styles.chevron}>›</Text>
              </Card>
            </Pressable>
          ))
        ) : (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              Nenhum documento neste filtro. Puxe para atualizar ou adicione uma compra abaixo.
            </Text>
          </Card>
        )}

        <Text style={styles.h2}>Adicionar sem XML</Text>
        <Button
          title="Adicionar compra manualmente"
          onPress={() => router.push('/nota-manual')}
        />

        <Text style={styles.h2}>Enviar XML manualmente</Text>
        {demo ? (
          <Text style={styles.demoBadge}>Os XMLs enviados entram nos dados de demonstração.</Text>
        ) : null}
        <Button title="Escolher XMLs e enviar" onPress={pickAndUpload} loading={upload.isPending} />
        <View style={{ marginTop: 12 }}>
          <Button
            title="Ver relatório de compras"
            variant="outline"
            onPress={() => router.push('/relatorio')}
          />
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {results ? (
          <Card style={styles.resultsCard}>
            {results.map((r, i) => (
              <Text key={`${r.filename}-${i}`} style={styles.resultLine}>
                {r.filename}:{' '}
                {r.status === 'imported'
                  ? '✓ importada'
                  : r.status === 'already_imported'
                    ? 'já importada'
                    : `✗ ${r.error ?? 'erro'}`}
              </Text>
            ))}
          </Card>
        ) : null}
      </ScrollView>
    </View>
  );
}

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active ? styles.chipActive : styles.chipIdle]}>
      <Text style={[styles.chipText, active ? styles.chipTextActive : styles.chipTextIdle]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 20, paddingBottom: 40, maxWidth: 520, width: '100%', alignSelf: 'center' },
  title: { fontSize: 24, fontWeight: '800', color: colors.text },
  sub: { fontSize: 15, color: colors.muted, marginTop: 8, marginBottom: 16, lineHeight: 21 },
  demoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  demoText: { fontSize: 14, fontWeight: '600', color: colors.text },
  demoBadge: { fontSize: 13, fontWeight: '700', color: colors.primaryDark, marginBottom: 8 },
  syncCard: { marginBottom: 12 },
  syncTitle: { fontSize: 13, fontWeight: '800', color: colors.muted },
  syncText: { fontSize: 14, color: colors.text, marginTop: 4, lineHeight: 20 },
  chips: { marginBottom: 12 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
  },
  chipIdle: { borderColor: colors.border, backgroundColor: colors.card },
  chipActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  chipText: { fontSize: 13, fontWeight: '700' },
  chipTextIdle: { color: colors.muted },
  chipTextActive: { color: colors.primaryDark },
  error: { color: colors.danger, marginTop: 8, fontSize: 14 },
  resultsCard: { marginTop: 12 },
  resultLine: { fontSize: 14, color: colors.text, marginBottom: 4, lineHeight: 20 },
  h2: { fontSize: 16, fontWeight: '800', color: colors.text, marginTop: 20, marginBottom: 10 },
  rowCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  rowMeta: { fontSize: 13, color: colors.muted, marginTop: 2, lineHeight: 18 },
  badge: { fontSize: 12, fontWeight: '800' },
  chevron: { fontSize: 26, color: colors.muted, fontWeight: '700' },
  emptyCard: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  emptyText: { fontSize: 14, color: colors.primaryDark, lineHeight: 20 },
});
