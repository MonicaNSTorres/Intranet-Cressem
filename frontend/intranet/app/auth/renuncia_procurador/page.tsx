"use client";

import { FaUserSlash } from "react-icons/fa";
import { RenunciaProcuradorForm } from "@/components/renuncia-procurador-form/renuncia-procurador-form";
import BackButton from "@/components/back-button/back-button";

export default function RenunciaProcuradorPage() {
  return (
    <div className="p-6 lg:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <BackButton />

          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-[#C7D300] border-[#C7D300] border flex items-center justify-center text-emerald-700">
              <FaUserSlash size={16} />
            </div>

            <div className="min-w-0">
              <h1 className="text-2xl font-semibold text-gray-900 truncate">
                Renúncia de Procurador(a)
              </h1>

              <p className="text-sm text-gray-600 mt-1">
                Busque o procurador pelo CPF, preencha os dados necessários e gere o PDF da renúncia.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <RenunciaProcuradorForm />
      </div>

      <div className="mt-8 text-xs text-gray-500">
        * Os dados do procurador são carregados via intranet-api (consulta por CPF).
      </div>
    </div>
  );
}