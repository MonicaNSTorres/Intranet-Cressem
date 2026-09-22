import {
    assert240,
    money,
    numeric,
    spaces,
} from "../../cnab240Utils";

export type TrailerLoteSicoobInput = {
    numeroLote: number;

    /**
     * Quantidade total de registros dentro do lote:
     * header do lote + segmentos A/B + trailer do lote.
     */
    quantidadeRegistrosLote: number;

    /**
     * Soma dos valores informados nos segmentos A.
     */
    valorTotal: number;

    /**
     * Campo opcional: 13 inteiros + 5 decimais.
     * Para pagamentos em reais, pode permanecer zerado.
     */
    quantidadeMoeda?: number;

    /**
     * Campo opcional gerado pelo banco.
     * Em arquivo de remessa, pode permanecer zerado.
     */
    numeroAvisoDebito?: number;
};

function quantidadeMoedaCnab(
    valor: number
): string {
    const normalizado = Number.isFinite(valor)
        ? Math.max(0, valor)
        : 0;

    const inteiro = Math.round(
        normalizado * 100000
    );

    return numeric(inteiro, 18);
}

export function gerarTrailerLoteSicoob({
    numeroLote,
    quantidadeRegistrosLote,
    valorTotal,
    quantidadeMoeda = 0,
    numeroAvisoDebito = 0,
}: TrailerLoteSicoobInput): string {
    const linha =
        // 01.5 - Código do banco - posições 001 a 003
        numeric("756", 3) +

        // 02.5 - Lote de serviço - posições 004 a 007
        numeric(numeroLote, 4) +

        // 03.5 - Tipo de registro - posição 008
        numeric("5", 1) +

        // 04.5 - Uso exclusivo FEBRABAN/CNAB - posições 009 a 017
        spaces(9) +

        // 05.5 - Quantidade de registros do lote - posições 018 a 023
        numeric(quantidadeRegistrosLote, 6) +

        // 06.5 - Somatória dos valores - posições 024 a 041
        // 16 inteiros + 2 decimais = 18 posições
        money(valorTotal, 18) +

        // 07.5 - Somatória da quantidade de moedas - posições 042 a 059
        // 13 inteiros + 5 decimais = 18 posições
        quantidadeMoedaCnab(quantidadeMoeda) +

        // 08.5 - Número do aviso de débito - posições 060 a 065
        numeric(numeroAvisoDebito, 6) +

        // 09.5 - Uso exclusivo FEBRABAN/CNAB - posições 066 a 230
        spaces(165) +

        // 10.5 - Ocorrências para retorno - posições 231 a 240
        spaces(10);

    return assert240(
        linha,
        "Trailer de lote Sicoob"
    );
}