"use client";

import BackButton from "@/components/back-button/back-button";
import { FaChartLine } from "react-icons/fa";
import InvestmentSimulator from "@/components/investimento-simulador/InvestmentoSimulador";

export default function SimuladorInvestimentoPage() {
  return (
    <div className="p-6 lg:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <BackButton />
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-[#C7D300] border-[#C7D300] border flex items-center justify-center text-emerald-700">
              <FaChartLine size={16} />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold text-gray-900 truncate">
                Simulador de Investimento — Renda Fixa
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Simule rentabilidade em Poupança, RDC e LCI/LCA (com IR/IOF quando aplicável).
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <InvestmentSimulator />
      </div>

      <div className="mt-8 text-xs text-gray-500">
        * Índices carregados a partir do arquivo de indicadores (CDI/SELIC/Poupança) do Banco Central do Brasil.
      </div>
    </div>
  );
}