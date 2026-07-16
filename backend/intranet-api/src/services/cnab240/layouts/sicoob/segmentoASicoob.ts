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
export type SegmentoASicoobInput = {
    numeroLote: number;
    numeroRegistroLote: number;

    tipoTransferencia: TipoTransferenciaSicoob;

    bancoFavorecido: string;
    agenciaFavorecido: string;
    dvAgenciaFavorecido?: string;

    contaFavorecido: string;
    dvContaFavorecido: string;
    dvAgenciaContaFavorecido?: string;

    nomeFavorecido: string;

    seuNumero?: string;
    dataPagamento: Date;
    valorPagamento: number;

    informacao2?: string;

    /**
     * Campo P011, posições 220 a 224.
     * Exemplo:
     * 00005 = pagamento de fornecedores
     * 00010 = crédito em conta
     */
    codigoFinalidadeTed?: string;

    codigoFinalidadeComplementar?: string;
    avisoFavorecido?: "0" | "2" | "5" | "6" | "7";
};

function formatarData(date: Date): string {
    return (
        String(date.getDate()).padStart(2, "0") +
        String(date.getMonth() + 1).padStart(2, "0") +
        String(date.getFullYear()).padStart(4, "0")
    );
}

function obterCodigoCamara(
    tipoTransferencia: TipoTransferenciaSicoob
): string {
    /*
     * P001:
     * 018 = TED
     *
     * Para crédito entre contas Sicoob, o campo é opcional.
     * Enviamos 000.
     */
    return tipoTransferencia === 2
        ? "018"
        : "000";
}

export function gerarSegmentoASicoob({
    numeroLote,
    numeroRegistroLote,

    tipoTransferencia,

    bancoFavorecido,
    agenciaFavorecido,
    dvAgenciaFavorecido = "",

    contaFavorecido,
    dvContaFavorecido,
    dvAgenciaContaFavorecido = "",

    nomeFavorecido,

    seuNumero = "",
    dataPagamento,
    valorPagamento,

    informacao2 = "",

    codigoFinalidadeTed = "00010",
    codigoFinalidadeComplementar = "",
    avisoFavorecido = "0",
}: SegmentoASicoobInput): string {
    const codigoCamara =
        obterCodigoCamara(tipoTransferencia);

    const finalidadeTed =
        tipoTransferencia === 2
            ? codigoFinalidadeTed
            : "00000";

    const linha =
        // 01.3A - Banco - posições 001 a 003
        numeric("756", 3) +

        // 02.3A - Lote de serviço - posições 004 a 007
        numeric(numeroLote, 4) +

        // 03.3A - Tipo de registro - posição 008
        numeric("3", 1) +

        // 04.3A - Número sequencial no lote - posições 009 a 013
        numeric(numeroRegistroLote, 5) +

        // 05.3A - Código do segmento - posição 014
        alpha("A", 1) +

        // 06.3A - Tipo de movimento - posição 015
        // 0 = inclusão
        numeric("0", 1) +

        // 07.3A - Código da instrução - posições 016 a 017
        // 00 = inclusão de registro detalhe liberado
        numeric("00", 2) +

        // 08.3A - Câmara centralizadora - posições 018 a 020
        numeric(codigoCamara, 3) +

        // 09.3A - Banco do favorecido - posições 021 a 023
        numeric(bancoFavorecido, 3) +

        // 10.3A - Agência do favorecido - posições 024 a 028
        numeric(agenciaFavorecido, 5) +

        // 11.3A - DV da agência - posição 029
        alpha(dvAgenciaFavorecido, 1) +

        // 12.3A - Conta do favorecido - posições 030 a 041
        numeric(contaFavorecido, 12) +

        // 13.3A - DV da conta - posição 042
        numeric(dvContaFavorecido, 1) +

        // 14.3A - DV agência/conta - posição 043
        alpha(dvAgenciaContaFavorecido, 1) +

        // 15.3A - Nome do favorecido - posições 044 a 073
        alpha(nomeFavorecido, 30) +

        // 16.3A - Seu número - posições 074 a 093
        alpha(seuNumero, 20) +

        // 17.3A - Data do pagamento - posições 094 a 101
        numeric(formatarData(dataPagamento), 8) +

        // 18.3A - Tipo de moeda - posições 102 a 104
        alpha("BRL", 3) +

        // 19.3A - Quantidade da moeda - posições 105 a 119
        // 10 inteiros + 5 decimais
        numeric("0", 15) +

        // 20.3A - Valor do pagamento - posições 120 a 134
        // 13 inteiros + 2 decimais
        money(valorPagamento, 15) +

        // 21.3A - Nosso número - posições 135 a 154
        spaces(20) +

        // 22.3A - Data real da efetivação - posições 155 a 162
        // Campo de retorno
        numeric("0", 8) +

        // 23.3A - Valor real da efetivação - posições 163 a 177
        // Campo de retorno
        numeric("0", 15) +

        // 24.3A - Informação 2 - posições 178 a 217
        alpha(informacao2, 40) +

        // 25.3A - Uso exclusivo FEBRABAN - posições 218 a 219
        spaces(2) +

        // 26.3A - Finalidade TED - posições 220 a 224
        numeric(finalidadeTed, 5) +

        // 27.3A - Finalidade complementar - posições 225 a 226
        alpha(codigoFinalidadeComplementar, 2) +

        // 28.3A - Uso exclusivo FEBRABAN - posições 227 a 229
        spaces(3) +

        // 29.3A - Aviso ao favorecido - posição 230
        numeric(avisoFavorecido, 1) +

        // 30.3A - Ocorrências - posições 231 a 240
        spaces(10);

    return assert240(
        linha,
        "Segmento A Sicoob"
    );
}