"use client";

import { useEffect, useState } from "react";
import { FaFlask } from "react-icons/fa";
import BackButton from "@/components/back-button/back-button";
import { FolhaConvenioOdontologico } from "@/components/folha-convenio-odontologico/folha-convenio-odontologico";
import { OdontoPendenciasDesligamento } from "@/components/odonto-pendencias-desligamento/odonto-pendencias-desligamento";
import { canAccess, PAGE_ACCESS, type AuthUserLike } from "@/lib/access-control";
import { getMeAdUser } from "@/services/auth.service";

export default function AutomacaoConvenioOdontologicoPage() {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    getMeAdUser().then((usuario) => setAllowed(canAccess(usuario as AuthUserLike, PAGE_ACCESS.folhaConvenioOdonto))).catch(() => setAllowed(false)).finally(() => setLoading(false));
  }, []);
  if (loading) return <div className="p-6 text-sm text-gray-500">Carregando...</div>;
  if (!allowed) return <div className="p-6"><div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">Você não possui permissão para acessar esta tela.</div></div>;
  return <div className="p-6 lg:p-8"><BackButton /><div className="mb-6 mt-4 flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#C7D300] text-emerald-700"><FaFlask size={17} /></div><div><h1 className="text-2xl font-semibold text-gray-900">Teste da automação do convênio odontológico</h1><p className="mt-1 text-sm text-gray-600">Ambiente restrito para testar e-mails e lembretes.</p></div></div><div className="space-y-6"><FolhaConvenioOdontologico /><OdontoPendenciasDesligamento /></div></div>;
}
