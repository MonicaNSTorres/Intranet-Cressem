"use client";

import { FaTint } from "react-icons/fa";
import BackButton from "@/components/back-button/back-button";
import { MarcaDaguaForm } from "@/components/marca-dagua-form/marca-dagua-form";

export default function MarcaDaguaPage() {
  return (
    <div className="p-6 lg:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <BackButton />
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#C7D300] bg-[#C7D300] text-emerald-700">
              <FaTint size={16} />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-semibold text-gray-900">
                Marca d&apos;água
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Selecione um arquivo PDF e aplique a marca d&apos;água para baixar o documento processado.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <MarcaDaguaForm />
      </div>

      <div className="mt-8 text-xs text-gray-500">
        * O processamento é feito pelo backend e o download do PDF com marca d&apos;água começa automaticamente ao concluir.
      </div>
    </div>
  );
}