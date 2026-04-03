"use client";

import { FaClipboardList } from "react-icons/fa";
import BackButton from "@/components/back-button/back-button";
import { GerenciamentoParticipacaoForm } from "@/components/gerenciamento-participacao-form/gerenciamento-participacao-form";

export default function GerenciamentoParticipacaoPage() {
  return (
    <div className="p-6 lg:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <BackButton />
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-[#C7D300] border-[#C7D300] border flex items-center justify-center text-emerald-700">
              <FaClipboardList size={16} />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold text-gray-900 truncate">
                Gerenciamento de Participação de Marketing
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Consulte, acompanhe e atualize o andamento das solicitações de participação.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <GerenciamentoParticipacaoForm />
      </div>
    </div>
  );
}