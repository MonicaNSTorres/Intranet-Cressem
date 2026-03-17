"use client";

import { FaSignature } from "react-icons/fa";
import BackButton from "@/components/back-button/back-button";
import { AssinaturaEmailForm } from "@/components/assinatura-email-form/assinatura-email-form";

export default function AssinaturaEmailPage() {
  return (
    <div className="p-6 lg:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <BackButton />

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#C7D300] bg-[#C7D300] text-emerald-700">
              <FaSignature size={16} />
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-2xl font-semibold text-gray-900">
                Gerador de Assinatura de Email
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Informe o nome, selecione as certificações e gere a assinatura para baixar em imagem.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <AssinaturaEmailForm />
      </div>

      <div className="mt-8 text-xs text-gray-500">
        * As imagens devem estar em <strong>/public/assinatura-email</strong>.
      </div>
    </div>
  );
}