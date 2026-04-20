"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
    ArrowDownAZ,
    ArrowUpZA,
    CalendarDays,
    Download,
    ExternalLink,
    FileSearch,
    Filter,
    Search,
    ShieldCheck,
    UserCircle2,
} from "lucide-react";
import { useRouter } from "next/navigation";

const normalizeUserName = (name: string): string => {
    return name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9.]/g, "")
        .trim();
};

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
    const router = useRouter();

    const usuariosDiretoria = useMemo(
        () =>
            [
                "monica.torres",
                "tiago.teixeira",
                "paulo.alciprete",
                "paulo.tarso",
                "janainag",
                "diego.adriano",
                "thais.yumi",
                "lucas.itner",
                "marcelo.bueno",
                "renata.teixeira",
                "thiago.msantos",
                "luiz.gerhard",
                "vitoria.fontoura",
                "fabio.prado",
                "ricardo.henrique",
                "renata.steixeira",
                "jennyffer.rodrigues",
            ].map((n) => normalizeUserName(n)),
        []
    );

    const itensPorPagina = 20;

    const [autenticado, setAutenticado] = useState<boolean | null>(null);
    const [loggedInUserName, setLoggedInUserName] = useState<string | null>(null);
    const [isClientLoaded, setIsClientLoaded] = useState(false);

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

    useEffect(() => {
        setIsClientLoaded(true);
    }, []);

    useEffect(() => {
        async function checkAuthentication() {
            if (!isClientLoaded || autenticado !== null) return;

            try {
                const response = await axios.get(
                    `${process.env.NEXT_PUBLIC_API_URL}/v1/me`,
                    {
                        withCredentials: true,
                    }
                );

                const identifiedUserName = response.data?.username;
                const grupos = Array.isArray(response.data?.grupos)
                    ? response.data.grupos
                    : [];

                if (identifiedUserName) {
                    const normalizedName = normalizeUserName(identifiedUserName);
                    setLoggedInUserName(normalizedName);
                } else {
                    setError(
                        "Acesso restrito: Nome de usuário não fornecido na sessão. Redirecionando para autenticação."
                    );
                    setAutenticado(false);
                    return;
                }

                const pertenceAoGrupo = grupos.some(
                    (grupo: string) => String(grupo).toUpperCase() === "GG_USERS_DOCUSIGN"
                );

                if (pertenceAoGrupo) {
                    setAutenticado(true);
                } else {
                    setError("Acesso restrito: Você não tem permissão para visualizar esta tela.");
                    setAutenticado(false);
                }
            } catch (err) {
                console.error("Erro ao verificar sessão Next.js:", err);
                setError(
                    "Acesso restrito: Sua sessão expirou ou não foi iniciada. Redirecionando para autenticação."
                );
                setAutenticado(false);
            }
        }

        checkAuthentication();
    }, [autenticado, isClientLoaded, usuariosDiretoria]);

    const rowsOrdenadas = useMemo(() => {
        const copy = [...rows];
        return copy.sort((a, b) => {
            const aTime = a.CREATED_AT ? new Date(a.CREATED_AT).getTime() : 0;
            const bTime = b.CREATED_AT ? new Date(b.CREATED_AT).getTime() : 0;
            return ordenacaoDataAsc ? aTime - bTime : bTime - aTime;
        });
    }, [rows, ordenacaoDataAsc]);

    const rowsFiltradas = useMemo(() => {
        let data = [...rowsOrdenadas];

        if (statusFilter.trim()) {
            const s = statusFilter.toLowerCase();
            data = data.filter((r) => String(r.STATUS || "").toLowerCase().includes(s));
        }

        if (responsavelFilter.trim()) {
            const s = responsavelFilter.toLowerCase();
            data = data.filter((r) => String(r.RESPONSAVEL_NOME || "").toLowerCase().includes(s));
        }

        if (searchFilter.trim()) {
            const s = searchFilter.toLowerCase();
            data = data.filter((r) => {
                const blob = [
                    r.ENVELOPE_ID,
                    r.DOCUMENT_NAME,
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
    }, [rowsOrdenadas, statusFilter, responsavelFilter, searchFilter]);

    const totalPaginas = useMemo(() => {
        return Math.max(1, Math.ceil(rowsFiltradas.length / itensPorPagina));
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

            const res = await axios.get(`${base}/v1/gr-document-missing`, {
                params: {
                    from_date: fromDate || undefined,
                    to_date: toDate || undefined,
                    status: statusFilter || undefined,
                    responsavel: responsavelFilter || undefined,
                    q: searchFilter || undefined,
                },
            });

            setRows(res.data?.rows || []);
            setPaginaAtual(1);

            let fake = 10;
            const interval = setInterval(() => {
                fake += 10;

                if (fake >= 100) {
                    clearInterval(interval);
                    setLoadingProgress(100);
                    setTimeout(() => setLoadingProgress(null), 800);
                } else {
                    setLoadingProgress(fake);
                }
            }, 80);
        } catch (err) {
            console.error("Erro ao consultar documentos pendentes:", err);
            setLoadingProgress(null);
            setError("Erro ao buscar registros.");
        }
    };

    if (autenticado === null) {
        return (
            <div className="max-w-3xl mx-auto p-10 bg-white rounded-xl shadow text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#C7D300] bg-[#C7D300]/20 text-[#00AE9D]">
                    <ShieldCheck className="h-7 w-7" />
                </div>
                <h2 className="text-xl font-semibold text-[var(--title)]">
                    Verificando permissões de acesso
                </h2>
                <p className="mt-2 text-sm text-[var(--paragraph)]">
                    Aguarde enquanto validamos seu acesso ao painel da DocuSign.
                </p>
            </div>
        );
    }

    if (autenticado === false) {
        return (
            <div className="max-w-xl mx-auto mt-10 p-8 bg-white rounded-xl shadow text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                    <ShieldCheck className="h-7 w-7" />
                </div>
                <h1 className="text-2xl font-semibold text-red-600">Acesso Negado</h1>
                <p className="mt-3 text-sm leading-6 text-[var(--paragraph)]">
                    {error || "Você não tem permissão para acessar esta tela."}
                </p>
                <button
                    onClick={() => router.push("https://intranet/menu")}
                    className="mt-6 inline-flex items-center justify-center rounded-xl bg-[var(--primary)] px-5 py-2.5 font-semibold text-white transition hover:cursor-pointer hover:bg-[var(--secondary)] hover:shadow-md"
                >
                    Retornar à Intranet
                </button>
            </div>
        );
    }

    return (
        <div className="min-w-225 mx-auto p-6 bg-white rounded-xl shadow">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="rounded-2xl border border-slate-200 bg-linear-to-br from-[#00AE9D]/10 via-white to-white p-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-[var(--primary)] shadow-sm">
                            <CalendarDays className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-darken)]">
                                Período
                            </p>
                            <p className="text-sm text-[var(--paragraph)]">
                                Informe data inicial e final para iniciar a consulta.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-linear-to-br from-[#79B729]/10 via-white to-white p-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-[var(--secondary)] shadow-sm">
                            <Download className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-darken)]">
                                Ações rápidas
                            </p>
                            <p className="text-sm text-[var(--paragraph)]">
                                Abra o PDF no navegador ou faça o download do arquivo.
                            </p>
                        </div>
                    </div>
                </div>

                {loggedInUserName && (
                    <div className="inline-flex items-center gap-2 self-start rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-[var(--paragraph)] shadow-sm">
                        <UserCircle2 className="h-4 w-4 text-[var(--primary)]" />
                        <span>Logado como:</span>
                        <span className="font-semibold text-[var(--title)]">{loggedInUserName}</span>
                    </div>
                )}
            </div>

            {error && (
                <div className="mt-6 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
                    Erro: {error}
                </div>
            )}

            {loadingProgress !== null && (
                <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                            <h3 className="text-sm font-semibold text-[var(--title)]">
                                Carregando registros
                            </h3>
                            <p className="text-xs text-[var(--paragraph)]">
                                Aguarde enquanto buscamos os documentos solicitados.
                            </p>
                        </div>
                        <span className="rounded-full bg-[var(--primary)]/10 px-3 py-1 text-xs font-semibold text-[var(--primary)]">
                            {loadingProgress}%
                        </span>
                    </div>

                    <div className="relative h-3 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                            className="absolute left-0 top-0 h-full rounded-full transition-all duration-500 ease-out"
                            style={{
                                width: `${loadingProgress}%`,
                                background: "linear-gradient(90deg, #00AE9D, #79B729)",
                            }}
                        />
                    </div>
                </div>
            )}

            <div className="mt-6">
                <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-[var(--primary)]" />
                    <h2 className="text-lg font-semibold text-[var(--title)]">Filtros de pesquisa</h2>
                </div>
                <p className="mt-1 text-sm text-[var(--paragraph)]">
                    É obrigatório informar a data inicial e a data final. Os demais filtros são opcionais.
                </p>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Data Inicial</label>
                    <input
                        type="date"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                        className="w-full border px-3 py-2 rounded bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                    />
                </div>

                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Data Final</label>
                    <input
                        type="date"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                        className="w-full border px-3 py-2 rounded bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                    />
                </div>

                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                    <input
                        type="text"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full border px-3 py-2 rounded bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                        placeholder="Ex: missing"
                    />
                </div>

                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Responsável</label>
                    <input
                        type="text"
                        value={responsavelFilter}
                        onChange={(e) => setResponsavelFilter(e.target.value)}
                        className="w-full border px-3 py-2 rounded bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                        placeholder="Ex: Lucas"
                    />
                </div>

                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Busca livre</label>
                    <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-darken)]" />
                        <input
                            type="text"
                            value={searchFilter}
                            onChange={(e) => setSearchFilter(e.target.value)}
                            className="w-full border py-2 pl-10 pr-3 rounded bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                            placeholder="envelope, doc, id..."
                        />
                    </div>
                </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-[var(--paragraph)]">
                    Dica: use a busca livre para localizar rapidamente por envelope, documento, status ou identificador.
                </p>

                <button
                    onClick={handleBuscar}
                    className="inline-flex items-center justify-center gap-2 bg-secondary text-white font-semibold px-6 py-2 rounded hover:bg-primary cursor-pointer hover:shadow-md"
                >
                    <Search className="h-4 w-4" />
                    Buscar
                </button>
            </div>

            {rowsFiltradas.length > 0 && (
                <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <h3 className="text-lg font-semibold text-[var(--title)]">Resultados encontrados</h3>
                            <p className="mt-1 text-sm text-[var(--paragraph)]">
                                {rowsFiltradas.length} registros encontrados
                                {fromDate && toDate
                                    ? ` entre ${new Date(fromDate).toLocaleDateString("pt-BR")} e ${new Date(
                                        toDate
                                    ).toLocaleDateString("pt-BR")}.`
                                    : "."}
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <button
                                onClick={() => setPaginaAtual((prev) => Math.max(prev - 1, 1))}
                                className="px-4 py-2 bg-gray-300 font-semibold rounded disabled:opacity-50 hover:shadow-md cursor-pointer hover:bg-blue-400 hover:text-white"
                                disabled={paginaAtual === 1}
                            >
                                Anterior
                            </button>

                            <span className="rounded-2xl bg-slate-100 px-4 py-2.5 text-sm font-medium text-[var(--paragraph)]">
                                Página {paginaAtual} de {totalPaginas}
                            </span>

                            <button
                                onClick={() => setPaginaAtual((prev) => (prev < totalPaginas ? prev + 1 : prev))}
                                className="px-4 py-2 bg-gray-300 font-semibold rounded disabled:opacity-50 hover:shadow-md cursor-pointer hover:bg-blue-400 hover:text-white"
                                disabled={paginaAtual >= totalPaginas}
                            >
                                Próxima
                            </button>
                        </div>
                    </div>

                    <div className="overflow-hidden rounded-2xl border border-slate-200">
                        <div className="overflow-x-auto">
                            <table className="min-w-full table-auto">
                                <thead className="sticky top-0 z-10 bg-slate-50">
                                    <tr>
                                        <th
                                            onClick={() => setOrdenacaoDataAsc((prev) => !prev)}
                                            className="cursor-pointer select-none border-b border-slate-200 px-4 py-4 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-darken)]"
                                        >
                                            <div className="flex items-center gap-2">
                                                Data
                                                {ordenacaoDataAsc ? (
                                                    <ArrowDownAZ className="h-4 w-4 text-[var(--primary)]" />
                                                ) : (
                                                    <ArrowUpZA className="h-4 w-4 text-[var(--primary)]" />
                                                )}
                                            </div>
                                        </th>

                                        <th className="border-b border-slate-200 px-4 py-4 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-darken)]">
                                            Envelope
                                        </th>
                                        <th className="border-b border-slate-200 px-4 py-4 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-darken)]">
                                            Documento
                                        </th>
                                        <th className="border-b border-slate-200 px-4 py-4 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-darken)]">
                                            Status
                                        </th>
                                        <th className="border-b border-slate-200 px-4 py-4 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-darken)]">
                                            Responsável
                                        </th>
                                        <th className="border-b border-slate-200 px-4 py-4 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-darken)]">
                                            Ações
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {rowsPaginadas.map((r, idx) => {
                                        const key = String(r.ID || r.ENVELOPE_ID || idx);

                                        return (
                                            <tr
                                                key={key}
                                                className="border-b border-slate-100 bg-white transition hover:bg-slate-50/80"
                                            >
                                                <td className="px-4 py-4 text-sm text-[var(--paragraph)]">
                                                    {r.CREATED_AT ? new Date(r.CREATED_AT).toLocaleDateString("pt-BR") : "—"}
                                                </td>

                                                <td className="px-4 py-4 text-sm font-medium text-[var(--title)]">
                                                    <div className="max-w-[180px] truncate" title={r.ENVELOPE_ID || "—"}>
                                                        {r.ENVELOPE_ID || "—"}
                                                    </div>
                                                </td>

                                                <td className="px-4 py-4 text-sm text-[var(--paragraph)]">
                                                    <div className="max-w-[320px] truncate" title={r.EMAIL_SUBJECT || "—"}>
                                                        {r.EMAIL_SUBJECT || "—"}
                                                    </div>
                                                </td>

                                                <td className="px-4 py-4 text-sm">
                                                    <span className="inline-flex rounded-full bg-[var(--third)]/20 px-3 py-1 text-xs font-semibold text-[var(--title)]">
                                                        {r.STATUS || "—"}
                                                    </span>
                                                </td>

                                                <td className="px-4 py-4 text-sm text-[var(--paragraph)]">
                                                    <div className="max-w-[180px] truncate" title={r.RESPONSAVEL_NOME || "—"}>
                                                        {r.RESPONSAVEL_NOME || "—"}
                                                    </div>
                                                </td>

                                                <td className="px-4 py-4">
                                                    <div className="flex flex-wrap gap-2">
                                                        {r.ENVELOPE_ID ? (
                                                            <>
                                                                <a
                                                                    href={`${process.env.NEXT_PUBLIC_API_URL}/v1/download-from-db?envelopeId=${r.ENVELOPE_ID}&inline=false`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-[var(--title)] transition hover:border-[var(--secondary)] hover:bg-[var(--secondary)]/10 hover:text-[var(--secondary)]"
                                                                >
                                                                    <Download className="h-4 w-4" /> Baixar
                                                                </a>

                                                                <a
                                                                    href={`${process.env.NEXT_PUBLIC_API_URL}/v1/download-from-db?envelopeId=${r.ENVELOPE_ID}&inline=true`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-3 py-2 text-sm font-medium text-white transition hover:bg-[var(--fourth)] hover:shadow-sm"
                                                                >
                                                                    <ExternalLink className="h-4 w-4" /> Abrir
                                                                </a>
                                                            </>
                                                        ) : (
                                                            <span className="text-sm text-slate-400">—</span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {rowsFiltradas.length === 0 && !loadingProgress && (
                <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-[var(--primary)]">
                        <FileSearch className="h-7 w-7" />
                    </div>
                    <h3 className="text-lg font-semibold text-[var(--title)]">
                        Nenhum documento exibido no momento
                    </h3>
                    <p className="mt-2 text-sm text-[var(--paragraph)]">
                        Preencha os filtros e clique em <span className="font-semibold">Buscar</span> para consultar os documentos da DocuSign.
                    </p>
                </div>
            )}
        </div>
    );
}