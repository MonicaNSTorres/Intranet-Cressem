import {
    assert240,
    numeric,
    spaces,
} from "../../cnab240Utils";

export type TrailerArquivoSicoobInput = {
    /**
     * Quantidade de lotes no arquivo.
     *
     * Nesta implementação sempre será 1.
     */
    quantidadeLotes: number;

    /**
     * Quantidade total de registros do arquivo:
     *
     * Header Arquivo
     * +
     * Header Lote
     * +
     * Segmentos A/B
     * +
     * Trailer Lote
     * +
     * Trailer Arquivo
     */
    quantidadeRegistrosArquivo: number;
};

export function gerarTrailerArquivoSicoob({
    quantidadeLotes,
    quantidadeRegistrosArquivo,
}: TrailerArquivoSicoobInput): string {
    const linha =
        // 01.9 - Código do banco - posições 001 a 003
        numeric("756", 3) +

        // 02.9 - Lote de serviço - posições 004 a 007
        numeric("9999", 4) +

        // 03.9 - Tipo de registro - posição 008
        numeric("9", 1) +

        // 04.9 - Uso exclusivo FEBRABAN/CNAB - posições 009 a 017
        spaces(9) +

        // 05.9 - Quantidade de lotes do arquivo - posições 018 a 023
        numeric(quantidadeLotes, 6) +

        // 06.9 - Quantidade de registros do arquivo - posições 024 a 029
        numeric(quantidadeRegistrosArquivo, 6) +

        // 07.9 - Quantidade de contas para conciliação - posições 030 a 035
        numeric("0", 6) +

        // 08.9 - Uso exclusivo FEBRABAN/CNAB - posições 036 a 240
        spaces(205);

    return assert240(
        linha,
        "Trailer de arquivo Sicoob"
    );
}