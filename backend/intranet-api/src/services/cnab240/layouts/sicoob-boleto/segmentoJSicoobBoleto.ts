import {
    alpha,
    assert240,
    money,
    numeric,
    spaces,
} from "../../cnab240Utils";

export type SegmentoJSicoobBoletoInput = {
    numeroLote: number;
    numeroRegistroLote: number;

    /**
     * Código de barras já convertido para o formato
     * de 44 posições.
     */
    codigoBarras: string;

    nomeCedente?: string;

    dataVencimento?: Date | null;
    valorTitulo?: number;

    /**
     * Soma do desconto e do abatimento.
     */
    valorDescontoAbatimento?: number;

    /**
     * Soma da mora e da multa.
     */
    valorMoraMulta?: number;

    dataPagamento: Date;
    valorPagamento: number;

    /**
     * Número atribuído pela empresa para identificar
     * o pagamento.
     */
    seuNumero?: string;

    /**
     * Campo normalmente preenchido pelo banco no retorno.
     */
    nossoNumero?: string;
};

function somenteDigitos(value: unknown): string {
    return String(value ?? "").replace(/\D/g, "");
}

function formatarData(
    data?: Date | null
): string {
    if (!data) {
        return "00000000";
    }

    const dia = String(
        data.getDate()
    ).padStart(2, "0");

    const mes = String(
        data.getMonth() + 1
    ).padStart(2, "0");

    const ano = String(
        data.getFullYear()
    ).padStart(4, "0");

    return `${dia}${mes}${ano}`;
}

export function gerarSegmentoJSicoobBoleto({
    numeroLote,
    numeroRegistroLote,

    codigoBarras,
    nomeCedente = "",

    dataVencimento = null,
    valorTitulo = 0,

    valorDescontoAbatimento = 0,
    valorMoraMulta = 0,

    dataPagamento,
    valorPagamento,

    seuNumero = "",
    nossoNumero = "",
}: SegmentoJSicoobBoletoInput): string {
    const codigoBarrasLimpo =
        somenteDigitos(codigoBarras);

    if (codigoBarrasLimpo.length !== 44) {
        throw new Error(
            `Código de barras do boleto inválido. Esperado: 44 dígitos. Recebido: ${codigoBarrasLimpo.length}.`
        );
    }

    if (
        !Number.isFinite(Number(valorPagamento)) ||
        Number(valorPagamento) <= 0
    ) {
        throw new Error(
            "O valor do pagamento do boleto deve ser maior que zero."
        );
    }

    const linha =
        // 01.3J - Código do banco - posições 001 a 003
        numeric("756", 3) +

        // 02.3J - Lote de serviço - posições 004 a 007
        numeric(numeroLote, 4) +

        // 03.3J - Tipo de registro - posição 008
        numeric("3", 1) +

        // 04.3J - Sequencial do registro no lote - posições 009 a 013
        numeric(numeroRegistroLote, 5) +

        // 05.3J - Segmento - posição 014
        alpha("J", 1) +

        // 06.3J - Tipo de movimento - posição 015
        // 0 = inclusão
        numeric("0", 1) +

        // 07.3J - Código da instrução - posições 016 a 017
        // 00 = inclusão de registro detalhe liberado
        numeric("00", 2) +

        // 08.3J - Código de barras - posições 018 a 061
        numeric(codigoBarrasLimpo, 44) +

        // 09.3J - Nome do cedente - posições 062 a 091
        alpha(nomeCedente, 30) +

        // 10.3J - Data de vencimento nominal - posições 092 a 099
        numeric(
            formatarData(dataVencimento),
            8
        ) +

        // 11.3J - Valor nominal do título - posições 100 a 114
        // 13 inteiros + 2 decimais
        money(valorTitulo, 15) +

        // 12.3J - Desconto + abatimento - posições 115 a 129
        money(
            valorDescontoAbatimento,
            15
        ) +

        // 13.3J - Mora + multa - posições 130 a 144
        money(
            valorMoraMulta,
            15
        ) +

        // 14.3J - Data do pagamento - posições 145 a 152
        numeric(
            formatarData(dataPagamento),
            8
        ) +

        // 15.3J - Valor do pagamento - posições 153 a 167
        money(valorPagamento, 15) +

        // 16.3J - Quantidade da moeda - posições 168 a 182
        // Para pagamento em reais, manter zerado.
        numeric("0", 15) +

        // 17.3J - Seu número - posições 183 a 202
        alpha(seuNumero, 20) +

        // 18.3J - Nosso número - posições 203 a 222
        alpha(nossoNumero, 20) +

        // 19.3J - Código da moeda - posições 223 a 224
        // 09 = Real
        numeric("09", 2) +

        // 20.3J - Uso exclusivo FEBRABAN/CNAB - posições 225 a 230
        spaces(6) +

        // 21.3J - Ocorrências de retorno - posições 231 a 240
        spaces(10);

    return assert240(
        linha,
        "Segmento J Sicoob boleto"
    );
}