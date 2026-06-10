import {
    assert240,
    money,
    numeric,
    spaces,
} from "./cnab240Utils";

export type TrailerLoteInput = {
    quantidadeRegistros: number;
    valorTotal: number;
    codigoBanco?: string;
};

export function gerarTrailerLote({
    quantidadeRegistros,
    valorTotal,
    codigoBanco = "756",
}: TrailerLoteInput): string {

    /**
     * Header do lote = 1
     * Cada pagamento possui Segmento A + Segmento B = 2 registros
     * Trailer do lote = 1
     */
    const totalRegistrosLote =
        1 + (quantidadeRegistros * 2) + 1;

    const linha =
        numeric(codigoBanco, 3) +              // 1-3 Banco
        "0001" +                               // 4-7 Lote
        "5" +                                  // 8 Tipo registro
        spaces(9) +                            // 9-17 CNAB
        numeric(totalRegistrosLote, 6) +       // 18-23 Quantidade registros lote
        money(valorTotal, 18) +                // 24-41 Somatória valores
        zeros(6) +                             // 42-47 Quantidade moeda
        spaces(193);                           // 48-240 CNAB

    return assert240(
        linha.slice(0, 240).padEnd(240, " "),
        "Trailer Lote"
    );
}

function zeros(size: number): string {
    return "0".repeat(size);
}