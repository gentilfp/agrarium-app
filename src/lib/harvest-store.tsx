// Armazena as análises de safra em memória (MOCKUP — sem persistência nem backend).
// Espelha o padrão de `auth.tsx`. Quando o cálculo migrar para o backend, isto vira
// uma query do React Query.

import { createContext, useContext, useState, type ReactNode } from 'react';
import { computeHarvest, type HarvestInput, type HarvestResult } from './harvest';

export type Analysis = HarvestResult & { id: string; createdAt: number };

type HarvestContextType = {
  analyses: Analysis[];
  latest: Analysis | null;
  addAnalysis: (input: HarvestInput) => Analysis;
  getById: (id: string) => Analysis | undefined;
};

const HarvestContext = createContext<HarvestContextType | null>(null);

export function useHarvest() {
  const ctx = useContext(HarvestContext);
  if (!ctx) throw new Error('useHarvest deve ser usado dentro de <HarvestProvider>');
  return ctx;
}

export function HarvestProvider({ children }: { children: ReactNode }) {
  const [analyses, setAnalyses] = useState<Analysis[]>([]);

  function addAnalysis(input: HarvestInput): Analysis {
    const result = computeHarvest(input);
    const analysis: Analysis = {
      ...result,
      id: `${Date.now()}`,
      createdAt: Date.now(),
    };
    setAnalyses((prev) => [analysis, ...prev]);
    return analysis;
  }

  const getById = (id: string) => analyses.find((a) => a.id === id);
  const latest = analyses[0] ?? null;

  return (
    <HarvestContext.Provider value={{ analyses, latest, addAnalysis, getById }}>
      {children}
    </HarvestContext.Provider>
  );
}
