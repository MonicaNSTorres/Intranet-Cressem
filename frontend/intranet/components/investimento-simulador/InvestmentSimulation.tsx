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
    <div className="bg-white rounded-2xl shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900">Simulação</h2>
      <p className="text-sm text-gray-600 mt-1">
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