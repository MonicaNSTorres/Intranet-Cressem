"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

//import { useMemo, useState } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
    FaChevronLeft,
    FaChevronRight,
    FaEdit,
    FaPlus,
    FaSearch,
    FaTimes,
    FaTrash,
} from "react-icons/fa";
import {
    buscarFeriasPaginado,
    excluirPeriodoFerias,
    type FuncionarioFeriasListItem,
    type PeriodoFeriasListItem,
} from "@/services/gerenciamento_ferias.service";

function capitalizeWords(value?: string | null) {
    return String(value || "")
        .toLocaleLowerCase("pt-BR")
        .replace(
            /(^|\s|-|\/)\p{L}/gu,
            (char) => char.toLocaleUpperCase("pt-BR")
        );
}

function formatarCpfView(value?: string | null) {
    const digits = String(value || "").replace(/\D/g, "").slice(0, 11);

    return digits
        .replace(/^(\d{3})(\d)/, "$1.$2")
        .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
        .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

function formatarDataBrasil(data?: string | null) {
    if (!data) return "";
    if (data.includes("/")) return data;

    const [ano, mes, dia] = data.slice(0, 10).split("-");
    if (!ano || !mes || !dia) return data;

    return `${dia}/${mes}/${ano}`;
}

export function GerenciamentoFeriasForm() {
    const router = useRouter();

    const [busca, setBusca] = useState("");
    const [funcionarios, setFuncionarios] = useState<FuncionarioFeriasListItem[]>([]);
    const [paginaAtual, setPaginaAtual] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalFuncionarios, setTotalFuncionarios] = useState(0);
    const [limitePorPagina, setLimitePorPagina] = useState(10);

    const [loadingTabela, setLoadingTabela] = useState(false);
    const [erro, setErro] = useState("");
    const [info, setInfo] = useState("");

    const [modalOpen, setModalOpen] = useState(false);
    const [funcionarioSelecionado, setFuncionarioSelecionado] =
        useState<FuncionarioFeriasListItem | null>(null);

    async function carregarFuncionarios(
        page = 1,
        limit = limitePorPagina
    ) {
        try {
            setLoadingTabela(true);
            setErro("");
            setInfo("");

            const response = await buscarFeriasPaginado({
                nome: busca || " ",
                page,
                limit,
            });

            setFuncionarios(response.items || []);
            setTotalFuncionarios(response.total_items || 0);
            setTotalPages(response.total_pages || 1);
            setPaginaAtual(response.current_page || page);
        } catch (e: any) {
            console.error(e);
            setFuncionarios([]);
            setTotalFuncionarios(0);

            setErro(
                e?.response?.data?.error ||
                e?.response?.data?.details ||
                "Não foi possível carregar os funcionários."
            );
        } finally {
            setLoadingTabela(false);
        }
    }

    function limparBusca() {
        setBusca("");
        setFuncionarios([]);
        setPaginaAtual(1);
        setTotalPages(1);
        setTotalFuncionarios(0);
        setErro("");
        setInfo("");
    }

    function abrirModalInfo(funcionario: FuncionarioFeriasListItem) {
        setFuncionarioSelecionado(funcionario);
        setErro("");
        setInfo("");
        setModalOpen(true);
    }

    function fecharModal() {
        setModalOpen(false);
        setFuncionarioSelecionado(null);
        setErro("");
        setInfo("");
    }

    function irParaCadastro() {
        router.push("/auth/cadastro_ferias");
    }

    function irParaEdicao(idFuncionario: number, idPeriodo: number) {
        router.push(`/auth/cadastro_ferias?id=${idFuncionario}&periodoId=${idPeriodo}`);
    }

    async function excluirPeriodo(
        idPeriodo: number,
        idFuncionario: number,
        snEfetuado: number
    ) {
        if (Number(snEfetuado) === 1) return;

        const confirmou = window.confirm("Confirma excluir este período de férias?");
        if (!confirmou) return;

        try {
            setErro("");
            setInfo("");

            await excluirPeriodoFerias(idPeriodo);

            setInfo("Período de férias excluído com sucesso.");

            const atualizados = funcionarios.map((funcionario) => {
                if (funcionario.ID_FUNCIONARIO !== idFuncionario) return funcionario;

                return {
                    ...funcionario,
                    FERIAS: (funcionario.FERIAS || []).filter(
                        (item) => item.ID_FERIAS_FUNCIONARIOS !== idPeriodo
                    ),
                };
            });

            setFuncionarios(atualizados);

            if (
                funcionarioSelecionado &&
                funcionarioSelecionado.ID_FUNCIONARIO === idFuncionario
            ) {
                const funcionarioAtualizado = atualizados.find(
                    (item) => item.ID_FUNCIONARIO === idFuncionario
                );
                setFuncionarioSelecionado(funcionarioAtualizado || null);
            }

            await carregarFuncionarios(paginaAtual);
        } catch (e: any) {
            console.error(e);
            setErro(
                e?.response?.data?.error ||
                e?.response?.data?.details ||
                "Não foi possível excluir as férias."
            );
        }
    }

    /*const paginasVisiveis = useMemo(() => {
        const range = 2;
        const inicio = Math.max(1, paginaAtual - range);
        const fim = Math.min(totalPages, paginaAtual + range);

        const paginas: number[] = [];
        for (let i = inicio; i <= fim; i++) {
            paginas.push(i);
        }
        return paginas;
    }, [paginaAtual, totalPages]);*/

    const primeiroRegistro =
        totalFuncionarios === 0
            ? 0
            : (paginaAtual - 1) * limitePorPagina + 1;

    const ultimoRegistro = Math.min(
        paginaAtual * limitePorPagina,
        totalFuncionarios
    );

    return (
        <>
            <div className="min-w-225 mx-auto overflow-hidden rounded-xl bg-white shadow">
                <div className="h-1 bg-linear-to-r from-primary via-secondary to-third" />
                <div className="p-6">
                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto]">
                        <div>
                            <label className="mb-1 block text-xs font-medium text-gray-600">
                                Digite o nome do funcionário
                            </label>

                            <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_auto]">
                                <input
                                    value={busca}
                                    onChange={(e) => setBusca(e.target.value)}
                                    placeholder="Digite o nome do funcionário"
                                    className="rounded border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                                />

                                <button
                                    type="button"
                                    onClick={() => carregarFuncionarios(1)}
                                    className="inline-flex cursor-pointer items-center justify-center gap-2 rounded bg-secondary px-5 py-2 font-semibold text-white shadow hover:bg-primary"
                                >
                                    <FaSearch />
                                    Buscar
                                </button>

                                <button
                                    type="button"
                                    onClick={limparBusca}
                                    className="inline-flex cursor-pointer items-center justify-center gap-2 rounded border border-slate-300 bg-white px-5 py-2 font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                    <FaTimes />
                                    Limpar
                                </button>
                            </div>
                        </div>

                        <div className="flex items-end">
                            <button
                                type="button"
                                onClick={irParaCadastro}
                                className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded bg-third px-5 py-2 font-semibold text-white shadow hover:bg-primary lg:w-auto"
                            >
                                <FaPlus />
                                Cadastrar
                            </button>
                        </div>
                    </div>

                    {(erro || info) && (
                        <div className="mt-4">
                            {erro ? (
                                <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                                    {erro}
                                </div>
                            ) : (
                                <div className="rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                                    {info}
                                </div>
                            )}
                        </div>
                    )}

                    {(funcionarios.length > 0 || loadingTabela) && (
                        <>
                            <div className="mt-6 flex justify-end">
                                <select
                                    value={limitePorPagina}
                                    onChange={(e) => {
                                        const novoLimite = Number(e.target.value);

                                        setLimitePorPagina(novoLimite);
                                        setPaginaAtual(1);
                                        carregarFuncionarios(1, novoLimite);
                                    }}
                                    disabled={loadingTabela}
                                    className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-[#00AE9D] focus:ring-4 focus:ring-[#00AE9D]/10 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <option value={10}>10 por página</option>
                                    <option value={20}>20 por página</option>
                                    <option value={50}>50 por página</option>
                                    <option value={100}>100 por página</option>
                                </select>
                            </div>

                            <div className="mt-4 overflow-x-auto rounded-xl border">
                                <table className="min-w-full divide-y divide-slate-200 text-sm">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left font-semibold text-slate-700">
                                                Nome
                                            </th>
                                            <th className="px-4 py-3 text-left font-semibold text-slate-700">
                                                Setor
                                            </th>
                                            <th className="px-4 py-3 text-center font-semibold text-slate-700">
                                                Ação
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody className="divide-y divide-slate-100 bg-white">
                                        {loadingTabela ? (
                                            <tr>
                                                <td
                                                    colSpan={3}
                                                    className="px-4 py-6 text-center text-slate-500"
                                                >
                                                    Carregando funcionários...
                                                </td>
                                            </tr>
                                        ) : funcionarios.length === 0 ? (
                                            <tr>
                                                <td
                                                    colSpan={3}
                                                    className="px-4 py-6 text-center text-slate-500"
                                                >
                                                    Nenhum funcionário encontrado.
                                                </td>
                                            </tr>
                                        ) : (
                                            funcionarios.map((funcionario) => (
                                                <tr
                                                    key={funcionario.ID_FUNCIONARIO}
                                                    className="hover:bg-slate-50"
                                                >
                                                    <td className="px-4 py-3">
                                                        {capitalizeWords(funcionario.NM_FUNCIONARIO)}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {capitalizeWords(funcionario.SETOR?.NM_SETOR || "")}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => abrirModalInfo(funcionario)}
                                                            className="inline-flex cursor-pointer items-center gap-2 rounded bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                                                        >
                                                            Informações
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <div className="mt-6 flex flex-col gap-4 border-t border-slate-100 pt-5 pb-2 sm:flex-row sm:items-center sm:justify-between">
                                <p className="text-sm text-slate-500">
                                    Mostrando{" "}
                                    <span className="font-semibold text-slate-700">
                                        {primeiroRegistro}
                                    </span>{" "}
                                    até{" "}
                                    <span className="font-semibold text-slate-700">
                                        {ultimoRegistro}
                                    </span>{" "}
                                    de{" "}
                                    <span className="font-semibold text-slate-700">
                                        {totalFuncionarios}
                                    </span>{" "}
                                    funcionários
                                </p>

                                <div className="flex items-center justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            carregarFuncionarios(
                                                Math.max(paginaAtual - 1, 1)
                                            )
                                        }
                                        disabled={paginaAtual <= 1 || loadingTabela}
                                        className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <FaChevronLeft />
                                        Anterior
                                    </button>

                                    <span className="rounded-2xl bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">
                                        Página {paginaAtual} de {totalPages}
                                    </span>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            carregarFuncionarios(
                                                Math.min(paginaAtual + 1, totalPages)
                                            )
                                        }
                                        disabled={
                                            paginaAtual >= totalPages ||
                                            loadingTabela
                                        }
                                        className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        Próxima
                                        <FaChevronRight />
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {modalOpen && funcionarioSelecionado && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
                    <div className="max-h-[94vh] w-full max-w-5xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl">
                        <div className="bg-linear-to-r from-primary/10 via-white to-secondary/10 px-6 py-5">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
                                        Gestão de férias
                                    </p>

                                    <h2 className="mt-1 text-2xl font-bold text-slate-800">
                                        Histórico de Férias
                                    </h2>

                                    <p className="mt-1 text-sm text-slate-500">
                                        Consulte e gerencie os períodos de férias cadastrados
                                        para o funcionário.
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={fecharModal}
                                    className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:border-red-200 hover:text-red-500"
                                    title="Fechar"
                                >
                                    <FaTimes size={18} />
                                </button>
                            </div>
                        </div>

                        <div className="max-h-[78vh] space-y-5 overflow-y-auto p-6">
                            <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                                        Funcionário
                                    </p>

                                    <h3 className="mt-1 text-base font-semibold text-slate-900">
                                        Dados do funcionário
                                    </h3>

                                    <p className="mt-1 text-sm leading-5 text-slate-500">
                                        Confira os dados do funcionário selecionado antes de
                                        consultar ou alterar os períodos de férias.
                                    </p>
                                </div>

                                <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-[1fr_2fr]">
                                    <div>
                                        <label className="mb-1 block text-xs font-semibold text-slate-600">
                                            CPF
                                        </label>

                                        <input
                                            readOnly
                                            value={formatarCpfView(
                                                funcionarioSelecionado.NR_CPF || ""
                                            )}
                                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-1 block text-xs font-semibold text-slate-600">
                                            Nome
                                        </label>

                                        <input
                                            readOnly
                                            value={funcionarioSelecionado.NM_FUNCIONARIO || ""}
                                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            {(erro || info) && (
                                <>
                                    {erro ? (
                                        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                                            {erro}
                                        </div>
                                    ) : (
                                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
                                            {info}
                                        </div>
                                    )}
                                </>
                            )}

                            <div className="rounded-3xl border border-primary/20 bg-primary/5 p-5">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
                                        Férias
                                    </p>

                                    <h3 className="mt-1 text-base font-semibold text-slate-900">
                                        Períodos cadastrados
                                    </h3>

                                    <p className="mt-1 text-sm leading-5 text-slate-500">
                                        Consulte os períodos de férias e realize alterações
                                        quando o período ainda não tiver sido efetuado.
                                    </p>
                                </div>

                                <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-slate-200 text-sm">
                                            <thead className="bg-slate-50">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                        Início
                                                    </th>

                                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                        Fim
                                                    </th>

                                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                        Efetuada
                                                    </th>

                                                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                        Editar
                                                    </th>

                                                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                        Excluir
                                                    </th>
                                                </tr>
                                            </thead>

                                            <tbody className="divide-y divide-slate-100 bg-white">
                                                {(funcionarioSelecionado.FERIAS || []).length ===
                                                    0 ? (
                                                    <tr>
                                                        <td
                                                            colSpan={5}
                                                            className="px-4 py-10 text-center"
                                                        >
                                                            <p className="text-sm font-medium text-slate-600">
                                                                Nenhum período de férias encontrado
                                                            </p>

                                                            <p className="mt-1 text-xs text-slate-400">
                                                                Este funcionário ainda não possui
                                                                períodos de férias cadastrados.
                                                            </p>
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    (funcionarioSelecionado.FERIAS || []).map(
                                                        (
                                                            periodo: PeriodoFeriasListItem
                                                        ) => {
                                                            const efetuado =
                                                                Number(periodo.SN_EFETUADO) === 1;

                                                            return (
                                                                <tr
                                                                    key={
                                                                        periodo.ID_FERIAS_FUNCIONARIOS
                                                                    }
                                                                    className="transition hover:bg-slate-50"
                                                                >
                                                                    <td className="px-4 py-3 text-sm text-slate-700">
                                                                        {formatarDataBrasil(
                                                                            periodo.DT_DIA_INICIO
                                                                        )}
                                                                    </td>

                                                                    <td className="px-4 py-3 text-sm text-slate-700">
                                                                        {formatarDataBrasil(
                                                                            periodo.DT_DIA_FIM
                                                                        )}
                                                                    </td>

                                                                    <td className="px-4 py-3">
                                                                        {efetuado ? (
                                                                            <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                                                                                Sim
                                                                            </span>
                                                                        ) : (
                                                                            <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                                                                                Não
                                                                            </span>
                                                                        )}
                                                                    </td>

                                                                    <td className="px-4 py-3 text-center">
                                                                        <button
                                                                            type="button"
                                                                            disabled={efetuado}
                                                                            onClick={() =>
                                                                                irParaEdicao(
                                                                                    funcionarioSelecionado.ID_FUNCIONARIO,
                                                                                    periodo.ID_FERIAS_FUNCIONARIOS
                                                                                )
                                                                            }
                                                                            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                                                                        >
                                                                            <FaEdit size={12} />
                                                                            Editar
                                                                        </button>
                                                                    </td>

                                                                    <td className="px-4 py-3 text-center">
                                                                        <button
                                                                            type="button"
                                                                            disabled={efetuado}
                                                                            onClick={() =>
                                                                                excluirPeriodo(
                                                                                    periodo.ID_FERIAS_FUNCIONARIOS,
                                                                                    funcionarioSelecionado.ID_FUNCIONARIO,
                                                                                    Number(
                                                                                        periodo.SN_EFETUADO
                                                                                    )
                                                                                )
                                                                            }
                                                                            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                                                                        >
                                                                            <FaTrash size={12} />
                                                                            Excluir
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        }
                                                    )
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <div className="mt-4 rounded-2xl border border-slate-200 bg-white/70 px-4 py-3">
                                    <p className="text-xs leading-5 text-slate-600">
                                        <strong>Observação:</strong>{" "}
                                        períodos de férias já efetuados não podem ser editados
                                        ou excluídos.
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                                <button
                                    type="button"
                                    onClick={fecharModal}
                                    className="cursor-pointer rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                                >
                                    Fechar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}