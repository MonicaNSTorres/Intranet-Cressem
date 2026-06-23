"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState } from "react";
import {
    FaCalendarAlt,
    FaChevronLeft,
    FaChevronRight,
    FaClock,
    FaGavel,
    FaImage,
    FaPen,
    FaPlus,
    FaSave,
    FaSearch,
    FaTimes,
    FaTrash,
    FaTrophy,
} from "react-icons/fa";

import {
    atualizarLeilao,
    buscarLeilaoPorId,
    criarLeilao,
    excluirLeilao,
    listarLeiloes,
    type Leilao,
    type LeilaoPayload,
} from "@/services/leiloes.service";

const initialForm: LeilaoPayload = {
    NM_PRODUTO: "",
    DS_PRODUTO: "",
    VL_INICIAL: "",
    VL_INCREMENTO_MINIMO: "1",
    DT_INICIO: "",
    DT_FIM: "",
    ST_STATUS: "RASCUNHO",
    DS_REGRAS: "",
    IMAGEM_BASE64: "",
    NM_USUARIO_CRIACAO: "",
};

export function LeiloesForm() {
    const [loading, setLoading] = useState(false);
    const [salvando, setSalvando] = useState(false);

    const [busca, setBusca] = useState("");
    const [buscaAplicada, setBuscaAplicada] = useState("");
    const [status, setStatus] = useState("");

    const [mensagem, setMensagem] = useState("");
    const [tipoMensagem, setTipoMensagem] = useState<"success" | "error">("success");

    const [leiloes, setLeiloes] = useState<Leilao[]>([]);

    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(20);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    const [resumo, setResumo] = useState({
        totalLeiloes: 0,
        totalEmAndamento: 0,
        totalAgendados: 0,
        totalFinalizados: 0,
    });

    const [modalAberta, setModalAberta] = useState(false);
    const [leilaoSelecionado, setLeilaoSelecionado] = useState<Leilao | null>(null);
    const [form, setForm] = useState<LeilaoPayload>(initialForm);

    async function carregar(pagina = page) {
        try {
            setLoading(true);

            const result = await listarLeiloes({
                busca: buscaAplicada,
                status,
                page: pagina,
                limit,
            });

            setLeiloes(result.data);
            setTotal(result.total);
            setPage(result.page);
            setLimit(result.limit);
            setTotalPages(result.totalPages);
            setResumo(result.resumo);
        } catch (error) {
            console.error(error);
            mostrarMensagem("Não foi possível carregar os leilões.", "error");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        carregar(page);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, limit, buscaAplicada, status]);

    function mostrarMensagem(texto: string, tipo: "success" | "error" = "success") {
        setMensagem(texto);
        setTipoMensagem(tipo);
    }

    function aplicarBusca() {
        setBuscaAplicada(busca);
        setPage(1);
    }

    function abrirNovo() {
        setLeilaoSelecionado(null);
        setForm(initialForm);
        setMensagem("");
        setModalAberta(true);
    }

    async function abrirEdicao(item: Leilao) {
        try {
            setSalvando(true);
            setMensagem("");

            const leilaoCompleto = await buscarLeilaoPorId(item.ID_LEILAO);

            setLeilaoSelecionado(leilaoCompleto);

            setForm({
                NM_PRODUTO: leilaoCompleto.NM_PRODUTO || "",
                DS_PRODUTO: leilaoCompleto.DS_PRODUTO || "",
                VL_INICIAL: formatCurrencyFromDB(leilaoCompleto.VL_INICIAL),
                VL_INCREMENTO_MINIMO: formatCurrencyFromDB(
                    leilaoCompleto.VL_INCREMENTO_MINIMO
                ),
                DT_INICIO: toInputDateTime(leilaoCompleto.DT_INICIO || ""),
                DT_FIM: toInputDateTime(leilaoCompleto.DT_FIM || ""),
                ST_STATUS: leilaoCompleto.ST_STATUS || "RASCUNHO",
                DS_REGRAS: leilaoCompleto.DS_REGRAS || "",
                IMAGEM_BASE64: leilaoCompleto.IMAGEM_BASE64 || "",
                NM_USUARIO_CRIACAO: leilaoCompleto.NM_USUARIO_CRIACAO || "",
            });

            setModalAberta(true);
        } catch (error: any) {
            console.error(error);
            mostrarMensagem(
                error?.response?.data?.details ||
                error?.response?.data?.error ||
                "Erro ao carregar dados do leilão.",
                "error"
            );
        } finally {
            setSalvando(false);
        }
    }

    function fecharModal() {
        if (salvando) return;

        setModalAberta(false);
        setLeilaoSelecionado(null);
        setForm(initialForm);
    }

    function updateField(field: keyof LeilaoPayload, value: string) {
        setForm((old) => ({
            ...old,
            [field]: value,
        }));
    }

    function formatMoneyInput(value: string) {
        const digits = String(value || "").replace(/\D/g, "");

        if (!digits) return "";

        const number = Number(digits) / 100;

        return number.toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    }

    function formatCurrencyFromDB(value: any) {
        return Number(value || 0).toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    }

    function moneyToNumber(value: string | number) {
        if (typeof value === "number") return value;

        const normalized = String(value || "")
            .replace(/\./g, "")
            .replace(",", ".");

        return Number(normalized || 0);
    }

    function formatCurrency(value: any) {
        return Number(value || 0).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
        });
    }

    function toOracleDateTime(value: string) {
        if (!value) return "";

        return value.replace("T", " ") + ":00";
    }

    function toInputDateTime(value: string) {
        if (!value) return "";

        if (value.includes("-") && value.includes(" ")) {
            return value.slice(0, 16).replace(" ", "T");
        }

        if (value.includes("/")) {
            const [datePart, timePart = "00:00:00"] = value.split(" ");
            const [dd, mm, yyyy] = datePart.split("/");
            return `${yyyy}-${mm}-${dd}T${timePart.slice(0, 5)}`;
        }

        return value.slice(0, 16);
    }

    function montarPayload(): LeilaoPayload {
        return {
            ...form,
            NM_PRODUTO: String(form.NM_PRODUTO || "").trim().toUpperCase(),
            DS_PRODUTO: String(form.DS_PRODUTO || "").trim(),
            VL_INICIAL: moneyToNumber(form.VL_INICIAL),
            VL_INCREMENTO_MINIMO: moneyToNumber(form.VL_INCREMENTO_MINIMO),
            DT_INICIO: toOracleDateTime(String(form.DT_INICIO || "")),
            DT_FIM: toOracleDateTime(String(form.DT_FIM || "")),
            ST_STATUS: String(form.ST_STATUS || "RASCUNHO").toUpperCase(),
            DS_REGRAS: String(form.DS_REGRAS || "").trim(),
            IMAGEM_BASE64: form.IMAGEM_BASE64 || "",
        };
    }

    async function salvarLeilao() {
        try {
            setSalvando(true);
            setMensagem("");

            const payload = montarPayload();

            if (!payload.NM_PRODUTO) {
                mostrarMensagem("Informe o nome do produto.", "error");
                return;
            }

            if (Number(payload.VL_INICIAL || 0) <= 0) {
                mostrarMensagem("Informe um valor inicial maior que zero.", "error");
                return;
            }

            if (!payload.DT_INICIO || !payload.DT_FIM) {
                mostrarMensagem("Informe a data de início e a data de fim.", "error");
                return;
            }

            if (leilaoSelecionado?.ID_LEILAO) {
                await atualizarLeilao(leilaoSelecionado.ID_LEILAO, payload);
                mostrarMensagem("Leilão atualizado com sucesso.", "success");
            } else {
                await criarLeilao(payload);
                mostrarMensagem("Leilão cadastrado com sucesso.", "success");
                setPage(1);
            }

            fecharModal();
            await carregar(leilaoSelecionado ? page : 1);
        } catch (error: any) {
            console.error(error);
            mostrarMensagem(
                error?.response?.data?.details ||
                error?.response?.data?.error ||
                "Erro ao salvar leilão.",
                "error"
            );
        } finally {
            setSalvando(false);
        }
    }

    async function removerLeilao() {
        if (!leilaoSelecionado?.ID_LEILAO) return;

        const confirmar = window.confirm("Deseja realmente excluir este leilão?");

        if (!confirmar) return;

        try {
            setSalvando(true);

            await excluirLeilao(leilaoSelecionado.ID_LEILAO);

            mostrarMensagem("Leilão excluído com sucesso.", "success");
            fecharModal();

            const proximaPagina = leiloes.length === 1 && page > 1 ? page - 1 : page;

            setPage(proximaPagina);
            await carregar(proximaPagina);
        } catch (error: any) {
            console.error(error);
            mostrarMensagem(
                error?.response?.data?.details ||
                error?.response?.data?.error ||
                "Erro ao excluir leilão.",
                "error"
            );
        } finally {
            setSalvando(false);
        }
    }

    async function handleImagem(files?: FileList | null) {
        if (!files || files.length === 0) return;

        const imagensAtuais = getImagensBase64();

        const novasImagens = await Promise.all(
            Array.from(files).map(
                (file) =>
                    new Promise<string>((resolve) => {
                        const reader = new FileReader();

                        reader.onload = () => {
                            resolve(String(reader.result || ""));
                        };

                        reader.readAsDataURL(file);
                    })
            )
        );

        updateField(
            "IMAGEM_BASE64",
            JSON.stringify([...imagensAtuais, ...novasImagens])
        );
    }

    function getImagensBase64() {
        try {
            if (!form.IMAGEM_BASE64) return [];

            const parsed = JSON.parse(String(form.IMAGEM_BASE64));

            return Array.isArray(parsed) ? parsed : [String(form.IMAGEM_BASE64)];
        } catch {
            return form.IMAGEM_BASE64 ? [String(form.IMAGEM_BASE64)] : [];
        }
    }

    function removerImagem(index: number) {
        const imagens = getImagensBase64();

        const novas = imagens.filter((_, i) => i !== index);

        updateField("IMAGEM_BASE64", JSON.stringify(novas));
    }

    const primeiroRegistro = total === 0 ? 0 : (page - 1) * limit + 1;
    const ultimoRegistro = Math.min(page * limit, total);

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
                <div className="bg-linear-to-r from-primary/10 via-white to-secondary/10 px-6 py-6">
                    <div className="grid gap-4 md:grid-cols-4">
                        <CardResumo titulo="Leilões" valor={String(resumo.totalLeiloes)} icon={<FaGavel />} cor="text-primary" />
                        <CardResumo titulo="Em andamento" valor={String(resumo.totalEmAndamento)} icon={<FaTrophy />} cor="text-orange-600" />
                        <CardResumo titulo="Agendados" valor={String(resumo.totalAgendados)} icon={<FaClock />} cor="text-blue-600" />
                        <CardResumo titulo="Finalizados" valor={String(resumo.totalFinalizados)} icon={<FaCalendarAlt />} cor="text-secondary" />
                    </div>
                </div>

                <div className="p-6">
                    <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                        <div className="relative w-full xl:w-96">
                            <FaSearch className="absolute left-4 top-4 text-slate-400" />

                            <input
                                value={busca}
                                onChange={(e) => setBusca(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") aplicarBusca();
                                }}
                                placeholder="Buscar por produto ou descrição..."
                                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                            />
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row">
                            <select
                                value={status}
                                onChange={(e) => {
                                    setStatus(e.target.value);
                                    setPage(1);
                                }}
                                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 cursor-pointer"
                            >
                                <option value="">Todos os status</option>
                                <option value="RASCUNHO">Rascunho</option>
                                <option value="AGENDADO">Agendado</option>
                                <option value="EM_ANDAMENTO">Em andamento</option>
                                <option value="FINALIZADO">Finalizado</option>
                                <option value="CANCELADO">Cancelado</option>
                            </select>

                            <select
                                value={limit}
                                onChange={(e) => {
                                    setLimit(Number(e.target.value));
                                    setPage(1);
                                }}
                                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 cursor-pointer"
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
                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-secondary px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition hover:bg-primary cursor-pointer"
                            >
                                <FaPlus />
                                Novo leilão
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full border-separate border-spacing-y-3">
                            <thead>
                                <tr>
                                    <th className="px-4 text-left text-xs font-bold uppercase text-slate-400">Produto</th>
                                    <th className="px-4 text-left text-xs font-bold uppercase text-slate-400">Valor inicial</th>
                                    <th className="px-4 text-left text-xs font-bold uppercase text-slate-400">Lance atual</th>
                                    <th className="px-4 text-left text-xs font-bold uppercase text-slate-400">Início</th>
                                    <th className="px-4 text-left text-xs font-bold uppercase text-slate-400">Fim</th>
                                    <th className="px-4 text-left text-xs font-bold uppercase text-slate-400">Status</th>
                                    <th className="px-4 text-right text-xs font-bold uppercase text-slate-400">Ações</th>
                                </tr>
                            </thead>

                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-16 text-center text-sm text-slate-500">
                                            Carregando leilões...
                                        </td>
                                    </tr>
                                ) : leiloes.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-16 text-center text-sm text-slate-500">
                                            Nenhum leilão encontrado.
                                        </td>
                                    </tr>
                                ) : (
                                    leiloes.map((item) => (
                                        <tr key={item.ID_LEILAO} className="bg-slate-50">
                                            <td className="rounded-l-2xl px-4 py-4 text-sm font-semibold text-slate-800">
                                                {item.NM_PRODUTO}
                                                <p className="mt-1 line-clamp-1 text-xs font-normal text-slate-500">
                                                    {item.DS_PRODUTO || "Sem descrição"}
                                                </p>
                                            </td>

                                            <td className="px-4 py-4 text-sm text-slate-600">
                                                {formatCurrency(item.VL_INICIAL)}
                                            </td>

                                            <td className="px-4 py-4 text-sm font-bold text-primary">
                                                {formatCurrency(item.VL_LANCE_ATUAL || item.VL_INICIAL)}
                                                {item.NM_USUARIO_GANHANDO && (
                                                    <p className="mt-1 text-xs font-normal text-slate-500">
                                                        {item.NM_USUARIO_GANHANDO}
                                                    </p>
                                                )}
                                            </td>

                                            <td className="px-4 py-4 text-sm text-slate-600">{item.DT_INICIO}</td>
                                            <td className="px-4 py-4 text-sm text-slate-600">{item.DT_FIM}</td>

                                            <td className="px-4 py-4 text-sm">
                                                <StatusBadge status={item.ST_STATUS} />
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
                            Mostrando <span className="font-semibold text-slate-700">{primeiroRegistro}</span> até{" "}
                            <span className="font-semibold text-slate-700">{ultimoRegistro}</span> de{" "}
                            <span className="font-semibold text-slate-700">{total}</span> leilões
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
                                onClick={() => setPage((old) => Math.min(old + 1, totalPages))}
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
                    <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl">
                        <div className="bg-linear-to-r from-primary/10 via-white to-secondary/10 px-6 py-5">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
                                        Leilão
                                    </p>

                                    <h2 className="mt-1 text-2xl font-bold text-slate-800">
                                        {leilaoSelecionado ? "Editar leilão" : "Novo leilão"}
                                    </h2>

                                    <p className="mt-1 text-sm text-slate-500">
                                        Cadastre o produto, defina os valores e informe quando o leilão ficará disponível.
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

                        <div className="max-h-[72vh] space-y-6 overflow-y-auto p-6">
                            <section className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
                                <div className="mb-4 flex items-center gap-2">
                                    <FaGavel className="text-primary" />
                                    <h3 className="text-sm font-bold text-slate-800">Dados do produto</h3>
                                </div>

                                <div className="grid gap-4 md:grid-cols-2">
                                    <Input
                                        label="Nome do produto"
                                        value={form.NM_PRODUTO || ""}
                                        onChange={(v) => updateField("NM_PRODUTO", v)}
                                        placeholder="Ex: Notebook Dell"
                                    />

                                    <div>
                                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                                            Status
                                        </label>

                                        <select
                                            value={form.ST_STATUS || "RASCUNHO"}
                                            onChange={(e) => updateField("ST_STATUS", e.target.value)}
                                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                                        >
                                            <option value="RASCUNHO">Rascunho</option>
                                            <option value="AGENDADO">Agendado</option>
                                            <option value="EM_ANDAMENTO">Em andamento</option>
                                            <option value="FINALIZADO">Finalizado</option>
                                            <option value="CANCELADO">Cancelado</option>
                                        </select>
                                    </div>

                                    <div className="md:col-span-2">
                                        <Textarea
                                            label="Descrição"
                                            value={form.DS_PRODUTO || ""}
                                            onChange={(v) => updateField("DS_PRODUTO", v)}
                                            placeholder="Descreva o produto de forma simples..."
                                        />
                                    </div>
                                </div>
                            </section>

                            <section className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
                                <div className="mb-4 flex items-center gap-2">
                                    <FaTrophy className="text-orange-600" />
                                    <h3 className="text-sm font-bold text-slate-800">Valores do leilão</h3>
                                </div>

                                <div className="grid gap-4 md:grid-cols-2">
                                    <Input
                                        label="Valor inicial"
                                        value={String(form.VL_INICIAL || "")}
                                        onChange={(v) => updateField("VL_INICIAL", formatMoneyInput(v))}
                                        placeholder="0,00"
                                    />

                                    <Input
                                        label="Incremento mínimo do lance"
                                        value={String(form.VL_INCREMENTO_MINIMO || "")}
                                        onChange={(v) => updateField("VL_INCREMENTO_MINIMO", formatMoneyInput(v))}
                                        placeholder="1,00"
                                    />
                                </div>
                            </section>

                            <section className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
                                <div className="mb-4 flex items-center gap-2">
                                    <FaCalendarAlt className="text-blue-600" />
                                    <h3 className="text-sm font-bold text-slate-800">Período do leilão</h3>
                                </div>

                                <div className="grid gap-4 md:grid-cols-2">
                                    <Input
                                        label="Data e hora de início"
                                        type="datetime-local"
                                        value={form.DT_INICIO || ""}
                                        onChange={(v) => updateField("DT_INICIO", v)}
                                    />

                                    <Input
                                        label="Data e hora de fim"
                                        type="datetime-local"
                                        value={form.DT_FIM || ""}
                                        onChange={(v) => updateField("DT_FIM", v)}
                                    />
                                </div>
                            </section>

                            <section className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
                                <div className="mb-4 flex items-center gap-2">
                                    <FaImage className="text-secondary" />
                                    <h3 className="text-sm font-bold text-slate-800">Imagem e regras</h3>
                                </div>

                                <div className="grid gap-4 md:grid-cols-[260px_1fr]">
                                    <div>
                                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                                            Imagens do produto
                                        </label>

                                        <label className="flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-300 bg-white p-4 text-center transition hover:border-primary hover:bg-primary/5">
                                            <FaImage className="mb-3 text-3xl text-slate-400" />

                                            <span className="text-sm font-semibold text-slate-600">
                                                Clique para adicionar imagens
                                            </span>

                                            <span className="mt-1 text-xs text-slate-400">
                                                Você pode selecionar mais de uma foto
                                            </span>

                                            <input
                                                type="file"
                                                accept="image/png,image/jpeg,image/jpg"
                                                multiple
                                                className="hidden"
                                                onChange={(e) => handleImagem(e.target.files)}
                                            />
                                        </label>

                                        {getImagensBase64().length > 0 && (
                                            <div className="mt-4 grid grid-cols-2 gap-3">
                                                {getImagensBase64().map((img, index) => (
                                                    <div
                                                        key={index}
                                                        className="relative rounded-2xl border border-slate-200 bg-white p-2"
                                                    >
                                                        <img
                                                            src={img}
                                                            alt={`Imagem ${index + 1}`}
                                                            className="h-28 w-full rounded-xl object-contain"
                                                        />

                                                        <button
                                                            type="button"
                                                            onClick={() => removerImagem(index)}
                                                            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-red-50 text-xs text-red-600 shadow hover:bg-red-100"
                                                        >
                                                            <FaTimes />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <Textarea
                                        label="Regras e observações"
                                        value={form.DS_REGRAS || ""}
                                        onChange={(v) => updateField("DS_REGRAS", v)}
                                        placeholder="Ex: O maior lance até o horário final será o vencedor."
                                        rows={9}
                                    />
                                </div>
                            </section>
                        </div>

                        <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-white px-6 py-5 sm:flex-row sm:justify-between">
                            <div>
                                {leilaoSelecionado && (
                                    <button
                                        type="button"
                                        onClick={removerLeilao}
                                        disabled={salvando}
                                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-60 cursor-pointer"
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
                                    onClick={salvarLeilao}
                                    disabled={salvando}
                                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition hover:bg-secondary disabled:opacity-60 cursor-pointer"
                                >
                                    <FaSave />
                                    {salvando ? "Salvando..." : "Salvar leilão"}
                                </button>
                            </div>
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
    const valorFormatado = Number(valor || 0).toLocaleString("pt-BR");

    return (
        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        {titulo}
                    </p>

                    <h3 className="mt-2 text-3xl font-bold text-slate-800">
                        {valorFormatado}
                    </h3>
                </div>

                <div className={`flex h-14 w-14 items-center justify-center rounded-3xl bg-slate-50 ${cor}`}>
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
    type = "text",
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    type?: string;
}) {
    return (
        <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
                {label}
            </label>

            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
            />
        </div>
    );
}

function Textarea({
    label,
    value,
    onChange,
    placeholder,
    rows = 4,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    rows?: number;
}) {
    return (
        <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
                {label}
            </label>

            <textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                rows={rows}
                className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
            />
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const map: Record<string, string> = {
        RASCUNHO: "border-slate-200 bg-slate-50 text-slate-600",
        AGENDADO: "border-blue-200 bg-blue-50 text-blue-700",
        EM_ANDAMENTO: "border-orange-200 bg-orange-50 text-orange-700",
        FINALIZADO: "border-emerald-200 bg-emerald-50 text-emerald-700",
        CANCELADO: "border-red-200 bg-red-50 text-red-700",
    };

    const label: Record<string, string> = {
        RASCUNHO: "Rascunho",
        AGENDADO: "Agendado",
        EM_ANDAMENTO: "Em andamento",
        FINALIZADO: "Finalizado",
        CANCELADO: "Cancelado",
    };

    return (
        <span
            className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${map[status] || map.RASCUNHO
                }`}
        >
            {label[status] || status}
        </span>
    );
}