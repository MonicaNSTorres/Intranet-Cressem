"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState } from "react";
import {
    FaBuilding,
    FaChevronLeft,
    FaChevronRight,
    FaClipboardList,
    FaDatabase,
    FaMapMarkerAlt,
    FaPen,
    FaPlus,
    FaSave,
    FaSearch,
    FaTimes,
    FaTrash,
    FaUniversity,
} from "react-icons/fa";

import {
    atualizarAgencia,
    criarAgencia,
    excluirAgencia,
    importarAgenciasEmMassa,
    listarAgencias,
    type CnabAgencia,
    type CnabAgenciaImportarLinha,
    type CnabAgenciaPayload,
} from "@/services/cnab240_agencias.service";

const initialForm: CnabAgenciaPayload = {
    NUMBANCO: "",
    NUMAGENCIA: "",
    DESCAGENCIA: "",
    NUMCAMARACOMP: "",
    CGCCOMPLETO: "",
    CODMUNICIPIO: "",
    NOMEMUNICIPIO: "",
    UF: "",
};

export function Cnab240AgenciasForm() {
    const [loading, setLoading] = useState(false);
    const [salvando, setSalvando] = useState(false);

    const [busca, setBusca] = useState("");
    const [buscaAplicada, setBuscaAplicada] = useState("");

    const [mensagem, setMensagem] = useState("");
    const [tipoMensagem, setTipoMensagem] = useState<"success" | "error">("success");

    const [registros, setRegistros] = useState<CnabAgencia[]>([]);

    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(20);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    const [resumo, setResumo] = useState({
        totalAgencias: 0,
        totalBancos: 0,
        totalMunicipios: 0,
    });

    const [modalAberta, setModalAberta] = useState(false);
    const [registroSelecionado, setRegistroSelecionado] =
        useState<CnabAgencia | null>(null);

    const [form, setForm] = useState<CnabAgenciaPayload>(initialForm);

    const [modalImportarAberta, setModalImportarAberta] = useState(false);
    const [textoImportacao, setTextoImportacao] = useState("");
    const [importandoMassa, setImportandoMassa] = useState(false);
    const [resultadoImportacao, setResultadoImportacao] = useState<any>(null);

    const primeiroRegistro = total === 0 ? 0 : (page - 1) * limit + 1;
    const ultimoRegistro = Math.min(page * limit, total);

    async function carregar(pagina = page) {
        try {
            setLoading(true);

            const result = await listarAgencias({
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
            mostrarMensagem("Não foi possível carregar as agências.", "error");
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

    function gerarBancoAgenciaPreview() {
        const banco = onlyDigits(form.NUMBANCO || "").padStart(3, "0").slice(-3);
        const agencia = onlyDigits(form.NUMAGENCIA || "").padStart(5, "0").slice(-5);

        if (!onlyDigits(form.NUMBANCO || "") && !onlyDigits(form.NUMAGENCIA || "")) {
            return "";
        }

        return `${banco}${agencia}`;
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

    function abrirEdicao(item: CnabAgencia) {
        setRegistroSelecionado(item);

        setForm({
            NUMBANCO: item.NUMBANCO || "",
            NUMAGENCIA: item.NUMAGENCIA || "",
            DESCAGENCIA: item.DESCAGENCIA || "",
            NUMCAMARACOMP: item.NUMCAMARACOMP || "",
            CGCCOMPLETO: item.CGCCOMPLETO || "",
            CODMUNICIPIO: item.CODMUNICIPIO || "",
            NOMEMUNICIPIO: item.NOMEMUNICIPIO || "",
            UF: item.UF || "",
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

    function updateField(field: keyof CnabAgenciaPayload, value: string) {
        setForm((old) => ({
            ...old,
            [field]: value,
        }));
    }

    function montarPayload(): CnabAgenciaPayload {
        return {
            NUMBANCO: onlyDigits(form.NUMBANCO || "").slice(0, 3),
            NUMAGENCIA: onlyDigits(form.NUMAGENCIA || "").slice(0, 5),
            DESCAGENCIA: String(form.DESCAGENCIA || "").trim().toUpperCase(),
            NUMCAMARACOMP: onlyDigits(form.NUMCAMARACOMP || "").slice(0, 3),
            CGCCOMPLETO: onlyDigits(form.CGCCOMPLETO || "").slice(0, 14),
            CODMUNICIPIO: onlyDigits(form.CODMUNICIPIO || "").slice(0, 10),
            NOMEMUNICIPIO: String(form.NOMEMUNICIPIO || "").trim().toUpperCase(),
            UF: String(form.UF || "").trim().toUpperCase().slice(0, 2),
        };
    }

    async function salvarAgencia() {
        try {
            setSalvando(true);
            setMensagem("");

            const payload = montarPayload();

            if (!payload.NUMBANCO) {
                mostrarMensagem("Informe o banco.", "error");
                return;
            }

            if (!payload.NUMAGENCIA) {
                mostrarMensagem("Informe a agência.", "error");
                return;
            }

            if (!payload.DESCAGENCIA) {
                mostrarMensagem("Informe a descrição da agência.", "error");
                return;
            }

            if (payload.UF && payload.UF.length !== 2) {
                mostrarMensagem("UF inválida.", "error");
                return;
            }

            if (registroSelecionado?.ID_AGENCIA) {
                await atualizarAgencia(registroSelecionado.ID_AGENCIA, payload);
                mostrarMensagem("Agência atualizada com sucesso.", "success");
            } else {
                await criarAgencia(payload);
                mostrarMensagem("Agência cadastrada com sucesso.", "success");
                setPage(1);
            }

            fecharModal();
            await carregar(registroSelecionado ? page : 1);
        } catch (error: any) {
            console.error(error);
            mostrarMensagem(
                error?.response?.data?.details ||
                error?.response?.data?.error ||
                "Erro ao salvar agência.",
                "error"
            );
        } finally {
            setSalvando(false);
        }
    }

    async function removerAgencia() {
        if (!registroSelecionado?.ID_AGENCIA) return;

        const confirmar = window.confirm("Deseja realmente excluir esta agência?");

        if (!confirmar) return;

        try {
            setSalvando(true);

            await excluirAgencia(registroSelecionado.ID_AGENCIA);

            mostrarMensagem("Agência excluída com sucesso.", "success");
            fecharModal();

            const proximaPagina = registros.length === 1 && page > 1 ? page - 1 : page;

            setPage(proximaPagina);
            await carregar(proximaPagina);
        } catch (error: any) {
            console.error(error);
            mostrarMensagem(
                error?.response?.data?.details ||
                error?.response?.data?.error ||
                "Erro ao excluir agência.",
                "error"
            );
        } finally {
            setSalvando(false);
        }
    }

    function extrairAgenciasDoTexto(texto: string): CnabAgenciaImportarLinha[] {
        const linhas: CnabAgenciaImportarLinha[] = [];

        texto
            .split(/\r?\n/)
            .map((linha) => linha.trim())
            .filter(Boolean)
            .forEach((linha) => {
                if (/^numbanco/i.test(linha) || /^banco/i.test(linha)) return;

                const partes = linha.includes("\t")
                    ? linha.split("\t")
                    : linha.includes(";")
                        ? linha.split(";")
                        : linha.split(/\s{2,}/);

                const NUMBANCO = onlyDigits(partes[0] || "");
                const NUMAGENCIA = onlyDigits(partes[1] || "");
                const DESCAGENCIA = String(partes[2] || "").trim();
                const NUMCAMARACOMP = onlyDigits(partes[3] || "");
                const CGCCOMPLETO = onlyDigits(partes[4] || "");
                const CODMUNICIPIO = onlyDigits(partes[5] || "");
                const NOMEMUNICIPIO = String(partes[6] || "").trim();
                const UF = String(partes[7] || "").trim().toUpperCase().slice(0, 2);

                if (!NUMBANCO || !NUMAGENCIA || !DESCAGENCIA) return;

                linhas.push({
                    NUMBANCO,
                    NUMAGENCIA,
                    DESCAGENCIA,
                    NUMCAMARACOMP,
                    CGCCOMPLETO,
                    CODMUNICIPIO,
                    NOMEMUNICIPIO,
                    UF,
                });
            });

        return linhas;
    }

    async function importarAgenciasColadas() {
        const linhas = extrairAgenciasDoTexto(textoImportacao);

        if (linhas.length === 0) {
            mostrarMensagem("Cole pelo menos uma linha válida.", "error");
            return;
        }

        try {
            setImportandoMassa(true);
            setResultadoImportacao(null);

            const result = await importarAgenciasEmMassa(linhas);

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
                "Erro ao importar agências.",
                "error"
            );
        } finally {
            setImportandoMassa(false);
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
                            titulo="Agências"
                            valor={formatNumber(resumo.totalAgencias)}
                            icon={<FaBuilding />}
                            cor="text-[#00AE9D]"
                        />

                        <CardResumo
                            titulo="Bancos"
                            valor={formatNumber(resumo.totalBancos)}
                            icon={<FaUniversity />}
                            cor="text-blue-700"
                        />

                        <CardResumo
                            titulo="Municípios"
                            valor={formatNumber(resumo.totalMunicipios)}
                            icon={<FaMapMarkerAlt />}
                            cor="text-[#79B729]"
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
                                placeholder="Buscar por banco, agência, cidade ou UF..."
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
                                Nova agência
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
                                        Banco
                                    </th>
                                    <th className="px-4 text-left text-xs font-bold uppercase text-slate-400">
                                        Agência
                                    </th>
                                    <th className="px-4 text-left text-xs font-bold uppercase text-slate-400">
                                        Chave
                                    </th>
                                    <th className="px-4 text-left text-xs font-bold uppercase text-slate-400">
                                        Nome da agência
                                    </th>
                                    <th className="px-4 text-left text-xs font-bold uppercase text-slate-400">
                                        Câmara
                                    </th>
                                    <th className="px-4 text-left text-xs font-bold uppercase text-slate-400">
                                        Município/UF
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
                                            colSpan={7}
                                            className="px-4 py-16 text-center text-sm text-slate-500"
                                        >
                                            Carregando agências...
                                        </td>
                                    </tr>
                                ) : registros.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={7}
                                            className="px-4 py-16 text-center text-sm text-slate-500"
                                        >
                                            Nenhuma agência encontrada.
                                        </td>
                                    </tr>
                                ) : (
                                    registros.map((item) => (
                                        <tr key={item.ID_AGENCIA} className="bg-slate-50">
                                            <td className="rounded-l-2xl px-4 py-4 text-sm font-semibold text-slate-800">
                                                {item.NUMBANCO || "-"}
                                            </td>

                                            <td className="px-4 py-4 text-sm text-slate-600">
                                                {item.NUMAGENCIA || "-"}
                                            </td>

                                            <td className="px-4 py-4 text-sm font-semibold text-slate-700">
                                                {item.BANCOAGENCIA || "-"}
                                            </td>

                                            <td className="px-4 py-4 text-sm font-semibold text-slate-800">
                                                {item.DESCAGENCIA || "-"}
                                            </td>

                                            <td className="px-4 py-4 text-sm text-slate-600">
                                                {item.NUMCAMARACOMP || "-"}
                                            </td>

                                            <td className="px-4 py-4 text-sm text-slate-600">
                                                {item.NOMEMUNICIPIO
                                                    ? `${item.NOMEMUNICIPIO}/${item.UF || ""}`
                                                    : "-"}
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
                            agências
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
                    <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl">
                        <div className="bg-linear-to-r from-[#00AE9D]/10 via-white to-[#79B729]/10 px-6 py-5">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#00AE9D]">
                                        Agência CNAB240
                                    </p>

                                    <h2 className="mt-1 text-2xl font-bold text-slate-800">
                                        {registroSelecionado
                                            ? "Editar agência"
                                            : "Nova agência"}
                                    </h2>

                                    <p className="mt-1 text-sm text-slate-500">
                                        A chave Banco + Agência será gerada automaticamente pelo sistema.
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
                                <div className="grid gap-4 md:grid-cols-4">
                                    <Input
                                        label="Banco"
                                        value={form.NUMBANCO || ""}
                                        onChange={(v) =>
                                            updateField("NUMBANCO", onlyDigits(v).slice(0, 3))
                                        }
                                        placeholder="033"
                                    />

                                    <Input
                                        label="Agência"
                                        value={form.NUMAGENCIA || ""}
                                        onChange={(v) =>
                                            updateField("NUMAGENCIA", onlyDigits(v).slice(0, 5))
                                        }
                                        placeholder="00093"
                                    />

                                    <Input
                                        label="Câmara"
                                        value={form.NUMCAMARACOMP || ""}
                                        onChange={(v) =>
                                            updateField("NUMCAMARACOMP", onlyDigits(v).slice(0, 3))
                                        }
                                        placeholder="018"
                                    />

                                    <div>
                                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                                            Chave banco + agência
                                        </label>

                                        <input
                                            value={gerarBancoAgenciaPreview()}
                                            disabled
                                            className="w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-500"
                                        />
                                    </div>

                                    <div className="md:col-span-2">
                                        <Input
                                            label="Nome da agência"
                                            value={form.DESCAGENCIA || ""}
                                            onChange={(v) => updateField("DESCAGENCIA", v)}
                                            placeholder="Nome da agência"
                                        />
                                    </div>

                                    <Input
                                        label="CNPJ"
                                        value={form.CGCCOMPLETO || ""}
                                        onChange={(v) =>
                                            updateField("CGCCOMPLETO", onlyDigits(v).slice(0, 14))
                                        }
                                        placeholder="00000000000000"
                                    />

                                    <Input
                                        label="Código município"
                                        value={form.CODMUNICIPIO || ""}
                                        onChange={(v) =>
                                            updateField("CODMUNICIPIO", onlyDigits(v).slice(0, 10))
                                        }
                                        placeholder="00000"
                                    />

                                    <div className="md:col-span-3">
                                        <Input
                                            label="Município"
                                            value={form.NOMEMUNICIPIO || ""}
                                            onChange={(v) => updateField("NOMEMUNICIPIO", v)}
                                            placeholder="Município"
                                        />
                                    </div>

                                    <Input
                                        label="UF"
                                        value={form.UF || ""}
                                        onChange={(v) =>
                                            updateField("UF", v.toUpperCase().slice(0, 2))
                                        }
                                        placeholder="SP"
                                    />
                                </div>
                            </section>
                        </div>

                        <div className="shrink-0 flex flex-col-reverse gap-3 border-t border-slate-100 bg-white px-6 py-4 sm:flex-row sm:justify-between">
                            <div>
                                {registroSelecionado && (
                                    <button
                                        type="button"
                                        onClick={removerAgencia}
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
                                    onClick={salvarAgencia}
                                    disabled={salvando}
                                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#00AE9D]/20 transition hover:bg-secondary disabled:opacity-60 cursor-pointer"
                                >
                                    <FaSave />
                                    {salvando ? "Salvando..." : "Salvar agência"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {modalImportarAberta && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
                    <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl">
                        <div className="bg-linear-to-r from-[#00AE9D]/10 via-white to-[#79B729]/10 px-6 py-5">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#00AE9D]">
                                        Importação em massa
                                    </p>

                                    <h2 className="mt-1 text-2xl font-bold text-slate-800">
                                        Colar agências
                                    </h2>

                                    <p className="mt-1 text-sm text-slate-500">
                                        Copie os dados do Excel e cole abaixo. A chave Banco + Agência será gerada automaticamente.
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
                                    <strong> Banco | Agência | Nome | Câmara | CNPJ | Cod. Município | Município | UF</strong>.
                                </p>

                                <pre className="mt-3 overflow-x-auto rounded-2xl bg-white p-3 text-xs leading-6 text-slate-600 ring-1 ring-slate-200">
                                    {`NUMBANCO   NUMAGENCIA   DESCAGENCIA        NUMCAMARACOMP   CGCCOMPLETO      CODMUNICIPIO   NOMEMUNICIPIO   UF
1          3264         SHOPPING PLANALTINA 18              00000000393738   42738          PLANALTINA      DF
1          25           CATAGUASES MG       18              00000000002569   32528          CATAGUASES      MG`}
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

NUMBANCO     NUMAGENCIA     DESCAGENCIA     NUMCAMARACOMP     CGCCOMPLETO     CODMUNICIPIO     NOMEMUNICIPIO     UF
1            3264           SHOPPING PLANALTINA     18     00000000393738     42738     PLANALTINA     DF`}
                                    className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#00AE9D] focus:ring-4 focus:ring-[#00AE9D]/10"
                                />

                                <p className="mt-2 text-xs text-slate-500">
                                    Linhas válidas encontradas:{" "}
                                    <strong>{extrairAgenciasDoTexto(textoImportacao).length}</strong>
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
                                                        Chave
                                                    </th>
                                                    <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-500">
                                                        Banco
                                                    </th>
                                                    <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-500">
                                                        Agência
                                                    </th>
                                                    <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-500">
                                                        Nome
                                                    </th>
                                                    <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-500">
                                                        Status
                                                    </th>
                                                </tr>
                                            </thead>

                                            <tbody className="divide-y divide-slate-100 bg-white">
                                                {resultadoImportacao.detalhes?.map((item: any) => (
                                                    <tr key={`${item.linha}-${item.bancoagencia}`}>
                                                        <td className="px-4 py-3 text-sm font-semibold text-slate-700">
                                                            {item.linha}
                                                        </td>

                                                        <td className="px-4 py-3 text-sm text-slate-600">
                                                            {item.bancoagencia}
                                                        </td>

                                                        <td className="px-4 py-3 text-sm text-slate-600">
                                                            {item.numbanco}
                                                        </td>

                                                        <td className="px-4 py-3 text-sm text-slate-600">
                                                            {item.numagencia}
                                                        </td>

                                                        <td className="px-4 py-3 text-sm text-slate-600">
                                                            {item.descagencia || "-"}
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
                                onClick={importarAgenciasColadas}
                                disabled={
                                    importandoMassa ||
                                    extrairAgenciasDoTexto(textoImportacao).length === 0
                                }
                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#00AE9D]/20 transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                            >
                                <FaSave />
                                {importandoMassa
                                    ? "Importando..."
                                    : `Importar ${extrairAgenciasDoTexto(textoImportacao).length || ""
                                    } registro(s)`}
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