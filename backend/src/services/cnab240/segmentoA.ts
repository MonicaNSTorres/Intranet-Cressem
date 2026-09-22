import { ICnabTransferencia } from "./types";

export type SegmentoAInput = {
    transferencia: ICnabTransferencia;
    sequencialRegistro: number;
    numeroLote: number;
    dataPagamento?: Date;
    codigoBanco?: string;
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

export function gerarSegmentoA({
    transferencia,
    sequencialRegistro,
    numeroLote,
    dataPagamento = new Date(),
    codigoBanco = "033",
}: SegmentoAInput): string {
    const data =
        String(dataPagamento.getDate()).padStart(2, "0") +
        String(dataPagamento.getMonth() + 1).padStart(2, "0") +
        dataPagamento.getFullYear();

    const valor = Math.round(Number(transferencia.valor || 0) * 100);

    // Crédito bancário = câmara 000
    // TED = câmara 018
    const camara =
        Number(transferencia.tipo) === 1
            ? "000"
            : "018";

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
        "A" +

        // Movimento
        "0" +

        // Instrução
        "00" +

        // Câmara centralizadora
        numeric(camara, 3) +

        // Banco favorecido
        numeric(transferencia.banco, 3) +

        // Agência favorecido
        numeric(transferencia.agencia, 5) +

        // DV agência
        " " +

        // Conta favorecido
        numeric(transferencia.conta, 12) +

        // DV conta
        alpha(transferencia.dvConta, 1) +

        // DV ag/conta
        " " +

        // Nome favorecido
        alpha(
            (transferencia.nome || "").toUpperCase(),
            30
        ) +

        // Seu número
        numeric("", 20) +

        // Data pagamento
        data +

        // Moeda
        "BRL" +

        // Quantidade moeda
        numeric("", 15) +

        // Valor pagamento
        numeric(valor, 15) +

        // Nosso número
        alpha("", 20) +

        // Data real pagamento
        data +

        // Valor real pagamento
        numeric("", 15) +

        // Informações 2
        alpha(
            (transferencia.descricao || "").toUpperCase(),
            40
        ) +

        // Finalidade TED
        "01" +

        // Complementos
        alpha("", 5) +
        alpha("", 2) +
        alpha("", 3) +

        // Aviso favorecido
        "0" +

        // CNAB
        alpha("", 10)
    );
}