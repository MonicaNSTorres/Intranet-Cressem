import {
    alpha,
    assert240,
    numeric,
    spaces,
} from "../../cnab240Utils";

export type FormaLancamentoSicoobBoleto =
    | "30"
    | "31";

export type HeaderLoteSicoobBoletoInput = {
    numeroLote: number;

    /**
     * 30 = Liquidação de títulos do próprio banco
     * 31 = Pagamento de títulos de outros bancos
     */
    formaLancamento: FormaLancamentoSicoobBoleto;

    empresaNome: string;
    empresaInscricao: string;
    codigoConvenioBanco: string;

    agencia: string;
    dvAgencia?: string;

    conta: string;
    dvConta: string;
    dvAgenciaConta?: string;

    enderecoEmpresa?: string;
    numeroEmpresa?: string;
    complementoEmpresa?: string;
    cidadeEmpresa?: string;
    cepEmpresa?: string;
    cepComplementoEmpresa?: string;
    ufEmpresa?: string;

    mensagem?: string;

    /**
     * Por padrão, pagamento de fornecedores.
     */
    tipoServico?: string;
};

function determinarTipoInscricao(
    inscricao: string
): "1" | "2" {
    const documento = String(
        inscricao || ""
    ).replace(/\D/g, "");

    return documento.length <= 11
        ? "1"
        : "2";
}

export function gerarHeaderLoteSicoobBoleto({
    numeroLote,
    formaLancamento,

    empresaNome,
    empresaInscricao,
    codigoConvenioBanco,

    agencia,
    dvAgencia = "",

    conta,
    dvConta,
    dvAgenciaConta = "",

    enderecoEmpresa = "",
    numeroEmpresa = "",
    complementoEmpresa = "",
    cidadeEmpresa = "",
    cepEmpresa = "",
    cepComplementoEmpresa = "",
    ufEmpresa = "",

    mensagem = "",
    tipoServico = "20",
}: HeaderLoteSicoobBoletoInput): string {
    const documentoEmpresa = String(
        empresaInscricao || ""
    ).replace(/\D/g, "");

    const tipoInscricao =
        determinarTipoInscricao(
            documentoEmpresa
        );

    const linha =
        // 01.1 - Banco - posições 001 a 003
        numeric("756", 3) +

        // 02.1 - Lote - posições 004 a 007
        numeric(numeroLote, 4) +

        // 03.1 - Tipo de registro - posição 008
        numeric("1", 1) +

        // 04.1 - Tipo da operação - posição 009
        alpha("C", 1) +

        // 05.1 - Tipo do serviço - posições 010 a 011
        numeric(tipoServico, 2) +

        // 06.1 - Forma de lançamento - posições 012 a 013
        numeric(formaLancamento, 2) +

        // 07.1 - Versão do layout do lote - posições 014 a 016
        numeric("040", 3) +

        // 08.1 - Uso exclusivo FEBRABAN - posição 017
        spaces(1) +

        // 09.1 - Tipo de inscrição da empresa - posição 018
        numeric(tipoInscricao, 1) +

        // 10.1 - Inscrição da empresa - posições 019 a 032
        alpha(documentoEmpresa, 14) +

        // 11.1 - Código do convênio - posições 033 a 052
        alpha(codigoConvenioBanco, 20) +

        // 12.1 - Agência - posições 053 a 057
        numeric(agencia, 5) +

        // 13.1 - DV da agência - posição 058
        alpha(dvAgencia, 1) +

        // 14.1 - Conta corrente - posições 059 a 070
        numeric(conta, 12) +

        // 15.1 - DV da conta - posição 071
        numeric(dvConta, 1) +

        // 16.1 - DV agência/conta - posição 072
        alpha(dvAgenciaConta, 1) +

        // 17.1 - Nome da empresa - posições 073 a 102
        alpha(empresaNome, 30) +

        // 18.1 - Informação 1 / mensagem - posições 103 a 142
        alpha(mensagem, 40) +

        // 19.1 - Logradouro - posições 143 a 172
        alpha(enderecoEmpresa, 30) +

        // 20.1 - Número - posições 173 a 177
        numeric(numeroEmpresa, 5) +

        // 21.1 - Complemento - posições 178 a 192
        alpha(complementoEmpresa, 15) +

        // 22.1 - Cidade - posições 193 a 212
        alpha(cidadeEmpresa, 20) +

        // 23.1 - CEP - posições 213 a 217
        numeric(cepEmpresa, 5) +

        // 24.1 - Complemento do CEP - posições 218 a 220
        alpha(cepComplementoEmpresa, 3) +

        // 25.1 - UF - posições 221 a 222
        alpha(ufEmpresa, 2) +

        // 26.1 - Uso exclusivo FEBRABAN - posições 223 a 230
        spaces(8) +

        // 27.1 - Ocorrências - posições 231 a 240
        spaces(10);

    return assert240(
        linha,
        "Header de lote Sicoob boleto"
    );
}