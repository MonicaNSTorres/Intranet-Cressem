"use client";

import { FaFileSignature } from "react-icons/fa";
import BackButton from "@/components/back-button/back-button";
import { CadastroContratoForm } from "@/components/cadastro-contrato-form/cadastro-contrato-form";
import { Suspense } from "react";

export default function CadastroContratoPage() {
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
                Cadastro de Contrato de Empresas
              </h1>

              <p className="mt-1 text-sm text-gray-600">
                Cadastre ou altere contratos de empresas com tipos, sistema e e-mails de notificação.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <Suspense fallback={<div>Carregando...</div>}>
          <CadastroContratoForm />
        </Suspense>
      </div>

      <div className="mt-8 text-xs text-gray-500">
        * Ao editar, a lista de e-mails vinculada ao contrato será sincronizada automaticamente.
      </div>
    </div>
  );
}