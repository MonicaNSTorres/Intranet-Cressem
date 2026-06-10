import { gerarHeaderArquivo } from "./headerArquivo";
import { gerarHeaderLote } from "./headerLote";
import { gerarSegmentoA } from "./segmentoA";
import { gerarSegmentoB } from "./segmentoB";
import { gerarTrailerLote } from "./trailerLote";
import { gerarTrailerArquivo } from "./trailerArquivo";
import { ICnabTransferencia } from "./types";

export type GerarCnab240RealInput = {
    transferencias: ICnabTransferencia[];
    empresaNome: string;
    empresaInscricao: string;
    agencia: string;
    conta: string;
    dvConta?: string;
    codigoBanco?: string;
    sequencialArquivo?: number;
    dataPagamento?: Date;
};

export function gerarCnab240Real({
    transferencias,
    empresaNome,
    empresaInscricao,
    agencia,
    conta,
    dvConta = "",
    codigoBanco = "756",
    sequencialArquivo = 1,
    dataPagamento = new Date(),
}: GerarCnab240RealInput): string {

    const linhas: string[] = [];

    // Header Arquivo
    linhas.push(
        gerarHeaderArquivo({
            codigoBanco,
            empresaNome,
            empresaInscricao,
            agencia,
            conta,
            dvConta,
            sequencialArquivo,
        })
    );

    // Header Lote
    linhas.push(
        gerarHeaderLote({
            codigoBanco,
            empresaInscricao,
            empresaNome,
            agencia,
            conta,
            dvConta,
        })
    );

    let sequencialRegistro = 1;

    // Segmentos A e B
    for (const transferencia of transferencias) {

        linhas.push(
            gerarSegmentoA({
                codigoBanco,
                transferencia,
                sequencialRegistro,
                dataPagamento,
            })
        );

        sequencialRegistro++;

        linhas.push(
            gerarSegmentoB({
                codigoBanco,
                transferencia,
                sequencialRegistro,
                dataPagamento,
            })
        );

        sequencialRegistro++;
    }

    // Trailer Lote
    const valorTotal = transferencias.reduce(
        (acc, item) => acc + Number(item.valor || 0),
        0
    );

    linhas.push(
        gerarTrailerLote({
            codigoBanco,
            quantidadeRegistros: transferencias.length,
            valorTotal,
        })
    );

    // Trailer Arquivo
    linhas.push(
        gerarTrailerArquivo({
            codigoBanco,
            quantidadePagamentos: transferencias.length,
        })
    );

    return linhas.join("\r\n");
}