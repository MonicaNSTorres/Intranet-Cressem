"use client";

import { useRef, useState } from "react";
import axios from "axios";
import { FaPaperPlane, FaSearch } from "react-icons/fa";
import {
  consultarAlertasIdadeOdontologico,
  testarEnvioAlertaIdadeOdontologico,
  type ConsultaAlertaIdadeOdontologico,
} from "@/services/convenio_odontologico.service";

function hoje() {
  const partes = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const parte = (tipo: string) => partes.find((item) => item.type === tipo)?.value;
  return `${parte("year")}-${parte("month")}-${parte("day")}`;
}

function mensagemErro(error: unknown) {
  if (axios.isAxiosError(error)) return error.response?.data?.details || error.response?.data?.error || error.message;
  return error instanceof Error ? error.message : "Não foi possível executar o teste dos alertas de idade.";
}

export function AlertaIdadeConvenioOdontologico() {
  const [referencia, setReferencia] = useState(hoje);
  const [idade, setIdade] = useState<"" | "18" | "24">("");
  const [executando, setExecutando] = useState(false);
  const [consulta, setConsulta] = useState<ConsultaAlertaIdadeOdontologico | null>(null);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const emAndamento = useRef(false);
  const filtros = () => ({ referencia, idade: idade ? Number(idade) as 18 | 24 : undefined });

  function limparResultado() {
    setConsulta(null); setMensagem(""); setErro("");
  }

  async function consultar() {
    if (emAndamento.current) return;
    if (!referencia) { setErro("Informe a data de referência."); return; }
    emAndamento.current = true;
    setExecutando(true); limparResultado();
    try { setConsulta(await consultarAlertasIdadeOdontologico(filtros())); }
    catch (error) { setErro(mensagemErro(error)); }
    finally { emAndamento.current = false; setExecutando(false); }
  }

  async function enviar() {
    if (emAndamento.current || !consulta?.modoTesteAtivo || !consulta.alertas.length) return;
    if (!window.confirm(`Enviar um e-mail de teste com os alertas consultados para aniversários de ${consulta.mesAniversario}?`)) return;
    emAndamento.current = true;
    setExecutando(true); setErro(""); setMensagem("");
    try {
      const resultado = await testarEnvioAlertaIdadeOdontologico(filtros());
      setMensagem(resultado.enviado
        ? `E-mail de teste enviado para ${resultado.destinatario}, com ${resultado.enviados} dependente(s).`
        : "Nenhum dependente elegível foi encontrado; não houve envio de e-mail.");
    } catch (error) { setErro(mensagemErro(error)); }
    finally { emAndamento.current = false; setExecutando(false); }
  }

  const campo = "mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 disabled:opacity-60";
  return <section className="max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
    <h2 className="text-lg font-semibold text-slate-900">Teste dos alertas de idade dos dependentes</h2>
    <p className="mt-2 text-sm leading-6 text-slate-600">Consulte dependentes do plano antigo 9045 que completarão 18 ou 24 anos no mês seguinte à data de referência. Aos 18 anos, o aviso pede verificar a faculdade; aos 24, pede alterar o plano.</p>
    <div className="mt-4 grid gap-4 sm:grid-cols-2">
      <label className="text-sm font-medium text-slate-700">Data de referência<input type="date" value={referencia} disabled={executando} className={campo} onChange={(event) => { setReferencia(event.target.value); limparResultado(); }} /></label>
      <label className="text-sm font-medium text-slate-700">Tipo de alerta<select value={idade} disabled={executando} className={campo} onChange={(event) => { setIdade(event.target.value as "" | "18" | "24"); limparResultado(); }}><option value="">Todos os alertas</option><option value="18">18 anos — verificar faculdade</option><option value="24">24 anos — alterar plano</option></select></label>
    </div>
    <div className="mt-5 flex flex-wrap gap-3">
      <button type="button" onClick={consultar} disabled={executando} className="inline-flex items-center gap-2 rounded-lg bg-[#00AE9D] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#008f82] disabled:cursor-not-allowed disabled:opacity-60"><FaSearch />{executando ? "Processando..." : "Consultar alertas"}</button>
      <button type="button" onClick={enviar} disabled={executando || !consulta?.modoTesteAtivo || !consulta.alertas.length} className="inline-flex items-center gap-2 rounded-lg bg-[#007C72] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#00685f] disabled:cursor-not-allowed disabled:opacity-60"><FaPaperPlane />Enviar e-mail de teste</button>
    </div>
    {erro && <div role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{erro}</div>}
    {mensagem && <div role="status" className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">{mensagem}</div>}
    {consulta && <div className="mt-5 text-sm text-slate-700">
      <p className="font-semibold">{consulta.alertas.length} dependente(s) encontrado(s) · Aniversários: {consulta.mesAniversario}</p>
      {!consulta.modoTesteAtivo && <p className="mt-2 text-amber-800">A consulta está disponível. Para enviar o e-mail de teste, ative EMAIL_MODO_TESTE=true no backend.</p>}
      {consulta.modoTesteAtivo && <p className="mt-2 text-slate-600">O e-mail irá somente ao destinatário de teste. Nenhum cadastro será alterado.</p>}
      {consulta.alertas.length > 0 && <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200"><table className="w-full min-w-[700px] text-left text-xs"><thead className="bg-slate-50 text-slate-600"><tr><th className="p-3">Dependente / CPF</th><th className="p-3">Titular / Empresa</th><th className="p-3">Plano</th><th className="p-3">Aniversário / Providência</th></tr></thead><tbody>{consulta.alertas.map((alerta) => <tr key={alerta.ID_BENEFICIARIO} className="border-t border-slate-100 align-top"><td className="p-3"><p className="font-semibold">{alerta.NOME_BENEFICIARIO}</p><p>{alerta.CPF_BENEFICIARIO}</p></td><td className="p-3"><p>{alerta.NOME_TITULAR}</p><p className="mt-1 text-slate-500">{alerta.EMPRESA || "Sem empresa"}</p></td><td className="p-3"><p>{alerta.OPERADORA}</p><p>{alerta.NM_PLANO}</p></td><td className="p-3"><p className="font-semibold">{alerta.IDADE_ALVO} anos em {alerta.DATA_ANIVERSARIO}</p><p className="mt-1 leading-5">{alerta.ALERTA_BENEFICIARIO}</p></td></tr>)}</tbody></table></div>}
    </div>}
  </section>;
}
