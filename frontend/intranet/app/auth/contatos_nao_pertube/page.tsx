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
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="mb-4">
            <BackButton />
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-third text-primary shadow-sm">
              <FaBan size={20} />
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-2xl font-bold text-[var(--title)]">
                Contatos Não Perturbe
              </h1>
              <p className="mt-1 max-w-3xl text-sm text-[var(--paragraph)]">
                Consulte os contatos cadastrados na lista de Não Perturbe do Blip.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-fourth/20 bg-fourth/5 px-4 py-3 shadow-sm">
          <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-fourth">
            <FaShieldAlt />
            Acesso
          </div>
          <p className="text-sm font-semibold text-[var(--title)]">Restrito ao suporte</p>
        </div>
      </div>

      <ContatosNaoPertubeForm />
    </main>
  );
}
