"use client";

import { useEffect, useState } from "react";
import { FaFileAlt } from "react-icons/fa";
import BackButton from "@/components/back-button/back-button";
import { TermosMensaisCaixa } from "@/components/termos-mensais-caixa/termos-mensais-caixa";
import {
  canAccess,
  PAGE_ACCESS,
  type AuthUserLike,
} from "@/lib/access-control";
import { getMeAdUser } from "@/services/auth.service";

export default function TermosMensaisCaixaPage() {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    async function validarAcesso() {
      try {
        const user = (await getMeAdUser()) as AuthUserLike;

        setAllowed(canAccess(user, PAGE_ACCESS.termosMensaisCaixa));
      } catch (error) {
        console.error(error);
        setAllowed(false);
      } finally {
        setLoading(false);
      }
    }

    validarAcesso();
  }, []);

  if (loading) {
    return (
      <div className="p-6 text-sm text-gray-500">
        Carregando...
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Você não possui permissão para acessar esta tela.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <BackButton />

        <div className="mt-3 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#C7D300] bg-[#C7D300] text-emerald-700">
            <FaFileAlt size={15} />
          </div>

          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Termos Mensais Caixa
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Consulte, acompanhe e anexe os termos mensais assinados.
            </p>
          </div>
        </div>
      </div>

      <TermosMensaisCaixa />

      <div className="mt-8 text-xs text-gray-500">
        * Após gerar o PDF, imprima, colete as assinaturas e anexe o termo assinado na listagem.
      </div>
    </div>
  );
}