import { gerarHeaderArquivoSicoob } from "../sicoob/headerArquivoSicoob";
import { gerarTrailerArquivoSicoob } from "../sicoob/trailerArquivoSicoob";

import {
    gerarHeaderLoteSicoobBoleto,
    type FormaLancamentoSicoobBoleto,
} from "./headerLoteSicoobBoleto";

import { gerarSegmentoJSicoobBoleto } from "./segmentoJSicoobBoleto";
import { gerarSegmentoJ52SicoobBoleto } from "./segmentoJ52SicoobBoleto";
import { gerarTrailerLoteSicoobBoleto } from "./trailerLoteSicoobBoleto";

export type TipoInscricaoBoleto =
    | 0
    | 1
    | 2;

export type BoletoCnabSicoobInput = {
    sequencia: number;

    /**
     * Deve conter o código de barras com 44 dígitos.
     * Não deve ser enviada diretamente uma linha digitável
     * de 47 ou 48 posições.
     */
    codigoBarras: string;

    nomeCedente: string;

    dataVencimento?: string | Date | null;
    valorTitulo: number;

    valorDescontoAbatimento?: number;
    valorMoraMulta?: number;

    dataPagamento?: string | Date | null;
    valorPagamento: number;

    seuNumero?: string;
    nossoNumero?: string;

    sacadoTipoInscricao?: TipoInscricaoBoleto;
    sacadoDocumento?: string;
    sacadoNome?: string;

    cedenteTipoInscricao?: TipoInscricaoBoleto;
    cedenteDocumento?: string;
    cedenteNome?: string;

    sacadorTipoInscricao?: TipoInscricaoBoleto;
    sacadorDocumento?: string;
    sacadorNome?: string;
};

export type GerarCnab240SicoobBoletoInput = {
    boletos: BoletoCnabSicoobInput[];

    empresaNome: string;
    empresaInscricao: string;
    codigoConvenioBanco: string;

    agencia: string;
    dvAgencia?: string;

    conta: string;
    dvConta: string;
    dvAgenciaConta?: string;

    enderecoEmpresa?: string;
    numeroEmpresa?: string;
    complementoEmpresa?: string;
    cidadeEmpresa?: string;
    cepEmpresa?: string;
    cepComplementoEmpresa?: string;
    ufEmpresa?: string;

    sequencialArquivo: number;
    dataGeracao?: Date;

    /**
     * Código do tipo de serviço no header do lote.
     * 20 = pagamento a fornecedores.
     */
    tipoServico?: string;
};

type GrupoBoletos = {
    formaLancamento: FormaLancamentoSicoobBoleto;
    boletos: BoletoCnabSicoobInput[];
};

function somenteDigitos(
    value: unknown
): string {
    return String(value ?? "")
        .replace(/\D/g, "");
}

function converterData(
    value: string | Date | null | undefined,
    fallback?: Date
): Date | null {
    if (!value) {
        return fallback || null;
    }

    if (value instanceof Date) {
        if (Number.isNaN(value.getTime())) {
            return fallback || null;
        }

        return value;
    }

    const texto = String(value).trim();

    if (!texto) {
        return fallback || null;
    }

    /*
     * Formato ISO: AAAA-MM-DD
     */
    const iso = texto.match(
        /^(\d{4})-(\d{2})-(\d{2})$/
    );

    if (iso) {
        const data = new Date(
            Number(iso[1]),
            Number(iso[2]) - 1,
            Number(iso[3])
        );

        return Number.isNaN(data.getTime())
            ? fallback || null
            : data;
    }

    /*
     * Formato brasileiro: DD/MM/AAAA
     */
    const br = texto.match(
        /^(\d{2})\/(\d{2})\/(\d{4})$/
    );

    if (br) {
        const data = new Date(
            Number(br[3]),
            Number(br[2]) - 1,
            Number(br[1])
        );

        return Number.isNaN(data.getTime())
            ? fallback || null
            : data;
    }

    const data = new Date(texto);

    return Number.isNaN(data.getTime())
        ? fallback || null
        : data;
}

function determinarFormaLancamento(
    codigoBarras: string
): FormaLancamentoSicoobBoleto {
    const codigo = somenteDigitos(
        codigoBarras
    );

    const bancoBoleto =
        codigo.slice(0, 3);

    /*
     * 30 = liquidação de títulos do próprio banco
     * 31 = pagamento de títulos de outros bancos
     */
    return bancoBoleto === "756"
        ? "30"
        : "31";
}

function separarBoletosPorForma(
    boletos: BoletoCnabSicoobInput[]
): GrupoBoletos[] {
    const titulosSicoob =
        boletos.filter(
            (boleto) =>
                determinarFormaLancamento(
                    boleto.codigoBarras
                ) === "30"
        );

    const titulosOutrosBancos =
        boletos.filter(
            (boleto) =>
                determinarFormaLancamento(
                    boleto.codigoBarras
                ) === "31"
        );

    const grupos: GrupoBoletos[] = [];

    if (titulosSicoob.length > 0) {
        grupos.push({
            formaLancamento: "30",
            boletos: titulosSicoob,
        });
    }

    if (
        titulosOutrosBancos.length > 0
    ) {
        grupos.push({
            formaLancamento: "31",
            boletos:
                titulosOutrosBancos,
        });
    }

    return grupos;
}

function validarBoletos(
    boletos: BoletoCnabSicoobInput[]
) {
    if (
        !Array.isArray(boletos) ||
        boletos.length === 0
    ) {
        throw new Error(
            "Nenhum boleto foi informado para gerar o CNAB240 Sicoob."
        );
    }

    boletos.forEach(
        (boleto, index) => {
            const numeroLinha =
                index + 1;

            const codigo =
                somenteDigitos(
                    boleto.codigoBarras
                );

            if (codigo.length !== 44) {
                throw new Error(
                    `Boleto ${numeroLinha}: o código de barras deve possuir exatamente 44 dígitos. Foram encontrados ${codigo.length}.`
                );
            }

            if (
                !String(
                    boleto.nomeCedente || ""
                ).trim()
            ) {
                throw new Error(
                    `Boleto ${numeroLinha}: nome do cedente não informado.`
                );
            }

            const valorTitulo =
                Number(
                    boleto.valorTitulo || 0
                );

            const valorPagamento =
                Number(
                    boleto.valorPagamento || 0
                );

            if (
                !Number.isFinite(
                    valorTitulo
                ) ||
                valorTitulo < 0
            ) {
                throw new Error(
                    `Boleto ${numeroLinha}: valor nominal do título inválido.`
                );
            }

            if (
                !Number.isFinite(
                    valorPagamento
                ) ||
                valorPagamento <= 0
            ) {
                throw new Error(
                    `Boleto ${numeroLinha}: valor do pagamento deve ser maior que zero.`
                );
            }

            const dataPagamento =
                converterData(
                    boleto.dataPagamento,
                    new Date()
                );

            if (!dataPagamento) {
                throw new Error(
                    `Boleto ${numeroLinha}: data de pagamento inválida.`
                );
            }
        }
    );
}

function gerarSeuNumero(
    boleto: BoletoCnabSicoobInput,
    indice: number
): string {
    const informado = String(
        boleto.seuNumero || ""
    ).trim();

    if (informado) {
        return informado;
    }

    const sequencia = Number(
        boleto.sequencia ||
        indice + 1
    );

    return `BOL${String(
        sequencia
    ).padStart(10, "0")}`;
}

export function gerarCnab240SicoobBoleto({
    boletos,

    empresaNome,
    empresaInscricao,
    codigoConvenioBanco,

    agencia,
    dvAgencia = "",

    conta,
    dvConta,
    dvAgenciaConta = "",

    enderecoEmpresa = "",
    numeroEmpresa = "",
    complementoEmpresa = "",
    cidadeEmpresa = "",
    cepEmpresa = "",
    cepComplementoEmpresa = "",
    ufEmpresa = "",

    sequencialArquivo,
    dataGeracao = new Date(),

    tipoServico = "20",
}: GerarCnab240SicoobBoletoInput): string {
    validarBoletos(boletos);

    const grupos =
        separarBoletosPorForma(
            boletos
        );

    if (grupos.length === 0) {
        throw new Error(
            "Nenhum lote válido de boletos foi identificado."
        );
    }

    const linhas: string[] = [];

    /*
     * HEADER DO ARQUIVO
     */
    linhas.push(
        gerarHeaderArquivoSicoob({
            empresaNome,
            empresaInscricao,
            codigoConvenioBanco,

            agencia,
            dvAgencia,

            conta,
            dvConta,

            sequencialArquivo,
            dataGeracao,
        })
    );

    grupos.forEach(
        (grupo, indiceGrupo) => {
            const numeroLote =
                indiceGrupo + 1;

            /*
             * HEADER DO LOTE
             *
             * Cada lote contém uma única forma:
             * 30 = boleto Sicoob
             * 31 = boleto de outro banco
             */
            linhas.push(
                gerarHeaderLoteSicoobBoleto({
                    numeroLote,
                    formaLancamento:
                        grupo.formaLancamento,

                    empresaNome,
                    empresaInscricao,
                    codigoConvenioBanco,

                    agencia,
                    dvAgencia,

                    conta,
                    dvConta,
                    dvAgenciaConta,

                    enderecoEmpresa,
                    numeroEmpresa,
                    complementoEmpresa,
                    cidadeEmpresa,
                    cepEmpresa,
                    cepComplementoEmpresa,
                    ufEmpresa,

                    mensagem: "",
                    tipoServico,
                })
            );

            let numeroRegistroLote = 1;

            grupo.boletos.forEach(
                (
                    boleto,
                    indiceBoleto
                ) => {
                    const dataPagamento =
                        converterData(
                            boleto.dataPagamento,
                            new Date()
                        );

                    const dataVencimento =
                        converterData(
                            boleto.dataVencimento
                        );

                    if (!dataPagamento) {
                        throw new Error(
                            `Data de pagamento inválida no boleto ${
                                indiceBoleto + 1
                            }.`
                        );
                    }

                    /*
                     * SEGMENTO J
                     */
                    linhas.push(
                        gerarSegmentoJSicoobBoleto({
                            numeroLote,
                            numeroRegistroLote,

                            codigoBarras:
                                boleto.codigoBarras,

                            nomeCedente:
                                boleto.nomeCedente,

                            dataVencimento,
                            valorTitulo:
                                Number(
                                    boleto.valorTitulo ||
                                    0
                                ),

                            valorDescontoAbatimento:
                                Number(
                                    boleto
                                        .valorDescontoAbatimento ||
                                    0
                                ),

                            valorMoraMulta:
                                Number(
                                    boleto
                                        .valorMoraMulta ||
                                    0
                                ),

                            dataPagamento,

                            valorPagamento:
                                Number(
                                    boleto.valorPagamento ||
                                    0
                                ),

                            seuNumero:
                                gerarSeuNumero(
                                    boleto,
                                    indiceBoleto
                                ),

                            nossoNumero:
                                boleto.nossoNumero ||
                                "",
                        })
                    );

                    numeroRegistroLote += 1;

                    /*
                     * SEGMENTO J-52
                     *
                     * Obrigatório para boleto comum.
                     */
                    linhas.push(
                        gerarSegmentoJ52SicoobBoleto({
                            numeroLote,
                            numeroRegistroLote,

                            codigoMovimento:
                                "00",

                            sacadoTipoInscricao:
                                boleto
                                    .sacadoTipoInscricao ||
                                0,

                            sacadoDocumento:
                                boleto
                                    .sacadoDocumento ||
                                "",

                            sacadoNome:
                                boleto.sacadoNome ||
                                "",

                            cedenteTipoInscricao:
                                boleto
                                    .cedenteTipoInscricao ||
                                0,

                            cedenteDocumento:
                                boleto
                                    .cedenteDocumento ||
                                "",

                            cedenteNome:
                                boleto.cedenteNome ||
                                boleto.nomeCedente,

                            sacadorTipoInscricao:
                                boleto
                                    .sacadorTipoInscricao ||
                                0,

                            sacadorDocumento:
                                boleto
                                    .sacadorDocumento ||
                                "",

                            sacadorNome:
                                boleto.sacadorNome ||
                                "",
                        })
                    );

                    numeroRegistroLote += 1;
                }
            );

            const valorTotalPagamentos =
                grupo.boletos.reduce(
                    (total, boleto) =>
                        total +
                        Number(
                            boleto.valorPagamento ||
                            0
                        ),
                    0
                );

            /*
             * Header do lote
             * + dois segmentos por boleto
             * + trailer do lote.
             */
            const quantidadeRegistrosLote =
                1 +
                grupo.boletos.length * 2 +
                1;

            /*
             * TRAILER DO LOTE
             */
            linhas.push(
                gerarTrailerLoteSicoobBoleto({
                    numeroLote,
                    quantidadeRegistrosLote,
                    valorTotalPagamentos,
                    quantidadeMoeda: 0,
                    numeroAvisoDebito: 0,
                })
            );
        }
    );

    /*
     * Inclui todos os registros já adicionados
     * mais o trailer do arquivo.
     */
    const quantidadeRegistrosArquivo =
        linhas.length + 1;

    /*
     * TRAILER DO ARQUIVO
     */
    linhas.push(
        gerarTrailerArquivoSicoob({
            quantidadeLotes:
                grupos.length,

            quantidadeRegistrosArquivo,
        })
    );

    return `${linhas.join(
        "\r\n"
    )}\r\n`;
}