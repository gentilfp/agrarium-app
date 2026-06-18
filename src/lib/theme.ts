// Paleta Agrarium (verde do logo) + helpers de status.
export const colors = {
  primary: '#3d7a1f',
  primaryDark: '#2f5e17',
  primaryLight: '#e8f1e2',
  bg: '#f6f8f3',
  card: '#ffffff',
  text: '#1f2a17',
  muted: '#6b7666',
  border: '#e2e8da',
  danger: '#c0392b',
  warn: '#d98a1e',
  good: '#3d7a1f',
  white: '#ffffff',
};

export type Status = 'bom' | 'atencao' | 'critico';

export const statusColor = (s?: string) =>
  s === 'critico' ? colors.danger : s === 'atencao' ? colors.warn : colors.good;

export const statusLabel = (s?: string) =>
  s === 'critico' ? 'Crítico' : s === 'atencao' ? 'Atenção' : 'Bom';

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };

export const brl = (n?: number, digits = 2) =>
  n == null ? '—' : `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
