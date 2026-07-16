import {
    alpha,
    assert240,
    numeric,
    spaces,
} from "../../cnab240Utils";

export type TipoInscricaoJ52 =
    | 0
    | 1
    | 2;

export type SegmentoJ52SicoobBoletoInput = {
    numeroLote: number;
    numeroRegistroLote: number;

    /**
     * Código de movimento da remessa.
     * Para inclusão, use "00".
     */
    codigoMovimento?: string;

    sacadoTipoInscricao?: TipoInscricaoJ52;
    sacadoDocumento?: string;
    sacadoNome?: string;

    cedenteTipoInscricao?: TipoInscricaoJ52;
    cedenteDocumento?: string;
    cedenteNome?: string;

    sacadorTipoInscricao?: TipoInscricaoJ52;
    sacadorDocumento?: string;
    sacadorNome?: string;
};

function somenteCpfCnpjChars(
    value: unknown
): string {
    return String(value ?? "")
        .replace(/[^a-zA-Z0-9]/g, "")
        .toUpperCase();
}

function normalizarTipoInscricao(
    value: unknown
): TipoInscricaoJ52 {
    const tipo = Number(value);

    if (
        tipo === 1 ||
        tipo === 2
    ) {
        return tipo;
    }

    return 0;
}

export function gerarSegmentoJ52SicoobBoleto({
    numeroLote,
    numeroRegistroLote,

    codigoMovimento = "00",

    sacadoTipoInscricao = 0,
    sacadoDocumento = "",
    sacadoNome = "",

    cedenteTipoInscricao = 0,
    cedenteDocumento = "",
    cedenteNome = "",

    sacadorTipoInscricao = 0,
    sacadorDocumento = "",
    sacadorNome = "",
}: SegmentoJ52SicoobBoletoInput): string {
    const tipoSacado =
        normalizarTipoInscricao(
            sacadoTipoInscricao
        );

    const tipoCedente =
        normalizarTipoInscricao(
            cedenteTipoInscricao
        );

    const tipoSacador =
        normalizarTipoInscricao(
            sacadorTipoInscricao
        );

    const documentoSacado =
        somenteCpfCnpjChars(
            sacadoDocumento
        );

    const documentoCedente =
        somenteCpfCnpjChars(
            cedenteDocumento
        );

    const documentoSacador =
        somenteCpfCnpjChars(
            sacadorDocumento
        );

    const linha =
        // 01.4.J52 - Banco - posições 001 a 003
        numeric("756", 3) +

        // 02.4.J52 - Lote - posições 004 a 007
        numeric(numeroLote, 4) +

        // 03.4.J52 - Tipo de registro - posição 008
        numeric("3", 1) +

        // 04.4.J52 - Sequencial no lote - posições 009 a 013
        numeric(numeroRegistroLote, 5) +

        // 05.4.J52 - Segmento - posição 014
        alpha("J", 1) +

        // 06.4.J52 - Uso exclusivo FEBRABAN - posição 015
        spaces(1) +

        // 07.4.J52 - Código de movimento - posições 016 a 017
        numeric(codigoMovimento, 2) +

        // 08.4.J52 - Identificação do registro opcional - posições 018 a 019
        numeric("52", 2) +

        // 09.4.J52 - Tipo de inscrição do sacado - posição 020
        numeric(tipoSacado, 1) +

        // 10.4.J52 - Documento do sacado - posições 021 a 035
        alpha(documentoSacado, 15) +

        // 11.4.J52 - Nome do sacado - posições 036 a 075
        alpha(sacadoNome, 40) +

        // 12.4.J52 - Tipo de inscrição do cedente - posição 076
        numeric(tipoCedente, 1) +

        // 13.4.J52 - Documento do cedente - posições 077 a 091
        alpha(documentoCedente, 15) +

        // 14.4.J52 - Nome do cedente - posições 092 a 131
        alpha(cedenteNome, 40) +

        // 15.4.J52 - Tipo de inscrição do sacador - posição 132
        numeric(tipoSacador, 1) +

        // 16.4.J52 - Documento do sacador - posições 133 a 147
        alpha(documentoSacador, 15) +

        // 17.4.J52 - Nome do sacador - posições 148 a 187
        alpha(sacadorNome, 40) +

        // 18.4.J52 - Uso exclusivo FEBRABAN/CNAB - posições 188 a 240
        spaces(53);

    return assert240(
        linha,
        "Segmento J-52 Sicoob boleto"
    );
}