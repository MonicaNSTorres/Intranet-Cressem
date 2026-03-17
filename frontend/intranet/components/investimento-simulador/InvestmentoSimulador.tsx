"use client";

import { useEffect, useMemo, useState } from "react";
import InvestmentInput from "./InvestmentInput";
import InvestmentSimulation from "./InvestmentSimulation";

export type PeriodType = "dias" | "meses" | "anos";

export type InvestmentState = {
  amount: number;
  cdb: number;
  lcx: number;
  di: number | null;
  selic: number | null;
  poupanca: number | null;
  period: number;
  periodType: PeriodType;
};

type IndicadoresJson = {
  cdi: { value: number };
  selic: { value: number };
  poupanca: { value: number };
};

export default function InvestmentSimulator() {
  const [investment, setInvestment] = useState<InvestmentState>({
    amount: 1000,
    cdb: 100,
    lcx: 100,
    di: null,
    selic: null,
    poupanca: null,
    period: 360,
    periodType: "dias",
  });

  const [loadingIndexes, setLoadingIndexes] = useState(true);
  const [indexesError, setIndexesError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoadingIndexes(true);
      setIndexesError(null);

      try {
        const res = await fetch("/indicadores.json", { cache: "no-store" });
        const json = (await res.json()) as IndicadoresJson;

        if (!mounted) return;

        setInvestment((prev) => ({
          ...prev,
          di: json?.cdi?.value ?? prev.di,
          selic: json?.selic?.value ?? prev.selic,
          poupanca: json?.poupanca?.value ?? prev.poupanca,
        }));
      } catch (e: any) {
        if (!mounted) return;
        setIndexesError(e?.message || "Falha ao carregar indicadores.");
      } finally {
        if (!mounted) return;
        setLoadingIndexes(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const canSimulate = useMemo(() => {
    return investment.poupanca != null && investment.di != null;
  }, [investment.poupanca, investment.di]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-4">
        <InvestmentInput
          value={investment}
          onChange={setInvestment}
          loadingIndexes={loadingIndexes}
          indexesError={indexesError}
        />
      </div>

      <div className="lg:col-span-8">
        <InvestmentSimulation investment={investment} canSimulate={canSimulate} />
      </div>
    </div>
  );
}