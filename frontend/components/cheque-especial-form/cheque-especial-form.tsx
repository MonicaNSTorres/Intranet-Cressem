"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useState } from "react";
import {
    FaCheckCircle,
    FaChevronLeft,
    FaChevronRight,
    FaClock,
    FaDownload,
    FaMoneyCheckAlt,
    FaSearch,
    FaTimes,
    FaUserCheck,
} from "react-icons/fa";
import {
    atualizarChequeEspecial,
    baixarRelatorioChequeEspecial,
    buscarChequeEspecialPaginado,
    buscarChequeEspecialTotais,
    buscarUsuarioLogadoChequeEspecial,
    type ChequeEspecialItem,
} from "@/services/cheque_especial.service";

function capitalizeWords(value?: string | null) {
    return String(value || "")
        .toLocaleLowerCase("pt-BR")
        .replace(/(^|\s|-|\/)\p{L}/gu, (char) =>
            char.toLocaleUpperCase("pt-BR")
        );
}

function normalizeSearch(value?: string | null) {
    return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

function onlyCpfCnpjChars(value?: string | null) {
    return String(value || "")
        .replace(/[^a-zA-Z0-9]/g, "")
        .toUpperCase();
}

function formatarCpfCnpj(value?: string | null) {
    const chars = onlyCpfCnpjChars(value).slice(0, 14);

    if (chars.length <= 11 && !/[A-Z]/.test(chars)) {
        return chars
            .replace(/^(\d{3})(\d)/, "$1.$2")
            .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
            .replace(/\.(\d{3})(\d)/, ".$1-$2");
    }

    return chars
        .replace(/^(.{2})(.)/, "$1.$2")
        .replace(/^(.{2})\.(.{3})(.)/, "$1.$2.$3")
        .replace(/\.(.{3})(.)/, ".$1/$2")
        .replace(/(.{4})(.)$/, "$1-$2");
}

function getDataHojeFormatoAmericano() {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, "0");
    const dia = String(hoje.getDate()).padStart(2, "0");

    return `${ano}-${mes}-${dia}`;
}

function getMesReferenciaTexto() {
    const now = new Date();

    const meses = [
        "Janeiro",
        "Fevereiro",
        "Março",
        "Abril",
        "Maio",
        "Junho",
        "Julho",
        "Agosto",
        "Setembro",
        "Outubro",
        "Novembro",
        "Dezembro",
    ];

    const mesAtual = now.getMonth();
    const ajusteMes = now.getDate() <= 5 ? 2 : 1;

    let mesParaMostrar = mesAtual - ajusteMes;

    if (mesParaMostrar < 0) {
        mesParaMostrar += 12;
    }

    return meses[mesParaMostrar];
}

type ResumoAlteracao = {
    total: number;
    concluidos: number;
    pendentes: number;
};

function criarResumoAlteracao(): ResumoAlteracao {
    return {
        total: 0,
        concluidos: 0,
        pendentes: 0,
    };
}

function normalizarAlteracao(value?: string | null) {
    return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toUpperCase();
}

function isAlteracaoConceder(value?: string | null) {
    const alteracao = normalizarAlteracao(value);

    return alteracao.includes("CONCED") || alteracao.includes("ACRESC");
}

function isAlteracaoRetirar(value?: string | null) {
    return normalizarAlteracao(value).includes("RETIR");
}

const USUARIOS_AUTORIZADOS_BAIXAR = [
    "ADRIANO CASTRO SPEGIORIN",
    "ANA CAROLINA MOTA HESPANHA RODRIGUES",
    "HEITOR PEIXOTO DE SOUZA",
    "VANDERLEIA MARIA DA SILVA MEDEIROS",
    "MARCELO OLIVEIRA BUENO DA SILVA",
    "RENATA DE SOUZA TEIXEIRA",
];

export function ChequeEspecialForm() {
    const [q, setQ] = useState("");
    const [statusFiltro, setStatusFiltro] = useState("todos");
    const [tipoAlteracaoFiltro, setTipoAlteracaoFiltro] = useState("todos");
    const [rows, setRows] = useState<ChequeEspecialItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingResumo, setLoadingResumo] = useState(false);

    const [error, setError] = useState<string | null>(null);
    const [info, setInfo] = useState<string | null>(null);

    const [paginaAtual, setPaginaAtual] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [limitePorPagina, setLimitePorPagina] = useState(10);

    const [total, setTotal] = useState(0);
    const [concluidos, setConcluidos] = useState(0);
    const [pendentes, setPendentes] = useState(0);
    const [resumoConceder, setResumoConceder] = useState<ResumoAlteracao>(() =>
        criarResumoAlteracao()
    );
    const [resumoRetirar, setResumoRetirar] = useState<ResumoAlteracao>(() =>
        criarResumoAlteracao()
    );

    const [ordenacaoFeitoDesc, setOrdenacaoFeitoDesc] = useState(false);
    const [ordenacaoAlteracaoDesc, setOrdenacaoAlteracaoDesc] = useState(false);

    const [nomeUsuarioLogado, setNomeUsuarioLogado] = useState("");
    const [mesReferencia, setMesReferencia] = useState("");

    const debouncedQ = useDebouncedValue(q, 300);

    useEffect(() => {
        setMesReferencia(getMesReferenciaTexto());
        carregarResumo();
        carregarUsuarioLogado();
    }, []);

    useEffect(() => {
        const termo = String(debouncedQ || "").trim();

        if (!termo) {
            carregarRegistros(1, limitePorPagina, " ");
            return;
        }

        carregarRegistros(1, limitePorPagina, termo);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedQ]);

    async function carregarUsuarioLogado() {
        try {
            const response = await buscarUsuarioLogadoChequeEspecial();
            setNomeUsuarioLogado(response?.nome_completo || response?.username || "");
        } catch (e) {
            console.error("Erro ao carregar usuário logado:", e);
            setNomeUsuarioLogado("");
        }
    }

    async function carregarResumo() {
        try {
            setLoadingResumo(true);

            const response = await buscarChequeEspecialTotais();

            let totalLocal = 0;
            let concluidosLocal = 0;
            let pendentesLocal = 0;
            const concederLocal = criarResumoAlteracao();
            const retirarLocal = criarResumoAlteracao();

            (response || []).forEach((item) => {
                totalLocal += 1;
                const concluido = Number(item.SN_FEITO) !== 0;

                if (concluido) {
                    concluidosLocal += 1;
                } else {
                    pendentesLocal += 1;
                }

                if (isAlteracaoConceder(item.NM_ALTERACAO)) {
                    concederLocal.total += 1;
                    if (concluido) {
                        concederLocal.concluidos += 1;
                    } else {
                        concederLocal.pendentes += 1;
                    }
                }

                if (isAlteracaoRetirar(item.NM_ALTERACAO)) {
                    retirarLocal.total += 1;
                    if (concluido) {
                        retirarLocal.concluidos += 1;
                    } else {
                        retirarLocal.pendentes += 1;
                    }
                }
            });

            setTotal(totalLocal);
            setConcluidos(concluidosLocal);
            setPendentes(pendentesLocal);
            setResumoConceder(concederLocal);
            setResumoRetirar(retirarLocal);
        } catch (e) {
            console.error("Erro ao carregar resumo:", e);
        } finally {
            setLoadingResumo(false);
        }
    }

    async function carregarRegistros(
        page = 1,
        limit = limitePorPagina,
        termoBusca?: string,
        status = statusFiltro,
        tipoAlteracao = tipoAlteracaoFiltro
    ) {
        try {
            setLoading(true);
            setError(null);
            setInfo(null);

            const termoNormalizado = normalizeSearch(termoBusca ?? q ?? "");

            const response = await buscarChequeEspecialPaginado({
                nome: termoNormalizado || " ",
                page,
                limit,
                status,
                tipoAlteracao,
            });

            setRows(response.items || []);
            setPaginaAtual(response.current_page || page);
            setTotalPages(response.total_pages || 1);
            setTotalItems(Number(response.total_items || 0));
        } catch (e: any) {
            console.error(e);
            setRows([]);
            setTotalItems(0);
            setError(
                e?.response?.data?.error ||
                e?.response?.data?.details ||
                "Não foi possível carregar os registros."
            );
        } finally {
            setLoading(false);
        }
    }

    function limparBusca() {
        setQ("");
        setStatusFiltro("todos");
        setTipoAlteracaoFiltro("todos");
        setPaginaAtual(1);
        setTotalPages(1);
        setTotalItems(0);
        setError(null);
        setInfo(null);
        carregarRegistros(1, limitePorPagina, " ", "todos", "todos");
    }

    function aplicarFiltroCard(status: string, tipoAlteracao = "todos") {
        setQ("");
        setStatusFiltro(status);
        setTipoAlteracaoFiltro(tipoAlteracao);
        carregarRegistros(1, limitePorPagina, " ", status, tipoAlteracao);
    }

    async function marcarComoConcluido(item: ChequeEspecialItem) {
        const pendente = Number(item.SN_FEITO ?? 0) === 0;
        if (!pendente) return;

        try {
            setError(null);
            setInfo(null);

            const atendente = nomeUsuarioLogado || "ATENDENTE NÃO IDENTIFICADO";
            const dataHoje = getDataHojeFormatoAmericano();

            await atualizarChequeEspecial(
                item.ID_ATUALIZACAO_BENEFICIO_CHEQUE_ESPECIAL,
                nomeUsuarioLogado,
                dataHoje
            );

            setRows((prev) =>
                prev.map((registro) =>
                    registro.ID_ATUALIZACAO_BENEFICIO_CHEQUE_ESPECIAL ===
                        item.ID_ATUALIZACAO_BENEFICIO_CHEQUE_ESPECIAL
                        ? {
                            ...registro,
                            SN_FEITO: "1",
                            NM_ATENDENTE: atendente,
                            DT_ALTERACAO: dataHoje,
                        }
                        : registro
                )
            );

            setConcluidos((prev) => prev + 1);
            setPendentes((prev) => Math.max(0, prev - 1));
            if (isAlteracaoConceder(item.NM_ALTERACAO)) {
                setResumoConceder((prev) => ({
                    ...prev,
                    concluidos: prev.concluidos + 1,
                    pendentes: Math.max(0, prev.pendentes - 1),
                }));
            }
            if (isAlteracaoRetirar(item.NM_ALTERACAO)) {
                setResumoRetirar((prev) => ({
                    ...prev,
                    concluidos: prev.concluidos + 1,
                    pendentes: Math.max(0, prev.pendentes - 1),
                }));
            }
            setInfo("Registro atualizado com sucesso.");
        } catch (e: any) {
            console.error(e);
            setError(
                e?.response?.data?.error ||
                e?.response?.data?.details ||
                "Não foi possível atualizar o registro."
            );
        }
    }

    async function handleBaixarRelatorio() {
        try {
            setError(null);

            const blob = await baixarRelatorioChequeEspecial();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");

            link.href = url;
            link.download = `atualizacao_cheque_especial_mes_${mesReferencia}.csv`;

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            window.URL.revokeObjectURL(url);
        } catch (e: any) {
            console.error(e);
            setError(
                e?.response?.data?.error ||
                e?.response?.data?.details ||
                "Não foi possível baixar o relatório."
            );
        }
    }

    const podeBaixarRelatorio = useMemo(() => {
        const nomeUpper = String(nomeUsuarioLogado || "").toUpperCase();

        return USUARIOS_AUTORIZADOS_BAIXAR.some((nome) =>
            nomeUpper.includes(nome.toUpperCase())
        );
    }, [nomeUsuarioLogado]);

    const registrosOrdenados = useMemo(() => {
        const lista = [...rows];

        {/*if (statusFiltro === "pendente") {
            lista = lista.filter(
                (item) => Number(item.SN_FEITO ?? 0) === 0
            );
        }

        if (statusFiltro === "concluido") {
            lista = lista.filter(
                (item) => Number(item.SN_FEITO ?? 0) !== 0
            );
        }*/}

        lista.sort((a, b) => {
            const alteracaoA = String(a.NM_ALTERACAO || "");
            const alteracaoB = String(b.NM_ALTERACAO || "");

            return ordenacaoAlteracaoDesc
                ? alteracaoB.localeCompare(alteracaoA, "pt-BR")
                : alteracaoA.localeCompare(alteracaoB, "pt-BR");
        });

        lista.sort((a, b) => {
            const feitoA = Number(a.SN_FEITO || 0);
            const feitoB = Number(b.SN_FEITO || 0);

            return ordenacaoFeitoDesc ? feitoB - feitoA : feitoA - feitoB;
        });

        return lista;
    }, [rows, ordenacaoAlteracaoDesc, ordenacaoFeitoDesc]);

    const totalEncontrado = totalItems;

    return (
        <div className="space-y-5">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto]">
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <label className="text-xs font-black uppercase tracking-wide text-slate-600">Buscar</label>

                    <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-center">
                        <div className="flex h-10 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 shadow-sm transition focus-within:border-[#00AE9D] focus-within:ring-2 focus-within:ring-[#00AE9D]/10">
                            <input
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                                placeholder="Ex: nome, CPF, conta corrente ou tipo de alteração..."
                                className="w-full bg-transparent text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400"
                            />

                            {q ? (
                                <button
                                    type="button"
                                    onClick={limparBusca}
                                    className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl border border-[var(--text-darken-placeholder)] bg-white text-xs font-semibold text-[var(--title)] shadow-sm transition hover:border-primary hover:bg-primary/10"
                                >
                                    <FaTimes />
                                </button>
                            ) : null}
                        </div>

                        <select
                            value={statusFiltro}
                            onChange={(e) => {
                                const novoStatus = e.target.value;
                                const novoTipoAlteracao =
                                    novoStatus === "todos" ? "todos" : tipoAlteracaoFiltro;

                                setStatusFiltro(novoStatus);
                                setTipoAlteracaoFiltro(novoTipoAlteracao);

                                carregarRegistros(1, limitePorPagina, q, novoStatus, novoTipoAlteracao);
                            }}
                            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm outline-none transition focus:border-[#00AE9D] focus:ring-2 focus:ring-[#00AE9D]/10 lg:w-52"
                        >
                            <option value="todos">Todos os status</option>
                            <option value="pendente">Pendentes</option>
                            <option value="concluido">Concluídos</option>
                        </select>

                        {(statusFiltro !== "todos" || tipoAlteracaoFiltro !== "todos") && (
                            <select
                                value={tipoAlteracaoFiltro}
                                onChange={(e) => {
                                    const novoTipoAlteracao = e.target.value;

                                    setTipoAlteracaoFiltro(novoTipoAlteracao);
                                    carregarRegistros(
                                        1,
                                        limitePorPagina,
                                        q,
                                        statusFiltro,
                                        novoTipoAlteracao
                                    );
                                }}
                                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm outline-none transition focus:border-[#00AE9D] focus:ring-2 focus:ring-[#00AE9D]/10 lg:w-56"
                            >
                                <option value="todos">Todos os tipos</option>
                                <option value="acrescentar">Acrescentar desconto</option>
                                <option value="retirar">Retirar desconto</option>
                            </select>
                        )}

                        <button
                            type="button"
                            onClick={() =>
                                carregarRegistros(
                                    1,
                                    limitePorPagina,
                                    q,
                                    statusFiltro,
                                    tipoAlteracaoFiltro
                                )
                            }
                            className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl bg-secondary px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-primary disabled:cursor-not-allowed disabled:opacity-60 lg:w-auto"
                        >
                            <FaSearch />
                            Buscar
                        </button>

                        {podeBaixarRelatorio && (
                            <button
                                type="button"
                                onClick={handleBaixarRelatorio}
                                className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 text-sm font-semibold text-primary shadow-sm transition hover:bg-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <FaDownload />
                                Baixar Relatório
                            </button>
                        )}
                    </div>
                </div>

                <div className="rounded-3xl border border-[#00AE9D]/20 bg-gradient-to-br from-[#00AE9D]/10 to-[#C7D300]/20 p-5 shadow-sm lg:w-80">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <p className="text-xs font-black uppercase tracking-wide text-[#008f82]">
                                Mês de referência
                            </p>
                            <h3 className="mt-2 text-xl font-black text-slate-950">
                                {mesReferencia || "-"}
                            </h3>
                            <p className="mt-2 text-xs font-medium text-slate-600">
                                Atualizações mensais do benefício de cheque especial.
                            </p>
                        </div>

                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#C7D300] text-[#006f65] shadow-sm">
                            <FaMoneyCheckAlt size={16} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div
                    role="button"
                    tabIndex={0}
                    onClick={() => aplicarFiltroCard("todos")}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") aplicarFiltroCard("todos");
                    }}
                    className="cursor-pointer rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-[#00AE9D]/40 hover:bg-[#00AE9D]/5"
                >
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-500">Total encontrado</span>
                        <FaMoneyCheckAlt className="text-[#00AE9D]" />
                    </div>
                    <p className="mt-3 text-3xl font-black text-slate-950">
                        {loading ? "..." : totalEncontrado}
                    </p>
                    <p className="mt-1 text-xs font-medium text-slate-500">
                        Registros retornados na busca atual
                    </p>
                </div>

                <div
                    role="button"
                    tabIndex={0}
                    onClick={() => aplicarFiltroCard("todos", "acrescentar")}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                            aplicarFiltroCard("todos", "acrescentar");
                        }
                    }}
                    className="cursor-pointer rounded-3xl border border-[#00AE9D]/20 bg-[#00AE9D]/5 p-5 shadow-sm transition hover:border-[#00AE9D]/50 hover:bg-[#00AE9D]/10"
                >
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-600">Acrescentar desconto</span>
                        <FaUserCheck className="text-[#00AE9D]" />
                    </div>
                    <p className="mt-3 text-3xl font-black text-slate-950">
                        {loadingResumo ? "..." : resumoConceder.total}
                    </p>
                    <div className="mt-2 space-y-1 text-xs">
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                aplicarFiltroCard("concluido", "acrescentar");
                            }}
                            className="block cursor-pointer text-left text-emerald-700 transition hover:text-emerald-900 hover:underline"
                        >
                            <span className="font-semibold">
                                {loadingResumo ? "..." : resumoConceder.concluidos}
                            </span>{" "}
                            já alterados
                        </button>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                aplicarFiltroCard("pendente", "acrescentar");
                            }}
                            className="block cursor-pointer text-left text-amber-700 transition hover:text-amber-900 hover:underline"
                        >
                            <span className="font-semibold">
                                {loadingResumo ? "..." : resumoConceder.pendentes}
                            </span>{" "}
                            faltam aplicar
                        </button>
                    </div>
                </div>

                <div
                    role="button"
                    tabIndex={0}
                    onClick={() => aplicarFiltroCard("todos", "retirar")}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                            aplicarFiltroCard("todos", "retirar");
                        }
                    }}
                    className="cursor-pointer rounded-3xl border border-amber-200 bg-amber-50/60 p-5 shadow-sm transition hover:border-amber-300 hover:bg-amber-100/70"
                >
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-600">Retirar desconto</span>
                        <FaClock className="text-amber-600" />
                    </div>
                    <p className="mt-3 text-3xl font-black text-slate-950">
                        {loadingResumo ? "..." : resumoRetirar.total}
                    </p>
                    <div className="mt-2 space-y-1 text-xs">
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                aplicarFiltroCard("concluido", "retirar");
                            }}
                            className="block cursor-pointer text-left text-emerald-700 transition hover:text-emerald-900 hover:underline"
                        >
                            <span className="font-semibold">
                                {loadingResumo ? "..." : resumoRetirar.concluidos}
                            </span>{" "}
                            já alterados
                        </button>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                aplicarFiltroCard("pendente", "retirar");
                            }}
                            className="block cursor-pointer text-left text-amber-700 transition hover:text-amber-900 hover:underline"
                        >
                            <span className="font-semibold">
                                {loadingResumo ? "..." : resumoRetirar.pendentes}
                            </span>{" "}
                            faltam aplicar
                        </button>
                    </div>
                </div>

                <div
                    role="button"
                    tabIndex={0}
                    onClick={() => aplicarFiltroCard("todos")}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") aplicarFiltroCard("todos");
                    }}
                    className="cursor-pointer rounded-3xl border border-[#79B729]/30 bg-[#79B729]/10 p-5 shadow-sm transition hover:border-[#79B729]/60 hover:bg-[#79B729]/15"
                >
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-600">Resumo geral</span>
                        <FaCheckCircle className="text-[#79B729]" />
                    </div>
                    <div className="mt-3 space-y-1 text-sm">
                        <p className="text-gray-700">
                            <span className="font-black text-slate-950">
                                {loadingResumo ? "..." : total}
                            </span>{" "}
                            totais
                        </p>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                aplicarFiltroCard("concluido");
                            }}
                            className="block cursor-pointer text-left text-emerald-700 transition hover:text-emerald-900 hover:underline"
                        >
                            <span className="font-semibold">
                                {loadingResumo ? "..." : concluidos}
                            </span>{" "}
                            concluídos
                        </button>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                aplicarFiltroCard("pendente");
                            }}
                            className="block cursor-pointer text-left text-amber-700 transition hover:text-amber-900 hover:underline"
                        >
                            <span className="font-semibold">
                                {loadingResumo ? "..." : pendentes}
                            </span>{" "}
                            pendentes
                        </button>
                    </div>
                </div>
            </div>

            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
                <div className="flex items-center justify-between">
                    <h2 className="flex items-center gap-2 text-base font-black text-slate-950 before:h-2 before:w-2 before:rounded-full before:bg-[#00AE9D]">
                        Lista de Alterações
                    </h2>
                    <div className="text-xs font-semibold text-slate-500">
                        {loading ? "Carregando..." : `${totalEncontrado} encontrados`}
                    </div>
                </div>
                </div>

                <div className="p-5">

                {error ? (
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
                        {error}
                    </div>
                ) : null}

                {info ? (
                    <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">
                        {info}
                    </div>
                ) : null}

                {!loading && !error && rows.length === 0 ? (
                    <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-10 text-center text-sm font-medium text-slate-500">
                        Nenhuma alteração encontrada.
                    </div>
                ) : (
                    <div className="overflow-auto rounded-2xl border border-slate-200">
                        <table className="min-w-245 w-full text-sm">
                            <thead>
                                <tr className="bg-slate-50 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                                    <th className="px-3 py-3">Associado</th>
                                    <th className="px-3 py-3">CPF</th>
                                    <th className="px-3 py-3">Conta</th>
                                    <th
                                        className="cursor-pointer px-3 py-3"
                                        onClick={() => setOrdenacaoAlteracaoDesc((prev) => !prev)}
                                    >
                                        Alteração
                                    </th>
                                    {/*<th className="px-3 py-3">Atendente</th>*/}
                                    <th
                                        className="cursor-pointer px-3 py-3 text-center"
                                        onClick={() => setOrdenacaoFeitoDesc((prev) => !prev)}
                                    >
                                        Status
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {registrosOrdenados.map((item) => {
                                    const pendente = Number(item.SN_FEITO ?? 0) === 0;
                                    const concluido = !pendente;

                                    const alteracao = normalizarAlteracao(item.NM_ALTERACAO);

                                    const isAcrescentar = alteracao.includes("ACRESCENTAR");

                                    return (
                                        <tr
                                            key={item.ID_ATUALIZACAO_BENEFICIO_CHEQUE_ESPECIAL}
                                            className="border-t border-slate-100 transition hover:bg-[#00AE9D]/5"
                                        >
                                            <td className="px-3 py-3 font-bold text-slate-950">
                                                {capitalizeWords(item.NM_ASSOCIADO)}
                                            </td>

                                            <td className="px-3 py-3 font-medium text-slate-700">
                                                {formatarCpfCnpj(item.NR_CPF_CNPJ)}
                                            </td>

                                            <td className="px-3 py-3 font-medium text-slate-700">
                                                {item.NR_CONTA_CORRENTE ?? "-"}
                                            </td>

                                            <td className="px-3 py-3">
                                                <span
                                                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-black border ${isAcrescentar
                                                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                                        : "border-red-200 bg-red-50 text-red-700"
                                                        }`}
                                                >
                                                    {item.NM_ALTERACAO}
                                                </span>
                                            </td>

                                            {/*<td className="px-3 py-3 text-gray-700">
                {item.NM_ATENDENTE ? capitalizeWords(item.NM_ATENDENTE) : "-"}
            </td>*/}

                                            <td className="px-3 py-3 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => marcarComoConcluido(item)}
                                                    disabled={concluido}
                                                    className={`inline-flex h-9 items-center justify-center rounded-xl border px-3 text-xs font-semibold shadow-sm transition ${pendente
                                                        ? "cursor-pointer border-third/40 bg-third/15 text-[var(--title)] hover:bg-third"
                                                        : "cursor-not-allowed border-primary/30 bg-primary/10 text-primary opacity-90"
                                                        }`}
                                                >
                                                    {pendente ? "Pendente" : "Concluído"}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {totalItems > 0 && (
                    <Pagination
                        currentPage={paginaAtual}
                        totalPages={totalPages}
                        totalItems={totalItems}
                        limit={limitePorPagina}
                        loading={loading}
                        onChange={(page) =>
                            carregarRegistros(
                                page,
                                limitePorPagina,
                                q,
                                statusFiltro,
                                tipoAlteracaoFiltro
                            )
                        }
                        onLimitChange={(novoLimite) => {
                            setLimitePorPagina(novoLimite);
                            carregarRegistros(
                                1,
                                novoLimite,
                                q,
                                statusFiltro,
                                tipoAlteracaoFiltro
                            );
                        }}
                    />
                )}

                <p className="mt-3 text-xs font-medium text-slate-500">
                    * Dados carregados do Oracle via intranet-api. Os pendentes podem ser
                    marcados como concluídos diretamente na listagem.
                </p>
                </div>
            </div>
        </div>
    );
}

function Pagination({
    currentPage,
    totalPages,
    totalItems,
    limit,
    loading,
    onChange,
    onLimitChange,
}: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    limit: number;
    loading: boolean;
    onChange: (page: number) => void;
    onLimitChange: (limit: number) => void;
}) {
    const primeiro = totalItems === 0 ? 0 : (currentPage - 1) * limit + 1;
    const ultimo = Math.min(currentPage * limit, totalItems);

    return (
        <div className="mt-5 border-t border-slate-100 bg-white px-4 py-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <p className="text-sm text-slate-500">
                        Mostrando <span className="font-semibold text-slate-700">{primeiro}</span> até{" "}
                        <span className="font-semibold text-slate-700">{ultimo}</span> de{" "}
                        <span className="font-semibold text-slate-700">{totalItems}</span> registro(s)
                    </p>

                    <select
                        value={limit}
                        onChange={(event) => onLimitChange(Number(event.target.value))}
                        disabled={loading}
                        className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-[#00AE9D] focus:ring-2 focus:ring-[#00AE9D]/10 disabled:cursor-not-allowed disabled:opacity-60"
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
                        onClick={() => onChange(Math.max(currentPage - 1, 1))}
                        disabled={currentPage <= 1 || loading}
                        className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[var(--text-darken-placeholder)] bg-white px-4 text-sm font-semibold text-[var(--title)] shadow-sm transition hover:border-primary hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <FaChevronLeft />
                        Anterior
                    </button>

                    <span className="rounded-xl bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">
                        Página {currentPage} de {totalPages}
                    </span>

                    <button
                        type="button"
                        onClick={() => onChange(Math.min(currentPage + 1, totalPages))}
                        disabled={currentPage >= totalPages || loading}
                        className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[var(--text-darken-placeholder)] bg-white px-4 text-sm font-semibold text-[var(--title)] shadow-sm transition hover:border-primary hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        Próxima
                        <FaChevronRight />
                    </button>
                </div>
            </div>
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
