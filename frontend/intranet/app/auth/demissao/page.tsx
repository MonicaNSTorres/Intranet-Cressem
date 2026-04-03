"use client";

import { FaUserTimes } from "react-icons/fa";
import BackButton from "@/components/back-button/back-button";
import { DemissaoForm } from "@/components/demissao-form/demissao-form";

export default function DemissaoPage() {
  return (
    <div className="p-6 lg:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <BackButton />

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#C7D300] bg-[#C7D300] text-emerald-700 shadow">
              <FaUserTimes size={16} />
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-2xl font-semibold text-gray-900">
                Formulário de Demissão
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Preencha os dados do associado, calcule os valores e gere o PDF.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <DemissaoForm />
      </div>
    </div>
  );
}