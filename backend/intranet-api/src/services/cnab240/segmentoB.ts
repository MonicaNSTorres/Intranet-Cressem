import { ICnabTransferencia } from "./types";

export type SegmentoBInput = {
    transferencia: ICnabTransferencia;
    sequencialRegistro: number;
    numeroLote: number;
    dataPagamento?: Date;
    codigoBanco?: string;

    enderecoEmpresa: string;
    numeroEmpresa: string;
    complementoEmpresa?: string;
    cidadeEmpresa: string;
    cepEmpresa: string;
    cepComplementoEmpresa: string;
    ufEmpresa: string;
};

function alpha(value: string | number, length: number) {
    return String(value || "")
        .substring(0, length)
        .padEnd(length, " ");
}

function numeric(value: string | number, length: number) {
    return String(value || "")
        .replace(/\D/g, "")
        .substring(0, length)
        .padStart(length, "0");
}

export function gerarSegmentoB({
    transferencia,
    sequencialRegistro,
    numeroLote,
    dataPagamento = new Date(),
    codigoBanco = "033",

    enderecoEmpresa,
    numeroEmpresa,
    complementoEmpresa = "",
    cidadeEmpresa,
    cepEmpresa,
    cepComplementoEmpresa,
    ufEmpresa,
}: SegmentoBInput): string {
    const data =
        String(dataPagamento.getDate()).padStart(2, "0") +
        String(dataPagamento.getMonth() + 1).padStart(2, "0") +
        dataPagamento.getFullYear();

    const valor = Math.round(Number(transferencia.valor || 0) * 100);

    return (
        // Banco
        numeric(codigoBanco, 3) +

        // Lote
        numeric(numeroLote, 4) +

        // Tipo registro
        "3" +

        // Nº sequencial registro
        numeric(sequencialRegistro, 5) +

        // Segmento
        "B" +

        // CNAB
        " ".repeat(3) +

        // Tipo inscrição favorecido: 1 = CPF
        "1" +

        // CPF favorecido
        numeric(transferencia.cpfCnpj, 14) +

        // Logradouro
        alpha(enderecoEmpresa, 30) +

        // Número
        numeric(numeroEmpresa, 5) +

        // Complemento
        alpha(complementoEmpresa, 15) +

        // Bairro
        alpha("", 15) +

        // Cidade
        alpha(cidadeEmpresa, 20) +

        // CEP
        numeric(cepEmpresa, 5) +

        // Complemento CEP
        numeric(cepComplementoEmpresa, 3) +

        // UF
        alpha(ufEmpresa, 2) +

        // Data vencimento/pagamento
        data +

        // Valor documento
        numeric(valor, 15) +

        // Abatimento
        numeric("", 15) +

        // Desconto
        numeric("", 15) +

        // Mora
        numeric("", 15) +

        // Multa
        numeric("", 15) +

        // Documento favorecido
        "0000           " +

        // Aviso ao favorecido
        "0" +

        // Código UG centralizadora
        "0000          "
    );
}