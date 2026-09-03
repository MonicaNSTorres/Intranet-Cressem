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
import { VALORES_INTEGRALIZACAO, valorIntegralizacaoComMoeda } from "@/config/integralizacao";

type FormState = {
    cpf: string;
    nome: string;
    integralizacao: string;
    taxa: string;
    cidade: string;
};

const TAXA_MANUTENCAO = "R$ 12,70";

const initialState: FormState = {
    cpf: "",
    nome: "",
    integralizacao: "",
    taxa: TAXA_MANUTENCAO,
    cidade: "",
};

const fieldClass =
    "h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/15";
const readOnlyFieldClass = `${fieldClass} border-emerald-200 bg-emerald-50 font-semibold text-emerald-800`;
const labelClass = "mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500";

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

    const formularioValido = useMemo(() => {
        const cpfValido = cpfLimpo.length === 11;

        if (!cpfValido) return false;
        if (!form.nome.trim()) return false;
        if (!form.integralizacao.trim()) return false;
        if (!form.taxa.trim()) return false;
        if (!form.cidade.trim()) return false;

        const valorIntegralizacao = moedaParaNumero(form.integralizacao);
        const valorTaxa = moedaParaNumero(form.taxa);

        if (valorIntegralizacao <= 0) return false;
        if (valorTaxa < 0) return false;

        return true;
    }, [
        cpfLimpo,
        form.nome,
        form.integralizacao,
        form.taxa,
        form.cidade,
    ]);

    async function handleGerarPdf() {
        if (!validarCampos()) return;

        setErro("");
        setInfo("");

        await pdfGerarAntecipacaoCapital({
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
        <div className="mx-auto overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm">
            <div className="h-1 bg-gradient-to-r from-primary via-secondary to-third" />
            <div className="space-y-6 p-5 md:p-6">
            <SearchForm onSearch={preencherAssociado} className="space-y-5">
                <div className="space-y-3">
                    {erro && (
                        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
                            {erro}
                        </div>
                    )}

                    {info && !erro && (
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800">
                            {info}
                        </div>
                    )}

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-center">
                        <p className="text-sm font-medium text-slate-600">
                            Informe o CPF do associado, preencha os valores e gere o PDF da solicitação.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-12 md:p-5">
                    <div className="md:col-span-3">
                        <label className={labelClass}>
                            CPF
                        </label>
                        <SearchInput
                            value={form.cpf}
                            onChange={(e) => updateField("cpf", formatarCpf(e.target.value))}
                            onBlur={preencherAssociado}
                            placeholder="000.000.000-00"
                            maxLength={14}
                            className={fieldClass}
                        />
                    </div>

                    <div className="flex items-end gap-3 md:col-span-9">
                        <div className="flex-1">
                            <label className={labelClass}>
                                Nome
                            </label>
                            <input
                                value={loadingBusca ? "Buscando associado..." : form.nome}
                                onChange={(e) => updateField("nome", e.target.value)}
                                placeholder="Nome do associado"
                                className={fieldClass}
                            />
                        </div>

                        <SearchButton loading={loadingBusca} label="Pesquisar" />
                    </div>


                    <div className="md:col-span-4">
                        <label className={labelClass}>
                            Integralização
                        </label>
                        <select
                            value={form.integralizacao}
                            onChange={(e) => updateField("integralizacao", e.target.value)}
                            className={fieldClass}
                        >
                            <option value="">Selecione</option>
                            {VALORES_INTEGRALIZACAO.map(({ nivel, valor }) => {
                                const valorFormatado = valorIntegralizacaoComMoeda(valor);

                                return (
                                    <option key={nivel} value={valorFormatado}>
                                        Nível {nivel} - {valorFormatado}
                                    </option>
                                );
                            })}
                        </select>
                    </div>

                    <div className="md:col-span-4">
                        <label className={labelClass}>
                            Taxa manutenção
                        </label>
                        <input
                            value={TAXA_MANUTENCAO}
                            readOnly
                            className={readOnlyFieldClass}
                        />
                    </div>

                    <div className="md:col-span-4">
                        <label className={labelClass}>
                            Total
                        </label>
                        <input
                            value={formatarMoeda(total)}
                            readOnly
                            className={readOnlyFieldClass}
                        />
                    </div>

                    <div className="md:col-span-5">
                        <label className={labelClass}>
                            Cidade
                        </label>
                        <select
                            value={form.cidade}
                            onChange={(e) => updateField("cidade", e.target.value)}
                            disabled={loadingCidades}
                            className={`${fieldClass} disabled:bg-slate-100`}
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

                <div className="border-t border-slate-200 pt-5">
                    <div className="flex items-center justify-end">
                        <button
                            type="button"
                            onClick={handleGerarPdf}
                            disabled={!formularioValido}
                            className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl px-6 text-sm font-semibold text-white shadow-sm transition
        ${formularioValido
                                    ? "cursor-pointer bg-secondary hover:bg-primary"
                                    : "cursor-not-allowed bg-slate-300"
                                }`}
                        >
                            <FaFilePdf />
                            Gerar PDF
                        </button>
                    </div>
                </div>
            </SearchForm>
            </div>
        </div>
    );
}