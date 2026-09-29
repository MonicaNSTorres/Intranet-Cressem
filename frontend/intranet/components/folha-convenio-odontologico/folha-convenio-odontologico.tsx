"use client";

import { useState } from "react";
import { FaPaperPlane } from "react-icons/fa";
import { testarEnvioFolhaOdontologico, type ResultadoFolhaOdontologico } from "@/services/convenio_odontologico.service";

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function FolhaConvenioOdontologico() {
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [resultado, setResultado] = useState<ResultadoFolhaOdontologico | null>(null);

  async function disparar() {
    if (!window.confirm("Enviar o e-mail de teste da folha? O mesmo cálculo do cron será usado e o envio ficará restrito ao destinatário de teste.")) return;
    setEnviando(true);
    setErro("");
    setResultado(null);
    try {
      setResultado(await testarEnvioFolhaOdontologico());
    } catch (error: any) {
      setErro(error?.response?.data?.error || "Não foi possível testar o envio da folha odontológica.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className="max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Teste do envio da folha odontológica</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">Disponível somente em modo de teste. Usa a mesma consulta do cron, com competência do mês anterior, e envia os arquivos somente ao destinatário de teste.</p>
      <button type="button" onClick={disparar} disabled={enviando} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#00AE9D] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#008f82] disabled:cursor-not-allowed disabled:opacity-60">
        <FaPaperPlane />{enviando ? "Enviando teste..." : "Enviar e-mail de teste"}
      </button>
      {erro && <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{erro}</div>}
      {resultado && <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
        <p className="font-semibold">{resultado.enviado ? "E-mail de teste enviado com sucesso." : "Não havia empresas pendentes para envio."}</p>
        <p className="mt-1">Competência: {resultado.competencia.split("-").reverse().join("/")} · Destinatário: {resultado.destinatario}</p>
        {resultado.empresas.length > 0 && <div className="mt-4 overflow-x-auto rounded border border-emerald-200 bg-white"><table className="w-full min-w-[460px] text-left"><thead className="bg-emerald-50 text-xs uppercase text-emerald-800"><tr><th className="p-3">Empresa</th><th className="p-3 text-center">Titulares</th><th className="p-3 text-right">Total</th></tr></thead><tbody>{resultado.empresas.map((empresa) => <tr key={empresa.empresa} className="border-t border-emerald-100"><td className="p-3">{empresa.empresa}</td><td className="p-3 text-center">{empresa.titulares}</td><td className="p-3 text-right">{formatarMoeda(empresa.total)}</td></tr>)}</tbody><tfoot><tr className="border-t border-emerald-200 font-semibold"><td className="p-3" colSpan={2}>Total para desconto</td><td className="p-3 text-right">{formatarMoeda(resultado.totalGeral)}</td></tr></tfoot></table></div>}
        {resultado.ignoradas.length > 0 && <p className="mt-3 text-xs">Já enviadas anteriormente: {resultado.ignoradas.join(", ")}.</p>}
      </div>}
    </section>
  );
}
