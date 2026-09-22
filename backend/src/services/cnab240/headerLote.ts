type HeaderLoteInput = {
    codigoBanco: string;

    empresaInscricao: string;
    codigoConvenioBanco: string;
    empresaNome: string;

    agencia: string;
    dvAgencia?: string;

    conta: string;
    dvConta: string;

    numeroLote: number;
    formaLancamento: "01" | "41";

    enderecoEmpresa: string;
    numeroEmpresa: string;
    complementoEmpresa?: string;
    cidadeEmpresa: string;
    cepEmpresa: string;
    cepComplementoEmpresa: string;
    ufEmpresa: string;
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

export function gerarHeaderLote({
    codigoBanco,
    empresaInscricao,
    codigoConvenioBanco,
    empresaNome,
    agencia,
    dvAgencia = " ",
    conta,
    dvConta,
    numeroLote,
    formaLancamento,
    enderecoEmpresa,
    numeroEmpresa,
    complementoEmpresa = "",
    cidadeEmpresa,
    cepEmpresa,
    cepComplementoEmpresa,
    ufEmpresa,
}: HeaderLoteInput) {
    return (
        // Banco
        padLeft(codigoBanco, 3) +

        // Lote
        padLeft(numeroLote, 4) +

        // Registro
        "1" +

        // Tipo operação + tipo serviço
        "C20" +

        // Forma lançamento: 01 crédito bancário / 41 TED
        formaLancamento +

        // Layout lote + CNAB
        "046 " +

        // Tipo inscrição
        "2" +

        // CNPJ
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

        // DV agência/conta
        " " +

        // Nome empresa
        padRight(empresaNome.toUpperCase(), 30) +

        // Mensagem
        " ".repeat(40) +

        // Endereço empresa
        padRight(enderecoEmpresa, 30) +

        // Número endereço
        padLeft(numeroEmpresa, 5) +

        // Complemento
        padRight(complementoEmpresa, 15) +

        // Cidade
        padRight(cidadeEmpresa, 20) +

        // CEP + complemento CEP
        padLeft(cepEmpresa, 5) +
        padLeft(cepComplementoEmpresa, 3) +

        // UF
        padRight(ufEmpresa, 2) +

        // CNAB final
        " ".repeat(18)
    );
}