"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useState } from "react";
import {
    FaCheckCircle,
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

function formatarCpfCnpj(value?: string | null) {
    const digits = String(value || "").replace(/\D/g, "");

    if (digits.length <= 11) {
        return digits
            .replace(/^(\d{3})(\d)/, "$1.$2")
            .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
            .replace(/\.(\d{3})(\d)/, ".$1-$2");
    }

    return digits
        .replace(/^(\d{2})(\d)/, "$1.$2")
        .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
        .replace(/\.(\d{3})(\d)/, ".$1/$2")
        .replace(/(\d{4})(\d)/, "$1-$2");
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
    const [rows, setRows] = useState<ChequeEspecialItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingResumo, setLoadingResumo] = useState(false);

    const [error, setError] = useState<string | null>(null);
    const [info, setInfo] = useState<string | null>(null);

    const [paginaAtual, setPaginaAtual] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const [total, setTotal] = useState(0);
    const [concluidos, setConcluidos] = useState(0);
    const [pendentes, setPendentes] = useState(0);

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
        if (!debouncedQ.trim()) {
            setRows([]);
            setPaginaAtual(1);
            setTotalPages(1);
            return;
        }

        carregarRegistros(1, 15, debouncedQ);
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

            (response || []).forEach((item) => {
                totalLocal += 1;

                if (Number(item.SN_FEITO) !== 0) {
                    concluidosLocal += 1;
                } else {
                    pendentesLocal += 1;
                }
            });

            setTotal(totalLocal);
            setConcluidos(concluidosLocal);
            setPendentes(pendentesLocal);
        } catch (e) {
            console.error("Erro ao carregar resumo:", e);
        } finally {
            setLoadingResumo(false);
        }
    }

    async function carregarRegistros(
        page = 1,
        limit = 15,
        termoBusca?: string
    ) {
        try {
            setLoading(true);
            setError(null);
            setInfo(null);

            const response = await buscarChequeEspecialPaginado({
                nome: termoBusca ?? q ?? " ",
                page,
                limit,
            });

            setRows(response.items || []);
            setPaginaAtual(response.current_page || page);
            setTotalPages(response.total_pages || 1);
        } catch (e: any) {
            console.error(e);
            setRows([]);
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
        setRows([]);
        setPaginaAtual(1);
        setTotalPages(1);
        setError(null);
        setInfo(null);
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
                atendente,
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

    const totalEncontrado = useMemo(() => rows.length, [rows]);

    const totalConceder = useMemo(
        () =>
            rows.filter((r) =>
                String(r.NM_ALTERACAO || "").toUpperCase().includes("CONCED")
            ).length,
        [rows]
    );

    const totalRetirar = useMemo(
        () =>
            rows.filter((r) =>
                String(r.NM_ALTERACAO || "").toUpperCase().includes("RETIR")
            ).length,
        [rows]
    );

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
        <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto]">
                <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                    <label className="text-xs font-medium text-gray-600">Buscar</label>

                    <div className="mt-1 flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2 shadow-sm">
                        <input
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Ex: nome, CPF, conta corrente ou tipo de alteração..."
                            className="w-full bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
                        />

                        {q ? (
                            <button
                                type="button"
                                onClick={limparBusca}
                                className="rounded-lg border border-gray-200 px-2 py-1 text-xs hover:bg-gray-50"
                            >
                                Limpar
                            </button>
                        ) : null}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => carregarRegistros(1, 15)}
                            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-secondary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary"
                        >
                            <FaSearch />
                            Buscar
                        </button>

                        {podeBaixarRelatorio && (
                            <button
                                type="button"
                                onClick={handleBaixarRelatorio}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
                            >
                                <FaDownload />
                                Baixar Relatório
                            </button>
                        )}
                    </div>
                </div>

                <div className="rounded-2xl border border-emerald-100 bg-linear-to-br from-emerald-50 to-lime-50 p-5 shadow-sm lg:w-80">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
                                Mês de referência
                            </p>
                            <h3 className="mt-2 text-lg font-semibold text-gray-900">
                                {mesReferencia || "-"}
                            </h3>
                            <p className="mt-2 text-xs text-gray-600">
                                Atualizações mensais do benefício de cheque especial.
                            </p>
                        </div>

                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#C7D300] text-emerald-700">
                            <FaMoneyCheckAlt size={16} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">Total encontrado</span>
                        <FaMoneyCheckAlt className="text-secondary" />
                    </div>
                    <p className="mt-3 text-2xl font-semibold text-gray-900">
                        {loading ? "..." : totalEncontrado}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                        Registros retornados na busca atual
                    </p>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">Conceder benefício</span>
                        <FaUserCheck className="text-secondary" />
                    </div>
                    <p className="mt-3 text-2xl font-semibold text-gray-900">
                        {loading ? "..." : totalConceder}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                        Alterações com concessão
                    </p>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">Retirar benefício</span>
                        <FaClock className="text-secondary" />
                    </div>
                    <p className="mt-3 text-2xl font-semibold text-gray-900">
                        {loading ? "..." : totalRetirar}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                        Alterações com retirada
                    </p>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">Resumo geral</span>
                        <FaCheckCircle className="text-secondary" />
                    </div>
                    <div className="mt-3 space-y-1 text-sm">
                        <p className="text-gray-700">
                            <span className="font-semibold text-gray-900">
                                {loadingResumo ? "..." : total}
                            </span>{" "}
                            totais
                        </p>
                        <p className="text-emerald-700">
                            <span className="font-semibold">
                                {loadingResumo ? "..." : concluidos}
                            </span>{" "}
                            concluídos
                        </p>
                        <p className="text-amber-700">
                            <span className="font-semibold">
                                {loadingResumo ? "..." : pendentes}
                            </span>{" "}
                            pendentes
                        </p>
                    </div>
                </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold text-gray-900">
                        Lista de Alterações
                    </h2>
                    <div className="text-xs text-gray-500">
                        {loading ? "Carregando..." : `${totalEncontrado} encontrados`}
                    </div>
                </div>

                {error ? (
                    <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                        {error}
                    </div>
                ) : null}

                {info ? (
                    <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                        {info}
                    </div>
                ) : null}

                {!loading && !error && rows.length === 0 ? (
                    <div className="mt-6 text-center text-sm text-gray-500">
                        Nenhuma alteração encontrada.
                    </div>
                ) : (
                    <div className="mt-4 overflow-auto">
                        <table className="min-w-245 w-full text-sm">
                            <thead>
                                <tr className="text-left text-xs text-gray-500">
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

                                    return (
                                        <tr
                                            key={item.ID_ATUALIZACAO_BENEFICIO_CHEQUE_ESPECIAL}
                                            className="border-t border-gray-100 hover:bg-gray-50/60"
                                        >
                                            <td className="px-3 py-3 font-semibold text-gray-900">
                                                {capitalizeWords(item.NM_ASSOCIADO)}
                                            </td>

                                            <td className="px-3 py-3 text-gray-700">
                                                {formatarCpfCnpj(item.NR_CPF_CNPJ)}
                                            </td>

                                            <td className="px-3 py-3 text-gray-700">
                                                {item.NR_CONTA_CORRENTE ?? "-"}
                                            </td>

                                            <td className="px-3 py-3">
                                                <span className="inline-flex rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700">
                                                    {capitalizeWords(item.NM_ALTERACAO)}
                                                </span>
                                            </td>

                                            {/*<td className="px-3 py-3 text-gray-700">
                                                {item.NM_ATENDENTE ? capitalizeWords(item.NM_ATENDENTE) : "-"}
                                            </td>*/}

                                            <td className="px-3 py-3 text-center">
                                                <span className="text-sm font-semibold text-red-600">
                                                    {Number(item.SN_FEITO ?? 0) === 0 ? "Pendente" : "Concluído"}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {rows.length > 0 && (
                    <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                        {paginaAtual > 1 && (
                            <>
                                <button
                                    type="button"
                                    onClick={() => carregarRegistros(1, 15)}
                                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                                >
                                    1
                                </button>

                                <button
                                    type="button"
                                    onClick={() => carregarRegistros(paginaAtual - 1, 15)}
                                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                                >
                                    Anterior
                                </button>
                            </>
                        )}

                        {paginasVisiveis.map((page) => (
                            <button
                                key={page}
                                type="button"
                                onClick={() => carregarRegistros(page, 15)}
                                className={`rounded-lg px-3 py-1.5 text-sm ${page === paginaAtual
                                    ? "bg-emerald-600 text-white"
                                    : "border border-gray-300 text-gray-700 hover:bg-gray-50"
                                    }`}
                            >
                                {page}
                            </button>
                        ))}

                        {paginaAtual < totalPages && (
                            <>
                                <button
                                    type="button"
                                    onClick={() => carregarRegistros(paginaAtual + 1, 15)}
                                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                                >
                                    Próxima
                                </button>

                                <button
                                    type="button"
                                    onClick={() => carregarRegistros(totalPages, 15)}
                                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                                >
                                    {totalPages}
                                </button>
                            </>
                        )}
                    </div>
                )}

                <p className="mt-3 text-xs text-gray-500">
                    * Dados carregados do Oracle via intranet-api. Os pendentes podem ser
                    marcados como concluídos diretamente na listagem.
                </p>
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