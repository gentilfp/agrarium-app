import { router } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
  apiError,
  useFiscalDocuments,
  useUploadFiscalDocuments,
  type UploadResult,
} from '@/lib/fiscal-api';
import { brl, colors, statusColor } from '@/lib/theme';

function statusDot(docStatus: string) {
  if (docStatus === 'processed') return 'ok' as const;
  if (docStatus === 'needs_review') return 'warn' as const;
  return 'neutral' as const;
}

export default function Notas() {
  const { data: docs, isLoading, refetch } = useFiscalDocuments();
  const upload = useUploadFiscalDocuments();
  const [results, setResults] = useState<UploadResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      const data = await upload.mutateAsync(form);
      setResults(data.results);
      refetch();
    } catch (err) {
      setError(apiError(err, 'Falha no envio dos XMLs.'));
    }
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Notas fiscais</Text>
        <Text style={styles.sub}>
          Envie os XMLs da NF-e (baixados com seu contador ou no portal fiscal). Cada arquivo é
          classificado automaticamente.
        </Text>

        <Button title="Escolher XMLs e enviar" onPress={pickAndUpload} loading={upload.isPending} />
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

        <Text style={styles.h2}>Documentos</Text>
        {isLoading ? (
          <ActivityIndicator color={colors.primary} />
        ) : docs && docs.length > 0 ? (
          docs.map((d) => (
            <Pressable
              key={d.id}
              onPress={() => router.push({ pathname: '/notas/[id]', params: { id: String(d.id) } })}>
              <Card style={styles.rowCard}>
                <View
                  style={[styles.statusDot, { backgroundColor: statusColor(statusDot(d.status)) }]}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{d.emitter_name ?? 'Emitente desconhecido'}</Text>
                  <Text style={styles.rowMeta}>
                    {d.items_count} {d.items_count === 1 ? 'item' : 'itens'}
                    {d.needs_review_count > 0 ? ` · ${d.needs_review_count} p/ revisar` : ''}
                    {d.total_vnf != null ? ` · ${brl(d.total_vnf)}` : ''}
                  </Text>
                </View>
                {d.is_demo ? <Text style={styles.demoBadge}>Dados de demonstração</Text> : null}
                <Text style={styles.chevron}>›</Text>
              </Card>
            </Pressable>
          ))
        ) : (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>Nenhum documento ainda. Envie seu primeiro XML acima.</Text>
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
  sub: { fontSize: 15, color: colors.muted, marginTop: 8, marginBottom: 16, lineHeight: 21 },
  error: { color: colors.danger, marginTop: 8, fontSize: 14 },
  resultsCard: { marginTop: 12 },
  resultLine: { fontSize: 14, color: colors.text, marginBottom: 4, lineHeight: 20 },
  h2: { fontSize: 16, fontWeight: '800', color: colors.text, marginTop: 20, marginBottom: 10 },
  rowCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusDot: { width: 12, height: 12, borderRadius: 6 },
  rowTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  rowMeta: { fontSize: 13, color: colors.muted, marginTop: 2 },
  demoBadge: { fontSize: 11, fontWeight: '700', color: colors.primaryDark },
  chevron: { fontSize: 26, color: colors.muted, fontWeight: '700' },
  emptyCard: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  emptyText: { fontSize: 14, color: colors.primaryDark, lineHeight: 20 },
});
