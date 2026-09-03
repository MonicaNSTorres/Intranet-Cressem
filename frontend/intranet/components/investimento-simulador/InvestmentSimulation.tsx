"use client";

import { computedDurationDays } from "./helpers";
import type { InvestmentState } from "./InvestmentoSimulador";
import InvestmentResult from "./InvestmentResult";
import { getCDBResult } from "@/lib/investment/cdb";
import { getLcxResult } from "@/lib/investment/lcx";
import { getPoupancaResult } from "@/lib/investment/poupanca";

export default function InvestmentSimulation(props: {
  investment: InvestmentState;
  canSimulate: boolean;
}) {
  const { investment, canSimulate } = props;

  const days = computedDurationDays(investment.period, investment.periodType);

  const resultCDB =
    investment.di == null
      ? null
      : getCDBResult(investment.amount, investment.di, investment.cdb, days);

  const resultLCX =
    investment.di == null
      ? null
      : getLcxResult(investment.amount, investment.di, investment.lcx, days);

  const resultPoupanca =
    investment.poupanca == null
      ? null
      : getPoupancaResult(investment.amount, investment.poupanca, days);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-slate-800 before:h-2 before:w-2 before:rounded-full before:bg-[#00AE9D]">
        Simulação
      </h2>
      <p className="mt-1 text-sm font-medium text-slate-600">
        Simulação da rentabilidade do seu investimento conforme o tipo de aplicação.
      </p>

      <div className="mt-5 space-y-3">
        <InvestmentResult
          name="Poupança"
          amount={investment.amount}
          interestAmount={resultPoupanca?.interestAmount}
          loading={!canSimulate || !investment.poupanca}
        />

        <InvestmentResult
          name="RDC"
          amount={investment.amount}
          interestAmount={resultCDB?.interestAmount}
          taxAmount={resultCDB?.taxAmount}
          taxPercentage={resultCDB?.taxPercentage}
          iofAmount={resultCDB?.iofAmount}
          loading={!canSimulate || !investment.di}
        />

        <InvestmentResult
          name="LCI / LCA"
          amount={investment.amount}
          interestAmount={resultLCX?.interestAmount}
          loading={!canSimulate || !investment.di}
        />
      </div>
    </div>
  );
}