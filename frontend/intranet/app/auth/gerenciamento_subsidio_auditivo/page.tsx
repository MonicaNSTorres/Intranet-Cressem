"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FaClipboardList } from "react-icons/fa";
import BackButton from "@/components/back-button/back-button";
import { GerenciamentoSubsidioAuditivoForm } from "@/components/gerenciamento-subsidio-auditivo-form/gerenciamento-subsidio-auditivo-form";
import {
  canAccess,
  PAGE_ACCESS,
  type AuthUserLike,
} from "@/lib/access-control";
import { getMeAdUser } from "@/services/auth.service";

export default function GerenciamentoSubsidioAuditivoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    async function validarAcesso() {
      try {
        const user = (await getMeAdUser()) as AuthUserLike;
        setAllowed(canAccess(user, PAGE_ACCESS.gerenciamentoSubsidioAuditivo));
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
    return <div className="p-6 text-sm text-gray-500">Carregando...</div>;
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
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#C7D300] bg-[#C7D300] text-emerald-700 shadow">
              <FaClipboardList size={16} />
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-2xl font-semibold text-gray-900">
                Gerenciamento de subsídio auditivo
              </h1>

              <p className="mt-1 text-sm text-gray-600">
                Acompanhe o fluxo, confira documentos e mova a solicitação entre atendimento, diretoria e financeiro.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => router.push("/auth/cadastro_subsidio_auditivo")}
          className="rounded-lg bg-secondary px-6 py-2 text-md font-semibold text-white shadow hover:bg-primary cursor-pointer"
        >
          Nova Solicitação
        </button>
      </div>

      <div className="mt-6">
        <GerenciamentoSubsidioAuditivoForm />
      </div>
    </div>
  );
}

