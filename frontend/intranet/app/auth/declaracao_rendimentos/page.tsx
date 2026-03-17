"use client";

import { FaFileInvoiceDollar } from "react-icons/fa";
import BackButton from "@/components/back-button/back-button";
import { DeclaracaoRendimentosForm } from "@/components/declaracao-rendimentos-form/declaracao-rendimentos-form";

export default function DeclaracaoRendimentosPage() {
  return (
    <div className="p-6 lg:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <BackButton />
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-[#C7D300] border-[#C7D300] border flex items-center justify-center text-emerald-700">
              <FaFileInvoiceDollar size={16} />
            </div>

            <div className="min-w-0">
              <h1 className="text-2xl font-semibold text-gray-900 truncate">
                Declaração de Rendimentos
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Busque por CPF para preencher os dados do associado e gere o PDF.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <DeclaracaoRendimentosForm />
      </div>

      <div className="mt-8 text-xs text-gray-500">
        * Os dados do empregado(a) são carregados via intranet-api (consulta por CPF).
      </div>
    </div>
  );
}