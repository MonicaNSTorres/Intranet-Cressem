"use client";

import { useEffect, useState } from "react";
import { FaBullhorn } from "react-icons/fa";
import BackButton from "@/components/back-button/back-button";
import { PopupAvisoForm } from "@/components/popup-aviso-form/popup-aviso-form";
import {
  canAccess,
  PAGE_ACCESS,
  type AuthUserLike,
} from "@/lib/access-control";
import { getMeAdUser } from "@/services/auth.service";


export default function PopupAvisoPage() {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    async function validarAcesso() {
      try {
        const user = (await getMeAdUser()) as AuthUserLike;

        setAllowed(canAccess(user, PAGE_ACCESS.popupAviso));
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
            <div className="h-10 w-10 rounded-2xl bg-[#C7D300] border-[#C7D300] border flex items-center justify-center text-emerald-700">
              <FaBullhorn size={16} />
            </div>

            <div className="min-w-0">
              <h1 className="text-2xl font-semibold text-gray-900 truncate">
                Configuração de Popup
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Cadastre o aviso que será exibido ao usuário após o login, configure período,
                status, botões e imagem de destaque.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <PopupAvisoForm />
      </div>

      <div className="mt-8 text-xs text-gray-500">
        * O popup será exibido conforme status ativo, período configurado e ausência de resposta do usuário.
      </div>
    </div>
  );
}