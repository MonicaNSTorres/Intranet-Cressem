"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useState } from "react";
import {
    FaArrowLeft,
    FaBoxes,
    FaChartLine,
    FaDownload,
    FaExclamationTriangle,
    FaFilter,
    FaWarehouse,
} from "react-icons/fa";
import Link from "next/link";
import {
    buscarBalancoMensalEstoque,
    listarItensEstoqueConsumiveis,
} from "@/services/estoque_consumiveis.service";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
} from "recharts";

export default function BalancoEstoquePage() {
    const [loading, setLoading] = useState(false);
    const [balanco, setBalanco] = useState<any[]>([]);
    const [itens, setItens] = useState<any[]>([]);
    const [ano, setAno] = useState(new Date().getFullYear());
    const [mes, setMes] = useState(new Date().getMonth() + 1);
    const [produtoFiltro, setProdutoFiltro] = useState("");

    async function carregarDados() {
        try {
            setLoading(true);

            const [respBalanco, respItens] = await Promise.all([
                buscarBalancoMensalEstoque(ano, mes),
                listarItensEstoqueConsumiveis(),
            ]);

            setBalanco(Array.isArray(respBalanco?.items) ? respBalanco.items : []);
            setItens(Array.isArray(respItens?.items) ? respItens.items : []);
        } catch (error) {
            console.error("Erro ao carregar balanço:", error);
            setBalanco([]);
            setItens([]);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        carregarDados();
    }, [ano, mes]);

    const balancoFiltrado = useMemo(() => {
        if (!produtoFiltro.trim()) return balanco;

        const termo = produtoFiltro.toLowerCase();

        return balanco.filter((item) =>
            String(item?.NM_ITEM || "").toLowerCase().includes(termo)
        );
    }, [balanco, produtoFiltro]);

    const totalEntradas = useMemo(() => {
        return balancoFiltrado.reduce(
            (acc, item) => acc + Number(item.TOTAL_ENTRADAS || 0),
            0
        );
    }, [balancoFiltrado]);

    const totalSaidas = useMemo(() => {
        return balancoFiltrado.reduce(
            (acc, item) => acc + Number(item.TOTAL_SAIDAS || 0),
            0
        );
    }, [balancoFiltrado]);

    const itensCriticos = useMemo(() => {
        return itens.filter(
            (item) =>
                Number(item.QT_SALDO_ATUAL || 0) <= Number(item.QT_SALDO_MINIMO || 0)
        );
    }, [itens]);

    const rankingConsumo = useMemo(() => {
        return [...balancoFiltrado]
            .sort((a, b) => Number(b.TOTAL_SAIDAS || 0) - Number(a.TOTAL_SAIDAS || 0))
            .slice(0, 5);
    }, [balancoFiltrado]);

    function exportarExcelSimples() {
        const linhas = [
            ["Item", "Unidade", "Entradas", "Saídas", "Saldo atual"],
            ...balancoFiltrado.map((item) => [
                item.NM_ITEM,
                item.DS_UNIDADE,
                item.TOTAL_ENTRADAS,
                item.TOTAL_SAIDAS,
                item.QT_SALDO_ATUAL,
            ]),
        ];

        const csv = "\uFEFF" + linhas.map((linha) => linha.join(";")).join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.download = `balanco-estoque-${mes}-${ano}.csv`;
        link.click();

        URL.revokeObjectURL(url);
    }

    const itensConsumoAlto = useMemo(() => {
        return balancoFiltrado.filter((item) => {
            const saidas = Number(item.TOTAL_SAIDAS || 0);
            const saldoAtual = Number(item.QT_SALDO_ATUAL || 0);

            return saidas > 0 && saldoAtual > 0 && saidas >= saldoAtual;
        });
    }, [balancoFiltrado]);

    return (
        <div className="min-h-screen bg-[#F8FAFC] p-6 lg:p-8">
            <div className="mx-auto min-w-225 space-y-6">
                <div className="relative overflow-hidden rounded-4xl border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(0,174,157,0.18),_transparent_34%),radial-gradient(circle_at_bottom_left,_rgba(121,183,41,0.16),_transparent_30%)]" />

                    <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex items-start gap-4">
                            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-linear-to-br from-[#00AE9D] to-[#79B729] text-white shadow-xl shadow-[#00AE9D]/20">
                                <FaChartLine className="text-[26px]" />
                            </div>

                            <div>
                                <div className="inline-flex rounded-full border border-[#00AE9D]/15 bg-[#00AE9D]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.20em] text-[#00AE9D]">
                                    Dashboard gerencial
                                </div>

                                <h1 className="mt-2 text-3xl font-bold text-slate-800">
                                    Balanço de Estoque
                                </h1>

                                <p className="mt-1 text-sm text-slate-500">
                                    Acompanhe entradas, saídas, consumo mensal e itens críticos.
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={exportarExcelSimples}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#00AE9D] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#00AE9D]/20 transition hover:bg-[#009688]"
                        >
                            <FaDownload />
                            Exportar Excel
                        </button>
                    </div>
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                                <FaFilter />
                                Filtros
                            </div>
                            <p className="mt-2 text-sm text-slate-500">
                                Selecione o período e filtre por produto.
                            </p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3">
                            <select
                                value={mes}
                                onChange={(e) => setMes(Number(e.target.value))}
                                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#00AE9D]"
                            >
                                <option value={1}>Janeiro</option>
                                <option value={2}>Fevereiro</option>
                                <option value={3}>Março</option>
                                <option value={4}>Abril</option>
                                <option value={5}>Maio</option>
                                <option value={6}>Junho</option>
                                <option value={7}>Julho</option>
                                <option value={8}>Agosto</option>
                                <option value={9}>Setembro</option>
                                <option value={10}>Outubro</option>
                                <option value={11}>Novembro</option>
                                <option value={12}>Dezembro</option>
                            </select>

                            <input
                                type="number"
                                value={ano}
                                onChange={(e) => setAno(Number(e.target.value))}
                                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#00AE9D]"
                                placeholder="Ano"
                            />

                            <input
                                value={produtoFiltro}
                                onChange={(e) => setProdutoFiltro(e.target.value)}
                                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#00AE9D]"
                                placeholder="Filtrar produto"
                            />
                        </div>
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                    <KpiCard
                        title="Itens no balanço"
                        value={balancoFiltrado.length}
                        icon={<FaWarehouse />}
                    />

                    <KpiCard title="Total de entradas" value={totalEntradas} icon={<FaBoxes />} />

                    <KpiCard title="Total de saídas" value={totalSaidas} icon={<FaChartLine />} />

                    <KpiCard
                        title="Itens críticos"
                        value={itensCriticos.length}
                        icon={<FaExclamationTriangle />}
                        danger={itensCriticos.length > 0}
                    />

                    <KpiCard
                        title="Consumo alto"
                        value={itensConsumoAlto.length}
                        icon={<FaExclamationTriangle />}
                        danger={itensConsumoAlto.length > 0}
                    />
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">
                                Entradas x Saídas por produto
                            </h2>
                            <p className="mt-1 text-sm text-slate-500">
                                Comparativo visual das movimentações no mês selecionado.
                            </p>
                        </div>

                        <span className="rounded-full bg-[#00AE9D]/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-[#00AE9D]">
                            {String(mes).padStart(2, "0")}/{ano}
                        </span>
                    </div>

                    <div className="mt-6 h-90">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={balancoFiltrado}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="NM_ITEM" />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="TOTAL_ENTRADAS" name="Entradas" />
                                <Bar dataKey="TOTAL_SAIDAS" name="Saídas" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="grid gap-6 xl:grid-cols-2">
                    <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                        <h2 className="text-xl font-bold text-slate-800">
                            Ranking de consumo
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                            Produtos com maior saída no período filtrado.
                        </p>

                        <div className="mt-5 space-y-3">
                            {rankingConsumo.map((item, index) => (
                                <div
                                    key={item.ID_ITEM}
                                    className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                                >
                                    <div>
                                        <p className="text-sm font-bold text-slate-800">
                                            {index + 1}. {item.NM_ITEM}
                                        </p>
                                        <p className="text-xs text-slate-500">{item.DS_UNIDADE}</p>
                                    </div>

                                    <span className="rounded-full bg-[#00AE9D]/10 px-3 py-1 text-sm font-bold text-[#00AE9D]">
                                        {item.TOTAL_SAIDAS} saída(s)
                                    </span>
                                </div>
                            ))}

                            {!rankingConsumo.length && (
                                <div className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                                    Nenhum consumo encontrado.
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                        <h2 className="text-xl font-bold text-slate-800">
                            Itens abaixo do mínimo
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                            Produtos que precisam de atenção.
                        </p>

                        <div className="mt-5 space-y-3">
                            {itensCriticos.map((item) => (
                                <div
                                    key={item.ID_ITEM}
                                    className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3"
                                >
                                    <p className="text-sm font-bold text-red-700">{item.NM_ITEM}</p>
                                    <p className="mt-1 text-xs text-red-600">
                                        Saldo atual: {item.QT_SALDO_ATUAL} • Mínimo:{" "}
                                        {item.QT_SALDO_MINIMO}
                                    </p>
                                </div>
                            ))}

                            {!itensCriticos.length && (
                                <div className="rounded-2xl bg-emerald-50 px-4 py-8 text-center text-sm font-semibold text-emerald-700">
                                    Nenhum item crítico no momento.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                    <h2 className="text-xl font-bold text-slate-800">
                        Detalhamento do balanço
                    </h2>

                    <div className="mt-5 overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-slate-50">
                                <tr className="text-left text-slate-600">
                                    <th className="px-4 py-3">Item</th>
                                    <th className="px-4 py-3">Unidade</th>
                                    <th className="px-4 py-3">Entradas</th>
                                    <th className="px-4 py-3">Saídas</th>
                                    <th className="px-4 py-3">Saldo atual</th>
                                </tr>
                            </thead>

                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                                            Carregando...
                                        </td>
                                    </tr>
                                ) : (
                                    balancoFiltrado.map((item) => (
                                        <tr key={item.ID_ITEM} className="border-t border-slate-100">
                                            <td className="px-4 py-3 font-semibold text-slate-800">
                                                {item.NM_ITEM}
                                            </td>
                                            <td className="px-4 py-3">{item.DS_UNIDADE}</td>
                                            <td className="px-4 py-3">{item.TOTAL_ENTRADAS}</td>
                                            <td className="px-4 py-3">{item.TOTAL_SAIDAS}</td>
                                            <td className="px-4 py-3">{item.QT_SALDO_ATUAL}</td>
                                        </tr>
                                    ))
                                )}

                                {!loading && !balancoFiltrado.length && (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                                            Nenhum dado encontrado para o filtro selecionado.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

function KpiCard({
    title,
    value,
    icon,
    danger = false,
}: {
    title: string;
    value: number;
    icon: React.ReactNode;
    danger?: boolean;
}) {
    return (
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    {title}
                </p>

                <div
                    className={`flex h-11 w-11 items-center justify-center rounded-2xl ${danger ? "bg-red-50 text-red-600" : "bg-[#00AE9D]/10 text-[#00AE9D]"
                        }`}
                >
                    {icon}
                </div>
            </div>

            <h3
                className={`mt-3 text-4xl font-black ${danger ? "text-red-600" : "text-slate-800"
                    }`}
            >
                {value}
            </h3>
        </div>
    );
}