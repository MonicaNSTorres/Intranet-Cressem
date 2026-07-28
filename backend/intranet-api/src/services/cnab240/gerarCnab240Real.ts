import { gerarHeaderArquivo } from "./headerArquivo";
import { gerarHeaderLote } from "./headerLote";
import { gerarSegmentoA } from "./segmentoA";
import { gerarSegmentoB } from "./segmentoB";
import { gerarTrailerLote } from "./trailerLote";
import { gerarTrailerArquivo } from "./trailerArquivo";
import { ICnabTransferencia } from "./types";

export type GerarCnab240RealInput = {
    transferencias: ICnabTransferencia[];

    codigoBanco?: string;
    nomeBanco?: string;

    empresaNome: string;
    empresaInscricao: string;
    codigoConvenioBanco: string;

    agencia: string;
    dvAgencia?: string;
    conta: string;
    dvConta: string;

    enderecoEmpresa: string;
    numeroEmpresa: string;
    complementoEmpresa?: string;
    cidadeEmpresa: string;
    cepEmpresa: string;
    cepComplementoEmpresa: string;
    ufEmpresa: string;

    sequencialArquivo: number;
    dataPagamento?: Date;
};

export function gerarCnab240Real({
    transferencias,

    codigoBanco = "033",
    nomeBanco = "SANTANDER",

    empresaNome,
    empresaInscricao,
    codigoConvenioBanco,

    agencia,
    dvAgencia = " ",
    conta,
    dvConta,

    enderecoEmpresa,
    numeroEmpresa,
    complementoEmpresa = "",
    cidadeEmpresa,
    cepEmpresa,
    cepComplementoEmpresa,
    ufEmpresa,

    sequencialArquivo,
    dataPagamento = new Date(),
}: GerarCnab240RealInput): string {
    const linhas: string[] = [];

    linhas.push(
        gerarHeaderArquivo({
            codigoBanco,
            nomeBanco,
            empresaNome,
            empresaInscricao,
            codigoConvenioBanco,
            agencia,
            dvAgencia,
            conta,
            dvConta,
            sequencialArquivo,
        })
    );

    const transferenciasPorTipo = {
        tipo1: transferencias.filter((item) => Number(item.tipo) === 1),
        tipo2: transferencias.filter((item) => Number(item.tipo) === 2),
    };

    let numeroLoteReal = 1;

    for (const grupo of [transferenciasPorTipo.tipo1, transferenciasPorTipo.tipo2]) {
        if (grupo.length === 0) continue;

        const tipoGrupo = Number(grupo[0].tipo) as 1 | 2;

        const formaLancamento = tipoGrupo === 1 ? "01" : "41";

        console.log(
            "[CNAB240 GERADOR]",
            {
                numeroLote: numeroLoteReal,
                tipoGrupo,
                formaLancamento,
                quantidade: grupo.length,
                bancos: grupo.map(
                    (item) => item.banco
                ),
            }
        );

        linhas.push(
            gerarHeaderLote({
                codigoBanco,
                empresaInscricao,
                codigoConvenioBanco,
                empresaNome,
                agencia,
                dvAgencia,
                conta,
                dvConta,
                numeroLote: numeroLoteReal,
                formaLancamento,
                enderecoEmpresa,
                numeroEmpresa,
                complementoEmpresa,
                cidadeEmpresa,
                cepEmpresa,
                cepComplementoEmpresa,
                ufEmpresa,
            })
        );

        let sequencialRegistro = 1;

        for (const transferencia of grupo) {
            linhas.push(
                gerarSegmentoA({
                    codigoBanco,
                    numeroLote: numeroLoteReal,
                    transferencia,
                    sequencialRegistro,
                    dataPagamento,
                })
            );

            sequencialRegistro++;

            if (tipoGrupo === 2) {
                linhas.push(
                    gerarSegmentoB({
                        codigoBanco,
                        numeroLote: numeroLoteReal,
                        transferencia,
                        sequencialRegistro,
                        dataPagamento,
                        enderecoEmpresa,
                        numeroEmpresa,
                        complementoEmpresa,
                        cidadeEmpresa,
                        cepEmpresa,
                        cepComplementoEmpresa,
                        ufEmpresa,
                    })
                );

                sequencialRegistro++;
            }
        }

        const valorTotal = grupo.reduce(
            (acc, item) => acc + Number(item.valor || 0),
            0
        );

        linhas.push(
            gerarTrailerLote({
                codigoBanco,
                numeroLote: numeroLoteReal,
                quantidadeRegistrosDetalhe: tipoGrupo === 1 ? grupo.length : grupo.length * 2,
                valorTotal,
            })
        );

        numeroLoteReal++;
    }

    linhas.push(
        gerarTrailerArquivo({
            codigoBanco,
            quantidadeLotes: numeroLoteReal - 1,
            quantidadeRegistrosArquivo: linhas.length + 1,
        })
    );

    return linhas.join("\r\n");
}