"use client";

import { FaBullhorn } from "react-icons/fa";
import BackButton from "@/components/back-button/back-button";
import { SolicitacaoParticipacaoForm } from "@/components/solicitacao-participacao-form/solicitacao-participacao-form";

export default function SolicitacaoParticipacaoPage() {
  return (
    <div className="p-5 lg:p-8">
      <BackButton />
      <div className="mt-4 flex items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#C7D300] bg-[#C7D300] text-[#006f65] shadow-sm">
          <FaBullhorn size={18} />
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-black text-slate-950">
            Solicitação de Participação de Marketing
          </h1>
          <p className="mt-1 max-w-3xl text-sm font-medium text-slate-600">
            Preencha a solicitação, anexe os documentos e envie para aprovação.
          </p>
        </div>
      </div>

      <div className="mt-6">
        <SolicitacaoParticipacaoForm />
      </div>

      <div className="mt-8 text-xs font-medium text-slate-500">
        * Os dados são enviados para a intranet-api com upload de arquivos e agenda do evento.
      </div>
    </div>
  );
}
