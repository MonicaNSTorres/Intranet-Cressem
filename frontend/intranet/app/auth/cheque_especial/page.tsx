"use client";

import { useEffect, useState } from "react";
import { FaMoneyCheckAlt } from "react-icons/fa";
import { ChequeEspecialForm } from "@/components/cheque-especial-form/cheque-especial-form";
import BackButton from "@/components/back-button/back-button";
import {
  canAccess,
  PAGE_ACCESS,
  type AuthUserLike,
} from "@/lib/access-control";
import { getMeAdUser } from "@/services/auth.service";

export default function ChequeEspecialPage() {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    async function validarAcesso() {
      try {
        const user = (await getMeAdUser()) as AuthUserLike;

        setAllowed(canAccess(user, PAGE_ACCESS.chequeEspecial));
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
    return <div className="p-6 text-sm font-medium text-slate-500">Carregando...</div>;
  }

  if (!allowed) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700 shadow-sm">
          Você não possui permissão para acessar esta tela.
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 lg:p-8">
      <div className="mb-4">
        <BackButton />
      </div>

      <div className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#C7D300] bg-[#C7D300] text-[#006f65] shadow-sm">
              <FaMoneyCheckAlt size={18} />
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-2xl font-black text-slate-950">
                Alteração Benefício Cheque Especial
              </h1>
              <p className="mt-1 max-w-3xl text-sm font-medium text-slate-600">
                Visualize, pesquise e registre as alterações do benefício de cheque especial dos cooperados.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <ChequeEspecialForm />
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-medium text-slate-500 shadow-sm">
        * O sistema permite acompanhar quem teve o benefício concedido ou retirado, com atualização mensal no dia 15.
      </div>
    </div>
  );
}
