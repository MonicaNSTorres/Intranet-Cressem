"use client";

import { useEffect, useMemo, useState } from "react";
import {
    Eye,
    Search,
    TrendingUp,
} from "lucide-react";

import {
    alterarStatusPlano,
    atualizarPlano,
    criarPlano,
    listarHistoricoValoresPlano,
    listarOperadorasPlanos,
    listarPlanosGestao,
    reajustarPlano,
    type HistoricoPlanoResponse,
    type OperadoraPlano,
    type PlanoGestaoOdonto,
} from "@/services/planos_odontologicos.service";

import { getMeAdUser } from "@/services/auth.service";

function formatarMoeda(
    valor?: number | null
) {
    if (
        valor === null ||
        valor === undefined
    ) {
        return "—";
    }

    return Number(valor).toLocaleString(
        "pt-BR",
        {
            style: "currency",
            currency: "BRL",
        }
    );
}

function formatarData(
    valor?: string | null
) {
    if (!valor) return "—";

    const match = String(valor).match(
        /^(\d{4})-(\d{2})-(\d{2})/
    );

    if (match) {
        return `${match[3]}/${match[2]}/${match[1]}`;
    }

    const data = new Date(valor);

    if (Number.isNaN(data.getTime())) {
        return "—";
    }

    return data.toLocaleDateString("pt-BR");
}

function formatarCobranca(
    valor?:
        | "POR_PESSOA"
        | "POR_PLANO"
        | null
) {
    if (valor === "POR_PESSOA") {
        return "Por pessoa";
    }

    if (valor === "POR_PLANO") {
        return "Por plano";
    }

    return "—";
}

function hojeFormatoInput() {
    const hoje = new Date();

    const ano = hoje.getFullYear();

    const mes = String(
        hoje.getMonth() + 1
    ).padStart(2, "0");

    const dia = String(
        hoje.getDate()
    ).padStart(2, "0");

    return `${ano}-${mes}-${dia}`;
}

export function PlanosOdontologicos({
    abrirNovoPlano,
    onFecharNovoPlano,
}: {
    abrirNovoPlano: boolean;
    onFecharNovoPlano: () => void;
}) {
    const [planos, setPlanos] = useState<
        PlanoGestaoOdonto[]
    >([]);

    const [loading, setLoading] =
        useState(true);

    const [busca, setBusca] =
        useState("");

    const [
        historico,
        setHistorico,
    ] =
        useState<HistoricoPlanoResponse | null>(
            null
        );

    const [
        loadingHistorico,
        setLoadingHistorico,
    ] = useState(false);

    const [
        planoReajuste,
        setPlanoReajuste,
    ] =
        useState<PlanoGestaoOdonto | null>(
            null
        );

    const [
        planoEdicao,
        setPlanoEdicao,
    ] = useState<PlanoGestaoOdonto | null>(null);

    const [
        mensagemSucesso,
        setMensagemSucesso,
    ] = useState("");

    async function carregarPlanos() {
        try {
            setLoading(true);

            const data =
                await listarPlanosGestao();

            setPlanos(data);
        } catch (error) {
            console.error(
                "Erro ao carregar planos:",
                error
            );

            alert(
                "Erro ao carregar planos odontológicos."
            );
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        carregarPlanos();
    }, []);

    const planosFiltrados =
        useMemo(() => {
            const termo = busca
                .trim()
                .toLowerCase();

            if (!termo) {
                return planos;
            }

            return planos.filter(
                (item) => {
                    const plano = String(
                        item.NM_PLANO || ""
                    ).toLowerCase();

                    const operadora = String(
                        item.NM_OPERADORA || ""
                    ).toLowerCase();

                    const cobranca =
                        formatarCobranca(
                            item.TP_COBRANCA
                        ).toLowerCase();

                    return (
                        plano.includes(termo) ||
                        operadora.includes(
                            termo
                        ) ||
                        cobranca.includes(
                            termo
                        )
                    );
                }
            );
        }, [planos, busca]);

    async function handleHistorico(
        item: PlanoGestaoOdonto
    ) {
        try {
            setLoadingHistorico(true);

            const data =
                await listarHistoricoValoresPlano(
                    item.ID_PLANO
                );

            setHistorico(data);
        } catch (error) {
            console.error(
                "Erro ao carregar histórico:",
                error
            );

            alert(
                "Erro ao carregar histórico de valores."
            );
        } finally {
            setLoadingHistorico(false);
        }
    }

    async function handleAlterarStatus(
        item: PlanoGestaoOdonto
    ) {
        try {
            setMensagemSucesso("");

            const estaAtivo =
                item.SN_PLANO_ATIVO === 1;

            const acao =
                estaAtivo
                    ? "inativar"
                    : "reativar";

            const confirmado =
                window.confirm(
                    `Deseja realmente ${acao} o plano "${item.NM_PLANO}"?`
                );

            if (!confirmado) {
                return;
            }

            const response =
                await alterarStatusPlano(
                    item.ID_PLANO,
                    !estaAtivo
                );

            setMensagemSucesso(
                response.message ||
                `Plano ${acao}ado com sucesso.`
            );

            await carregarPlanos();
        } catch (error: any) {
            console.error(
                "Erro ao alterar status do plano:",
                error
            );

            alert(
                error?.response?.data?.error ||
                "Erro ao alterar status do plano."
            );
        }
    }

    return (
        <>
            <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm">
                <div className="h-1 bg-linear-to-r from-primary via-secondary to-third" />

                <div className="space-y-5 p-5 md:p-6">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">
                            Planos e valores
                        </h2>

                        <p className="mt-1 text-sm text-gray-500">
                            Consulte os planos odontológicos,
                            valores vigentes e histórico de reajustes.
                        </p>
                    </div>

                    {mensagemSucesso && (
                        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
                            {mensagemSucesso}
                        </div>
                    )}

                    <div className="relative">
                        <Search
                            size={17}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        />

                        <input
                            value={busca}
                            onChange={(e) =>
                                setBusca(e.target.value)
                            }
                            placeholder="Pesquisar por operadora, plano ou cobrança"
                            className="h-10 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-3 text-sm text-gray-900 shadow-sm outline-none transition placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/15"
                        />
                    </div>

                    <div className="overflow-x-auto rounded-2xl border border-gray-200">
                        <table className="min-w-full text-sm">
                            <thead className="bg-gray-50">
                                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                    <th className="px-4 py-3">
                                        Operadora
                                    </th>

                                    <th className="px-4 py-3">
                                        Plano
                                    </th>

                                    <th className="px-4 py-3">
                                        Cobrança
                                    </th>

                                    <th className="px-4 py-3">
                                        Valor vigente
                                    </th>

                                    <th className="px-4 py-3">
                                        Início vigência
                                    </th>

                                    <th className="px-4 py-3">
                                        Status
                                    </th>

                                    <th className="px-4 py-3 text-right">
                                        Ações
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-gray-100">
                                {loading ? (
                                    <tr>
                                        <td
                                            colSpan={7}
                                            className="px-4 py-10 text-center text-gray-500"
                                        >
                                            Carregando planos...
                                        </td>
                                    </tr>
                                ) : planosFiltrados.length ===
                                    0 ? (
                                    <tr>
                                        <td
                                            colSpan={7}
                                            className="px-4 py-10 text-center text-gray-500"
                                        >
                                            Nenhum plano encontrado.
                                        </td>
                                    </tr>
                                ) : (
                                    planosFiltrados.map(
                                        (item) => (
                                            <tr
                                                key={
                                                    item.ID_PLANO
                                                }
                                                className="transition hover:bg-gray-50"
                                            >
                                                <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                                                    {
                                                        item.NM_OPERADORA
                                                    }
                                                </td>

                                                <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900">
                                                    {
                                                        item.NM_PLANO
                                                    }
                                                </td>

                                                <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                                                    {formatarCobranca(
                                                        item.TP_COBRANCA
                                                    )}
                                                </td>

                                                <td className="whitespace-nowrap px-4 py-3 font-semibold text-gray-800">
                                                    {formatarMoeda(
                                                        item.VL_MENSALIDADE
                                                    )}
                                                </td>

                                                <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                                                    {formatarData(
                                                        item.DT_VIGENCIA_INICIO_VALOR
                                                    )}
                                                </td>

                                                <td className="whitespace-nowrap px-4 py-3">
                                                    {item.SN_PLANO_ATIVO ===
                                                        1 ? (
                                                        <span className="inline-flex rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
                                                            Ativo
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">
                                                            Inativo
                                                        </span>
                                                    )}
                                                </td>

                                                <td className="whitespace-nowrap px-4 py-3">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            type="button"
                                                            title="Histórico de valores"
                                                            onClick={() =>
                                                                handleHistorico(
                                                                    item
                                                                )
                                                            }
                                                            className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 hover:text-primary"
                                                        >
                                                            <Eye
                                                                size={
                                                                    15
                                                                }
                                                            />

                                                            Histórico
                                                        </button>

                                                        <button
                                                            type="button"
                                                            disabled={
                                                                item.SN_PLANO_ATIVO !== 1
                                                            }
                                                            onClick={() => {
                                                                setMensagemSucesso("");
                                                                setPlanoEdicao(item);
                                                            }}
                                                            className="inline-flex h-9 cursor-pointer items-center justify-center rounded-xl border border-amber-200 bg-amber-50 px-3 text-sm font-semibold text-amber-700 shadow-sm transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                                                        >
                                                            Editar
                                                        </button>

                                                        <button
                                                            type="button"
                                                            title="Cadastrar novo reajuste"
                                                            disabled={
                                                                item.SN_PLANO_ATIVO !==
                                                                1
                                                            }
                                                            onClick={() => {
                                                                setMensagemSucesso(
                                                                    ""
                                                                );

                                                                setPlanoReajuste(
                                                                    item
                                                                );
                                                            }}
                                                            className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-xl bg-secondary px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary disabled:cursor-not-allowed disabled:opacity-50"
                                                        >
                                                            <TrendingUp
                                                                size={
                                                                    15
                                                                }
                                                            />

                                                            Reajustar
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                handleAlterarStatus(item)
                                                            }
                                                            className={
                                                                item.SN_PLANO_ATIVO === 1
                                                                    ? "inline-flex h-9 cursor-pointer items-center justify-center rounded-xl border border-red-200 bg-red-50 px-3 text-sm font-semibold text-red-700 shadow-sm transition hover:bg-red-100"
                                                                    : "inline-flex h-9 cursor-pointer items-center justify-center rounded-xl border border-green-200 bg-green-50 px-3 text-sm font-semibold text-green-700 shadow-sm transition hover:bg-green-100"
                                                            }
                                                        >
                                                            {item.SN_PLANO_ATIVO === 1
                                                                ? "Inativar"
                                                                : "Reativar"}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    )
                                )}
                            </tbody>
                        </table>
                    </div>

                    {!loading && (
                        <p className="text-xs text-gray-500">
                            {planosFiltrados.length}{" "}
                            plano(s) encontrado(s).
                        </p>
                    )}
                </div>
            </div>

            <ModalHistoricoValores
                historico={historico}
                loading={loadingHistorico}
                onClose={() =>
                    setHistorico(null)
                }
            />

            <ModalReajustePlano
                plano={planoReajuste}
                onClose={() =>
                    setPlanoReajuste(null)
                }
                onSuccess={async (mensagem) => {
                    setPlanoReajuste(null);
                    setMensagemSucesso(mensagem);

                    await carregarPlanos();
                }}
            />

            <ModalNovoPlano
                open={abrirNovoPlano}
                onClose={onFecharNovoPlano}
                onSuccess={async (mensagem) => {
                    onFecharNovoPlano();

                    setMensagemSucesso(
                        mensagem
                    );

                    await carregarPlanos();
                }}
            />

            <ModalEditarPlano
                plano={planoEdicao}
                onClose={() =>
                    setPlanoEdicao(null)
                }
                onSuccess={async (mensagem) => {
                    setPlanoEdicao(null);

                    setMensagemSucesso(
                        mensagem
                    );

                    await carregarPlanos();
                }}
            />
        </>
    );
}

function ModalReajustePlano({
    plano,
    onClose,
    onSuccess,
}: {
    plano: PlanoGestaoOdonto | null;

    onClose: () => void;

    onSuccess: (
        mensagem: string
    ) => Promise<void> | void;
}) {
    const [novoValor, setNovoValor] =
        useState("");

    const [
        dataInicioVigencia,
        setDataInicioVigencia,
    ] = useState(
        hojeFormatoInput()
    );

    const [
        salvando,
        setSalvando,
    ] = useState(false);

    const [erro, setErro] =
        useState("");

    useEffect(() => {
        if (!plano) return;

        setNovoValor("");

        setDataInicioVigencia(
            hojeFormatoInput()
        );

        setErro("");
    }, [plano]);

    if (!plano) {
        return null;
    }

    const planoAtual = plano;

    function normalizarValor(
        valor: string
    ) {
        return Number(
            valor
                .replace(/\./g, "")
                .replace(",", ".")
        );
    }

    async function handleSalvar() {
        try {
            setErro("");

            const valorNumero =
                normalizarValor(
                    novoValor
                );

            if (
                !Number.isFinite(
                    valorNumero
                ) ||
                valorNumero <= 0
            ) {
                setErro(
                    "Informe um novo valor válido."
                );

                return;
            }

            if (
                !dataInicioVigencia
            ) {
                setErro(
                    "Informe a data de início da vigência."
                );

                return;
            }

            setSalvando(true);

            let nomeUsuario:
                | string
                | null = null;

            let loginUsuario:
                | string
                | null = null;

            try {
                const user: any =
                    await getMeAdUser();

                nomeUsuario =
                    user?.name ||
                    user?.displayName ||
                    user?.NM_USUARIO ||
                    user?.nome ||
                    null;

                loginUsuario =
                    user?.login ||
                    user?.username ||
                    user?.sAMAccountName ||
                    user?.LOGIN_USUARIO ||
                    null;
            } catch (error) {
                console.error(
                    "Não foi possível carregar usuário para auditoria:",
                    error
                );
            }

            const response =
                await reajustarPlano(
                    planoAtual.ID_PLANO,
                    {
                        novoValor:
                            valorNumero,

                        dataInicioVigencia,

                        nomeUsuario,

                        loginUsuario,
                    }
                );

            await onSuccess(
                response.message ||
                "Reajuste cadastrado com sucesso."
            );
        } catch (error: any) {
            console.error(
                "Erro ao cadastrar reajuste:",
                error
            );

            setErro(
                error?.response?.data
                    ?.error ||
                "Erro ao cadastrar reajuste."
            );
        } finally {
            setSalvando(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-2xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl">
                <div className="bg-linear-to-r from-primary/10 via-white to-secondary/10 px-6 py-5">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
                                Planos e valores
                            </p>

                            <h2 className="mt-1 text-2xl font-bold text-slate-800">
                                Novo reajuste
                            </h2>

                            <p className="mt-1 text-sm text-slate-500">
                                Cadastre um novo
                                valor sem perder o
                                histórico anterior.
                            </p>
                        </div>

                        <button
                            type="button"
                            disabled={salvando}
                            onClick={onClose}
                            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:border-red-200 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            ×
                        </button>
                    </div>
                </div>

                <div className="space-y-5 p-6">
                    <div className="rounded-3xl border border-primary/20 bg-primary/5 p-5">
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
                            Plano selecionado
                        </p>

                        <h3 className="mt-1 text-lg font-semibold text-slate-900">
                            {plano.NM_PLANO}
                        </h3>

                        <p className="mt-1 text-sm text-slate-500">
                            {
                                plano.NM_OPERADORA
                            }{" "}
                            •{" "}
                            {formatarCobranca(
                                plano.TP_COBRANCA
                            )}
                        </p>
                    </div>

                    {erro && (
                        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                            {erro}
                        </div>
                    )}

                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                                Valor atual
                            </label>

                            <div className="flex h-11 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700">
                                {formatarMoeda(
                                    plano.VL_MENSALIDADE
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                                Início da vigência atual
                            </label>

                            <div className="flex h-11 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-600">
                                {formatarData(
                                    plano.DT_VIGENCIA_INICIO_VALOR
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                                Novo valor *
                            </label>

                            <input
                                value={novoValor}
                                disabled={salvando}
                                onChange={(e) =>
                                    setNovoValor(
                                        e.target.value
                                    )
                                }
                                placeholder="Ex.: 35,50"
                                inputMode="decimal"
                                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:bg-slate-50"
                            />
                        </div>

                        <div>
                            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                                Nova vigência *
                            </label>

                            <input
                                type="date"
                                value={
                                    dataInicioVigencia
                                }
                                disabled={salvando}
                                onChange={(e) =>
                                    setDataInicioVigencia(
                                        e.target.value
                                    )
                                }
                                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:bg-slate-50"
                            />
                        </div>
                    </div>

                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        Ao confirmar, o valor atual
                        será encerrado automaticamente
                        e continuará disponível no
                        histórico.
                    </div>

                    <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
                        <button
                            type="button"
                            disabled={salvando}
                            onClick={onClose}
                            className="cursor-pointer rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Cancelar
                        </button>

                        <button
                            type="button"
                            disabled={salvando}
                            onClick={
                                handleSalvar
                            }
                            className="cursor-pointer rounded-2xl bg-secondary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {salvando
                                ? "Salvando..."
                                : "Confirmar reajuste"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ModalHistoricoValores({
    historico,
    loading,
    onClose,
}: {
    historico:
    | HistoricoPlanoResponse
    | null;

    loading: boolean;

    onClose: () => void;
}) {
    if (
        !historico &&
        !loading
    ) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
            <div className="max-h-[94vh] w-full max-w-4xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl">
                <div className="bg-linear-to-r from-primary/10 via-white to-secondary/10 px-6 py-5">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
                                Planos e valores
                            </p>

                            <h2 className="mt-1 text-2xl font-bold text-slate-800">
                                Histórico de valores
                            </h2>

                            <p className="mt-1 text-sm text-slate-500">
                                Consulte os valores já
                                praticados para este plano.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={onClose}
                            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:border-red-200 hover:text-red-500"
                        >
                            ×
                        </button>
                    </div>
                </div>

                <div className="max-h-[78vh] space-y-5 overflow-y-auto p-6">
                    {loading ||
                        !historico ? (
                        <div className="py-10 text-center text-sm text-slate-500">
                            Carregando histórico...
                        </div>
                    ) : (
                        <>
                            <div className="rounded-3xl border border-primary/20 bg-primary/5 p-5">
                                <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
                                    Plano
                                </p>

                                <h3 className="mt-1 text-lg font-semibold text-slate-900">
                                    {
                                        historico
                                            .plano
                                            .NM_PLANO
                                    }
                                </h3>

                                <p className="mt-1 text-sm text-slate-500">
                                    {
                                        historico
                                            .plano
                                            .NM_OPERADORA
                                    }{" "}
                                    •{" "}
                                    {formatarCobranca(
                                        historico
                                            .plano
                                            .TP_COBRANCA
                                    )}
                                </p>
                            </div>

                            <div className="overflow-hidden rounded-2xl border border-slate-200">
                                <table className="min-w-full text-sm">
                                    <thead className="bg-slate-50">
                                        <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                            <th className="px-4 py-3">
                                                Valor
                                            </th>

                                            <th className="px-4 py-3">
                                                Início
                                            </th>

                                            <th className="px-4 py-3">
                                                Fim
                                            </th>

                                            <th className="px-4 py-3">
                                                Status
                                            </th>

                                            <th className="px-4 py-3">
                                                Usuário
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody className="divide-y divide-slate-100">
                                        {historico
                                            .valores
                                            .length ===
                                            0 ? (
                                            <tr>
                                                <td
                                                    colSpan={
                                                        5
                                                    }
                                                    className="px-4 py-8 text-center text-slate-500"
                                                >
                                                    Nenhum valor cadastrado.
                                                </td>
                                            </tr>
                                        ) : (
                                            historico.valores.map(
                                                (
                                                    item
                                                ) => (
                                                    <tr
                                                        key={
                                                            item.ID_PLANO_VALOR
                                                        }
                                                    >
                                                        <td className="px-4 py-3 font-semibold text-slate-900">
                                                            {formatarMoeda(
                                                                item.VL_MENSALIDADE
                                                            )}
                                                        </td>

                                                        <td className="px-4 py-3 text-slate-600">
                                                            {formatarData(
                                                                item.DT_VIGENCIA_INICIO
                                                            )}
                                                        </td>

                                                        <td className="px-4 py-3 text-slate-600">
                                                            {formatarData(
                                                                item.DT_VIGENCIA_FIM
                                                            )}
                                                        </td>

                                                        <td className="px-4 py-3">
                                                            {item.STATUS_VIGENCIA === "VIGENTE" && (
                                                                <span className="inline-flex rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
                                                                    Vigente
                                                                </span>
                                                            )}

                                                            {item.STATUS_VIGENCIA === "AGENDADO" && (
                                                                <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                                                                    Agendado
                                                                </span>
                                                            )}

                                                            {item.STATUS_VIGENCIA === "ENCERRADO" && (
                                                                <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                                                                    Encerrado
                                                                </span>
                                                            )}
                                                        </td>

                                                        <td className="px-4 py-3 text-slate-600">
                                                            {item.NM_USUARIO_CRIACAO ||
                                                                item.LOGIN_USUARIO_CRIACAO ||
                                                                "—"}
                                                        </td>
                                                    </tr>
                                                )
                                            )
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex justify-end border-t border-slate-100 pt-5">
                                <button
                                    type="button"
                                    onClick={
                                        onClose
                                    }
                                    className="cursor-pointer rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                                >
                                    Fechar
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

function ModalNovoPlano({
    open,
    onClose,
    onSuccess,
}: {
    open: boolean;
    onClose: () => void;
    onSuccess: (
        mensagem: string
    ) => Promise<void> | void;
}) {
    const [operadoras, setOperadoras] =
        useState<OperadoraPlano[]>([]);

    const [
        carregandoOperadoras,
        setCarregandoOperadoras,
    ] = useState(false);

    const [idOperadora, setIdOperadora] =
        useState("");

    const [nomePlano, setNomePlano] =
        useState("");

    const [descricao, setDescricao] =
        useState("");

    const [
        tipoCobranca,
        setTipoCobranca,
    ] = useState<
        "POR_PESSOA" | "POR_PLANO"
    >("POR_PESSOA");

    const [
        dataVigenciaInicioPlano,
        setDataVigenciaInicioPlano,
    ] = useState(
        hojeFormatoInput()
    );

    const [
        valorInicial,
        setValorInicial,
    ] = useState("");

    const [
        dataVigenciaInicioValor,
        setDataVigenciaInicioValor,
    ] = useState(
        hojeFormatoInput()
    );

    const [salvando, setSalvando] =
        useState(false);

    const [erro, setErro] =
        useState("");

    useEffect(() => {
        if (!open) {
            return;
        }

        async function carregarOperadoras() {
            try {
                setCarregandoOperadoras(true);

                const data =
                    await listarOperadorasPlanos();

                setOperadoras(data);
            } catch (error) {
                console.error(
                    "Erro ao carregar operadoras:",
                    error
                );

                setErro(
                    "Erro ao carregar operadoras."
                );
            } finally {
                setCarregandoOperadoras(false);
            }
        }

        setIdOperadora("");
        setNomePlano("");
        setDescricao("");

        setTipoCobranca(
            "POR_PESSOA"
        );

        setDataVigenciaInicioPlano(
            hojeFormatoInput()
        );

        setValorInicial("");

        setDataVigenciaInicioValor(
            hojeFormatoInput()
        );

        setErro("");

        carregarOperadoras();
    }, [open]);

    if (!open) {
        return null;
    }

    function normalizarValor(
        valor: string
    ) {
        return Number(
            valor
                .replace(/\./g, "")
                .replace(",", ".")
        );
    }

    async function handleSalvar() {
        try {
            setErro("");

            const idOperadoraNumero =
                Number(idOperadora);

            const valorNumero =
                normalizarValor(
                    valorInicial
                );

            if (
                !Number.isInteger(
                    idOperadoraNumero
                ) ||
                idOperadoraNumero <= 0
            ) {
                setErro(
                    "Selecione uma operadora."
                );

                return;
            }

            if (!nomePlano.trim()) {
                setErro(
                    "Informe o nome do plano."
                );

                return;
            }

            if (
                !Number.isFinite(
                    valorNumero
                ) ||
                valorNumero <= 0
            ) {
                setErro(
                    "Informe um valor inicial válido."
                );

                return;
            }

            if (
                !dataVigenciaInicioValor
            ) {
                setErro(
                    "Informe o início da vigência do valor."
                );

                return;
            }

            setSalvando(true);

            let nomeUsuario:
                | string
                | null = null;

            let loginUsuario:
                | string
                | null = null;

            try {
                const user: any =
                    await getMeAdUser();

                nomeUsuario =
                    user?.name ||
                    user?.displayName ||
                    user?.NM_USUARIO ||
                    user?.nome ||
                    null;

                loginUsuario =
                    user?.login ||
                    user?.username ||
                    user?.sAMAccountName ||
                    user?.LOGIN_USUARIO ||
                    null;
            } catch (error) {
                console.error(
                    "Não foi possível carregar usuário para auditoria:",
                    error
                );
            }

            const response =
                await criarPlano({
                    idOperadora:
                        idOperadoraNumero,

                    nomePlano:
                        nomePlano.trim(),

                    descricao:
                        descricao.trim() ||
                        null,

                    tipoCobranca,

                    dataVigenciaInicioPlano:
                        dataVigenciaInicioPlano ||
                        null,

                    valorInicial:
                        valorNumero,

                    dataVigenciaInicioValor,

                    nomeUsuario,

                    loginUsuario,
                });

            await onSuccess(
                response.message ||
                "Plano odontológico cadastrado com sucesso."
            );
        } catch (error: any) {
            console.error(
                "Erro ao cadastrar plano:",
                error
            );

            setErro(
                error?.response?.data
                    ?.error ||
                "Erro ao cadastrar plano odontológico."
            );
        } finally {
            setSalvando(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
            <div className="max-h-[94vh] w-full max-w-3xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl">

                {/* CABEÇALHO */}
                <div className="bg-linear-to-r from-primary/10 via-white to-secondary/10 px-6 py-5">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
                                Planos e valores
                            </p>

                            <h2 className="mt-1 text-2xl font-bold text-slate-800">
                                Novo plano odontológico
                            </h2>

                            <p className="mt-1 text-sm text-slate-500">
                                Cadastre o plano e o primeiro valor vigente.
                            </p>
                        </div>

                        <button
                            type="button"
                            disabled={salvando}
                            onClick={onClose}
                            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:border-red-200 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            ×
                        </button>
                    </div>
                </div>

                {/* CONTEÚDO */}
                <div className="max-h-[78vh] space-y-5 overflow-y-auto p-6">

                    {/* ERRO */}
                    {erro && (
                        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                            {erro}
                        </div>
                    )}

                    {/* DADOS DO PLANO */}
                    <div className="rounded-3xl border border-slate-200 bg-slate-50/50 p-5">
                        <p className="mb-4 text-xs font-bold uppercase tracking-[0.14em] text-primary">
                            Dados do plano
                        </p>

                        <div className="grid gap-4 md:grid-cols-2">

                            {/* OPERADORA */}
                            <div>
                                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                                    Operadora *
                                </label>

                                <select
                                    value={
                                        idOperadora
                                    }
                                    disabled={
                                        salvando ||
                                        carregandoOperadoras
                                    }
                                    onChange={(e) =>
                                        setIdOperadora(
                                            e.target.value
                                        )
                                    }
                                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:bg-slate-50"
                                >
                                    <option value="">
                                        {carregandoOperadoras
                                            ? "Carregando..."
                                            : "Selecione"}
                                    </option>

                                    {operadoras.map(
                                        (item) => (
                                            <option
                                                key={
                                                    item.ID_OPERADORA
                                                }
                                                value={
                                                    item.ID_OPERADORA
                                                }
                                            >
                                                {
                                                    item.NM_OPERADORA
                                                }
                                            </option>
                                        )
                                    )}
                                </select>
                            </div>

                            <div>
                                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                                    Nome do plano *
                                </label>

                                <input
                                    value={
                                        nomePlano
                                    }
                                    disabled={
                                        salvando
                                    }
                                    onChange={(e) =>
                                        setNomePlano(
                                            e.target.value
                                        )
                                    }
                                    placeholder="Ex.: Uniodonto Nova Adesão"
                                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:bg-slate-50"
                                />
                            </div>

                            <div>
                                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                                    Tipo de cobrança *
                                </label>

                                <select
                                    value={
                                        tipoCobranca
                                    }
                                    disabled={
                                        salvando
                                    }
                                    onChange={(e) =>
                                        setTipoCobranca(
                                            e.target
                                                .value as
                                            | "POR_PESSOA"
                                            | "POR_PLANO"
                                        )
                                    }
                                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:bg-slate-50"
                                >
                                    <option value="POR_PESSOA">
                                        Por pessoa
                                    </option>

                                    <option value="POR_PLANO">
                                        Por plano
                                    </option>
                                </select>
                            </div>

                            <div>
                                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                                    Início da vigência do plano
                                </label>

                                <input
                                    type="date"
                                    value={
                                        dataVigenciaInicioPlano
                                    }
                                    disabled={
                                        salvando
                                    }
                                    onChange={(e) =>
                                        setDataVigenciaInicioPlano(
                                            e.target.value
                                        )
                                    }
                                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:bg-slate-50"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                                    Descrição
                                </label>

                                <textarea
                                    value={
                                        descricao
                                    }
                                    disabled={
                                        salvando
                                    }
                                    onChange={(e) =>
                                        setDescricao(
                                            e.target.value
                                        )
                                    }
                                    rows={3}
                                    placeholder="Observações ou descrição do plano."
                                    className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:bg-slate-50"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="rounded-3xl border border-primary/20 bg-primary/5 p-5">
                        <p className="mb-4 text-xs font-bold uppercase tracking-[0.14em] text-primary">
                            Valor inicial
                        </p>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                                    Valor *
                                </label>

                                <input
                                    value={
                                        valorInicial
                                    }
                                    disabled={
                                        salvando
                                    }
                                    inputMode="decimal"
                                    onChange={(e) =>
                                        setValorInicial(
                                            e.target.value
                                        )
                                    }
                                    placeholder="Ex.: 32,40"
                                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:bg-slate-50"
                                />
                            </div>

                            <div>
                                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                                    Início da vigência do valor *
                                </label>

                                <input
                                    type="date"
                                    value={
                                        dataVigenciaInicioValor
                                    }
                                    disabled={
                                        salvando
                                    }
                                    onChange={(e) =>
                                        setDataVigenciaInicioValor(
                                            e.target.value
                                        )
                                    }
                                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:bg-slate-50"
                                />
                            </div>
                        </div>

                        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                            Este será o primeiro valor cadastrado para o plano.
                            Os próximos valores deverão ser incluídos através
                            da opção de reajuste.
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
                        <button
                            type="button"
                            disabled={
                                salvando
                            }
                            onClick={onClose}
                            className="cursor-pointer rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Cancelar
                        </button>

                        <button
                            type="button"
                            disabled={
                                salvando
                            }
                            onClick={
                                handleSalvar
                            }
                            className="cursor-pointer rounded-2xl bg-secondary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {salvando
                                ? "Salvando..."
                                : "Cadastrar plano"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ModalEditarPlano({
    plano,
    onClose,
    onSuccess,
}: {
    plano: PlanoGestaoOdonto | null;

    onClose: () => void;

    onSuccess: (
        mensagem: string
    ) => Promise<void> | void;
}) {
    const [
        nomePlano,
        setNomePlano,
    ] = useState("");

    const [
        descricao,
        setDescricao,
    ] = useState("");

    const [
        tipoCobranca,
        setTipoCobranca,
    ] = useState<
        "POR_PESSOA" | "POR_PLANO"
    >("POR_PESSOA");

    const [
        dataVigenciaInicioPlano,
        setDataVigenciaInicioPlano,
    ] = useState("");

    const [
        salvando,
        setSalvando,
    ] = useState(false);

    const [
        erro,
        setErro,
    ] = useState("");

    useEffect(() => {
        if (!plano) {
            return;
        }

        setNomePlano(
            plano.NM_PLANO || ""
        );

        setDescricao(
            plano.DS_PLANO || ""
        );

        setTipoCobranca(
            plano.TP_COBRANCA ||
            "POR_PESSOA"
        );

        const data =
            plano.DT_VIGENCIA_INICIO_PLANO;

        if (data) {
            const match = String(data).match(
                /^(\d{4})-(\d{2})-(\d{2})/
            );

            setDataVigenciaInicioPlano(
                match
                    ? `${match[1]}-${match[2]}-${match[3]}`
                    : ""
            );
        } else {
            setDataVigenciaInicioPlano("");
        }

        setErro("");
    }, [plano]);

    if (!plano) {
        return null;
    }

    const planoAtual = plano;

    async function handleSalvar() {
        try {
            setErro("");

            if (!nomePlano.trim()) {
                setErro(
                    "Informe o nome do plano."
                );

                return;
            }

            if (
                tipoCobranca !==
                "POR_PESSOA" &&
                tipoCobranca !==
                "POR_PLANO"
            ) {
                setErro(
                    "Informe um tipo de cobrança válido."
                );

                return;
            }

            setSalvando(true);

            let nomeUsuario:
                | string
                | null = null;

            let loginUsuario:
                | string
                | null = null;

            try {
                const user: any =
                    await getMeAdUser();

                nomeUsuario =
                    user?.name ||
                    user?.displayName ||
                    user?.NM_USUARIO ||
                    user?.nome ||
                    null;

                loginUsuario =
                    user?.login ||
                    user?.username ||
                    user?.sAMAccountName ||
                    user?.LOGIN_USUARIO ||
                    null;
            } catch (error) {
                console.error(
                    "Não foi possível carregar usuário para auditoria:",
                    error
                );
            }

            const response =
                await atualizarPlano(
                    planoAtual.ID_PLANO,
                    {
                        nomePlano:
                            nomePlano.trim(),

                        descricao:
                            descricao.trim() ||
                            null,

                        tipoCobranca,

                        dataVigenciaInicioPlano:
                            dataVigenciaInicioPlano ||
                            null,

                        nomeUsuario,

                        loginUsuario,
                    }
                );

            await onSuccess(
                response.message ||
                "Plano odontológico atualizado com sucesso."
            );
        } catch (error: any) {
            console.error(
                "Erro ao atualizar plano:",
                error
            );

            setErro(
                error?.response?.data
                    ?.error ||
                "Erro ao atualizar plano odontológico."
            );
        } finally {
            setSalvando(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-2xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl">

                {/* CABEÇALHO */}
                <div className="bg-linear-to-r from-primary/10 via-white to-secondary/10 px-6 py-5">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
                                Planos e valores
                            </p>

                            <h2 className="mt-1 text-2xl font-bold text-slate-800">
                                Editar plano
                            </h2>

                            <p className="mt-1 text-sm text-slate-500">
                                Altere os dados cadastrais do plano.
                            </p>
                        </div>

                        <button
                            type="button"
                            disabled={salvando}
                            onClick={onClose}
                            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:border-red-200 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            ×
                        </button>
                    </div>
                </div>

                <div className="space-y-5 p-6">

                    {erro && (
                        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                            {erro}
                        </div>
                    )}

                    {/* OPERADORA */}
                    <div className="rounded-3xl border border-primary/20 bg-primary/5 p-5">
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
                            Operadora
                        </p>

                        <h3 className="mt-1 text-lg font-semibold text-slate-900">
                            {
                                plano.NM_OPERADORA
                            }
                        </h3>

                        <p className="mt-1 text-sm text-slate-500">
                            A operadora do plano não pode ser alterada nesta edição.
                        </p>
                    </div>

                    {/* CAMPOS */}
                    <div className="grid gap-4 md:grid-cols-2">

                        <div>
                            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                                Nome do plano *
                            </label>

                            <input
                                value={
                                    nomePlano
                                }
                                disabled={
                                    salvando
                                }
                                onChange={(e) =>
                                    setNomePlano(
                                        e.target.value
                                    )
                                }
                                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:bg-slate-50"
                            />
                        </div>

                        <div>
                            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                                Tipo de cobrança *
                            </label>

                            <select
                                value={
                                    tipoCobranca
                                }
                                disabled={
                                    salvando
                                }
                                onChange={(e) =>
                                    setTipoCobranca(
                                        e.target
                                            .value as
                                        | "POR_PESSOA"
                                        | "POR_PLANO"
                                    )
                                }
                                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:bg-slate-50"
                            >
                                <option value="POR_PESSOA">
                                    Por pessoa
                                </option>

                                <option value="POR_PLANO">
                                    Por plano
                                </option>
                            </select>
                        </div>

                        <div>
                            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                                Início da vigência do plano
                            </label>

                            <input
                                type="date"
                                value={
                                    dataVigenciaInicioPlano
                                }
                                disabled={
                                    salvando
                                }
                                onChange={(e) =>
                                    setDataVigenciaInicioPlano(
                                        e.target.value
                                    )
                                }
                                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:bg-slate-50"
                            />
                        </div>

                        <div>
                            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                                Valor atual
                            </label>

                            <div className="flex h-11 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700">
                                {formatarMoeda(
                                    plano.VL_MENSALIDADE
                                )}
                            </div>
                        </div>

                        <div className="md:col-span-2">
                            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                                Descrição
                            </label>

                            <textarea
                                value={
                                    descricao
                                }
                                disabled={
                                    salvando
                                }
                                onChange={(e) =>
                                    setDescricao(
                                        e.target.value
                                    )
                                }
                                rows={3}
                                placeholder="Observações ou descrição do plano."
                                className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:bg-slate-50"
                            />
                        </div>
                    </div>

                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        O valor do plano não é alterado nesta tela.
                        Para alterar o valor, utilize a opção
                        <strong> Reajustar</strong>.
                    </div>

                    <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
                        <button
                            type="button"
                            disabled={
                                salvando
                            }
                            onClick={onClose}
                            className="cursor-pointer rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Cancelar
                        </button>

                        <button
                            type="button"
                            disabled={
                                salvando
                            }
                            onClick={
                                handleSalvar
                            }
                            className="cursor-pointer rounded-2xl bg-secondary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {salvando
                                ? "Salvando..."
                                : "Salvar alterações"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}