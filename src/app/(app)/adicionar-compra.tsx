import { router } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { apiError, useUploadFiscalDocuments, type UploadResult } from '@/lib/fiscal-api';
import { colors } from '@/lib/theme';

// AGR-23: porta de entrada de compras. Digitar (sem XML) ou enviar o arquivo
// da nota. O envio de XML saiu de "Suas notas" e vive aqui.
export default function AdicionarCompra() {
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
      const payload = await upload.mutateAsync({ form });
      setResults(payload.results);
    } catch (err) {
      setError(apiError(err, 'Falha no envio dos XMLs.'));
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Adicionar compra</Text>
      <Text style={styles.sub}>
        Registre o que você comprou. Isso alimenta seus gastos e a comparação de preços.
      </Text>

      <Pressable
        onPress={() => router.push('/nota-manual')}
        accessibilityRole="button"
        accessibilityLabel="Digitar a compra">
        <Card style={styles.optionCard}>
          <Text style={styles.optionTitle}>Digitar a compra</Text>
          <Text style={styles.optionText}>
            Preencha fornecedor, data e itens quando você não tiver o arquivo da nota.
          </Text>
          <Text style={styles.optionAction}>Digitar ›</Text>
        </Card>
      </Pressable>

      <Card style={styles.optionCard}>
        <Text style={styles.optionTitle}>Enviar arquivo da nota (XML)</Text>
        <Text style={styles.optionText}>
          Escolha o arquivo XML que o fornecedor enviou. O Agrarium lê a nota e classifica os itens
          sozinho.
        </Text>
        <Button
          title="Escolher XMLs e enviar"
          onPress={pickAndUpload}
          loading={upload.isPending}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {results ? (
          <View style={styles.results}>
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
          </View>
        ) : null}
      </Card>

      <Text style={styles.note}>
        A nota completa só é buscada automaticamente depois que você responde a nota em Compras.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 48, maxWidth: 720, width: '100%', alignSelf: 'center' },
  title: { fontSize: 26, fontWeight: '800', color: colors.text },
  sub: { fontSize: 16, color: colors.muted, marginTop: 8, marginBottom: 16, lineHeight: 22 },
  optionCard: { minHeight: 120, justifyContent: 'center' },
  optionTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
  optionText: { fontSize: 16, color: colors.muted, marginTop: 6, marginBottom: 12, lineHeight: 22 },
  optionAction: { fontSize: 16, fontWeight: '800', color: colors.primary },
  error: { color: colors.danger, marginTop: 10, fontSize: 15, lineHeight: 21 },
  results: { marginTop: 12 },
  resultLine: { fontSize: 15, color: colors.text, marginBottom: 4, lineHeight: 21 },
  note: { fontSize: 13, color: colors.muted, marginTop: 6, lineHeight: 19 },
});
