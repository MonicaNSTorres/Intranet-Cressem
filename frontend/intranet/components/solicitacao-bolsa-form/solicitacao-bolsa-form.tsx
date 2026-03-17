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

            setForm((prev) => ({
                ...prev,
                nome: funcionario?.NM_FUNCIONARIO || nomeUsuarioLogado,
                admissao: formatarDataInput(funcionario?.DT_ADMISSAO),
            }));

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

    return (
        <div className="mx-auto min-w-0 rounded-xl bg-white p-6 shadow">
            {erro && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {erro}
                </div>
            )}

            {info && !erro && (
                <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                    {info}
                </div>
            )}

            {loading ? (
                <div className="py-10 text-center text-sm text-gray-500">
                    Carregando dados da solicitação...
                </div>
            ) : (
                <>
                    <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-center">
                        <p className="text-sm font-medium text-gray-700">
                            Preencha os dados abaixo e clique em gerar para imprimir a solicitação.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
                        <div className="md:col-span-9">
                            <label className="mb-1 block text-xs font-medium text-gray-600">
                                Nome do funcionário
                            </label>
                            <input
                                type="text"
                                name="nome"
                                value={form.nome}
                                onChange={handleChange}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                            />
                        </div>

                        <div className="md:col-span-3">
                            <label className="mb-1 block text-xs font-medium text-gray-600">
                                Admissão
                            </label>
                            <input
                                type="date"
                                name="admissao"
                                value={form.admissao}
                                onChange={handleChange}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                            />
                        </div>

                        <div className="md:col-span-6">
                            <label className="mb-1 block text-xs font-medium text-gray-600">
                                Curso
                            </label>
                            <input
                                type="text"
                                name="curso"
                                value={form.curso}
                                onChange={handleChange}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                            />
                        </div>

                        <div className="md:col-span-3">
                            <label className="mb-1 block text-xs font-medium text-gray-600">
                                Trimestre/Semestre
                            </label>
                            <input
                                type="text"
                                name="semestre"
                                value={form.semestre}
                                onChange={handleChange}
                                placeholder="Ex.: 1º semestre"
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                            />
                        </div>

                        <div className="md:col-span-3">
                            <label className="mb-1 block text-xs font-medium text-gray-600">
                                Período
                            </label>
                            <input
                                type="text"
                                name="periodo"
                                value={form.periodo}
                                onChange={handleChange}
                                placeholder="Ex.: 3º período"
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                            />
                        </div>

                        <div className="md:col-span-6">
                            <label className="mb-1 block text-xs font-medium text-gray-600">
                                Faculdade/Universidade
                            </label>
                            <input
                                type="text"
                                name="universidade"
                                value={form.universidade}
                                onChange={handleChange}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                            />
                        </div>

                        <div className="md:col-span-6">
                            <label className="mb-1 block text-xs font-medium text-gray-600">
                                Cidade
                            </label>
                            <select
                                name="cidade"
                                value={form.cidade}
                                onChange={handleChange}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
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

                    <div className="mt-6 border-t border-gray-200 pt-5">
                        <div className="flex items-center justify-end">
                            <button
                                type="button"
                                onClick={handleGerarPdf}
                                disabled={gerando}
                                className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-secondary px-6 py-2 font-semibold text-white shadow transition hover:bg-primary disabled:cursor-not-allowed disabled:opacity-70"
                            >
                                <FaPrint />
                                {gerando ? "Gerando..." : "Gerar PDF"}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}