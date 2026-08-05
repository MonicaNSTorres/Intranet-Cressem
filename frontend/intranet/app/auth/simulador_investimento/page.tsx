"use client";

import BackButton from "@/components/back-button/back-button";
import { FaChartLine } from "react-icons/fa";
import InvestmentSimulator from "@/components/investimento-simulador/InvestmentoSimulador";

export default function SimuladorInvestimentoPage() {
  return (
    <div className="p-6 lg:p-8">
      <div className="mb-4">
        <BackButton />
      </div>

      <div className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#C7D300] bg-[#C7D300] text-[#006f65] shadow-sm">
              <FaChartLine size={16} />
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-2xl font-black text-slate-950">
                Simulador de Investimento - Renda Fixa
              </h1>
              <p className="mt-1 text-sm font-medium text-slate-600">
                Simule rentabilidade em Poupança, RDC e LCI/LCA (com IR/IOF quando aplicável).
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <InvestmentSimulator />
      </div>

      <div className="mt-5 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-medium text-slate-500 shadow-sm">
        * Índices carregados a partir do arquivo de indicadores (CDI/SELIC/Poupança) do Banco Central do Brasil.
      </div>
    </div>
  );
}
