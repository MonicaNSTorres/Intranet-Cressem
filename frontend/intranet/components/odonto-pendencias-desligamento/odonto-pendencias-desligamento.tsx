"use client";

import { useState } from "react";
import { FaFlask } from "react-icons/fa";
import { executarTestePendenciasOdonto, type ResultadoTestePendenciaOdonto } from "@/services/convenio_odontologico.service";

export function OdontoPendenciasDesligamento() {
  const [executando, setExecutando] = useState(false);
  const [erro, setErro] = useState("");
  const [resultado, setResultado] = useState<ResultadoTestePendenciaOdonto | null>(null);
  async function executarTeste(nivel: 1 | 2 | 3) {
    const descricao = nivel === 1 ? "a primeira notificação" : nivel === 2 ? "a notificação de segundo nível" : "a simulação do último nível";
    if (!window.confirm(`Executar ${descricao} apenas para pendências identificadas como TESTE? A progressão será registrada, mas nenhum plano ou dependente será desligado.`)) return;
    setExecutando(true); setErro(""); setResultado(null);
    try { setResultado(await executarTestePendenciasOdonto(nivel)); }
    catch (error: any) { setErro(error?.response?.data?.error || "Não foi possível executar o teste."); }
    finally { setExecutando(false); }
  }
  return <section className="max-w-3xl rounded-2xl border border-amber-200 bg-amber-50/40 p-6 shadow-sm"><h2 className="text-lg font-semibold text-slate-900">Teste da automação do convênio odontológico</h2><p className="mt-2 text-sm leading-6 text-slate-600">Disponível somente com o modo de teste de e-mail ativo. Processa apenas associados cujo nome contém “TESTE”. Os botões registram a evolução: ciclo 1, ciclo 2 e encerramento simulado. Nenhum plano ou dependente é desligado.</p><div className="mt-5 flex flex-wrap gap-3"><button type="button" disabled={executando} onClick={() => executarTeste(1)} className="inline-flex items-center gap-2 rounded-lg bg-[#00AE9D] px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"><FaFlask />{executando ? "Executando teste..." : "1ª notificação"}</button><button type="button" disabled={executando} onClick={() => executarTeste(2)} className="inline-flex items-center gap-2 rounded-lg bg-[#007C72] px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"><FaFlask />2º nível</button><button type="button" disabled={executando} onClick={() => executarTeste(3)} className="inline-flex items-center gap-2 rounded-lg bg-[#8A6A00] px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"><FaFlask />Último nível</button></div>{erro && <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{erro}</div>}{resultado && <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">Teste concluído: {resultado.avisos + resultado.desligadas} e-mail(s) enviado(s) e {resultado.erros} erro(s). {resultado.desligadas > 0 ? "O encerramento simulado foi registrado, sem desligar plano ou dependentes." : "O ciclo foi registrado na pendência de teste."}</div>}</section>;
}
