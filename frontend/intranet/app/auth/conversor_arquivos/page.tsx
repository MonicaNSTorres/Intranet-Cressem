"use client";

import { FaExchangeAlt } from "react-icons/fa";
import BackButton from "@/components/back-button/back-button";
import { ConversorArquivosForm } from "@/components/conversor-arquivos-form/conversor-arquivos-form";

export default function ConversorArquivosPage() {
  return (
    <div className="p-6 lg:p-8">

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">

        <div className="min-w-0">

          <BackButton />

          <div className="flex items-center gap-3">

            <div className="h-10 w-10 rounded-2xl bg-[#C7D300] border-[#C7D300] border flex items-center justify-center text-emerald-700">
              <FaExchangeAlt size={16} />
            </div>

            <div className="min-w-0">
              <h1 className="text-2xl font-semibold text-gray-900 truncate">
                Conversor de Arquivos
              </h1>

              <p className="text-sm text-gray-600 mt-1">
                Converta arquivos PDF para PDF/A ou imagem e faça download em ZIP.
              </p>
            </div>

          </div>

        </div>

      </div>

      <div className="mt-6">
        <ConversorArquivosForm />
      </div>

      <div className="mt-8 text-xs text-gray-500">
        * Os arquivos são enviados para a intranet-api e retornados em formato ZIP.
      </div>

    </div>
  );
}