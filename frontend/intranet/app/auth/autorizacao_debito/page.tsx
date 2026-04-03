"use client";

import { FaFileInvoiceDollar } from "react-icons/fa";
import BackButton from "@/components/back-button/back-button";
import { AutorizacaoDebitoForm } from "@/components/autorizacao-debito-form/autorizacao-debito-form";

export default function AutorizacaoDebitoPage() {
  return (
    <div className="p-6 lg:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <BackButton />
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#C7D300] bg-[#C7D300] text-emerald-700">
              <FaFileInvoiceDollar size={16} />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-semibold text-gray-900">
                Autorização de Débito
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Preencha os dados do associado, informe os débitos e gere o PDF
                da autorização.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <AutorizacaoDebitoForm />
      </div>

      <div className="mt-8 text-xs text-gray-500">
        * Os dados do associado são carregados via intranet-api pela consulta de CPF.
      </div>
    </div>
  );
}