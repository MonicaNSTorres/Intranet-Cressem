"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useMemo, useState } from "react";
import { FaPrint, FaSave, FaSearch } from "react-icons/fa";
import { useAssociadoPorCpf } from "@/hooks/useAssociadoPorCpf";
import { salvarAnaliseLimite } from "@/services/analise_limite.service";
import {
    formatCpfView,
    monetizarDigitacao,
    parseBRL,
    fmtBRL,
} from "@/utils/br";
import { gerarPdfAnaliseLimite } from "@/lib/pdf/gerarPdfAnaliseLimite";
import { SearchForm } from "@/components/ui/search-form";
import { SearchInput } from "@/components/ui/search-input";
import { SearchButton } from "@/components/ui/search-button";

function todayISO() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

function formatDateBR(dateISO?: string | null) {
    if (!dateISO) return "";
    const [y, m, d] = String(dateISO).split("-");
    if (!y || !m || !d) return "";
    return `${d}/${m}/${y}`;
}

function onlyDigits(value: string) {
    return String(value || "").replace(/\D/g, "");
}

function isCnpj(value: string) {
    return onlyDigits(value).length === 14;
}

function isValidCpf(cpf: string) {
    const value = onlyDigits(cpf);
    if (value.length !== 11 || /^(\d)\1+$/.test(value)) return false;

    let sum = 0;
    for (let i = 0; i < 9; i++) sum += Number(value[i]) * (10 - i);
    let rest = (sum * 10) % 11;
    if (rest === 10) rest = 0;
    if (rest !== Number(value[9])) return false;

    sum = 0;
    for (let i = 0; i < 10; i++) sum += Number(value[i]) * (11 - i);
    rest = (sum * 10) % 11;
    if (rest === 10) rest = 0;
    return rest === Number(value[10]);
}

function isValidCnpj(cnpj: string) {
    const value = onlyDigits(cnpj);
    if (value.length !== 14 || /^(\d)\1+$/.test(value)) return false;

    const calc = (base: string, factors: number[]) => {
        const total = base
            .split("")
            .reduce((acc, n, i) => acc + Number(n) * factors[i], 0);
        const rest = total % 11;
        return rest < 2 ? 0 : 11 - rest;
    };

    const base = value.slice(0, 12);
    const d1 = calc(base, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
    const d2 = calc(base + d1, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);

    return value === `${base}${d1}${d2}`;
}

function validaCpfCnpj(value: string) {
    const digits = onlyDigits(value);
    if (digits.length === 11) return isValidCpf(digits);
    if (digits.length === 14) return isValidCnpj(digits);
    return false;
}

function phoneMask(value: string) {
    const digits = onlyDigits(value).slice(0, 11);
    if (!digits) return "";
    if (digits.length <= 2) return `(${digits}`;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

function yesNoText(value: string) {
    if (value === "1") return "Sim";
    if (value === "0") return "Não";
    return "";
}

const inputBase =
    "h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100";

const textareaBase =
    "w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100";

function Field({
    label,
    children,
    hint,
}: {
    label: string;
    children: React.ReactNode;
    hint?: string;
}) {
    return (
        <div className="space-y-1.5">
            <label className="block text-[12px] font-semibold uppercase tracking-[0.03em] text-slate-600">
                {label}
            </label>
            {children}
            {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
        </div>
    );
}

function Section({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-emerald-200 bg-gradient-to-r from-[#79B729] to-[#8ED12F] px-5 py-3">
                <h3 className="text-sm font-bold text-white">{title}</h3>
            </div>
            <div className="p-5">{children}</div>
        </section>
    );
}

function RadioGroup({
    name,
    value,
    onChange,
}: {
    name: string;
    value: string;
    onChange: (value: string) => void;
}) {
    return (
        <div className="flex h-11 items-center gap-6 rounded-xl border border-slate-300 bg-white px-4 shadow-sm">
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                <input
                    type="radio"
                    name={name}
                    checked={value === "1"}
                    onChange={() => onChange("1")}
                    className="h-4 w-4 accent-emerald-600"
                />
                Sim
            </label>

            <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                <input
                    type="radio"
                    name={name}
                    checked={value === "0"}
                    onChange={() => onChange("0")}
                    className="h-4 w-4 accent-emerald-600"
                />
                Não
            </label>
        </div>
    );
}

export function AnaliseLimiteForm() {
    const [cpf, setCpf] = useState("");
    const [nome, setNome] = useState("");
    const [celular, setCelular] = useState("");
    const [empresa, setEmpresa] = useState("");

    const [contaCorrente, setContaCorrente] = useState("");
    const [salarioBruto, setSalarioBruto] = useState("");
    const [salarioLiquido, setSalarioLiquido] = useState("");
    const [portabilidade, setPortabilidade] = useState("");
    const [efetivo, setEfetivo] = useState("");
    const [cessaoCredito, setCessaoCredito] = useState("");
    const [dataPagamento, setDataPagamento] = useState("");
    const [carteira, setCarteira] = useState("");
    const [iap, setIap] = useState("");

    const [ocorrenciaCRM, setOcorrenciaCRM] = useState("");
    const [obsCRM, setObsCRM] = useState("");

    const [risco, setRisco] = useState("");
    const [pd, setPd] = useState("");
    const [crl, setCrl] = useState("");
    const [capital, setCapital] = useState("");
    const [divida, setDivida] = useState("");
    const [restricoes, setRestricoes] = useState("");
    const [quaisRestricoes, setQuaisRestricoes] = useState("");

    const [sugestaoLimite, setSugestaoLimite] = useState("");
    const [cartao, setCartao] = useState("");
    const [cartaoAtual, setCartaoAtual] = useState("");
    const [cartaoAprovado, setCartaoAprovado] = useState("");
    const [especial, setEspecial] = useState("");
    const [especialAtual, setEspecialAtual] = useState("");
    const [especialAprovado, setEspecialAprovado] = useState("");

    const [dataEnvio] = useState(todayISO());

    const [erro, setErro] = useState("");
    const [info, setInfo] = useState("");
    const [loadingSalvar, setLoadingSalvar] = useState(false);
    const [salvo, setSalvo] = useState(false);

    const tipoFormulario = useMemo(() => (isCnpj(cpf) ? "PJ" : "PF"), [cpf]);

    const { loading, erro: erroBusca, info: infoBusca, buscar } = useAssociadoPorCpf();

    async function onBuscar() {
        try {
            setErro("");
            setInfo("");

            const digits = onlyDigits(cpf);

            if (!digits) {
                setErro("Informe o CPF/CNPJ.");
                return;
            }

            if (!validaCpfCnpj(digits)) {
                setErro("Informe um CPF/CNPJ válido.");
                return;
            }

            const r = await buscar(cpf);

            if (r.found) {
                const associado = r.data as any;

                setNome(associado.nome || associado.NM_CLIENTE || "");
                setEmpresa(associado.empresa || associado.NM_EMPRESA || "");
                setCelular(
                    phoneMask(associado.telefone || associado.NR_TELEFONE || "")
                );

                if (associado.NR_MESES_PORTABILIDADE !== undefined) {
                    setPortabilidade(Number(associado.NR_MESES_PORTABILIDADE) > 0 ? "1" : "0");
                }

                if (associado.NR_IAP !== undefined && associado.NR_IAP !== null) {
                    setIap(String(associado.NR_IAP));
                }

                if (associado.SL_CONTA_CAPITAL !== undefined && associado.SL_CONTA_CAPITAL !== null) {
                    setCapital(fmtBRL(Number(associado.SL_CONTA_CAPITAL || 0)));
                }

                if (associado.SL_DEVEDOR_DIA !== undefined && associado.SL_DEVEDOR_DIA !== null) {
                    setDivida(fmtBRL(Number(associado.SL_DEVEDOR_DIA || 0)));
                } else {
                    setDivida(fmtBRL(0));
                }

                if (associado.NR_CARTAO) {
                    setCartao("0");
                    setCartaoAtual(fmtBRL(Number(associado.NR_LIMITE_CARTAO || 0)));
                } else {
                    setCartao("0");
                    setCartaoAtual(fmtBRL(0));
                }

                if (associado.SL_LIMITE_CHEQUE !== undefined && associado.SL_LIMITE_CHEQUE !== null) {
                    setEspecial("0");
                    setEspecialAtual(fmtBRL(Number(associado.SL_LIMITE_CHEQUE || 0)));
                } else {
                    setEspecial("0");
                    setEspecialAtual(fmtBRL(0));
                }

                setInfo("Associado carregado com sucesso.");
            }
        } catch (e) {
            console.error(e);
            setErro("Falha ao buscar associado.");
        }
    }

    function limparFormulario() {
        setCpf("");
        setNome("");
        setCelular("");
        setEmpresa("");

        setContaCorrente("");
        setSalarioBruto("");
        setSalarioLiquido("");
        setPortabilidade("");
        setEfetivo("");
        setCessaoCredito("");
        setDataPagamento("");
        setCarteira("");
        setIap("");

        setOcorrenciaCRM("");
        setObsCRM("");

        setRisco("");
        setPd("");
        setCrl("");
        setCapital("");
        setDivida("");
        setRestricoes("");
        setQuaisRestricoes("");

        setSugestaoLimite("");
        setCartao("");
        setCartaoAtual("");
        setCartaoAprovado("");
        setEspecial("");
        setEspecialAtual("");
        setEspecialAprovado("");

        setErro("");
        setInfo("");
        setSalvo(false);
    }

    function validaCamposPF() {
        if (!cpf) return "Preencha o campo de CPF/CNPJ.";
        if (!nome) return "Nome não preenchido.";
        if (!celular) return "Número de celular não preenchido.";
        if (!empresa) return "Empresa não preenchida.";
        if (!contaCorrente) return "Conta Corrente não preenchida.";
        if (!salarioBruto) return "Salário Bruto não preenchido.";
        if (!salarioLiquido) return "Salário Líquido não preenchido.";
        if (portabilidade === "") return "Portabilidade não selecionada.";
        if (efetivo === "") return "Funcionário efetivo não selecionado.";
        if (cessaoCredito === "") return "Cessão de crédito não selecionada.";
        if (cessaoCredito === "1" && !dataPagamento) return "Data de pagamento não preenchida.";
        if (!carteira) return "Nível da carteira não selecionado.";
        if (iap === "") return "Números de IAP não selecionado.";
        if (ocorrenciaCRM === "") return "Ocorrência no CRM não preenchida.";
        if (ocorrenciaCRM === "1" && !obsCRM.trim()) return "Detalhes da ocorrência não preenchidos.";
        if (!risco) return "Risco não preenchido.";
        if (!pd) return "PD não preenchido.";
        if (!crl) return "CRL não preenchido.";
        if (!capital) return "Capital não preenchido.";
        if (!divida) return "Dívida não preenchida.";
        if (restricoes === "") return "Restrições não selecionado.";
        if (restricoes === "1" && !quaisRestricoes.trim()) return "Detalhes das restrições não preenchidos.";
        if (!cartaoAtual) return "Limite do cartão atual não preenchido.";
        if (!especialAtual) return "Limite do cheque especial atual não preenchido.";
        return "";
    }

    function validaCamposPJ() {
        if (!cpf) return "Preencha o campo de CPF/CNPJ.";
        if (!nome) return "Nome não preenchido.";
        if (!celular) return "Número de celular não preenchido.";
        if (!contaCorrente) return "Conta Corrente não preenchida.";
        if (!salarioBruto) return "Faturamento mensal não preenchido.";
        if (!salarioLiquido) return "Faturamento anual não preenchido.";
        if (cessaoCredito === "") return "Cessão de crédito não selecionada.";
        if (cessaoCredito === "1" && !dataPagamento) return "Data de pagamento não preenchida.";
        if (!carteira) return "Nível da carteira não selecionado.";
        if (iap === "") return "Números de IAP não selecionado.";
        if (ocorrenciaCRM === "") return "Ocorrência no CRM não preenchida.";
        if (ocorrenciaCRM === "1" && !obsCRM.trim()) return "Detalhes da ocorrência não preenchidos.";
        if (!risco) return "Risco não preenchido.";
        if (!pd) return "PD não preenchido.";
        if (!crl) return "CRL não preenchido.";
        if (!capital) return "Capital não preenchido.";
        if (!divida) return "Dívida não preenchida.";
        if (restricoes === "") return "Restrições não selecionado.";
        if (restricoes === "1" && !quaisRestricoes.trim()) return "Detalhes das restrições não preenchidos.";
        if (!cartaoAtual) return "Limite do cartão atual não preenchido.";
        if (!especialAtual) return "Limite do cheque especial atual não preenchido.";
        return "";
    }

    function buildPayload() {
        const base = {
            NR_CPF_CNPJ_ASSOCIADO: onlyDigits(cpf),
            NM_ASSOCIADO: nome,
            NR_CELULAR: onlyDigits(celular),
            NR_CONTA_CORRENTE: contaCorrente,
            CESSAO_CREDITO: Number(cessaoCredito || 0),
            DT_PAGAMENTO: dataPagamento || null,
            NV_CARTEIRA: carteira,
            NR_IAP: Number(iap || 0),
            OCORRENCIA_CRM: Number(ocorrenciaCRM || 0),
            OBS_CRM: obsCRM || null,
            RISCO: risco,
            PD: pd,
            NR_CRL: parseBRL(crl),
            CAPITAL: parseBRL(capital),
            DIVIDA: parseBRL(divida),
            RESTRICAO: Number(restricoes || 0),
            DESC_RESTRICAO: quaisRestricoes || null,
            SG_LIMITE: parseBRL(sugestaoLimite || "0"),
            CARTAO: Number(cartao || 0),
            LT_ATUAL_CARTAO: parseBRL(cartaoAtual || "0"),
            LT_APROVADO_CARTAO: parseBRL(cartaoAprovado || "0"),
            CHEQUE_ESPECIAL: Number(especial || 0),
            LT_ATUAL_CH: parseBRL(especialAtual || "0"),
            LT_APROVADO_CH: parseBRL(especialAprovado || "0"),
            DT: dataEnvio,
            NM_FUNCIONARIO: "INTRANET",
        };

        if (tipoFormulario === "PJ") {
            return {
                ...base,
                NM_EMPRESA: null,
                VL_FATURAMENTO_MENSAL: parseBRL(salarioBruto),
                VL_FATURAMENTO_ANUAL: parseBRL(salarioLiquido),
            };
        }

        return {
            ...base,
            NM_EMPRESA: empresa,
            SL_BRUTO: parseBRL(salarioBruto),
            SL_LIQUIDO: parseBRL(salarioLiquido),
            PORTABILIDADE: Number(portabilidade || 0),
            FUNCIONARIO_EFETIVO: Number(efetivo || 0),
        };
    }

    async function salvar() {
        try {
            setErro("");
            setInfo("");

            const msg = tipoFormulario === "PF" ? validaCamposPF() : validaCamposPJ();
            if (msg) {
                setErro(msg);
                return;
            }

            setLoadingSalvar(true);

            await salvarAnaliseLimite(buildPayload());

            setInfo("Análise cadastrada com sucesso.");
            setSalvo(true);
        } catch (err: any) {
            console.error(err);
            setErro(err?.message || "Não foi possível salvar a análise.");
        } finally {
            setLoadingSalvar(false);
        }
    }

    async function salvarEImprimir() {
        try {
            setErro("");
            setInfo("");

            const msg = tipoFormulario === "PF" ? validaCamposPF() : validaCamposPJ();
            if (msg) {
                setErro(msg);
                return;
            }

            if (!salvo) {
                await salvar();
                return;
            }

            await gerarPdfAnaliseLimite({
                tipoFormulario,
                cpf: formatCpfView(cpf),
                nome: nome || "",
                celular: celular || "",
                empresa: empresa || "",

                contaCorrente: contaCorrente || "",
                salarioBruto: parseBRL(salarioBruto || "0"),
                salarioLiquido: parseBRL(salarioLiquido || "0"),
                portabilidade,
                efetivo,
                cessaoCredito,
                dataPagamento,

                carteira,
                iap,

                ocorrenciaCRM,
                obsCRM,

                risco,
                pd,
                crl: parseBRL(crl || "0"),
                capital: parseBRL(capital || "0"),
                divida: parseBRL(divida || "0"),
                restricoes,
                quaisRestricoes,

                sugestaoLimite: parseBRL(sugestaoLimite || "0"),
                cartao,
                cartaoAtual: parseBRL(cartaoAtual || "0"),
                cartaoAprovado: parseBRL(cartaoAprovado || "0"),
                especial,
                especialAtual: parseBRL(especialAtual || "0"),
                especialAprovado: parseBRL(especialAprovado || "0"),

                dataEnvio,
            });
        } catch (err: any) {
            console.error(err);
            setErro(err?.message || "Não foi possível gerar o PDF.");
        }
    }

    async function imprimirDireto() {
        try {
            setErro("");
            setInfo("");

            const msg = tipoFormulario === "PF" ? validaCamposPF() : validaCamposPJ();
            if (msg) {
                setErro(msg);
                return;
            }

            await gerarPdfAnaliseLimite({
                tipoFormulario,
                cpf: formatCpfView(cpf),
                nome: nome || "",
                celular: celular || "",
                empresa: empresa || "",

                contaCorrente: contaCorrente || "",
                salarioBruto: parseBRL(salarioBruto || "0"),
                salarioLiquido: parseBRL(salarioLiquido || "0"),
                portabilidade,
                efetivo,
                cessaoCredito,
                dataPagamento,

                carteira,
                iap,

                ocorrenciaCRM,
                obsCRM,

                risco,
                pd,
                crl: parseBRL(crl || "0"),
                capital: parseBRL(capital || "0"),
                divida: parseBRL(divida || "0"),
                restricoes,
                quaisRestricoes,

                sugestaoLimite: parseBRL(sugestaoLimite || "0"),
                cartao,
                cartaoAtual: parseBRL(cartaoAtual || "0"),
                cartaoAprovado: parseBRL(cartaoAprovado || "0"),
                especial,
                especialAtual: parseBRL(especialAtual || "0"),
                especialAprovado: parseBRL(especialAprovado || "0"),

                dataEnvio,
            });
        } catch (err: any) {
            console.error(err);
            setErro(err?.message || "Não foi possível gerar o PDF.");
        }
    }

    return (
        <>
            <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }

          #print-area,
          #print-area * {
            visibility: visible;
          }

          #print-area {
            position: absolute;
            inset: 0;
            background: white;
            padding: 24px;
          }
        }
      `}</style>

            <div className="min-w-225 mx-auto w-full space-y-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <SearchForm onSearch={onBuscar}>
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <h1 className="text-2xl font-bold text-slate-800">
                                    Análise de Limite
                                </h1>
                                <p className="text-sm text-slate-500">
                                    Preencha os dados do associado e registre a análise.
                                </p>
                            </div>

                            <div className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                                Tipo: {tipoFormulario}
                            </div>
                        </div>

                        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto]">
                            <div className="space-y-1.5">
                                <label className="block text-[12px] font-semibold uppercase tracking-[0.03em] text-slate-600">
                                    CPF/CNPJ do associado
                                </label>

                                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_160px_140px]">
                                    <SearchInput
                                        value={formatCpfView(cpf)}
                                        onChange={(e) => setCpf(e.target.value)}
                                        placeholder="Digite o CPF/CNPJ"
                                        className={inputBase}
                                        inputMode="numeric"
                                        maxLength={18}
                                    />

                                    <SearchButton loading={loading} label="Pesquisar" />

                                    <button
                                        type="button"
                                        onClick={limparFormulario}
                                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 cursor-pointer"
                                    >
                                        Limpar
                                    </button>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3 sm:flex-row xl:items-end">
                                <button
                                    type="button"
                                    onClick={salvar}
                                    disabled={loadingSalvar}
                                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-white shadow-sm transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    <FaSave />
                                    {loadingSalvar ? "Salvando..." : "Salvar Análise"}
                                </button>

                                <button
                                    type="button"
                                    onClick={salvarEImprimir}
                                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-third px-5 text-sm font-semibold text-white shadow-sm transition hover:brightness-95"
                                >
                                    <FaPrint />
                                    Salvar e Imprimir / PDF
                                </button>
                            </div>
                        </div>

                        {(erro || info || erroBusca || infoBusca) && (
                            <div className="mt-4">
                                {erro || erroBusca ? (
                                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                                        {erro || erroBusca}
                                    </div>
                                ) : (
                                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
                                        {info || infoBusca}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </SearchForm>

                <Section title="Dados do Associado">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
                        <div className="md:col-span-8">
                            <Field label="Nome">
                                <input
                                    value={nome}
                                    onChange={(e) => setNome(e.target.value)}
                                    className={inputBase}
                                />
                            </Field>
                        </div>

                        <div className="md:col-span-4">
                            <Field label="Celular">
                                <input
                                    value={celular}
                                    onChange={(e) => setCelular(phoneMask(e.target.value))}
                                    className={inputBase}
                                />
                            </Field>
                        </div>

                        {tipoFormulario === "PF" && (
                            <div className="md:col-span-12">
                                <Field label="Empresa">
                                    <input
                                        value={empresa}
                                        onChange={(e) => setEmpresa(e.target.value)}
                                        className={inputBase}
                                    />
                                </Field>
                            </div>
                        )}
                    </div>
                </Section>

                <Section title="Informações Bancárias e Salariais">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
                        <div className="md:col-span-4">
                            <Field label="Conta Corrente">
                                <input
                                    value={contaCorrente}
                                    onChange={(e) => setContaCorrente(e.target.value)}
                                    className={inputBase}
                                    maxLength={8}
                                />
                            </Field>
                        </div>

                        <div className="md:col-span-4">
                            <Field label={tipoFormulario === "PJ" ? "Faturamento Mensal" : "Salário Bruto"}>
                                <input
                                    value={salarioBruto}
                                    onChange={(e) => setSalarioBruto(monetizarDigitacao(e.target.value))}
                                    className={`${inputBase} text-right`}
                                />
                            </Field>
                        </div>

                        <div className="md:col-span-4">
                            <Field label={tipoFormulario === "PJ" ? "Faturamento Anual" : "Salário Líquido"}>
                                <input
                                    value={salarioLiquido}
                                    onChange={(e) => setSalarioLiquido(monetizarDigitacao(e.target.value))}
                                    className={`${inputBase} text-right`}
                                />
                            </Field>
                        </div>

                        {tipoFormulario === "PF" && (
                            <>
                                <div className="md:col-span-4">
                                    <Field label="Possui Portabilidade?">
                                        <select
                                            value={portabilidade}
                                            onChange={(e) => setPortabilidade(e.target.value)}
                                            className={inputBase}
                                        >
                                            <option value=""></option>
                                            <option value="1">Sim</option>
                                            <option value="0">Não</option>
                                        </select>
                                    </Field>
                                </div>

                                <div className="md:col-span-4">
                                    <Field label="Funcionário Efetivo?">
                                        <select
                                            value={efetivo}
                                            onChange={(e) => setEfetivo(e.target.value)}
                                            className={inputBase}
                                        >
                                            <option value=""></option>
                                            <option value="1">Sim</option>
                                            <option value="0">Não</option>
                                        </select>
                                    </Field>
                                </div>
                            </>
                        )}

                        <div className="md:col-span-4">
                            <Field label="Cessão de Crédito?">
                                <select
                                    value={cessaoCredito}
                                    onChange={(e) => setCessaoCredito(e.target.value)}
                                    className={inputBase}
                                >
                                    <option value=""></option>
                                    <option value="1">Sim</option>
                                    <option value="0">Não</option>
                                </select>
                            </Field>
                        </div>

                        {cessaoCredito === "1" && (
                            <div className="md:col-span-4">
                                <Field label="Data de Pagamento">
                                    <input
                                        type="date"
                                        value={dataPagamento}
                                        onChange={(e) => setDataPagamento(e.target.value)}
                                        className={inputBase}
                                    />
                                </Field>
                            </div>
                        )}

                        <div className="md:col-span-4">
                            <Field label="Nível da Carteira">
                                <select
                                    value={carteira}
                                    onChange={(e) => setCarteira(e.target.value)}
                                    className={inputBase}
                                >
                                    <option value=""></option>
                                    <option value="Q1">Q1</option>
                                    <option value="Q2">Q2</option>
                                    <option value="Q3">Q3</option>
                                    <option value="Q4">Q4</option>
                                </select>
                            </Field>
                        </div>

                        <div className="md:col-span-4">
                            <Field label="Números IAP">
                                <select
                                    value={iap}
                                    onChange={(e) => setIap(e.target.value)}
                                    className={inputBase}
                                >
                                    <option value=""></option>
                                    {Array.from({ length: 21 }).map((_, i) => (
                                        <option key={i} value={String(i)}>
                                            {i}
                                        </option>
                                    ))}
                                </select>
                            </Field>
                        </div>
                    </div>
                </Section>

                <Section title="Status CRM e Observações">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
                        <div className="md:col-span-4">
                            <Field label="Ocorrência CRM">
                                <select
                                    value={ocorrenciaCRM}
                                    onChange={(e) => setOcorrenciaCRM(e.target.value)}
                                    className={inputBase}
                                >
                                    <option value=""></option>
                                    <option value="1">Sim</option>
                                    <option value="0">Não</option>
                                </select>
                            </Field>
                        </div>

                        <div className="md:col-span-8">
                            <Field label="Observação">
                                <textarea
                                    value={obsCRM}
                                    onChange={(e) => setObsCRM(e.target.value)}
                                    className={textareaBase}
                                    rows={4}
                                    maxLength={250}
                                />
                            </Field>
                        </div>
                    </div>
                </Section>

                <Section title="Indicadores de Risco / Financeiros">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
                        <div className="md:col-span-2">
                            <Field label="Risco">
                                <input
                                    value={risco}
                                    onChange={(e) => setRisco(e.target.value)}
                                    className={inputBase}
                                />
                            </Field>
                        </div>

                        <div className="md:col-span-2">
                            <Field label="PD">
                                <input
                                    value={pd}
                                    onChange={(e) => setPd(e.target.value)}
                                    className={inputBase}
                                />
                            </Field>
                        </div>

                        <div className="md:col-span-4">
                            <Field label="CRL">
                                <input
                                    value={crl}
                                    onChange={(e) => setCrl(monetizarDigitacao(e.target.value))}
                                    className={`${inputBase} text-right`}
                                />
                            </Field>
                        </div>

                        <div className="md:col-span-4">
                            <Field label="Capital">
                                <input
                                    value={capital}
                                    onChange={(e) => setCapital(monetizarDigitacao(e.target.value))}
                                    className={`${inputBase} text-right`}
                                />
                            </Field>
                        </div>

                        <div className="md:col-span-3">
                            <Field label="Dívida">
                                <input
                                    value={divida}
                                    onChange={(e) => setDivida(monetizarDigitacao(e.target.value))}
                                    className={`${inputBase} text-right`}
                                />
                            </Field>
                        </div>

                        <div className="md:col-span-2">
                            <Field label="Restrições?">
                                <select
                                    value={restricoes}
                                    onChange={(e) => setRestricoes(e.target.value)}
                                    className={inputBase}
                                >
                                    <option value=""></option>
                                    <option value="1">Sim</option>
                                    <option value="0">Não</option>
                                </select>
                            </Field>
                        </div>

                        <div className="md:col-span-7">
                            <Field label="Quais?">
                                <input
                                    value={quaisRestricoes}
                                    onChange={(e) => setQuaisRestricoes(e.target.value)}
                                    className={inputBase}
                                />
                            </Field>
                        </div>
                    </div>
                </Section>

                <Section title="Sugestão de Limite e Aprovações">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
                        <div className="md:col-span-12">
                            <Field label="Sugestão de limite do associado">
                                <input
                                    value={sugestaoLimite}
                                    onChange={(e) => setSugestaoLimite(monetizarDigitacao(e.target.value))}
                                    className={`${inputBase} text-right`}
                                />
                            </Field>
                        </div>

                        <div className="md:col-span-4">
                            <Field label="Cartão?">
                                <RadioGroup name="radioCartao" value={cartao} onChange={setCartao} />
                            </Field>
                        </div>

                        <div className="md:col-span-4">
                            <Field label="Limite Atual">
                                <input
                                    value={cartaoAtual}
                                    onChange={(e) => setCartaoAtual(monetizarDigitacao(e.target.value))}
                                    className={`${inputBase} text-right`}
                                />
                            </Field>
                        </div>

                        <div className="md:col-span-4">
                            <Field label="Limite Aprovado">
                                <input
                                    value={cartaoAprovado}
                                    onChange={(e) => setCartaoAprovado(monetizarDigitacao(e.target.value))}
                                    className={`${inputBase} text-right`}
                                />
                            </Field>
                        </div>

                        <div className="md:col-span-4">
                            <Field label="Cheque Especial?">
                                <RadioGroup name="radioEspecial" value={especial} onChange={setEspecial} />
                            </Field>
                        </div>

                        <div className="md:col-span-4">
                            <Field label="Limite Atual">
                                <input
                                    value={especialAtual}
                                    onChange={(e) => setEspecialAtual(monetizarDigitacao(e.target.value))}
                                    className={`${inputBase} text-right`}
                                />
                            </Field>
                        </div>

                        <div className="md:col-span-4">
                            <Field label="Limite Aprovado">
                                <input
                                    value={especialAprovado}
                                    onChange={(e) => setEspecialAprovado(monetizarDigitacao(e.target.value))}
                                    className={`${inputBase} text-right`}
                                />
                            </Field>
                        </div>
                    </div>
                </Section>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div className="max-w-xs">
                            <Field label="Data">
                                <input
                                    readOnly
                                    type="date"
                                    value={dataEnvio}
                                    className={`${inputBase} bg-slate-50`}
                                />
                            </Field>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row">
                            <button
                                type="button"
                                onClick={salvar}
                                disabled={loadingSalvar}
                                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-white shadow-sm transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <FaSave />
                                Salvar Análise
                            </button>

                            <button
                                type="button"
                                onClick={imprimirDireto}
                                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-third px-5 text-sm font-semibold text-white shadow-sm transition hover:brightness-95"
                            >
                                <FaPrint />
                                Imprimir
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div id="print-area" className="hidden print:block">
                <div className="mx-auto max-w-5xl text-black">
                    <div className="mb-6 border-b pb-4">
                        <h2 className="text-center text-2xl font-semibold">
                            Relatório de Análise de Limite
                        </h2>
                    </div>

                    <PrintSection title="Dados do Associado">
                        <PrintLine label="CPF/CNPJ" value={formatCpfView(cpf)} />
                        <PrintLine label="Nome" value={nome} />
                        <PrintLine label="Celular" value={celular} />
                        {tipoFormulario === "PF" && <PrintLine label="Empresa" value={empresa} />}
                    </PrintSection>

                    <PrintSection title="Informações Bancárias e Salariais">
                        <PrintGrid
                            items={[
                                { label: "Conta Corrente", value: contaCorrente },
                                {
                                    label: tipoFormulario === "PJ" ? "Faturamento Mensal" : "Salário Bruto",
                                    value: salarioBruto,
                                },
                                {
                                    label: tipoFormulario === "PJ" ? "Faturamento Anual" : "Salário Líquido",
                                    value: salarioLiquido,
                                },
                                ...(tipoFormulario === "PF"
                                    ? [
                                        { label: "Portabilidade", value: yesNoText(portabilidade) },
                                        { label: "Efetivo", value: yesNoText(efetivo) },
                                    ]
                                    : []),
                                { label: "Cessão de Crédito", value: yesNoText(cessaoCredito) },
                                ...(cessaoCredito === "1"
                                    ? [{ label: "Data Pagamento", value: formatDateBR(dataPagamento) }]
                                    : []),
                                { label: "Nível Carteira", value: carteira },
                                { label: "Números IAP", value: iap },
                            ]}
                        />
                    </PrintSection>

                    <PrintSection title="Status CRM e Observações">
                        <PrintLine label="Ocorrência CRM" value={yesNoText(ocorrenciaCRM)} />
                        <PrintLine label="Observação" value={obsCRM} />
                    </PrintSection>

                    <PrintSection title="Indicadores de Risco / Financeiros">
                        <PrintGrid
                            items={[
                                { label: "Risco", value: risco },
                                { label: "PD", value: pd },
                                { label: "CRL", value: crl },
                                { label: "Capital", value: capital },
                                { label: "Dívida", value: divida },
                                { label: "Restrições", value: yesNoText(restricoes) },
                                { label: "Quais", value: quaisRestricoes },
                            ]}
                        />
                    </PrintSection>

                    <PrintSection title="Sugestão de Limite e Aprovações">
                        <PrintGrid
                            items={[
                                { label: "Sugestão Limite", value: sugestaoLimite },
                                { label: "Cartão", value: yesNoText(cartao) },
                                { label: "Limite Cartão Atual", value: cartaoAtual },
                                { label: "Limite Cartão Aprovado", value: cartaoAprovado },
                                { label: "Cheque Especial", value: yesNoText(especial) },
                                { label: "Limite Especial Atual", value: especialAtual },
                                { label: "Limite Especial Aprovado", value: especialAprovado },
                            ]}
                        />
                    </PrintSection>

                    <div className="mt-12 grid grid-cols-3 gap-8 text-center">
                        <Signature label="Assinatura Colaborador" />
                        <Signature label="Assinatura Gerência" />
                        <Signature label="Assinatura Diretoria" />
                    </div>

                    <div className="mt-8 text-right text-sm">
                        Data Análise: {formatDateBR(dataEnvio)}
                    </div>
                </div>
            </div>
        </>
    );
}

function PrintSection({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <section className="mb-5">
            <div className="mb-3 rounded bg-emerald-700 px-3 py-2 text-sm font-semibold text-white">
                {title}
            </div>
            <div className="space-y-2">{children}</div>
        </section>
    );
}

function PrintLine({ label, value }: { label: string; value?: string | null }) {
    return (
        <p className="text-sm">
            <strong>{label}:</strong> {value || ""}
        </p>
    );
}

function PrintGrid({
    items,
}: {
    items: { label: string; value?: string | null }[];
}) {
    return (
        <div className="grid grid-cols-2 gap-3">
            {items.map((item, index) => (
                <div key={`${item.label}-${index}`} className="text-sm">
                    <strong>{item.label}:</strong> {item.value || ""}
                </div>
            ))}
        </div>
    );
}

function Signature({ label }: { label: string }) {
    return (
        <div>
            <div className="mb-1 border-t border-black" />
            <small>{label}</small>
        </div>
    );
}