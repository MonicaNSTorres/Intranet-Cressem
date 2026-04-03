"use client";

import { FaPercent } from "react-icons/fa";
import BackButton from "@/components/back-button/back-button";
import { SimuladorDescontoForm } from "@/components/simulador-desconto-form/simulador-desconto-form";

export default function SimuladorDescontoPage() {
  return (
    <div className="p-6 lg:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <BackButton />
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl border border-[#C7D300] bg-[#C7D300] flex items-center justify-center text-emerald-700">
              <FaPercent size={16} />
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-2xl font-semibold text-gray-900">
                Simulador de Desconto
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Busque o associado, preencha os dados da simulação e gere o PDF.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <SimuladorDescontoForm />
      </div>

      <div className="mt-8 text-xs text-gray-500">
        * Os dados do associado e os parâmetros da simulação são carregados pela intranet-api.
      </div>
    </div>
  );
}