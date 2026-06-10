import {
    assert240,
    numeric,
    spaces,
} from "./cnab240Utils";

export type TrailerArquivoInput = {
    quantidadePagamentos: number;
    codigoBanco?: string;
};

export function gerarTrailerArquivo({
    quantidadePagamentos,
    codigoBanco = "756",
}: TrailerArquivoInput): string {

    /**
     * Header Arquivo = 1
     * Header Lote = 1
     * Segmentos A + B = 2 registros por pagamento
     * Trailer Lote = 1
     * Trailer Arquivo = 1
     */
    const totalRegistrosArquivo =
        1 + // Header Arquivo
        1 + // Header Lote
        (quantidadePagamentos * 2) +
        1 + // Trailer Lote
        1;  // Trailer Arquivo

    const linha =
        numeric(codigoBanco, 3) +      // 1-3 Código banco
        "9999" +                       // 4-7 Lote
        "9" +                          // 8 Tipo registro
        spaces(9) +                    // 9-17 CNAB
        numeric(1, 6) +                // 18-23 Quantidade lotes
        numeric(totalRegistrosArquivo, 6) + // 24-29 Quantidade registros
        spaces(211);                   // 30-240 CNAB

    return assert240(
        linha.slice(0, 240).padEnd(240, " "),
        "Trailer Arquivo"
    );
}