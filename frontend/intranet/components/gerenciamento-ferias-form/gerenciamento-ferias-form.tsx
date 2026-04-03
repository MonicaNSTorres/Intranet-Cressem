"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useMemo, useState } from "react";
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
            <div className="min-w-225 mx-auto rounded-xl bg-white p-6 shadow">
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
                        <div className="mt-6 overflow-x-auto rounded-xl border">
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

                        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                            {paginaAtual > 1 && (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => carregarFuncionarios(1)}
                                        className="rounded border px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                                    >
                                        1
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => carregarFuncionarios(paginaAtual - 1)}
                                        className="rounded border px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
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
                                    className={`rounded px-3 py-1.5 text-sm ${page === paginaAtual
                                        ? "bg-emerald-600 text-white"
                                        : "border text-slate-700 hover:bg-slate-50"
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
                                        className="rounded border px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                                    >
                                        Próxima
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => carregarFuncionarios(totalPages)}
                                        className="rounded border px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
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
                    <div className="w-full max-w-5xl rounded-2xl bg-white shadow-xl">
                        <div className="flex items-center justify-between border-b px-6 py-4">
                            <h2 className="text-lg font-semibold text-gray-900">
                                Histórico de Férias
                            </h2>

                            <button
                                type="button"
                                onClick={fecharModal}
                                className="rounded p-2 text-slate-500 hover:bg-slate-100"
                            >
                                <FaTimes />
                            </button>
                        </div>

                        <div className="space-y-5 px-6 py-5">
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_2fr]">
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-gray-600">
                                        CPF
                                    </label>
                                    <input
                                        readOnly
                                        value={formatarCpfView(funcionarioSelecionado.NR_CPF || "")}
                                        className="w-full rounded border bg-gray-50 px-3 py-2"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1 block text-xs font-medium text-gray-600">
                                        Nome
                                    </label>
                                    <input
                                        readOnly
                                        value={funcionarioSelecionado.NM_FUNCIONARIO || ""}
                                        className="w-full rounded border bg-gray-50 px-3 py-2"
                                    />
                                </div>
                            </div>

                            {(erro || info) && (
                                <div>
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

                            <div className="overflow-x-auto rounded-xl border">
                                <table className="min-w-full divide-y divide-slate-200 text-sm">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left font-semibold text-slate-700">
                                                Início
                                            </th>
                                            <th className="px-4 py-3 text-left font-semibold text-slate-700">
                                                Fim
                                            </th>
                                            <th className="px-4 py-3 text-left font-semibold text-slate-700">
                                                Efetuada
                                            </th>
                                            <th className="px-4 py-3 text-center font-semibold text-slate-700">
                                                Editar
                                            </th>
                                            <th className="px-4 py-3 text-center font-semibold text-slate-700">
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
                                                            className="hover:bg-slate-50"
                                                        >
                                                            <td className="px-4 py-3">
                                                                {formatarDataBrasil(periodo.DT_DIA_INICIO)}
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                {formatarDataBrasil(periodo.DT_DIA_FIM)}
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                {efetuado ? "Sim" : "Não"}
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
                                                                    className="inline-flex cursor-pointer items-center gap-2 rounded bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
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
                                                                    className="inline-flex cursor-pointer items-center gap-2 rounded bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
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

                        <div className="flex items-center justify-end gap-3 border-t px-6 py-4">
                            <button
                                type="button"
                                onClick={fecharModal}
                                className="rounded bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700"
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