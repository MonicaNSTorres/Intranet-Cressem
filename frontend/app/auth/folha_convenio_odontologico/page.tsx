"use client";

import { useEffect, useState } from "react";
import { FaClock } from "react-icons/fa";
import BackButton from "@/components/back-button/back-button";
import { canAccess, PAGE_ACCESS, type AuthUserLike } from "@/lib/access-control";
import { getMeAdUser } from "@/services/auth.service";

export default function FolhaConvenioOdontologicoPage() {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    getMeAdUser()
      .then((usuario) => setAllowed(canAccess(usuario as AuthUserLike, PAGE_ACCESS.folhaConvenioOdonto)))
      .catch(() => setAllowed(false))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-6 text-sm text-gray-500">Carregando...</div>;
  if (!allowed) return <div className="p-6"><div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">Você não possui permissão para acessar esta tela.</div></div>;

  return <div className="p-6 lg:p-8">
    <BackButton />
    <div className="mb-6 mt-4 flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#C7D300] text-emerald-700"><FaClock size={17} /></div>
      <div><h1 className="text-2xl font-semibold text-gray-900">Folha do Convênio Odontológico</h1><p className="mt-1 text-sm text-gray-600">Envio automático mensal após a conclusão das movimentações pelo Cadastro.</p></div>
    </div>
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Processamento automático</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">No dia 7 de cada mês, às 08:00, a Intranet consulta a situação já ajustada pelo Cadastro e envia os CSVs separados por empresa. O e-mail, os arquivos e os registros ficam identificados com a competência do mês anterior.</p>
      <div className="mt-4 rounded-xl border border-[#BDECE6] bg-[#F0FDFA] p-4 text-sm text-[#006B5F]">Não há disparo manual ativo nesta etapa. Em modo de teste, o envio continua protegido e direcionado ao destinatário de teste configurado.</div>
    </section>
  </div>;
}
