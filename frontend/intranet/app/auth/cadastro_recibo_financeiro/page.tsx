"use client";

import { FaMoneyBillWave } from "react-icons/fa";
import BackButton from "@/components/back-button/back-button";
import { CadastroReciboFinanceiroForm } from "@/components/cadastro-recibo-financeiro-form/cadastro-recibo-financeiro-form";
import { Suspense } from "react";

export default function CadastroReciboFinanceiroPage() {
  return (
    <div className="p-6 lg:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <BackButton />

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#C7D300] bg-[#C7D300] text-emerald-700">
              <FaMoneyBillWave size={16} />
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-2xl font-semibold text-gray-900">
                Cadastro de Recibo Financeiro
              </h1>

              <p className="mt-1 text-sm text-gray-600">
                Cadastre, edite e imprima recibos financeiros com parcelas e formas de pagamento.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <Suspense fallback={<div>Carregando...</div>}>
          <CadastroReciboFinanceiroForm />
        </Suspense>
      </div>

      <div className="mt-8 text-xs text-gray-500">
        * Utilize os dados do associado, parcelas e pagamentos para gerar o recibo.
      </div>
    </div>
  );
}