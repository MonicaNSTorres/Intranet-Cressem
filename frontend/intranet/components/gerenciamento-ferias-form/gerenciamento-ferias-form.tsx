"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { FaEdit, FaPlus, FaSearch, FaTimes, FaTrash } from "react-icons/fa";
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

const inputClass =
    "h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-left text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10";

const readonlyInputClass =
    "h-10 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-left text-sm font-semibold text-slate-700 shadow-sm outline-none";

const primaryButtonClass =
    "inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-secondary px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer";

const accentButtonClass =
    "inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-5 text-sm font-semibold text-primary shadow-sm transition hover:border-primary hover:bg-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer";

const secondaryButtonClass =
    "inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-fourth/40 hover:bg-fourth/10 hover:text-fourth disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer";

export function GerenciamentoFeriasForm() {
    const router = useRouter();

    const [busca, setBusca] = useState("");
    const [funcionarios, setFuncionarios] = useState<FuncionarioFeriasListItem[]>([]);
    const [paginaAtual, setPaginaAtual] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const [loadingTabela, setLoadingTabela] = useState(false);
    const [erro, setErro] = useState("");
    const [info, setInfo] = useState("");

    const [modalOpen, setModalOpen] = useState(false);
    const [funcionarioSelecionado, setFuncionarioSelecionado] =
        useState<FuncionarioFeriasListItem | null>(null);
    const excluirActionRef = useRef(false);

    async function carregarFuncionarios(page = 1) {
        try {
            setLoadingTabela(true);
            setErro("");
            setInfo("");

            const response = await buscarFeriasPaginado({
                nome: busca || " ",
                page,
                limit: 10,
            });

            setFuncionarios(response.items || []);
            setTotalPages(response.total_pages || 1);
            setPaginaAtual(response.current_page || page);
        } catch (e: any) {
            console.error(e);
            setFuncionarios([]);
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
        setErro("");
        setInfo("");
    }

    function pesquisarComEnter(event: KeyboardEvent<HTMLInputElement>) {
        if (event.key !== "Enter") return;
        event.preventDefault();
        carregarFuncionarios(1);
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
        if (excluirActionRef.current) return;
        if (Number(snEfetuado) === 1) return;

        excluirActionRef.current = true;
        const confirmou = window.confirm("Confirma excluir este período de férias?");
        if (!confirmou) {
            excluirActionRef.current = false;
            return;
        }

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
        } finally {
            excluirActionRef.current = false;
        }
    }

    const paginasVisiveis = useMemo(() => {
        const range = 2;
        const inicio = Math.max(1, paginaAtual - range);
        const fim = Math.min(totalPages, paginaAtual + range);

        const paginas: number[] = [];
        for (let i = inicio; i <= fim; i++) {
            paginas.push(i);
        }
        return paginas;
    }, [paginaAtual, totalPages]);

    return (
        <>
            <div className="mx-auto w-full rounded-2xl border border-slate-200 border-t-4 border-t-primary bg-white p-5 shadow-sm">
                <div className="mb-5 border-b border-slate-100 pb-4">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-primary">
                            Filtros
                        </p>
                        <h2 className="mt-1 text-lg font-semibold text-title">
                            Consulta de férias
                        </h2>
                        <p className="mt-1 text-sm text-paragraph">
                            Pesquise colaboradores e acompanhe o histórico de férias.
                        </p>

                        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_auto_auto] md:items-end">
                            <div>
                                <label className="mb-1 block text-xs font-bold uppercase text-slate-600">
                                    Funcionário
                                </label>
                                <input
                                    value={busca}
                                    onChange={(e) => setBusca(e.target.value)}
                                    onKeyDown={pesquisarComEnter}
                                    placeholder="Digite o nome do funcionário"
                                    className={inputClass}
                                />
                            </div>

                            <button
                                type="button"
                                onClick={() => carregarFuncionarios(1)}
                                className={primaryButtonClass}
                            >
                                <FaSearch />
                                Buscar
                            </button>

                            <button
                                type="button"
                                onClick={limparBusca}
                                className={secondaryButtonClass}
                            >
                                <FaTimes />
                                Limpar
                            </button>

                            <button
                                type="button"
                                onClick={irParaCadastro}
                                className={accentButtonClass}
                            >
                                <FaPlus />
                                Cadastrar
                            </button>
                        </div>
                    </div>
                </div>

                {(erro || info) && (
                    <div className="mt-4">
                        {erro ? (
                            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                                {erro}
                            </div>
                        ) : (
                            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                                {info}
                            </div>
                        )}
                    </div>
                )}

                {(funcionarios.length > 0 || loadingTabela) && (
                    <>
                        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-slate-200 text-sm">
                                    <thead className="bg-slate-100">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-700">
                                                Nome
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-700">
                                                Setor
                                            </th>
                                            <th className="px-4 py-3 text-center text-xs font-bold uppercase text-slate-700">
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
                                                    className="transition hover:bg-primary/5"
                                                >
                                                    <td className="px-4 py-3 font-semibold text-slate-800">
                                                        {capitalizeWords(funcionario.NM_FUNCIONARIO)}
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-700">
                                                        {capitalizeWords(funcionario.SETOR?.NM_SETOR || "")}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => abrirModalInfo(funcionario)}
                                                            className="inline-flex h-8 items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 text-xs font-semibold text-primary transition hover:bg-primary hover:text-white cursor-pointer"
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
                        </div>

                        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                            {paginaAtual > 1 && (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => carregarFuncionarios(1)}
                                        className="h-9 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
                                    >
                                        1
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => carregarFuncionarios(paginaAtual - 1)}
                                        className="h-9 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
                                    >
                                        Anterior
                                    </button>
                                </>
                            )}

                            {paginasVisiveis.map((page) => (
                                <button
                                    key={page}
                                    type="button"
                                    onClick={() => carregarFuncionarios(page)}
                                    className={`h-9 min-w-9 rounded-xl px-3 text-sm font-semibold shadow-sm transition ${page === paginaAtual
                                        ? "bg-primary text-white"
                                        : "border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                                        }`}
                                >
                                    {page}
                                </button>
                            ))}

                            {paginaAtual < totalPages && (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => carregarFuncionarios(paginaAtual + 1)}
                                        className="h-9 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
                                    >
                                        Próxima
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => carregarFuncionarios(totalPages)}
                                        className="h-9 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
                                    >
                                        {totalPages}
                                    </button>
                                </>
                            )}
                        </div>
                    </>
                )}
            </div>

            {modalOpen && funcionarioSelecionado && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
                        <div className="flex items-center justify-between border-b px-6 py-4">
                            <div>
                                <h2 className="text-lg font-semibold text-title">
                                    Histórico de férias
                                </h2>
                                <p className="mt-1 text-sm text-paragraph">
                                    Consulte os períodos cadastrados para o colaborador.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={fecharModal}
                                className="rounded-full p-2 text-red-600 transition hover:bg-red-50"
                            >
                                <FaTimes />
                            </button>
                        </div>

                        <div className="space-y-5 overflow-y-auto px-6 py-5">
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_2fr]">
                                <div>
                                    <label className="mb-1 block text-xs font-bold uppercase text-slate-600">
                                        CPF
                                    </label>
                                    <input
                                        readOnly
                                        value={formatarCpfView(funcionarioSelecionado.NR_CPF || "")}
                                        className={readonlyInputClass}
                                    />
                                </div>

                                <div>
                                    <label className="mb-1 block text-xs font-bold uppercase text-slate-600">
                                        Nome
                                    </label>
                                    <input
                                        readOnly
                                        value={funcionarioSelecionado.NM_FUNCIONARIO || ""}
                                        className={readonlyInputClass}
                                    />
                                </div>
                            </div>

                            {(erro || info) && (
                                <div>
                                    {erro ? (
                                        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                                            {erro}
                                        </div>
                                    ) : (
                                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                                            {info}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="overflow-hidden rounded-2xl border border-slate-200">
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                                        <thead className="bg-slate-100">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-700">
                                                    Início
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-700">
                                                    Fim
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-700">
                                                    Efetuada
                                                </th>
                                                <th className="px-4 py-3 text-center text-xs font-bold uppercase text-slate-700">
                                                    Editar
                                                </th>
                                                <th className="px-4 py-3 text-center text-xs font-bold uppercase text-slate-700">
                                                    Excluir
                                                </th>
                                            </tr>
                                        </thead>

                                        <tbody className="divide-y divide-slate-100 bg-white">
                                            {(funcionarioSelecionado.FERIAS || []).length === 0 ? (
                                                <tr>
                                                    <td
                                                        colSpan={5}
                                                        className="px-4 py-6 text-center text-slate-500"
                                                    >
                                                        Nenhum período de férias encontrado.
                                                    </td>
                                                </tr>
                                            ) : (
                                                (funcionarioSelecionado.FERIAS || []).map(
                                                    (periodo: PeriodoFeriasListItem) => {
                                                        const efetuado = Number(periodo.SN_EFETUADO) === 1;

                                                        return (
                                                            <tr
                                                                key={periodo.ID_FERIAS_FUNCIONARIOS}
                                                                className="transition hover:bg-primary/5"
                                                            >
                                                                <td className="px-4 py-3 text-slate-700">
                                                                    {formatarDataBrasil(periodo.DT_DIA_INICIO)}
                                                                </td>
                                                                <td className="px-4 py-3 text-slate-700">
                                                                    {formatarDataBrasil(periodo.DT_DIA_FIM)}
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    <span
                                                                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                                                                            efetuado
                                                                                ? "bg-emerald-50 text-emerald-700"
                                                                                : "bg-amber-50 text-amber-700"
                                                                        }`}
                                                                    >
                                                                        {efetuado ? "Sim" : "Não"}
                                                                    </span>
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
                                                                        className="inline-flex h-8 items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 text-xs font-semibold text-primary transition hover:bg-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                                                                    >
                                                                        <FaEdit />
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
                                                                                Number(periodo.SN_EFETUADO)
                                                                            )
                                                                        }
                                                                        className="inline-flex h-8 items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                                                                    >
                                                                        <FaTrash />
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
                        </div>

                        <div className="flex items-center justify-end gap-3 border-t px-6 py-4">
                            <button
                                type="button"
                                onClick={fecharModal}
                                className={secondaryButtonClass}
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
