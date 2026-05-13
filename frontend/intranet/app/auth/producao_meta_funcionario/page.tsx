"use client";

import { useEffect, useState } from "react";
import { FaChartLine, FaDatabase, FaTable, FaUserTie } from "react-icons/fa";
import BackButton from "@/components/back-button/back-button";
import { ProducaoMetaFuncionarioForm } from "@/components/producao-meta-funcionario/producao-meta-funcionario";
import {
  canAccess,
  PAGE_ACCESS,
  type AuthUserLike,
} from "@/lib/access-control";
import { getMeAdUser } from "@/services/auth.service";

export default function ProducaoMetaFuncionarioPage() {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    async function validarAcesso() {
      try {
        const user = (await getMeAdUser()) as AuthUserLike;

        setAllowed(canAccess(user, PAGE_ACCESS.producaoMetaFuncionario));
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
              <FaUserTie size={17} />
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-2xl font-semibold text-gray-900">
                Produção e Meta por Funcionário
              </h1>
              <p className="mt-1 max-w-3xl text-sm text-gray-600">
                Consulte indicadores de produção, metas semanais, evolução anual e gaps por funcionário,
                com filtros dinâmicos por tema e período.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
            <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              <FaDatabase className="text-[#00AE9D]" />
              Atualização
            </div>
            <p className="text-sm font-semibold text-gray-800">
              Dados em tempo de consulta
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
            <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              <FaChartLine className="text-[#79B729]" />
              Indicadores
            </div>
            <p className="text-sm font-semibold text-gray-800">
              Metas, gaps e produção
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
            <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              <FaTable className="text-[#C7D300]" />
              Visualização
            </div>
            <p className="text-sm font-semibold text-gray-800">
              Tabela dinâmica por relatório
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <ProducaoMetaFuncionarioForm />
      </div>

      <div className="mt-8 text-xs text-gray-500">
        * Os dados são carregados via intranet-api conforme o relatório e o período selecionados.
      </div>
    </div>
  );
}