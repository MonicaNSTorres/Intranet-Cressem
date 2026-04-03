"use client";

import { FaFileSignature } from "react-icons/fa";
import { TermoGarantiaForm } from "@/components/termo-garantia-form/termo-garantia-form";
import BackButton from "@/components/back-button/back-button";

export default function TermoGarantiaPage() {
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
                Termo de opção de garantia
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Preencha os dados do associado, selecione as garantias e gere o
                termo para impressão.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <TermoGarantiaForm />
      </div>

      <div className="mt-8 text-xs text-gray-500">
        * Os dados do associado são carregados via intranet-api pela consulta de
        CPF.
      </div>
    </div>
  );
}