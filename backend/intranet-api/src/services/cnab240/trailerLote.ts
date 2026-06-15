type TrailerLoteInput = {
    codigoBanco?: string;
    numeroLote: number;
    quantidadeRegistrosDetalhe: number;
    valorTotal: number;
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

export function gerarTrailerLote({
    codigoBanco = "033",
    numeroLote,
    quantidadeRegistrosDetalhe,
    valorTotal,
}: TrailerLoteInput) {
    const valorCentavos = Math.round(Number(valorTotal || 0) * 100);

    // Header do lote + detalhes + trailer do lote
    const quantidadeRegistrosLote =
        quantidadeRegistrosDetalhe + 2;

    return (
        // Banco
        numeric(codigoBanco, 3) +

        // Lote
        numeric(numeroLote, 4) +

        // Tipo registro
        "5" +

        // CNAB
        alpha("", 9) +

        // Quantidade registros lote
        numeric(quantidadeRegistrosLote, 6) +

        // Somatório valores
        numeric(valorCentavos, 18) +

        // Somatório moedas
        numeric("", 18) +

        // Avisos débito
        numeric("", 6) +

        // CNAB
        alpha("", 165) +

        // Ocorrências
        alpha("", 10)
    );
}