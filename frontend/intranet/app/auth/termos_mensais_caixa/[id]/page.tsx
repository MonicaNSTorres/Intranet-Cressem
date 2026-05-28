"use client";

import { useParams } from "next/navigation";
import { FaEdit } from "react-icons/fa";
import BackButton from "@/components/back-button/back-button";
import { TermoMensalCaixaForm } from "@/components/termos-mensais-caixa/termo-mensal-caixa-form";

export default function EditarTermoMensalCaixaPage() {
  const params = useParams();
  const id = Number(params.id);

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <BackButton />

        <div className="mt-3 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#C7D300] bg-[#C7D300] text-emerald-700">
            <FaEdit size={15} />
          </div>

          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Editar Conferência de Caixa
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Edite os dados do termo mensal, salve as alterações e gere o PDF.
            </p>
          </div>
        </div>
      </div>

      <TermoMensalCaixaForm id={id} />

      <div className="mt-8 text-xs text-gray-500">
        * Após gerar o PDF, imprima, colete as assinaturas e anexe o termo assinado na listagem.
      </div>
    </div>
  );
}