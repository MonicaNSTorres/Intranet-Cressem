"use client";

import { useEffect, useState } from "react";
import { FaFileSignature } from "react-icons/fa";
import BackButton from "@/components/back-button/back-button";
import { CadastroContratoForm } from "@/components/cadastro-contrato-form/cadastro-contrato-form";
import { Suspense } from "react";
import {
  canAccess,
  PAGE_ACCESS,
  type AuthUserLike,
} from "@/lib/access-control";
import { getMeAdUser } from "@/services/auth.service";

export default function CadastroContratoPage() {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    async function validarAcesso() {
      try {
        const user = (await getMeAdUser()) as AuthUserLike;

        setAllowed(canAccess(user, PAGE_ACCESS.cadastroContrato));
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
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#C7D300] bg-[#C7D300] text-emerald-700">
              <FaFileSignature size={16} />
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-2xl font-semibold text-gray-900">
                Cadastro de Contrato de Empresas
              </h1>

              <p className="mt-1 text-sm text-gray-600">
                Cadastre ou altere contratos de empresas com tipos, sistema e e-mails de notificação.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <Suspense fallback={<div>Carregando...</div>}>
          <CadastroContratoForm />
        </Suspense>
      </div>

      <div className="mt-8 text-xs text-gray-500">
        * Ao editar, a lista de e-mails vinculada ao contrato será sincronizada automaticamente.
      </div>
    </div>
  );
}