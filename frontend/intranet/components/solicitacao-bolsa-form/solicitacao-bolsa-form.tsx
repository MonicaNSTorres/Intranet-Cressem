"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import { FaPrint } from "react-icons/fa";
import {
    buscarFuncionarioPorNome,
    buscarGerenciaPorCodigo,
    listarCidades,
} from "@/services/bolsa_estudo.service";
import { gerarSolicitacaoBolsaPdf } from "@/lib/pdf/gerarPdfSolicitacaoBolsa";

type FormDataType = {
    nome: string;
    admissao: string;
    curso: string;
    semestre: string;
    periodo: string;
    universidade: string;
    cidade: string;
};

function formatarDataInput(value?: string | null) {
    if (!value) return "";

    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

    if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
        const [dia, mes, ano] = value.split("/");
        return `${ano}-${mes}-${dia}`;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toISOString().slice(0, 10);
}

function getNomeUsuarioLogado() {
    if (typeof window === "undefined") return "";

    return (
        localStorage.getItem("NOME_COMPLETO") ||
        localStorage.getItem("REMOTE_USER_INTRANET") ||
        localStorage.getItem("nome_completo") ||
        localStorage.getItem("nome") ||
        localStorage.getItem("username") ||
        sessionStorage.getItem("NOME_COMPLETO") ||
        sessionStorage.getItem("REMOTE_USER_INTRANET") ||
        sessionStorage.getItem("nome_completo") ||
        sessionStorage.getItem("nome") ||
        sessionStorage.getItem("username") ||
        ""
    );
}

const initialForm: FormDataType = {
    nome: "",
    admissao: "",
    curso: "",
    semestre: "",
    periodo: "",
    universidade: "",
    cidade: "",
};

export function SolicitacaoBolsaForm() {
    const [form, setForm] = useState<FormDataType>(initialForm);
    const [nomeGestor, setNomeGestor] = useState("");
    const [cidades, setCidades] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [gerando, setGerando] = useState(false);
    const [erro, setErro] = useState("");
    const [info, setInfo] = useState("");

    const dataHoje = useMemo(() => {
        const agora = new Date();
        const dia = String(agora.getDate()).padStart(2, "0");
        const mes = agora.toLocaleString("pt-BR", { month: "long" });
        const ano = String(agora.getFullYear());

        return { dia, mes, ano };
    }, []);

    useEffect(() => {
        carregarDadosIniciais();
    }, []);

    async function carregarDadosIniciais() {
        try {
            setLoading(true);
            setErro("");
            setInfo("");

            const nomeUsuarioLogado = getNomeUsuarioLogado();
            const cidadesData = await listarCidades();

            setCidades(cidadesData || []);

            if (!nomeUsuarioLogado) {
                setErro("Não foi possível identificar o usuário logado para preencher a solicitação.");
                return;
            }

            const funcionario = await buscarFuncionarioPorNome(nomeUsuarioLogado);
            const cidadeFuncionario = String(funcionario?.NM_CIDADE || "").trim();

            setForm((prev) => ({
                ...prev,
                nome: funcionario?.NM_FUNCIONARIO || nomeUsuarioLogado,
                admissao: formatarDataInput(funcionario?.DT_ADMISSAO),
                cidade: cidadeFuncionario || prev.cidade,
            }));

            if (cidadeFuncionario) {
                setCidades((prev) =>
                    prev.some((cidade) => cidade.toUpperCase() === cidadeFuncionario.toUpperCase())
                        ? prev
                        : [...prev, cidadeFuncionario].sort((a, b) => a.localeCompare(b, "pt-BR"))
                );
            }

            if (funcionario?.CD_GERENCIA) {
                const gerencia = await buscarGerenciaPorCodigo(funcionario.CD_GERENCIA);
                setNomeGestor(gerencia?.NM_FUNCIONARIO || "");
            }

            setInfo("Dados do funcionário carregados com sucesso.");
        } catch (error: any) {
            console.error("Erro ao carregar solicitação de bolsa:", error);
            setErro(
                error?.response?.data?.error ||
                error?.response?.data?.message ||
                "Não foi possível carregar os dados da solicitação de bolsa."
            );
        } finally {
            setLoading(false);
        }
    }

    function handleChange(
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) {
        const { name, value } = e.target;

        setForm((prev) => ({
            ...prev,
            [name]: value,
        }));
    }

    function validarCampos() {
        if (!form.nome.trim()) return "Nome do funcionário não preenchido.";
        if (!form.admissao) return "Admissão do funcionário não preenchida.";
        if (!form.semestre.trim()) return "Trimestre/Semestre não preenchido.";
        if (!form.periodo.trim()) return "Período cursado não preenchido.";
        if (!form.universidade.trim()) return "Faculdade/Universidade não preenchida.";
        return "";
    }

    const formularioValido = useMemo(() => {
        if (!form.nome.trim()) return false;

        if (!form.admissao) return false;

        if (!form.curso.trim()) return false;

        if (!form.semestre.trim()) return false;

        if (!form.periodo.trim()) return false;

        if (!form.universidade.trim()) return false;

        if (!form.cidade.trim()) return false;

        return true;
    }, [form]);

    async function handleGerarPdf() {
        const mensagemErro = validarCampos();

        if (mensagemErro) {
            setErro(mensagemErro);
            setInfo("");
            return;
        }

        try {
            setErro("");
            setGerando(true);

            gerarSolicitacaoBolsaPdf({
                nome: form.nome,
                admissao: form.admissao,
                curso: form.curso,
                semestre: form.semestre,
                periodo: form.periodo,
                universidade: form.universidade,
                cidade: form.cidade,
                nomeGestor,
                dataHoje,
            });
        } catch (error) {
            console.error("Erro ao gerar PDF da solicitação:", error);
            setErro("Não foi possível gerar a solicitação para impressão.");
        } finally {
            setGerando(false);
        }
    }

    const labelClass = "mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600";
    const inputClass =
        "h-10 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[#00AE9D] focus:ring-2 focus:ring-[#00AE9D]/20";
    const selectClass = `${inputClass} cursor-pointer`;

    return (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-5">
                <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#00AE9D]" />
                    <h2 className="text-base font-bold text-slate-950">Dados da solicitação</h2>
                </div>
                <p className="mt-1 text-sm text-slate-600">
                    Preencha os dados abaixo e gere a impressão da primeira solicitação de bolsa.
                </p>
            </div>

            <div className="space-y-5 p-5">
            {erro && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {erro}
                </div>
            )}

            {info && !erro && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                    {info}
                </div>
            )}

            {loading ? (
                <div className="py-10 text-center text-sm text-slate-500">
                    Carregando dados da solicitação...
                </div>
            ) : (
                <>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center">
                        <p className="text-sm font-medium text-slate-700">
                            Preencha os dados abaixo e clique em gerar para imprimir a solicitação.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
                        <div className="md:col-span-9">
                            <label className={labelClass}>
                                Nome do funcionário
                            </label>
                            <input
                                type="text"
                                name="nome"
                                value={form.nome}
                                onChange={handleChange}
                                className={inputClass}
                            />
                        </div>

                        <div className="md:col-span-3">
                            <label className={labelClass}>
                                Admissão
                            </label>
                            <input
                                type="date"
                                name="admissao"
                                value={form.admissao}
                                onChange={handleChange}
                                className={inputClass}
                            />
                        </div>

                        <div className="md:col-span-6">
                            <label className={labelClass}>
                                Curso
                            </label>
                            <input
                                type="text"
                                name="curso"
                                value={form.curso}
                                onChange={handleChange}
                                className={inputClass}
                            />
                        </div>

                        <div className="md:col-span-3">
                            <label className={labelClass}>
                                Trimestre/Semestre
                            </label>
                            <input
                                type="text"
                                name="semestre"
                                value={form.semestre}
                                onChange={handleChange}
                                placeholder="Ex.: 1º semestre"
                                className={inputClass}
                            />
                        </div>

                        <div className="md:col-span-3">
                            <label className={labelClass}>
                                Período
                            </label>
                            <input
                                type="text"
                                name="periodo"
                                value={form.periodo}
                                onChange={handleChange}
                                placeholder="Ex.: 3º período"
                                className={inputClass}
                            />
                        </div>

                        <div className="md:col-span-6">
                            <label className={labelClass}>
                                Faculdade/Universidade
                            </label>
                            <input
                                type="text"
                                name="universidade"
                                value={form.universidade}
                                onChange={handleChange}
                                className={inputClass}
                            />
                        </div>

                        <div className="md:col-span-6">
                            <label className={labelClass}>
                                Cidade
                            </label>
                            <select
                                name="cidade"
                                value={form.cidade}
                                onChange={handleChange}
                                className={selectClass}
                            >
                                <option value="">Selecione</option>
                                {cidades.map((cidade) => (
                                    <option key={cidade} value={cidade}>
                                        {cidade}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="border-t border-slate-200 pt-5">
                        <div className="flex items-center justify-end">
                            <button
                                type="button"
                                onClick={handleGerarPdf}
                                disabled={!formularioValido || gerando}
                                className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold text-white shadow-sm transition
        ${formularioValido && !gerando
                                        ? "cursor-pointer bg-[#00AE9D] hover:bg-[#49479D] hover:shadow-md"
                                        : "cursor-not-allowed bg-slate-300"
                                    }`}
                            >
                                <FaPrint />
                                {gerando ? "Gerando..." : "Gerar PDF"}
                            </button>
                        </div>
                    </div>
                </>
            )}
            </div>
        </div>
    );
}
