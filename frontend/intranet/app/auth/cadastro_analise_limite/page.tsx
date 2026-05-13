"use client";

import { useEffect, useState } from "react";
import { FaChartLine } from "react-icons/fa";
import BackButton from "@/components/back-button/back-button";
import { AnaliseLimiteForm } from "@/components/analise-limite-form/analise-limite-form";
import {
  canAccess,
  PAGE_ACCESS,
  type AuthUserLike,
} from "@/lib/access-control";
import { getMeAdUser } from "@/services/auth.service";

export default function CadastroAnaliseLimitePage() {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    async function validarAcesso() {
      try {
        const user = (await getMeAdUser()) as AuthUserLike;

        setAllowed(canAccess(user, PAGE_ACCESS.cadastroAnaliseLimite));
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

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">

          <BackButton />

          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-[#C7D300] border border-[#C7D300] flex items-center justify-center text-emerald-700">
              <FaChartLine size={16} />
            </div>

            <div className="min-w-0">
              <h1 className="text-2xl font-semibold text-gray-900 truncate">
                Análise de Concessão de Limites
              </h1>

              <p className="text-sm text-gray-600 mt-1">
                Preencha os dados da análise de limite de cheque especial e cartão.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <AnaliseLimiteForm />
      </div>

      <div className="mt-8 text-xs text-gray-500">
        * Os dados do associado são carregados automaticamente via consulta por CPF.
      </div>
    </div>
  );
}