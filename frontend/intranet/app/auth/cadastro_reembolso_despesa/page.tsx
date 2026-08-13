"use client";

import { useEffect, useState } from "react";
import { FaMoneyBillWave } from "react-icons/fa";
import BackButton from "@/components/back-button/back-button";
import { CadastroReembolsoDespesaForm } from "@/components/cadastro-reembolso-despesa-form/cadastro-reembolso-despesa-form";
import {
  canAccess,
  PAGE_ACCESS,
  type AuthUserLike,
} from "@/lib/access-control";
import { getMeAdUser } from "@/services/auth.service";

export default function CadastroReembolsoDespesaPage() {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    async function validarAcesso() {
      try {
        const user = (await getMeAdUser()) as AuthUserLike;

        setAllowed(canAccess(user, PAGE_ACCESS.cadastroReembolsoDespesa));
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
      <div className="mb-4">
        <BackButton />
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#C7D300] text-[#007E7A] shadow-sm">
            <FaMoneyBillWave size={18} />
          </div>

          <div className="min-w-0">
            <h1 className="truncate text-2xl font-black text-slate-950">
              Reembolso de Despesas
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Preencha os dados da solicitação, adicione as despesas e envie para análise.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <CadastroReembolsoDespesaForm />
      </div>

      <div className="mt-8 text-xs text-slate-500">
        * Os dados do funcionário, cidades, tipos de despesa e solicitação em edição serão carregados via intranet-api.
      </div>
    </div>
  );
}
