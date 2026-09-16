"use client";

import { useEffect, useState } from "react";
import { FaFileAlt } from "react-icons/fa";
import BackButton from "@/components/back-button/back-button";
import RelatorioConvenioOdontologico from "@/components/relatorio-convenio-odontologico/relatorio-convenio-odontologico";
import {
  canAccess,
  PAGE_ACCESS,
  type AuthUserLike,
} from "@/lib/access-control";
import { getMeAdUser } from "@/services/auth.service";

export default function RelatoriosConvenioOdontologicoPage() {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    async function validarAcesso() {
      try {
        const user = (await getMeAdUser()) as AuthUserLike;

        setAllowed(
          canAccess(
            user,
            PAGE_ACCESS.convenioOdontologico
          )
        );
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
    <main className="w-full p-6 lg:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="mb-4">
            <BackButton />
          </div>

          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-[#C7D300] border-[#C7D300] border flex items-center justify-center text-emerald-700 shadow">
              <FaFileAlt size={16} />
            </div>

            <div className="min-w-0">
              <h1 className="text-2xl font-semibold text-gray-900 truncate">
                Relatórios do Convênio Odontológico
              </h1>

              <p className="text-sm text-gray-600 mt-1">
                Consulte beneficiários por empresa, CPF, plano, valor,
                operadora e status.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <RelatorioConvenioOdontologico />
      </div>
    </main>
  );
}