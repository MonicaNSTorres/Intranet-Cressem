"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import {
    useEffect,
    useMemo,
    useState,
} from "react";

import Link from "next/link";

import {
    FaArrowLeft,
    FaBarcode,
    FaBuilding,
    FaCheckCircle,
    FaDownload,
    FaExclamationTriangle,
    FaFileInvoiceDollar,
    FaPlus,
    FaSyncAlt,
    FaTrash,
    FaEye,
    FaTimes,
    FaCopy,
} from "react-icons/fa";

import {
    gerarCnab240PorBoletos,
    listarBoletosRemessa,
    listarRemessas,
    type BoletoCnabPayload,
    type BoletoRemessaCnab,
    type RemessaCnab,
    type TipoInscricaoBoleto,
} from "@/services/cnab240.service";

type LinhaBoletoFornecedor =
    BoletoCnabPayload & {
        id: string;
    };

type TipoMensagem =
    | "success"
    | "error";

function somenteDigitos(
    value: unknown
): string {
    return String(value ?? "")
        .replace(/\D/g, "");
}

function parseValor(
    value: string
): number {
    const texto = String(value || "")
        .trim()
        .replace(/[^\d,.-]/g, "");

    if (!texto) {
        return 0;
    }

    let normalizado = texto;

    if (
        normalizado.includes(".") &&
        normalizado.includes(",")
    ) {
        normalizado = normalizado
            .replace(/\./g, "")
            .replace(",", ".");
    } else if (
        normalizado.includes(",")
    ) {
        normalizado =
            normalizado.replace(",", ".");
    }

    const numero = Number(normalizado);

    return Number.isFinite(numero)
        ? numero
        : 0;
}

function formatarDinheiro(
    value: number | string | null | undefined
): string {
    return Number(value || 0)
        .toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
        });
}

function determinarTipoDocumento(
    documento: string
): TipoInscricaoBoleto {
    const digits =
        somenteDigitos(documento);

    if (digits.length === 11) {
        return 1;
    }

    if (digits.length === 14) {
        return 2;
    }

    return 0;
}

function formatarDocumento(
    value: string
): string {
    const digits =
        somenteDigitos(value)
            .slice(0, 14);

    if (digits.length <= 11) {
        return digits
            .replace(
                /^(\d{3})(\d)/,
                "$1.$2"
            )
            .replace(
                /^(\d{3})\.(\d{3})(\d)/,
                "$1.$2.$3"
            )
            .replace(
                /\.(\d{3})(\d)/,
                ".$1-$2"
            );
    }

    return digits
        .replace(
            /^(\d{2})(\d)/,
            "$1.$2"
        )
        .replace(
            /^(\d{2})\.(\d{3})(\d)/,
            "$1.$2.$3"
        )
        .replace(
            /\.(\d{3})(\d)/,
            ".$1/$2"
        )
        .replace(
            /(\d{4})(\d)/,
            "$1-$2"
        );
}

/**
 * Converte linha digitável bancária de 47 dígitos
 * para código de barras de 44 dígitos.
 *
 * Também aceita um código de barras que já possua
 * 44 dígitos.
 */
function converterLinhaDigitavelParaCodigoBarras(
    value: string
): string {
    const digits =
        somenteDigitos(value);

    if (digits.length === 44) {
        return digits;
    }

    if (digits.length !== 47) {
        throw new Error(
            "Informe um código de barras com 44 dígitos ou uma linha digitável bancária com 47 dígitos."
        );
    }

    const bancoMoeda =
        digits.slice(0, 4);

    const dvGeral =
        digits.slice(32, 33);

    const fatorVencimentoValor =
        digits.slice(33, 47);

    const campoLivre1 =
        digits.slice(4, 9);

    const campoLivre2 =
        digits.slice(10, 20);

    const campoLivre3 =
        digits.slice(21, 31);

    const codigoBarras =
        bancoMoeda +
        dvGeral +
        fatorVencimentoValor +
        campoLivre1 +
        campoLivre2 +
        campoLivre3;

    if (codigoBarras.length !== 44) {
        throw new Error(
            "Não foi possível converter a linha digitável para código de barras."
        );
    }

    return codigoBarras;
}

async function extrairMensagemErro(
    error: any
): Promise<string> {
    const responseData =
        error?.response?.data;

    if (
        typeof Blob !== "undefined" &&
        responseData instanceof Blob
    ) {
        try {
            const texto =
                await responseData.text();

            const json =
                JSON.parse(texto);

            return (
                json?.details ||
                json?.error ||
                "Erro ao gerar CNAB240."
            );
        } catch {
            return (
                error?.message ||
                "Erro ao gerar CNAB240."
            );
        }
    }

    return (
        responseData?.details ||
        responseData?.error ||
        error?.message ||
        "Erro ao gerar CNAB240."
    );
}

export function Cnab240FornecedoresForm() {
    const hoje =
        new Date()
            .toISOString()
            .slice(0, 10);

    const [
        boletos,
        setBoletos,
    ] = useState<
        LinhaBoletoFornecedor[]
    >([]);

    const [
        remessas,
        setRemessas,
    ] = useState<RemessaCnab[]>([]);

    const [
        loadingHistorico,
        setLoadingHistorico,
    ] = useState(false);

    const [
        gerando,
        setGerando,
    ] = useState(false);

    const [
        modalVisualizacaoAberto,
        setModalVisualizacaoAberto,
    ] = useState(false);

    const [
        carregandoBoletosRemessa,
        setCarregandoBoletosRemessa,
    ] = useState(false);

    const [
        boletosVisualizacao,
        setBoletosVisualizacao,
    ] = useState<BoletoRemessaCnab[]>([]);

    const [
        remessaSelecionada,
        setRemessaSelecionada,
    ] = useState<RemessaCnab | null>(null);

    const [
        linhaDigitavel,
        setLinhaDigitavel,
    ] = useState("");

    const [
        fornecedorNome,
        setFornecedorNome,
    ] = useState("");

    const [
        fornecedorDocumento,
        setFornecedorDocumento,
    ] = useState("");

    const [
        dataVencimento,
        setDataVencimento,
    ] = useState("");

    const [
        valorTitulo,
        setValorTitulo,
    ] = useState("");

    const [
        valorDescontoAbatimento,
        setValorDescontoAbatimento,
    ] = useState("");

    const [
        valorMoraMulta,
        setValorMoraMulta,
    ] = useState("");

    const [
        dataPagamento,
        setDataPagamento,
    ] = useState(hoje);

    const [
        valorPagamento,
        setValorPagamento,
    ] = useState("");

    const [
        seuNumero,
        setSeuNumero,
    ] = useState("");

    const [
        mensagem,
        setMensagem,
    ] = useState("");

    const [
        tipoMensagem,
        setTipoMensagem,
    ] = useState<TipoMensagem>(
        "success"
    );

    const valorTotal = useMemo(
        () =>
            boletos.reduce(
                (total, item) =>
                    total +
                    Number(
                        item.valorPagamento ||
                        0
                    ),
                0
            ),
        [boletos]
    );

    const remessasBoleto =
        useMemo(() => {
            return remessas.filter(
                (item) =>
                    String(
                        item.TIPO_LAYOUT ||
                        ""
                    ).toUpperCase() ===
                    "SICOOB_BOLETO"
            );
        }, [remessas]);

    function exibirMensagem(
        texto: string,
        tipo: TipoMensagem
    ) {
        setMensagem(texto);
        setTipoMensagem(tipo);
    }

    async function carregarHistorico() {
        try {
            setLoadingHistorico(true);

            const data =
                await listarRemessas();

            setRemessas(
                Array.isArray(data)
                    ? data
                    : []
            );
        } catch (error) {
            console.error(error);

            exibirMensagem(
                "Não foi possível carregar o histórico de pagamentos.",
                "error"
            );
        } finally {
            setLoadingHistorico(false);
        }
    }

    useEffect(() => {
        carregarHistorico();
    }, []);

    function limparFormulario() {
        setLinhaDigitavel("");
        setFornecedorNome("");
        setFornecedorDocumento("");
        setDataVencimento("");
        setValorTitulo("");
        setValorDescontoAbatimento("");
        setValorMoraMulta("");
        setValorPagamento("");
        setSeuNumero("");
    }

    function adicionarPagamento() {
        try {
            setMensagem("");

            const codigoBarras =
                converterLinhaDigitavelParaCodigoBarras(
                    linhaDigitavel
                );

            const nome =
                fornecedorNome.trim();

            const documento =
                somenteDigitos(
                    fornecedorDocumento
                );

            const tipoDocumento =
                determinarTipoDocumento(
                    documento
                );

            const valorTituloNumerico =
                parseValor(
                    valorTitulo
                );

            const descontoNumerico =
                parseValor(
                    valorDescontoAbatimento
                );

            const moraMultaNumerico =
                parseValor(
                    valorMoraMulta
                );

            const valorPagamentoNumerico =
                parseValor(
                    valorPagamento
                );

            if (!nome) {
                exibirMensagem(
                    "Informe o nome do fornecedor.",
                    "error"
                );
                return;
            }

            if (
                documento &&
                tipoDocumento === 0
            ) {
                exibirMensagem(
                    "Informe um CPF com 11 dígitos ou CNPJ com 14 dígitos.",
                    "error"
                );
                return;
            }

            if (!dataVencimento) {
                exibirMensagem(
                    "Informe a data de vencimento do boleto.",
                    "error"
                );
                return;
            }

            if (
                !valorTituloNumerico ||
                valorTituloNumerico <= 0
            ) {
                exibirMensagem(
                    "Informe um valor válido para o título.",
                    "error"
                );
                return;
            }

            if (!dataPagamento) {
                exibirMensagem(
                    "Informe a data de pagamento.",
                    "error"
                );
                return;
            }

            if (
                !valorPagamentoNumerico ||
                valorPagamentoNumerico <= 0
            ) {
                exibirMensagem(
                    "Informe um valor válido para o pagamento.",
                    "error"
                );
                return;
            }

            const novoBoleto:
                LinhaBoletoFornecedor = {
                id:
                    typeof crypto !==
                        "undefined" &&
                        crypto.randomUUID
                        ? crypto.randomUUID()
                        : `${Date.now()}-${Math.random()}`,

                sequencia:
                    boletos.length + 1,

                codigoBarras,

                nomeCedente:
                    nome,

                dataVencimento,

                valorTitulo:
                    valorTituloNumerico,

                valorDescontoAbatimento:
                    descontoNumerico,

                valorMoraMulta:
                    moraMultaNumerico,

                dataPagamento,

                valorPagamento:
                    valorPagamentoNumerico,

                seuNumero:
                    seuNumero.trim(),

                cedenteTipoInscricao:
                    tipoDocumento,

                cedenteDocumento:
                    documento,

                cedenteNome:
                    nome,

                sacadoTipoInscricao:
                    0,

                sacadoDocumento:
                    "",

                sacadoNome:
                    "",

                sacadorTipoInscricao:
                    0,

                sacadorDocumento:
                    "",

                sacadorNome:
                    "",
            };

            setBoletos(
                (old) => [
                    ...old,
                    novoBoleto,
                ]
            );

            limparFormulario();

            exibirMensagem(
                "Pagamento adicionado à remessa.",
                "success"
            );
        } catch (error: any) {
            exibirMensagem(
                error?.message ||
                "Não foi possível adicionar o pagamento.",
                "error"
            );
        }
    }

    function removerPagamento(
        id: string
    ) {
        setBoletos((old) =>
            old
                .filter(
                    (item) =>
                        item.id !== id
                )
                .map(
                    (item, index) => ({
                        ...item,
                        sequencia:
                            index + 1,
                    })
                )
        );
    }

    function limparRemessa() {
        setBoletos([]);
        setMensagem("");
    }

    async function visualizarRemessa(
        remessa: RemessaCnab
    ) {
        try {
            setCarregandoBoletosRemessa(true);
            setRemessaSelecionada(remessa);
            setBoletosVisualizacao([]);
            setModalVisualizacaoAberto(true);

            const detalhes =
                await listarBoletosRemessa(
                    Number(remessa.ID_REMESSA)
                );

            setBoletosVisualizacao(
                Array.isArray(detalhes)
                    ? detalhes
                    : []
            );
        } catch (error: any) {
            console.error(error);

            setModalVisualizacaoAberto(false);

            exibirMensagem(
                error?.response?.data?.details ||
                error?.response?.data?.error ||
                error?.message ||
                "Não foi possível carregar os boletos da remessa.",
                "error"
            );
        } finally {
            setCarregandoBoletosRemessa(false);
        }
    }

    function fecharModalVisualizacao() {
        if (carregandoBoletosRemessa) {
            return;
        }

        setModalVisualizacaoAberto(false);
        setRemessaSelecionada(null);
        setBoletosVisualizacao([]);
    }

    function exportarBoletosRemessaCsv() {
        if (boletosVisualizacao.length === 0) {
            exibirMensagem(
                "Esta remessa não possui pagamentos para exportar.",
                "error"
            );
            return;
        }

        const escaparCsv = (
            valor: string | number | null | undefined
        ): string => {
            const texto = String(valor ?? "");

            return `"${texto.replace(/"/g, '""')}"`;
        };

        const formatarValorCsv = (
            valor: string | number | null | undefined
        ): string => {
            return Number(valor || 0).toLocaleString(
                "pt-BR",
                {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                }
            );
        };

        const cabecalho = [
            "Sequência",
            "Fornecedor",
            "CPF/CNPJ do fornecedor",
            "Código de barras",
            "Data de vencimento",
            "Valor do título",
            "Desconto/abatimento",
            "Mora/multa",
            "Data do pagamento",
            "Valor do pagamento",
            "Identificação interna",
            "Nosso número",
            "Documento do sacado",
            "Nome do sacado",
            "Documento do sacador",
            "Nome do sacador",
        ];

        const linhasCsv =
            boletosVisualizacao.map((item) => {
                return [
                    escaparCsv(item.SEQ),
                    escaparCsv(
                        item.NOME_CEDENTE || ""
                    ),
                    escaparCsv(
                        item.DOCUMENTO_CEDENTE || ""
                    ),
                    escaparCsv(
                        item.CODIGO_BARRAS || ""
                    ),
                    escaparCsv(
                        item.DATA_VENCIMENTO || ""
                    ),
                    escaparCsv(
                        formatarValorCsv(
                            item.VALOR_TITULO
                        )
                    ),
                    escaparCsv(
                        formatarValorCsv(
                            item.VALOR_DESCONTO_ABATIMENTO
                        )
                    ),
                    escaparCsv(
                        formatarValorCsv(
                            item.VALOR_MORA_MULTA
                        )
                    ),
                    escaparCsv(
                        item.DATA_PAGAMENTO || ""
                    ),
                    escaparCsv(
                        formatarValorCsv(
                            item.VALOR_PAGAMENTO
                        )
                    ),
                    escaparCsv(
                        item.SEU_NUMERO || ""
                    ),
                    escaparCsv(
                        item.NOSSO_NUMERO || ""
                    ),
                    escaparCsv(
                        item.DOCUMENTO_SACADO || ""
                    ),
                    escaparCsv(
                        item.NOME_SACADO || ""
                    ),
                    escaparCsv(
                        item.DOCUMENTO_SACADOR || ""
                    ),
                    escaparCsv(
                        item.NOME_SACADOR || ""
                    ),
                ].join(";");
            });

        const conteudoCsv = [
            cabecalho
                .map(escaparCsv)
                .join(";"),
            ...linhasCsv,
        ].join("\r\n");

        const blob = new Blob(
            ["\uFEFF" + conteudoCsv],
            {
                type: "text/csv;charset=utf-8;",
            }
        );

        const url =
            window.URL.createObjectURL(blob);

        const link =
            document.createElement("a");

        const nomeRemessa = String(
            remessaSelecionada?.NM_ARQUIVO ||
            "remessa_cnab240"
        )
            .replace(/\.txt$/i, "")
            .replace(
                /[^a-zA-Z0-9_-]/g,
                "_"
            );

        link.href = url;
        link.download =
            `${nomeRemessa}_boletos.csv`;

        document.body.appendChild(link);

        link.click();
        link.remove();

        window.URL.revokeObjectURL(url);
    }

    function duplicarRemessa() {
        if (boletosVisualizacao.length === 0) {
            exibirMensagem(
                "Esta remessa não possui boletos disponíveis para duplicação.",
                "error"
            );
            return;
        }

        const novosBoletos:
            LinhaBoletoFornecedor[] =
            boletosVisualizacao.map(
                (item, index) => ({
                    id:
                        typeof crypto !==
                            "undefined" &&
                            crypto.randomUUID
                            ? crypto.randomUUID()
                            : `${Date.now()}-${index}-${Math.random()}`,

                    sequencia:
                        index + 1,

                    codigoBarras:
                        item.CODIGO_BARRAS || "",

                    nomeCedente:
                        item.NOME_CEDENTE || "",

                    dataVencimento:
                        item.DATA_VENCIMENTO || null,

                    valorTitulo:
                        Number(
                            item.VALOR_TITULO || 0
                        ),

                    valorDescontoAbatimento:
                        Number(
                            item.VALOR_DESCONTO_ABATIMENTO ||
                            0
                        ),

                    valorMoraMulta:
                        Number(
                            item.VALOR_MORA_MULTA || 0
                        ),

                    dataPagamento:
                        item.DATA_PAGAMENTO ||
                        hoje,

                    valorPagamento:
                        Number(
                            item.VALOR_PAGAMENTO ||
                            0
                        ),

                    seuNumero:
                        item.SEU_NUMERO || "",

                    nossoNumero:
                        item.NOSSO_NUMERO || "",

                    cedenteTipoInscricao:
                        item.TIPO_INSCRICAO_CEDENTE ||
                        0,

                    cedenteDocumento:
                        item.DOCUMENTO_CEDENTE ||
                        "",

                    cedenteNome:
                        item.NOME_CEDENTE || "",

                    sacadoTipoInscricao:
                        item.TIPO_INSCRICAO_SACADO ||
                        0,

                    sacadoDocumento:
                        item.DOCUMENTO_SACADO ||
                        "",

                    sacadoNome:
                        item.NOME_SACADO || "",

                    sacadorTipoInscricao:
                        item.TIPO_INSCRICAO_SACADOR ||
                        0,

                    sacadorDocumento:
                        item.DOCUMENTO_SACADOR ||
                        "",

                    sacadorNome:
                        item.NOME_SACADOR || "",
                })
            );

        setBoletos(novosBoletos);

        fecharModalVisualizacao();

        exibirMensagem(
            "Remessa duplicada. Confira os pagamentos antes de gerar um novo arquivo.",
            "success"
        );

        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    }

    async function gerarArquivo() {
        if (boletos.length === 0) {
            exibirMensagem(
                "Adicione pelo menos um pagamento antes de gerar o arquivo.",
                "error"
            );
            return;
        }

        try {
            setGerando(true);
            setMensagem("");

            const payload:
                BoletoCnabPayload[] =
                boletos.map(
                    ({
                        id,
                        ...rest
                    }) => rest
                );

            const blob =
                await gerarCnab240PorBoletos(
                    payload
                );

            const url =
                window.URL
                    .createObjectURL(
                        blob
                    );

            const link =
                document.createElement(
                    "a"
                );

            const dataArquivo =
                new Date()
                    .toISOString()
                    .slice(0, 19)
                    .replace(
                        /[-:T]/g,
                        ""
                    );

            link.href = url;

            link.download =
                `CNAB240_SICOOB_BOLETO_${dataArquivo}.txt`;

            document.body
                .appendChild(link);

            link.click();
            link.remove();

            window.URL
                .revokeObjectURL(url);

            setBoletos([]);

            exibirMensagem(
                "Arquivo CNAB240 de fornecedores gerado com sucesso.",
                "success"
            );

            await carregarHistorico();
        } catch (error: any) {
            console.error(error);

            const texto =
                await extrairMensagemErro(
                    error
                );

            exibirMensagem(
                texto,
                "error"
            );
        } finally {
            setGerando(false);
        }
    }

    return (
        <div className="space-y-6">
            <div className="mx-auto min-w-225 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-100">
                <div className="space-y-6 px-6 py-6">
                    {mensagem && (
                        <div
                            className={`rounded-2xl px-4 py-3 text-sm font-medium ${tipoMensagem ===
                                "success"
                                ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                                : "border border-red-200 bg-red-50 text-red-700"
                                }`}
                        >
                            <div className="flex items-start gap-2">
                                {tipoMensagem ===
                                    "success" ? (
                                    <FaCheckCircle className="mt-0.5 shrink-0" />
                                ) : (
                                    <FaExclamationTriangle className="mt-0.5 shrink-0" />
                                )}

                                <span>
                                    {mensagem}
                                </span>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <ResumoCard
                            titulo="Boletos na remessa"
                            valor={String(
                                boletos.length
                            )}
                            icone={
                                <FaBarcode />
                            }
                        />

                        <ResumoCard
                            titulo="Valor total"
                            valor={formatarDinheiro(
                                valorTotal
                            )}
                            icone={
                                <FaFileInvoiceDollar />
                            }
                        />

                        <ResumoCard
                            titulo="Arquivos gerados"
                            valor={String(
                                remessasBoleto.length
                            )}
                            icone={
                                <FaBuilding />
                            }
                        />
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
                        <div className="mb-5 flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#00AE9D]/10 text-[#00AE9D]">
                                <FaPlus />
                            </div>

                            <div>
                                <h2 className="font-bold text-slate-900">
                                    Adicionar pagamento
                                </h2>

                                <p className="text-sm text-slate-500">
                                    Informe os dados do boleto e do fornecedor.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                            <div className="md:col-span-2 xl:col-span-4">
                                <label className="mb-1 block text-xs font-semibold text-slate-600">
                                    Código de barras ou linha digitável
                                </label>

                                <input
                                    value={
                                        linhaDigitavel
                                    }
                                    onChange={(e) =>
                                        setLinhaDigitavel(
                                            e.target.value
                                        )
                                    }
                                    placeholder="Informe 44 ou 47 dígitos"
                                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#00AE9D] focus:ring-4 focus:ring-[#00AE9D]/10"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="mb-1 block text-xs font-semibold text-slate-600">
                                    Nome do fornecedor
                                </label>

                                <input
                                    value={
                                        fornecedorNome
                                    }
                                    onChange={(e) =>
                                        setFornecedorNome(
                                            e.target.value
                                        )
                                    }
                                    placeholder="Razão social ou nome do fornecedor"
                                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#00AE9D] focus:ring-4 focus:ring-[#00AE9D]/10"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="mb-1 block text-xs font-semibold text-slate-600">
                                    CPF/CNPJ do fornecedor
                                </label>

                                <input
                                    value={
                                        fornecedorDocumento
                                    }
                                    onChange={(e) =>
                                        setFornecedorDocumento(
                                            formatarDocumento(
                                                e.target.value
                                            )
                                        )
                                    }
                                    placeholder="CPF ou CNPJ"
                                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#00AE9D] focus:ring-4 focus:ring-[#00AE9D]/10"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-600">
                                    Data de vencimento
                                </label>

                                <input
                                    type="date"
                                    value={
                                        dataVencimento
                                    }
                                    onChange={(e) =>
                                        setDataVencimento(
                                            e.target.value
                                        )
                                    }
                                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#00AE9D] focus:ring-4 focus:ring-[#00AE9D]/10"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-600">
                                    Valor do título
                                </label>

                                <input
                                    value={
                                        valorTitulo
                                    }
                                    onChange={(e) =>
                                        setValorTitulo(
                                            e.target.value
                                        )
                                    }
                                    placeholder="0,00"
                                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#00AE9D] focus:ring-4 focus:ring-[#00AE9D]/10"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-600">
                                    Desconto/abatimento
                                </label>

                                <input
                                    value={
                                        valorDescontoAbatimento
                                    }
                                    onChange={(e) =>
                                        setValorDescontoAbatimento(
                                            e.target.value
                                        )
                                    }
                                    placeholder="0,00"
                                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#00AE9D] focus:ring-4 focus:ring-[#00AE9D]/10"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-600">
                                    Mora/multa
                                </label>

                                <input
                                    value={
                                        valorMoraMulta
                                    }
                                    onChange={(e) =>
                                        setValorMoraMulta(
                                            e.target.value
                                        )
                                    }
                                    placeholder="0,00"
                                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#00AE9D] focus:ring-4 focus:ring-[#00AE9D]/10"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-600">
                                    Data do pagamento
                                </label>

                                <input
                                    type="date"
                                    value={
                                        dataPagamento
                                    }
                                    onChange={(e) =>
                                        setDataPagamento(
                                            e.target.value
                                        )
                                    }
                                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#00AE9D] focus:ring-4 focus:ring-[#00AE9D]/10"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-600">
                                    Valor do pagamento
                                </label>

                                <input
                                    value={
                                        valorPagamento
                                    }
                                    onChange={(e) =>
                                        setValorPagamento(
                                            e.target.value
                                        )
                                    }
                                    placeholder="0,00"
                                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#00AE9D] focus:ring-4 focus:ring-[#00AE9D]/10"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="mb-1 block text-xs font-semibold text-slate-600">
                                    Identificação interna
                                </label>

                                <input
                                    value={
                                        seuNumero
                                    }
                                    onChange={(e) =>
                                        setSeuNumero(
                                            e.target.value
                                        )
                                    }
                                    maxLength={20}
                                    placeholder="Número da nota, pedido ou referência"
                                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#00AE9D] focus:ring-4 focus:ring-[#00AE9D]/10"
                                />
                            </div>
                        </div>

                        <div className="mt-5 flex justify-end">
                            <button
                                type="button"
                                onClick={
                                    adicionarPagamento
                                }
                                disabled={
                                    gerando
                                }
                                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition hover:bg-secondary cursor-pointer disabled:opacity-60"
                            >
                                <FaPlus />
                                Adicionar pagamento
                            </button>
                        </div>
                    </div>

                    <div className="overflow-hidden rounded-3xl border border-slate-200">
                        <div className="border-b border-slate-100 bg-white px-5 py-4">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <h2 className="font-bold text-slate-900">
                                        Pagamentos da remessa
                                    </h2>

                                    <p className="text-sm text-slate-500">
                                        Confira os boletos antes de gerar o arquivo.
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={
                                        limparRemessa
                                    }
                                    disabled={
                                        boletos.length ===
                                        0 ||
                                        gerando
                                    }
                                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <FaTrash />
                                    Limpar remessa
                                </button>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead className="bg-slate-100">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                                            Seq.
                                        </th>

                                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                                            Fornecedor
                                        </th>

                                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                                            Documento
                                        </th>

                                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                                            Vencimento
                                        </th>

                                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                                            Código
                                        </th>

                                        <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-500">
                                            Valor
                                        </th>

                                        <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-500">
                                            Ações
                                        </th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {boletos.length ===
                                        0 ? (
                                        <tr>
                                            <td
                                                colSpan={
                                                    7
                                                }
                                                className="px-4 py-14 text-center text-sm text-slate-500"
                                            >
                                                Nenhum pagamento adicionado.
                                            </td>
                                        </tr>
                                    ) : (
                                        boletos.map(
                                            (
                                                item
                                            ) => (
                                                <tr
                                                    key={
                                                        item.id
                                                    }
                                                    className="transition hover:bg-slate-50"
                                                >
                                                    <td className="px-4 py-4 text-sm font-semibold text-slate-700">
                                                        {
                                                            item.sequencia
                                                        }
                                                    </td>

                                                    <td className="px-4 py-4 text-sm font-bold text-slate-800">
                                                        {
                                                            item.nomeCedente
                                                        }
                                                    </td>

                                                    <td className="px-4 py-4 text-sm text-slate-600">
                                                        {item.cedenteDocumento ||
                                                            "-"}
                                                    </td>

                                                    <td className="px-4 py-4 text-sm text-slate-600">
                                                        {item.dataVencimento ||
                                                            "-"}
                                                    </td>

                                                    <td className="max-w-xs px-4 py-4 text-sm text-slate-600">
                                                        <span
                                                            className="block truncate"
                                                            title={
                                                                item.codigoBarras
                                                            }
                                                        >
                                                            {
                                                                item.codigoBarras
                                                            }
                                                        </span>
                                                    </td>

                                                    <td className="px-4 py-4 text-right text-sm font-bold text-slate-800">
                                                        {formatarDinheiro(
                                                            item.valorPagamento
                                                        )}
                                                    </td>

                                                    <td className="px-4 py-4 text-right">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                removerPagamento(
                                                                    item.id
                                                                )
                                                            }
                                                            disabled={
                                                                gerando
                                                            }
                                                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                                                        >
                                                            <FaTrash />
                                                        </button>
                                                    </td>
                                                </tr>
                                            )
                                        )
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex flex-col gap-4 border-t border-slate-100 bg-slate-50/70 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                                    Total da remessa
                                </p>

                                <p className="mt-1 text-xl font-bold text-slate-900">
                                    {formatarDinheiro(
                                        valorTotal
                                    )}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={
                                    gerarArquivo
                                }
                                disabled={
                                    boletos.length ===
                                    0 ||
                                    gerando
                                }
                                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#79B729] px-6 text-sm font-bold text-white shadow-lg shadow-[#79B729]/20 transition hover:bg-[#679e21] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {gerando ? (
                                    <FaSyncAlt className="animate-spin" />
                                ) : (
                                    <FaDownload />
                                )}

                                {gerando
                                    ? "Gerando arquivo..."
                                    : "Gerar CNAB240 Sicoob"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mx-auto min-w-225 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-100">
                <div className="border-b border-slate-100 px-6 py-5">
                    <h2 className="text-lg font-bold text-slate-900">
                        Histórico de pagamentos de fornecedores
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                        Arquivos Sicoob boleto gerados anteriormente.
                    </p>
                </div>

                <div className="overflow-x-auto px-6 py-5">
                    <table className="min-w-full border-separate border-spacing-y-3">
                        <thead>
                            <tr>
                                <th className="px-4 py-2 text-left text-xs font-bold uppercase tracking-wide text-slate-400">
                                    Arquivo
                                </th>

                                <th className="px-4 py-2 text-left text-xs font-bold uppercase tracking-wide text-slate-400">
                                    Data
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
                            {loadingHistorico ? (
                                <tr>
                                    <td
                                        colSpan={5}
                                        className="px-4 py-12 text-center text-sm text-slate-500"
                                    >
                                        Carregando histórico...
                                    </td>
                                </tr>
                            ) : remessasBoleto.length ===
                                0 ? (
                                <tr>
                                    <td
                                        colSpan={5}
                                        className="px-4 py-12 text-center text-sm text-slate-500"
                                    >
                                        Nenhum arquivo de fornecedores gerado.
                                    </td>
                                </tr>
                            ) : (
                                remessasBoleto
                                    .slice(0, 20)
                                    .map(
                                        (
                                            item
                                        ) => (
                                            <tr
                                                key={
                                                    item.ID_REMESSA
                                                }
                                                className="bg-slate-50"
                                            >
                                                <td className="rounded-l-2xl px-4 py-4 text-sm font-bold text-slate-800">
                                                    {
                                                        item.NM_ARQUIVO
                                                    }
                                                </td>

                                                <td className="px-4 py-4 text-sm text-slate-600">
                                                    {item.DT_GERACAO ||
                                                        "-"}
                                                </td>

                                                <td className="px-4 py-4 text-sm text-slate-600">
                                                    {item.QT_PAGAMENTOS ||
                                                        0}
                                                </td>

                                                <td className="px-4 py-4 text-sm font-semibold text-slate-700">
                                                    {formatarDinheiro(
                                                        item.VL_TOTAL
                                                    )}
                                                </td>

                                                <td className="px-4 py-4">
                                                    <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                                                        {item.STATUS || "GERADO"}
                                                    </span>
                                                </td>

                                                <td className="rounded-r-2xl px-4 py-4 text-right">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            visualizarRemessa(item)
                                                        }
                                                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-secondary/30 bg-secondary px-4 py-2 text-xs font-bold text-white transition hover:bg-primary cursor-pointer"
                                                    >
                                                        <FaEye />
                                                        Visualizar
                                                    </button>
                                                </td>
                                            </tr>
                                        )
                                    )
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            {modalVisualizacaoAberto && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
                    <div className="max-h-[94vh] w-full max-w-6xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl">
                        <div className="bg-linear-to-r from-[#00AE9D]/10 via-white to-[#79B729]/10 px-6 py-5">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
                                        Histórico CNAB240
                                    </p>

                                    <h2 className="mt-1 text-2xl font-bold text-slate-800">
                                        Visualização da remessa
                                    </h2>

                                    <p className="mt-1 text-sm text-slate-500">
                                        Consulte todos os boletos enviados nesta remessa.
                                    </p>

                                    <p className="mt-2 text-xs font-semibold text-slate-500">
                                        {remessaSelecionada?.NM_ARQUIVO ||
                                            "Arquivo não informado"}
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={fecharModalVisualizacao}
                                    disabled={carregandoBoletosRemessa}
                                    className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-2xl border border-slate-200 bg-white text-xl text-slate-500 transition hover:border-red-200 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    ×
                                </button>
                            </div>
                        </div>

                        <div className="max-h-[78vh] space-y-5 overflow-y-auto p-6">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-5 py-4">
                                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                                        Gerado em
                                    </p>

                                    <p className="mt-2 font-bold text-slate-800">
                                        {remessaSelecionada?.DT_GERACAO || "-"}
                                    </p>
                                </div>

                                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-5 py-4">
                                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                                        Pagamentos
                                    </p>

                                    <p className="mt-2 text-xl font-bold text-slate-800">
                                        {String(
                                            remessaSelecionada?.QT_PAGAMENTOS || 0
                                        )}
                                    </p>
                                </div>

                                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-5 py-4">
                                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                                        Valor total
                                    </p>

                                    <p className="mt-2 text-xl font-bold text-slate-800">
                                        {formatarDinheiro(
                                            remessaSelecionada?.VL_TOTAL
                                        )}
                                    </p>
                                </div>
                            </div>

                            {carregandoBoletosRemessa ? (
                                <div className="flex min-h-56 items-center justify-center gap-3 rounded-3xl border border-slate-200 bg-slate-50/70 text-sm text-slate-500">
                                    <FaSyncAlt className="animate-spin text-primary" />

                                    Carregando boletos...
                                </div>
                            ) : boletosVisualizacao.length === 0 ? (
                                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
                                    Esta remessa não possui boletos detalhados. Isso pode
                                    acontecer com remessas geradas antes da criação do
                                    histórico de boletos.
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {boletosVisualizacao.map((item) => (
                                        <div
                                            key={item.ID_DETALHE}
                                            className="overflow-hidden rounded-3xl border border-slate-200 bg-white"
                                        >
                                            <div className="flex flex-col gap-4 bg-linear-to-r from-slate-50 via-white to-[#00AE9D]/5 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                                                <div className="flex min-w-0 items-center gap-3">
                                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#00AE9D]/10 text-[#00AE9D]">
                                                        <FaFileInvoiceDollar />
                                                    </div>

                                                    <div className="min-w-0">
                                                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                                                            Pagamento {item.SEQ}
                                                        </p>

                                                        <h3 className="mt-1 truncate font-bold text-slate-800">
                                                            {item.NOME_CEDENTE || "-"}
                                                        </h3>

                                                        <p className="mt-1 text-xs text-slate-500">
                                                            {item.DOCUMENTO_CEDENTE || "-"}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="sm:text-right">
                                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                                        Valor pago
                                                    </p>

                                                    <p className="mt-1 text-xl font-bold text-slate-800">
                                                        {formatarDinheiro(
                                                            item.VALOR_PAGAMENTO
                                                        )}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 gap-4 px-5 py-5 sm:grid-cols-2 lg:grid-cols-4">
                                                <div>
                                                    <p className="text-xs font-semibold text-slate-400">
                                                        CPF/CNPJ
                                                    </p>

                                                    <p className="mt-1 break-all text-sm font-semibold text-slate-700">
                                                        {item.DOCUMENTO_CEDENTE || "-"}
                                                    </p>
                                                </div>

                                                <div>
                                                    <p className="text-xs font-semibold text-slate-400">
                                                        Vencimento
                                                    </p>

                                                    <p className="mt-1 text-sm font-semibold text-slate-700">
                                                        {item.DATA_VENCIMENTO || "-"}
                                                    </p>
                                                </div>

                                                <div>
                                                    <p className="text-xs font-semibold text-slate-400">
                                                        Data do pagamento
                                                    </p>

                                                    <p className="mt-1 text-sm font-semibold text-slate-700">
                                                        {item.DATA_PAGAMENTO || "-"}
                                                    </p>
                                                </div>

                                                <div>
                                                    <p className="text-xs font-semibold text-slate-400">
                                                        Valor do título
                                                    </p>

                                                    <p className="mt-1 text-sm font-semibold text-slate-700">
                                                        {formatarDinheiro(
                                                            item.VALOR_TITULO
                                                        )}
                                                    </p>
                                                </div>

                                                <div>
                                                    <p className="text-xs font-semibold text-slate-400">
                                                        Desconto/abatimento
                                                    </p>

                                                    <p className="mt-1 text-sm font-semibold text-slate-700">
                                                        {formatarDinheiro(
                                                            item.VALOR_DESCONTO_ABATIMENTO
                                                        )}
                                                    </p>
                                                </div>

                                                <div>
                                                    <p className="text-xs font-semibold text-slate-400">
                                                        Mora/multa
                                                    </p>

                                                    <p className="mt-1 text-sm font-semibold text-slate-700">
                                                        {formatarDinheiro(
                                                            item.VALOR_MORA_MULTA
                                                        )}
                                                    </p>
                                                </div>

                                                <div>
                                                    <p className="text-xs font-semibold text-slate-400">
                                                        Identificação interna
                                                    </p>

                                                    <p className="mt-1 break-all text-sm font-semibold text-slate-700">
                                                        {item.SEU_NUMERO || "-"}
                                                    </p>
                                                </div>

                                                <div>
                                                    <p className="text-xs font-semibold text-slate-400">
                                                        Nosso número
                                                    </p>

                                                    <p className="mt-1 break-all text-sm font-semibold text-slate-700">
                                                        {item.NOSSO_NUMERO || "-"}
                                                    </p>
                                                </div>

                                                <div className="sm:col-span-2 lg:col-span-4">
                                                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4">
                                                        <p className="text-xs font-semibold text-slate-400">
                                                            Código de barras
                                                        </p>

                                                        <p className="mt-2 break-all font-mono text-sm font-semibold text-slate-700">
                                                            {item.CODIGO_BARRAS || "-"}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                                <button
                                    type="button"
                                    onClick={fecharModalVisualizacao}
                                    disabled={carregandoBoletosRemessa}
                                    className="cursor-pointer rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    Fechar
                                </button>

                                <button
                                    type="button"
                                    onClick={exportarBoletosRemessaCsv}
                                    disabled={
                                        carregandoBoletosRemessa ||
                                        boletosVisualizacao.length === 0
                                    }
                                    className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-primary/30 bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <FaDownload />
                                    Exportar CSV
                                </button>

                                <button
                                    type="button"
                                    onClick={duplicarRemessa}
                                    disabled={
                                        carregandoBoletosRemessa ||
                                        boletosVisualizacao.length === 0
                                    }
                                    className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-secondary px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <FaCopy />
                                    Duplicar remessa
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function ResumoCard({
    titulo,
    valor,
    icone,
}: {
    titulo: string;
    valor: string;
    icone: React.ReactNode;
}) {
    return (
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                        {titulo}
                    </p>

                    <p className="mt-2 text-xl font-bold text-slate-900">
                        {valor}
                    </p>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#00AE9D]/10 text-[#00AE9D]">
                    {icone}
                </div>
            </div>
        </div>
    );
}

function ResumoModal({
    titulo,
    valor,
}: {
    titulo: string;
    valor: string;
}) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                {titulo}
            </p>

            <p className="mt-2 font-bold text-slate-900">
                {valor}
            </p>
        </div>
    );
}

function CampoDetalhe({
    titulo,
    valor,
}: {
    titulo: string;
    valor: string;
}) {
    return (
        <div>
            <p className="text-xs font-semibold text-slate-400">
                {titulo}
            </p>

            <p className="mt-1 break-all text-sm font-semibold text-slate-700">
                {valor}
            </p>
        </div>
    );
}