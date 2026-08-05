"use client";

import { useEffect, useState } from "react";
import { FaFileInvoiceDollar } from "react-icons/fa";
import BackButton from "@/components/back-button/back-button";
import { AutorizacaoDebitoForm } from "@/components/autorizacao-debito-form/autorizacao-debito-form";
import {
  canAccess,
  PAGE_ACCESS,
  type AuthUserLike,
} from "@/lib/access-control";
import { getMeAdUser } from "@/services/auth.service";

export default function AutorizacaoDebitoPage() {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    async function validarAcesso() {
      try {
        const user = (await getMeAdUser()) as AuthUserLike;

        setAllowed(canAccess(user, PAGE_ACCESS.autorizacaoDebito));
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
      <div className="p-6 text-sm font-medium text-slate-500">
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
      <div className="mb-4">
        <BackButton />
      </div>

      <div className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#C7D300] bg-[#C7D300] text-[#006f65] shadow-sm">
                <FaFileInvoiceDollar size={16} />
              </div>

              <div className="min-w-0">
                <h1 className="truncate text-2xl font-black text-slate-950">
                  Autorização de Débito
                </h1>
                <p className="mt-1 text-sm font-medium text-slate-600">
                  Preencha os dados do associado, informe os débitos e gere o PDF
                  da autorização.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <AutorizacaoDebitoForm />
      </div>

      <div className="mt-5 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-medium text-slate-500 shadow-sm">
        * Os dados do associado são carregados via intranet-api pela consulta de CPF.
      </div>
    </div>
  );
}
