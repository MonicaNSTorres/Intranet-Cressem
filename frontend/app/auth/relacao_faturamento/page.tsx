"use client";

import { FaBuilding } from "react-icons/fa";
import { FaturamentoFormPJ } from "@/components/faturamento-form/faturamento-form";
import BackButton from "@/components/back-button/back-button";

export default function RelacaoFaturamentoPage() {
  return (
    <div className="p-6 lg:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <BackButton />
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#C7D300] bg-[#C7D300] text-emerald-700">
              <FaBuilding size={16} />
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-2xl font-semibold text-gray-900">
                Declaração de Faturamento Pessoa Jurídica
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Preencha os dados da empresa, informe o faturamento dos últimos 12
                meses, distribua os percentuais de recebimento e gere o PDF final
                com os cálculos automáticos já consolidados.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <FaturamentoFormPJ />
      </div>

      <div className="mt-8 text-xs text-gray-500">
        * O sistema permite acompanhar quem teve o benefício concedido ou retirado, com atualização mensal no dia 15.
      </div>
    </div>
  );
}