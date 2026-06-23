"use client";

import { FaTrophy } from "react-icons/fa";
import BackButton from "@/components/back-button/back-button";
import { LeiloesFinalizadosLista } from "@/components/leiloes-finalizados/leiloes-finalizados";

export default function LeiloesFinalizadosPage() {
  return (
    <div className="p-6 lg:p-8">
      <BackButton />

      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#C7D300] bg-[#C7D300] text-emerald-700">
          <FaTrophy size={18} />
        </div>

        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Leilões encerrados
          </h1>

          <p className="text-sm text-slate-600">
            Consulte os produtos finalizados, vencedores e valores arrematados.
          </p>
        </div>
      </div>

      <LeiloesFinalizadosLista />
    </div>
  );
}