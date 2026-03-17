"use client";

import Link from "next/link";
import { FaArrowLeft, FaBaby, FaFilePdf } from "react-icons/fa";
import { AuxilioCrecheForm } from "@/components/auxilio-creche-form/auxilio-creche-form";
import BackButton from "@/components/back-button/back-button";

export default function AuxilioCrechePage() {
  return (
    <div className="p-6 lg:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <BackButton />
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-[#C7D300] border-[#C7D300] border flex items-center justify-center text-emerald-700">
              <FaBaby size={16} />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold text-gray-900 truncate">
                Auxílio Creche / Babá
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Preencha os dados, busque por CPF e gere o PDF para envio ao RH.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <AuxilioCrecheForm />
      </div>

      <div className="mt-8 text-xs text-gray-500">
        * Os dados do empregado(a) são carregados via intranet-api (consulta por CPF).
      </div>
    </div>
  );
}