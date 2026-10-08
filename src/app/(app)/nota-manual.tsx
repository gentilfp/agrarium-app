import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { Select } from '@/components/ui/Select';
import {
  AGRONOMIC_CATEGORIES,
  apiError,
  categoryLabel,
  useCreateManualFiscalDocument,
  type ManualPurchaseInput,
} from '@/lib/fiscal-api';
import { colors } from '@/lib/theme';

type Unit = ManualPurchaseInput['items'][number]['unit'];
type FormItem = ManualPurchaseInput['items'][number] & { id: number };
type Errors = Record<string, string>;

const CATEGORY_OPTIONS = AGRONOMIC_CATEGORIES.map((key) => ({ key, label: categoryLabel(key) }));
const UNIT_OPTIONS: { key: Unit; label: string }[] = [
  { key: 'kg', label: 'Quilograma (kg)' },
  { key: 'L', label: 'Litro (L)' },
  { key: 'UN', label: 'Unidade (UN)' },
];

function today() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function newItem(id: number): FormItem {
  return {
    id,
    description: '',
    agronomic_category: 'other',
    quantity: '',
    unit: 'kg',
    value: '',
  };
}

function decimal(value: string) {
  const normalized = value.trim().replace(',', '.');
  return normalized === '' ? Number.NaN : Number(normalized);
}

function validDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return (
    date.getFullYear() === Number(match[1]) &&
    date.getMonth() === Number(match[2]) - 1 &&
    date.getDate() === Number(match[3])
  );
}

export default function NotaManual() {
  const nextId = useRef(2);
  const createPurchase = useCreateManualFiscalDocument();
  const [supplierName, setSupplierName] = useState('');
  const [supplierDocument, setSupplierDocument] = useState('');
  const [issuedAt, setIssuedAt] = useState(today);
  const [items, setItems] = useState<FormItem[]>([newItem(1)]);
  const [errors, setErrors] = useState<Errors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  function updateItem(id: number, patch: Partial<FormItem>) {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function validate() {
    const next: Errors = {};
    if (!supplierName.trim()) next.supplierName = 'Informe o nome do fornecedor.';
    if (!validDate(issuedAt)) next.issuedAt = 'Use uma data válida no formato AAAA-MM-DD.';

    const documentDigits = supplierDocument.replace(/\D/g, '');
    if (supplierDocument.trim() && documentDigits.length !== 11 && documentDigits.length !== 14) {
      next.supplierDocument = 'Informe um CPF com 11 ou CNPJ com 14 dígitos.';
    }

    items.forEach((item) => {
      if (!item.description.trim()) next[`description-${item.id}`] = 'Informe a descrição do item.';
      if (!(decimal(item.quantity) > 0)) {
        next[`quantity-${item.id}`] = 'Informe uma quantidade maior que zero.';
      }
      if (!(decimal(item.value) >= 0)) {
        next[`value-${item.id}`] = 'Informe um valor igual ou maior que zero.';
      }
    });
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit() {
    setSubmitError(null);
    if (!validate()) return;

    try {
      const document = await createPurchase.mutateAsync({
        supplier_name: supplierName.trim(),
        supplier_document: supplierDocument.replace(/\D/g, '') || undefined,
        issued_at: issuedAt,
        items: items.map((item) => ({
          description: item.description.trim(),
          agronomic_category: item.agronomic_category,
          quantity: item.quantity.trim().replace(',', '.'),
          unit: item.unit,
          value: item.value.trim().replace(',', '.'),
        })),
      });
      router.replace({ pathname: '/notas/[id]', params: { id: String(document.id) } });
    } catch (error) {
      setSubmitError(apiError(error, 'Não foi possível adicionar a compra.'));
    }
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets>
        <Text style={styles.title}>Adicionar compra</Text>
        <Text style={styles.sub}>
          Preencha os dados da nota quando você não tiver o XML. Os valores serão incluídos no
          relatório de compras.
        </Text>

        <Card>
          <Text style={styles.cardTitle}>Dados da nota</Text>
          <Field
            label="Fornecedor"
            value={supplierName}
            onChangeText={setSupplierName}
            placeholder="Nome do fornecedor"
            autoCapitalize="words"
            error={errors.supplierName}
          />
          <Field
            label="CPF/CNPJ do fornecedor (opcional)"
            value={supplierDocument}
            onChangeText={setSupplierDocument}
            placeholder="Somente números"
            keyboardType="numeric"
            error={errors.supplierDocument}
          />
          <Field
            label="Data de emissão"
            hint="Formato: AAAA-MM-DD"
            value={issuedAt}
            onChangeText={setIssuedAt}
            placeholder="2026-03-10"
            autoCapitalize="none"
            error={errors.issuedAt}
          />
        </Card>

        <Text style={styles.sectionTitle}>Itens da compra</Text>
        {items.map((item, index) => (
          <Card key={item.id}>
            <View style={styles.itemHeader}>
              <Text style={styles.cardTitle}>Item {index + 1}</Text>
              {items.length > 1 ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remover item ${index + 1}`}
                  onPress={() => setItems((current) => current.filter((x) => x.id !== item.id))}>
                  <Text style={styles.remove}>Remover</Text>
                </Pressable>
              ) : null}
            </View>
            <Field
              label="Descrição"
              value={item.description}
              onChangeText={(description) => updateItem(item.id, { description })}
              placeholder="Ex.: Ureia ensacada"
              error={errors[`description-${item.id}`]}
            />
            <Select
              label="Categoria"
              options={CATEGORY_OPTIONS}
              value={item.agronomic_category}
              onChange={(agronomic_category) => updateItem(item.id, { agronomic_category })}
            />
            <View style={styles.row}>
              <View style={styles.rowColumn}>
                <Field
                  label="Quantidade"
                  value={item.quantity}
                  onChangeText={(quantity) => updateItem(item.id, { quantity })}
                  placeholder="Ex.: 500"
                  keyboardType="decimal-pad"
                  error={errors[`quantity-${item.id}`]}
                />
              </View>
              <View style={styles.rowColumn}>
                <Select
                  label="Unidade"
                  options={UNIT_OPTIONS}
                  value={item.unit}
                  onChange={(unit) => updateItem(item.id, { unit })}
                />
              </View>
            </View>
            <Field
              label="Valor total do item (R$)"
              value={item.value}
              onChangeText={(value) => updateItem(item.id, { value })}
              placeholder="Ex.: 1250,50"
              keyboardType="decimal-pad"
              error={errors[`value-${item.id}`]}
            />
          </Card>
        ))}

        <View style={styles.secondaryAction}>
          <Button
            title="+ Adicionar outro item"
            variant="outline"
            onPress={() => {
              const id = nextId.current++;
              setItems((current) => [...current, newItem(id)]);
            }}
          />
        </View>

        <Button title="Adicionar compra" onPress={submit} loading={createPurchase.isPending} />
        {submitError ? <Text style={styles.error}>{submitError}</Text> : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 20, paddingBottom: 40, maxWidth: 520, width: '100%', alignSelf: 'center' },
  title: { fontSize: 24, fontWeight: '800', color: colors.text },
  sub: { fontSize: 15, color: colors.muted, marginTop: 8, marginBottom: 16, lineHeight: 21 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: colors.text, marginBottom: 10 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 14 },
  itemHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  remove: { color: colors.danger, fontSize: 14, fontWeight: '700', marginBottom: 14 },
  row: { flexDirection: 'row', gap: 12 },
  rowColumn: { flex: 1 },
  secondaryAction: { marginBottom: 12 },
  error: { color: colors.danger, marginTop: 10, fontSize: 14, lineHeight: 20 },
});
