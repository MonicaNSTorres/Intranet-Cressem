"use client";

import { FaFileSignature } from "react-icons/fa";
import BackButton from "@/components/back-button/back-button";
import { AdendoContratualForm } from "@/components/adendo-contratual-form/adendo-contratual-form";

export default function AdendoContratualPage() {
  return (
    <div className="p-6 lg:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <BackButton />
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-[#C7D300] border-[#C7D300] border flex items-center justify-center text-emerald-700">
              <FaFileSignature size={16} />
            </div>

            <div className="min-w-0">
              <h1 className="text-2xl font-semibold text-gray-900 truncate">
                Adendo Contratual
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Preencha os dados, busque por CPF e gere o PDF do adendo contratual.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <AdendoContratualForm />
      </div>

      <div className="mt-8 text-xs text-gray-500">
        * Os dados do associado e do cônjuge podem ser carregados via consulta por CPF.
      </div>
    </div>
  );
}