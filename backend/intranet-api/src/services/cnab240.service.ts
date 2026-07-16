import {
    oracleExecute,
    oracleExecuteCommit,
    oracleExecuteManyCommit,
} from "./oracle.service";
import { parseCnabExcel } from "./cnab240/excelParser";
import { gerarCnab240Real } from "./cnab240/gerarCnab240Real";
import { gerarCnab240Sicoob } from "./cnab240/layouts/sicoob/gerarCnab240Sicoob";
import {
    gerarCnab240SicoobBoleto,
    type BoletoCnabSicoobInput,
    type TipoInscricaoBoleto,
} from "./cnab240/layouts/sicoob-boleto/gerarCnab240SicoobBoleto";

type GerarCnabInput = {
    buffer: Buffer;
    originalName: string;
    tipoLayout?: unknown;
};

type ImportarRetornoInput = {
    buffer: Buffer;
    originalName: string;
};

type TransferenciaCnabInput = {
    sequencia: number;
    cpfCnpj: string;
    banco: string;
    agencia: string;
    conta: string;
    dvConta: string;
    nome: string;
    valor: number;
    tipo: 1 | 2;
    descricao: string;
};

type ResultadoGeracaoCnab = {
    nomeArquivo: string;
    conteudo: string;
    totalLinhas: number;
    valorTotal: number;
    sequencial: number;
    idLote: any;
};

type BoletoCnabInput = {
    sequencia: number;

    codigoBarras: string;
    nomeCedente: string;

    dataVencimento?: string | null;
    valorTitulo: number;

    valorDescontoAbatimento?: number;
    valorMoraMulta?: number;

    dataPagamento?: string | null;
    valorPagamento: number;

    seuNumero?: string;
    nossoNumero?: string;

    sacadoTipoInscricao?: 0 | 1 | 2;
    sacadoDocumento?: string;
    sacadoNome?: string;

    cedenteTipoInscricao?: 0 | 1 | 2;
    cedenteDocumento?: string;
    cedenteNome?: string;

    sacadorTipoInscricao?: 0 | 1 | 2;
    sacadorDocumento?: string;
    sacadorNome?: string;
};

type RegistroCnabInput =
    | TransferenciaCnabInput
    | BoletoCnabInput;

export type TipoLayoutCnab =
    | "SANTANDER"
    | "SICOOB"
    | "SICOOB_BOLETO";

const SQL_LISTAR_REMESSAS = `
    SELECT
        ID_LOTE AS ID_REMESSA,

        'CNAB240_' ||
        TIPO_LAYOUT ||
        '_' ||
        TO_CHAR(DT_LOTE, 'DDMMYYYY') ||
        '_' ||
        LPAD(NR_LOTE, 6, '0') ||
        '.txt' AS NM_ARQUIVO,

        TO_CHAR(
            DT_LOTE,
            'DD/MM/YYYY HH24:MI:SS'
        ) AS DT_GERACAO,

        QTDE AS QT_PAGAMENTOS,
        VALOR_TOTAL AS VL_TOTAL,
        TIPO_LAYOUT,
        'GERADO' AS STATUS

    FROM DBACRESSEM.CNAB_LOTES
    ORDER BY DT_LOTE DESC, ID_LOTE DESC
`;

const SQL_CONFIG = `
    SELECT *
    FROM DBACRESSEM.CNAB_CONFIG
    WHERE UPPER(TIPO_LAYOUT) = UPPER(:tipo_layout)
    FETCH FIRST 1 ROWS ONLY
`;

const SQL_UPDATE_SEQUENCIAL = `
    UPDATE DBACRESSEM.CNAB_CONFIG
    SET
        SEQUENCIAL_ATUAL = :sequencial,
        UPDATED_AT = SYSDATE
    WHERE ID_CONFIG = :id_config
`;

const SQL_INSERT_LOTE = `
    INSERT INTO DBACRESSEM.CNAB_LOTES (
        DT_LOTE,
        NR_LOTE,
        QTDE,
        VALOR_TOTAL,
        TIPO_LAYOUT,
        CREATED_AT
    ) VALUES (
        SYSDATE,
        :nr_lote,
        :qtde,
        :valor_total,
        :tipo_layout,
        SYSDATE
    )
`;

const SQL_SELECT_LOTE = `
    SELECT ID_LOTE
    FROM DBACRESSEM.CNAB_LOTES
    WHERE NR_LOTE = :nr_lote
      AND UPPER(TIPO_LAYOUT) = UPPER(:tipo_layout)
    ORDER BY ID_LOTE DESC
    FETCH FIRST 1 ROWS ONLY
`;

const SQL_INSERT_DETALHES = `
    INSERT INTO DBACRESSEM.CNAB_LOTES_DETALHE (
        ID_LOTE,
        DT_LOTE,
        NR_LOTE,
        SEQ,
        CPF,
        BANCO,
        AGENCIA,
        CONTA,
        DV_CONTA,
        NOME,
        VALOR,
        TIPO,
        DESCRICAO,
        CREATED_AT
    ) VALUES (
        :id_lote,
        SYSDATE,
        :nr_lote,
        :seq,
        :cpf,
        :banco,
        :agencia,
        :conta,
        :dv_conta,
        :nome,
        :valor,
        :tipo,
        :descricao,
        SYSDATE
    )
`;

const SQL_BUSCAR_FAVORECIDO = `
    SELECT
        F.CPF,
        F.IDCLIENTE,
        F.BANCO,
        F.AGENCIA,
        F.CONTA,
        F.DV_CONTA,
        F.NOME,
        F.ENDERECO,
        F.NUMERO,
        F.COMPLEMENTO,
        F.BAIRRO,
        F.CEP,
        F.CEP_COMPLEMENTO,
        F.CIDADE,
        F.UF,
        C.ATIVA AS CONTA_ATIVA
    FROM DBACRESSEM.CNAB_FAVORECIDOS F
    LEFT JOIN DBACRESSEM.CNAB_CCO C
        ON REGEXP_REPLACE(UPPER(C.CPF), '[^A-Z0-9]', '') =
           REGEXP_REPLACE(UPPER(F.CPF), '[^A-Z0-9]', '')
    WHERE REGEXP_REPLACE(UPPER(F.CPF), '[^A-Z0-9]', '') = :cpf
    FETCH FIRST 1 ROWS ONLY
`;

const SQL_DETALHES_REMESSA = `
    SELECT
        ID_DETALHE,
        ID_LOTE,
        NR_LOTE,
        SEQ,
        CPF,
        BANCO,
        AGENCIA,
        CONTA,
        DV_CONTA,
        NOME,
        VALOR,
        TIPO,
        DESCRICAO,
        TO_CHAR(CREATED_AT, 'DD/MM/YYYY HH24:MI:SS') AS CREATED_AT
    FROM DBACRESSEM.CNAB_LOTES_DETALHE
    WHERE ID_LOTE = :id_lote
    ORDER BY SEQ
`;

function onlyDigits(value: unknown): string {
    return String(value ?? "").replace(/\D/g, "");
}

function onlyCpfCnpjChars(value: unknown): string {
    return String(value ?? "")
        .replace(/[^a-zA-Z0-9]/g, "")
        .toUpperCase();
}

function determinarTipoTransferencia(
    bancoFavorecido: unknown,
    bancoConfigurado: unknown
): 1 | 2 {
    const bancoDestino = onlyDigits(bancoFavorecido);
    const bancoOrigem = onlyDigits(bancoConfigurado);

    if (!bancoDestino || !bancoOrigem) {
        return 2;
    }

    return bancoDestino === bancoOrigem ? 1 : 2;
}

function gerarNomeArquivo(
    sequencial: number,
    tipoLayout: TipoLayoutCnab
) {
    const agora = new Date();

    const data =
        String(agora.getDate()).padStart(2, "0") +
        String(agora.getMonth() + 1).padStart(2, "0") +
        agora.getFullYear();

    return `CNAB240_${tipoLayout}_${data}_${String(
        sequencial
    ).padStart(6, "0")}.txt`;
}

function getFirstRow<T = any>(result: any): T | null {
    const rows = result?.rows || [];
    return rows.length ? rows[0] : null;
}

function validarConfig(config: any) {
    const camposObrigatorios = [
        "ID_CONFIG",
        "TIPO_LAYOUT",
        "SEQUENCIAL_ATUAL",
        "BANCO",
        "NOME_BANCO",
        "NOME_EMPRESA",
        "CNPJ_EMPRESA",
        "COD_CONVENIO_BANCO",
        "AGENCIA",
        "CONTA_CORRENTE",
        "DV_CONTA",
        "ENDERECO",
        "NUMERO",
        "CIDADE",
        "CEP",
        "CEP_COMPLEMENTO",
        "UF",
    ];

    const faltando = camposObrigatorios.filter((campo) => {
        const value = config?.[campo];

        return (
            value === null ||
            value === undefined ||
            String(value).trim() === ""
        );
    });

    if (faltando.length > 0) {
        throw new Error(
            `Configuração CNAB incompleta. Campos faltando: ${faltando.join(", ")}`
        );
    }
}

function normalizarTransferencias(
    transferencias: TransferenciaCnabInput[]
): TransferenciaCnabInput[] {
    return transferencias.map((item, index) => ({
        sequencia: Number(item.sequencia || index + 1),
        cpfCnpj: onlyCpfCnpjChars(item.cpfCnpj),
        banco: onlyDigits(item.banco),
        agencia: onlyDigits(item.agencia),
        conta: onlyDigits(item.conta),
        dvConta: String(item.dvConta ?? "").trim(),
        nome: String(item.nome ?? "").trim(),
        valor: Number(item.valor || 0),
        tipo: Number(item.tipo) === 1 ? 1 : 2,
        descricao: String(item.descricao ?? "").trim(),
    }));
}

function validarTipoLayout(
    tipoLayout: unknown
): TipoLayoutCnab {
    const layout = String(tipoLayout || "")
        .trim()
        .toUpperCase();

    const layoutsValidos: TipoLayoutCnab[] = [
        "SANTANDER",
        "SICOOB",
        "SICOOB_BOLETO",
    ];

    if (
        !layoutsValidos.includes(
            layout as TipoLayoutCnab
        )
    ) {
        throw new Error(
            "Tipo de layout CNAB240 inválido."
        );
    }

    return layout as TipoLayoutCnab;
}

async function obterConfigCnab(
    tipoLayout: TipoLayoutCnab
) {
    const configResult = await oracleExecute(
        SQL_CONFIG,
        {
            tipo_layout: tipoLayout,
        },
        {}
    );

    const config = getFirstRow<any>(configResult);

    if (!config) {
        throw new Error(
            `Configuração CNAB não encontrada para o layout ${tipoLayout}.`
        );
    }

    validarConfig(config);

    return config;
}

async function salvarLoteEDetalhes(params: {
    sequencial: number;
    transferencias: TransferenciaCnabInput[];
    valorTotal: number;
    tipoLayout: TipoLayoutCnab;
}) {
    await oracleExecuteCommit(
        SQL_INSERT_LOTE,
        {
            nr_lote: params.sequencial,
            qtde: params.transferencias.length,
            valor_total: params.valorTotal,
            tipo_layout: params.tipoLayout,
        },
        {}
    );

    const loteResult = await oracleExecute(
        SQL_SELECT_LOTE,
        {
            nr_lote: params.sequencial,
            tipo_layout: params.tipoLayout,
        },
        {}
    );

    const lote = getFirstRow<any>(loteResult);

    if (!lote?.ID_LOTE) {
        throw new Error(
            "Não foi possível recuperar o lote CNAB gerado."
        );
    }

    const detalhesBinds = params.transferencias.map(
        (item) => ({
            id_lote: lote.ID_LOTE,
            nr_lote: params.sequencial,
            seq: item.sequencia,
            cpf: item.cpfCnpj,
            banco: item.banco,
            agencia: item.agencia,
            conta: item.conta,
            dv_conta: item.dvConta,
            nome: item.nome,
            valor: item.valor,
            tipo: item.tipo,
            descricao: item.descricao || null,
        })
    );

    await oracleExecuteManyCommit(
        SQL_INSERT_DETALHES,
        detalhesBinds,
        {}
    );

    return lote;
}

async function atualizarSequencial(
    config: any,
    proximoSequencial: number
) {
    await oracleExecuteCommit(
        SQL_UPDATE_SEQUENCIAL,
        {
            sequencial: proximoSequencial,
            id_config: config.ID_CONFIG,
        },
        {}
    );
}

function gerarConteudoCnab(params: {
    config: any;
    transferencias: TransferenciaCnabInput[];
    sequencial: number;
    tipoLayout: TipoLayoutCnab;
}) {
    const dataAtual = new Date();

    if (params.tipoLayout === "SICOOB") {
        return gerarCnab240Sicoob({
            transferencias: params.transferencias.map(
                (item) => ({
                    sequencia: item.sequencia,
                    cpfCnpj: item.cpfCnpj,

                    banco: item.banco,
                    agencia: item.agencia,
                    dvAgencia: "",

                    conta: item.conta,
                    dvConta: item.dvConta,
                    dvAgenciaConta: "",

                    nome: item.nome,
                    valor: item.valor,
                    tipo: item.tipo,
                    descricao: item.descricao,

                    endereco: "",
                    numero: "",
                    complemento: "",
                    bairro: "",
                    cidade: "",
                    cep: "",
                    cepComplemento: "",
                    uf: "",
                })
            ),

            empresaNome:
                params.config.NOME_EMPRESA ||
                "CRESSEM",

            empresaInscricao:
                params.config.CNPJ_EMPRESA,

            codigoConvenioBanco:
                params.config.COD_CONVENIO_BANCO,

            agencia:
                params.config.AGENCIA,

            dvAgencia:
                params.config.DV_AGENCIA || "",

            conta:
                params.config.CONTA_CORRENTE,

            dvConta:
                params.config.DV_CONTA,

            dvAgenciaConta: "",

            enderecoEmpresa:
                params.config.ENDERECO || "",

            numeroEmpresa:
                params.config.NUMERO || "",

            complementoEmpresa:
                params.config.COMPLEMENTO || "",

            cidadeEmpresa:
                params.config.CIDADE || "",

            cepEmpresa:
                params.config.CEP || "",

            cepComplementoEmpresa:
                params.config.CEP_COMPLEMENTO || "",

            ufEmpresa:
                params.config.UF || "",

            sequencialArquivo:
                params.sequencial,

            dataPagamento: dataAtual,
            dataGeracao: dataAtual,
        });
    }

    if (params.tipoLayout === "SANTANDER") {
        return gerarCnab240Real({
            transferencias:
                params.transferencias,

            codigoBanco:
                params.config.BANCO || "033",

            nomeBanco:
                params.config.NOME_BANCO ||
                "SANTANDER",

            empresaNome:
                params.config.NOME_EMPRESA ||
                "CRESSEM",

            empresaInscricao:
                params.config.CNPJ_EMPRESA,

            codigoConvenioBanco:
                params.config.COD_CONVENIO_BANCO,

            agencia:
                params.config.AGENCIA,

            dvAgencia:
                params.config.DV_AGENCIA ||
                " ",

            conta:
                params.config.CONTA_CORRENTE,

            dvConta:
                params.config.DV_CONTA,

            enderecoEmpresa:
                params.config.ENDERECO,

            numeroEmpresa:
                params.config.NUMERO,

            complementoEmpresa:
                params.config.COMPLEMENTO ||
                "",

            cidadeEmpresa:
                params.config.CIDADE,

            cepEmpresa:
                params.config.CEP,

            cepComplementoEmpresa:
                params.config.CEP_COMPLEMENTO,

            ufEmpresa:
                params.config.UF,

            sequencialArquivo:
                params.sequencial,

            dataPagamento: dataAtual,
        });
    }

    throw new Error(
        `Gerador não implementado para o layout ${params.tipoLayout}.`
    );
}

function normalizarTipoInscricaoBoleto(
    value: unknown
): TipoInscricaoBoleto {
    const tipo = Number(value);

    if (tipo === 1 || tipo === 2) {
        return tipo;
    }

    return 0;
}

async function gerarPorBoletosInterno(
    boletosInput: BoletoCnabInput[],
    tipoLayout: TipoLayoutCnab
): Promise<ResultadoGeracaoCnab> {
    if (
        !Array.isArray(boletosInput) ||
        boletosInput.length === 0
    ) {
        throw new Error(
            "Nenhum boleto foi enviado."
        );
    }

    if (tipoLayout !== "SICOOB_BOLETO") {
        throw new Error(
            "Layout inválido para geração de boletos."
        );
    }

    const config =
        await obterConfigCnab("SICOOB");

    const boletos: BoletoCnabSicoobInput[] =
        boletosInput.map((item, index) => ({
            sequencia: Number(
                item.sequencia || index + 1
            ),

            codigoBarras: onlyDigits(
                item.codigoBarras
            ),

            nomeCedente: String(
                item.nomeCedente || ""
            ).trim(),

            dataVencimento:
                item.dataVencimento || null,

            valorTitulo: Number(
                item.valorTitulo || 0
            ),

            valorDescontoAbatimento:
                Number(
                    item.valorDescontoAbatimento || 0
                ),

            valorMoraMulta:
                Number(
                    item.valorMoraMulta || 0
                ),

            dataPagamento:
                item.dataPagamento || null,

            valorPagamento: Number(
                item.valorPagamento || 0
            ),

            seuNumero: String(
                item.seuNumero || ""
            ).trim(),

            sacadoTipoInscricao:
                normalizarTipoInscricaoBoleto(
                    item.sacadoTipoInscricao
                ),

            sacadoDocumento:
                onlyCpfCnpjChars(
                    item.sacadoDocumento
                ),

            sacadoNome: String(
                item.sacadoNome || ""
            ).trim(),

            cedenteTipoInscricao:
                normalizarTipoInscricaoBoleto(
                    item.cedenteTipoInscricao
                ),

            cedenteDocumento:
                onlyCpfCnpjChars(
                    item.cedenteDocumento
                ),

            cedenteNome: String(
                item.cedenteNome ||
                item.nomeCedente ||
                ""
            ).trim(),

            sacadorTipoInscricao:
                normalizarTipoInscricaoBoleto(
                    item.sacadorTipoInscricao
                ),

            sacadorDocumento:
                onlyCpfCnpjChars(
                    item.sacadorDocumento
                ),

            sacadorNome: String(
                item.sacadorNome || ""
            ).trim(),
        }));

    boletos.forEach((item, index) => {
        const numeroBoleto = index + 1;

        if (item.codigoBarras.length !== 44) {
            throw new Error(
                `Boleto ${numeroBoleto}: o código de barras deve possuir exatamente 44 dígitos. Foram recebidos ${item.codigoBarras.length}.`
            );
        }

        if (!item.nomeCedente.trim()) {
            throw new Error(
                `Boleto ${numeroBoleto}: o nome do cedente não foi informado.`
            );
        }

        if (
            !Number.isFinite(item.valorTitulo) ||
            item.valorTitulo < 0
        ) {
            throw new Error(
                `Boleto ${numeroBoleto}: o valor do título é inválido. Valor recebido: ${item.valorTitulo}.`
            );
        }

        if (
            !Number.isFinite(item.valorPagamento) ||
            item.valorPagamento <= 0
        ) {
            throw new Error(
                `Boleto ${numeroBoleto}: o valor do pagamento deve ser maior que zero. Valor recebido: ${item.valorPagamento}.`
            );
        }
    });

    const sequencialAtual = Number(
        config.SEQUENCIAL_ATUAL || 0
    );

    const proximoSequencial =
        sequencialAtual + 1;

    const valorTotal = boletos.reduce(
        (acc, item) =>
            acc +
            Number(
                item.valorPagamento || 0
            ),
        0
    );

    const conteudo =
        gerarCnab240SicoobBoleto({
            boletos,

            empresaNome:
                config.NOME_EMPRESA ||
                "CRESSEM",

            empresaInscricao:
                config.CNPJ_EMPRESA,

            codigoConvenioBanco:
                config.COD_CONVENIO_BANCO,

            agencia:
                config.AGENCIA,

            dvAgencia:
                config.DV_AGENCIA || "",

            conta:
                config.CONTA_CORRENTE,

            dvConta:
                config.DV_CONTA,

            dvAgenciaConta: "",

            enderecoEmpresa:
                config.ENDERECO || "",

            numeroEmpresa:
                config.NUMERO || "",

            complementoEmpresa:
                config.COMPLEMENTO || "",

            cidadeEmpresa:
                config.CIDADE || "",

            cepEmpresa:
                config.CEP || "",

            cepComplementoEmpresa:
                config.CEP_COMPLEMENTO || "",

            ufEmpresa:
                config.UF || "",

            sequencialArquivo:
                proximoSequencial,

            dataGeracao: new Date(),
        });

    /*
     * Por enquanto, como a tabela de detalhes atual foi criada
     * para transferências bancárias, não vamos gravar os boletos
     * nela neste momento.
     *
     * Vamos registrar somente o lote no histórico.
     */
    await oracleExecuteCommit(
        SQL_INSERT_LOTE,
        {
            nr_lote: proximoSequencial,
            qtde: boletos.length,
            valor_total: valorTotal,
            tipo_layout: tipoLayout,
        },
        {}
    );

    const loteResult = await oracleExecute(
        SQL_SELECT_LOTE,
        {
            nr_lote: proximoSequencial,
            tipo_layout: tipoLayout,
        },
        {}
    );

    const lote = getFirstRow<any>(
        loteResult
    );

    if (!lote?.ID_LOTE) {
        throw new Error(
            "Não foi possível recuperar o lote CNAB de boletos gerado."
        );
    }

    await atualizarSequencial(
        config,
        proximoSequencial
    );

    const nomeArquivo =
        gerarNomeArquivo(
            proximoSequencial,
            tipoLayout
        );

    return {
        nomeArquivo,
        conteudo,
        totalLinhas: boletos.length,
        valorTotal,
        sequencial: proximoSequencial,
        idLote: lote.ID_LOTE,
    };
}

export const cnab240Service = {
    async listarRemessas() {
        const result = await oracleExecute(
            SQL_LISTAR_REMESSAS,
            {},
            {}
        );

        return result.rows || [];
    },

    async buscarFavorecidoPorCpf(cpf: string) {
        const cpfLimpo = onlyCpfCnpjChars(cpf);

        if (!cpfLimpo) {
            throw new Error(
                "CPF/CNPJ não informado."
            );
        }

        const result = await oracleExecute(
            SQL_BUSCAR_FAVORECIDO,
            {
                cpf: cpfLimpo,
            },
            {}
        );

        const favorecido = getFirstRow<any>(
            result
        );

        if (!favorecido) {
            return null;
        }

        const config =
            await obterConfigCnab(
                "SANTANDER"
            );

        const tipoTransferencia =
            determinarTipoTransferencia(
                favorecido.BANCO,
                config.BANCO
            );

        return {
            ...favorecido,

            TIPO_TRANSFERENCIA:
                tipoTransferencia,

            TIPO_TRANSFERENCIA_DESCRICAO:
                tipoTransferencia === 1
                    ? "Crédito bancário"
                    : "TED",
        };
    },

    async gerarCnab240({
        buffer,
        tipoLayout: tipoLayoutInput,
    }: GerarCnabInput) {
        const tipoLayout =
            validarTipoLayout(
                tipoLayoutInput ||
                "SANTANDER"
            );

        if (
            tipoLayout ===
            "SICOOB_BOLETO"
        ) {
            throw new Error(
                "O layout SICOOB_BOLETO não pode ser gerado pelo fluxo de importação de transferências por Excel."
            );
        }

        const parsed =
            parseCnabExcel(buffer);

        if (
            parsed.totalRegistros === 0
        ) {
            throw new Error(
                "Nenhuma transferência válida foi encontrada no Excel."
            );
        }

        const transferencias =
            normalizarTransferencias(
                parsed.transferencias
            );

        const config =
            await obterConfigCnab(
                tipoLayout
            );

        const sequencialAtual = Number(
            config.SEQUENCIAL_ATUAL || 0
        );

        const proximoSequencial =
            sequencialAtual + 1;

        const nomeArquivo =
            gerarNomeArquivo(
                proximoSequencial,
                tipoLayout
            );

        const valorTotal =
            transferencias.reduce(
                (acc, item) =>
                    acc +
                    Number(
                        item.valor || 0
                    ),
                0
            );

        const transferenciasComTipo =
            transferencias.map(
                (item) => ({
                    ...item,

                    tipo: determinarTipoTransferencia(
                        item.banco,
                        config.BANCO
                    ),
                })
            );

        const conteudo =
            gerarConteudoCnab({
                config,
                transferencias:
                    transferenciasComTipo,
                sequencial:
                    proximoSequencial,
                tipoLayout,
            });

        const lote =
            await salvarLoteEDetalhes({
                sequencial:
                    proximoSequencial,
                transferencias:
                    transferenciasComTipo,
                valorTotal,
                tipoLayout,
            });

        await atualizarSequencial(
            config,
            proximoSequencial
        );

        return {
            nomeArquivo,
            conteudo,
            totalLinhas:
                transferenciasComTipo.length,
            valorTotal,
            sequencial:
                proximoSequencial,
            idLote: lote.ID_LOTE,
        };
    },

    async gerarCnab240PorRegistros(
        registrosInput: RegistroCnabInput[],
        tipoLayoutInput: unknown
    ): Promise<ResultadoGeracaoCnab> {
        if (
            !Array.isArray(registrosInput) ||
            registrosInput.length === 0
        ) {
            throw new Error(
                "Nenhum registro foi enviado."
            );
        }

        const tipoLayout =
            validarTipoLayout(tipoLayoutInput);

        if (tipoLayout === "SICOOB_BOLETO") {
            return gerarPorBoletosInterno(
                registrosInput as BoletoCnabInput[],
                tipoLayout
            );
        }

        return cnab240Service
            .gerarCnab240PorTransferencias(
                registrosInput as TransferenciaCnabInput[],
                tipoLayout
            );
    },

    async gerarCnab240PorTransferencias(
        transferenciasInput: TransferenciaCnabInput[],
        tipoLayoutInput: unknown
    ): Promise<ResultadoGeracaoCnab> {
        if (
            !Array.isArray(
                transferenciasInput
            ) ||
            transferenciasInput.length === 0
        ) {
            throw new Error(
                "Nenhuma transferência foi enviada."
            );
        }

        const tipoLayout =
            validarTipoLayout(
                tipoLayoutInput
            );

        if (
            tipoLayout ===
            "SICOOB_BOLETO"
        ) {
            throw new Error(
                "O layout SICOOB_BOLETO não pode ser gerado pelo fluxo de transferências."
            );
        }

        const config =
            await obterConfigCnab(
                tipoLayout
            );

        const transferenciasNormalizadas =
            normalizarTransferencias(
                transferenciasInput
            );

        const transferencias: TransferenciaCnabInput[] =
            transferenciasNormalizadas.map(
                (item) => ({
                    ...item,

                    tipo: determinarTipoTransferencia(
                        item.banco,
                        config.BANCO
                    ),
                })
            );

        const invalidas =
            transferencias.filter(
                (item) => {
                    return (
                        !item.cpfCnpj ||
                        !item.banco ||
                        !item.agencia ||
                        !item.conta ||
                        !item.nome ||
                        !item.valor ||
                        item.valor <= 0
                    );
                }
            );

        if (invalidas.length > 0) {
            throw new Error(
                `Existem ${invalidas.length} transferência(s) com dados incompletos.`
            );
        }

        const sequencialAtual = Number(
            config.SEQUENCIAL_ATUAL || 0
        );

        const proximoSequencial =
            sequencialAtual + 1;

        const nomeArquivo =
            gerarNomeArquivo(
                proximoSequencial,
                tipoLayout
            );

        const valorTotal =
            transferencias.reduce(
                (acc, item) =>
                    acc +
                    Number(
                        item.valor || 0
                    ),
                0
            );

        const conteudo =
            gerarConteudoCnab({
                config,
                transferencias,
                sequencial:
                    proximoSequencial,
                tipoLayout,
            });

        const lote =
            await salvarLoteEDetalhes({
                sequencial:
                    proximoSequencial,
                transferencias,
                valorTotal,
                tipoLayout,
            });

        await atualizarSequencial(
            config,
            proximoSequencial
        );

        return {
            nomeArquivo,
            conteudo,
            totalLinhas:
                transferencias.length,
            valorTotal,
            sequencial:
                proximoSequencial,
            idLote: lote.ID_LOTE,
        };
    },

    async importarRetorno({
        buffer,
        originalName,
    }: ImportarRetornoInput) {
        const conteudo =
            buffer.toString("utf-8");

        return {
            success: true,
            message:
                "Arquivo recebido para conciliação.",
            arquivo: originalName,
            tamanho: buffer.length,
            linhas: conteudo
                .split(/\r?\n/)
                .filter(Boolean).length,
        };
    },

    async listarDetalhesRemessa(
        idLote: number
    ) {
        if (!idLote) {
            throw new Error(
                "ID do lote não informado."
            );
        }

        const result =
            await oracleExecute(
                SQL_DETALHES_REMESSA,
                {
                    id_lote: idLote,
                },
                {}
            );

        return result.rows || [];
    },
};