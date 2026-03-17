"use client";

import { useEffect, useMemo, useState } from "react";
import BackButton from "@/components/back-button/back-button";
import {
    FaLaptop,
    FaShieldAlt,
    FaCalendarAlt,
    FaUserTie,
    FaPencilAlt,
} from "react-icons/fa";
import { buscarNotebooks } from "@/services/consulta_notebook.service";
import ModalEditarNotebook from "@/components/modal-editar-notebook/modal-editar-notebook";

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
    DIR_TERMO_ASSINADO?: string | null;
    DESC_SITUACAO: string | null;
};

export default function ConsultaNotebookPage() {
    const [q, setQ] = useState("");
    const [loading, setLoading] = useState(false);
    const [rows, setRows] = useState<NotebookRow[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);

    const [openEditModal, setOpenEditModal] = useState(false);
    const [selectedNotebook, setSelectedNotebook] = useState<NotebookRow | null>(null);

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

    const total = useMemo(() => rows.length, [rows]);

    const totalAtivos = useMemo(
        () =>
            rows.filter((r) =>
                String(r.DESC_SITUACAO || "")
                    .toUpperCase()
                    .includes("ATIV")
            ).length,
        [rows]
    );

    const totalComBitlocker = useMemo(
        () => rows.filter((r) => !!r.NR_BITLOCKER && String(r.NR_BITLOCKER).trim() !== "").length,
        [rows]
    );

    const totalComResponsavel = useMemo(
        () =>
            rows.filter(
                (r) => !!r.NM_FUNCIONARIO_TI && String(r.NM_FUNCIONARIO_TI).trim() !== ""
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

    return (
        <div className="p-6 lg:p-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="min-w-0">
                    <BackButton />
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#C7D300] bg-[#C7D300] text-emerald-700">
                            <FaLaptop size={16} />
                        </div>

                        <div className="min-w-0">
                            <h1 className="truncate text-2xl font-semibold text-gray-900">
                                Consulta de Notebooks
                            </h1>
                            <p className="mt-1 text-sm text-gray-600">
                                Consulte os notebooks cadastrados e acompanhe um resumo rápido dos registros.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="w-full lg:w-105">
                    <label className="text-xs font-medium text-gray-600">Buscar</label>
                    <div className="mt-1 flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2 shadow-sm">
                        <input
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Ex: notebook, modelo, patrimônio, IP, MAC, funcionário..."
                            className="w-full bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
                        />
                        {q ? (
                            <button
                                onClick={() => setQ("")}
                                className="rounded-lg border border-gray-200 px-2 py-1 text-xs hover:bg-gray-50"
                            >
                                Limpar
                            </button>
                        ) : null}
                    </div>
                </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">Total encontrado</span>
                        <FaLaptop className="text-secondary" />
                    </div>
                    <p className="mt-3 text-2xl font-semibold text-gray-900">{loading ? "..." : total}</p>
                    <p className="mt-1 text-xs text-gray-500">Registros retornados na busca atual</p>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">Situação ativa</span>
                        <FaShieldAlt className="text-secondary" />
                    </div>
                    <p className="mt-3 text-2xl font-semibold text-gray-900">{loading ? "..." : totalAtivos}</p>
                    <p className="mt-1 text-xs text-gray-500">Com situação contendo "Ativo"</p>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">Com BitLocker</span>
                        <FaCalendarAlt className="text-secondary" />
                    </div>
                    <p className="mt-3 text-2xl font-semibold text-gray-900">{loading ? "..." : totalComBitlocker}</p>
                    <p className="mt-1 text-xs text-gray-500">Equipamentos com número informado</p>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">Com responsável</span>
                        <FaUserTie className="text-secondary" />
                    </div>
                    <p className="mt-3 text-2xl font-semibold text-gray-900">{loading ? "..." : totalComResponsavel}</p>
                    <p className="mt-1 text-xs text-gray-500">Registros com funcionário informado</p>
                </div>
            </div>

            <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold text-gray-900">
                        Lista de Notebooks
                    </h2>
                    <div className="text-xs text-gray-500">
                        {loading ? "Carregando..." : `${total} encontrados`}
                    </div>
                </div>

                {error ? (
                    <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                        {error}
                    </div>
                ) : null}

                {!loading && !error && rows.length === 0 ? (
                    <div className="mt-6 text-center text-sm text-gray-500">
                        Nenhum notebook encontrado.
                    </div>
                ) : (
                    <div className="mt-4 overflow-auto">
                        <table className="min-w-225 w-full text-sm">
                            <thead>
                                <tr className="text-left text-xs text-gray-500">
                                    <th className="px-3 py-3">Notebook</th>
                                    <th className="px-3 py-3">Modelo</th>
                                    <th className="px-3 py-3">Situação</th>
                                    {/*<th className="px-3 py-3">Patrimônio</th>*/}
                                    {/*<th className="px-3 py-3">IP</th>*/}
                                    <th className="px-3 py-3">MAC</th>
                                    {/*<th className="px-3 py-3">BitLocker</th>*/}
                                    <th className="px-3 py-3">Funcionário TI</th>
                                    <th className="px-3 py-3">Início operação</th>
                                    <th className="px-3 py-3">Garantia</th>
                                    {/*<th className="px-3 py-3">Observação</th>*/}
                                    <th className="px-3 py-3 text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((r) => (
                                    <tr
                                        key={String(r.ID_NOTEBOOKS_SICOOB)}
                                        className="border-t border-gray-100 hover:bg-gray-50/60"
                                    >
                                        <td className="px-3 py-3 font-semibold text-gray-900">
                                            {r.NM_NOTEBOOK ?? "-"}
                                        </td>

                                        <td className="px-3 py-3 text-gray-700">
                                            {r.NM_MODELO ?? "-"}
                                        </td>

                                        <td className="px-3 py-3">
                                            {r.DESC_SITUACAO ? (
                                                <span className="inline-flex rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700">
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

                                        <td className="px-3 py-3 text-gray-700">{r.NR_MAC ?? "-"}</td>

                                        {/*<td className="px-3 py-3 text-gray-700">{r.NR_BITLOCKER ?? "-"}</td>*/}

                                        <td className="px-3 py-3 text-gray-700">
                                            {r.NM_FUNCIONARIO_TI ?? "-"}
                                        </td>

                                        <td className="px-3 py-3 text-gray-700">
                                            {formatDate(r.DT_INICIO_OPERACAO)}
                                        </td>

                                        <td className="px-3 py-3 text-gray-700">
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
                                                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-600 transition hover:bg-gray-50 hover:text-gray-900 cursor-pointer"
                                                title="Editar notebook"
                                            >
                                                <FaPencilAlt size={13} className="hover:text-secondary"/>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <p className="mt-3 text-xs text-gray-500">
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

function formatDate(value: string | null) {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleDateString("pt-BR");
}