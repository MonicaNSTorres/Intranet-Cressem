import {
    alpha,
    assert240,
    numeric,
    spaces,
} from "./cnab240Utils";

export type HeaderLoteInput = {
    codigoBanco?: string;
    empresaInscricao: string;
    empresaNome: string;
    agencia: string;
    conta: string;
    dvConta?: string;
};

export function gerarHeaderLote({
    codigoBanco = "756",
    empresaInscricao,
    empresaNome,
    agencia,
    conta,
    dvConta = "",
}: HeaderLoteInput): string {

    const linha =
        numeric(codigoBanco, 3) +               // 1-3 Código Banco
        "0001" +                                // 4-7 Lote
        "1" +                                   // 8 Tipo Registro
        "C" +                                   // 9 Tipo Operação
        "20" +                                  // 10-11 Tipo Serviço
        "01" +                                  // 12-13 Forma Lançamento
        "045" +                                 // 14-16 Versão Layout
        " " +                                   // 17 Uso FEBRABAN
        "2" +                                   // 18 Tipo Inscrição Empresa
        numeric(empresaInscricao, 14) +         // 19-32 CNPJ
        numeric(agencia, 5) +                   // 33-37 Agência
        " " +                                   // 38 DV Agência
        numeric(conta, 12) +                    // 39-50 Conta
        alpha(dvConta, 1) +                     // 51 DV Conta
        " " +                                   // 52 DV Ag/Conta
        alpha(empresaNome, 30) +                // 53-82 Nome Empresa
        spaces(40) +                            // 83-122 Mensagem
        spaces(30) +                            // 123-152 Logradouro
        spaces(5) +                             // 153-157 Número
        spaces(15) +                            // 158-172 Complemento
        spaces(20) +                            // 173-192 Cidade
        spaces(8) +                             // 193-200 CEP
        spaces(2) +                             // 201-202 UF
        spaces(38);                             // 203-240 Uso Exclusivo

    return assert240(
        linha.slice(0, 240).padEnd(240, " "),
        "Header Lote"
    );
}