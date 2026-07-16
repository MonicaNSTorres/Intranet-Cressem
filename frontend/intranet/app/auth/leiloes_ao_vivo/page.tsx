"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FaGavel, FaTrophy } from "react-icons/fa";
import BackButton from "@/components/back-button/back-button";
import {
  canAccess,
  PAGE_ACCESS,
  type AuthUserLike,
} from "@/lib/access-control";
import { getMeAdUser } from "@/services/auth.service";
import { LeiloesAoVivoLista } from "@/components/leiloes-ao-vivo/leiloes-ao-vivo";

export default function LeiloesAoVivoPage() {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function validarAcesso() {
      try {
        const user = (await getMeAdUser()) as AuthUserLike;

        setAllowed(canAccess(user, PAGE_ACCESS.leiloesAoVivo));
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
                Leilão ao vivo
              </h1>

              <p className="mt-1 text-sm text-gray-600">
                Veja os produtos disponíveis e participe dando seus lances.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
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
        <LeiloesAoVivoLista />
      </div>

      <div className="mt-8 text-xs text-gray-500">
        * O maior lance válido até o horário final será considerado vencedor.
      </div>
    </div>
  );
}