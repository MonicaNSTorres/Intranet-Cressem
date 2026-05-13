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
    listarMovimentacoesMensaisEstoque,
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
import BackButton from "@/components/back-button/back-button";
import {
    canAccess,
    PAGE_ACCESS,
    type AuthUserLike,
} from "@/lib/access-control";
import { getMeAdUser } from "@/services/auth.service";

export default function BalancoEstoquePage() {
    const [loading, setLoading] = useState(false);
    const [allowed, setAllowed] = useState(false);
    const [balanco, setBalanco] = useState<any[]>([]);
    const [itens, setItens] = useState<any[]>([]);
    const [movimentacoes, setMovimentacoes] = useState<any[]>([]);
    const [ano, setAno] = useState(new Date().getFullYear());
    const [mes, setMes] = useState(new Date().getMonth() + 1);
    const [produtoFiltro, setProdutoFiltro] = useState("");
    const [openDetalhamento, setOpenDetalhamento] = useState(false);
    const [openHistorico, setOpenHistorico] = useState(false);

    async function carregarDados() {
        try {
            setLoading(true);

            const [respBalanco, respItens, respMovimentacoes] = await Promise.all([
                buscarBalancoMensalEstoque(ano, mes),
                listarItensEstoqueConsumiveis(),
                listarMovimentacoesMensaisEstoque(ano, mes),
            ]);

            setBalanco(Array.isArray(respBalanco?.items) ? respBalanco.items : []);
            setItens(Array.isArray(respItens?.items) ? respItens.items : []);
            setMovimentacoes(Array.isArray(respMovimentacoes?.items) ? respMovimentacoes.items : []);
        } catch (error) {
            console.error("Erro ao carregar balanço:", error);
            setBalanco([]);
            setItens([]);
            setMovimentacoes([]);
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

    function exportarDetalhamentoBalanco() {
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
        link.download = `detalhamento-balanco-${mes}-${ano}.csv`;
        link.click();

        URL.revokeObjectURL(url);
    }

    function exportarHistoricoSaidas() {
        const linhas = [
            [
                "Data",
                "Chamado GLPI",
                "Item",
                "Quantidade",
                "Solicitante",
                "Setor",
                "Responsável baixa",
                "Observação",
            ],
            ...saidasPorSolicitante.map((mov) => [
                mov.DT_MOVIMENTACAO
                    ? new Date(mov.DT_MOVIMENTACAO).toLocaleString("pt-BR")
                    : "-",
                mov.ID_CHAMADO_GLPI || "-",
                mov.NM_ITEM,
                `${mov.QT_MOVIMENTACAO} ${mov.DS_UNIDADE || ""}`,
                mov.NM_SOLICITANTE || "-",
                mov.NM_SETOR || "-",
                mov.NM_USUARIO_BAIXA || "-",
                mov.DS_OBSERVACAO || "-",
            ]),
        ];

        const csv = "\uFEFF" + linhas.map((linha) => linha.join(";")).join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.download = `historico-saidas-${mes}-${ano}.csv`;
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

    const saidasPorSolicitante = useMemo(() => {
        return movimentacoes
            .filter((mov) => mov.TP_MOVIMENTACAO === "SAIDA")
            .filter((mov) => {
                if (!produtoFiltro.trim()) return true;

                return String(mov.NM_ITEM || "")
                    .toLowerCase()
                    .includes(produtoFiltro.toLowerCase());
            });
    }, [movimentacoes, produtoFiltro]);

    useEffect(() => {
        async function validarAcesso() {
            try {
                const user = (await getMeAdUser()) as AuthUserLike;

                setAllowed(canAccess(user, PAGE_ACCESS.balanco));
            } catch (error) {
                console.error(error);
                setAllowed(false);
            } finally {
                setLoading(false);
            }
        }

        validarAcesso();
    }, []);

    if (loading) {
        return (
            <div className="p-6 text-sm text-gray-500">
                Carregando...
            </div>
        );
    }

    if (!allowed) {
        return (
            <div className="p-6">
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    Você não possui permissão para acessar esta tela.
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] p-6 lg:p-8">
            <div className="mx-auto min-w-225 space-y-6">
                <BackButton />
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

                        {/*<button
                            onClick={exportarExcelSimples}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#00AE9D] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#00AE9D]/20 transition hover:bg-[#009688]"
                        >
                            <FaDownload />
                            Exportar Excel
                        </button>*/}
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

                <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">
                                Entradas x Saídas por produto
                            </h2>
                            <p className="mt-1 text-sm text-slate-500">
                                Comparativo visual das movimentações no mês selecionado.
                            </p>

                            <div className="mt-4 flex flex-wrap gap-3">
                                <span className="inline-flex items-center gap-2 rounded-full bg-[#00AE9D]/10 px-3 py-1 text-xs font-bold text-secondary">
                                    <span className="h-2.5 w-2.5 rounded-full bg-secondary" />
                                    Entradas
                                </span>

                                <span className="inline-flex items-center gap-2 rounded-full bg-[#49479D]/10 px-3 py-1 text-xs font-bold text-[#49479D]">
                                    <span className="h-2.5 w-2.5 rounded-full bg-[#49479D]" />
                                    Saídas
                                </span>
                            </div>
                        </div>

                        <span className="rounded-full bg-[#00AE9D]/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-[#00AE9D]">
                            {String(mes).padStart(2, "0")}/{ano}
                        </span>
                    </div>

                    <div className="mt-6 h-[390px] rounded-3xl border border-slate-100 bg-linear-to-br from-slate-50 to-white p-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={balancoFiltrado}
                                barGap={8}
                                barCategoryGap="28%"
                                margin={{ top: 20, right: 24, left: 0, bottom: 20 }}
                            >
                                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#E2E8F0" />

                                <XAxis
                                    dataKey="NM_ITEM"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 12, fill: "#64748B", fontWeight: 600 }}
                                />

                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 12, fill: "#64748B" }}
                                />

                                <Tooltip
                                    cursor={{ fill: "rgba(15, 23, 42, 0.04)" }}
                                    contentStyle={{
                                        borderRadius: "16px",
                                        border: "1px solid #E2E8F0",
                                        boxShadow: "0 12px 30px rgba(15,23,42,0.12)",
                                        fontSize: "12px",
                                    }}
                                />

                                <Bar
                                    dataKey="TOTAL_ENTRADAS"
                                    name="Entradas"
                                    fill="var(--secondary)"
                                    radius={[10, 10, 0, 0]}
                                />

                                <Bar
                                    dataKey="TOTAL_SAIDAS"
                                    name="Saídas"
                                    fill="var(--fourth)"
                                    radius={[10, 10, 0, 0]}
                                />
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

                                    <span className="rounded-full bg-[#00AE9D]/10 px-3 py-1 text-sm font-bold text-secondary">
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

                <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
                    <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                        <button
                            type="button"
                            onClick={() => setOpenDetalhamento((prev) => !prev)}
                            className="flex flex-1 items-center justify-between text-left cursor-pointer"
                        >
                            <div>
                                <h2 className="text-xl font-bold text-slate-800">
                                    Detalhamento do balanço
                                </h2>
                                <p className="mt-1 text-sm text-slate-500">
                                    Clique para {openDetalhamento ? "recolher" : "visualizar"} o resumo detalhado de entradas, saídas e saldo.
                                </p>
                            </div>

                            <span className="ml-4 rounded-full bg-slate-100 px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                                {openDetalhamento ? "Recolher" : "Abrir"}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={exportarDetalhamentoBalanco}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#00AE9D]/20 bg-[#00AE9D]/10 px-4 py-2 text-sm font-semibold text-secondary transition hover:bg-secondary hover:text-white cursor-pointer"
                        >
                            <FaDownload />
                            Exportar relatório
                        </button>
                    </div>

                    {openDetalhamento && (
                        <div className="border-t border-slate-100 p-5">
                            <div className="overflow-x-auto">
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
                    )}
                </div>

                <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
                    <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                        <button
                            type="button"
                            onClick={() => setOpenHistorico((prev) => !prev)}
                            className="flex flex-1 items-center justify-between text-left cursor-pointer"
                        >
                            <div>
                                <h2 className="text-xl font-bold text-slate-800">
                                    Histórico de saídas por solicitante
                                </h2>
                                <p className="mt-1 text-sm text-slate-500">
                                    Veja quem solicitou cada saída registrada no estoque no período selecionado.
                                </p>
                            </div>

                            <span className="ml-4 rounded-full bg-red-50 px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-red-600">
                                {saidasPorSolicitante.length} saída(s) • {openHistorico ? "Recolher" : "Abrir"}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={exportarHistoricoSaidas}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-500 hover:text-white cursor-pointer"
                        >
                            <FaDownload />
                            Exportar relatório
                        </button>
                    </div>

                    {openHistorico && (
                        <div className="border-t border-slate-100 p-5">
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                    <thead className="bg-slate-50">
                                        <tr className="text-left text-slate-600">
                                            <th className="px-4 py-3">Data</th>
                                            <th className="px-4 py-3">Chamado GLPI</th>
                                            <th className="px-4 py-3">Item</th>
                                            <th className="px-4 py-3">Quantidade</th>
                                            <th className="px-4 py-3">Solicitante</th>
                                            <th className="px-4 py-3">Setor</th>
                                            <th className="px-4 py-3">Responsável baixa</th>
                                            <th className="px-4 py-3">Observação</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {loading ? (
                                            <tr>
                                                <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                                                    Carregando...
                                                </td>
                                            </tr>
                                        ) : (
                                            saidasPorSolicitante.map((mov) => (
                                                <tr key={mov.ID_MOVIMENTACAO} className="border-t border-slate-100">
                                                    <td className="px-4 py-3">
                                                        {mov.DT_MOVIMENTACAO
                                                            ? new Date(mov.DT_MOVIMENTACAO).toLocaleString("pt-BR")
                                                            : "-"}
                                                    </td>

                                                    <td className="px-4 py-3 font-semibold text-slate-800">
                                                        {mov.ID_CHAMADO_GLPI || "-"}
                                                    </td>

                                                    <td className="px-4 py-3 font-semibold text-slate-800">
                                                        {mov.NM_ITEM}
                                                    </td>

                                                    <td className="px-4 py-3">
                                                        <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-600">
                                                            {mov.QT_MOVIMENTACAO} {mov.DS_UNIDADE || ""}
                                                        </span>
                                                    </td>

                                                    <td className="px-4 py-3">
                                                        {mov.NM_SOLICITANTE || "-"}
                                                    </td>

                                                    <td className="px-4 py-3">
                                                        {mov.NM_SETOR || "-"}
                                                    </td>

                                                    <td className="px-4 py-3">
                                                        {mov.NM_USUARIO_BAIXA || "-"}
                                                    </td>

                                                    <td className="px-4 py-3 max-w-[320px] truncate">
                                                        {mov.DS_OBSERVACAO || "-"}
                                                    </td>
                                                </tr>
                                            ))
                                        )}

                                        {!loading && !saidasPorSolicitante.length && (
                                            <tr>
                                                <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                                                    Nenhuma saída encontrada para o período selecionado.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
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
                    className={`flex h-11 w-11 items-center justify-center rounded-2xl ${danger ? "bg-red-50 text-red-600" : "bg-[#00AE9D]/10 text-secondary"
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