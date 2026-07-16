import { gerarHeaderArquivoSicoob } from "./headerArquivoSicoob";
import {
    gerarHeaderLoteSicoob,
    type FormaLancamentoSicoob,
} from "./headerLoteSicoob";
import {
    gerarSegmentoASicoob,
    type TipoTransferenciaSicoob,
} from "./segmentoASicoob";
import { gerarSegmentoBSicoob } from "./segmentoBSicoob";
import { gerarTrailerLoteSicoob } from "./trailerLoteSicoob";
import { gerarTrailerArquivoSicoob } from "./trailerArquivoSicoob";

export type TransferenciaCnabSicoob = {
    sequencia: number;
    cpfCnpj: string;

    banco: string;
    agencia: string;
    dvAgencia?: string;

    conta: string;
    dvConta: string;
    dvAgenciaConta?: string;

    nome: string;
    valor: number;

    /**
     * 1 = Crédito em conta Sicoob
     * 2 = TED
     */
    tipo: TipoTransferenciaSicoob;

    descricao?: string;

    endereco?: string;
    numero?: string;
    complemento?: string;
    bairro?: string;
    cidade?: string;
    cep?: string;
    cepComplemento?: string;
    uf?: string;
};

export type GerarCnab240SicoobInput = {
    transferencias: TransferenciaCnabSicoob[];

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

    sequencialArquivo: number;
    dataPagamento?: Date;
    dataGeracao?: Date;
};

type GrupoTransferenciasSicoob = {
    tipo: TipoTransferenciaSicoob;
    formaLancamento: FormaLancamentoSicoob;
    transferencias: TransferenciaCnabSicoob[];
};

function somenteDigitos(value: unknown): string {
    return String(value ?? "").replace(/\D/g, "");
}

function validarTransferencias(
    transferencias: TransferenciaCnabSicoob[]
) {
    if (
        !Array.isArray(transferencias) ||
        transferencias.length === 0
    ) {
        throw new Error(
            "Nenhuma transferência foi informada para gerar o CNAB240 Sicoob."
        );
    }

    const invalidas = transferencias.filter(
        (item) =>
            !somenteDigitos(item.cpfCnpj) ||
            !somenteDigitos(item.banco) ||
            !somenteDigitos(item.agencia) ||
            !somenteDigitos(item.conta) ||
            !String(item.dvConta ?? "").trim() ||
            !String(item.nome ?? "").trim() ||
            !Number.isFinite(Number(item.valor)) ||
            Number(item.valor) <= 0 ||
            (item.tipo !== 1 && item.tipo !== 2)
    );

    if (invalidas.length > 0) {
        throw new Error(
            `Existem ${invalidas.length} transferência(s) inválida(s) para o layout Sicoob.`
        );
    }
}

function separarTransferenciasPorTipo(
    transferencias: TransferenciaCnabSicoob[]
): GrupoTransferenciasSicoob[] {
    const creditoContaSicoob = transferencias.filter(
        (item) => item.tipo === 1
    );

    const ted = transferencias.filter(
        (item) => item.tipo === 2
    );

    const grupos: GrupoTransferenciasSicoob[] = [];

    if (creditoContaSicoob.length > 0) {
        grupos.push({
            tipo: 1,
            formaLancamento: "01",
            transferencias: creditoContaSicoob,
        });
    }

    if (ted.length > 0) {
        grupos.push({
            tipo: 2,
            formaLancamento: "41",
            transferencias: ted,
        });
    }

    return grupos;
}

function gerarSeuNumero(
    transferencia: TransferenciaCnabSicoob,
    indice: number
): string {
    const sequencia = Number(
        transferencia.sequencia || indice + 1
    );

    return `PAG${String(sequencia).padStart(10, "0")}`;
}

function gerarCodigoDocumentoFavorecido(
    transferencia: TransferenciaCnabSicoob
): string {
    const documento = somenteDigitos(
        transferencia.cpfCnpj
    );

    return documento.slice(-15);
}

export function gerarCnab240Sicoob({
    transferencias,

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

    sequencialArquivo,
    dataPagamento = new Date(),
    dataGeracao = new Date(),
}: GerarCnab240SicoobInput): string {
    validarTransferencias(transferencias);

    const grupos =
        separarTransferenciasPorTipo(
            transferencias
        );

    if (grupos.length === 0) {
        throw new Error(
            "Nenhum lote válido foi identificado para o CNAB240 Sicoob."
        );
    }

    const linhas: string[] = [];

    /*
     * HEADER DO ARQUIVO
     */
    linhas.push(
        gerarHeaderArquivoSicoob({
            empresaNome,
            empresaInscricao,
            codigoConvenioBanco,

            agencia,
            dvAgencia,

            conta,
            dvConta,

            sequencialArquivo,
            dataGeracao,
        })
    );

    grupos.forEach((grupo, indiceGrupo) => {
        const numeroLote = indiceGrupo + 1;

        /*
         * HEADER DO LOTE
         *
         * Cada lote pode conter somente um tipo
         * de transação.
         */
        linhas.push(
            gerarHeaderLoteSicoob({
                numeroLote,
                formaLancamento:
                    grupo.formaLancamento,

                empresaNome,
                empresaInscricao,
                codigoConvenioBanco,

                agencia,
                dvAgencia,

                conta,
                dvConta,
                dvAgenciaConta,

                enderecoEmpresa,
                numeroEmpresa,
                complementoEmpresa,
                cidadeEmpresa,
                cepEmpresa,
                cepComplementoEmpresa,
                ufEmpresa,

                mensagem: "",
                indicativoFormaPagamento: "01",
            })
        );

        let numeroRegistroLote = 1;

        grupo.transferencias.forEach(
            (transferencia, indiceTransferencia) => {
                const seuNumero =
                    gerarSeuNumero(
                        transferencia,
                        indiceTransferencia
                    );

                /*
                 * SEGMENTO A
                 */
                linhas.push(
                    gerarSegmentoASicoob({
                        numeroLote,
                        numeroRegistroLote,

                        tipoTransferencia:
                            grupo.tipo,

                        bancoFavorecido:
                            transferencia.banco,

                        agenciaFavorecido:
                            transferencia.agencia,

                        dvAgenciaFavorecido:
                            transferencia.dvAgencia ||
                            "",

                        contaFavorecido:
                            transferencia.conta,

                        dvContaFavorecido:
                            transferencia.dvConta,

                        dvAgenciaContaFavorecido:
                            transferencia.dvAgenciaConta ||
                            "",

                        nomeFavorecido:
                            transferencia.nome,

                        seuNumero,
                        dataPagamento,
                        valorPagamento:
                            Number(
                                transferencia.valor
                            ),

                        informacao2:
                            transferencia.descricao ||
                            "",

                        /*
                         * Para TED:
                         * 00005 = pagamento de fornecedores.
                         *
                         * Para crédito Sicoob, o gerador
                         * preenche 00000 automaticamente.
                         */
                        codigoFinalidadeTed: "00005",

                        codigoFinalidadeComplementar:
                            "",

                        avisoFavorecido: "0",
                    })
                );

                numeroRegistroLote += 1;

                /*
                 * SEGMENTO B
                 *
                 * Obrigatório tanto para crédito em conta
                 * Sicoob quanto para TED.
                 */
                linhas.push(
                    gerarSegmentoBSicoob({
                        numeroLote,
                        numeroRegistroLote,

                        tipoTransferencia:
                            grupo.tipo,

                        cpfCnpjFavorecido:
                            transferencia.cpfCnpj,

                        enderecoFavorecido:
                            transferencia.endereco ||
                            "",

                        numeroFavorecido:
                            transferencia.numero ||
                            "",

                        complementoFavorecido:
                            transferencia.complemento ||
                            "",

                        bairroFavorecido:
                            transferencia.bairro ||
                            "",

                        cidadeFavorecido:
                            transferencia.cidade ||
                            "",

                        cepFavorecido:
                            transferencia.cep ||
                            "",

                        cepComplementoFavorecido:
                            transferencia.cepComplemento ||
                            "",

                        ufFavorecido:
                            transferencia.uf ||
                            "",

                        dataVencimento:
                            dataPagamento,

                        valorDocumento:
                            Number(
                                transferencia.valor
                            ),

                        valorAbatimento: 0,
                        valorDesconto: 0,
                        valorMora: 0,
                        valorMulta: 0,

                        codigoDocumentoFavorecido:
                            gerarCodigoDocumentoFavorecido(
                                transferencia
                            ),

                        avisoFavorecido: "0",
                        codigoUgCentralizadora: "",
                    })
                );

                numeroRegistroLote += 1;
            }
        );

        const valorTotalLote =
            grupo.transferencias.reduce(
                (total, item) =>
                    total +
                    Number(item.valor || 0),
                0
            );

        /*
         * Header do lote
         * + dois segmentos para cada pagamento
         * + trailer do lote.
         */
        const quantidadeRegistrosLote =
            1 +
            grupo.transferencias.length * 2 +
            1;

        /*
         * TRAILER DO LOTE
         */
        linhas.push(
            gerarTrailerLoteSicoob({
                numeroLote,
                quantidadeRegistrosLote,
                valorTotal: valorTotalLote,
                quantidadeMoeda: 0,
                numeroAvisoDebito: 0,
            })
        );
    });

    /*
     * A quantidade final inclui:
     *
     * header do arquivo
     * + todos os registros já adicionados
     * + trailer do arquivo que será adicionado agora.
     */
    const quantidadeRegistrosArquivo =
        linhas.length + 1;

    /*
     * TRAILER DO ARQUIVO
     */
    linhas.push(
        gerarTrailerArquivoSicoob({
            quantidadeLotes: grupos.length,
            quantidadeRegistrosArquivo,
        })
    );

    /*
     * CNAB normalmente utiliza quebra CRLF.
     * Também adicionamos quebra ao final do arquivo.
     */
    return `${linhas.join("\r\n")}\r\n`;
}