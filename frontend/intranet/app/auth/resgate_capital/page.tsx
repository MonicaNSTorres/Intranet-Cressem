"use client";

import { FaFileInvoiceDollar } from "react-icons/fa";
import BackButton from "@/components/back-button/back-button";
import { ResgateCapitalForm } from "@/components/resgate-capital-form/resgate-capital-form";

export default function ResgateCapitalPage() {
  return (
    <div className="p-6 lg:p-8">
      <BackButton />

      <div className="mt-4 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-third text-primary shadow-sm">
          <FaFileInvoiceDollar size={16} />
        </div>

        <div className="min-w-0">
          <h1 className="truncate text-2xl font-black text-title">
            Resgate Parcial de Capital
          </h1>
          <p className="mt-1 text-sm font-medium text-paragraph">
            Preencha os dados, busque por CPF/CNPJ, calcule os valores e gere a impressão do formulário.
          </p>
        </div>
      </div>

      <div className="mt-6">
        <ResgateCapitalForm />
      </div>

      <div className="mt-5 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-medium text-slate-500 shadow-sm">
        * Os dados do associado(a) são carregados via intranet-api pela consulta de CPF/CNPJ.
      </div>
    </div>
  );
}
