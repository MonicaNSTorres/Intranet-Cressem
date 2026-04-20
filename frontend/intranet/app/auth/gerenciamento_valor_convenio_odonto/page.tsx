"use client";

import { FaMoneyCheckAlt } from "react-icons/fa";
import BackButton from "@/components/back-button/back-button";
import { GestaoValorConvenioForm } from "@/components/gestao-valor-convenio-form/gestao-valor-convenio-form";

export default function GestaoValorConvenioPage() {
  return (
    <div className="p-6 lg:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <BackButton />

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#C7D300] bg-[#C7D300] text-emerald-700">
              <FaMoneyCheckAlt size={16} />
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-2xl font-semibold text-gray-900">
                Gestão Valor de Convênio
              </h1>

              <p className="mt-1 text-sm text-gray-600">
                Consulte os planos cadastrados e atualize valor e vigência dos convênios odontológicos.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <GestaoValorConvenioForm />
      </div>

      <div className="mt-8 text-xs text-gray-500">
        * As alterações de valor e vigência impactam os convênios odontológicos vinculados aos planos.
      </div>
    </div>
  );
}