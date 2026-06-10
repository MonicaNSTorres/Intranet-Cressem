import {
    alpha,
    assert240,
    money,
    numeric,
    spaces,
    zeros,
} from "./cnab240Utils";
import { ICnabTransferencia } from "./types";

export type SegmentoAInput = {
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

function getCamaraCentralizadora(banco: string): string {
    const bancoNormalizado = numeric(banco, 3);

    if (bancoNormalizado === "756") return "000";

    return "018";
}

function getFormaFinalidadeDoc(banco: string): string {
    const bancoNormalizado = numeric(banco, 3);

    if (bancoNormalizado === "756") return "01";

    return "03";
}

export function gerarSegmentoA({
    transferencia,
    sequencialRegistro,
    dataPagamento = new Date(),
    codigoBanco = "756",
}: SegmentoAInput): string {
    const bancoFavorecido = numeric(transferencia.banco || "756", 3);

    const linha =
        numeric(codigoBanco, 3) +                       // 1-3 Banco
        "0001" +                                        // 4-7 Lote
        "3" +                                           // 8 Tipo registro
        numeric(sequencialRegistro, 5) +                // 9-13 Nº registro no lote
        "A" +                                           // 14 Segmento
        "0" +                                           // 15 Tipo movimento
        "00" +                                          // 16-17 Código movimento
        getCamaraCentralizadora(bancoFavorecido) +      // 18-20 Câmara
        bancoFavorecido +                               // 21-23 Banco favorecido
        numeric(transferencia.agencia, 5) +             // 24-28 Agência favorecido
        " " +                                           // 29 DV agência
        numeric(transferencia.conta, 12) +              // 30-41 Conta favorecido
        numeric(transferencia.dvConta, 1) +             // 42 DV conta
        " " +                                           // 43 DV agência/conta
        alpha(transferencia.nome, 30) +                 // 44-73 Nome favorecido
        alpha(String(transferencia.sequencia), 20) +    // 74-93 Seu número
        formatDateDDMMAAAA(dataPagamento) +             // 94-101 Data pagamento
        alpha("BRL", 3) +                               // 102-104 Tipo moeda
        zeros(15) +                                     // 105-119 Quantidade moeda
        money(transferencia.valor, 15) +                // 120-134 Valor pagamento
        spaces(20) +                                    // 135-154 Nosso número
        spaces(8) +                                     // 155-162 Data real efetivação
        zeros(15) +                                     // 163-177 Valor real efetivação
        alpha(transferencia.descricao, 40) +            // 178-217 Informação 2
        getFormaFinalidadeDoc(bancoFavorecido) +        // 218-219 Finalidade DOC
        zeros(5) +                                      // 220-224 Finalidade TED
        spaces(2) +                                     // 225-226 Finalidade complementar
        spaces(3) +                                     // 227-229 CNAB
        "0" +                                           // 230 Aviso
        spaces(10);                                     // 231-240 Ocorrências

    return assert240(
        linha.slice(0, 240).padEnd(240, " "),
        "Segmento A"
    );
}