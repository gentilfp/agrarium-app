import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { apiError, lineValue, useFiscalDocument } from '@/lib/fiscal-api';
import { brl, colors } from '@/lib/theme';

export default function NotaDetalhe() {
  const { id, demo } = useLocalSearchParams<{ id: string; demo?: string }>();
  const { data: doc, isLoading, isError, error, refetch } = useFiscalDocument(id, demo === 'true');

  if (isLoading) {
    return (
      <View style={styles.screen}>
        <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
      </View>
    );
  }

  if (isError || !doc) {
    return (
      <View style={styles.screen}>
        <View style={styles.container}>
          <Card style={styles.errorCard}>
            <Text style={styles.errorText}>
              {apiError(error, 'Documento não encontrado.')}
            </Text>
            <Button title="Tentar de novo" onPress={() => refetch()} />
            <Button title="Voltar" variant="outline" onPress={() => router.back()} />
          </Card>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>{doc.emitter_name ?? 'Documento'}</Text>
        {doc.is_demo ? <Text style={styles.demoBadge}>Dados de demonstração</Text> : null}
        <Text style={styles.meta}>
          Chave {doc.chave}
          {doc.issued_at ? ` · Emitida em ${new Date(doc.issued_at).toLocaleDateString('pt-BR')}` : ''}
        </Text>
        <Text style={styles.meta}>
          {doc.nat_op ?? ''}
          {doc.total_vnf != null ? ` · Total ${brl(doc.total_vnf)}` : ''}
          {doc.protocol_number ? ` · Protocolo ${doc.protocol_number}` : ' · Sem protocolo'}
        </Text>

        <Text style={styles.h2}>Itens ({doc.items.length})</Text>
        {doc.items.map((item) => (
          <Card key={item.id}>
            <Text style={styles.itemDesc}>{item.description}</Text>
            <Text style={styles.itemMeta}>
              Valor: {brl(lineValue(item) ?? undefined)}
              {item.discount ? ` (desc. ${brl(item.discount)})` : ''}
            </Text>
            <Text style={styles.itemMeta}>
              {item.commercial_quantity ?? '?'} {item.commercial_unit ?? ''}
              {item.normalized_quantity != null && item.base_unit
                ? ` → ${item.normalized_quantity} ${item.base_unit}`
                : ''}
              {item.price_per_base_unit != null && item.base_unit
                ? ` · ${brl(item.price_per_base_unit)}/${item.base_unit}`
                : ''}
            </Text>
            <Text style={styles.itemMeta}>
              {item.product ? `✓ ${item.product.name}` : '○ sem produto vinculado'}
              {item.match_status === 'needs_review' || item.match_status === 'unmatched'
                ? ' · precisa de revisão'
                : ''}
              {item.match_method ? ` (${item.match_method})` : ''}
            </Text>
          </Card>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 20, paddingBottom: 40, maxWidth: 520, width: '100%', alignSelf: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: colors.text },
  demoBadge: { fontSize: 13, fontWeight: '700', color: colors.primaryDark, marginTop: 4 },
  meta: { fontSize: 13, color: colors.muted, marginTop: 4, lineHeight: 18 },
  h2: { fontSize: 16, fontWeight: '800', color: colors.text, marginTop: 20, marginBottom: 10 },
  itemDesc: { fontSize: 15, fontWeight: '700', color: colors.text },
  itemMeta: { fontSize: 13, color: colors.muted, marginTop: 4, lineHeight: 18 },
  errorCard: { marginTop: 24, gap: 12 },
  errorText: { fontSize: 14, color: colors.danger, lineHeight: 20 },
});
