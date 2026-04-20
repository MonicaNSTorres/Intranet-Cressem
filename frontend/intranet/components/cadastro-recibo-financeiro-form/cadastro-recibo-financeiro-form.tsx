"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
    FaArrowRight,
    FaEdit,
    FaPlus,
    FaPrint,
    FaSave,
    FaSearch,
    FaTimes,
    FaTrash,
} from "react-icons/fa";
import { SearchForm } from "@/components/ui/search-form";
import { SearchInput } from "@/components/ui/search-input";
import { SearchButton } from "@/components/ui/search-button";
import {
    buscarAssociadoReciboPorCpfCnpj,
    buscarReciboFinanceiroPorId,
    buscarUsuarioLogadoRecibo,
    cadastrarReciboFinanceiro,
    carregarCategoriaContratoRecibo,
    carregarCidadesRecibo,
    carregarFormaPagamentoRecibo,
    carregarTipoAtendimentoRecibo,
    editarReciboFinanceiro,
    type AuthMeResponse,
    type PagamentoItem,
    type ParcelaItem,
    type ReciboFinanceiroPayload,
} from "@/services/cadastro_recibo_financeiro.service";
type ParcelaModalState = {
    numeroContrato: string;
    categoria: string;
    data: string;
    quitacao: string;
    parcela: string;
    valor: string;
};

type PagamentoModalState = {
    formaPagamento: string;
    valor: string;
};

function onlyDigits(value: string) {
    return String(value || "").replace(/\D/g, "");
}

function formatCpfCnpj(value: string) {
    const digits = onlyDigits(value);

    if (digits.length <= 11) {
        return digits
            .replace(/^(\d{3})(\d)/, "$1.$2")
            .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
            .replace(/\.(\d{3})(\d)/, ".$1-$2")
            .slice(0, 14);
    }

    return digits
        .slice(0, 14)
        .replace(/^(\d{2})(\d)/, "$1.$2")
        .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
        .replace(/\.(\d{3})(\d)/, ".$1/$2")
        .replace(/(\d{4})(\d)/, "$1-$2");
}

function formatDateBR(value?: string | null) {
    if (!value) return "";
    const raw = String(value).slice(0, 10);
    const [y, m, d] = raw.split("-");
    if (!y || !m || !d) return String(value);
    return `${d}/${m}/${y}`;
}

function formatMoneyBR(value: number) {
    return Number(value || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
        minimumFractionDigits: 2,
    });
}

function parseMoneyBR(value: string) {
    const normalized = String(value || "")
        .replace(/[^\d,.-]/g, "")
        .replace(/\./g, "")
        .replace(",", ".");
    const num = Number(normalized);
    return Number.isFinite(num) ? num : 0;
}

function moneyInput(value: string) {
    const digits = String(value || "").replace(/\D/g, "");
    const number = Number(digits) / 100;

    return number.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

function validaCpfCnpj(valor: string) {
    const v = onlyDigits(valor);

    if (v.length === 11) {
        if (/^(\d)\1+$/.test(v)) return false;

        let soma = 0;
        for (let i = 0; i < 9; i++) soma += Number(v[i]) * (10 - i);
        let resto = (soma * 10) % 11;
        if (resto === 10) resto = 0;
        if (resto !== Number(v[9])) return false;

        soma = 0;
        for (let i = 0; i < 10; i++) soma += Number(v[i]) * (11 - i);
        resto = (soma * 10) % 11;
        if (resto === 10) resto = 0;
        return resto === Number(v[10]);
    }

    if (v.length === 14) {
        if (/^(\d)\1+$/.test(v)) return false;

        const calc = (base: string, factors: number[]) => {
            const total = base
                .split("")
                .reduce((acc, digit, i) => acc + Number(digit) * factors[i], 0);
            const rest = total % 11;
            return rest < 2 ? 0 : 11 - rest;
        };

        const base12 = v.slice(0, 12);
        const d1 = calc(base12, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
        const d2 = calc(base12 + d1, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);

        return v === `${base12}${d1}${d2}`;
    }

    return false;
}

const inputBase =
    "h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100";

const textareaBase =
    "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100";

const buttonPrimary =
    "inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-secondary px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary cursor-pointer";

const buttonSecondary =
    "inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 cursor-pointer";

function Section({
    title,
    subtitle,
    children,
}: {
    title: string;
    subtitle?: string;
    children: React.ReactNode;
}) {
    return (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
                <h3 className="text-sm font-bold text-slate-800">{title}</h3>
                {subtitle ? <p className="mt-1 text-xs text-slate-500">{subtitle}</p> : null}
            </div>
            <div className="p-5">{children}</div>
        </section>
    );
}

function Field({
    label,
    children,
    helper,
}: {
    label: string;
    children: React.ReactNode;
    helper?: string;
}) {
    return (
        <div className="space-y-1.5">
            <label className="block text-[12px] font-semibold uppercase tracking-[0.03em] text-slate-600">
                {label}
            </label>
            {children}
            {helper ? <p className="text-xs text-slate-500">{helper}</p> : null}
        </div>
    );
}

function ModalShell({
    open,
    title,
    subtitle,
    onClose,
    children,
    maxWidth = "max-w-3xl",
}: {
    open: boolean;
    title: string;
    subtitle?: string;
    onClose: () => void;
    children: React.ReactNode;
    maxWidth?: string;
}) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4">
            <div
                className={`relative flex max-h-[90vh] w-full ${maxWidth} flex-col overflow-hidden rounded-3xl bg-white shadow-2xl`}
            >
                <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-6 py-4">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">{title}</h3>
                        {subtitle ? <p className="text-sm text-slate-500">{subtitle}</p> : null}
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
                    >
                        <FaTimes size={14} />
                    </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
            </div>
        </div>
    );
}

export function CadastroReciboFinanceiroForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const reciboId = searchParams.get("id");

    const modoEdicao = !!reciboId;

    const [loadingInicial, setLoadingInicial] = useState(true);
    const [loadingSalvar, setLoadingSalvar] = useState(false);
    const [loadingBuscaAssociado, setLoadingBuscaAssociado] = useState(false);

    const [cpfCnpj, setCpfCnpj] = useState("");
    const [nome, setNome] = useState("");
    const [matricula, setMatricula] = useState("");
    const [empresa, setEmpresa] = useState("");
    const [dataRecibo, setDataRecibo] = useState("");
    const [cidade, setCidade] = useState("");
    const [observacao, setObservacao] = useState("");
    const [tipoAtendimento, setTipoAtendimento] = useState("");
    const [nomeFuncionario, setNomeFuncionario] = useState("");

    const [tipoFormulario, setTipoFormulario] = useState<"PF" | "PJ">("PF");

    const [cidades, setCidades] = useState<string[]>([]);
    const [tiposAtendimento, setTiposAtendimento] = useState<string[]>([]);
    const [categoriasContrato, setCategoriasContrato] = useState<string[]>([]);
    const [formasPagamento, setFormasPagamento] = useState<string[]>([]);

    const [parcelas, setParcelas] = useState<ParcelaItem[]>([]);
    const [pagamentos, setPagamentos] = useState<PagamentoItem[]>([]);

    const [erro, setErro] = useState("");
    const [info, setInfo] = useState("");

    const [modalParcelaOpen, setModalParcelaOpen] = useState(false);
    const [modalPagamentoOpen, setModalPagamentoOpen] = useState(false);

    const [parcelaModal, setParcelaModal] = useState<ParcelaModalState>({
        numeroContrato: "",
        categoria: "",
        data: "",
        quitacao: "",
        parcela: "",
        valor: "",
    });

    const [pagamentoModal, setPagamentoModal] = useState<PagamentoModalState>({
        formaPagamento: "",
        valor: "",
    });

    const [indexParcelaEditando, setIndexParcelaEditando] = useState<number | null>(null);
    const [indexPagamentoEditando, setIndexPagamentoEditando] = useState<number | null>(null);

    const totalParcelas = useMemo(
        () => parcelas.reduce((acc, item) => acc + Number(item.VL_PARCELA_CRM || 0), 0),
        [parcelas]
    );

    const totalPagamentos = useMemo(
        () => pagamentos.reduce((acc, item) => acc + Number(item.VL_PAGAMENTO || 0), 0),
        [pagamentos]
    );

    useEffect(() => {
        async function loadInicial() {
            try {
                setLoadingInicial(true);
                setErro("");

                const [
                    cidadesResp,
                    tiposResp,
                    categoriasResp,
                    formasResp,
                    usuarioResp,
                ] = await Promise.all([
                    carregarCidadesRecibo().catch(() => []),
                    carregarTipoAtendimentoRecibo().catch(() => []),
                    carregarCategoriaContratoRecibo().catch(() => []),
                    carregarFormaPagamentoRecibo().catch(() => []),
                    buscarUsuarioLogadoRecibo().catch(
                        (): AuthMeResponse => ({ nome: "", username: "" })
                    ),
                ]);

                setCidades(cidadesResp || []);
                setTiposAtendimento(tiposResp || []);
                setCategoriasContrato(categoriasResp || []);
                setFormasPagamento(formasResp || []);
                setNomeFuncionario(String(usuarioResp?.nome || usuarioResp?.username || "").trim());

                if (modoEdicao && reciboId) {
                    const recibo = await buscarReciboFinanceiroPorId(Number(reciboId));

                    setCpfCnpj(formatCpfCnpj(recibo.NR_CPF_CNPJ || ""));
                    setNome(recibo.NM_ASSOCIADO || "");
                    setMatricula(recibo.NR_MATRICULA || "");
                    setEmpresa(recibo.NM_EMPRESA || "");
                    setDataRecibo(String(recibo.DT_DIA || "").slice(0, 10));
                    setCidade(recibo.CIDADE || "");
                    setObservacao(recibo.OBSERVACAO || "");
                    setTipoAtendimento(recibo.TP_ATENDIMENTO || "");
                    setNomeFuncionario(
                        recibo.NM_FUNCIONARIO ||
                        String(usuarioResp?.nome || usuarioResp?.username || "").trim()
                    );

                    const digits = onlyDigits(recibo.NR_CPF_CNPJ || "");
                    setTipoFormulario(digits.length === 14 ? "PJ" : "PF");

                    setParcelas(recibo.PARCELAS || []);
                    setPagamentos(recibo.PAGAMENTOS || []);
                }
            } catch (error: any) {
                console.error(error);
                setErro(
                    error?.response?.data?.error ||
                    "Não foi possível carregar os dados do recibo."
                );
            } finally {
                setLoadingInicial(false);
            }
        }

        loadInicial();
    }, [modoEdicao, reciboId]);

    function abrirConsulta() {
        router.push("/auth/consulta_recibo_financeiro");
    }

    async function buscarAssociado() {
        const documento = onlyDigits(cpfCnpj);

        if (!documento) {
            setErro("Informe um CPF/CNPJ.");
            return;
        }

        if (!validaCpfCnpj(documento)) {
            setErro("Informe um CPF/CNPJ válido.");
            return;
        }

        try {
            setErro("");
            setInfo("");
            setLoadingBuscaAssociado(true);

            const associado = await buscarAssociadoReciboPorCpfCnpj(documento);

            setNome(String(associado?.nome || ""));
            setCidade(String(associado?.cidade || ""));

            if (documento.length === 14) {
                setTipoFormulario("PJ");
                setMatricula("");
                setEmpresa(String(associado?.empresa || ""));
            } else {
                setTipoFormulario("PF");
                setMatricula(String(associado?.matricula || ""));
                setEmpresa(String(associado?.empresa || ""));
            }
        } catch (error: any) {
            console.error(error);
            setErro(
                error?.response?.data?.error ||
                "Não foi possível buscar o associado."
            );
        } finally {
            setLoadingBuscaAssociado(false);
        }
    }

    function validaCamposRecibo() {
        if (!onlyDigits(cpfCnpj)) return "Preencha o CPF/CNPJ.";
        if (!nome.trim()) return "Preencha o nome do associado.";
        if (!dataRecibo) return "Selecione a data do recibo.";
        if (!cidade.trim()) return "Selecione a cidade.";
        if (!tipoAtendimento.trim()) return "Selecione o tipo de atendimento.";
        return "";
    }

    function validaCamposParcela() {
        if (!parcelaModal.numeroContrato.trim()) return "Preencha o número do contrato.";
        if (!parcelaModal.categoria.trim()) return "Selecione a categoria.";
        if (!parcelaModal.data) return "Selecione a data.";
        if (parcelaModal.quitacao === "") return "Selecione a quitação.";
        if (!parcelaModal.parcela.trim()) return "Preencha a parcela.";
        if (!parcelaModal.valor.trim() || parseMoneyBR(parcelaModal.valor) <= 0) {
            return "Preencha um valor válido.";
        }
        return "";
    }

    function validaCamposPagamento() {
        if (!pagamentoModal.formaPagamento.trim()) {
            return "Selecione a forma de pagamento.";
        }
        if (!pagamentoModal.valor.trim() || parseMoneyBR(pagamentoModal.valor) <= 0) {
            return "Preencha um valor válido.";
        }
        return "";
    }

    function validaTotais() {
        const diferenca = totalParcelas - totalPagamentos;
        if (Math.round(diferenca * 100) !== 0) {
            return `Valor total de parcelas com diferença de ${formatMoneyBR(
                Math.abs(diferenca)
            )} do total de pagamento.`;
        }
        return "";
    }

    function limparParcelaModal() {
        setParcelaModal({
            numeroContrato: "",
            categoria: "",
            data: "",
            quitacao: "",
            parcela: "",
            valor: "",
        });
        setIndexParcelaEditando(null);
    }

    function limparPagamentoModal() {
        setPagamentoModal({
            formaPagamento: "",
            valor: "",
        });
        setIndexPagamentoEditando(null);
    }

    function abrirModalParcelaNova() {
        limparParcelaModal();
        setModalParcelaOpen(true);
    }

    function abrirModalPagamentoNovo() {
        limparPagamentoModal();
        setModalPagamentoOpen(true);
    }

    function salvarParcelaModal() {
        const msg = validaCamposParcela();
        if (msg) {
            setErro(msg);
            return;
        }

        setErro("");

        const novaParcela: ParcelaItem = {
            NR_CONTRATO: parcelaModal.numeroContrato.trim(),
            NM_CATEGORIA: parcelaModal.categoria.trim(),
            SN_QUITACAO: Number(parcelaModal.quitacao),
            DT_PERIODO: parcelaModal.data,
            NR_PARCELA: parcelaModal.parcela.trim(),
            VL_PARCELA_CRM: parseMoneyBR(parcelaModal.valor),
        };

        if (indexParcelaEditando !== null) {
            setParcelas((prev) =>
                prev.map((item, index) => (index === indexParcelaEditando ? novaParcela : item))
            );
        } else {
            setParcelas((prev) => [...prev, novaParcela]);
        }

        limparParcelaModal();
        setModalParcelaOpen(false);
    }

    function salvarPagamentoModal() {
        const msg = validaCamposPagamento();
        if (msg) {
            setErro(msg);
            return;
        }

        setErro("");

        const novoPagamento: PagamentoItem = {
            NM_FORMA_PAGAMENTO: pagamentoModal.formaPagamento.trim(),
            VL_PAGAMENTO: parseMoneyBR(pagamentoModal.valor),
        };

        if (indexPagamentoEditando !== null) {
            setPagamentos((prev) =>
                prev.map((item, index) => (index === indexPagamentoEditando ? novoPagamento : item))
            );
        } else {
            setPagamentos((prev) => [...prev, novoPagamento]);
        }

        limparPagamentoModal();
        setModalPagamentoOpen(false);
    }

    function editarLinhaParcela(index: number) {
        const item = parcelas[index];
        setParcelaModal({
            numeroContrato: item.NR_CONTRATO,
            categoria: item.NM_CATEGORIA,
            data: String(item.DT_PERIODO || "").slice(0, 10),
            quitacao: String(item.SN_QUITACAO),
            parcela: String(item.NR_PARCELA || ""),
            valor: moneyInput(String(Math.round(Number(item.VL_PARCELA_CRM || 0) * 100))),
        });
        setIndexParcelaEditando(index);
        setModalParcelaOpen(true);
    }

    function editarLinhaPagamento(index: number) {
        const item = pagamentos[index];
        setPagamentoModal({
            formaPagamento: item.NM_FORMA_PAGAMENTO,
            valor: moneyInput(String(Math.round(Number(item.VL_PAGAMENTO || 0) * 100))),
        });
        setIndexPagamentoEditando(index);
        setModalPagamentoOpen(true);
    }

    function removerParcela(index: number) {
        setParcelas((prev) => prev.filter((_, i) => i !== index));
    }

    function removerPagamento(index: number) {
        setPagamentos((prev) => prev.filter((_, i) => i !== index));
    }

    function buildPayload(): ReciboFinanceiroPayload {
        return {
            NR_CPF_CNPJ: onlyDigits(cpfCnpj),
            NM_ASSOCIADO: nome.trim().toUpperCase(),
            NR_MATRICULA: matricula.trim(),
            NM_EMPRESA: empresa.trim().toUpperCase(),
            DT_DIA: dataRecibo,
            CIDADE: cidade.trim(),
            TP_ATENDIMENTO: tipoAtendimento.trim(),
            OBSERVACAO: observacao.trim(),
            NM_FUNCIONARIO: nomeFuncionario,
            PARCELAS: parcelas.map((item) => ({
                ...item,
                NR_CONTRATO: String(item.NR_CONTRATO).trim(),
                NR_PARCELA: String(item.NR_PARCELA).trim(),
            })),
            PAGAMENTOS: pagamentos,
        };
    }

    async function salvarRecibo() {
        try {
            setErro("");
            setInfo("");

            const msgCampos = validaCamposRecibo();
            if (msgCampos) {
                setErro(msgCampos);
                return;
            }

            const msgTotais = validaTotais();
            if (msgTotais) {
                setErro(msgTotais);
                return;
            }

            setLoadingSalvar(true);

            const payload = buildPayload();

            if (modoEdicao && reciboId) {
                await editarReciboFinanceiro(Number(reciboId), payload);
                setInfo("Solicitação atualizada com sucesso.");
                return;
            }

            await cadastrarReciboFinanceiro(payload);
            setInfo("Solicitação cadastrada com sucesso.");
        } catch (error: any) {
            console.error(error);
            setErro(
                error?.response?.data?.error ||
                `Não foi possível ${modoEdicao ? "atualizar" : "cadastrar"} o recibo.`
            );
        } finally {
            setLoadingSalvar(false);
        }
    }

    function imprimirRecibo() {
        window.print();
    }

    if (loadingInicial) {
        return (
            <div className="mx-auto w-full max-w-400 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                <p className="text-sm text-slate-500">Carregando dados do recibo...</p>
            </div>
        );
    }

    return (
        <>
            <div className="mx-auto w-full min-w-225 space-y-6 rounded-3xl border border-slate-200 bg-[#F8FAFC] p-4 shadow-sm sm:p-6 lg:p-8">
                <SearchForm onSearch={buscarAssociado}>
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800">
                                    Dados do recibo
                                </h2>
                                <p className="mt-1 text-sm text-slate-500">
                                    Preencha os dados do associado e registre parcelas e pagamentos.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={abrirConsulta}
                                className={buttonSecondary}
                            >
                                <FaArrowRight />
                                Consulta de Recibos
                            </button>
                        </div>

                        {(erro || info) && (
                            <div className="mb-5">
                                {erro ? (
                                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                                        {erro}
                                    </div>
                                ) : (
                                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
                                        {info}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
                            <div className="md:col-span-5">
                                <Field label="CPF/CNPJ">
                                    <div className="flex gap-2">
                                        <SearchInput
                                            value={formatCpfCnpj(cpfCnpj)}
                                            onChange={(e) => setCpfCnpj(e.target.value)}
                                            className={inputBase}
                                            maxLength={18}
                                        />
                                        <SearchButton loading={loadingBuscaAssociado} label="Pesquisar" />
                                    </div>
                                </Field>
                            </div>

                            <div className="md:col-span-7">
                                <Field label="Nome">
                                    <input
                                        value={nome}
                                        onChange={(e) => setNome(e.target.value)}
                                        className={inputBase}
                                    />
                                </Field>
                            </div>

                            {tipoFormulario === "PF" ? (
                                <>
                                    <div className="md:col-span-4">
                                        <Field label="Matrícula">
                                            <input
                                                value={matricula}
                                                onChange={(e) => setMatricula(e.target.value)}
                                                className={inputBase}
                                                placeholder="0000000000"
                                            />
                                        </Field>
                                    </div>

                                    <div className="md:col-span-8">
                                        <Field label="Empresa">
                                            <input
                                                value={empresa}
                                                onChange={(e) => setEmpresa(e.target.value)}
                                                className={inputBase}
                                            />
                                        </Field>
                                    </div>
                                </>
                            ) : null}

                            <div className="md:col-span-5">
                                <Field label="Data Recibo">
                                    <input
                                        type="date"
                                        value={dataRecibo}
                                        onChange={(e) => setDataRecibo(e.target.value)}
                                        className={inputBase}
                                    />
                                </Field>
                            </div>

                            <div className="md:col-span-7">
                                <Field label="Cidade de Atendimento">
                                    <select
                                        value={cidade}
                                        onChange={(e) => setCidade(e.target.value)}
                                        className={inputBase}
                                    >
                                        <option value=""></option>
                                        {cidades.map((item, index) => (
                                            <option key={`${item}-${index}`} value={item}>
                                                {item}
                                            </option>
                                        ))}
                                    </select>
                                </Field>
                            </div>

                            <div className="md:col-span-12">
                                <Field label="Observação">
                                    <textarea
                                        value={observacao}
                                        onChange={(e) => setObservacao(e.target.value)}
                                        className={textareaBase}
                                        rows={3}
                                        maxLength={250}
                                    />
                                </Field>
                            </div>

                            <div className="md:col-span-6">
                                <Field label="Tipo Atendimento">
                                    <select
                                        value={tipoAtendimento}
                                        onChange={(e) => setTipoAtendimento(e.target.value)}
                                        className={inputBase}
                                    >
                                        <option value=""></option>
                                        {tiposAtendimento.map((item, index) => (
                                            <option key={`${item}-${index}`} value={item}>
                                                {item}
                                            </option>
                                        ))}
                                    </select>
                                </Field>
                            </div>

                            <div className="md:col-span-3">
                                <Field label="Parcelas">
                                    <button
                                        type="button"
                                        onClick={abrirModalParcelaNova}
                                        className={`${buttonPrimary} w-full`}
                                    >
                                        <FaPlus />
                                        Cadastrar Parcelas
                                    </button>
                                </Field>
                            </div>

                            <div className="md:col-span-3">
                                <Field label="Pagamentos">
                                    <button
                                        type="button"
                                        onClick={abrirModalPagamentoNovo}
                                        className={`${buttonPrimary} w-full`}
                                    >
                                        <FaPlus />
                                        Cadastrar Pagamentos
                                    </button>
                                </Field>
                            </div>
                        </div>
                    </div>
                </SearchForm>

                <Section title="Parcelas e Valores">
                    <div className="overflow-x-auto">
                        <table className="min-w-full border-separate border-spacing-0 overflow-hidden rounded-2xl">
                            <thead>
                                <tr className="bg-slate-100 text-left text-xs font-bold uppercase tracking-[0.03em] text-slate-600">
                                    <th className="border-b border-slate-200 px-4 py-3">Contrato</th>
                                    <th className="border-b border-slate-200 px-4 py-3">Item Pagamento</th>
                                    <th className="border-b border-slate-200 px-4 py-3">Quitação</th>
                                    <th className="border-b border-slate-200 px-4 py-3">Data</th>
                                    <th className="border-b border-slate-200 px-4 py-3">Parcela</th>
                                    <th className="border-b border-slate-200 px-4 py-3">Valor</th>
                                    <th className="border-b border-slate-200 px-4 py-3 text-center">Editar</th>
                                    <th className="border-b border-slate-200 px-4 py-3 text-center">Remover</th>
                                </tr>
                            </thead>

                            <tbody className="bg-white text-sm text-slate-700">
                                {parcelas.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={8}
                                            className="border-b border-slate-100 px-4 py-8 text-center text-slate-400"
                                        >
                                            Nenhuma parcela cadastrada.
                                        </td>
                                    </tr>
                                ) : (
                                    parcelas.map((item, index) => (
                                        <tr key={`${item.NR_CONTRATO}-${index}`} className="hover:bg-slate-50">
                                            <td className="border-b border-slate-100 px-4 py-3">{item.NR_CONTRATO}</td>
                                            <td className="border-b border-slate-100 px-4 py-3">{item.NM_CATEGORIA}</td>
                                            <td className="border-b border-slate-100 px-4 py-3">
                                                {Number(item.SN_QUITACAO) === 1 ? "Sim" : "Não"}
                                            </td>
                                            <td className="border-b border-slate-100 px-4 py-3">
                                                {formatDateBR(item.DT_PERIODO)}
                                            </td>
                                            <td className="border-b border-slate-100 px-4 py-3">{item.NR_PARCELA}</td>
                                            <td className="border-b border-slate-100 px-4 py-3">
                                                {formatMoneyBR(item.VL_PARCELA_CRM)}
                                            </td>
                                            <td className="border-b border-slate-100 px-4 py-3 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => editarLinhaParcela(index)}
                                                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-secondary px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-primary cursor-pointer"
                                                >
                                                    <FaEdit size={13} />
                                                    Editar
                                                </button>
                                            </td>
                                            <td className="border-b border-slate-100 px-4 py-3 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => removerParcela(index)}
                                                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-red-700 cursor-pointer"
                                                >
                                                    <FaTrash size={13} />
                                                    Remover
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                        <div>
                            <Field label="Total parcelas">
                                <input
                                    readOnly
                                    value={formatMoneyBR(totalParcelas)}
                                    className={`${inputBase} bg-slate-50`}
                                />
                            </Field>
                        </div>
                    </div>
                </Section>

                <Section title="Forma de Pagamento">
                    <div className="overflow-x-auto">
                        <table className="min-w-full border-separate border-spacing-0 overflow-hidden rounded-2xl">
                            <thead>
                                <tr className="bg-slate-100 text-left text-xs font-bold uppercase tracking-[0.03em] text-slate-600">
                                    <th className="border-b border-slate-200 px-4 py-3">Forma Pagamento</th>
                                    <th className="border-b border-slate-200 px-4 py-3">Valor</th>
                                    <th className="border-b border-slate-200 px-4 py-3 text-center">Editar</th>
                                    <th className="border-b border-slate-200 px-4 py-3 text-center">Remover</th>
                                </tr>
                            </thead>

                            <tbody className="bg-white text-sm text-slate-700">
                                {pagamentos.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={4}
                                            className="border-b border-slate-100 px-4 py-8 text-center text-slate-400"
                                        >
                                            Nenhuma forma de pagamento cadastrada.
                                        </td>
                                    </tr>
                                ) : (
                                    pagamentos.map((item, index) => (
                                        <tr key={`${item.NM_FORMA_PAGAMENTO}-${index}`} className="hover:bg-slate-50">
                                            <td className="border-b border-slate-100 px-4 py-3">
                                                {item.NM_FORMA_PAGAMENTO}
                                            </td>
                                            <td className="border-b border-slate-100 px-4 py-3">
                                                {formatMoneyBR(item.VL_PAGAMENTO)}
                                            </td>
                                            <td className="border-b border-slate-100 px-4 py-3 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => editarLinhaPagamento(index)}
                                                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-700"
                                                >
                                                    <FaEdit size={13} />
                                                    Editar
                                                </button>
                                            </td>
                                            <td className="border-b border-slate-100 px-4 py-3 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => removerPagamento(index)}
                                                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-red-700"
                                                >
                                                    <FaTrash size={13} />
                                                    Remover
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-12">
                        <div className="md:col-span-4">
                            <Field label="Total pagamento">
                                <input
                                    readOnly
                                    value={formatMoneyBR(totalPagamentos)}
                                    className={`${inputBase} bg-slate-50`}
                                />
                            </Field>
                        </div>

                        <div className="md:col-span-8">
                            <div className="flex flex-col gap-3 pt-5.5 sm:flex-row sm:justify-end">
                                <button
                                    type="button"
                                    onClick={salvarRecibo}
                                    disabled={loadingSalvar}
                                    className={`${buttonPrimary} disabled:cursor-not-allowed disabled:opacity-60`}
                                >
                                    <FaSave />
                                    {loadingSalvar
                                        ? "Salvando..."
                                        : modoEdicao
                                            ? "Atualizar Recibo"
                                            : "Cadastrar"}
                                </button>

                                <button
                                    type="button"
                                    onClick={imprimirRecibo}
                                    className={buttonSecondary}
                                >
                                    <FaPrint />
                                    Imprimir Recibo
                                </button>
                            </div>
                        </div>
                    </div>
                </Section>
            </div>

            <ModalShell
                open={modalParcelaOpen}
                title="Parcelas e Valores"
                subtitle="Cadastre ou edite a parcela do recibo."
                onClose={() => {
                    setModalParcelaOpen(false);
                    limparParcelaModal();
                }}
                maxWidth="max-w-2xl"
            >
                <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
                    <div className="md:col-span-12">
                        <Field label="Número Contrato">
                            <input
                                value={parcelaModal.numeroContrato}
                                onChange={(e) =>
                                    setParcelaModal((prev) => ({
                                        ...prev,
                                        numeroContrato: e.target.value,
                                    }))
                                }
                                className={inputBase}
                            />
                        </Field>
                    </div>

                    <div className="md:col-span-12">
                        <Field label="Categoria">
                            <select
                                value={parcelaModal.categoria}
                                onChange={(e) =>
                                    setParcelaModal((prev) => ({
                                        ...prev,
                                        categoria: e.target.value,
                                    }))
                                }
                                className={inputBase}
                            >
                                <option value=""></option>
                                {categoriasContrato.map((item, index) => (
                                    <option key={`${item}-${index}`} value={item}>
                                        {item}
                                    </option>
                                ))}
                            </select>
                        </Field>
                    </div>

                    <div className="md:col-span-6">
                        <Field label="Data">
                            <input
                                type="date"
                                value={parcelaModal.data}
                                onChange={(e) =>
                                    setParcelaModal((prev) => ({
                                        ...prev,
                                        data: e.target.value,
                                    }))
                                }
                                className={inputBase}
                            />
                        </Field>
                    </div>

                    <div className="md:col-span-6">
                        <Field label="Quitação">
                            <select
                                value={parcelaModal.quitacao}
                                onChange={(e) =>
                                    setParcelaModal((prev) => ({
                                        ...prev,
                                        quitacao: e.target.value,
                                    }))
                                }
                                className={inputBase}
                            >
                                <option value=""></option>
                                <option value="1">Sim</option>
                                <option value="0">Não</option>
                            </select>
                        </Field>
                    </div>

                    <div className="md:col-span-6">
                        <Field label="Parcela">
                            <input
                                value={parcelaModal.parcela}
                                onChange={(e) =>
                                    setParcelaModal((prev) => ({
                                        ...prev,
                                        parcela: e.target.value,
                                    }))
                                }
                                className={inputBase}
                            />
                        </Field>
                    </div>

                    <div className="md:col-span-6">
                        <Field label="Valor">
                            <input
                                value={parcelaModal.valor}
                                onChange={(e) =>
                                    setParcelaModal((prev) => ({
                                        ...prev,
                                        valor: moneyInput(e.target.value),
                                    }))
                                }
                                className={inputBase}
                            />
                        </Field>
                    </div>

                    <div className="md:col-span-12">
                        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={() => {
                                    setModalParcelaOpen(false);
                                    limparParcelaModal();
                                }}
                                className={buttonSecondary}
                            >
                                Cancelar
                            </button>

                            <button
                                type="button"
                                onClick={salvarParcelaModal}
                                className={buttonPrimary}
                            >
                                {indexParcelaEditando !== null ? "Atualizar" : "Listar"}
                            </button>
                        </div>
                    </div>
                </div>
            </ModalShell>

            <ModalShell
                open={modalPagamentoOpen}
                title="Forma de Pagamento"
                subtitle="Cadastre ou edite a forma de pagamento."
                onClose={() => {
                    setModalPagamentoOpen(false);
                    limparPagamentoModal();
                }}
                maxWidth="max-w-xl"
            >
                <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
                    <div className="md:col-span-12">
                        <Field label="Forma de Pagamento">
                            <select
                                value={pagamentoModal.formaPagamento}
                                onChange={(e) =>
                                    setPagamentoModal((prev) => ({
                                        ...prev,
                                        formaPagamento: e.target.value,
                                    }))
                                }
                                className={inputBase}
                            >
                                <option value=""></option>
                                {formasPagamento.map((item, index) => (
                                    <option key={`${item}-${index}`} value={item}>
                                        {item}
                                    </option>
                                ))}
                            </select>
                        </Field>
                    </div>

                    <div className="md:col-span-12">
                        <Field label="Valor">
                            <input
                                value={pagamentoModal.valor}
                                onChange={(e) =>
                                    setPagamentoModal((prev) => ({
                                        ...prev,
                                        valor: moneyInput(e.target.value),
                                    }))
                                }
                                className={inputBase}
                            />
                        </Field>
                    </div>

                    <div className="md:col-span-12">
                        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={() => {
                                    setModalPagamentoOpen(false);
                                    limparPagamentoModal();
                                }}
                                className={buttonSecondary}
                            >
                                Cancelar
                            </button>

                            <button
                                type="button"
                                onClick={salvarPagamentoModal}
                                className={buttonPrimary}
                            >
                                {indexPagamentoEditando !== null ? "Atualizar" : "Listar"}
                            </button>
                        </div>
                    </div>
                </div>
            </ModalShell>
        </>
    );
}