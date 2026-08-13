"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import BackButton from "@/components/back-button/back-button";
import {
    FaLaptop,
    FaShieldAlt,
    FaCalendarAlt,
    FaUserTie,
    FaPencilAlt,
    FaDownload,
    FaSearch,
    FaTimes,
    FaPlus,
    FaChevronLeft,
    FaChevronRight,
} from "react-icons/fa";
import { buscarNotebooks } from "@/services/consulta_notebook.service";
import ModalEditarNotebook from "@/components/modal-editar-notebook/modal-editar-notebook";
import {
    canAccess,
    PAGE_ACCESS,
    type AuthUserLike,
} from "@/lib/access-control";
import { getMeAdUser } from "@/services/auth.service";

type NotebookRow = {
    ID_NOTEBOOKS_SICOOB: number | string;
    NM_NOTEBOOK: string | null;
    NM_MODELO: string | null;
    DT_INICIO_OPERACAO: string | null;
    DT_GARANTIA: string | null;
    NR_MAC: string | null;
    CD_PATRIMONIO: number | string | null;
    NR_IP: string | null;
    NR_BITLOCKER: string | null;
    OBS_NOTEBOOKS_SICOOB: string | null;
    ID_FUNCIONARIO: number | string | null;
    NM_FUNCIONARIO_TI: string | null;
    NM_FUNCIONARIO_RECEBEU: string | null;
    DIR_TERMO_ASSINADO?: string | null;
    DESC_SITUACAO: string | null;
};

type QuickFilter = "TODOS" | "ATIVOS" | "BITLOCKER" | "RESPONSAVEL";

const buttonBase =
    "inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer";
const primaryButtonClass = `${buttonBase} bg-secondary text-white hover:bg-primary`;
const neutralButtonClass = `${buttonBase} border border-[var(--text-darken-placeholder)] bg-white text-title hover:border-primary hover:bg-primary/10`;
const accentButtonClass = `${buttonBase} border border-primary/30 bg-primary/10 text-primary hover:bg-primary hover:text-white`;
const downloadButtonClass = `${buttonBase} bg-primary text-white hover:bg-secondary`;
const inputClass =
    "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-left text-sm text-title outline-none shadow-sm transition placeholder:text-text-darken-placeholder focus:border-primary focus:ring-2 focus:ring-primary/10";
const cardClass = "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm";
const labelClass = "mb-1 block text-xs font-bold uppercase text-slate-600";
const defaultPageSize = 10;

export default function ConsultaNotebookPage() {
    const [q, setQ] = useState("");
    const [loading, setLoading] = useState(true);
    const [allowed, setAllowed] = useState(false);
    const [rows, setRows] = useState<NotebookRow[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);

    const [openEditModal, setOpenEditModal] = useState(false);
    const [selectedNotebook, setSelectedNotebook] = useState<NotebookRow | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [limit, setLimit] = useState(defaultPageSize);
    const [quickFilter, setQuickFilter] = useState<QuickFilter>("TODOS");

    const debouncedQ = useDebouncedValue(q, 300);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            setError(null);

            try {
                const data = await buscarNotebooks(debouncedQ);
                setRows(Array.isArray(data.data) ? data.data : []);
            } catch (e: any) {
                setError(String(e?.message || "Erro ao carregar"));
                setRows([]);
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [debouncedQ, refreshKey]);

    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedQ, refreshKey, quickFilter]);

    const filteredRows = useMemo(() => {
        if (quickFilter === "ATIVOS") {
            return rows.filter(isNotebookAtivo);
        }

        if (quickFilter === "BITLOCKER") {
            return rows.filter((r) => !!r.NR_BITLOCKER && String(r.NR_BITLOCKER).trim() !== "");
        }

        if (quickFilter === "RESPONSAVEL") {
            return rows.filter(
                (r) =>
                    !!r.NM_FUNCIONARIO_RECEBEU &&
                    String(r.NM_FUNCIONARIO_RECEBEU).trim() !== ""
            );
        }

        return rows;
    }, [rows, quickFilter]);

    const totalGeral = useMemo(() => rows.length, [rows]);
    const total = useMemo(() => filteredRows.length, [filteredRows]);
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const paginatedRows = useMemo(
        () => filteredRows.slice((currentPage - 1) * limit, currentPage * limit),
        [filteredRows, currentPage, limit]
    );
    const totalAtivos = useMemo(
        () => rows.filter(isNotebookAtivo).length,
        [rows]
    );

    const totalComBitlocker = useMemo(
        () => rows.filter((r) => !!r.NR_BITLOCKER && String(r.NR_BITLOCKER).trim() !== "").length,
        [rows]
    );

    const totalComResponsavel = useMemo(
        () =>
            rows.filter(
                (r) =>
                    !!r.NM_FUNCIONARIO_RECEBEU &&
                    String(r.NM_FUNCIONARIO_RECEBEU).trim() !== ""
            ).length,
        [rows]
    );

    function handleOpenEdit(notebook: NotebookRow) {
        setSelectedNotebook(notebook);
        setOpenEditModal(true);
    }

    function handleCloseEdit() {
        setOpenEditModal(false);
        setSelectedNotebook(null);
    }

    function handleRefreshAfterEdit() {
        setRefreshKey((prev) => prev + 1);
    }

    function handleSearch() {
        setCurrentPage(1);
        setRefreshKey((prev) => prev + 1);
    }

    function handleClearSearch() {
        setQ("");
        setQuickFilter("TODOS");
        setCurrentPage(1);
    }

    useEffect(() => {
        async function validarAcesso() {
            try {
                const user = (await getMeAdUser()) as AuthUserLike;

                setAllowed(canAccess(user, PAGE_ACCESS.consultaNotebook));
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
            <div className="p-6 text-sm text-paragraph">
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

    function handleDownloadRelatorio() {
        const headers = [
            "Notebook",
            "Modelo",
            "Situação",
            "MAC",
            "Funcionário que recebeu",
            "Funcionário TI que cadastrou",
            "Início operação",
            "Garantia",
        ];

        const csvRows = filteredRows.map((r) => [
            r.NM_NOTEBOOK ?? "",
            r.NM_MODELO ?? "",
            r.DESC_SITUACAO ?? "",
            r.NR_MAC ?? "",
            r.NM_FUNCIONARIO_RECEBEU ?? "",
            r.NM_FUNCIONARIO_TI ?? "",
            formatDate(r.DT_INICIO_OPERACAO),
            formatDate(r.DT_GARANTIA),
        ]);

        downloadCSV({
            filename: "relatorio_notebooks.csv",
            headers,
            rows: csvRows,
        });
    }

    return (
        <div className="p-6 lg:p-8">
            <div className="flex flex-col gap-4">
                <div className="min-w-0">
                    <BackButton />
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-third bg-third text-primary shadow-sm">
                            <FaLaptop size={16} />
                        </div>

                        <div className="min-w-0">
                            <h1 className="truncate text-2xl font-semibold text-title">
                                Consulta de Notebooks
                            </h1>
                            <p className="mt-1 text-sm text-paragraph">
                                Consulte os notebooks cadastrados e acompanhe um resumo rápido dos registros.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className={`mt-6 ${cardClass} border-t-4 border-t-primary`}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase text-primary">Filtros</p>
                        <h2 className="text-lg font-semibold text-title">Pesquisar notebooks</h2>
                        <p className="mt-1 text-sm text-paragraph">
                            Localize por notebook, modelo, patrimônio, IP, MAC ou funcionário.
                        </p>
                    </div>

                    <Link href="/auth/cadastro_notebook" className={`${accentButtonClass} w-full sm:w-auto`}>
                        <FaPlus size={13} />
                        Cadastrar notebook
                    </Link>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto_auto] lg:items-end">
                    <div>
                        <label className={labelClass}>Busca</label>
                        <input
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") handleSearch();
                            }}
                            placeholder="Ex: notebook, modelo, patrimônio, IP, MAC, funcionário..."
                            className={inputClass}
                        />
                    </div>

                    <button type="button" onClick={handleSearch} className={primaryButtonClass}>
                        <FaSearch size={14} />
                        Buscar
                    </button>

                    <button type="button" onClick={handleClearSearch} className={neutralButtonClass}>
                        <FaTimes size={12} />
                        Limpar
                    </button>
                </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <button
                    type="button"
                    onClick={() => setQuickFilter("TODOS")}
                    className={getQuickCardClass(quickFilter === "TODOS", "border-primary/30 bg-primary/10")}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-title">Total encontrado</span>
                        <FaLaptop className="text-primary" />
                    </div>
                    <p className="mt-3 text-2xl font-semibold text-title">{loading ? "..." : totalGeral}</p>
                    <p className="mt-1 text-xs text-paragraph">Clique para mostrar todos</p>
                </button>

                <button
                    type="button"
                    onClick={() => setQuickFilter("ATIVOS")}
                    className={getQuickCardClass(quickFilter === "ATIVOS", "border-green-200 bg-green-50")}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-title">Situação ativa</span>
                        <FaShieldAlt className="text-green-600" />
                    </div>
                    <p className="mt-3 text-2xl font-semibold text-title">{loading ? "..." : totalAtivos}</p>
                    <p className="mt-1 text-xs text-paragraph">Clique para filtrar ativos</p>
                </button>

                <button
                    type="button"
                    onClick={() => setQuickFilter("BITLOCKER")}
                    className={getQuickCardClass(quickFilter === "BITLOCKER", "border-fourth/30 bg-fourth/10")}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-title">Com BitLocker</span>
                        <FaCalendarAlt className="text-fourth" />
                    </div>
                    <p className="mt-3 text-2xl font-semibold text-title">{loading ? "..." : totalComBitlocker}</p>
                    <p className="mt-1 text-xs text-paragraph">Clique para filtrar BitLocker</p>
                </button>

                <button
                    type="button"
                    onClick={() => setQuickFilter("RESPONSAVEL")}
                    className={getQuickCardClass(quickFilter === "RESPONSAVEL", "border-third/60 bg-third/10")}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-title">Com funcionário vinculado</span>
                        <FaUserTie className="text-secondary" />
                    </div>
                    <p className="mt-3 text-2xl font-semibold text-title">{loading ? "..." : totalComResponsavel}</p>
                    <p className="mt-1 text-xs text-paragraph">
                        Clique para filtrar vinculados
                    </p>
                </button>
            </div>

            <div className={`mt-6 ${cardClass}`}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-base font-semibold text-title">
                            <span className="mr-2 inline-block h-2 w-2 rounded-full bg-primary" />
                            Lista de Notebooks
                        </h2>
                        <div className="mt-1 text-xs text-paragraph">
                            {loading ? "Carregando..." : `${total} encontrados`}
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleDownloadRelatorio}
                        disabled={loading || filteredRows.length === 0}
                        className={downloadButtonClass}
                    >
                        <FaDownload size={16} />
                        Baixar Relatório
                    </button>
                </div>

                {error ? (
                    <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                        {error}
                    </div>
                ) : null}

                {!loading && !error && filteredRows.length === 0 ? (
                    <div className="mt-6 text-center text-sm text-paragraph">
                        Nenhum notebook encontrado.
                    </div>
                ) : (
                    <div className="mt-4 overflow-auto rounded-2xl border border-slate-200">
                        <table className="min-w-225 w-full text-sm">
                            <thead className="bg-slate-50">
                                <tr className="text-left text-xs font-bold uppercase text-slate-600">
                                    <th className="px-3 py-3">Notebook</th>
                                    <th className="px-3 py-3">Modelo</th>
                                    <th className="px-3 py-3">Situação</th>
                                    {/*<th className="px-3 py-3">Patrimônio</th>*/}
                                    {/*<th className="px-3 py-3">IP</th>*/}
                                    <th className="px-3 py-3">MAC</th>
                                    {/*<th className="px-3 py-3">BitLocker</th>*/}
                                    <th className="px-3 py-3">Funcionário recebeu</th>
                                    <th className="px-3 py-3">Funcionário TI</th>
                                    <th className="px-3 py-3">Início operação</th>
                                    <th className="px-3 py-3">Garantia</th>
                                    {/*<th className="px-3 py-3">Observação</th>*/}
                                    <th className="px-3 py-3 text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedRows.map((r) => (
                                    <tr
                                        key={String(r.ID_NOTEBOOKS_SICOOB)}
                                        className="border-t border-slate-100 hover:bg-primary/5"
                                    >
                                        <td className="px-3 py-3 font-semibold text-title">
                                            {r.NM_NOTEBOOK ?? "-"}
                                        </td>

                                        <td className="px-3 py-3 text-title">
                                            {r.NM_MODELO ?? "-"}
                                        </td>

                                        <td className="px-3 py-3">
                                            {r.DESC_SITUACAO ? (
                                                <span className="inline-flex rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                                                    {r.DESC_SITUACAO}
                                                </span>
                                            ) : (
                                                "-"
                                            )}
                                        </td>

                                        {/*<td className="px-3 py-3 text-gray-700">
                                            {r.CD_PATRIMONIO ?? "-"}
                                        </td>*/}

                                        {/*<td className="px-3 py-3 text-gray-700">{r.NR_IP ?? "-"}</td>*/}

                                        <td className="px-3 py-3 text-title">{r.NR_MAC ?? "-"}</td>

                                        {/*<td className="px-3 py-3 text-gray-700">{r.NR_BITLOCKER ?? "-"}</td>*/}

                                        <td className="px-3 py-3 text-title">
                                            {r.NM_FUNCIONARIO_RECEBEU ?? "-"}
                                        </td>

                                        <td className="px-3 py-3 text-title">
                                            {r.NM_FUNCIONARIO_TI ?? "-"}
                                        </td>

                                        <td className="px-3 py-3 text-title">
                                            {formatDate(r.DT_INICIO_OPERACAO)}
                                        </td>

                                        <td className="px-3 py-3 text-title">
                                            {formatDate(r.DT_GARANTIA)}
                                        </td>

                                        {/*<td className="max-w-70 px-3 py-3 text-gray-700">
                                            <div className="truncate" title={r.OBS_NOTEBOOKS_SICOOB || ""}>
                                                {r.OBS_NOTEBOOKS_SICOOB ?? "-"}
                                            </div>
                                        </td>*/}

                                        <td className="px-3 py-3 text-center">
                                            <button
                                                type="button"
                                                onClick={() => handleOpenEdit(r)}
                                                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary shadow-sm transition hover:bg-primary hover:text-white cursor-pointer"
                                                title="Editar notebook"
                                            >
                                                <FaPencilAlt size={13} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {filteredRows.length > 0 ? (
                    <div className="mt-4 border-t border-slate-100 bg-white px-4 py-4">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                                <p className="text-sm text-slate-500">
                                    Mostrando{" "}
                                    <span className="font-semibold text-slate-700">
                                        {total === 0 ? 0 : (currentPage - 1) * limit + 1}
                                    </span>{" "}
                                    até{" "}
                                    <span className="font-semibold text-slate-700">
                                        {Math.min(currentPage * limit, total)}
                                    </span>{" "}
                                    de{" "}
                                    <span className="font-semibold text-slate-700">{total}</span>{" "}
                                    notebook(s)
                                </p>

                                <select
                                    value={limit}
                                    onChange={(event) => {
                                        setLimit(Number(event.target.value));
                                        setCurrentPage(1);
                                    }}
                                    disabled={loading}
                                    className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition hover:border-slate-300 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    <option value={10}>10 por página</option>
                                    <option value={20}>20 por página</option>
                                    <option value={50}>50 por página</option>
                                    <option value={100}>100 por página</option>
                                </select>
                            </div>

                            <div className="flex items-center justify-end gap-2">
                                <button
                                    type="button"
                                    disabled={currentPage <= 1 || loading}
                                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                                    className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 disabled:opacity-70"
                                >
                                    <FaChevronLeft size={12} />
                                    Anterior
                                </button>

                                <span className="inline-flex h-10 items-center justify-center rounded-xl bg-slate-50 px-4 text-sm font-semibold text-slate-700">
                                    Página {currentPage} de {totalPages}
                                </span>

                                <button
                                    type="button"
                                    disabled={currentPage >= totalPages || loading}
                                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                                    className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 disabled:opacity-70"
                                >
                                    Próxima
                                    <FaChevronRight size={12} />
                                </button>
                            </div>
                        </div>
                    </div>
                ) : null}

                <p className="mt-3 text-xs text-paragraph">
                    * Dados carregados do Oracle via intranet-api. Ordenação mostrando os últimos cadastrados primeiro.
                </p>
            </div>

            <ModalEditarNotebook
                open={openEditModal}
                notebook={selectedNotebook}
                onClose={handleCloseEdit}
                onSuccess={handleRefreshAfterEdit}
            />
        </div>
    );
}

function useDebouncedValue<T>(value: T, delay = 300) {
    const [debounced, setDebounced] = useState(value);

    useEffect(() => {
        const t = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(t);
    }, [value, delay]);

    return debounced;
}

function getQuickCardClass(active: boolean, colorClass: string) {
    return [
        "w-full rounded-2xl border p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md cursor-pointer",
        active ? "ring-2 ring-primary/30" : "",
        colorClass,
    ]
        .filter(Boolean)
        .join(" ");
}

function isNotebookAtivo(row: NotebookRow) {
    const situacao = String(row.DESC_SITUACAO || "")
        .trim()
        .toUpperCase();

    return situacao.includes("ATIV") && !situacao.includes("INATIV");
}

function formatDate(value: string | null) {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleDateString("pt-BR");
}

function escapeCSV(value: unknown) {
    const text = String(value ?? "");
    return `"${text.replace(/"/g, '""')}"`;
}

function downloadCSV({
    filename,
    headers,
    rows,
}: {
    filename: string;
    headers: string[];
    rows: unknown[][];
}) {
    const csvContent = [
        headers.map(escapeCSV).join(";"),
        ...rows.map((row) => row.map(escapeCSV).join(";")),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], {
        type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;
    link.click();

    URL.revokeObjectURL(url);
}
