"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
    FaCheckCircle,
    FaCloudUploadAlt,
    FaDownload,
    FaExclamationTriangle,
    FaFileInvoiceDollar,
    FaHistory,
    FaInfoCircle,
    FaPlus,
    FaSearch,
    FaSyncAlt,
    FaTable,
    FaTrash,
    FaUndoAlt,
    FaAddressBook,
    FaChevronLeft,
    FaChevronRight,
    FaDatabase,
    FaBuilding,
} from "react-icons/fa";

import {
    buscarFavorecidoPorCpf,
    gerarCnab240PorTransferencias,
    importarRetorno,
    listarRemessas,
    type RemessaCnab,
    type TransferenciaCnabPayload,
    listarDetalhesRemessa,
    type DetalheRemessaCnab,
} from "@/services/cnab240.service";

type LinhaTransferencia = TransferenciaCnabPayload & {
    id: string;
};

type PagamentoColado = {
    cpf: string;
    valor: number | undefined;
    tipo: 1 | 2 | undefined;
    descricao: string;
};

type PagamentoColadoValidado = PagamentoColado & {
    id: string;
    status: "OK" | "ERRO";
    mensagem: string;
    favorecido?: any;
    banco?: string;
    agencia?: string;
    conta?: string;
    dvConta?: string;
    nome?: string;
};

export function Cnab240Form() {
    const [arquivoRetorno, setArquivoRetorno] = useState<File | null>(null);

    const [remessas, setRemessas] = useState<RemessaCnab[]>([]);
    const [pageRemessas, setPageRemessas] = useState(1);
    const [limitRemessas, setLimitRemessas] = useState(10);
    const [busca, setBusca] = useState("");

    const [loading, setLoading] = useState(false);
    const [gerando, setGerando] = useState(false);
    const [conciliando, setConciliando] = useState(false);
    const [carregandoCpf, setCarregandoCpf] = useState(false);

    const [cpf, setCpf] = useState("");
    const [valor, setValor] = useState("");
    const [tipo, setTipo] = useState<1 | 2>(2);
    const [descricao, setDescricao] = useState("");

    const [modalDetalhesOpen, setModalDetalhesOpen] = useState(false);
    const [detalhesRemessa, setDetalhesRemessa] = useState<DetalheRemessaCnab[]>([]);
    const [loadingDetalhes, setLoadingDetalhes] = useState(false);

    const [pagamentosValidados, setPagamentosValidados] = useState<
        PagamentoColadoValidado[]
    >([]);
    const [validandoMassa, setValidandoMassa] = useState(false);

    const [mensagemModalMassa, setMensagemModalMassa] = useState("");
    const [tipoMensagemModalMassa, setTipoMensagemModalMassa] = useState<
        "success" | "error"
    >("error");

    const [linhas, setLinhas] = useState<LinhaTransferencia[]>([]);

    const [modalCpfsAberta, setModalCpfsAberta] = useState(false);
    const [cpfsEmMassa, setCpfsEmMassa] = useState("");
    const [valorEmMassa, setValorEmMassa] = useState("");
    const [tipoEmMassa, setTipoEmMassa] = useState<1 | 2>(2);
    const [descricaoEmMassa, setDescricaoEmMassa] = useState("");
    const [processandoMassa, setProcessandoMassa] = useState(false);

    const [mensagem, setMensagem] = useState("");
    const [tipoMensagem, setTipoMensagem] = useState<"success" | "error">(
        "success"
    );

    const remessasFiltradas = useMemo(() => {
        const termo = busca.trim().toLowerCase();

        if (!termo) return remessas;

        return remessas.filter((item) => {
            return (
                String(item.NM_ARQUIVO || "").toLowerCase().includes(termo) ||
                String(item.STATUS || "").toLowerCase().includes(termo)
            );
        });
    }, [busca, remessas]);

    const totalRemessas = remessas.length;

    const totalRemessasFiltradas = remessasFiltradas.length;
    const totalPagesRemessas = Math.max(
        Math.ceil(totalRemessasFiltradas / limitRemessas),
        1
    );

    const remessasPaginadas = useMemo(() => {
        const start = (pageRemessas - 1) * limitRemessas;
        const end = start + limitRemessas;

        return remessasFiltradas.slice(start, end);
    }, [remessasFiltradas, pageRemessas, limitRemessas]);

    const primeiroRegistroRemessa =
        totalRemessasFiltradas === 0 ? 0 : (pageRemessas - 1) * limitRemessas + 1;

    const ultimoRegistroRemessa = Math.min(
        pageRemessas * limitRemessas,
        totalRemessasFiltradas
    );

    const totalPagamentos = useMemo(() => {
        return remessas.reduce(
            (acc, item) => acc + Number(item.QT_PAGAMENTOS || 0),
            0
        );
    }, [remessas]);

    const valorTotalLinhas = useMemo(() => {
        return linhas.reduce((acc, item) => acc + Number(item.valor || 0), 0);
    }, [linhas]);

    const totalRetornosImportados = useMemo(() => {
        return remessas.filter((item) =>
            String(item.STATUS || "").toUpperCase().includes("CONCILI")
        ).length;
    }, [remessas]);

    function mostrarMensagem(texto: string, tipo: "success" | "error" = "success") {
        setMensagem(texto);
        setTipoMensagem(tipo);
    }

    function onlyDigits(value: string) {
        return value.replace(/\D/g, "");
    }

    function onlyCpfCnpjChars(value: string) {
        return String(value || "")
            .replace(/[^a-zA-Z0-9]/g, "")
            .toUpperCase();
    }

    function parseValor(value: string) {
        const cleaned = value
            .replace(/[^\d,.-]/g, "")
            .replace(/\./g, "")
            .replace(",", ".");

        const parsed = Number(cleaned);

        return Number.isFinite(parsed) ? parsed : 0;
    }

    function formatMoney(value: number | string | null | undefined) {
        const numero = Number(value || 0);

        return numero.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
        });
    }

    function formatCpf(value: string) {
        const digits = onlyDigits(value).slice(0, 11);

        return digits
            .replace(/^(\d{3})(\d)/, "$1.$2")
            .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
            .replace(/\.(\d{3})(\d)/, ".$1-$2");
    }

    async function carregarRemessas() {
        try {
            setLoading(true);

            const data = await listarRemessas();
            setRemessas(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error(error);
            mostrarMensagem(
                "Não foi possível carregar o histórico de remessas.",
                "error"
            );
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        carregarRemessas();
    }, []);

    function handleRetornoChange(e: ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];

        if (!file) return;

        setArquivoRetorno(file);
        setMensagem("");
    }

    async function adicionarTransferencia() {
        const cpfLimpo = onlyDigits(cpf);
        const valorNumerico = parseValor(valor);

        if (!cpfLimpo) {
            mostrarMensagem("Informe o CPF do favorecido.", "error");
            return;
        }

        if (!valorNumerico || valorNumerico <= 0) {
            mostrarMensagem("Informe um valor válido para pagamento.", "error");
            return;
        }

        try {
            setCarregandoCpf(true);
            setMensagem("");

            const favorecido = await buscarFavorecidoPorCpf(cpfLimpo);

            const banco = String(favorecido.BANCO || "").trim();
            const agencia = String(favorecido.AGENCIA || "").trim();
            const conta = String(favorecido.CONTA || "").trim();
            const dvConta = String(favorecido.DV_CONTA || "").trim();

            if (!banco || !agencia || !conta || !dvConta) {
                mostrarMensagem(
                    "Favorecido encontrado, mas está sem dados bancários cadastrados.",
                    "error"
                );
                return;
            }

            const novaLinha: LinhaTransferencia = {
                id:
                    typeof crypto !== "undefined" && crypto.randomUUID
                        ? crypto.randomUUID()
                        : `${Date.now()}-${Math.random()}`,

                sequencia: linhas.length + 1,
                cpfCnpj: onlyCpfCnpjChars(favorecido.CPF || cpfLimpo),
                banco,
                agencia,
                conta,
                dvConta,
                nome: String(favorecido.NOME || ""),
                valor: valorNumerico,
                tipo,
                descricao,
            };

            setLinhas((old) => [...old, novaLinha]);

            setCpf("");
            setValor("");
            setDescricao("");

            mostrarMensagem("Pagamento adicionado à remessa.", "success");
        } catch (error: any) {
            console.error(error);
            mostrarMensagem(
                error?.response?.data?.error ||
                error?.response?.data?.details ||
                "Favorecido não encontrado para o CPF informado.",
                "error"
            );
        } finally {
            setCarregandoCpf(false);
        }
    }

    async function adicionarTransferenciasEmMassa() {
        const validos = pagamentosValidados.filter((item) => item.status === "OK");

        if (validos.length === 0) {
            setMensagemModalMassa(
                "Nenhum pagamento válido para adicionar. Clique em validar antes ou corrija os erros."
            );
            setTipoMensagemModalMassa("error");
            return;
        }

        const novasLinhas: LinhaTransferencia[] = validos.map((item, index) => ({
            id:
                typeof crypto !== "undefined" && crypto.randomUUID
                    ? crypto.randomUUID()
                    : `${Date.now()}-${Math.random()}`,

            sequencia: linhas.length + index + 1,
            cpfCnpj: onlyCpfCnpjChars(item.favorecido?.CPF || item.cpf),
            banco: String(item.banco || ""),
            agencia: String(item.agencia || ""),
            conta: String(item.conta || ""),
            dvConta: String(item.dvConta || ""),
            nome: String(item.nome || ""),
            valor: Number(item.valor || 0),
            tipo: item.tipo ?? tipoEmMassa,
            descricao: item.descricao || descricaoEmMassa,
        }));

        setLinhas((old) => [...old, ...novasLinhas]);

        setMensagemModalMassa(
            `${novasLinhas.length} pagamento(s) adicionados com sucesso.`
        );
        setTipoMensagemModalMassa("success");

        setTimeout(() => {
            setModalCpfsAberta(false);
            setCpfsEmMassa("");
            setValorEmMassa("");
            setDescricaoEmMassa("");
            setMensagemModalMassa("");
            setPagamentosValidados([]);
        }, 1200);
    }

    function extrairPagamentosDoTexto(texto: string): PagamentoColado[] {
        return texto
            .split(/\r?\n/)
            .map((linha) => linha.trim())
            .filter(Boolean)
            .map((linha): PagamentoColado | null => {
                if (/^cpf/i.test(linha)) return null;

                const partes = linha.includes("\t")
                    ? linha.split("\t")
                    : linha.includes(";")
                        ? linha.split(";")
                        : linha.split(/\s+/);

                const cpf = onlyCpfCnpjChars(partes[0] || "");
                const valor = partes[1] ? parseValor(partes[1]) : undefined;

                const tipoTexto = String(partes[2] || "")
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "")
                    .toUpperCase()
                    .trim();

                const descricao = partes.slice(3).join(" ").trim();

                let tipoLinha: 1 | 2 | undefined;

                if (tipoTexto === "1" || tipoTexto.includes("CREDITO")) {
                    tipoLinha = 1;
                }

                if (tipoTexto === "2" || tipoTexto.includes("TED")) {
                    tipoLinha = 2;
                }

                return {
                    cpf,
                    valor,
                    tipo: tipoLinha,
                    descricao,
                };
            })
            .filter((item): item is PagamentoColado => {
                return !!item && (item.cpf.length === 11 || item.cpf.length === 14);
            });
    }

    async function validarPagamentosEmMassa() {
        const pagamentos = extrairPagamentosDoTexto(cpfsEmMassa);
        const valorPadrao = parseValor(valorEmMassa);

        if (pagamentos.length === 0) {
            setMensagemModalMassa("Cole pelo menos um CPF/CNPJ válido.");
            setTipoMensagemModalMassa("error");
            setPagamentosValidados([]);
            return;
        }

        try {
            setValidandoMassa(true);
            setMensagemModalMassa("");

            const resultado: PagamentoColadoValidado[] = [];

            for (const item of pagamentos) {
                const valorFinal =
                    item.valor && item.valor > 0 ? item.valor : valorPadrao;

                const tipoFinal = item.tipo ?? tipoEmMassa;
                const descricaoFinal = item.descricao || descricaoEmMassa;

                const base: PagamentoColadoValidado = {
                    ...item,
                    id:
                        typeof crypto !== "undefined" && crypto.randomUUID
                            ? crypto.randomUUID()
                            : `${Date.now()}-${Math.random()}`,
                    valor: valorFinal,
                    tipo: tipoFinal,
                    descricao: descricaoFinal,
                    status: "ERRO",
                    mensagem: "",
                };

                if (!valorFinal || valorFinal <= 0) {
                    resultado.push({
                        ...base,
                        mensagem: "Valor não informado",
                    });
                    continue;
                }

                try {
                    const favorecido = await buscarFavorecidoPorCpf(item.cpf);

                    const banco = String(favorecido.BANCO || "").trim();
                    const agencia = String(favorecido.AGENCIA || "").trim();
                    const conta = String(favorecido.CONTA || "").trim();
                    const dvConta = String(favorecido.DV_CONTA || "").trim();

                    if (!banco || !agencia || !conta || !dvConta) {
                        resultado.push({
                            ...base,
                            favorecido,
                            nome: String(favorecido.NOME || ""),
                            banco,
                            agencia,
                            conta,
                            dvConta,
                            mensagem: "Sem dados bancários",
                        });
                        continue;
                    }

                    resultado.push({
                        ...base,
                        favorecido,
                        nome: String(favorecido.NOME || ""),
                        banco,
                        agencia,
                        conta,
                        dvConta,
                        status: "OK",
                        mensagem: "Pronto para adicionar",
                    });
                } catch {
                    resultado.push({
                        ...base,
                        mensagem: "Favorecido não encontrado",
                    });
                }
            }

            setPagamentosValidados(resultado);

            const ok = resultado.filter((item) => item.status === "OK").length;
            const erro = resultado.length - ok;

            setMensagemModalMassa(
                `${ok} pagamento(s) pronto(s) para adicionar. ${erro} com erro.`
            );
            setTipoMensagemModalMassa(erro > 0 ? "error" : "success");
        } finally {
            setValidandoMassa(false);
        }
    }

    function removerTransferencia(id: string) {
        setLinhas((old) =>
            old
                .filter((item) => item.id !== id)
                .map((item, index) => ({
                    ...item,
                    sequencia: index + 1,
                }))
        );
    }

    async function onGerarCnab240() {
        if (linhas.length === 0) {
            mostrarMensagem("Adicione pelo menos um pagamento antes de gerar o CNAB240.", "error");
            return;
        }

        try {
            setGerando(true);
            setMensagem("");

            const payload = linhas.map(({ id, ...rest }) => rest);

            const blob = await gerarCnab240PorTransferencias(payload);

            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");

            link.href = url;
            link.download = `CNAB240_${new Date()
                .toISOString()
                .slice(0, 19)
                .replace(/[-:T]/g, "")}.txt`;

            document.body.appendChild(link);
            link.click();
            link.remove();

            window.URL.revokeObjectURL(url);

            mostrarMensagem("Arquivo CNAB240 gerado com sucesso.", "success");
            setLinhas([]);
            await carregarRemessas();
        } catch (error: any) {
            console.error(error);
            mostrarMensagem(
                error?.response?.data?.details ||
                error?.response?.data?.error ||
                error?.message ||
                "Erro ao gerar o arquivo CNAB240.",
                "error"
            );
        } finally {
            setGerando(false);
        }
    }

    async function onConciliarRetorno() {
        if (!arquivoRetorno) {
            mostrarMensagem(
                "Selecione o extrato ou arquivo de retorno antes de conciliar.",
                "error"
            );
            return;
        }

        try {
            setConciliando(true);
            setMensagem("");

            await importarRetorno(arquivoRetorno);

            mostrarMensagem("Arquivo importado para conciliação com sucesso.", "success");
            await carregarRemessas();
        } catch (error) {
            console.error(error);
            mostrarMensagem("Erro ao importar o arquivo para conciliação.", "error");
        } finally {
            setConciliando(false);
        }
    }

    async function abrirDetalhesRemessa(idLote: number) {
        try {
            setLoadingDetalhes(true);
            setModalDetalhesOpen(true);

            const data = await listarDetalhesRemessa(idLote);
            setDetalhesRemessa(data);
        } catch (error) {
            console.error(error);
            mostrarMensagem("Erro ao carregar detalhes da remessa.", "error");
        } finally {
            setLoadingDetalhes(false);
        }
    }

    const pagamentosEmMassa = useMemo(
        () => extrairPagamentosDoTexto(cpfsEmMassa),
        [cpfsEmMassa]
    );

    return (
        <div className="space-y-6">
            <div className="min-w-225 mx-auto rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 overflow-hidden">
                <div className="border-b border-gray-100 bg-linear-to-r from-[#00AE9D]/8 via-white to-[#C7D300]/10 px-6 py-6">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                        <CardResumo
                            titulo="Remessas geradas"
                            valor={String(totalRemessas)}
                            icone={<FaFileInvoiceDollar />}
                            cor="text-[#00AE9D]"
                        />

                        <CardResumo
                            titulo="Pagamentos"
                            valor={String(totalPagamentos)}
                            icone={<FaCheckCircle />}
                            cor="text-emerald-700"
                        />

                        <CardResumo
                            titulo="Devolvidos"
                            valor="0"
                            icone={<FaExclamationTriangle />}
                            cor="text-red-600"
                        />

                        <CardResumo
                            titulo="Retornos importados"
                            valor={String(totalRetornosImportados)}
                            icone={<FaHistory />}
                            cor="text-blue-700"
                        />
                    </div>
                </div>

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

                    <div className="space-y-6">
                        <div className="space-y-6">
                            <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-5">
                                <div className="mb-4 flex items-center gap-2">
                                    <FaFileInvoiceDollar className="text-primary" />
                                    <h3 className="text-sm font-semibold text-gray-900">
                                        Transferências da remessa
                                    </h3>
                                </div>

                                <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
                                    <div>
                                        <label className="mb-1 block text-xs font-semibold text-gray-600">
                                            CPF
                                        </label>
                                        <input
                                            value={cpf}
                                            onChange={(e) => setCpf(formatCpf(e.target.value))}
                                            placeholder="000.000.000-00"
                                            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-1 block text-xs font-semibold text-gray-600">
                                            Valor
                                        </label>
                                        <input
                                            value={valor}
                                            onChange={(e) => setValor(e.target.value)}
                                            placeholder="0,00"
                                            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-1 block text-xs font-semibold text-gray-600">
                                            Tipo
                                        </label>
                                        <select
                                            value={tipo}
                                            onChange={(e) => setTipo(Number(e.target.value) as 1 | 2)}
                                            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
                                        >
                                            <option value={1}>Crédito bancário</option>
                                            <option value={2}>TED</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="mb-1 block text-xs font-semibold text-gray-600">
                                            Descrição
                                        </label>
                                        <input
                                            value={descricao}
                                            onChange={(e) => setDescricao(e.target.value)}
                                            placeholder="Descrição do pagamento"
                                            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
                                        />
                                    </div>
                                </div>

                                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-between">
                                    <button
                                        type="button"
                                        onClick={adicionarTransferencia}
                                        disabled={carregandoCpf}
                                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-5 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                                    >
                                        <FaPlus />
                                        {carregandoCpf ? "Buscando CPF..." : "Adicionar pagamento"}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setMensagemModalMassa("");
                                            setModalCpfsAberta(true);
                                        }}
                                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#00AE9D]/20 bg-[#00AE9D]/10 px-5 text-sm font-semibold text-[#007f73] shadow-sm transition hover:bg-[#00AE9D]/15 cursor-pointer"
                                    >
                                        <FaPlus />
                                        Colar vários CPF&apos;s
                                    </button>

                                    <button
                                        type="button"
                                        onClick={onGerarCnab240}
                                        disabled={linhas.length === 0 || gerando}
                                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-secondary px-5 text-sm font-semibold text-white shadow-sm transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                                    >
                                        <FaDownload />
                                        {gerando ? "Gerando..." : "Gerar CNAB240"}
                                    </button>
                                </div>

                                <div className="mt-6 overflow-x-auto">
                                    <table className="min-w-full border-separate border-spacing-y-3">
                                        <thead>
                                            <tr>
                                                <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                                    Seq
                                                </th>
                                                <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                                    CPF
                                                </th>
                                                <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                                    Nome
                                                </th>
                                                <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                                    Banco
                                                </th>
                                                <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                                    Agência
                                                </th>
                                                <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                                    Conta
                                                </th>
                                                <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                                    Valor
                                                </th>
                                                <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                                                    Ações
                                                </th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {linhas.length === 0 ? (
                                                <tr>
                                                    <td
                                                        colSpan={8}
                                                        className="px-4 py-10 text-center text-sm text-gray-500"
                                                    >
                                                        Nenhum pagamento adicionado até o momento.
                                                    </td>
                                                </tr>
                                            ) : (
                                                linhas.map((item) => (
                                                    <tr key={item.id} className="bg-white">
                                                        <td className="rounded-l-2xl px-4 py-4 text-sm text-gray-700">
                                                            {item.sequencia}
                                                        </td>

                                                        <td className="px-4 py-4 text-sm text-gray-700">
                                                            {item.cpfCnpj}
                                                        </td>

                                                        <td className="px-4 py-4 text-sm font-semibold text-gray-800">
                                                            {item.nome}
                                                        </td>

                                                        <td className="px-4 py-4 text-sm text-gray-700">
                                                            {item.banco}
                                                        </td>

                                                        <td className="px-4 py-4 text-sm text-gray-700">
                                                            {item.agencia}
                                                        </td>

                                                        <td className="px-4 py-4 text-sm text-gray-700">
                                                            {item.conta}-{item.dvConta}
                                                        </td>

                                                        <td className="px-4 py-4 text-sm font-semibold text-gray-800">
                                                            {formatMoney(item.valor)}
                                                        </td>

                                                        <td className="rounded-r-2xl px-4 py-4 text-right">
                                                            <button
                                                                type="button"
                                                                onClick={() => removerTransferencia(item.id)}
                                                                className="inline-flex h-9 items-center justify-center rounded-xl border border-red-200 bg-red-50 px-4 text-xs font-semibold text-red-600 transition hover:bg-red-100"
                                                            >
                                                                <FaTrash />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                                <div className="rounded-2xl border border-[#79B729]/20 bg-[#79B729]/10 p-5">
                                    <div className="flex items-start gap-3">
                                        <FaInfoCircle className="mt-0.5 shrink-0 text-secondary" />

                                        <div>
                                            <p className="text-sm font-semibold text-gray-800">
                                                Fluxo da tela
                                            </p>

                                            <p className="mt-1 text-xs leading-6 text-gray-600">
                                                O usuário informa CPF, valor, tipo e descrição. O sistema
                                                busca os dados bancários do favorecido, monta a lista de
                                                pagamentos e gera o TXT CNAB240.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-[#00AE9D]/20 bg-[#00AE9D]/5 p-5 shadow-sm">
                                    <div className="flex items-start gap-3">
                                        <FaAddressBook className="mt-0.5 shrink-0 text-[#00AE9D]" />

                                        <div className="flex-1">
                                            <p className="text-sm font-semibold text-gray-800">
                                                Cadastro de favorecidos
                                            </p>

                                            <p className="mt-1 text-xs leading-6 text-gray-600">
                                                Cadastre e mantenha os favorecidos atualizados. Ao informar
                                                apenas o CPF na geração do CNAB240, os dados bancários serão
                                                preenchidos automaticamente.
                                            </p>

                                            <Link
                                                href="/auth/cnab240_favorecidos"
                                                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-[#00AE9D]/20 transition hover:bg-secondary"
                                            >
                                                <FaAddressBook />
                                                Gerenciar favorecidos
                                            </Link>
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
                                    <div className="flex items-start gap-3">
                                        <FaDatabase className="mt-0.5 shrink-0 text-fourth" />

                                        <div className="flex-1">
                                            <p className="text-sm font-semibold text-gray-800">
                                                Contas CCO
                                            </p>

                                            <p className="mt-1 text-xs leading-6 text-gray-600">
                                                Cadastre e mantenha as contas CCO utilizadas na geração do
                                                CNAB240. A chave CPF + Ativa é gerada automaticamente.
                                            </p>

                                            <Link
                                                href="/auth/cnab240_cco"
                                                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-fourth px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
                                            >
                                                <FaDatabase />
                                                Gerenciar CCO
                                            </Link>
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-orange-200 bg-orange-50 p-5 shadow-sm">
                                    <div className="flex items-start gap-3">
                                        <FaBuilding className="mt-0.5 shrink-0 text-orange-600" />

                                        <div className="flex-1">
                                            <p className="text-sm font-semibold text-gray-800">
                                                Agências CNAB240
                                            </p>

                                            <p className="mt-1 text-xs leading-6 text-gray-600">
                                                Cadastre e mantenha as agências utilizadas na geração dos
                                                arquivos CNAB240.
                                            </p>

                                            <Link
                                                href="/auth/cnab240_agencias"
                                                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-600/20 transition hover:bg-orange-700"
                                            >
                                                <FaBuilding />
                                                Gerenciar agências
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/*<div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-5">
                                <div className="mb-4 flex items-center gap-2">
                                    <FaSyncAlt className="text-blue-600" />
                                    <h3 className="text-sm font-semibold text-gray-900">
                                        Importação do extrato/retorno bancário
                                    </h3>
                                </div>

                                <label className="flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-white p-8 text-center transition hover:bg-gray-50">
                                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                                        <FaCloudUploadAlt size={22} />
                                    </div>

                                    <p className="mt-4 text-sm font-semibold text-gray-800">
                                        {arquivoRetorno
                                            ? arquivoRetorno.name
                                            : "Selecionar extrato ou retorno"}
                                    </p>

                                    <p className="mt-1 text-xs text-gray-500">
                                        Arquivo utilizado para conferência dos pagamentos
                                    </p>

                                    <input
                                        type="file"
                                        accept=".txt,.csv,.xlsx,.xls"
                                        className="hidden"
                                        onChange={handleRetornoChange}
                                    />
                                </label>

                                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
                                    <button
                                        type="button"
                                        onClick={onConciliarRetorno}
                                        disabled={!arquivoRetorno || conciliando}
                                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        <FaSyncAlt />
                                        {conciliando ? "Conciliando..." : "Conciliar arquivo"}
                                    </button>
                                </div>
                            </div>*/}
                        </div>

                        {/*<div className="space-y-6">
                            <div className="rounded-2xl border border-[#79B729]/20 bg-[#79B729]/10 p-5">
                                <div className="flex items-start gap-3">
                                    <FaInfoCircle className="mt-0.5 shrink-0 text-secondary" />
                                    <div>
                                        <p className="text-sm font-semibold text-gray-800">
                                            Fluxo da tela
                                        </p>

                                        <p className="mt-1 text-xs leading-6 text-gray-600">
                                            O usuário informa CPF, valor, tipo e descrição. O sistema
                                            busca os dados bancários do favorecido, monta a lista de
                                            pagamentos e gera o TXT CNAB240.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-[#00AE9D]/20 bg-[#00AE9D]/5 p-5 shadow-sm">
                                <div className="flex items-start gap-3">
                                    <FaAddressBook className="mt-0.5 shrink-0 text-[#00AE9D]" />

                                    <div className="flex-1">
                                        <p className="text-sm font-semibold text-gray-800">
                                            Cadastro de favorecidos
                                        </p>

                                        <p className="mt-1 text-xs leading-6 text-gray-600">
                                            Cadastre e mantenha os favorecidos atualizados. Ao informar
                                            apenas o CPF na geração do CNAB240, os dados bancários serão
                                            preenchidos automaticamente.
                                        </p>

                                        <Link
                                            href="/auth/cnab240_favorecidos"
                                            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-[#00AE9D]/20 transition hover:bg-secondary"
                                        >
                                            <FaAddressBook />
                                            Gerenciar favorecidos
                                        </Link>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
                                <div className="flex items-start gap-3">
                                    <FaDatabase className="mt-0.5 shrink-0 text-fourth" />

                                    <div className="flex-1">
                                        <p className="text-sm font-semibold text-gray-800">
                                            Contas CCO
                                        </p>

                                        <p className="mt-1 text-xs leading-6 text-gray-600">
                                            Cadastre e mantenha as contas CCO utilizadas na geração do
                                            CNAB240. A chave CPF + Ativa é gerada automaticamente.
                                        </p>

                                        <Link
                                            href="/auth/cnab240_cco"
                                            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-fourth px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
                                        >
                                            <FaDatabase />
                                            Gerenciar CCO
                                        </Link>
                                    </div>
                                </div>
                            </div>

                            {/*<div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                                <h4 className="text-sm font-semibold text-gray-900">
                                    Resumo da próxima remessa
                                </h4>

                                <div className="mt-4 space-y-3">
                                    <LinhaResumo
                                        label="Quantidade de pagamentos"
                                        value={String(linhas.length)}
                                    />

                                    <LinhaResumo
                                        label="Valor total"
                                        value={formatMoney(valorTotalLinhas)}
                                    />

                                    <LinhaResumo
                                        label="Registros com erro"
                                        value="0"
                                    />
                                </div>
                            </div>*/}

                        {/*<div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                                <h4 className="text-sm font-semibold text-gray-900">
                                    Ações futuras
                                </h4>

                                <div className="mt-4 space-y-3">
                                    <button
                                        type="button"
                                        disabled
                                        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-5 text-sm font-semibold text-gray-500 disabled:cursor-not-allowed disabled:opacity-70"
                                    >
                                        <FaTable />
                                        Exportar relatório
                                    </button>

                                    <button
                                        type="button"
                                        disabled
                                        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-5 text-sm font-semibold text-gray-500 disabled:cursor-not-allowed disabled:opacity-70"
                                    >
                                        <FaUndoAlt />
                                        Regerar devolvidos
                                    </button>
                                </div>
                            </div>
                        </div>*/}
                    </div>
                </div>
            </div>

            {/* histórico */}
            <div className="min-w-225 mx-auto rounded-3xl bg-white shadow-sm ring-1 ring-slate-100 overflow-hidden">
                <div className="border-b border-slate-100 px-6 py-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900">
                                Histórico de remessas e retornos
                            </h3>

                            <p className="mt-1 text-sm text-slate-500">
                                Consulte os arquivos gerados, retornos importados e status da conciliação.
                            </p>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                            <select
                                value={limitRemessas}
                                onChange={(e) => {
                                    setLimitRemessas(Number(e.target.value));
                                    setPageRemessas(1);
                                }}
                                className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-[#00AE9D] focus:ring-4 focus:ring-[#00AE9D]/10"
                            >
                                <option value={10}>10 por página</option>
                                <option value={20}>20 por página</option>
                                <option value={50}>50 por página</option>
                                <option value={100}>100 por página</option>
                            </select>

                            <div className="relative w-full sm:w-80 lg:w-96">
                                <FaSearch className="absolute left-4 top-3.5 text-slate-400" />

                                <input
                                    value={busca}
                                    onChange={(e) => {
                                        setBusca(e.target.value);
                                        setPageRemessas(1);
                                    }}
                                    placeholder="Buscar por arquivo ou status..."
                                    className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-[#00AE9D] focus:ring-4 focus:ring-[#00AE9D]/10"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="px-6 py-5">
                    <div className="overflow-x-auto">
                        <table className="min-w-full border-separate border-spacing-y-3">
                            <thead>
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-bold uppercase tracking-wide text-slate-400">
                                        Arquivo
                                    </th>

                                    <th className="px-4 py-2 text-left text-xs font-bold uppercase tracking-wide text-slate-400">
                                        Data geração
                                    </th>

                                    <th className="px-4 py-2 text-left text-xs font-bold uppercase tracking-wide text-slate-400">
                                        Pagamentos
                                    </th>

                                    <th className="px-4 py-2 text-left text-xs font-bold uppercase tracking-wide text-slate-400">
                                        Valor total
                                    </th>

                                    <th className="px-4 py-2 text-left text-xs font-bold uppercase tracking-wide text-slate-400">
                                        Status
                                    </th>

                                    <th className="px-4 py-2 text-right text-xs font-bold uppercase tracking-wide text-slate-400">
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
                                            Carregando histórico...
                                        </td>
                                    </tr>
                                ) : remessasPaginadas.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={6}
                                            className="px-4 py-16 text-center text-sm text-slate-500"
                                        >
                                            Nenhuma remessa gerada até o momento.
                                        </td>
                                    </tr>
                                ) : (
                                    remessasPaginadas.map((item: any) => (
                                        <tr key={item.ID_REMESSA} className="bg-slate-50">
                                            <td className="rounded-l-2xl px-4 py-4 text-sm font-bold text-slate-800">
                                                {item.NM_ARQUIVO}
                                            </td>

                                            <td className="px-4 py-4 text-sm text-slate-600">
                                                {item.DT_GERACAO || "-"}
                                            </td>

                                            <td className="px-4 py-4 text-sm text-slate-600">
                                                {item.QT_PAGAMENTOS || 0}
                                            </td>

                                            <td className="px-4 py-4 text-sm text-slate-600">
                                                {formatMoney(item.VL_TOTAL)}
                                            </td>

                                            <td className="px-4 py-4 text-sm">
                                                <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                                                    {item.STATUS || "GERADO"}
                                                </span>
                                            </td>

                                            <td className="rounded-r-2xl px-4 py-4 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        abrirDetalhesRemessa(Number(item.ID_REMESSA))
                                                    }
                                                    className="inline-flex h-9 items-center justify-center rounded-xl bg-secondary px-4 text-xs font-bold text-white transition hover:bg-primary"
                                                >
                                                    Ver detalhes
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
                                {primeiroRegistroRemessa}
                            </span>{" "}
                            até{" "}
                            <span className="font-semibold text-slate-700">
                                {ultimoRegistroRemessa}
                            </span>{" "}
                            de{" "}
                            <span className="font-semibold text-slate-700">
                                {totalRemessasFiltradas}
                            </span>{" "}
                            remessas
                        </p>

                        <div className="flex items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={() =>
                                    setPageRemessas((old) => Math.max(old - 1, 1))
                                }
                                disabled={pageRemessas <= 1 || loading}
                                className="inline-flex h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <FaChevronLeft />
                                Anterior
                            </button>

                            <span className="rounded-2xl bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">
                                Página {pageRemessas} de {totalPagesRemessas}
                            </span>

                            <button
                                type="button"
                                onClick={() =>
                                    setPageRemessas((old) =>
                                        Math.min(old + 1, totalPagesRemessas)
                                    )
                                }
                                disabled={pageRemessas >= totalPagesRemessas || loading}
                                className="inline-flex h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Próxima
                                <FaChevronRight />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            {modalDetalhesOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-6xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl">
                        <div className="bg-linear-to-r from-[#00AE9D]/10 via-white to-[#79B729]/10 px-6 py-5">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
                                        Detalhes da remessa
                                    </p>

                                    <h2 className="mt-1 text-2xl font-bold text-slate-800">
                                        Pagamentos da remessa CNAB240
                                    </h2>

                                    <p className="mt-1 text-sm text-slate-500">
                                        Consulte os favorecidos, dados bancários, tipo de transferência e valores vinculados ao lote.
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setModalDetalhesOpen(false)}
                                    className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-xl text-slate-500 transition hover:border-red-200 hover:text-red-500 cursor-pointer"
                                >
                                    ×
                                </button>
                            </div>
                        </div>

                        <div className="space-y-5 p-6">
                            {mensagemModalMassa && (
                                <div
                                    className={`rounded-2xl px-4 py-3 text-sm font-medium ${tipoMensagemModalMassa === "success"
                                        ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                                        : "border border-red-200 bg-red-50 text-red-700"
                                        }`}
                                >
                                    {mensagemModalMassa}
                                </div>
                            )}
                            <div className="grid gap-4 rounded-3xl border border-slate-200 bg-slate-50/70 p-4 sm:grid-cols-3">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                                        Pagamentos
                                    </p>
                                    <p className="mt-1 text-lg font-bold text-slate-800">
                                        {detalhesRemessa.length}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                                        Valor total
                                    </p>
                                    <p className="mt-1 text-lg font-bold text-slate-800">
                                        {formatMoney(
                                            detalhesRemessa.reduce(
                                                (acc, item) => acc + Number(item.VALOR || 0),
                                                0
                                            )
                                        )}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                                        Status
                                    </p>
                                    <span className="mt-1 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                                        GERADO
                                    </span>
                                </div>
                            </div>

                            <div className="overflow-hidden rounded-3xl border border-slate-200">
                                {loadingDetalhes ? (
                                    <div className="py-14 text-center text-sm font-medium text-slate-500">
                                        Carregando detalhes da remessa...
                                    </div>
                                ) : detalhesRemessa.length === 0 ? (
                                    <div className="py-14 text-center text-sm font-medium text-slate-500">
                                        Nenhum pagamento encontrado para esta remessa.
                                    </div>
                                ) : (
                                    <div className="max-h-[55vh] overflow-auto">
                                        <table className="min-w-full">
                                            <thead className="sticky top-0 z-10 bg-slate-100">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                                                        Seq
                                                    </th>
                                                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                                                        CPF
                                                    </th>
                                                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                                                        Favorecido
                                                    </th>
                                                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                                                        Banco
                                                    </th>
                                                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                                                        Agência
                                                    </th>
                                                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                                                        Conta
                                                    </th>
                                                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                                                        Tipo
                                                    </th>
                                                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-500">
                                                        Valor
                                                    </th>
                                                </tr>
                                            </thead>

                                            <tbody className="divide-y divide-slate-100 bg-white">
                                                {detalhesRemessa.map((item) => (
                                                    <tr key={item.ID_DETALHE} className="transition hover:bg-slate-50">
                                                        <td className="px-4 py-4 text-sm font-semibold text-slate-700">
                                                            {item.SEQ}
                                                        </td>

                                                        <td className="px-4 py-4 text-sm text-slate-600">
                                                            {item.CPF}
                                                        </td>

                                                        <td className="px-4 py-4 text-sm font-bold text-slate-800">
                                                            {item.NOME}
                                                        </td>

                                                        <td className="px-4 py-4 text-sm text-slate-600">
                                                            {item.BANCO}
                                                        </td>

                                                        <td className="px-4 py-4 text-sm text-slate-600">
                                                            {item.AGENCIA}
                                                        </td>

                                                        <td className="px-4 py-4 text-sm text-slate-600">
                                                            {item.CONTA}-{item.DV_CONTA}
                                                        </td>

                                                        <td className="px-4 py-4 text-sm">
                                                            <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                                                                {Number(item.TIPO) === 1 ? "Crédito bancário" : "TED"}
                                                            </span>
                                                        </td>

                                                        <td className="px-4 py-4 text-right text-sm font-bold text-slate-800">
                                                            {formatMoney(item.VALOR)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                                <button
                                    type="button"
                                    onClick={() => setModalDetalhesOpen(false)}
                                    className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 cursor-pointer"
                                >
                                    Fechar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {modalCpfsAberta && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
                    <div className="max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl">
                        <div className="bg-linear-to-r from-[#00AE9D]/10 via-white to-[#79B729]/10 px-6 py-5">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
                                        Inclusão em massa
                                    </p>

                                    <h2 className="mt-1 text-2xl font-bold text-slate-800">
                                        Colar pagamentos do Excel
                                    </h2>

                                    <p className="mt-1 text-sm text-slate-500">
                                        Cole uma tabela com CPF, valor, tipo e descrição. Valide os dados antes de adicionar na remessa.
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setModalCpfsAberta(false)}
                                    disabled={processandoMassa || validandoMassa}
                                    className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-xl text-slate-500 transition hover:border-red-200 hover:text-red-500 disabled:opacity-60"
                                >
                                    ×
                                </button>
                            </div>
                        </div>

                        <div className="max-h-[74vh] space-y-5 overflow-y-auto p-6">
                            {mensagemModalMassa && (
                                <div
                                    className={`rounded-2xl px-4 py-3 text-sm font-medium ${tipoMensagemModalMassa === "success"
                                        ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                                        : "border border-red-200 bg-red-50 text-red-700"
                                        }`}
                                >
                                    {mensagemModalMassa}
                                </div>
                            )}

                            <div className="rounded-3xl border border-[#00AE9D]/20 bg-[#00AE9D]/5 p-4">
                                <p className="text-sm font-semibold text-slate-800">
                                    Formatos aceitos
                                </p>

                                <p className="mt-1 text-xs leading-6 text-slate-600">
                                    Você pode colar apenas CPF&apos;s, ou uma tabela copiada do Excel seguindo esta ordem:
                                    <strong> CPF | Valor | Tipo | Descrição</strong>.
                                </p>

                                <pre className="mt-3 overflow-x-auto rounded-2xl bg-white p-3 text-xs leading-6 text-slate-600 ring-1 ring-slate-200">
                                    {`CPF            VALOR     TIPO              DESCRIÇÃO
11111111111    150,00    TED               Reembolso
22222222222    250,00    Crédito bancário  Pagamento
33333333333    80,50     2                 Ajuda de custo`}
                                </pre>
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">
                                    Pagamentos colados
                                </label>

                                <textarea
                                    value={cpfsEmMassa}
                                    onChange={(e) => {
                                        setCpfsEmMassa(e.target.value);
                                        setPagamentosValidados([]);
                                        setMensagemModalMassa("");
                                    }}
                                    rows={8}
                                    placeholder={`Cole aqui os dados copiados do Excel:

CPF     VALOR     TIPO     DESCRIÇÃO
11111111111    150,00    TED     Reembolso
22222222222    250,00    Crédito bancário     Pagamento

Ou apenas CPF's:
11111111111
22222222222`}
                                    className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#00AE9D] focus:ring-4 focus:ring-[#00AE9D]/10"
                                />

                                <p className="mt-2 text-xs text-slate-500">
                                    Pagamentos encontrados no texto:{" "}
                                    <strong>{pagamentosEmMassa.length}</strong>
                                </p>
                            </div>

                            <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
                                <p className="mb-4 text-sm font-semibold text-slate-800">
                                    Dados padrão
                                </p>

                                <div className="grid gap-4 md:grid-cols-3">
                                    <div>
                                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                                            Valor padrão
                                        </label>

                                        <input
                                            value={valorEmMassa}
                                            onChange={(e) => {
                                                setValorEmMassa(e.target.value);
                                                setPagamentosValidados([]);
                                                setMensagemModalMassa("");
                                            }}
                                            placeholder="Usado se a linha não tiver valor"
                                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#00AE9D] focus:ring-4 focus:ring-[#00AE9D]/10"
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                                            Tipo padrão
                                        </label>

                                        <select
                                            value={tipoEmMassa}
                                            onChange={(e) => {
                                                setTipoEmMassa(Number(e.target.value) as 1 | 2);
                                                setPagamentosValidados([]);
                                                setMensagemModalMassa("");
                                            }}
                                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#00AE9D] focus:ring-4 focus:ring-[#00AE9D]/10"
                                        >
                                            <option value={1}>Crédito bancário</option>
                                            <option value={2}>TED</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                                            Descrição padrão
                                        </label>

                                        <input
                                            value={descricaoEmMassa}
                                            onChange={(e) => {
                                                setDescricaoEmMassa(e.target.value);
                                                setPagamentosValidados([]);
                                                setMensagemModalMassa("");
                                            }}
                                            placeholder="Usada se a linha não tiver descrição"
                                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#00AE9D] focus:ring-4 focus:ring-[#00AE9D]/10"
                                        />
                                    </div>
                                </div>
                            </div>

                            {pagamentosValidados.length > 0 && (
                                <div className="overflow-hidden rounded-3xl border border-slate-200">
                                    <div className="flex flex-col gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                            <p className="text-sm font-semibold text-slate-800">
                                                Pré-validação dos pagamentos
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                Apenas os pagamentos com status OK serão adicionados à remessa.
                                            </p>
                                        </div>

                                        <div className="flex gap-2 text-xs font-semibold">
                                            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700">
                                                OK: {pagamentosValidados.filter((item) => item.status === "OK").length}
                                            </span>

                                            <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-red-700">
                                                Erros: {pagamentosValidados.filter((item) => item.status === "ERRO").length}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="max-h-72 overflow-auto">
                                        <table className="min-w-full">
                                            <thead className="sticky top-0 z-10 bg-slate-100">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-500">
                                                        CPF/CNPJ
                                                    </th>
                                                    <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-500">
                                                        Favorecido
                                                    </th>
                                                    <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-500">
                                                        Valor
                                                    </th>
                                                    <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-500">
                                                        Tipo
                                                    </th>
                                                    <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-500">
                                                        Descrição
                                                    </th>
                                                    <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-500">
                                                        Situação
                                                    </th>
                                                </tr>
                                            </thead>

                                            <tbody className="divide-y divide-slate-100 bg-white">
                                                {pagamentosValidados.map((item) => (
                                                    <tr key={item.id} className="transition hover:bg-slate-50">
                                                        <td className="px-4 py-3 text-sm font-semibold text-slate-700">
                                                            {item.cpf}
                                                        </td>

                                                        <td className="px-4 py-3 text-sm text-slate-600">
                                                            {item.nome || "-"}
                                                        </td>

                                                        <td className="px-4 py-3 text-sm font-semibold text-slate-700">
                                                            {formatMoney(item.valor || 0)}
                                                        </td>

                                                        <td className="px-4 py-3 text-sm text-slate-600">
                                                            {Number(item.tipo) === 1 ? "Crédito" : "TED"}
                                                        </td>

                                                        <td className="px-4 py-3 text-sm text-slate-600">
                                                            {item.descricao || "-"}
                                                        </td>

                                                        <td className="px-4 py-3 text-sm">
                                                            <span
                                                                className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${item.status === "OK"
                                                                    ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                                                                    : "border border-red-200 bg-red-50 text-red-700"
                                                                    }`}
                                                            >
                                                                {item.status === "OK"
                                                                    ? "OK"
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

                            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                                <button
                                    type="button"
                                    onClick={() => setModalCpfsAberta(false)}
                                    disabled={processandoMassa || validandoMassa}
                                    className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 cursor-pointer"
                                >
                                    Cancelar
                                </button>

                                <button
                                    type="button"
                                    onClick={validarPagamentosEmMassa}
                                    disabled={validandoMassa || processandoMassa}
                                    className="rounded-2xl border border-[#00AE9D]/20 bg-[#00AE9D]/10 px-5 py-3 text-sm font-semibold text-[#007f73] transition hover:bg-[#00AE9D]/15 disabled:opacity-60 cursor-pointer"
                                >
                                    {validandoMassa ? "Validando..." : "Validar pagamentos"}
                                </button>

                                <button
                                    type="button"
                                    onClick={adicionarTransferenciasEmMassa}
                                    disabled={
                                        processandoMassa ||
                                        pagamentosValidados.filter((item) => item.status === "OK").length === 0
                                    }
                                    className="rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#00AE9D]/20 transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                                >
                                    {processandoMassa
                                        ? "Adicionando..."
                                        : `Adicionar ${pagamentosValidados.filter((item) => item.status === "OK").length || ""
                                        } pagamento(s)`}
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
    icone,
    cor,
}: {
    titulo: string;
    valor: string | number;
    icone: React.ReactNode;
    cor: string;
}) {
    const valorFormatado = Number(valor || 0).toLocaleString("pt-BR");

    return (
        <div className="rounded-2xl bg-white/90 px-4 py-4 shadow-sm ring-1 ring-gray-100">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                        {titulo}
                    </p>

                    <p className="mt-2 text-2xl font-semibold text-gray-900">
                        {valorFormatado}
                    </p>
                </div>

                <div
                    className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-50 ${cor}`}
                >
                    {icone}
                </div>
            </div>
        </div>
    );
}

function LinhaResumo({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between gap-4 rounded-xl bg-gray-50 px-4 py-3">
            <span className="text-xs font-medium text-gray-500">{label}</span>
            <span className="text-sm font-semibold text-gray-800 text-right">
                {value}
            </span>
        </div>
    );
}