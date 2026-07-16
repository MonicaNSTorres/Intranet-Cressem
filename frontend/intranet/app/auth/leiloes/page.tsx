"use client";

import { useEffect, useState } from "react";
import { FaGavel, FaEye, FaTrophy, FaChartArea } from "react-icons/fa";
import { useRouter } from "next/navigation";
import BackButton from "@/components/back-button/back-button";
import {
  canAccess,
  PAGE_ACCESS,
  type AuthUserLike,
} from "@/lib/access-control";
import { getMeAdUser } from "@/services/auth.service";
import { LeiloesForm } from "@/components/leiloes-form/leiloes-form";

export default function LeiloesPage() {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function validarAcesso() {
      try {
        const user = (await getMeAdUser()) as AuthUserLike;

        setAllowed(canAccess(user, PAGE_ACCESS.leiloes));
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
              <FaGavel size={16} />
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-2xl font-semibold text-gray-900">
                Leilões
              </h1>

              <p className="mt-1 text-sm text-gray-600">
                Cadastre produtos, acompanhe os lances e gerencie os leilões
                disponíveis na intranet.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => router.push("/auth/leiloes_ao_vivo")}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-white shadow-lg shadow-primary/20 transition hover:bg-secondary cursor-pointer"
          >
            <FaEye />
            Ver leilões ao vivo
          </button>

          <button
            type="button"
            onClick={() => router.push("/auth/leiloes_finalizados")}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-yellow-200 bg-yellow-50 shadow-lg shadow-yellow/20 px-5 py-3 text-sm font-bold text-yellow-700 transition hover:bg-yellow-100 cursor-pointer"
          >
            <FaTrophy />
            Leilões encerrados
          </button>

          <button
            type="button"
            onClick={() => router.push("/auth/leiloes_dashboard")}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-fourth-200 bg-fourth-50 shadow-lg shadow-fourth/20 px-5 py-3 text-sm font-bold text-fourth-700 transition hover:bg-fourth hover:border-fourth hover:text-white cursor-pointer"
          >
            <FaChartArea />
            Leilões métricas
          </button>
        </div>
      </div>

      <div className="mt-6">
        <LeiloesForm />
      </div>

      <div className="mt-8 text-xs text-gray-500">
        * Os leilões cadastrados ficam disponíveis para os usuários conforme o
        período e o status definido pelo administrador.
      </div>
    </div>
  );
}