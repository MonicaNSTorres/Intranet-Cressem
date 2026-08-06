"use client";

import { monetizarDigitacao } from "@/utils/br";
import { useEffect, useMemo, useState } from "react";
import { getMeAdUser } from "@/services/auth.service";
import { gerarPdfCalculadoraJurosCartao } from "@/lib/pdf/gerarPdfCalculadoraJurosCartao";

type Resultado = {
    diasAtraso: number;
    multa: number;
    mora: number;
    jurosDiario: number;
    totalJurosMulta: number;
    totalGeral: number;
    multaPerc: number;
    taxaMensal: number;
    divConsol: number;
};

function hojeISO() {
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function parseBRL(v: string) {
    const clean = v.replace(/\s/g, "").replace("R$", "").replace(/\./g, "").replace(",", ".");
    const num = Number(clean);
    return Number.isFinite(num) ? num : 0;
}

function fmtBR(v: number) {
    return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function CalculadoraJurosCartaoForm() {
    const [valorFatura, setValorFatura] = useState("");
    const [vencimento, setVencimento] = useState("");
    const [hoje, setHoje] = useState(hojeISO());
    const [multaPerc, setMultaPerc] = useState(2);
    const [moraPerc, setMoraPerc] = useState(1);
    const [taxaMensal, setTaxaMensal] = useState(9.79);
    const [dividaConsolidada, setDividaConsolidada] = useState("");
    const [mensagem, setMensagem] = useState<string | null>(null);
    const [resultado, setResultado] = useState<Resultado | null>(null);
    const [responsavel, setResponsavel] = useState("INTRANET");

    useEffect(() => {
        let mounted = true;

        (async () => {
            try {
                const me = await getMeAdUser();
                const nome = String(me?.nome_completo || me?.username || "").trim();
                if (mounted && nome) setResponsavel(nome);
            } catch {
                // fallback
            }
        })();

        return () => {
            mounted = false;
        };
    }, []);

    function calcular() {
        setMensagem(null);
        setResultado(null);

        const vfatura = parseBRL(valorFatura);
        const divConsol = parseBRL(dividaConsolidada);

        if (!vencimento || !hoje) {
            setMensagem("Preencha vencimento e dia de hoje.");
            return;
        }

        const dataVenc = new Date(vencimento);
        const dataHoje = new Date(hoje);

        const msPorDia = 1000 * 60 * 60 * 24;
        const diasAtraso = Math.floor((dataHoje.getTime() - dataVenc.getTime()) / msPorDia);

        if (diasAtraso <= 0) {
            setMensagem("Fatura ainda não está em atraso.");
            return;
        }

        const multa = vfatura * (multaPerc / 100);
        const moraDiaria = (moraPerc / 100) / 30;
        const mora = vfatura * moraDiaria * diasAtraso;
        const jurosDiario = vfatura * ((taxaMensal / 100) / 30) * diasAtraso;
        const totalJurosMulta = multa + mora + jurosDiario;
        const totalGeral = divConsol + totalJurosMulta;

        setResultado({
            diasAtraso,
            multa,
            mora,
            jurosDiario,
            totalJurosMulta,
            totalGeral,
            multaPerc,
            taxaMensal,
            divConsol,
        });
    }

    function limpar() {
        setValorFatura("");
        setVencimento("");
        setHoje(hojeISO());
        setMultaPerc(2);
        setMoraPerc(1);
        setTaxaMensal(9.79);
        setDividaConsolidada("");
        setMensagem(null);
        setResultado(null);
    }

    const podeGerarDocumento = useMemo(() => !!resultado, [resultado]);

    async function gerarDocumento(acao: "download" | "print") {
        if (!resultado) return;

        await gerarPdfCalculadoraJurosCartao(
            {
                valorFatura: parseBRL(valorFatura),
                vencimento,
                diaHoje: hoje,
                diasAtraso: resultado.diasAtraso,
                multaPerc: resultado.multaPerc,
                moraPerc,
                taxaMensal: resultado.taxaMensal,
                dividaConsolidada: resultado.divConsol,
                multa: resultado.multa,
                mora: resultado.mora,
                juros: resultado.jurosDiario,
                totalJurosMulta: resultado.totalJurosMulta,
                totalGeral: resultado.totalGeral,
                responsavel,
            },
            {
                acao,
                nomeArquivo: `calculadora_juros_cartao_${new Date().toISOString().slice(0, 10)}.pdf`,
            }
        );
    }

    const labelClass =
        "mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500";
    const inputClass =
        "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm outline-none transition focus:border-[#00AE9D] focus:ring-2 focus:ring-[#00AE9D]/10";
    const moneyInputClass = `${inputClass} text-right`;
    const readOnlyClass =
        "h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 shadow-sm outline-none";
    const sectionTitleClass =
        "mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-wide text-slate-800 before:h-2 before:w-2 before:rounded-full before:bg-[#00AE9D]";
    const secondaryButtonClass =
        "inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[var(--text-darken-placeholder)] bg-white px-4 text-sm font-semibold text-[var(--title)] shadow-sm transition hover:border-primary hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer";
    const primaryButtonClass =
        "inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-secondary px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-primary disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer";

    return (
        <div className="min-w-0 mx-auto overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className={sectionTitleClass}>Dados para cálculo</h2>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div>
                    <label className={labelClass}>Valor da fatura</label>
                    <input
                        value={valorFatura}
                        onChange={(e) => setValorFatura(monetizarDigitacao(e.target.value))}
                        placeholder="R$ 0,00"
                        className={moneyInputClass}
                    />
                </div>

                <div>
                    <label className={labelClass}>Vencimento</label>
                    <input
                        type="date"
                        value={vencimento}
                        onChange={(e) => setVencimento(e.target.value)}
                        className={inputClass}
                    />
                </div>

                <div>
                    <label className={labelClass}>Dia de hoje</label>
                    <input
                        type="date"
                        value={hoje}
                        onChange={(e) => setHoje(e.target.value)}
                        className={inputClass}
                    />
                </div>

                <div>
                    <label className={labelClass}>Multa (%)</label>
                    <input value={multaPerc} readOnly className={readOnlyClass} />
                </div>

                <div>
                    <label className={labelClass}>Mora (% a.m.)</label>
                    <input value={moraPerc} readOnly className={readOnlyClass} />
                </div>

                <div>
                    <label className={labelClass}>Taxa de juros (% a.m.)</label>
                    <input value={taxaMensal} readOnly className={readOnlyClass} />
                </div>

                <div className="md:col-span-2">
                    <label className={labelClass}>Dívida consolidada</label>
                    <input
                        value={dividaConsolidada}
                        onChange={(e) => setDividaConsolidada(monetizarDigitacao(e.target.value))}
                        placeholder="R$ 0,00"
                        className={moneyInputClass}
                    />
                </div>
            </div>

                <div className="mt-4 flex flex-wrap gap-3">
                    <button type="button" onClick={calcular} className={primaryButtonClass}>Calcular</button>
                    <button type="button" onClick={limpar} className={secondaryButtonClass}>Limpar</button>
                </div>
            </div>

            {mensagem && (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800">
                    {mensagem}
                </div>
            )}

            {resultado && (
                <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h2 className={sectionTitleClass}>Resultado do cálculo</h2>

                    <div className="overflow-x-auto rounded-2xl border border-slate-200">
                        <table className="w-full text-sm">
                            <tbody className="divide-y divide-slate-100">
                                <tr><th className="bg-slate-50 px-4 py-3 text-left font-semibold text-slate-700">Dias de Atraso</th><td className="px-4 py-3 text-right font-semibold text-slate-800">{resultado.diasAtraso}</td></tr>
                                <tr><th className="bg-slate-50 px-4 py-3 text-left font-semibold text-slate-700">Multa ({resultado.multaPerc.toFixed(2)}%)</th><td className="px-4 py-3 text-right font-semibold text-slate-800">{fmtBR(resultado.multa)}</td></tr>
                                <tr><th className="bg-slate-50 px-4 py-3 text-left font-semibold text-slate-700">Mora</th><td className="px-4 py-3 text-right font-semibold text-slate-800">{fmtBR(resultado.mora)}</td></tr>
                                <tr><th className="bg-slate-50 px-4 py-3 text-left font-semibold text-slate-700">Juros ({resultado.taxaMensal.toFixed(2)}% a.m.)</th><td className="px-4 py-3 text-right font-semibold text-slate-800">{fmtBR(resultado.jurosDiario)}</td></tr>
                                <tr><th className="bg-slate-50 px-4 py-3 text-left font-semibold text-slate-700">Juros + Multa + Mora</th><td className="px-4 py-3 text-right font-semibold text-slate-800">{fmtBR(resultado.totalJurosMulta)}</td></tr>
                                <tr><th className="bg-slate-50 px-4 py-3 text-left font-semibold text-slate-700">Dívida Consolidada</th><td className="px-4 py-3 text-right font-semibold text-slate-800">{fmtBR(resultado.divConsol)}</td></tr>
                                <tr className="bg-red-50"><th className="px-4 py-3 text-left font-black text-red-700">Total a Pagar</th><td className="px-4 py-3 text-right text-lg font-black text-red-700">{fmtBR(resultado.totalGeral)}</td></tr>
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-4 rounded-2xl border border-[#00AE9D]/15 bg-[#00AE9D]/5 p-3 text-xs font-medium text-slate-700">
                        Responsável pelo cálculo: <strong>{responsavel}</strong>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-3">
                        <button
                            type="button"
                            onClick={() => gerarDocumento("print")}
                            disabled={!podeGerarDocumento}
                            className={secondaryButtonClass}
                        >
                            Imprimir
                        </button>
                        <button
                            type="button"
                            onClick={() => gerarDocumento("download")}
                            disabled={!podeGerarDocumento}
                            className={primaryButtonClass}
                        >
                            Gerar PDF
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
