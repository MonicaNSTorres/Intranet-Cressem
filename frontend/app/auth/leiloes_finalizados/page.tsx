"use client";

import { useEffect, useState } from "react";
import { FaEye, FaTrophy } from "react-icons/fa";
import { useRouter } from "next/navigation";
import BackButton from "@/components/back-button/back-button";
import { LeiloesFinalizadosLista } from "@/components/leiloes-finalizados/leiloes-finalizados";
import {
  canAccess,
  PAGE_ACCESS,
  type AuthUserLike,
} from "@/lib/access-control";
import { getMeAdUser } from "@/services/auth.service";

export default function LeiloesFinalizadosPage() {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function validarAcesso() {
      try {
        const user = (await getMeAdUser()) as AuthUserLike;

        setAllowed(canAccess(user, PAGE_ACCESS.leiloesFinalizados));
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
        <div>
          <BackButton />

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#C7D300] bg-[#C7D300] text-emerald-700">
              <FaTrophy size={18} />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Leilões encerrados
              </h1>

              <p className="text-sm text-slate-600">
                Consulte os produtos finalizados, vencedores e valores
                arrematados.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => router.push("/auth/leiloes_ao_vivo")}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-white shadow-lg shadow-primary/20 transition hover:bg-secondary cursor-pointer"
        >
          <FaEye />
          Ver leilões ao vivo
        </button>
      </div>

      <div className="mt-6">
        <LeiloesFinalizadosLista />
      </div>
    </div>
  );
}