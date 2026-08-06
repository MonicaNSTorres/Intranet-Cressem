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
            <FaUsers size={22} />
          </div>

          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-[var(--title)]">
              Gerenciamento de Funcionários
            </h1>
            <p className="mt-1 text-sm text-[var(--paragraph)]">
              Consulte, cadastre, edite e altere o status dos funcionários cadastrados.
            </p>
          </div>
        </div>
      </div>

      <GerenciamentoFuncionarioForm />

      <p className="mt-6 text-xs text-slate-500">
        Os dados são carregados pela intranet-api com relacionamento de setor e cargo.
      </p>
    </main>
  );
}
