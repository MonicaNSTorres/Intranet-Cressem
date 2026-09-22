"use client";

import { useEffect, useState } from "react";
import { FaUsers } from "react-icons/fa";
import BackButton from "@/components/back-button/back-button";
import { GerenciamentoFuncionarioForm } from "@/components/gerenciamento-funcionario-form/gerenciamento-funcionario-form";
import {
  canAccess,
  PAGE_ACCESS,
  type AuthUserLike,
} from "@/lib/access-control";
import { getMeAdUser } from "@/services/auth.service";

export default function GerenciamentoFuncionarioPage() {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    async function validarAcesso() {
      try {
        const user = (await getMeAdUser()) as AuthUserLike;

        setAllowed(canAccess(user, PAGE_ACCESS.gerenciamentoFuncionario));
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
              <FaUsers size={16} />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-semibold text-gray-900">
                Gerenciamento de Funcionários
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Consulte, cadastre, edite e altere o status dos funcionários cadastrados.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <GerenciamentoFuncionarioForm />
      </div>

      <div className="mt-8 text-xs text-gray-500">
        * Os dados são carregados via intranet-api com paginação e relacionamento com setor e cargo.
      </div>
    </div>
  );
}