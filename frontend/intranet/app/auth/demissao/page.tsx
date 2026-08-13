"use client";

import { FaUserTimes } from "react-icons/fa";
import BackButton from "@/components/back-button/back-button";
import { DemissaoForm } from "@/components/demissao-form/demissao-form";

export default function DemissaoPage() {
  return (
    <div className="p-6 lg:p-8">
      <BackButton />

      <div className="mt-4 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-third text-primary shadow-sm">
          <FaUserTimes size={16} />
        </div>

        <div className="min-w-0">
          <h1 className="truncate text-2xl font-black text-title">
            Formulário de Demissão
          </h1>
          <p className="mt-1 text-sm font-medium text-paragraph">
            Preencha os dados do associado, calcule os valores e gere o PDF.
          </p>
        </div>
      </div>

      <div className="mt-6">
        <DemissaoForm />
      </div>
    </div>
  );
}
