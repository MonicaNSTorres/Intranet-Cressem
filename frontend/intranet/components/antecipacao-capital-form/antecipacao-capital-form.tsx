"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import { FaFilePdf, FaSearch } from "react-icons/fa";
import {
    buscarAssociadoAntecipacaoPorCpf,
    buscarCidadesAntecipacao,
    type CidadeOption,
} from "@/services/antecipacao_capital.service";
import { pdfGerarAntecipacaoCapital } from "@/lib/pdf/gerarPdfAntecipacaoCapital";
import { SearchForm } from "@/components/ui/search-form";
import { SearchInput } from "@/components/ui/search-input";
import { SearchButton } from "@/components/ui/search-button";

type FormState = {
    cpf: string;
    nome: string;
    integralizacao: string;
    taxa: string;
    cidade: string;
};

const initialState: FormState = {
    cpf: "",
    nome: "",
    integralizacao: "",
    taxa: "",
    cidade: "",
};

function somenteNumeros(valor: string) {
    return (valor || "").replace(/\D/g, "");
}

function formatarCpf(valor: string) {
    const cleaned = somenteNumeros(valor).slice(0, 11);

    return cleaned
        .replace(/^(\d{3})(\d)/, "$1.$2")
        .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
        .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

function formatarMoedaInput(valor: string) {
    const cleaned = somenteNumeros(valor);

    if (!cleaned) return "";

    const numero = Number(cleaned) / 100;

    return numero.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
        minimumFractionDigits: 2,
    });
}

function moedaParaNumero(valor: string) {
    if (!valor) return 0;

    const normalizado = valor
        .replace(/[R$\s]/g, "")
        .replace(/\./g, "")
        .replace(",", ".");

    const numero = Number(normalizado);

    return Number.isNaN(numero) ? 0 : numero;
}

function formatarMoeda(valor: number) {
    return valor.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
        minimumFractionDigits: 2,
    });
}

export function AntecipacaoCapitalForm() {
    const [form, setForm] = useState<FormState>(initialState);
    const [loadingBusca, setLoadingBusca] = useState(false);
    const [erro, setErro] = useState("");
    const [info, setInfo] = useState("");

    //const cidades = useMemo(() => buscarCidadesAntecipacao(), []);
    const cpfLimpo = useMemo(() => somenteNumeros(form.cpf), [form.cpf]);

    const [cidades, setCidades] = useState<CidadeOption[]>([]);
    const [loadingCidades, setLoadingCidades] = useState(false);

    const total = useMemo(() => {
        const valorIntegralizacao = moedaParaNumero(form.integralizacao);
        const valorTaxa = moedaParaNumero(form.taxa);
        return valorIntegralizacao + valorTaxa;
    }, [form.integralizacao, form.taxa]);

    function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
        setForm((prev) => ({
            ...prev,
            [field]: value,
        }));
    }

    function validarCpf() {
        if (!form.cpf.trim()) {
            setErro("CPF do associado não preenchido.");
            setInfo("");
            return false;
        }

        if (cpfLimpo.length !== 11) {
            setErro("CPF inválido. Informe os 11 dígitos.");
            setInfo("");
            return false;
        }

        return true;
    }

    function validarCampos() {
        if (!form.cpf.trim()) {
            setErro("CPF do associado não preenchido.");
            setInfo("");
            return false;
        }

        if (!form.nome.trim()) {
            setErro("Nome do associado não preenchido.");
            setInfo("");
            return false;
        }

        if (!form.integralizacao.trim()) {
            setErro("Integralização não preenchida.");
            setInfo("");
            return false;
        }

        if (!form.taxa.trim()) {
            setErro("Taxa de manutenção não preenchida.");
            setInfo("");
            return false;
        }

        if (!form.cidade.trim()) {
            setErro("Cidade de atendimento não selecionada.");
            setInfo("");
            return false;
        }

        return true;
    }

    async function preencherAssociado() {
        if (!validarCpf()) return;

        try {
            setLoadingBusca(true);
            setErro("");
            setInfo("");

            const associado = await buscarAssociadoAntecipacaoPorCpf(form.cpf);

            if (!associado?.NOME) {
                updateField("nome", "");
                setErro("Associado não encontrado para o CPF informado.");
                return;
            }

            updateField("nome", associado.NOME || "");
            setInfo("Dados do associado preenchidos com sucesso.");
        } catch (error: any) {
            updateField("nome", "");
            setErro(
                error?.response?.data?.error ||
                "Não foi possível buscar os dados do associado."
            );
        } finally {
            setLoadingBusca(false);
        }
    }

    function handleGerarPdf() {
        if (!validarCampos()) return;

        setErro("");
        setInfo("");

        pdfGerarAntecipacaoCapital({
            cpf: form.cpf,
            nome: form.nome,
            integralizacao: form.integralizacao,
            taxa: form.taxa,
            cidade: form.cidade,
            total: formatarMoeda(total),
        });
    }

    useEffect(() => {
        async function carregarCidades() {
            try {
                setLoadingCidades(true);
                const data = await buscarCidadesAntecipacao();
                setCidades(data || []);
            } catch (error) {
                console.error("Erro ao carregar cidades:", error);
                setCidades([]);
            } finally {
                setLoadingCidades(false);
            }
        }

        carregarCidades();
    }, []);

    return (
        <div className="mx-auto min-w-0 rounded-xl bg-white p-6 shadow">
            <SearchForm onSearch={preencherAssociado}>
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

                <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-center">
                    <p className="text-sm font-medium text-gray-700">
                        Informe o CPF do associado, preencha os valores e gere o PDF da solicitação.
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
                    <div className="md:col-span-3">
                        <label className="mb-1 block text-xs font-medium text-gray-600">
                            CPF
                        </label>
                        <SearchInput
                            value={form.cpf}
                            onChange={(e) => updateField("cpf", formatarCpf(e.target.value))}
                            onBlur={preencherAssociado}
                            placeholder="000.000.000-00"
                            maxLength={14}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                        />
                    </div>

                    <div className="md:col-span-9 flex items-end gap-3">
                        <div className="flex-1">
                            <label className="mb-1 block text-xs font-medium text-gray-600">
                                Nome
                            </label>
                            <input
                                value={loadingBusca ? "Buscando associado..." : form.nome}
                                onChange={(e) => updateField("nome", e.target.value)}
                                placeholder="Nome do associado"
                                className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                            />
                        </div>

                        <SearchButton loading={loadingBusca} label="Pesquisar" />
                    </div>


                    <div className="md:col-span-4">
                        <label className="mb-1 block text-xs font-medium text-gray-600">
                            Integralização
                        </label>
                        <input
                            value={form.integralizacao}
                            onChange={(e) =>
                                updateField("integralizacao", formatarMoedaInput(e.target.value))
                            }
                            placeholder="R$ 0,00"
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                        />
                    </div>

                    <div className="md:col-span-4">
                        <label className="mb-1 block text-xs font-medium text-gray-600">
                            Taxa manutenção
                        </label>
                        <input
                            value={form.taxa}
                            onChange={(e) => updateField("taxa", formatarMoedaInput(e.target.value))}
                            placeholder="R$ 0,00"
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                        />
                    </div>

                    <div className="md:col-span-4">
                        <label className="mb-1 block text-xs font-medium text-gray-600">
                            Total
                        </label>
                        <input
                            value={formatarMoeda(total)}
                            readOnly
                            className="w-full rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 outline-none"
                        />
                    </div>

                    <div className="md:col-span-5">
                        <label className="mb-1 block text-xs font-medium text-gray-600">
                            Cidade
                        </label>
                        <select
                            value={form.cidade}
                            onChange={(e) => updateField("cidade", e.target.value)}
                            disabled={loadingCidades}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 disabled:bg-gray-100"
                        >
                            <option value="">
                                {loadingCidades ? "Carregando cidades..." : "Selecione"}
                            </option>
                            {cidades.map((cidade) => (
                                <option key={cidade.value} value={cidade.value}>
                                    {cidade.label}
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
                            className="inline-flex items-center gap-2 rounded-lg bg-secondary px-6 py-2 font-semibold text-white shadow transition hover:bg-primary"
                        >
                            <FaFilePdf />
                            Gerar PDF
                        </button>
                    </div>
                </div>
            </SearchForm>
        </div>
    );
}