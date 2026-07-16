"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FaChartLine, FaGavel, FaTrophy } from "react-icons/fa";
import BackButton from "@/components/back-button/back-button";
import {
  canAccess,
  PAGE_ACCESS,
  type AuthUserLike,
} from "@/lib/access-control";
import { getMeAdUser } from "@/services/auth.service";
import { LeiloesDashboard } from "@/components/leiloes-dashboard/leiloes-dashboard";

export default function LeiloesDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function validarAcesso() {
      try {
        const user = (await getMeAdUser()) as AuthUserLike;

        setAllowed(canAccess(user, PAGE_ACCESS.leiloesDashboard));
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
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#C7D300] bg-[#C7D300] text-emerald-700">
              <FaChartLine size={16} />
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-2xl font-semibold text-gray-900">
                Dashboard de leilões
              </h1>

              <p className="mt-1 text-sm text-gray-600">
                Acompanhe indicadores, valores movimentados e desempenho dos
                leilões da intranet.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => router.push("/auth/leiloes")}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-white shadow-lg shadow-primary/20 transition hover:bg-secondary cursor-pointer"
          >
            <FaGavel />
            Gerenciar leilões
          </button>

          <button
            type="button"
            onClick={() => router.push("/auth/leiloes_finalizados")}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-yellow-200 bg-yellow-50 shadow-lg shadow-yellow/20 px-5 py-3 text-sm font-bold text-yellow-700 transition hover:bg-yellow-100 cursor-pointer"
          >
            <FaTrophy />
            Leilões encerrados
          </button>
        </div>
      </div>

      <div className="mt-6">
        <LeiloesDashboard />
      </div>

      <div className="mt-8 text-xs text-gray-500">
        * Os indicadores são calculados com base nos leilões cadastrados e nos
        lances registrados.
      </div>
    </div>
  );
}