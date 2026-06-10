import {
    alpha,
    assert240,
    money,
    numeric,
    spaces,
    zeros,
} from "./cnab240Utils";
import { ICnabTransferencia } from "./types";

export type SegmentoBInput = {
    transferencia: ICnabTransferencia;
    sequencialRegistro: number;
    dataPagamento?: Date;
    codigoBanco?: string;
};

function formatDateDDMMAAAA(date: Date): string {
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const yyyy = String(date.getFullYear());

    return `${dd}${mm}${yyyy}`;
}

function tipoInscricao(cpfCnpj: string): "1" | "2" {
    const digits = numeric(cpfCnpj, 14).replace(/^0+/, "");

    return digits.length > 11 ? "2" : "1";
}

export function gerarSegmentoB({
    transferencia,
    sequencialRegistro,
    dataPagamento = new Date(),
    codigoBanco = "756",
}: SegmentoBInput): string {
    const linha =
        numeric(codigoBanco, 3) +                    // 1-3 Banco
        "0001" +                                     // 4-7 Lote
        "3" +                                        // 8 Tipo registro
        numeric(sequencialRegistro, 5) +             // 9-13 Nº registro no lote
        "B" +                                        // 14 Segmento
        spaces(3) +                                  // 15-17 CNAB
        tipoInscricao(transferencia.cpfCnpj) +       // 18 Tipo inscrição
        numeric(transferencia.cpfCnpj, 14) +         // 19-32 CPF/CNPJ
        spaces(30) +                                 // 33-62 Logradouro
        zeros(5) +                                   // 63-67 Número
        spaces(15) +                                 // 68-82 Complemento
        spaces(15) +                                 // 83-97 Bairro
        spaces(20) +                                 // 98-117 Cidade
        zeros(5) +                                   // 118-122 CEP
        spaces(3) +                                  // 123-125 Complemento CEP
        spaces(2) +                                  // 126-127 UF
        formatDateDDMMAAAA(dataPagamento) +          // 128-135 Vencimento
        money(transferencia.valor, 15) +             // 136-150 Valor documento
        zeros(15) +                                  // 151-165 Abatimento
        zeros(15) +                                  // 166-180 Desconto
        zeros(15) +                                  // 181-195 Mora
        zeros(15) +                                  // 196-210 Multa
        alpha(String(transferencia.sequencia), 15) + // 211-225 Documento favorecido
        "0" +                                        // 226 Aviso
        spaces(6) +                                  // 227-232 Código UG
        spaces(8);                                   // 233-240 CNAB

    return assert240(
        linha.slice(0, 240).padEnd(240, " "),
        "Segmento B"
    );
}