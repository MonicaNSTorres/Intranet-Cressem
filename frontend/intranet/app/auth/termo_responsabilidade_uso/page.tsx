"use client";

import { useEffect, useState } from "react";
import { FaFileSignature } from "react-icons/fa";
import BackButton from "@/components/back-button/back-button";
import { TermoResponsabilidadeUsoForm } from "@/components/termo-responsabilidade-uso-form/termo-responsabilidade-uso-form";
import {
  canAccess,
  PAGE_ACCESS,
  type AuthUserLike,
} from "@/lib/access-control";
import { getMeAdUser } from "@/services/auth.service";

export default function TermoResponsabilidadeUsoPage() {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    async function validarAcesso() {
      try {
        const user = (await getMeAdUser()) as AuthUserLike;

        setAllowed(canAccess(user, PAGE_ACCESS.termoResponsabilidadeTI));
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
      <BackButton />

      <div className="mt-4 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--third)] text-[#003641] shadow-sm">
          <FaFileSignature size={17} />
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold text-[var(--title)]">
            Termo de Responsabilidade de Uso de Equipamento
          </h1>
          <p className="mt-1 text-sm text-[var(--paragraph)]">
            Gere o termo de responsabilidade para entrega de equipamentos de TI.
          </p>
        </div>
      </div>

      <div className="mt-6">
        <TermoResponsabilidadeUsoForm />
      </div>

      <div className="mt-8 text-xs text-gray-500">
        * O colaborador pode ser localizado automaticamente pelo CPF via intranet-api.
      </div>
    </div>
  );
}
