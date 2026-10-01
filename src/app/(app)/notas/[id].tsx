import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { useFiscalDocument } from '@/lib/fiscal-api';
import { brl, colors } from '@/lib/theme';

export default function NotaDetalhe() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: doc, isLoading } = useFiscalDocument(id);

  if (isLoading || !doc) {
    return (
      <View style={styles.screen}>
        <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
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
});
