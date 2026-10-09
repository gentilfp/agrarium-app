// AGR-23: datas em português para exibição. Sem Intl para o resultado ficar
// igual em web e native (o Hermes pode vir sem os dados de locale completos).

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})/;
const ISO_MONTH = /^(\d{4})-(\d{2})$/;

// '2026-03-10' ou '2026-03-10T12:00:00Z' → '10/03/2026'. Entrada vazia → '—'.
export function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  const match = ISO_DATE.exec(iso);
  if (!match) return '—';
  return `${match[3]}/${match[2]}/${match[1]}`;
}

// '2026-03' → 'mar/2026'.
export function monthLabel(month?: string | null): string {
  if (!month) return '—';
  const match = ISO_MONTH.exec(month);
  if (!match) return month;
  const index = Number(match[2]) - 1;
  return `${MONTHS[index] ?? match[2]}/${match[1]}`;
}

// '2026-03-10' → 'mar' (rótulo curto dos gráficos).
export function shortMonth(month?: string | null): string {
  return monthLabel(month).split('/')[0];
}
