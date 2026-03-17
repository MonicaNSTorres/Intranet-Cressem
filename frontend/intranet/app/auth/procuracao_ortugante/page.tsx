"use client";

import { FaFileSignature } from "react-icons/fa";
import BackButton from "@/components/back-button/back-button";
import { ProcuracaoOutorganteForm } from "@/components/procuracao-outorgante-form/procuracao-outorgante-form";

export default function ProcuracaoOutorgantePage() {
  return (
    <div className="p-6 lg:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <BackButton />
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-[#C7D300] border-[#C7D300] border flex items-center justify-center text-emerald-700">
              <FaFileSignature size={16} />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold text-gray-900 truncate">
                Procuração — Outorgante
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Busque o outorgante (PF) por CPF, preencha os dados e gere o PDF (PF ou PJ).
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <ProcuracaoOutorganteForm />
      </div>

      <div className="mt-8 text-xs text-gray-500">
        * Dados do outorgante PF são carregados via intranet-api (consulta por CPF) quando disponíveis.
      </div>
    </div>
  );
}