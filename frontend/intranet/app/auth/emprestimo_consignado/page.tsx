"use client";

import { FaFileInvoiceDollar } from "react-icons/fa";
import BackButton from "@/components/back-button/back-button";
import ThemeToggle from "@/components/dark-mode/dark-mode";
import { EmprestimoConsignadoForm } from "@/components/emprestimo-consignado-form/emprestimo-consignado-form";

export default function EmprestimoConsignadoPage() {
  return (
    <div className="p-6 lg:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <BackButton />
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-[#C7D300] border-[#C7D300] border flex items-center justify-center text-emerald-700">
              <FaFileInvoiceDollar size={16} />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold text-gray-900 truncate dark:text-gray-100">
                Empréstimo Consignado — Crédito do Trabalhador
              </h1>
              <p className="text-sm text-gray-600 mt-1 dark:text-gray-300">
                Compara a lista do DataPrev com a base local (Empresas.xlsx/Empresas.csv) e exibe as empresas habilitadas.
              </p>
            </div>
          </div>
        </div>

        {/*<div className="flex items-center gap-2">
          <ThemeToggle />
        </div>*/}
      </div>

      <div className="mt-6">
        <EmprestimoConsignadoForm />
      </div>

      <div className="mt-8 text-xs text-gray-500 dark:text-gray-400">
        * Esta tela consulta o endpoint <code className="font-mono">/api/check-updates</code>, que lê as planilhas locais e compara com a lista do GOV.
      </div>
    </div>
  );
}