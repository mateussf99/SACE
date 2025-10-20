import { createContext, useContext, useState, type ReactNode } from "react";

type Period = { year: number | null; cycle: number | null };
type PeriodContextValue = Period & {
  setYear: (y: number | null) => void;
  setCycle: (c: number | null) => void;
};

const PeriodContext = createContext<PeriodContextValue | undefined>(undefined);

export function PeriodProvider({ children }: { children: ReactNode }) {
  const [year, setYear] = useState<number | null>(null);
  const [cycle, setCycle] = useState<number | null>(null);

  return (
    <PeriodContext.Provider value={{ year, cycle, setYear, setCycle }}>
      {children}
    </PeriodContext.Provider>
  );
}

export function usePeriod() {
  const ctx = useContext(PeriodContext);
  if (!ctx) throw new Error("usePeriod deve ser usado dentro de <PeriodProvider>");
  return ctx;
}