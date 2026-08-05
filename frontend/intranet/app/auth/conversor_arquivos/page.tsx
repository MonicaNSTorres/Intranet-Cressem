"use client";

import { FaExchangeAlt } from "react-icons/fa";
import BackButton from "@/components/back-button/back-button";
import { ConversorArquivosForm } from "@/components/conversor-arquivos-form/conversor-arquivos-form";

export default function ConversorArquivosPage() {
  return (
    <div className="p-5 lg:p-8">
      <BackButton />

      <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#C7D300] bg-[#C7D300] text-[#006f65] shadow-sm">
              <FaExchangeAlt size={18} />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-black text-slate-950">
                Conversor de Arquivos
              </h1>
              <p className="mt-1 max-w-3xl text-sm font-medium text-slate-600">
                Converta PDFs, DOCX e imagens nos formatos mais usados no dia a dia.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <ConversorArquivosForm />
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-medium text-slate-500 shadow-sm">
        * Os arquivos são enviados para a intranet-api e retornados em formato ZIP.
      </div>
    </div>
  );
}
