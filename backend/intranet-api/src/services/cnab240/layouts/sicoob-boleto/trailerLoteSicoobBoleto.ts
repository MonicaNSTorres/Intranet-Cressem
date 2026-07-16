import {
    assert240,
    money,
    numeric,
    spaces,
} from "../../cnab240Utils";

export type TrailerLoteSicoobBoletoInput = {
    numeroLote: number;
    quantidadeRegistrosLote: number;
    valorTotalPagamentos: number;
    quantidadeMoeda?: number;
    numeroAvisoDebito?: number;
};

function formatarQuantidadeMoeda(
    valor: number
): string {
    const numero = Number.isFinite(Number(valor))
        ? Math.max(0, Number(valor))
        : 0;

    return numeric(
        Math.round(numero * 100000),
        18
    );
}

export function gerarTrailerLoteSicoobBoleto({
    numeroLote,
    quantidadeRegistrosLote,
    valorTotalPagamentos,
    quantidadeMoeda = 0,
    numeroAvisoDebito = 0,
}: TrailerLoteSicoobBoletoInput): string {
    const linha =
        // 001–003 Banco
        numeric("756", 3) +

        // 004–007 Lote
        numeric(numeroLote, 4) +

        // 008 Tipo de registro
        numeric("5", 1) +

        // 009–017 Uso CNAB
        spaces(9) +

        // 018–023 Quantidade de registros
        numeric(
            quantidadeRegistrosLote,
            6
        ) +

        // 024–041 Somatória dos valores
        money(
            valorTotalPagamentos,
            18
        ) +

        // 042–059 Somatória da quantidade de moedas
        formatarQuantidadeMoeda(
            quantidadeMoeda
        ) +

        // 060–065 Número do aviso de débito
        numeric(
            numeroAvisoDebito,
            6
        ) +

        // 066–230 Uso CNAB
        spaces(165) +

        // 231–240 Ocorrências
        spaces(10);

    return assert240(
        linha,
        "Trailer de lote Sicoob boleto"
    );
}