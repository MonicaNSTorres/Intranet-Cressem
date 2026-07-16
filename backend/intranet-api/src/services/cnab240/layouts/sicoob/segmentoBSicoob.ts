import {
    alpha,
    assert240,
    money,
    numeric,
    spaces,
} from "../../cnab240Utils";

export type TipoTransferenciaSicoob = 1 | 2;

/**
 * 1 = Crédito em conta Sicoob
 * 2 = TED para outro banco
 */
export type SegmentoBSicoobInput = {
    numeroLote: number;
    numeroRegistroLote: number;

    tipoTransferencia: TipoTransferenciaSicoob;

    cpfCnpjFavorecido: string;

    enderecoFavorecido?: string;
    numeroFavorecido?: string;
    complementoFavorecido?: string;
    bairroFavorecido?: string;
    cidadeFavorecido?: string;
    cepFavorecido?: string;
    cepComplementoFavorecido?: string;
    ufFavorecido?: string;

    dataVencimento?: Date | null;
    valorDocumento?: number;
    valorAbatimento?: number;
    valorDesconto?: number;
    valorMora?: number;
    valorMulta?: number;

    codigoDocumentoFavorecido?: string;
    avisoFavorecido?: "0" | "2" | "5" | "6" | "7";

    codigoUgCentralizadora?: string;
};

function onlyDigits(value: unknown): string {
    return String(value ?? "").replace(/\D/g, "");
}

function determinarTipoInscricao(
    cpfCnpj: string
): "1" | "2" {
    const documento = onlyDigits(cpfCnpj);

    return documento.length <= 11
        ? "1"
        : "2";
}

function formatarData(
    date?: Date | null
): string {
    if (!date) {
        return "00000000";
    }

    return (
        String(date.getDate()).padStart(2, "0") +
        String(date.getMonth() + 1).padStart(2, "0") +
        String(date.getFullYear()).padStart(4, "0")
    );
}

function montarInformacao10(params: {
    endereco: string;
}): string {
    return alpha(
        params.endereco,
        35
    );
}

function montarInformacao11(params: {
    numero: string;
    complemento: string;
    bairro: string;
    cidade: string;
    cep: string;
    cepComplemento: string;
    uf: string;
}): string {
    return (
        numeric(params.numero, 5) +
        alpha(params.complemento, 15) +
        alpha(params.bairro, 15) +
        alpha(params.cidade, 20) +
        numeric(params.cep, 5) +
        alpha(params.cepComplemento, 3) +
        alpha(params.uf, 2)
    );
}

function montarInformacao12(params: {
    dataVencimento?: Date | null;
    valorDocumento: number;
    valorAbatimento: number;
    valorDesconto: number;
    valorMora: number;
    valorMulta: number;
    codigoDocumentoFavorecido: string;
    avisoFavorecido: string;
}): string {
    return (
        // Posições 128 a 135
        numeric(
            formatarData(params.dataVencimento),
            8
        ) +

        // Posições 136 a 150
        money(params.valorDocumento, 15) +

        // Posições 151 a 165
        money(params.valorAbatimento, 15) +

        // Posições 166 a 180
        money(params.valorDesconto, 15) +

        // Posições 181 a 195
        money(params.valorMora, 15) +

        // Posições 196 a 210
        money(params.valorMulta, 15) +

        // Posições 211 a 225
        alpha(
            params.codigoDocumentoFavorecido,
            15
        ) +

        // Posição 226
        numeric(
            params.avisoFavorecido,
            1
        )
    );
}

export function gerarSegmentoBSicoob({
    numeroLote,
    numeroRegistroLote,

    tipoTransferencia,

    cpfCnpjFavorecido,

    enderecoFavorecido = "",
    numeroFavorecido = "",
    complementoFavorecido = "",
    bairroFavorecido = "",
    cidadeFavorecido = "",
    cepFavorecido = "",
    cepComplementoFavorecido = "",
    ufFavorecido = "",

    dataVencimento = null,
    valorDocumento = 0,
    valorAbatimento = 0,
    valorDesconto = 0,
    valorMora = 0,
    valorMulta = 0,

    codigoDocumentoFavorecido = "",
    avisoFavorecido = "0",

    codigoUgCentralizadora = "",
}: SegmentoBSicoobInput): string {
    const documentoFavorecido =
        onlyDigits(cpfCnpjFavorecido);

    const tipoInscricao =
        determinarTipoInscricao(
            documentoFavorecido
        );

    /*
     * G100 - Forma de iniciação:
     * campo utilizado para Pix.
     *
     * Nesta implementação de conta Sicoob e TED,
     * deve ficar em branco.
     */
    const formaIniciacao =
        tipoTransferencia === 1 ||
        tipoTransferencia === 2
            ? ""
            : "";

    const informacao10 =
        montarInformacao10({
            endereco: enderecoFavorecido,
        });

    const informacao11 =
        montarInformacao11({
            numero: numeroFavorecido,
            complemento: complementoFavorecido,
            bairro: bairroFavorecido,
            cidade: cidadeFavorecido,
            cep: cepFavorecido,
            cepComplemento:
                cepComplementoFavorecido,
            uf: ufFavorecido,
        });

    const informacao12 =
        montarInformacao12({
            dataVencimento,
            valorDocumento,
            valorAbatimento,
            valorDesconto,
            valorMora,
            valorMulta,
            codigoDocumentoFavorecido,
            avisoFavorecido,
        });

    const linha =
        // 01.3B - Banco - posições 001 a 003
        numeric("756", 3) +

        // 02.3B - Lote - posições 004 a 007
        numeric(numeroLote, 4) +

        // 03.3B - Tipo de registro - posição 008
        numeric("3", 1) +

        // 04.3B - Sequencial no lote - posições 009 a 013
        numeric(numeroRegistroLote, 5) +

        // 05.3B - Segmento - posição 014
        alpha("B", 1) +

        // 06.3B - Forma de iniciação - posições 015 a 017
        alpha(formaIniciacao, 3) +

        // 07.3B - Tipo de inscrição - posição 018
        numeric(tipoInscricao, 1) +

        // 08.3B - Número de inscrição - posições 019 a 032
        numeric(documentoFavorecido, 14) +

        // 09.3B - Informação 10 - posições 033 a 067
        alpha(informacao10, 35) +

        // 10.3B - Informação 11 - posições 068 a 127
        alpha(informacao11, 60) +

        // 11.3B - Informação 12 - posições 128 a 226
        alpha(informacao12, 99) +

        // 12.3B - Código UG Centralizadora - posições 227 a 232
        numeric(codigoUgCentralizadora, 6) +

        // 13.3B - Uso exclusivo FEBRABAN/CNAB - posições 233 a 240
        spaces(8);

    return assert240(
        linha,
        "Segmento B Sicoob"
    );
}