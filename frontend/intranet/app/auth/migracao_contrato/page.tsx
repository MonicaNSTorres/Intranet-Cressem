"use client";

import { useEffect, useState } from "react";
import { FaExchangeAlt } from "react-icons/fa";
import BackButton from "@/components/back-button/back-button";
import { MigracaoContratoForm } from "@/components/migracao-contrato-form/migracao-contrato-form";
import {
  canAccess,
  PAGE_ACCESS,
  type AuthUserLike,
} from "@/lib/access-control";
import { getMeAdUser } from "@/services/auth.service";

export default function MigracaoContratoPage() {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    async function validarAcesso() {
      try {
        const user = (await getMeAdUser()) as AuthUserLike;
        setAllowed(canAccess(user, PAGE_ACCESS.migracaoContrato));
      } catch (error) {
        console.error(error);
        setAllowed(false);
      } finally {
        setLoading(false);
      }
    }

    void validarAcesso();
  }, []);

  if (loading) {
    return (
      <div className="w-full p-6 lg:p-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm">
          Carregando...
        </div>
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="w-full p-6 lg:p-8">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
          Você não possui permissão para acessar esta tela.
        </div>
      </div>
    );
  }

  return (
    <main className="w-full p-6 lg:p-8">
      <div className="mb-6">
        <div className="mb-4">
          <BackButton />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-third text-primary shadow-sm">
            <FaExchangeAlt size={22} />
          </div>

          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-[var(--title)]">
              Migração de Contrato
            </h1>
            <p className="mt-1 text-sm text-[var(--paragraph)]">
              Busque o associado por CPF, revise os dados e gere o arquivo de migração.
            </p>
          </div>
        </div>
      </div>

      <MigracaoContratoForm />

      <p className="mt-6 text-xs text-slate-500">
        * Os dados do associado(a) são carregados via intranet-api pela consulta de CPF.
      </p>
    </main>
  );
}
