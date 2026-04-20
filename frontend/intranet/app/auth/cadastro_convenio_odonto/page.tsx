"use client";

import { FaTooth } from "react-icons/fa";
import BackButton from "@/components/back-button/back-button";
import { CadastroConvenioOdontoForm } from "@/components/cadastro-convenio-odonto-form/cadastro-convenio-odonto-form";

export default function CadastroConvenioOdontoPage() {
  return (
    <div className="p-6 lg:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <BackButton />

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#C7D300] bg-[#C7D300] text-emerald-700">
              <FaTooth size={16} />
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-2xl font-semibold text-gray-900">
                Cadastro de Convênio Odontológico
              </h1>

              <p className="mt-1 text-sm text-gray-600">
                Consulte o titular por CPF, selecione o convênio, plano e gerencie os dependentes.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <CadastroConvenioOdontoForm />
      </div>

      <div className="mt-8 text-xs text-gray-500">
        * Os dados do titular podem ser carregados automaticamente via consulta por CPF.
      </div>
    </div>
  );
}