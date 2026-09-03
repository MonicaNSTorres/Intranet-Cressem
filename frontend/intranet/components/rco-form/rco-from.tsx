"use client";

import { useEffect, useState } from "react";
import { fmtBRL, monetizarDigitacao, parseBRL } from "@/utils/br";
import {
    listarOrigensRco,
    buscarValorBaseRco,
    processarRco,
} from "@/services/rco.service";

function hojeISO() {
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const labelClass = "mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500";
const fieldClass =
    "h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/15";
const readOnlyClass =
    "h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 shadow-sm outline-none";
const sectionClass = "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm";
const sectionTitleClass = "flex items-center gap-2 text-base font-semibold text-title";

export function RcoForm() {
    const [tipos, setTipos] = useState<string[]>([]);
    const [tipo, setTipo] = useState("");

    const [valorContratado, setValorContratado] = useState("");
    const [valorBaseRco, setValorBaseRco] = useState(""); // readOnly em formato BRL

    const [dataOperacao, setDataOperacao] = useState("");
    const [dataUltima, setDataUltima] = useState("");
    const [dataHoje, setDataHoje] = useState("");

    const [processoRco, setProcessoRco] = useState(""); // resultado final em BRL

    const [loading, setLoading] = useState(false);
    const [erro, setErro] = useState<string | null>(null);

    useEffect(() => {
        const init = async () => {
            setErro(null);
            setDataHoje(hojeISO());

            try {
                const origens = await listarOrigensRco();
                setTipos(origens || []);
            } catch (e: unknown) {
                const message = e instanceof Error ? e.message : "Falha ao carregar tipos de crédito.";
                setErro(message);
            }
        };

        init();
    }, []);

    const carregarValorBase = async (origemParam?: string) => {
        const origem = (origemParam ?? tipo).trim();
        const valor = parseBRL(valorContratado);

        if (!origem || !valor) {
            setValorBaseRco("");
            return;
        }

        setErro(null);
        setLoading(true);

        try {
            const fator = await buscarValorBaseRco(origem, valor);

            // Ajuste aqui caso o backend retorne outro nome de campo
            const baseNum = Number(fator?.VL_RETORNO ?? fator?.vl_retorno ?? 0);

            if (!baseNum) {
                setValorBaseRco("");
                setErro("Não foi possível calcular o valor base para essa faixa.");
                return;
            }

            setValorBaseRco(fmtBRL(baseNum));
        } catch (e: unknown) {
            setValorBaseRco("");
            const message = e instanceof Error ? e.message : "Falha ao buscar valor base RCO.";
            setErro(message);
        } finally {
            setLoading(false);
        }
    };

    const validar = () => {
        if (!tipo) return "Selecione o tipo de crédito.";
        if (!valorContratado) return "Preencha o valor contratado.";
        if (!valorBaseRco) return "Valor base RCO não preenchido.";
        if (!dataOperacao) return "Preencha a data da operação.";
        if (!dataUltima) return "Preencha a data da última parcela.";
        if (!dataHoje) return "Preencha a data de hoje do saldo devedor.";
        return null;
    };

    const onProcessar = async () => {
        const msg = validar();
        if (msg) {
            setErro(msg);
            return;
        }

        setErro(null);
        setLoading(true);

        try {
            const valorBaseNum = parseBRL(valorBaseRco);

            const resultado = await processarRco(
                dataOperacao,
                dataUltima,
                valorBaseNum,
                dataHoje
            );

            setProcessoRco(fmtBRL(Number(resultado || 0)));
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : "Falha ao processar RCO.";
            setErro(message);
            setProcessoRco("");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm">
            <div className="h-1 bg-gradient-to-r from-primary via-secondary to-third" />

            <div className="space-y-5 p-5 md:p-6">
                {erro && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                        {erro}
                    </div>
                )}

                <section className={sectionClass}>
                    <div className="mb-4">
                        <h2 className={sectionTitleClass}>
                            <span className="h-2 w-2 rounded-full bg-primary" />
                            Dados da operação
                        </h2>
                        <p className="mt-1 text-sm text-paragraph">
                            Selecione o tipo de crédito e informe o valor contratado para carregar a base RCO.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <div>
                            <label className={labelClass}>Tipo de crédito</label>
                            <select
                                value={tipo}
                                onChange={(e) => {
                                    const novoTipo = e.target.value;
                                    setTipo(novoTipo);
                                    void carregarValorBase(novoTipo);
                                }}
                                className={fieldClass}
                            >
                                <option value="">Selecione</option>
                                {tipos.map((t) => (
                                    <option key={t} value={t}>
                                        {t}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className={labelClass}>Valor contratado</label>
                            <input
                                value={valorContratado}
                                onChange={(e) => setValorContratado(monetizarDigitacao(e.target.value))}
                                onBlur={() => void carregarValorBase()}
                                placeholder="R$ 0,00"
                                inputMode="numeric"
                                className={`${fieldClass} text-right`}
                            />
                        </div>

                        <div>
                            <label className={labelClass}>Valor base (RCO)</label>
                            <input
                                value={valorBaseRco}
                                readOnly
                                className={`${readOnlyClass} text-right`}
                            />
                        </div>
                    </div>
                </section>

                <section className={sectionClass}>
                    <div className="mb-4">
                        <h2 className={sectionTitleClass}>
                            <span className="h-2 w-2 rounded-full bg-primary" />
                            Datas para cálculo
                        </h2>
                        <p className="mt-1 text-sm text-paragraph">
                            Informe as datas usadas no processamento do saldo devedor.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <div>
                            <label className={labelClass}>Data operação</label>
                            <input
                                type="date"
                                value={dataOperacao}
                                onChange={(e) => setDataOperacao(e.target.value)}
                                className={fieldClass}
                            />
                        </div>

                        <div>
                            <label className={labelClass}>Data última parcela</label>
                            <input
                                type="date"
                                value={dataUltima}
                                onChange={(e) => setDataUltima(e.target.value)}
                                className={fieldClass}
                            />
                        </div>

                        <div>
                            <label className={labelClass}>Data hoje (saldo devedor)</label>
                            <input
                                type="date"
                                value={dataHoje}
                                onChange={(e) => setDataHoje(e.target.value)}
                                className={fieldClass}
                            />
                        </div>
                    </div>
                </section>

                <section className={sectionClass}>
                    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                        <div className="min-w-0">
                            <h2 className={sectionTitleClass}>
                                <span className="h-2 w-2 rounded-full bg-primary" />
                                Resultado
                            </h2>
                            <p className="mt-1 text-sm text-paragraph">
                                Processe os dados para visualizar o custo da operação.
                            </p>
                        </div>

                        <div className="grid w-full grid-cols-1 gap-3 md:max-w-xl md:grid-cols-[auto_1fr] md:items-end">
                            <button
                                type="button"
                                onClick={onProcessar}
                                disabled={loading}
                                className="inline-flex h-10 items-center justify-center rounded-xl bg-secondary px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary disabled:cursor-not-allowed disabled:bg-slate-300"
                            >
                                {loading ? "Processando..." : "Processar"}
                            </button>

                            <div>
                                <label className={labelClass}>Custo da operação</label>
                                <input
                                    value={processoRco}
                                    readOnly
                                    className={`${readOnlyClass} text-right font-semibold text-primary`}
                                />
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}