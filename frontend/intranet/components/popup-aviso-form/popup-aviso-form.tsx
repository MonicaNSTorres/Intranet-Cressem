"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import {
    ativarPopupAviso,
    criarPopupAviso,
    editarPopupAviso,
    listarPopupsAviso,
} from "@/services/popup_aviso.service";
import {
    FaCheckCircle,
    FaEdit,
    FaEye,
    FaImage,
    FaPlus,
    FaPowerOff,
    FaTimes,
    FaTrashAlt,
    FaBullhorn,
    FaCalendarAlt,
    FaInfoCircle,
    FaPen,
} from "react-icons/fa";

type FormState = {
    titulo: string;
    mensagem: string;
    botaoAceitar: string;
    botaoRecusar: string;
    dtInicio: string;
    dtFim: string;
    stAtivo: "S" | "N";
    exibirAposLogin: "S" | "N";
    obrigatorio: "S" | "N";
    imagemBase64: string;
};

const initialForm: FormState = {
    titulo: "",
    mensagem: "",
    botaoAceitar: "Aceitar",
    botaoRecusar: "Recusar",
    dtInicio: "",
    dtFim: "",
    stAtivo: "S",
    exibirAposLogin: "S",
    obrigatorio: "S",
    imagemBase64: "",
};

export function PopupAvisoForm() {
    const [form, setForm] = useState<FormState>(initialForm);
    const [loading, setLoading] = useState(false);
    const [salvando, setSalvando] = useState(false);
    const [lista, setLista] = useState<any[]>([]);
    const [previewAberto, setPreviewAberto] = useState(false);
    const [mensagem, setMensagem] = useState("");
    const [tipoMensagem, setTipoMensagem] = useState<"success" | "error">("success");

    const [modalEdicaoAberta, setModalEdicaoAberta] = useState(false);
    const [salvandoEdicao, setSalvandoEdicao] = useState(false);
    const [editandoId, setEditandoId] = useState<number | null>(null);
    const [editForm, setEditForm] = useState<FormState>(initialForm);

    const resumoStatus = useMemo(() => {
        return form.stAtivo === "S" ? "Popup ativo" : "Popup inativo";
    }, [form.stAtivo]);

    const totalPopups = useMemo(() => lista.length, [lista]);
    const totalAtivos = useMemo(
        () => lista.filter((item) => item.ST_ATIVO === "S").length,
        [lista]
    );

    function handleChange<K extends keyof FormState>(campo: K, valor: FormState[K]) {
        setForm((prev) => ({ ...prev, [campo]: valor }));
    }

    function handleEditChange<K extends keyof FormState>(campo: K, valor: FormState[K]) {
        setEditForm((prev) => ({ ...prev, [campo]: valor }));
    }

    function mostrarMensagem(texto: string, tipo: "success" | "error" = "success") {
        setMensagem(texto);
        setTipoMensagem(tipo);
    }

    async function carregarLista() {
        try {
            setLoading(true);
            const data = await listarPopupsAviso();
            setLista(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error(error);
            mostrarMensagem("Erro ao carregar popups cadastrados.", "error");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        carregarLista();
    }, []);

    useEffect(() => {
        if (modalEdicaoAberta || previewAberto) {
            document.body.style.overflow = "hidden";
            document.documentElement.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
            document.documentElement.style.overflow = "";
        }

        return () => {
            document.body.style.overflow = "";
            document.documentElement.style.overflow = "";
        };
    }, [modalEdicaoAberta, previewAberto]);

    function limparFormulario() {
        setForm(initialForm);
        setMensagem("");
    }

    function handleImagemChange(e: ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
            handleChange("imagemBase64", String(reader.result || ""));
        };
        reader.readAsDataURL(file);
    }

    function handleImagemEdicaoChange(e: ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
            handleEditChange("imagemBase64", String(reader.result || ""));
        };
        reader.readAsDataURL(file);
    }

    async function onCadastrar() {
        try {
            setSalvando(true);
            setMensagem("");

            await criarPopupAviso({
                titulo: form.titulo,
                mensagem: form.mensagem,
                botaoAceitar: form.botaoAceitar,
                botaoRecusar: form.botaoRecusar,
                dtInicio: form.dtInicio || null,
                dtFim: form.dtFim || null,
                stAtivo: form.stAtivo,
                exibirAposLogin: form.exibirAposLogin,
                obrigatorio: form.obrigatorio,
                imagemBase64: form.imagemBase64 || null,
            });

            mostrarMensagem("Popup cadastrado com sucesso.", "success");
            setForm(initialForm);
            await carregarLista();
        } catch (error) {
            console.error(error);
            mostrarMensagem("Erro ao cadastrar popup.", "error");
        } finally {
            setSalvando(false);
        }
    }

    async function onToggleStatus(item: any) {
        try {
            await ativarPopupAviso(item.ID_POPUP, item.ST_ATIVO === "S" ? "N" : "S");
            mostrarMensagem(
                item.ST_ATIVO === "S"
                    ? "Popup desativado com sucesso."
                    : "Popup ativado com sucesso.",
                "success"
            );
            await carregarLista();
        } catch (error) {
            console.error(error);
            mostrarMensagem("Erro ao alterar status do popup.", "error");
        }
    }

    function abrirModalEdicao(item: any) {
        setEditandoId(Number(item.ID_POPUP));
        setEditForm({
            titulo: item.TITULO || "",
            mensagem: item.MENSAGEM || "",
            botaoAceitar: item.BOTAO_ACEITAR || "Aceitar",
            botaoRecusar: item.BOTAO_RECUSAR || "Recusar",
            dtInicio: item.DT_INICIO || "",
            dtFim: item.DT_FIM || "",
            stAtivo: item.ST_ATIVO || "S",
            exibirAposLogin: item.EXIBIR_APOS_LOGIN || "S",
            obrigatorio: item.OBRIGATORIO || "S",
            imagemBase64: item.IMAGEM_BASE64 || "",
        });
        setModalEdicaoAberta(true);
    }

    function fecharModalEdicao() {
        setModalEdicaoAberta(false);
        setEditandoId(null);
        setEditForm(initialForm);
    }

    async function onSalvarEdicao() {
        if (!editandoId) return;

        try {
            setSalvandoEdicao(true);

            await editarPopupAviso(editandoId, {
                titulo: editForm.titulo,
                mensagem: editForm.mensagem,
                botaoAceitar: editForm.botaoAceitar,
                botaoRecusar: editForm.botaoRecusar,
                dtInicio: editForm.dtInicio || null,
                dtFim: editForm.dtFim || null,
                stAtivo: editForm.stAtivo,
                exibirAposLogin: editForm.exibirAposLogin,
                obrigatorio: editForm.obrigatorio,
                imagemBase64: editForm.imagemBase64 || null,
            });

            mostrarMensagem("Popup atualizado com sucesso.", "success");
            fecharModalEdicao();
            await carregarLista();
        } catch (error) {
            console.error(error);
            mostrarMensagem("Erro ao atualizar popup.", "error");
        } finally {
            setSalvandoEdicao(false);
        }
    }

    function cardStatusClass(valor: "S" | "N") {
        return valor === "S"
            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
            : "bg-gray-100 text-gray-600 border border-gray-200";
    }

    return (
        <div className="space-y-6">
            <div className="min-w-225 mx-auto rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 overflow-hidden">
                {/*<div className="border-b border-gray-100 bg-gradient-to-r from-[#00AE9D]/8 via-white to-[#C7D300]/10 px-6 py-6">
                    <div className="flex flex-col gap-5">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#C7D300] text-emerald-700 shadow-sm">
                                <FaBullhorn size={16} />
                            </div>

                            <div>
                                <h2 className="text-xl font-semibold text-gray-900">Novo popup</h2>
                                <p className="mt-1 text-sm text-gray-600">
                                    Configure o aviso que será exibido ao usuário ao entrar na intranet.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <div className="rounded-2xl bg-white/90 px-4 py-3 shadow-sm ring-1 ring-gray-100">
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                                    Status atual
                                </p>
                                <div className="mt-2">
                                    <span
                                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${cardStatusClass(
                                            form.stAtivo
                                        )}`}
                                    >
                                        {resumoStatus}
                                    </span>
                                </div>
                            </div>

                            <div className="rounded-2xl bg-white/90 px-4 py-3 shadow-sm ring-1 ring-gray-100">
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                                    Cadastrados
                                </p>
                                <p className="mt-2 text-2xl font-semibold text-gray-900">{totalPopups}</p>
                            </div>

                            <div className="rounded-2xl bg-white/90 px-4 py-3 shadow-sm ring-1 ring-gray-100">
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                                    Ativos
                                </p>
                                <p className="mt-2 text-2xl font-semibold text-emerald-700">{totalAtivos}</p>
                            </div>
                        </div>
                    </div>
                </div>*/}

                <div className="px-6 py-6">
                    {mensagem && (
                        <div
                            className={`mb-6 rounded-2xl px-4 py-3 text-sm font-medium ${tipoMensagem === "success"
                                    ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                                    : "border border-red-200 bg-red-50 text-red-700"
                                }`}
                        >
                            {mensagem}
                        </div>
                    )}

                    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.2fr)_360px]">
                        <div className="space-y-6">
                            <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-5">
                                <div className="mb-4 flex items-center gap-2">
                                    <FaPen className="text-[#00AE9D]" />
                                    <h3 className="text-sm font-semibold text-gray-900">Conteúdo do aviso</h3>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="mb-1.5 block text-xs font-medium text-gray-600">Título</label>
                                        <input
                                            value={form.titulo}
                                            onChange={(e) => handleChange("titulo", e.target.value)}
                                            placeholder="Digite o título do popup"
                                            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-1.5 block text-xs font-medium text-gray-600">
                                            Mensagem
                                        </label>
                                        <textarea
                                            value={form.mensagem}
                                            onChange={(e) => handleChange("mensagem", e.target.value)}
                                            placeholder="Digite a mensagem que será exibida ao usuário"
                                            rows={7}
                                            className="w-full resize-none rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-5">
                                <div className="mb-4 flex items-center gap-2">
                                    <FaCheckCircle className="text-[#79B729]" />
                                    <h3 className="text-sm font-semibold text-gray-900">Ações do usuário</h3>
                                </div>

                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div>
                                        <label className="mb-1.5 block text-xs font-medium text-gray-600">
                                            Botão aceitar
                                        </label>
                                        <input
                                            value={form.botaoAceitar}
                                            onChange={(e) => handleChange("botaoAceitar", e.target.value)}
                                            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
                                            placeholder="Ex: Aceitar"
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-1.5 block text-xs font-medium text-gray-600">
                                            Botão recusar
                                        </label>
                                        <input
                                            value={form.botaoRecusar}
                                            onChange={(e) => handleChange("botaoRecusar", e.target.value)}
                                            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
                                            placeholder="Ex: Recusar"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-5">
                                <div className="mb-4 flex items-center gap-2">
                                    <FaCalendarAlt className="text-[#00AE9D]" />
                                    <h3 className="text-sm font-semibold text-gray-900">Regras de exibição</h3>
                                </div>

                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                                    <div>
                                        <label className="mb-1.5 block text-xs font-medium text-gray-600">
                                            Data início
                                        </label>
                                        <input
                                            type="date"
                                            value={form.dtInicio}
                                            onChange={(e) => handleChange("dtInicio", e.target.value)}
                                            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-1.5 block text-xs font-medium text-gray-600">
                                            Data fim
                                        </label>
                                        <input
                                            type="date"
                                            value={form.dtFim}
                                            onChange={(e) => handleChange("dtFim", e.target.value)}
                                            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-1.5 block text-xs font-medium text-gray-600">Ativo</label>
                                        <select
                                            value={form.stAtivo}
                                            onChange={(e) => handleChange("stAtivo", e.target.value as "S" | "N")}
                                            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
                                        >
                                            <option value="S">Sim</option>
                                            <option value="N">Não</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="mb-1.5 block text-xs font-medium text-gray-600">
                                            Exibir após login
                                        </label>
                                        <select
                                            value={form.exibirAposLogin}
                                            onChange={(e) =>
                                                handleChange("exibirAposLogin", e.target.value as "S" | "N")
                                            }
                                            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
                                        >
                                            <option value="S">Sim</option>
                                            <option value="N">Não</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="mb-1.5 block text-xs font-medium text-gray-600">
                                            Obrigatório
                                        </label>
                                        <select
                                            value={form.obrigatorio}
                                            onChange={(e) => handleChange("obrigatorio", e.target.value as "S" | "N")}
                                            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
                                        >
                                            <option value="S">Sim</option>
                                            <option value="N">Não</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="overflow-hidden rounded-2xl border border-dashed border-gray-300 bg-linear-to-b from-gray-50 to-white">
                                <div className="border-b border-gray-100 px-5 py-4">
                                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                                        <FaImage className="text-[#00AE9D]" />
                                        Imagem do popup
                                    </div>
                                    <p className="mt-1 text-xs text-gray-500">
                                        Adicione uma imagem de destaque para enriquecer a comunicação visual.
                                    </p>
                                </div>

                                <div className="p-5">
                                    <div className="flex flex-wrap gap-3">
                                        <label className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-white shadow-sm transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer">
                                            Selecionar imagem
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={handleImagemChange}
                                            />
                                        </label>

                                        {form.imagemBase64 && (
                                            <>
                                                <button
                                                    type="button"
                                                    onClick={() => setPreviewAberto(true)}
                                                    className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
                                                >
                                                    <FaEye />
                                                    Visualizar
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => handleChange("imagemBase64", "")}
                                                    className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-100"
                                                >
                                                    <FaTrashAlt />
                                                    Remover
                                                </button>
                                            </>
                                        )}
                                    </div>

                                    <div className="mt-5">
                                        {form.imagemBase64 ? (
                                            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                                                <img
                                                    src={form.imagemBase64}
                                                    alt="Preview do popup"
                                                    className="h-60 w-full object-cover"
                                                />
                                            </div>
                                        ) : (
                                            <div className="flex h-60 pt-5 flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-gray-50 text-center">
                                                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-gray-400 shadow-sm">
                                                    <FaImage size={20} />
                                                </div>
                                                <p className="mt-4 text-sm font-medium text-gray-600">
                                                    Nenhuma imagem selecionada
                                                </p>
                                                <p className="mt-1 mb-4 max-w-60 text-xs text-gray-500">
                                                    A imagem será exibida no topo do popup da home, caso exista.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-[#79B729]/20 bg-[#79B729]/10 p-5">
                                <div className="flex items-start gap-3">
                                    <FaInfoCircle className="mt-0.5 shrink-0 text-[#79B729]" />
                                    <div>
                                        <p className="text-sm font-semibold text-gray-800">Dica de UX</p>
                                        <p className="mt-1 text-xs leading-6 text-gray-600">
                                            Prefira títulos curtos, mensagem objetiva e período de exibição bem
                                            definido. Isso melhora a leitura e evita ruído visual na intranet.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                                <h4 className="text-sm font-semibold text-gray-900">Prévia rápida</h4>
                                <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                                    {form.imagemBase64 ? (
                                        <img
                                            src={form.imagemBase64}
                                            alt="Prévia rápida"
                                            className="h-32 w-full object-cover"
                                        />
                                    ) : (
                                        <div className="h-20 bg-linear-to-r from-[#00AE9D]/10 via-white to-[#C7D300]/10" />
                                    )}

                                    <div className="p-4">
                                        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#00AE9D]">
                                            Aviso importante
                                        </p>
                                        <h5 className="mt-2 text-lg font-semibold text-gray-900">
                                            {form.titulo || "Título do popup"}
                                        </h5>
                                        <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-sm leading-6 text-gray-600">
                                            {form.mensagem || "A mensagem do popup será exibida aqui na prévia."}
                                        </p>

                                        <div className="mt-4 flex flex-wrap gap-2">
                                            <span className="inline-flex rounded-xl bg-secondary px-3 py-1.5 text-xs font-semibold text-white">
                                                {form.botaoAceitar || "Aceitar"}
                                            </span>
                                            <span className="inline-flex rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600">
                                                {form.botaoRecusar || "Recusar"}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 flex flex-col gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:items-center sm:justify-end">
                        <button
                            type="button"
                            onClick={limparFormulario}
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-slate-900 shadow-sm transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                        >
                            <FaTimes />
                            Limpar
                        </button>

                        <button
                            type="button"
                            onClick={onCadastrar}
                            disabled={salvando}
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-secondary px-5 text-sm font-semibold text-white shadow-sm transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                        >
                            <FaPlus />
                            {salvando ? "Cadastrando..." : "Cadastrar popup"}
                        </button>
                    </div>
                </div>
            </div>

            <div className="min-w-225 mx-auto rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 overflow-hidden">
                <div className="border-b border-gray-100 px-6 py-5">
                    <h3 className="text-lg font-semibold text-gray-900">Popups cadastrados</h3>
                    <p className="mt-1 text-sm text-gray-500">
                        Gerencie os avisos já criados, revise os dados e altere rapidamente o status de
                        exibição.
                    </p>
                </div>

                <div className="px-6 py-5">
                    <div className="overflow-x-auto">
                        <table className="min-w-full border-separate border-spacing-y-3">
                            <thead>
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        Título
                                    </th>
                                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        Status
                                    </th>
                                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        Período
                                    </th>
                                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        Obrigatório
                                    </th>
                                    <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        Ações
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">
                                            Carregando popups...
                                        </td>
                                    </tr>
                                ) : lista.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">
                                            Nenhum popup cadastrado até o momento.
                                        </td>
                                    </tr>
                                ) : (
                                    lista.map((item) => (
                                        <tr key={item.ID_POPUP} className="overflow-hidden rounded-2xl bg-gray-50">
                                            <td className="rounded-l-2xl px-4 py-4 align-top">
                                                <div className="flex items-start gap-3">
                                                    {item.IMAGEM_BASE64 ? (
                                                        <img
                                                            src={item.IMAGEM_BASE64}
                                                            alt={item.TITULO}
                                                            className="mt-0.5 h-14 w-14 rounded-xl border border-gray-200 object-cover bg-white"
                                                        />
                                                    ) : (
                                                        <div className="mt-0.5 flex h-14 w-14 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-400">
                                                            <FaImage />
                                                        </div>
                                                    )}

                                                    <div className="min-w-0">
                                                        <div className="font-semibold text-gray-900">{item.TITULO}</div>
                                                        <div className="mt-1 line-clamp-2 text-xs leading-5 text-gray-500">
                                                            {item.MENSAGEM}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="px-4 py-4 align-top">
                                                <span
                                                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${cardStatusClass(
                                                        item.ST_ATIVO
                                                    )}`}
                                                >
                                                    {item.ST_ATIVO === "S" ? "Ativo" : "Inativo"}
                                                </span>
                                            </td>

                                            <td className="px-4 py-4 align-top text-sm text-gray-600">
                                                <div>{item.DT_INICIO || "-"}</div>
                                                <div className="text-xs text-gray-400">até {item.DT_FIM || "-"}</div>
                                            </td>

                                            <td className="px-4 py-4 align-top text-sm text-gray-600">
                                                {item.OBRIGATORIO === "S" ? "Sim" : "Não"}
                                            </td>

                                            <td className="rounded-r-2xl px-4 py-4 align-top">
                                                <div className="flex flex-wrap justify-end gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => abrirModalEdicao(item)}
                                                        className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
                                                    >
                                                        <FaEdit />
                                                        Editar
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() => onToggleStatus(item)}
                                                        className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
                                                    >
                                                        <FaPowerOff />
                                                        {item.ST_ATIVO === "S" ? "Desativar" : "Ativar"}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {previewAberto && form.imagemBase64 && (
                <div
                    className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/70 p-4"
                    onClick={() => setPreviewAberto(false)}
                >
                    <div
                        className="w-full max-w-4xl overflow-hidden rounded-[28px] bg-white shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                            <div>
                                <h4 className="text-lg font-semibold text-gray-900">Preview da imagem</h4>
                                <p className="mt-1 text-sm text-gray-500">
                                    Visualização ampliada da imagem selecionada.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => setPreviewAberto(false)}
                                className="rounded-xl p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
                            >
                                <FaTimes />
                            </button>
                        </div>

                        <div className="bg-gray-50 p-4">
                            <img
                                src={form.imagemBase64}
                                alt="Preview"
                                className="max-h-[75vh] w-full rounded-2xl border border-gray-200 object-contain bg-white"
                            />
                        </div>
                    </div>
                </div>
            )}

            {modalEdicaoAberta && (
                <div
                    className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/65 p-4 backdrop-blur-[2px]"
                    onClick={fecharModalEdicao}
                >
                    <div
                        className="w-full max-w-5xl max-h-[92vh] overflow-hidden rounded-[28px] bg-white shadow-[0_30px_90px_rgba(0,0,0,0.25)]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="border-b border-gray-100 bg-gradient-to-r from-[#00AE9D]/8 via-white to-[#C7D300]/10 px-6 py-5">
                            <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#C7D300] text-emerald-700 shadow-sm">
                                            <FaEdit size={15} />
                                        </div>

                                        <div>
                                            <h4 className="text-xl font-semibold text-gray-900">Editar popup</h4>
                                            <p className="mt-1 text-sm text-gray-600">
                                                Atualize as informações do popup selecionado.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={fecharModalEdicao}
                                    className="rounded-xl p-2 text-gray-500 transition hover:bg-white hover:text-gray-700"
                                >
                                    <FaTimes />
                                </button>
                            </div>
                        </div>

                        <div className="overflow-y-auto px-6 py-6" style={{ maxHeight: "calc(92vh - 144px)" }}>
                            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.2fr)_340px]">
                                <div className="space-y-6">
                                    <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-5">
                                        <div className="mb-4 flex items-center gap-2">
                                            <FaPen className="text-[#00AE9D]" />
                                            <h3 className="text-sm font-semibold text-gray-900">Conteúdo do aviso</h3>
                                        </div>

                                        <div className="space-y-4">
                                            <div>
                                                <label className="mb-1.5 block text-xs font-medium text-gray-600">
                                                    Título
                                                </label>
                                                <input
                                                    value={editForm.titulo}
                                                    onChange={(e) => handleEditChange("titulo", e.target.value)}
                                                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
                                                />
                                            </div>

                                            <div>
                                                <label className="mb-1.5 block text-xs font-medium text-gray-600">
                                                    Mensagem
                                                </label>
                                                <textarea
                                                    value={editForm.mensagem}
                                                    onChange={(e) => handleEditChange("mensagem", e.target.value)}
                                                    rows={7}
                                                    className="w-full resize-none rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-5">
                                        <div className="mb-4 flex items-center gap-2">
                                            <FaCheckCircle className="text-[#79B729]" />
                                            <h3 className="text-sm font-semibold text-gray-900">Ações do usuário</h3>
                                        </div>

                                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                            <div>
                                                <label className="mb-1.5 block text-xs font-medium text-gray-600">
                                                    Botão aceitar
                                                </label>
                                                <input
                                                    value={editForm.botaoAceitar}
                                                    onChange={(e) => handleEditChange("botaoAceitar", e.target.value)}
                                                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
                                                />
                                            </div>

                                            <div>
                                                <label className="mb-1.5 block text-xs font-medium text-gray-600">
                                                    Botão recusar
                                                </label>
                                                <input
                                                    value={editForm.botaoRecusar}
                                                    onChange={(e) => handleEditChange("botaoRecusar", e.target.value)}
                                                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-5">
                                        <div className="mb-4 flex items-center gap-2">
                                            <FaCalendarAlt className="text-[#00AE9D]" />
                                            <h3 className="text-sm font-semibold text-gray-900">Regras de exibição</h3>
                                        </div>

                                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                                            <div>
                                                <label className="mb-1.5 block text-xs font-medium text-gray-600">
                                                    Data início
                                                </label>
                                                <input
                                                    type="date"
                                                    value={editForm.dtInicio}
                                                    onChange={(e) => handleEditChange("dtInicio", e.target.value)}
                                                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
                                                />
                                            </div>

                                            <div>
                                                <label className="mb-1.5 block text-xs font-medium text-gray-600">
                                                    Data fim
                                                </label>
                                                <input
                                                    type="date"
                                                    value={editForm.dtFim}
                                                    onChange={(e) => handleEditChange("dtFim", e.target.value)}
                                                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
                                                />
                                            </div>

                                            <div>
                                                <label className="mb-1.5 block text-xs font-medium text-gray-600">
                                                    Ativo
                                                </label>
                                                <select
                                                    value={editForm.stAtivo}
                                                    onChange={(e) => handleEditChange("stAtivo", e.target.value as "S" | "N")}
                                                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
                                                >
                                                    <option value="S">Sim</option>
                                                    <option value="N">Não</option>
                                                </select>
                                            </div>

                                            <div>
                                                <label className="mb-1.5 block text-xs font-medium text-gray-600">
                                                    Exibir após login
                                                </label>
                                                <select
                                                    value={editForm.exibirAposLogin}
                                                    onChange={(e) =>
                                                        handleEditChange("exibirAposLogin", e.target.value as "S" | "N")
                                                    }
                                                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
                                                >
                                                    <option value="S">Sim</option>
                                                    <option value="N">Não</option>
                                                </select>
                                            </div>

                                            <div>
                                                <label className="mb-1.5 block text-xs font-medium text-gray-600">
                                                    Obrigatório
                                                </label>
                                                <select
                                                    value={editForm.obrigatorio}
                                                    onChange={(e) =>
                                                        handleEditChange("obrigatorio", e.target.value as "S" | "N")
                                                    }
                                                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
                                                >
                                                    <option value="S">Sim</option>
                                                    <option value="N">Não</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="overflow-hidden rounded-2xl border border-dashed border-gray-300 bg-gradient-to-b from-gray-50 to-white">
                                        <div className="border-b border-gray-100 px-5 py-4">
                                            <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                                                <FaImage className="text-[#00AE9D]" />
                                                Imagem do popup
                                            </div>
                                            <p className="mt-1 text-xs text-gray-500">
                                                Atualize a imagem exibida no topo do aviso.
                                            </p>
                                        </div>

                                        <div className="p-5">
                                            <div className="flex flex-wrap gap-3">
                                                <label className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-secondary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary">
                                                    Trocar imagem
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        className="hidden"
                                                        onChange={handleImagemEdicaoChange}
                                                    />
                                                </label>

                                                {editForm.imagemBase64 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleEditChange("imagemBase64", "")}
                                                        className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-100"
                                                    >
                                                        <FaTrashAlt />
                                                        Remover
                                                    </button>
                                                )}
                                            </div>

                                            <div className="mt-5">
                                                {editForm.imagemBase64 ? (
                                                    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                                                        <img
                                                            src={editForm.imagemBase64}
                                                            alt="Preview edição"
                                                            className="max-h-[320px] w-full object-cover"
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="flex h-85 flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-gray-50 text-center">
                                                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-gray-400 shadow-sm">
                                                            <FaImage size={20} />
                                                        </div>
                                                        <p className="mt-4 text-sm font-medium text-gray-600">
                                                            Nenhuma imagem vinculada
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                                        <h4 className="text-sm font-semibold text-gray-900">Prévia da edição</h4>
                                        <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                                            {editForm.imagemBase64 ? (
                                                <img
                                                    src={editForm.imagemBase64}
                                                    alt="Prévia edição"
                                                    className="h-32 w-full object-cover"
                                                />
                                            ) : (
                                                <div className="h-20 bg-gradient-to-r from-[#00AE9D]/10 via-white to-[#C7D300]/10" />
                                            )}

                                            <div className="p-4">
                                                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#00AE9D]">
                                                    Aviso importante
                                                </p>
                                                <h5 className="mt-2 text-lg font-semibold text-gray-900">
                                                    {editForm.titulo || "Título do popup"}
                                                </h5>
                                                <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-sm leading-6 text-gray-600">
                                                    {editForm.mensagem || "A mensagem do popup será exibida aqui na prévia."}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-gray-100 bg-white px-6 py-4">
                            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                                <button
                                    type="button"
                                    onClick={fecharModalEdicao}
                                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                                >
                                    <FaTimes />
                                    Cancelar
                                </button>

                                <button
                                    type="button"
                                    onClick={onSalvarEdicao}
                                    disabled={salvandoEdicao}
                                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-secondary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary disabled:cursor-not-allowed disabled:opacity-70"
                                >
                                    <FaCheckCircle />
                                    {salvandoEdicao ? "Salvando..." : "Salvar alterações"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}