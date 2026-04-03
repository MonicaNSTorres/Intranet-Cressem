"use client";

import { FaProjectDiagram } from "react-icons/fa";
import BackButton from "@/components/back-button/back-button";
import { GerenciamentoPosicaoForm } from "@/components/gerenciamento-posicao-form/gerenciamento-posicao-form";

export default function GerenciamentoPosicaoPage() {
  return (
    <div className="p-6 lg:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <BackButton />
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#C7D300] bg-[#C7D300] text-emerald-700">
              <FaProjectDiagram size={16} />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-semibold text-gray-900">
                Gerenciamento de Posição
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Consulte, cadastre, edite e altere o status das posições cadastradas.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <GerenciamentoPosicaoForm />
      </div>

      <div className="mt-8 text-xs text-gray-500">
        * Os dados são carregados via intranet-api com paginação e exportação de relatório.
      </div>
    </div>
  );
}