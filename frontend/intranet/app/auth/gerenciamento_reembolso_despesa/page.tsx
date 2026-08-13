"use client";

import { FaListAlt } from "react-icons/fa";
import BackButton from "@/components/back-button/back-button";
import { GerenciamentoReembolsoDespesaForm } from "@/components/gerenciamento-reembolso-despesa-form/gerenciamento-reembolso-despesa-form";

export default function GerenciamentoReembolsoDespesaPage() {
  return (
    <div className="p-6 lg:p-8">
      <BackButton />

      <div className="mt-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#C7D300] text-[#007E7A] shadow-sm">
              <FaListAlt size={18} />
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-2xl font-black text-slate-950">
                Gerenciamento de Reembolso de Despesas
              </h1>

              <p className="mt-1 text-sm text-slate-600">
                Consulte, acompanhe, analise e conclua solicitações de reembolso.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <GerenciamentoReembolsoDespesaForm />
      </div>

      <div className="mt-8 text-xs text-slate-500">
        * Os dados da listagem, pareceres e andamento serão carregados via intranet-api.
      </div>
    </div>
  );
}
