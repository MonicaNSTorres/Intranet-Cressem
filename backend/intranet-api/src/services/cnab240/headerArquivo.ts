type HeaderArquivoInput = {
    codigoBanco: string;
    nomeBanco: string;

    empresaNome: string;
    empresaInscricao: string;

    codigoConvenioBanco: string;

    agencia: string;
    dvAgencia?: string;

    conta: string;
    dvConta: string;

    sequencialArquivo: number;
};

function padRight(valor: string | number, tamanho: number) {
    return String(valor || "")
        .substring(0, tamanho)
        .padEnd(tamanho, " ");
}

function padLeft(
    valor: string | number,
    tamanho: number,
    caractere = "0"
) {
    return String(valor || "")
        .substring(0, tamanho)
        .padStart(tamanho, caractere);
}

export function gerarHeaderArquivo({
    codigoBanco,
    nomeBanco,
    empresaNome,
    empresaInscricao,
    codigoConvenioBanco,
    agencia,
    dvAgencia = " ",
    conta,
    dvConta,
    sequencialArquivo,
}: HeaderArquivoInput) {
    const agora = new Date();

    const dataGeracao =
        String(agora.getDate()).padStart(2, "0") +
        String(agora.getMonth() + 1).padStart(2, "0") +
        agora.getFullYear();

    const horaGeracao =
        String(agora.getHours()).padStart(2, "0") +
        String(agora.getMinutes()).padStart(2, "0") +
        "00";

    return (
        // Banco
        padLeft(codigoBanco, 3) +

        // Lote
        "0000" +

        // Registro
        "0" +

        // CNAB
        " ".repeat(9) +

        // Tipo inscrição
        "2" +

        // CNPJ empresa
        padLeft(empresaInscricao.replace(/\D/g, ""), 14) +

        // Convênio Santander
        padRight(codigoConvenioBanco, 20) +

        // Agência
        padLeft(agencia, 5) +

        // DV agência
        padRight(dvAgencia, 1) +

        // Conta
        padLeft(conta, 12) +

        // DV conta
        padRight(dvConta, 1) +

        // DV ag/conta
        " " +

        // Nome empresa
        padRight(empresaNome.toUpperCase(), 30) +

        // Nome banco
        padRight(nomeBanco.toUpperCase(), 30) +

        // CNAB
        " ".repeat(10) +

        // Remessa
        "1" +

        // Data geração
        dataGeracao +

        // Hora geração
        horaGeracao +

        // Sequencial arquivo
        padLeft(sequencialArquivo, 6) +

        // Layout arquivo
        "103" +

        // Densidade
        "00000" +

        // Reservado banco
        " ".repeat(20) +

        // Reservado empresa
        " ".repeat(20) +

        // CNAB final
        " ".repeat(29)
    );
}