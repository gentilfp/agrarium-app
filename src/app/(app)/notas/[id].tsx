import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
  apiError,
  inboxLabel,
  lineValue,
  useFiscalDocument,
  useManifestDocument,
} from '@/lib/fiscal-api';
import { formatDate } from '@/lib/format';
import { brl, colors } from '@/lib/theme';

// AGR-23: linguagem simples. As duas respostas que o produtor usa todo dia vêm
// primeiro; ciência e "operação não realizada" ficam em "Outro problema".
const ACTIONS = [
  {
    type: 'confirmacao_operacao',
    button: 'Sim, comprei',
    title: 'Confirmação da operação',
    explain:
      'Você confirma que esta compra aconteceu. É registrada na SEFAZ como ' +
      'confirmação e não pode ser desfeita.',
    needsJustification: false,
    primary: true,
  },
  {
    type: 'desconhecimento_operacao',
    button: 'Não reconheço',
    title: 'Desconhecimento da operação',
    explain:
      'Você declara que não conhece esta operação — proteção contra fraude e ' +
      'notas emitidas por engano em seu nome. É registrada na SEFAZ e não pode ' +
      'ser desfeita.',
    needsJustification: false,
    primary: true,
  },
  {
    type: 'operacao_nao_realizada',
    button: 'Operação não realizada',
    title: 'Operação não realizada',
    explain:
      'Você declara que a operação foi cancelada ou não aconteceu (ex.: pedido ' +
      'cancelado, mercadoria devolvida). É registrada na SEFAZ, não pode ser ' +
      'desfeita e exige uma justificativa de 15 a 255 caracteres.',
    needsJustification: true,
    primary: false,
  },
  {
    type: 'ciencia_operacao',
    button: 'Só dar ciência (não é confirmação)',
    title: 'Ciência da operação',
    explain:
      'Você avisa que viu esta nota e libera a busca da nota completa. ' +
      'Ciência NÃO é confirmação de compra — ela só diz “estou ciente”.',
    needsJustification: false,
    primary: false,
  },
] as const;

const EVENT_LABELS: Record<string, string> = {
  ciencia_operacao: 'Ciência da operação',
  confirmacao_operacao: 'Confirmação da operação',
  desconhecimento_operacao: 'Desconhecimento da operação',
  operacao_nao_realizada: 'Operação não realizada',
};

// The POST answers as soon as the event is queued; the delivery job settles the
// record right after. These backoff steps poll the document until the event
// leaves `pending`, so the result line reports the real outcome.
const SETTLE_DELAYS_MS = [600, 1200, 2000, 3000, 4000];

type ResultLine = { text: string; refusal: boolean };

export default function NotaDetalhe() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: doc, isLoading, isError, error, refetch } = useFiscalDocument(id);
  const manifest = useManifestDocument();
  const [active, setActive] = useState<(typeof ACTIONS)[number] | null>(null);
  const [justification, setJustification] = useState('');
  const [result, setResult] = useState<ResultLine | null>(null);
  const [resultIsDemo, setResultIsDemo] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const submitSeq = useRef(0);

  // Polls this manifestation until the job settles it, then reports registered
  // or refused (with the provider reason). A newer submission cancels an older
  // poll so a stale outcome can never overwrite the current result line.
  async function settleResult(manifestationId: number, seq: number) {
    for (const delay of SETTLE_DELAYS_MS) {
      await new Promise((resolve) => setTimeout(resolve, delay));
      if (seq !== submitSeq.current) return;
      const fresh = await refetch();
      if (seq !== submitSeq.current) return;
      const m = fresh.data?.manifestations.find((x) => x.id === manifestationId);
      if (!m || m.status === 'pending') continue;
      setResult(
        m.status === 'registered'
          ? { text: 'Resposta registrada.', refusal: false }
          : {
              text: `Resposta recusada: ${m.error ?? 'verifique e tente de novo'}.`,
              refusal: true,
            },
      );
      return;
    }
    setResult({
      text: 'Resposta enviada — o registro ainda está sendo processado. Puxe para atualizar.',
      refusal: false,
    });
  }

  async function confirm() {
    if (!active || !doc) return;
    const seq = ++submitSeq.current;
    setActionError(null);
    setResult(null);
    setResultIsDemo(false);
    try {
      const payload = await manifest.mutateAsync({
        id: doc.id,
        event_type: active.type,
        justification: active.needsJustification ? justification : undefined,
      });
      const { status, id: manifestationId, error: refusalReason } = payload.manifestation;
      setResultIsDemo(doc.is_demo);
      setActive(null);
      setJustification('');
      refetch();
      if (payload.already_submitted && status === 'registered') {
        setResult({ text: 'Resposta já registrada antes — sem duplicar o evento.', refusal: false });
      } else if (status === 'registered') {
        setResult({ text: 'Resposta registrada.', refusal: false });
      } else if (status === 'pending') {
        // Async queue: never report a refusal for a pending record — wait for
        // the job and report what it actually settled to.
        setResult({ text: 'Resposta enviada — aguardando o registro. Atualizando…', refusal: false });
        void settleResult(manifestationId, seq);
      } else {
        setResult({
          text: `Resposta recusada: ${refusalReason ?? 'verifique e tente de novo'}.`,
          refusal: true,
        });
      }
    } catch (err) {
      setActionError(apiError(err, 'Não foi possível enviar a resposta.'));
    }
  }

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
            <Text style={styles.errorText}>{apiError(error, 'Documento não encontrado.')}</Text>
            <Button title="Tentar de novo" onPress={() => refetch()} />
            <Button title="Voltar" variant="outline" onPress={() => router.back()} />
          </Card>
        </View>
      </View>
    );
  }

  const isManual = doc.source === 'manual_entry';

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>{doc.emitter_name ?? 'Documento'}</Text>
        <Text style={styles.meta}>
          {isManual ? 'Lançamento manual' : `Chave ${doc.chave}`}
          {doc.issued_at ? ` · Emitida em ${formatDate(doc.issued_at)}` : ''}
        </Text>
        <Text style={styles.meta}>
          {doc.nat_op ?? ''}
          {doc.total_vnf != null ? ` · Total ${brl(doc.total_vnf)}` : ''}
          {!isManual
            ? doc.protocol_number
              ? ` · Protocolo ${doc.protocol_number}`
              : ' · Sem protocolo'
            : ''}
        </Text>
        <Text style={styles.statusLine}>
          Situação: {inboxLabel(doc.inbox_status)}
          {!isManual ? ` · ${xmlLabel(doc.xml_status)}` : ' · Compra informada sem arquivo'}
          {doc.manifestation_deadline
            ? ` · Responda até ${formatDate(doc.manifestation_deadline)}${doc.deadline_soon ? ' (próximo!)' : ''}`
            : ''}
        </Text>
        {doc.sync_error ? <Text style={styles.errorText}>⚠ {doc.sync_error}</Text> : null}

        {!isManual ? (
          <>
        <Text style={styles.h2}>Histórico</Text>
        {doc.manifestations.length > 0 ? (
          doc.manifestations.map((m) => (
            <Card key={m.id}>
              <Text style={styles.itemDesc}>
                {EVENT_LABELS[m.event_type] ?? m.event_type} ·{' '}
                {m.status === 'registered'
                  ? 'registrada'
                  : m.status === 'rejected'
                    ? 'recusada'
                    : 'enviando…'}
              </Text>
              {m.is_demo ? (
                <Text style={styles.demoBadge}>Resposta simulada — não enviada à SEFAZ</Text>
              ) : null}
              {m.sefaz_protocol ? (
                <Text style={styles.itemMeta}>Protocolo SEFAZ {m.sefaz_protocol}</Text>
              ) : null}
              {m.error ? <Text style={styles.errorText}>{m.error}</Text> : null}
              <Text style={styles.itemMeta}>
                {new Date(m.created_at).toLocaleString('pt-BR')}
              </Text>
            </Card>
          ))
        ) : (
          <Text style={styles.itemMeta}>Nenhuma resposta enviada ainda.</Text>
        )}

        {doc.actions_allowed ? (
          <>
            <Text style={styles.h2}>Responder</Text>
            {doc.is_demo ? (
              <Text style={styles.demoBadge}>
                Resposta simulada — não enviada à SEFAZ. Vale para testar o fluxo.
              </Text>
            ) : null}
            {ACTIONS.filter((a) => a.primary).map((a) => (
              <View key={a.type} style={{ marginBottom: 8 }}>
                <Button
                  title={a.button}
                  variant={a.type === 'confirmacao_operacao' ? 'primary' : 'outline'}
                  onPress={() => setActive(a)}
                />
              </View>
            ))}
            <Text style={styles.h3}>Outro problema</Text>
            {ACTIONS.filter((a) => !a.primary).map((a) => (
              <View key={a.type} style={{ marginBottom: 8 }}>
                <Button title={a.button} variant="outline" onPress={() => setActive(a)} />
              </View>
            ))}
          </>
        ) : (
          <Text style={styles.itemMeta}>{sentence(doc.actions_refusal ?? 'este documento não aceita resposta pelo app')}</Text>
        )}
        {result ? (
          <Text style={result.refusal ? styles.errorText : styles.okText}>{result.text}</Text>
        ) : null}
        {result && resultIsDemo ? (
          <Text style={styles.demoBadge}>Resposta simulada — não enviada à SEFAZ</Text>
        ) : null}
        {actionError ? <Text style={styles.errorText}>{actionError}</Text> : null}
          </>
        ) : null}

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
        {doc.needs_review_count > 0 ? (
          <Button
            title="Classificar itens"
            variant="outline"
            onPress={() => router.push('/revisao')}
          />
        ) : null}

        <Modal visible={active !== null} transparent animationType="fade" onRequestClose={() => setActive(null)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>{active?.title}</Text>
              {doc.is_demo ? (
                <Text style={styles.demoBadge}>
                  Resposta simulada — não enviada à SEFAZ. Na versão final, esta ação é
                  registrada de verdade.
                </Text>
              ) : null}
              <Text style={styles.modalText}>{active?.explain}</Text>
              {active?.needsJustification ? (
                <TextInput
                  style={styles.input}
                  value={justification}
                  onChangeText={setJustification}
                  placeholder="Justificativa (15 a 255 caracteres)"
                  multiline
                />
              ) : null}
              <View style={{ marginTop: 12 }}>
                <Button
                  title="Confirmar resposta"
                  onPress={confirm}
                  loading={manifest.isPending}
                  disabled={!!active?.needsJustification && justification.trim().length < 15}
                />
              </View>
              <View style={{ marginTop: 8 }}>
                <Button title="Cancelar" variant="outline" onPress={() => setActive(null)} />
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </View>
  );
}

function xmlLabel(status: string) {
  if (status === 'retrieved') return 'nota completa recebida';
  if (status === 'pending') return 'buscando a nota completa';
  if (status === 'failed') return 'falha na nota completa';
  return 'nota completa ainda não chegou';
}

// Backend refusal reasons are lower-case API messages.
function sentence(text: string) {
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}.`;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 20, paddingBottom: 40, maxWidth: 520, width: '100%', alignSelf: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: colors.text },
  demoBadge: { fontSize: 13, fontWeight: '700', color: colors.primaryDark, marginTop: 4 },
  meta: { fontSize: 13, color: colors.muted, marginTop: 4, lineHeight: 18 },
  statusLine: { fontSize: 14, fontWeight: '700', color: colors.text, marginTop: 8, lineHeight: 20 },
  h2: { fontSize: 17, fontWeight: '800', color: colors.text, marginTop: 20, marginBottom: 10 },
  h3: { fontSize: 15, fontWeight: '800', color: colors.muted, marginTop: 16, marginBottom: 8 },
  itemDesc: { fontSize: 16, fontWeight: '700', color: colors.text },
  itemMeta: { fontSize: 14, color: colors.muted, marginTop: 4, lineHeight: 20 },
  errorCard: { marginTop: 24, gap: 12 },
  errorText: { fontSize: 14, color: colors.danger, lineHeight: 20 },
  okText: { fontSize: 14, color: colors.primaryDark, fontWeight: '700', marginTop: 8, lineHeight: 20 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 24,
  },
  modalBox: { backgroundColor: colors.card, borderRadius: 14, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  modalText: { fontSize: 14, color: colors.text, marginTop: 8, lineHeight: 21 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    minHeight: 80,
    fontSize: 14,
    color: colors.text,
  },
});
