"use client";

import { useEffect, useState } from "react";
import { FaFileCsv } from "react-icons/fa";
import BackButton from "@/components/back-button/back-button";
import { RelatorioConvenioOdontoForm } from "@/components/relatorio-convenio-odonto-form/relatorio-convenio-odonto-form";
import {
  canAccess,
  PAGE_ACCESS,
  type AuthUserLike,
} from "@/lib/access-control";
import { getMeAdUser } from "@/services/auth.service";

export default function RelatorioConvenioOdontoPage() {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    async function validarAcesso() {
      try {
        const user = (await getMeAdUser()) as AuthUserLike;

        setAllowed(canAccess(user, PAGE_ACCESS.relatorioConvenioOdonto));
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
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="mb-4">
            <BackButton />
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-third text-primary shadow-sm">
              <FaFileCsv size={20} />
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-2xl font-bold text-[var(--title)]">
                Relatórios de Convênio Odontológico
              </h1>

              <p className="mt-1 text-sm text-[var(--paragraph)]">
                Gere e baixe relatórios de contratantes, maior idade, custo e folha de pagamento.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <RelatorioConvenioOdontoForm />
      </div>

      <div className="mt-6 text-xs text-slate-500">
        * Os relatórios são baixados em formato CSV.
      </div>
    </main>
  );
}