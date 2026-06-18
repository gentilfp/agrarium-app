import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useCreateHarvest, type HarvestInput } from '@/api/harvests';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { Segmented } from '@/components/ui/Segmented';
import { apiError } from '@/lib/api';
import { brl, colors } from '@/lib/theme';

const PRODUCER_TYPES = [
  { label: 'Básico', value: 'basico' },
  { label: 'Intermediário', value: 'intermediario' },
  { label: 'Integral', value: 'integral' },
  { label: 'Completo', value: 'completo' },
  { label: 'Spot', value: 'spot' },
];
const DELIVERY_MODES = [
  { label: 'Em pé', value: 'em_pe' },
  { label: 'Embarcada', value: 'embarcada' },
  { label: 'Na esteira', value: 'esteira' },
];

type State = {
  season: string;
  cut_number: string;
  cane_area_ha: string;
  production_t: string;
  atr_kg_per_t: string;
  producer_type: string;
  delivery_mode: string;
  tratos_soca: string;
  colheita_cct: string;
  arrendamento: string;
};

const initial: State = {
  season: '25/26',
  cut_number: '2',
  cane_area_ha: '',
  production_t: '',
  atr_kg_per_t: '140',
  producer_type: 'integral',
  delivery_mode: 'embarcada',
  tratos_soca: '',
  colheita_cct: '',
  arrendamento: '',
};

export default function NewHarvest() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<State>(initial);
  const [err, setErr] = useState<string | null>(null);
  const { mutateAsync, isPending } = useCreateHarvest();

  const set = (key: keyof State) => (v: string) => setForm((f) => ({ ...f, [key]: v }));
  const num = (v: string) => Number(String(v).replace(',', '.')) || 0;
  const productivity = num(form.cane_area_ha) > 0 ? num(form.production_t) / num(form.cane_area_ha) : 0;

  const step1Valid = num(form.cane_area_ha) > 0 && num(form.production_t) > 0 && num(form.atr_kg_per_t) > 0;

  async function submit() {
    setErr(null);
    const payload: HarvestInput = {
      season: form.season,
      cut_number: parseInt(form.cut_number, 10) || 0,
      cane_area_ha: num(form.cane_area_ha),
      production_t: num(form.production_t),
      atr_kg_per_t: num(form.atr_kg_per_t),
      producer_type: form.producer_type,
      delivery_mode: form.delivery_mode,
      cost_entries_attributes: (
        [
          { category: 'tratos_soca', phase: 'tratos_soca', amount: num(form.tratos_soca), unit: 'per_ha' },
          { category: 'colheita_cct', phase: 'colheita', amount: num(form.colheita_cct), unit: 'per_t' },
          { category: 'arrendamento', amount: num(form.arrendamento), unit: 'per_ha' },
        ] as HarvestInput['cost_entries_attributes']
      ).filter((e) => e.amount > 0),
    };
    try {
      const harvest = await mutateAsync(payload);
      router.replace(`/harvest/${harvest.id}`);
    } catch (e) {
      setErr(apiError(e, 'Não foi possível salvar a safra.'));
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Steps step={step} />

        {step === 1 && (
          <View>
            <Text style={styles.h}>Produção & qualidade</Text>
            <Field label="Safra" value={form.season} onChangeText={set('season')} placeholder="25/26" />
            <Field label="Número do corte" hint="0 = cana-planta, 1+ = soca" value={form.cut_number}
              onChangeText={set('cut_number')} keyboardType="numeric" />
            <Field label="Área de cana (ha)" value={form.cane_area_ha} onChangeText={set('cane_area_ha')}
              keyboardType="numeric" placeholder="80" />
            <Field label="Produção colhida (t)" value={form.production_t} onChangeText={set('production_t')}
              keyboardType="numeric" placeholder="6160" />
            {productivity > 0 ? <Text style={styles.calc}>Produtividade: {productivity.toFixed(1)} t/ha (TCH)</Text> : null}
            <Field label="Qualidade — ATR (kg/t)" hint="se não souber, use a referência (~140)" value={form.atr_kg_per_t}
              onChangeText={set('atr_kg_per_t')} keyboardType="numeric" />
            <Button title="Continuar" onPress={() => setStep(2)} disabled={!step1Valid} />
          </View>
        )}

        {step === 2 && (
          <View>
            <Text style={styles.h}>Perfil de contrato</Text>
            <Segmented label="Tipo de produtor" options={PRODUCER_TYPES} value={form.producer_type} onChange={set('producer_type')} />
            <Segmented label="Modalidade de entrega" options={DELIVERY_MODES} value={form.delivery_mode} onChange={set('delivery_mode')} />
            <Text style={[styles.h, { marginTop: 8 }]}>Custos</Text>
            <Field label="Tratos da soca (R$/ha)" value={form.tratos_soca} onChangeText={set('tratos_soca')} keyboardType="numeric" placeholder="1900" />
            <Field label="Colheita / CCT (R$/t)" hint="corte + carregamento + transporte" value={form.colheita_cct}
              onChangeText={set('colheita_cct')} keyboardType="numeric" placeholder="47" />
            <Field label="Arrendamento (R$/ha)" value={form.arrendamento} onChangeText={set('arrendamento')} keyboardType="numeric" placeholder="2500" />
            <View style={styles.rowBtns}>
              <View style={{ flex: 1 }}><Button title="Voltar" variant="outline" onPress={() => setStep(1)} /></View>
              <View style={{ flex: 1 }}><Button title="Revisar" onPress={() => setStep(3)} /></View>
            </View>
          </View>
        )}

        {step === 3 && (
          <View>
            <Text style={styles.h}>Revisão</Text>
            <Card>
              <Review label="Safra / corte" value={`${form.season} · corte ${form.cut_number}`} />
              <Review label="Área" value={`${form.cane_area_ha} ha`} />
              <Review label="Produtividade" value={`${productivity.toFixed(1)} t/ha`} />
              <Review label="ATR" value={`${form.atr_kg_per_t} kg/t`} />
              <Review label="Tratos soca" value={brl(num(form.tratos_soca))} />
              <Review label="Colheita/CCT" value={`${brl(num(form.colheita_cct))}/t`} />
              <Review label="Arrendamento" value={brl(num(form.arrendamento))} />
            </Card>
            {err ? <Text style={styles.err}>{err}</Text> : null}
            <View style={styles.rowBtns}>
              <View style={{ flex: 1 }}><Button title="Voltar" variant="outline" onPress={() => setStep(2)} /></View>
              <View style={{ flex: 1 }}><Button title="Calcular" onPress={submit} loading={isPending} /></View>
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Steps({ step }: { step: number }) {
  return (
    <View style={styles.steps}>
      {[1, 2, 3].map((n) => (
        <View key={n} style={[styles.stepDot, n <= step && styles.stepDotActive]}>
          <Text style={[styles.stepNum, n <= step && styles.stepNumActive]}>{n}</Text>
        </View>
      ))}
    </View>
  );
}

function Review({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.review}>
      <Text style={styles.muted}>{label}</Text>
      <Text style={styles.reviewVal}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, maxWidth: 520, width: '100%', alignSelf: 'center' },
  steps: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 20 },
  stepDot: { width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },
  stepDotActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  stepNum: { color: colors.muted, fontWeight: '700' },
  stepNumActive: { color: colors.white },
  h: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 14 },
  calc: { color: colors.primaryDark, fontWeight: '600', marginBottom: 14, marginTop: -8 },
  rowBtns: { flexDirection: 'row', gap: 12, marginTop: 8 },
  review: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  reviewVal: { fontWeight: '700', color: colors.text },
  muted: { color: colors.muted },
  err: { color: colors.danger, marginBottom: 8 },
});
