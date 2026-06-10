import {
    alpha,
    assert240,
    numeric,
    spaces,
} from "./cnab240Utils";

export type HeaderArquivoInput = {
    codigoBanco?: string;
    empresaNome: string;
    empresaInscricao: string;
    agencia: string;
    conta: string;
    dvConta?: string;
    sequencialArquivo: number;
};

export function gerarHeaderArquivo({
    codigoBanco = "756",
    empresaNome,
    empresaInscricao,
    agencia,
    conta,
    dvConta = "",
    sequencialArquivo,
}: HeaderArquivoInput): string {

    const linha =
        numeric(codigoBanco, 3) +               // 1-3
        "0000" +                               // 4-7 lote
        "0" +                                  // 8 tipo registro
        spaces(9) +                            // 9-17 uso exclusivo FEBRABAN
        "2" +                                  // 18 tipo inscrição empresa
        numeric(empresaInscricao, 14) +        // 19-32 CNPJ
        numeric(agencia, 5) +                  // 33-37 agência
        " " +                                  // 38 DV agência
        numeric(conta, 12) +                   // 39-50 conta
        alpha(dvConta, 1) +                    // 51 DV conta
        " " +                                  // 52 DV ag/conta
        alpha(empresaNome, 30) +               // 53-82 nome empresa
        alpha("SICOOB", 30) +                  // 83-112 nome banco
        spaces(10) +                           // 113-122 uso exclusivo
        "1" +                                  // 123 código remessa
        new Date()
            .toLocaleDateString("pt-BR")
            .replace(/\D/g, "") +              // 124-131 data geração
        new Date()
            .toLocaleTimeString("pt-BR")
            .replace(/\D/g, "")
            .padEnd(6, "0") +                  // 132-137 hora geração
        numeric(sequencialArquivo, 6) +        // 138-143 nº sequencial
        "081" +                                // 144-146 versão layout
        spaces(94);                            // completar até 240

    return assert240(linha.slice(0, 240).padEnd(240, " "), "Header Arquivo");
}