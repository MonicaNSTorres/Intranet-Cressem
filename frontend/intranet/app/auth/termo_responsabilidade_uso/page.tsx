"use client";

import { FaFileSignature } from "react-icons/fa";
import BackButton from "@/components/back-button/back-button";
import { TermoResponsabilidadeUsoForm } from "@/components/termo-responsabilidade-uso-form/termo-responsabilidade-uso-form";

export default function TermoResponsabilidadeUsoPage() {
  return (
    <div className="p-6 lg:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <BackButton />
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#C7D300] bg-[#C7D300] text-emerald-700">
              <FaFileSignature size={16} />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-semibold text-gray-900">
                Termo de Responsabilidade Uso de Equipamento
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Gere o termo de responsabilidade para entrega de equipamentos de TI.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <TermoResponsabilidadeUsoForm />
      </div>

      <div className="mt-8 text-xs text-gray-500">
        * O colaborador pode ser localizado automaticamente pelo CPF via intranet-api.
      </div>
    </div>
  );
}