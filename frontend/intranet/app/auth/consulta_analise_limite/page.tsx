"use client";

import { FaSearch } from "react-icons/fa";
import BackButton from "@/components/back-button/back-button";
import { ConsultaAnaliseLimiteForm } from "@/components/consulta-analise-limite-form/consulta-analise-limite-form";

export default function ConsultaAnaliseLimitePage() {
  return (
    <div className="p-6 lg:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <BackButton />

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#C7D300] bg-[#C7D300] text-emerald-700">
              <FaSearch size={16} />
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-2xl font-semibold text-gray-900">
                Consulta de Análise de Novos Limites
              </h1>

              <p className="mt-1 text-sm text-gray-600">
                Consulte, visualize detalhes, imprima e gerencie assinaturas das análises cadastradas.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <ConsultaAnaliseLimiteForm />
      </div>

      <div className="mt-8 text-xs text-gray-500">
        * Utilize os filtros para localizar análises por nome, CPF/CNPJ, funcionário ou data.
      </div>
    </div>
  );
}