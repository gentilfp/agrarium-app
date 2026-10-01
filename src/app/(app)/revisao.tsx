import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { Select } from '@/components/ui/Select';
import {
  AGRONOMIC_CATEGORIES,
  apiError,
  useCorrectItem,
  useCreateProduct,
  useProductSearch,
  useReviewItems,
  type FiscalItemDTO,
} from '@/lib/fiscal-api';
import { brl, colors } from '@/lib/theme';

const CATEGORY_OPTIONS = AGRONOMIC_CATEGORIES.map((key) => ({ key, label: key }));

function ReviewCard({ item }: { item: FiscalItemDTO }) {
  const correct = useCorrectItem();
  const createProduct = useCreateProduct();
  const [query, setQuery] = useState('');
  const [productId, setProductId] = useState<number | null>(item.product?.id ?? null);
  const [productName, setProductName] = useState(item.product?.name ?? '');
  const [category, setCategory] = useState<string>(
    item.agronomic_category ?? item.product?.agronomic_category ?? 'other',
  );
  const [packageSize, setPackageSize] = useState('');
  const [packageUnit, setPackageUnit] = useState('');
  const [creating, setCreating] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const { data: options } = useProductSearch(query, item.is_demo);

  async function confirm() {
    setFeedback(null);
    try {
      let id = productId;
      if (creating) {
        const created = await createProduct.mutateAsync({
          name: productName.trim(),
          agronomic_category: category,
          is_demo: item.is_demo,
        });
        id = created.id;
      }
      if (!id) {
        setFeedback('Escolha um produto ou crie um novo.');
        return;
      }
      await correct.mutateAsync({
        id: item.id,
        patch: {
          product_id: id,
          agronomic_category: category,
          ...(packageSize ? { package_size: Number(packageSize), package_unit: packageUnit || undefined } : {}),
        },
      });
      setFeedback('✓ Confirmado — outros itens iguais foram atualizados.');
    } catch (err) {
      setFeedback(apiError(err, 'Não foi possível confirmar.'));
    }
  }

  return (
    <Card>
      <Text style={styles.itemDesc}>{item.description}</Text>
      <Text style={styles.itemMeta}>
        {item.commercial_quantity ?? '?'} {item.commercial_unit ?? ''}
        {item.normalized_quantity != null && item.base_unit
          ? ` → ${item.normalized_quantity} ${item.base_unit}`
          : ' · tamanho desconhecido'}
        {item.price_per_base_unit != null && item.base_unit
          ? ` · ${brl(item.price_per_base_unit)}/${item.base_unit}`
          : ''}
      </Text>
      <Text style={styles.itemMeta}>
        Sugestão: {item.product ? item.product.name : 'nenhum produto'}
        {item.match_method && item.match_method !== 'none' ? ` (${item.match_method})` : ''}
      </Text>
      {item.is_demo ? <Text style={styles.demoBadge}>Dados de demonstração</Text> : null}

      <Field label="Buscar produto" value={query} onChangeText={setQuery} placeholder="mín. 2 letras" />
      {options?.map((p) => (
        <Pressable
          key={p.id}
          style={[styles.option, p.id === productId && styles.optionActive]}
          onPress={() => {
            setProductId(p.id);
            setProductName(p.name);
            setCreating(false);
          }}>
          <Text style={styles.optionText}>
            {p.name}
            {p.brand_name ? ` · ${p.brand_name}` : ''}
          </Text>
        </Pressable>
      ))}

      <Pressable
        style={styles.toggle}
        onPress={() => {
          setCreating(!creating);
          if (!creating) setProductId(null);
        }}>
        <Text style={styles.toggleText}>{creating ? '↩ usar produto existente' : '+ criar produto novo'}</Text>
      </Pressable>
      {creating ? (
        <Field label="Nome do novo produto" value={productName} onChangeText={setProductName} />
      ) : null}

      <Select
        label="Categoria"
        options={CATEGORY_OPTIONS}
        value={category}
        onChange={setCategory}
      />
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Field
            label="Embalagem (tam.)"
            value={packageSize}
            onChangeText={setPackageSize}
            keyboardType="numeric"
            placeholder="ex. 50"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Field
            label="Unidade"
            value={packageUnit}
            onChangeText={setPackageUnit}
            placeholder="kg ou L"
          />
        </View>
      </View>

      <Button
        title="Confirmar correção"
        onPress={confirm}
        loading={correct.isPending || createProduct.isPending}
      />
      {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
    </Card>
  );
}

export default function Revisao() {
  const { demo: demoParam } = useLocalSearchParams<{ demo?: string }>();
  const [demo, setDemo] = useState(demoParam === 'true');
  const { data: items, isLoading, refetch } = useReviewItems(demo);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Revisar compras</Text>
        <Text style={styles.sub}>
          Itens que o classificador não reconheceu com segurança. Ao corrigir, o Agrarium aprende e
          atualiza os iguais.
        </Text>
        <View style={styles.demoRow}>
          <Text style={styles.demoText}>Dados de demonstração</Text>
          <Switch value={demo} onValueChange={setDemo} accessibilityLabel="Dados de demonstração" />
        </View>
        {isLoading ? (
          <ActivityIndicator color={colors.primary} />
        ) : items && items.length > 0 ? (
          <>
            <Text style={styles.count}>
              {items.length} {items.length === 1 ? 'item' : 'itens'} aguardando
            </Text>
            {items.map((item) => (
              <ReviewCard key={item.id} item={item} />
            ))}
            <Button title="Recarregar" variant="outline" onPress={() => refetch()} />
          </>
        ) : (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>Nada para revisar — todas as compras estão classificadas.</Text>
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
  count: { fontSize: 14, fontWeight: '700', color: colors.muted, marginBottom: 10 },
  itemDesc: { fontSize: 15, fontWeight: '700', color: colors.text },
  itemMeta: { fontSize: 13, color: colors.muted, marginTop: 4, lineHeight: 18 },
  demoBadge: { fontSize: 12, fontWeight: '700', color: colors.primaryDark, marginTop: 4 },
  demoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  demoText: { fontSize: 14, fontWeight: '600', color: colors.text },
  option: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10 },
  optionActive: { backgroundColor: colors.primaryLight },
  optionText: { fontSize: 15, color: colors.text },
  toggle: { marginBottom: 12 },
  toggleText: { color: colors.primary, fontWeight: '700', fontSize: 14 },
  row: { flexDirection: 'row', gap: 12 },
  feedback: { marginTop: 8, fontSize: 14, color: colors.text },
  emptyCard: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  emptyText: { fontSize: 14, color: colors.primaryDark, lineHeight: 20 },
});
