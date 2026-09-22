"use client";

import { useEffect, useState } from "react";
import { FaCarSide } from "react-icons/fa";
import BackButton from "@/components/back-button/back-button";
import { ViagensForm } from "@/components/viagens-form/viagens-form";
import { canAccess, PAGE_ACCESS, type AuthUserLike } from "@/lib/access-control";
import { getMeAdUser } from "@/services/auth.service";

export default function ViagensPage() {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    async function validarAcesso() {
      try {
        const usuario = (await getMeAdUser()) as AuthUserLike;
        setAllowed(canAccess(usuario, PAGE_ACCESS.viagens));
      } catch {
        setAllowed(false);
      } finally {
        setLoading(false);
      }
    }
    void validarAcesso();
  }, []);

  if (loading) {
    return <div className="p-6 text-sm font-medium text-slate-500">Carregando...</div>;
  }

  if (!allowed) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700 shadow-sm">
          Você não possui permissão para acessar esta tela.
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 lg:p-8">
      <BackButton />
      <div className="mt-4 flex items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#C7D300] bg-[#C7D300] text-[#006f65] shadow-sm">
          <FaCarSide size={18} />
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-black text-slate-950">Viagens</h1>
          <p className="mt-1 max-w-3xl text-sm font-medium text-slate-600">
            Solicite, acompanhe e aprove viagens corporativas.
          </p>
        </div>
      </div>
      <div className="mt-6">
        <ViagensForm />
      </div>
    </div>
  );
}
