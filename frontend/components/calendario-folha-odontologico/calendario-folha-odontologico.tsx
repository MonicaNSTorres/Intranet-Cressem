"use client";

import { useEffect, useMemo, useState } from "react";
import { FaCalendarAlt, FaSave } from "react-icons/fa";
import { listarCalendarioFolhaOdontologico, listarEmpresasOdonto, salvarCalendarioFolhaOdontologico, type CalendarioFolhaOdontologico, type EmpresaOdonto } from "@/services/convenio_odontologico.service";

function hojeCompetencia() {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
}

function dataInput(valor?: string) {
  return String(valor || "").slice(0, 10);
}

function dataBr(valor?: string) {
  const data = dataInput(valor);
  return data ? data.split("-").reverse().join("/") : "-";
}

export function CalendarioFolhaOdontologico() {
  const [competencia, setCompetencia] = useState(hojeCompetencia());
  const [empresas, setEmpresas] = useState<EmpresaOdonto[]>([]);
  const [calendarios, setCalendarios] = useState<CalendarioFolhaOdontologico[]>([]);
  const [idEmpresa, setIdEmpresa] = useState("");
  const [dataCorte, setDataCorte] = useState("");
  const [dataAviso, setDataAviso] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [info, setInfo] = useState("");

  const empresaSelecionada = useMemo(() => empresas.find((empresa) => String(empresa.ID_EMPRESA) === idEmpresa), [empresas, idEmpresa]);

  async function carregar() {
    setCarregando(true);
    setErro("");
    try {
      const [empresasData, calendarioData] = await Promise.all([listarEmpresasOdonto(), listarCalendarioFolhaOdontologico(competencia)]);
      setEmpresas(empresasData);
      setCalendarios(calendarioData);
    } catch (error: any) {
      setErro(error?.response?.data?.error || "Não foi possível carregar o calendário.");
    } finally { setCarregando(false); }
  }

  useEffect(() => { void carregar(); }, [competencia]);

  async function salvar() {
    if (!idEmpresa || !dataCorte || !dataAviso) { setErro("Selecione a empresa e informe as duas datas."); return; }
    setSalvando(true); setErro(""); setInfo("");
    try {
      const resultado = await salvarCalendarioFolhaOdontologico({ competencia, idEmpresa: Number(idEmpresa), dataCorte, dataEnvioAviso: dataAviso });
      setInfo(`Calendário de ${empresaSelecionada?.NM_EMPRESA || "empresa"} salvo. Corte efetivo: ${String(resultado.dataCorteEfetiva).split("-").reverse().join("/")} · Aviso efetivo: ${String(resultado.dataAvisoEfetiva).split("-").reverse().join("/")}.`);
      setIdEmpresa(""); setDataCorte(""); setDataAviso("");
      await carregar();
    } catch (error: any) { setErro(error?.response?.data?.error || "Não foi possível salvar o calendário."); }
    finally { setSalvando(false); }
  }

  return <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
    <div className="flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#00AE9D]/10 text-[#007C72]"><FaCalendarAlt /></div><div><h2 className="text-lg font-semibold text-slate-900">Calendário de corte da folha odontológica</h2><p className="mt-1 text-sm leading-6 text-slate-600">Cada empresa é fechada na própria data. Se a data cair em fim de semana ou feriado nacional, o sistema posterga para o próximo dia útil, às 23:59. O aviso geral e a folha usam o modo de teste de e-mail e, por enquanto, chegam somente ao Marcelo.</p></div></div>
    <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-4"><div><label className="mb-1 block text-xs font-semibold text-slate-600">Competência dos cortes</label><input type="month" value={competencia} onChange={(e) => setCompetencia(e.target.value)} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" /></div><div><label className="mb-1 block text-xs font-semibold text-slate-600">Empresa</label><select value={idEmpresa} onChange={(e) => setIdEmpresa(e.target.value)} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"><option value="">Selecione</option>{empresas.map((empresa) => <option key={empresa.ID_EMPRESA} value={empresa.ID_EMPRESA}>{empresa.NM_EMPRESA}</option>)}</select></div><div><label className="mb-1 block text-xs font-semibold text-slate-600">Data de corte</label><input type="date" value={dataCorte} onChange={(e) => setDataCorte(e.target.value)} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" /></div><div><label className="mb-1 block text-xs font-semibold text-slate-600">Envio do aviso geral</label><input type="date" value={dataAviso} onChange={(e) => setDataAviso(e.target.value)} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" /></div></div>
    <button type="button" disabled={salvando} onClick={() => void salvar()} className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-[#00AE9D] px-4 text-sm font-semibold text-white transition hover:bg-[#008F82] disabled:opacity-60"><FaSave />{salvando ? "Salvando..." : "Salvar calendário"}</button>
    {erro && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{erro}</div>}{info && <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">{info}</div>}
    <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-600"><tr><th className="p-3">Empresa</th><th className="p-3">Corte</th><th className="p-3">Corte efetivo</th><th className="p-3">Aviso</th><th className="p-3">Aviso efetivo</th><th className="p-3">Fechamento</th><th className="p-3">Aviso enviado</th></tr></thead><tbody>{carregando ? <tr><td colSpan={7} className="p-4 text-slate-500">Carregando...</td></tr> : calendarios.length === 0 ? <tr><td colSpan={7} className="p-4 text-slate-500">Nenhuma empresa configurada para esta competência.</td></tr> : calendarios.map((item) => <tr key={item.ID_ODONTO_FOLHA_CALENDARIO} className="border-t border-slate-100"><td className="p-3 font-medium text-[#007C72]">{item.NM_EMPRESA}</td><td className="p-3">{dataBr(item.DT_CORTE)}</td><td className="p-3 font-semibold">{dataBr(item.DT_CORTE_EFETIVO)}</td><td className="p-3">{dataBr(item.DT_ENVIO_AVISO)}</td><td className="p-3 font-semibold">{dataBr(item.DT_ENVIO_AVISO_EFETIVO)}</td><td className="p-3">{item.ST_FECHAMENTO}</td><td className="p-3">{item.ST_AVISO}</td></tr>)}</tbody></table></div>
  </section>;
}
