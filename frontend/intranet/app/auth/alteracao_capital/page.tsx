"use client";

import { useEffect, useState } from "react";
import { FaIdCard } from "react-icons/fa";
import BackButton from "@/components/back-button/back-button";
import { ConsultaAssociadoForm } from "@/components/consulta-associado-form/consulta-associado-form";
import {
  canAccess,
  PAGE_ACCESS,
  type AuthUserLike,
} from "@/lib/access-control";
import { getMeAdUser } from "@/services/auth.service";

export default function ConsultaAssociadoPage() {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    async function validarAcesso() {
      try {
        const user = (await getMeAdUser()) as AuthUserLike;

        setAllowed(canAccess(user, PAGE_ACCESS.alteracaoCapital));
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
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-third border-third border flex items-center justify-center text-emerald-700">
              <FaIdCard size={16} />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold text-gray-900 truncate">
                Consulta de Associado
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Digite o CPF para carregar Nome, Matrícula e Empresa e gerar o PDF.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <ConsultaAssociadoForm />
      </div>

      <div className="mt-8 text-xs text-gray-500">
        * Os dados são consultados via intranet-api (busca por CPF).
      </div>
    </div>
  );
}