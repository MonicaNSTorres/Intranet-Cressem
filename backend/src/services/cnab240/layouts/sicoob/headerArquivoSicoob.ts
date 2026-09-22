import {
    alpha,
    assert240,
    numeric,
    spaces,
    zeros,
} from "../../cnab240Utils";

export type HeaderArquivoSicoobInput = {
    empresaNome: string;
    empresaInscricao: string;
    codigoConvenioBanco: string;

    agencia: string;
    dvAgencia?: string;

    conta: string;
    dvConta: string;

    sequencialArquivo: number;
    dataGeracao?: Date;
};

function determinarTipoInscricao(
    inscricao: string
): "1" | "2" {
    const documento = String(inscricao || "")
        .replace(/\D/g, "");

    return documento.length <= 11 ? "1" : "2";
}

function formatarData(date: Date): string {
    return (
        String(date.getDate()).padStart(2, "0") +
        String(date.getMonth() + 1).padStart(2, "0") +
        String(date.getFullYear()).padStart(4, "0")
    );
}

function formatarHora(date: Date): string {
    return (
        String(date.getHours()).padStart(2, "0") +
        String(date.getMinutes()).padStart(2, "0") +
        String(date.getSeconds()).padStart(2, "0")
    );
}

export function gerarHeaderArquivoSicoob({
    empresaNome,
    empresaInscricao,
    codigoConvenioBanco,

    agencia,
    dvAgencia = "",

    conta,
    dvConta,

    sequencialArquivo,
    dataGeracao = new Date(),
}: HeaderArquivoSicoobInput): string {
    const documentoEmpresa = String(
        empresaInscricao || ""
    ).replace(/\D/g, "");

    const tipoInscricao =
        determinarTipoInscricao(documentoEmpresa);

    const linha =
        // 01.0 - Código do Banco - posições 001 a 003
        numeric("756", 3) +

        // 02.0 - Lote de Serviço - posições 004 a 007
        numeric("0000", 4) +

        // 03.0 - Tipo de Registro - posição 008
        numeric("0", 1) +

        // 04.0 - Uso exclusivo FEBRABAN/CNAB - posições 009 a 017
        spaces(9) +

        // 05.0 - Tipo de Inscrição da Empresa - posição 018
        numeric(tipoInscricao, 1) +

        // 06.0 - Número de Inscrição da Empresa - posições 019 a 032
        numeric(documentoEmpresa, 14) +

        // 07.0 - Código do Convênio no Banco - posições 033 a 052
        alpha(codigoConvenioBanco, 20) +

        // 08.0 - Agência Mantenedora - posições 053 a 057
        numeric(agencia, 5) +

        // 09.0 - DV da Agência - posição 058
        alpha(dvAgencia, 1) +

        // 10.0 - Número da Conta Corrente - posições 059 a 070
        numeric(conta, 12) +

        // 11.0 - DV da Conta - posição 071
        numeric(dvConta, 1) +

        // 12.0 - DV Agência/Conta - posição 072
        spaces(1) +

        // 13.0 - Nome da Empresa - posições 073 a 102
        alpha(empresaNome, 30) +

        // 14.0 - Nome do Banco - posições 103 a 132
        alpha("SICOOB", 30) +

        // 15.0 - Uso exclusivo FEBRABAN/CNAB - posições 133 a 142
        spaces(10) +

        // 16.0 - Código Remessa/Retorno - posição 143
        numeric("1", 1) +

        // 17.0 - Data de Geração - posições 144 a 151
        numeric(formatarData(dataGeracao), 8) +

        // 18.0 - Hora de Geração - posições 152 a 157
        numeric(formatarHora(dataGeracao), 6) +

        // 19.0 - Número Sequencial do Arquivo - posições 158 a 163
        numeric(sequencialArquivo, 6) +

        // 20.0 - Versão do Layout do Arquivo - posições 164 a 166
        numeric("087", 3) +

        // 21.0 - Densidade de Gravação - posições 167 a 171
        zeros(5) +

        // 22.0 - Reservado Banco - posições 172 a 191
        spaces(20) +

        // 23.0 - Reservado Empresa - posições 192 a 211
        spaces(20) +

        // 24.0 - Uso exclusivo FEBRABAN/CNAB - posições 212 a 240
        spaces(29);

    return assert240(
        linha,
        "Header de arquivo Sicoob"
    );
}