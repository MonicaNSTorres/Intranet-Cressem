type TrailerArquivoInput = {
    codigoBanco?: string;
    quantidadeLotes: number;
    quantidadeRegistrosArquivo: number;
};

function alpha(value: string | number, length: number) {
    return String(value || "")
        .substring(0, length)
        .padEnd(length, " ");
}

function numeric(
    value: string | number,
    length: number,
    pad = "0"
) {
    return String(value || "")
        .replace(/\D/g, "")
        .substring(0, length)
        .padStart(length, pad);
}

export function gerarTrailerArquivo({
    codigoBanco = "033",
    quantidadeLotes,
    quantidadeRegistrosArquivo,
}: TrailerArquivoInput) {
    return (
        // Banco
        numeric(codigoBanco, 3) +

        // Lote fixo 9999
        "9999" +

        // Tipo registro = 9
        "9" +

        // CNAB
        alpha("", 9) +

        // Quantidade de lotes
        numeric(quantidadeLotes, 6) +

        // Quantidade total de registros do arquivo
        numeric(quantidadeRegistrosArquivo, 6) +

        // CNAB
        alpha("", 6) +

        // Reservado CNAB
        alpha("", 205)
    );
}