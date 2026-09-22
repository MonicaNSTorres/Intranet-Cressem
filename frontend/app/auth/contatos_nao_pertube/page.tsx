"use client";

import { useEffect, useState } from "react";
import { FaBan, FaShieldAlt } from "react-icons/fa";
import BackButton from "@/components/back-button/back-button";
import { ContatosNaoPertubeForm } from "@/components/contatos-nao-pertube-form/contatos-nao-pertube-form";
import {
  canAccess,
  PAGE_ACCESS,
  type AuthUserLike,
} from "@/lib/access-control";
import { getMeAdUser } from "@/services/auth.service";

export default function ContatosNaoPertubePage() {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    async function validarAcesso() {
      try {
        const user = (await getMeAdUser()) as AuthUserLike;
        setAllowed(canAccess(user, PAGE_ACCESS.contatosNaoPertube));
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

          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-third bg-third text-emerald-700 shadow-sm">
              <FaBan size={17} />
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-2xl font-semibold text-gray-900">
                Contatos Não Perturbe
              </h1>
              <p className="mt-1 max-w-3xl text-sm text-gray-600">
                Consulte os contatos cadastrados na lista de Não Perturbe do Blip.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
          <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            <FaShieldAlt className="text-[#00AE9D]" />
            Acesso
          </div>
          <p className="text-sm font-semibold text-gray-800">Restrito ao suporte</p>
        </div>
      </div>

      <div className="mt-6">
        <ContatosNaoPertubeForm />
      </div>
    </div>
  );
}
