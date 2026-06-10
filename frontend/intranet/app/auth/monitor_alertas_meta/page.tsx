"use client";

import { useEffect, useState } from "react";
import { FaBell, FaCheckCircle, FaShieldAlt } from "react-icons/fa";
import BackButton from "@/components/back-button/back-button";
import { MonitorMetaAlertas } from "@/components/monitor-meta-alertas/monitor-meta-alertas";
import {
  canAccess,
  PAGE_ACCESS,
  type AuthUserLike,
} from "@/lib/access-control";
import { getMeAdUser } from "@/services/auth.service";

export default function MonitorAlertasMetaPage() {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    async function validarAcesso() {
      try {
        const user = (await getMeAdUser()) as AuthUserLike;
        setAllowed(canAccess(user, PAGE_ACCESS.monitorAlertasMeta));
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

          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-third bg-third text-emerald-700 shadow-sm">
              <FaBell size={17} />
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-2xl font-semibold text-gray-900">
                Monitor de Alertas de Meta
              </h1>
              <p className="mt-1 max-w-3xl text-sm text-gray-600">
                Acompanhe as ocorrências geradas pelo monitor de metas e marque como resolvidas
                depois da conferência pelo suporte.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
            <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              <FaShieldAlt className="text-[#00AE9D]" />
              Acesso
            </div>
            <p className="text-sm font-semibold text-gray-800">Restrito ao suporte</p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
            <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              <FaCheckCircle className="text-[#79B729]" />
              Ação
            </div>
            <p className="text-sm font-semibold text-gray-800">Resolver ocorrências</p>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <MonitorMetaAlertas />
      </div>

      <div className="mt-8 text-xs text-gray-500">
        * Resolver uma ocorrência altera o campo SN_RESOLVIDO para 1 na tabela de alertas.
      </div>
    </div>
  );
}
