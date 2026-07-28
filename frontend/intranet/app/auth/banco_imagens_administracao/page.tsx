"use client";

import { useEffect, useState } from "react";
import { FaImages } from "react-icons/fa6";
import BackButton from "@/components/back-button/back-button";
import BancoImagensForm from "@/components/banco-imagens-form/banco-imagens-form";
import {
  canAccess,
  PAGE_ACCESS,
  type AuthUserLike,
} from "@/lib/access-control";
import { getMeAdUser } from "@/services/auth.service";

export default function BancoImagensAdministracaoPage() {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    async function validarAcesso() {
      try {
        const user = (await getMeAdUser()) as AuthUserLike;

        setAllowed(
          canAccess(
            user,
            PAGE_ACCESS.bancoImagensAdministrar
          )
        );
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
          Você não possui permissão para administrar o Banco de Imagens.
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
              <FaImages size={16} />
            </div>

            <div className="min-w-0">
              <h1 className="text-2xl font-semibold text-gray-900 truncate">
                Gerenciar Banco de Imagens
              </h1>

              <p className="text-sm text-gray-600 mt-1">
                Cadastre, edite, destaque, ative ou desative os materiais
                disponibilizados aos funcionários.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <BancoImagensForm modo="administracao" />
      </div>

      <div className="mt-8 text-xs text-gray-500">
        * Esta área é destinada à Comunicação e aos responsáveis pela gestão
        dos materiais oficiais.
      </div>
    </div>
  );
}