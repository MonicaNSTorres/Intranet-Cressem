"use client";

import { FaFileSignature } from "react-icons/fa";
import BackButton from "@/components/back-button/back-button";
import { DeclaracaoPresencaEmprestimoForm } from "@/components/declaracao-presenca-emprestimo-form/declaracao-presenca-emprestimo-form";

export default function DeclaracaoPresencaEmprestimoPage() {
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
                Declaração de Presença
              </h1>

              <p className="text-sm text-gray-600 mt-1">
                Preencha os dados obrigatórios e gere o PDF da declaração.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <DeclaracaoPresencaEmprestimoForm />
      </div>
    </div>
  );
}