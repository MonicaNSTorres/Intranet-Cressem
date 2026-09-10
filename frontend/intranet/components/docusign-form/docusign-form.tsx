"use client";

import { useMemo, useState } from "react";
import axios from "axios";
import {
    ArrowDownAZ,
    ArrowUpZA,
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    Download,
    ExternalLink,
    FileSearch,
    Filter,
    Search,
} from "lucide-react";

type MissingDocRow = {
    ID?: number | string;
    CREATED_AT?: string | Date;
    UPDATED_AT?: string | Date;
    ENVELOPE_ID?: string;
    DOCUMENT_NAME?: string;
    EMAIL_SUBJECT?: string;
    STATUS?: string;
    RESPONSAVEL_NOME?: string;
    PDF_PATH?: string;
};

export function GrDocumentMissingForm() {
    const itensPorPagina = 20;

    const [error, setError] = useState<string | null>(null);

    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");

    const [statusFilter, setStatusFilter] = useState("");
    const [responsavelFilter, setResponsavelFilter] = useState("");
    const [searchFilter, setSearchFilter] = useState("");

    const [ordenacaoDataAsc, setOrdenacaoDataAsc] = useState(true);

    const [loadingProgress, setLoadingProgress] = useState<number | null>(null);
    const [rows, setRows] = useState<MissingDocRow[]>([]);
    const [paginaAtual, setPaginaAtual] = useState(1);

    const rowsOrdenadas = useMemo(() => {
        const copy = [...rows];

        return copy.sort((a, b) => {
            const aTime = a.CREATED_AT
                ? new Date(a.CREATED_AT).getTime()
                : 0;
            const bTime = b.CREATED_AT
                ? new Date(b.CREATED_AT).getTime()
                : 0;

            return ordenacaoDataAsc ? aTime - bTime : bTime - aTime;
        });
    }, [rows, ordenacaoDataAsc]);

    const rowsFiltradas = useMemo(() => {
        let data = [...rowsOrdenadas];

        if (statusFilter.trim()) {
            const s = statusFilter.toLowerCase();

            data = data.filter((r) =>
                String(r.STATUS || "")
                    .toLowerCase()
                    .includes(s)
            );
        }

        if (responsavelFilter.trim()) {
            const s = responsavelFilter.toLowerCase();

            data = data.filter((r) =>
                String(r.RESPONSAVEL_NOME || "")
                    .toLowerCase()
                    .includes(s)
            );
        }

        if (searchFilter.trim()) {
            const s = searchFilter.toLowerCase();

            data = data.filter((r) => {
                const blob = [
                    r.ENVELOPE_ID,
                    r.DOCUMENT_NAME,
                    r.EMAIL_SUBJECT,
                    r.STATUS,
                    r.RESPONSAVEL_NOME,
                    r.ID,
                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();

                return blob.includes(s);
            });
        }

        return data;
    }, [
        rowsOrdenadas,
        statusFilter,
        responsavelFilter,
        searchFilter,
    ]);

    const totalPaginas = useMemo(() => {
        return Math.max(
            1,
            Math.ceil(rowsFiltradas.length / itensPorPagina)
        );
    }, [rowsFiltradas.length]);

    const rowsPaginadas = useMemo(() => {
        const inicio = (paginaAtual - 1) * itensPorPagina;
        const fim = paginaAtual * itensPorPagina;

        return rowsFiltradas.slice(inicio, fim);
    }, [rowsFiltradas, paginaAtual]);

    const handleBuscar = async () => {
        try {
            setError(null);
            setLoadingProgress(10);

            const base = process.env.NEXT_PUBLIC_API_URL;

            const res = await axios.get(
                `${base}/v1/gr-document-missing`,
                {
                    params: {
                        from_date: fromDate || undefined,
                        to_date: toDate || undefined,
                        status: statusFilter || undefined,
                        responsavel: responsavelFilter || undefined,
                        q: searchFilter || undefined,
                    },
                    withCredentials: true,
                }
            );

            setRows(res.data?.rows || []);
            setPaginaAtual(1);

            let fake = 10;

            const interval = setInterval(() => {
                fake += 10;

                if (fake >= 100) {
                    clearInterval(interval);
                    setLoadingProgress(100);

                    setTimeout(() => {
                        setLoadingProgress(null);
                    }, 800);
                } else {
                    setLoadingProgress(fake);
                }
            }, 80);
        } catch (err) {
            console.error(
                "Erro ao consultar documentos pendentes:",
                err
            );

            setLoadingProgress(null);
            setError("Erro ao buscar registros.");
        }
    };

    const inputClassName =
        "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-[var(--title)] outline-none transition placeholder:text-[var(--text-darken-placeholder)] hover:border-slate-300 focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/10";

    return (
        <div className="w-full">
            <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-primary shadow-sm">
                            <CalendarDays className="h-5 w-5" />
                        </div>

                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-(--text-darken)">
                                Período da consulta
                            </p>

                            <p className="mt-1 text-sm text-(--paragraph)">
                                Informe a data inicial e final para delimitar os
                                registros.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border border-(--secondary)/15 bg-(--secondary)/5 p-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-secondary shadow-sm">
                            <Download className="h-5 w-5" />
                        </div>

                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-(--text-darken)">
                                Ações disponíveis
                            </p>

                            <p className="mt-1 text-sm text-(--paragraph)">
                                Abra o PDF em uma nova guia ou faça o download
                                do arquivo.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {error && (
                <div
                    role="alert"
                    className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                >
                    <span className="font-semibold">Erro:</span> {error}
                </div>
            )}

            {loadingProgress !== null && (
                <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                            <h3 className="text-sm font-semibold text-(--title)">
                                Carregando registros
                            </h3>

                            <p className="mt-1 text-xs text-(--paragraph)">
                                Aguarde enquanto buscamos os documentos
                                solicitados.
                            </p>
                        </div>

                        <span className="rounded-full bg-(--primary)/10 px-3 py-1 text-xs font-semibold text-primary">
                            {loadingProgress}%
                        </span>
                    </div>

                    <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                            className="absolute inset-y-0 left-0 rounded-full bg-linear-to-r from-primary to-secondary transition-all duration-500 ease-out"
                            style={{
                                width: `${loadingProgress}%`,
                            }}
                        />
                    </div>
                </div>
            )}

            <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 lg:p-6">
                <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-(--primary)/10 text-primary">
                        <Filter className="h-4 w-4" />
                    </div>

                    <div>
                        <h2 className="text-lg font-semibold text-(--title)">
                            Filtros de pesquisa
                        </h2>

                        <p className="mt-1 text-sm leading-6 text-(--paragraph)">
                            É obrigatório informar a data inicial e a data
                            final. Os demais filtros são opcionais.
                        </p>
                    </div>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
                    <div>
                        <label
                            htmlFor="fromDate"
                            className="mb-1.5 block text-xs font-semibold text-(--text-darken)"
                        >
                            Data inicial
                        </label>

                        <input
                            id="fromDate"
                            type="date"
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                            className={inputClassName}
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="toDate"
                            className="mb-1.5 block text-xs font-semibold text-(--text-darken)"
                        >
                            Data final
                        </label>

                        <input
                            id="toDate"
                            type="date"
                            value={toDate}
                            onChange={(e) => setToDate(e.target.value)}
                            className={inputClassName}
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="statusFilter"
                            className="mb-1.5 block text-xs font-semibold text-(--text-darken)"
                        >
                            Status
                        </label>

                        <input
                            id="statusFilter"
                            type="text"
                            value={statusFilter}
                            onChange={(e) =>
                                setStatusFilter(e.target.value)
                            }
                            className={inputClassName}
                            placeholder="Ex.: missing"
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="responsavelFilter"
                            className="mb-1.5 block text-xs font-semibold text-(--text-darken)"
                        >
                            Responsável
                        </label>

                        <input
                            id="responsavelFilter"
                            type="text"
                            value={responsavelFilter}
                            onChange={(e) =>
                                setResponsavelFilter(e.target.value)
                            }
                            className={inputClassName}
                            placeholder="Ex.: Lucas"
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="searchFilter"
                            className="mb-1.5 block text-xs font-semibold text-(--text-darken)"
                        >
                            Busca livre
                        </label>

                        <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-(--text-darken)" />

                            <input
                                id="searchFilter"
                                type="text"
                                value={searchFilter}
                                onChange={(e) =>
                                    setSearchFilter(e.target.value)
                                }
                                className={`${inputClassName} pl-10`}
                                placeholder="Envelope, documento, ID..."
                            />
                        </div>
                    </div>
                </div>

                <div className="mt-5 flex flex-col gap-4 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs leading-5 text-(--paragraph)">
                        Dica: use a busca livre para localizar rapidamente por
                        envelope, documento, status ou identificador.
                    </p>

                    <button
                        type="button"
                        onClick={handleBuscar}
                        disabled={loadingProgress !== null}
                        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-secondary px-6 font-semibold text-white shadow-sm transition hover:cursor-pointer hover:bg-primary hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                    >
                        <Search className="h-4 w-4" />

                        {loadingProgress !== null
                            ? "Buscando..."
                            : "Buscar documentos"}
                    </button>
                </div>
            </section>

            {rowsFiltradas.length > 0 && (
                <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex flex-col gap-4 border-b border-slate-200 bg-slate-50/70 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <h3 className="text-lg font-semibold text-(--title)">
                                Resultados encontrados
                            </h3>

                            <p className="mt-1 text-sm text-(--paragraph)">
                                {rowsFiltradas.length} registros encontrados
                                {fromDate && toDate
                                    ? ` entre ${new Date(
                                          fromDate
                                      ).toLocaleDateString(
                                          "pt-BR"
                                      )} e ${new Date(
                                          toDate
                                      ).toLocaleDateString(
                                          "pt-BR"
                                      )}.`
                                    : "."}
                            </p>
                        </div>

                        <div className="flex items-center justify-between gap-2 sm:justify-end">
                            <button
                                type="button"
                                onClick={() =>
                                    setPaginaAtual((prev) =>
                                        Math.max(prev - 1, 1)
                                    )
                                }
                                disabled={paginaAtual === 1}
                                aria-label="Página anterior"
                                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-(--title) transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                <ChevronLeft className="h-4 w-4" />
                                <span className="hidden sm:inline">
                                    Anterior
                                </span>
                            </button>

                            <span className="whitespace-nowrap rounded-xl bg-white px-3 py-2 text-sm font-medium text-(--paragraph) shadow-sm ring-1 ring-slate-200">
                                Página {paginaAtual} de {totalPaginas}
                            </span>

                            <button
                                type="button"
                                onClick={() =>
                                    setPaginaAtual((prev) =>
                                        prev < totalPaginas
                                            ? prev + 1
                                            : prev
                                    )
                                }
                                disabled={paginaAtual >= totalPaginas}
                                aria-label="Próxima página"
                                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-(--title) transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                <span className="hidden sm:inline">
                                    Próxima
                                </span>
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full min-w-245 table-auto">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th
                                        onClick={() =>
                                            setOrdenacaoDataAsc(
                                                (prev) => !prev
                                            )
                                        }
                                        className="cursor-pointer select-none border-b border-slate-200 px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-(--text-darken) transition hover:bg-slate-100"
                                    >
                                        <div className="flex items-center gap-2">
                                            Data

                                            {ordenacaoDataAsc ? (
                                                <ArrowDownAZ className="h-4 w-4 text-primary" />
                                            ) : (
                                                <ArrowUpZA className="h-4 w-4 text-primary" />
                                            )}
                                        </div>
                                    </th>

                                    <th className="border-b border-slate-200 px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-(--text-darken)">
                                        Envelope
                                    </th>

                                    <th className="border-b border-slate-200 px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-(--text-darken)">
                                        Documento
                                    </th>

                                    <th className="border-b border-slate-200 px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-(--text-darken)">
                                        Status
                                    </th>

                                    <th className="border-b border-slate-200 px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-(--text-darken)">
                                        Responsável
                                    </th>

                                    <th className="border-b border-slate-200 px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-(--text-darken)">
                                        Ações
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {rowsPaginadas.map((r, idx) => {
                                    const key = String(
                                        r.ID || r.ENVELOPE_ID || idx
                                    );

                                    return (
                                        <tr
                                            key={key}
                                            className="border-b border-slate-100 bg-white transition last:border-b-0 hover:bg-(--primary)/[0.035]"
                                        >
                                            <td className="whitespace-nowrap px-5 py-4 text-sm text-(--paragraph)">
                                                {r.CREATED_AT
                                                    ? new Date(
                                                          r.CREATED_AT
                                                      ).toLocaleDateString(
                                                          "pt-BR"
                                                      )
                                                    : "—"}
                                            </td>

                                            <td className="px-5 py-4 text-sm font-medium text-(--title)">
                                                <div
                                                    className="max-w-45 truncate"
                                                    title={
                                                        r.ENVELOPE_ID || "—"
                                                    }
                                                >
                                                    {r.ENVELOPE_ID || "—"}
                                                </div>
                                            </td>

                                            <td className="px-5 py-4 text-sm text-(--paragraph)">
                                                <div
                                                    className="max-w-85 truncate"
                                                    title={
                                                        r.EMAIL_SUBJECT || "—"
                                                    }
                                                >
                                                    {r.EMAIL_SUBJECT || "—"}
                                                </div>
                                            </td>

                                            <td className="px-5 py-4 text-sm">
                                                <span className="inline-flex rounded-full border border-(--third)/40 bg-(--third)/15 px-3 py-1 text-xs font-semibold text-(--title)">
                                                    {r.STATUS || "—"}
                                                </span>
                                            </td>

                                            <td className="px-5 py-4 text-sm text-(--paragraph)">
                                                <div
                                                    className="max-w-45 truncate"
                                                    title={
                                                        r.RESPONSAVEL_NOME ||
                                                        "—"
                                                    }
                                                >
                                                    {r.RESPONSAVEL_NOME ||
                                                        "—"}
                                                </div>
                                            </td>

                                            <td className="px-5 py-4">
                                                <div className="flex flex-wrap gap-2">
                                                    {r.ENVELOPE_ID ? (
                                                        <>
                                                            <a
                                                                href={`${process.env.NEXT_PUBLIC_API_URL}/v1/download-from-db?envelopeId=${r.ENVELOPE_ID}&inline=false`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-(--title) transition hover:border-secondary hover:bg-(--secondary)/10 hover:text-secondary"
                                                            >
                                                                <Download className="h-4 w-4" />
                                                                Baixar
                                                            </a>

                                                            <a
                                                                href={`${process.env.NEXT_PUBLIC_API_URL}/v1/download-from-db?envelopeId=${r.ENVELOPE_ID}&inline=true`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="inline-flex h-9 items-center gap-2 rounded-xl bg-secondary px-3 text-sm font-medium text-white shadow-sm transition hover:bg-primary hover:shadow-md"
                                                            >
                                                                <ExternalLink className="h-4 w-4" />
                                                                Abrir
                                                            </a>
                                                        </>
                                                    ) : (
                                                        <span className="text-sm text-slate-400">
                                                            —
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}

            {rowsFiltradas.length === 0 &&
                loadingProgress === null && (
                    <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-slate-50/50 p-8 text-center sm:p-12">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-(--primary)/10 text-primary">
                            <FileSearch className="h-8 w-8" />
                        </div>

                        <h3 className="text-lg font-semibold text-(--title)">
                            Nenhum documento exibido no momento
                        </h3>

                        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-(--paragraph)">
                            Preencha o período e os filtros desejados e clique
                            em{" "}
                            <span className="font-semibold text-(--title)">
                                Buscar documentos
                            </span>{" "}
                            para consultar os registros da DocuSign.
                        </p>
                    </div>
                )}
        </div>
    );
}
