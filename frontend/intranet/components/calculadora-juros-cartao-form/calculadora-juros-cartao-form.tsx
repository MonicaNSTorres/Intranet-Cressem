"use client";

import { monetizarDigitacao } from "@/utils/br";
import { useState } from "react";

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
    const [taxaMensal, setTaxaMensal] = useState(7.5);
    const [dividaConsolidada, setDividaConsolidada] = useState("");
    const [mensagem, setMensagem] = useState<string | null>(null);
    const [resultado, setResultado] = useState<Resultado | null>(null);

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
        setTaxaMensal(7.5);
        setDividaConsolidada("");
        setMensagem(null);
        setResultado(null);
    }

    return (
        <div className="min-w-225 mx-auto p-6 bg-white rounded-xl shadow">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Valor da fatura</label>
                    <input
                        value={valorFatura}
                        onChange={(e) => setValorFatura(monetizarDigitacao(e.target.value))}
                        placeholder="R$ 0,00"
                        className="w-full border px-3 py-2 rounded"
                    />
                </div>

                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Vencimento</label>
                    <input
                        type="date"
                        value={vencimento}
                        onChange={(e) => setVencimento(e.target.value)}
                        className="w-full border px-3 py-2 rounded"
                    />
                </div>

                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Dia de hoje</label>
                    <input
                        type="date"
                        value={hoje}
                        onChange={(e) => setHoje(e.target.value)}
                        className="w-full border px-3 py-2 rounded"
                    />
                </div>

                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Multa (%)</label>
                    <input value={multaPerc} readOnly className="w-full border px-3 py-2 rounded bg-gray-50" />
                </div>

                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Mora (% a.m.)</label>
                    <input value={moraPerc} readOnly className="w-full border px-3 py-2 rounded bg-gray-50" />
                </div>

                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Taxa de juros (% a.m.)</label>
                    <input value={taxaMensal} readOnly className="w-full border px-3 py-2 rounded bg-gray-50" />
                </div>

                <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Dívida consolidada</label>
                    <input
                        value={dividaConsolidada}
                        onChange={(e) => setDividaConsolidada(monetizarDigitacao(e.target.value))}
                        placeholder="R$ 0,00"
                        className="w-full border px-3 py-2 rounded"
                    />
                </div>
            </div>

            <div className="mt-4 flex gap-3">
                <button onClick={calcular} className="bg-secondary text-white px-5 py-2 rounded hover:bg-primary">Calcular</button>
                <button onClick={limpar} className="bg-white border px-5 py-2 rounded hover:bg-gray-50">Limpar</button>
            </div>

            {mensagem && <p className="mt-4 text-sm font-medium">{mensagem}</p>}

            {resultado && (
                <div className="mt-6 overflow-x-auto">
                    <table className="w-full border border-gray-200">
                        <tbody>
                            <tr><th className="border p-2 text-left">Dias de Atraso</th><td className="border p-2">{resultado.diasAtraso}</td></tr>
                            <tr><th className="border p-2 text-left">Multa ({resultado.multaPerc.toFixed(2)}%)</th><td className="border p-2">{fmtBR(resultado.multa)}</td></tr>
                            <tr><th className="border p-2 text-left">Mora</th><td className="border p-2">{fmtBR(resultado.mora)}</td></tr>
                            <tr><th className="border p-2 text-left">Juros ({resultado.taxaMensal.toFixed(2)}% a.m.)</th><td className="border p-2">{fmtBR(resultado.jurosDiario)}</td></tr>
                            <tr><th className="border p-2 text-left">Juros + Multa + Mora</th><td className="border p-2">{fmtBR(resultado.totalJurosMulta)}</td></tr>
                            <tr><th className="border p-2 text-left">Dívida Consolidada</th><td className="border p-2">{fmtBR(resultado.divConsol)}</td></tr>
                            <tr className="bg-red-50 font-semibold"><th className="border p-2 text-left">Total a Pagar</th><td className="border p-2">{fmtBR(resultado.totalGeral)}</td></tr>
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
