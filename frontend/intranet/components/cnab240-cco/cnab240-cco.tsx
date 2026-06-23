"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useState } from "react";
import {
    FaCheckCircle,
    FaChevronLeft,
    FaChevronRight,
    FaDatabase,
    FaPen,
    FaPlus,
    FaSave,
    FaSearch,
    FaTimes,
    FaTrash,
    FaUserCheck,
    FaUserTimes,
    FaClipboardList,
} from "react-icons/fa";

import {
    atualizarCco,
    criarCco,
    excluirCco,
    listarCco,
    importarCcoEmMassa,
    type CnabCcoImportarLinha,
    type CnabCco,
    type CnabCcoPayload,
} from "@/services/cnab240_cco.service";

const initialForm: CnabCcoPayload = {
    CPF: "",
    CONTA: "",
    ATIVA: "S",
};

export function Cnab240CcoForm() {
    const [loading, setLoading] = useState(false);
    const [salvando, setSalvando] = useState(false);

    const [busca, setBusca] = useState("");
    const [buscaAplicada, setBuscaAplicada] = useState("");

    const [modalImportarAberta, setModalImportarAberta] = useState(false);
    const [textoImportacao, setTextoImportacao] = useState("");
    const [importandoMassa, setImportandoMassa] = useState(false);
    const [resultadoImportacao, setResultadoImportacao] = useState<any>(null);

    const [mensagem, setMensagem] = useState("");
    const [tipoMensagem, setTipoMensagem] = useState<"success" | "error">("success");

    const [registros, setRegistros] = useState<CnabCco[]>([]);

    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(20);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    const [resumo, setResumo] = useState({
        totalCco: 0,
        totalAtivas: 0,
        totalInativas: 0,
    });

    const [modalAberta, setModalAberta] = useState(false);
    const [registroSelecionado, setRegistroSelecionado] = useState<CnabCco | null>(
        null
    );

    const [form, setForm] = useState<CnabCcoPayload>(initialForm);

    const primeiroRegistro = total === 0 ? 0 : (page - 1) * limit + 1;
    const ultimoRegistro = Math.min(page * limit, total);

    const totalAtivasPagina = useMemo(() => {
        return registros.filter((item) => String(item.ATIVA || "").toUpperCase() === "S").length;
    }, [registros]);

    async function carregar(pagina = page) {
        try {
            setLoading(true);

            const result = await listarCco({
                busca: buscaAplicada,
                page: pagina,
                limit,
            });

            setRegistros(result.data);
            setTotal(result.total);
            setPage(result.page);
            setLimit(result.limit);
            setTotalPages(result.totalPages);
            setResumo(result.resumo);
        } catch (error) {
            console.error(error);
            mostrarMensagem("Não foi possível carregar as contas CCO.", "error");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        carregar(page);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, limit, buscaAplicada]);

    function mostrarMensagem(texto: string, tipo: "success" | "error" = "success") {
        setMensagem(texto);
        setTipoMensagem(tipo);
    }

    function onlyDigits(value: string) {
        return String(value || "").replace(/\D/g, "");
    }

    function formatNumber(value: number | string | undefined) {
        return Number(value || 0).toLocaleString("pt-BR");
    }

    function formatCpfCnpj(value: string) {
        const digits = onlyDigits(value).slice(0, 14);

        if (digits.length > 11) {
            return digits
                .replace(/^(\d{2})(\d)/, "$1.$2")
                .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
                .replace(/\.(\d{3})(\d)/, ".$1/$2")
                .replace(/(\d{4})(\d)/, "$1-$2");
        }

        return digits
            .replace(/^(\d{3})(\d)/, "$1.$2")
            .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
            .replace(/\.(\d{3})(\d)/, ".$1-$2");
    }

    function aplicarBusca() {
        setBuscaAplicada(busca);
        setPage(1);
    }

    function abrirNovo() {
        setRegistroSelecionado(null);
        setForm(initialForm);
        setMensagem("");
        setModalAberta(true);
    }

    function abrirEdicao(item: CnabCco) {
        setRegistroSelecionado(item);

        setForm({
            CPF: formatCpfCnpj(item.CPF || ""),
            CONTA: item.CONTA || "",
            ATIVA: String(item.ATIVA || "S").toUpperCase(),
        });

        setMensagem("");
        setModalAberta(true);
    }

    function fecharModal() {
        if (salvando) return;

        setModalAberta(false);
        setRegistroSelecionado(null);
        setForm(initialForm);
    }

    function updateField(field: keyof CnabCcoPayload, value: string) {
        setForm((old) => ({
            ...old,
            [field]: value,
        }));
    }

    function montarPayload(): CnabCcoPayload {
        return {
            CPF: onlyDigits(form.CPF || ""),
            CONTA: onlyDigits(form.CONTA || ""),
            ATIVA: String(form.ATIVA || "S").trim().toUpperCase().slice(0, 1),
        };
    }

    function extrairCcoDoTexto(texto: string): CnabCcoImportarLinha[] {
        const linhas: CnabCcoImportarLinha[] = [];

        texto
            .split(/\r?\n/)
            .map((linha) => linha.trim())
            .filter(Boolean)
            .forEach((linha) => {
                if (/^cpf/i.test(linha)) return;

                const partes = linha.includes("\t")
                    ? linha.split("\t")
                    : linha.includes(";")
                        ? linha.split(";")
                        : linha.split(/\s+/);

                const cpf = onlyDigits(partes[0] || "");
                const conta = onlyDigits(partes[1] || "");
                const ativa = String(partes[2] || "S")
                    .trim()
                    .toUpperCase()
                    .slice(0, 1);

                if (!cpf || !conta) return;

                linhas.push({
                    CPF: cpf,
                    CONTA: conta,
                    ATIVA: ativa === "N" ? "N" : "S",
                });
            });

        return linhas;
    }

    async function importarCcoColado() {
        const linhas = extrairCcoDoTexto(textoImportacao);

        if (linhas.length === 0) {
            mostrarMensagem("Cole pelo menos uma linha válida.", "error");
            return;
        }

        try {
            setImportandoMassa(true);
            setResultadoImportacao(null);

            const result = await importarCcoEmMassa(linhas);

            setResultadoImportacao(result);

            mostrarMensagem(
                `Importação finalizada: ${result.inseridos} registro(s) inserido(s) e ${result.erros} erro(s).`,
                result.erros > 0 ? "error" : "success"
            );

            await carregar(1);
            setPage(1);

            if (result.erros === 0) {
                setModalImportarAberta(false);
                setTextoImportacao("");
                setResultadoImportacao(null);
            }
        } catch (error: any) {
            console.error(error);

            mostrarMensagem(
                error?.response?.data?.details ||
                error?.response?.data?.error ||
                "Erro ao importar contas CCO.",
                "error"
            );
        } finally {
            setImportandoMassa(false);
        }
    }

    async function salvarCco() {
        try {
            setSalvando(true);
            setMensagem("");

            const payload = montarPayload();

            if (!payload.CPF) {
                mostrarMensagem("Informe o CPF/CNPJ.", "error");
                return;
            }

            if (payload.CPF.length !== 11 && payload.CPF.length !== 14) {
                mostrarMensagem("CPF/CNPJ inválido.", "error");
                return;
            }

            if (!payload.CONTA) {
                mostrarMensagem("Informe a conta.", "error");
                return;
            }

            if (!["S", "N"].includes(payload.ATIVA || "")) {
                mostrarMensagem("Informe se a conta está ativa.", "error");
                return;
            }

            if (registroSelecionado?.ID_CCO) {
                await atualizarCco(registroSelecionado.ID_CCO, payload);
                mostrarMensagem("Conta CCO atualizada com sucesso.", "success");
            } else {
                await criarCco(payload);
                mostrarMensagem("Conta CCO cadastrada com sucesso.", "success");
                setPage(1);
            }

            fecharModal();
            await carregar(registroSelecionado ? page : 1);
        } catch (error: any) {
            console.error(error);
            mostrarMensagem(
                error?.response?.data?.details ||
                error?.response?.data?.error ||
                "Erro ao salvar conta CCO.",
                "error"
            );
        } finally {
            setSalvando(false);
        }
    }

    async function removerCco() {
        if (!registroSelecionado?.ID_CCO) return;

        const confirmar = window.confirm("Deseja realmente excluir esta conta CCO?");

        if (!confirmar) return;

        try {
            setSalvando(true);

            await excluirCco(registroSelecionado.ID_CCO);

            mostrarMensagem("Conta CCO excluída com sucesso.", "success");
            fecharModal();

            const proximaPagina = registros.length === 1 && page > 1 ? page - 1 : page;

            setPage(proximaPagina);
            await carregar(proximaPagina);
        } catch (error: any) {
            console.error(error);
            mostrarMensagem(
                error?.response?.data?.details ||
                error?.response?.data?.error ||
                "Erro ao excluir conta CCO.",
                "error"
            );
        } finally {
            setSalvando(false);
        }
    }

    return (
        <div className="space-y-6">
            {mensagem && (
                <div
                    className={`rounded-2xl px-4 py-3 text-sm font-medium ${tipoMensagem === "success"
                        ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "border border-red-200 bg-red-50 text-red-700"
                        }`}
                >
                    {mensagem}
                </div>
            )}

            <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-100">
                <div className="bg-linear-to-r from-[#00AE9D]/10 via-white to-[#79B729]/10 px-6 py-6">
                    <div className="grid gap-4 md:grid-cols-3">
                        <CardResumo
                            titulo="Registros CCO"
                            valor={formatNumber(resumo.totalCco)}
                            icon={<FaDatabase />}
                            cor="text-[#00AE9D]"
                        />

                        <CardResumo
                            titulo="Contas ativas"
                            valor={formatNumber(resumo.totalAtivas)}
                            icon={<FaUserCheck />}
                            cor="text-emerald-700"
                        />

                        <CardResumo
                            titulo="Contas inativas"
                            valor={formatNumber(resumo.totalInativas)}
                            icon={<FaUserTimes />}
                            cor="text-red-600"
                        />
                    </div>
                </div>

                <div className="p-6">
                    <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="relative w-full lg:w-96">
                            <FaSearch className="absolute left-4 top-4 text-slate-400" />

                            <input
                                value={busca}
                                onChange={(e) => setBusca(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") aplicarBusca();
                                }}
                                placeholder="Buscar por CPF, conta ou chave..."
                                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-sm outline-none transition focus:border-[#00AE9D] focus:ring-4 focus:ring-[#00AE9D]/10"
                            />
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row">
                            <select
                                value={limit}
                                onChange={(e) => {
                                    setLimit(Number(e.target.value));
                                    setPage(1);
                                }}
                                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-[#00AE9D] focus:ring-4 focus:ring-[#00AE9D]/10 cursor-pointer"
                            >
                                <option value={10}>10 por página</option>
                                <option value={20}>20 por página</option>
                                <option value={50}>50 por página</option>
                                <option value={100}>100 por página</option>
                            </select>

                            <button
                                type="button"
                                onClick={aplicarBusca}
                                disabled={loading}
                                className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 cursor-pointer"
                            >
                                {loading ? "Buscando..." : "Buscar"}
                            </button>

                            <button
                                type="button"
                                onClick={abrirNovo}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-secondary px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#00AE9D]/20 transition hover:bg-primary cursor-pointer"
                            >
                                <FaPlus />
                                Nova conta CCO
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setTextoImportacao("");
                                    setResultadoImportacao(null);
                                    setModalImportarAberta(true);
                                }}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#00AE9D]/20 bg-[#00AE9D]/10 px-5 py-3 text-sm font-semibold text-[#007f73] transition hover:bg-[#00AE9D]/15 cursor-pointer"
                            >
                                <FaClipboardList />
                                Colar em massa
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full border-separate border-spacing-y-3">
                            <thead>
                                <tr>
                                    <th className="px-4 text-left text-xs font-bold uppercase text-slate-400">
                                        CPF/CNPJ
                                    </th>
                                    <th className="px-4 text-left text-xs font-bold uppercase text-slate-400">
                                        Conta
                                    </th>
                                    <th className="px-4 text-left text-xs font-bold uppercase text-slate-400">
                                        Ativa
                                    </th>
                                    <th className="px-4 text-left text-xs font-bold uppercase text-slate-400">
                                        Chave CPF + Ativa
                                    </th>
                                    <th className="px-4 text-left text-xs font-bold uppercase text-slate-400">
                                        Criado em
                                    </th>
                                    <th className="px-4 text-right text-xs font-bold uppercase text-slate-400">
                                        Ações
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td
                                            colSpan={6}
                                            className="px-4 py-16 text-center text-sm text-slate-500"
                                        >
                                            Carregando contas CCO...
                                        </td>
                                    </tr>
                                ) : registros.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={6}
                                            className="px-4 py-16 text-center text-sm text-slate-500"
                                        >
                                            Nenhuma conta CCO encontrada.
                                        </td>
                                    </tr>
                                ) : (
                                    registros.map((item) => (
                                        <tr key={item.ID_CCO} className="bg-slate-50">
                                            <td className="rounded-l-2xl px-4 py-4 text-sm font-semibold text-slate-800">
                                                {formatCpfCnpj(item.CPF || "")}
                                            </td>

                                            <td className="px-4 py-4 text-sm text-slate-600">
                                                {item.CONTA || "-"}
                                            </td>

                                            <td className="px-4 py-4 text-sm">
                                                <span
                                                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${String(item.ATIVA || "").toUpperCase() === "S"
                                                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                                        : "border-red-200 bg-red-50 text-red-700"
                                                        }`}
                                                >
                                                    {String(item.ATIVA || "").toUpperCase() === "S"
                                                        ? "Ativa"
                                                        : "Inativa"}
                                                </span>
                                            </td>

                                            <td className="px-4 py-4 text-sm font-semibold text-slate-700">
                                                {item.CHAVE_CPF_ATIVA || "-"}
                                            </td>

                                            <td className="px-4 py-4 text-sm text-slate-600">
                                                {item.CREATED_AT || "-"}
                                            </td>

                                            <td className="rounded-r-2xl px-4 py-4 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => abrirEdicao(item)}
                                                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-secondary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary"
                                                >
                                                    <FaPen />
                                                    Editar
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-6 flex flex-col gap-4 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
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
                                {total}
                            </span>{" "}
                            contas CCO
                        </p>

                        <div className="flex items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setPage((old) => Math.max(old - 1, 1))}
                                disabled={page <= 1 || loading}
                                className="inline-flex h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <FaChevronLeft />
                                Anterior
                            </button>

                            <span className="rounded-2xl bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">
                                Página {page} de {totalPages}
                            </span>

                            <button
                                type="button"
                                onClick={() =>
                                    setPage((old) => Math.min(old + 1, totalPages))
                                }
                                disabled={page >= totalPages || loading}
                                className="inline-flex h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Próxima
                                <FaChevronRight />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {modalAberta && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
                    <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl">
                        <div className="bg-linear-to-r from-[#00AE9D]/10 via-white to-[#79B729]/10 px-6 py-5">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#00AE9D]">
                                        Conta CCO
                                    </p>

                                    <h2 className="mt-1 text-2xl font-bold text-slate-800">
                                        {registroSelecionado
                                            ? "Editar conta CCO"
                                            : "Nova conta CCO"}
                                    </h2>

                                    <p className="mt-1 text-sm text-slate-500">
                                        A chave CPF + Ativa será gerada automaticamente pela trigger do banco.
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={fecharModal}
                                    disabled={salvando}
                                    className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:border-red-200 hover:text-red-500 disabled:opacity-60"
                                >
                                    <FaTimes />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 space-y-5 overflow-y-auto p-6">
                            <section className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
                                <div className="grid gap-4 md:grid-cols-2">
                                    <Input
                                        label="CPF/CNPJ"
                                        value={form.CPF || ""}
                                        onChange={(v) => updateField("CPF", formatCpfCnpj(v))}
                                        placeholder="000.000.000-00"
                                    />

                                    <Input
                                        label="Conta"
                                        value={form.CONTA || ""}
                                        onChange={(v) =>
                                            updateField("CONTA", onlyDigits(v).slice(0, 12))
                                        }
                                        placeholder="Número da conta"
                                    />

                                    <div>
                                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                                            Ativa
                                        </label>

                                        <select
                                            value={form.ATIVA || "S"}
                                            onChange={(e) => updateField("ATIVA", e.target.value)}
                                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#00AE9D] focus:ring-4 focus:ring-[#00AE9D]/10"
                                        >
                                            <option value="S">Sim</option>
                                            <option value="N">Não</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                                            Chave CPF + Ativa
                                        </label>

                                        <input
                                            value={`${onlyDigits(form.CPF || "")}${form.ATIVA || "S"}`}
                                            disabled
                                            className="w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-500"
                                        />
                                    </div>
                                </div>
                            </section>
                        </div>

                        <div className="shrink-0 flex flex-col-reverse gap-3 border-t border-slate-100 bg-white px-6 py-4 sm:flex-row sm:justify-between">
                            <div>
                                {registroSelecionado && (
                                    <button
                                        type="button"
                                        onClick={removerCco}
                                        disabled={salvando}
                                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-60"
                                    >
                                        <FaTrash />
                                        Excluir
                                    </button>
                                )}
                            </div>

                            <div className="flex flex-col-reverse gap-3 sm:flex-row">
                                <button
                                    type="button"
                                    onClick={fecharModal}
                                    disabled={salvando}
                                    className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 cursor-pointer"
                                >
                                    Cancelar
                                </button>

                                <button
                                    type="button"
                                    onClick={salvarCco}
                                    disabled={salvando}
                                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#00AE9D]/20 transition hover:bg-secondary disabled:opacity-60 cursor-pointer"
                                >
                                    <FaSave />
                                    {salvando ? "Salvando..." : "Salvar conta CCO"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {modalImportarAberta && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
                    <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl">
                        <div className="bg-linear-to-r from-[#00AE9D]/10 via-white to-[#79B729]/10 px-6 py-5">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#00AE9D]">
                                        Importação em massa
                                    </p>

                                    <h2 className="mt-1 text-2xl font-bold text-slate-800">
                                        Colar contas CCO
                                    </h2>

                                    <p className="mt-1 text-sm text-slate-500">
                                        Copie os dados do Excel e cole abaixo. A chave CPF + Ativa será criada automaticamente no banco.
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setModalImportarAberta(false)}
                                    disabled={importandoMassa}
                                    className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:border-red-200 hover:text-red-500 disabled:opacity-60"
                                >
                                    <FaTimes />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 space-y-5 overflow-y-auto p-6">
                            <div className="rounded-3xl border border-[#00AE9D]/20 bg-[#00AE9D]/5 p-4">
                                <p className="text-sm font-semibold text-slate-800">
                                    Formato aceito
                                </p>

                                <p className="mt-1 text-xs leading-6 text-slate-600">
                                    Cole uma tabela copiada do Excel seguindo esta ordem:
                                    <strong> CPF | Conta | Ativa</strong>.
                                </p>

                                <pre className="mt-3 overflow-x-auto rounded-2xl bg-white p-3 text-xs leading-6 text-slate-600 ring-1 ring-slate-200">
                                    {`CPF            CONTA       ATIVA
07232274890    00000019    N
18386570881    00000027    S
40427676800    00000035    S`}
                                </pre>
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">
                                    Dados colados
                                </label>

                                <textarea
                                    value={textoImportacao}
                                    onChange={(e) => {
                                        setTextoImportacao(e.target.value);
                                        setResultadoImportacao(null);
                                    }}
                                    rows={10}
                                    placeholder={`Cole aqui os dados copiados do Excel:

CPF     CONTA     ATIVA
07232274890     00000019     N
18386570881     00000027     S
40427676800     00000035     S`}
                                    className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#00AE9D] focus:ring-4 focus:ring-[#00AE9D]/10"
                                />

                                <p className="mt-2 text-xs text-slate-500">
                                    Linhas válidas encontradas:{" "}
                                    <strong>{extrairCcoDoTexto(textoImportacao).length}</strong>
                                </p>
                            </div>

                            {resultadoImportacao && (
                                <div className="overflow-hidden rounded-3xl border border-slate-200">
                                    <div className="flex flex-col gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                            <p className="text-sm font-semibold text-slate-800">
                                                Resultado da importação
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                Confira quais linhas foram inseridas e quais tiveram erro.
                                            </p>
                                        </div>

                                        <div className="flex gap-2 text-xs font-semibold">
                                            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-700">
                                                Processados: {resultadoImportacao.processados}
                                            </span>

                                            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700">
                                                Inseridos: {resultadoImportacao.inseridos}
                                            </span>

                                            <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-red-700">
                                                Erros: {resultadoImportacao.erros}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="max-h-72 overflow-auto">
                                        <table className="min-w-full">
                                            <thead className="sticky top-0 z-10 bg-slate-100">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-500">
                                                        Linha
                                                    </th>
                                                    <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-500">
                                                        CPF/CNPJ
                                                    </th>
                                                    <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-500">
                                                        Conta
                                                    </th>
                                                    <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-500">
                                                        Ativa
                                                    </th>
                                                    <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-500">
                                                        Status
                                                    </th>
                                                </tr>
                                            </thead>

                                            <tbody className="divide-y divide-slate-100 bg-white">
                                                {resultadoImportacao.detalhes?.map((item: any) => (
                                                    <tr key={`${item.linha}-${item.cpf}`}>
                                                        <td className="px-4 py-3 text-sm font-semibold text-slate-700">
                                                            {item.linha}
                                                        </td>

                                                        <td className="px-4 py-3 text-sm text-slate-600">
                                                            {item.cpf}
                                                        </td>

                                                        <td className="px-4 py-3 text-sm text-slate-600">
                                                            {item.conta || "-"}
                                                        </td>

                                                        <td className="px-4 py-3 text-sm text-slate-600">
                                                            {item.ativa}
                                                        </td>

                                                        <td className="px-4 py-3 text-sm">
                                                            <span
                                                                className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${item.status === "INSERIDO"
                                                                    ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                                                                    : "border border-red-200 bg-red-50 text-red-700"
                                                                    }`}
                                                            >
                                                                {item.status === "INSERIDO"
                                                                    ? "Inserido"
                                                                    : item.mensagem}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="shrink-0 flex flex-col-reverse gap-3 border-t border-slate-100 bg-white px-6 py-4 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={() => setModalImportarAberta(false)}
                                disabled={importandoMassa}
                                className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 cursor-pointer"
                            >
                                Fechar
                            </button>

                            <button
                                type="button"
                                onClick={importarCcoColado}
                                disabled={importandoMassa || extrairCcoDoTexto(textoImportacao).length === 0}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#00AE9D]/20 transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                            >
                                <FaSave />
                                {importandoMassa
                                    ? "Importando..."
                                    : `Importar ${extrairCcoDoTexto(textoImportacao).length || ""} registro(s)`}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function CardResumo({
    titulo,
    valor,
    icon,
    cor,
}: {
    titulo: string;
    valor: string;
    icon: React.ReactNode;
    cor: string;
}) {
    return (
        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        {titulo}
                    </p>

                    <h3 className="mt-2 text-3xl font-bold text-slate-800">
                        {valor}
                    </h3>
                </div>

                <div
                    className={`flex h-14 w-14 items-center justify-center rounded-3xl bg-slate-50 ${cor}`}
                >
                    {icon}
                </div>
            </div>
        </div>
    );
}

function Input({
    label,
    value,
    onChange,
    placeholder,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}) {
    return (
        <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
                {label}
            </label>

            <input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#00AE9D] focus:ring-4 focus:ring-[#00AE9D]/10"
            />
        </div>
    );
}