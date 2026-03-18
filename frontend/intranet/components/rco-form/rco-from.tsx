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
        <div className="min-w-225 mx-auto p-6 bg-white rounded-xl shadow">
            {erro && (
                <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
                    {erro}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de crédito</label>
                    <select
                        value={tipo}
                        onChange={(e) => {
                            const novoTipo = e.target.value;
                            setTipo(novoTipo);
                            void carregarValorBase(novoTipo);
                        }}
                        className="w-full border px-3 py-2 rounded"
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
                    <label className="block text-xs font-medium text-gray-600 mb-1">Valor contratado</label>
                    <input
                        value={valorContratado}
                        onChange={(e) => setValorContratado(monetizarDigitacao(e.target.value))}
                        onBlur={() => void carregarValorBase()}
                        placeholder="R$ 0,00"
                        inputMode="numeric"
                        className="w-full border px-3 py-2 rounded"
                    />
                </div>

                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Valor Base (RCO)</label>
                    <input
                        value={valorBaseRco}
                        readOnly
                        className="w-full border px-3 py-2 rounded bg-gray-50"
                    />
                </div>

                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Data operação</label>
                    <input
                        type="date"
                        value={dataOperacao}
                        onChange={(e) => setDataOperacao(e.target.value)}
                        className="w-full border px-3 py-2 rounded"
                    />
                </div>

                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Data última parcela</label>
                    <input
                        type="date"
                        value={dataUltima}
                        onChange={(e) => setDataUltima(e.target.value)}
                        className="w-full border px-3 py-2 rounded"
                    />
                </div>

                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Data hoje (saldo devedor)</label>
                    <input
                        type="date"
                        value={dataHoje}
                        onChange={(e) => setDataHoje(e.target.value)}
                        className="w-full border px-3 py-2 rounded"
                    />
                </div>
            </div>

            <div className="pt-5 border-t mt-6 flex items-center gap-3 justify-between">
                <button
                    type="button"
                    onClick={onProcessar}
                    disabled={loading}
                    className="bg-secondary hover:bg-primary disabled:opacity-60 text-white font-semibold px-5 py-2 rounded shadow"
                >
                    {loading ? "Processando..." : "Processar"}
                </button>

                <div className="w-full max-w-xs">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Custo da operação</label>
                    <input
                        value={processoRco}
                        readOnly
                        className="w-full border px-3 py-2 rounded bg-gray-50 text-right"
                    />
                </div>
            </div>
        </div>
    );
}
