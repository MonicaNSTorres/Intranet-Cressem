import { oracleExecute, oracleExecuteCommit, oracleExecuteManyCommit } from "./oracle.service";
import { parseCnabExcel } from "./cnab240/excelParser";
import { gerarCnab240Real } from "./cnab240/gerarCnab240Real";

type GerarCnabInput = {
    buffer: Buffer;
    originalName: string;
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

const SQL_LISTAR_REMESSAS = `
    SELECT
        ID_LOTE AS ID_REMESSA,
        'CNAB' || TO_CHAR(DT_LOTE, 'DDMMYYYY') || '_' || LPAD(NR_LOTE, 6, '0') || '.txt' AS NM_ARQUIVO,
        TO_CHAR(DT_LOTE, 'DD/MM/YYYY HH24:MI:SS') AS DT_GERACAO,
        QTDE AS QT_PAGAMENTOS,
        VALOR_TOTAL AS VL_TOTAL,
        'GERADO' AS STATUS
    FROM DBACRESSEM.CNAB_LOTES
    ORDER BY DT_LOTE DESC, ID_LOTE DESC
`;

const SQL_CONFIG = `
    SELECT *
    FROM DBACRESSEM.CNAB_CONFIG
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
        CREATED_AT
    ) VALUES (
        SYSDATE,
        :nr_lote,
        :qtde,
        :valor_total,
        SYSDATE
    )
`;

const SQL_SELECT_LOTE = `
    SELECT ID_LOTE
    FROM DBACRESSEM.CNAB_LOTES
    WHERE NR_LOTE = :nr_lote
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

function gerarNomeArquivo(sequencial: number) {
    const agora = new Date();

    const data =
        String(agora.getDate()).padStart(2, "0") +
        String(agora.getMonth() + 1).padStart(2, "0") +
        agora.getFullYear();

    return `CNAB${data}_${String(sequencial).padStart(6, "0")}.txt`;
}

function getFirstRow<T = any>(result: any): T | null {
    const rows = result?.rows || [];
    return rows.length ? rows[0] : null;
}

function validarConfig(config: any) {
    const camposObrigatorios = [
        "ID_CONFIG",
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
        return value === null || value === undefined || String(value).trim() === "";
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

async function obterConfigCnab() {
    const configResult = await oracleExecute(SQL_CONFIG, {}, {});
    const config = getFirstRow<any>(configResult);

    if (!config) {
        throw new Error("Configuração CNAB não encontrada na tabela CNAB_CONFIG.");
    }

    validarConfig(config);

    return config;
}

async function salvarLoteEDetalhes(params: {
    sequencial: number;
    transferencias: TransferenciaCnabInput[];
    valorTotal: number;
}) {
    await oracleExecuteCommit(
        SQL_INSERT_LOTE,
        {
            nr_lote: params.sequencial,
            qtde: params.transferencias.length,
            valor_total: params.valorTotal,
        },
        {}
    );

    const loteResult = await oracleExecute(
        SQL_SELECT_LOTE,
        { nr_lote: params.sequencial },
        {}
    );

    const lote = getFirstRow<any>(loteResult);

    if (!lote?.ID_LOTE) {
        throw new Error("Não foi possível recuperar o lote CNAB gerado.");
    }

    const detalhesBinds = params.transferencias.map((item) => ({
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
    }));

    await oracleExecuteManyCommit(SQL_INSERT_DETALHES, detalhesBinds, {});

    return lote;
}

async function atualizarSequencial(config: any, proximoSequencial: number) {
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
}) {
    return gerarCnab240Real({
        transferencias: params.transferencias,

        codigoBanco: params.config.BANCO || "033",
        nomeBanco: params.config.NOME_BANCO || "SANTANDER",

        empresaNome: params.config.NOME_EMPRESA || "CRESSEM",
        empresaInscricao: params.config.CNPJ_EMPRESA,
        codigoConvenioBanco: params.config.COD_CONVENIO_BANCO,

        agencia: params.config.AGENCIA,
        dvAgencia: params.config.DV_AGENCIA || " ",
        conta: params.config.CONTA_CORRENTE,
        dvConta: params.config.DV_CONTA,

        enderecoEmpresa: params.config.ENDERECO,
        numeroEmpresa: params.config.NUMERO,
        complementoEmpresa: params.config.COMPLEMENTO || "",
        cidadeEmpresa: params.config.CIDADE,
        cepEmpresa: params.config.CEP,
        cepComplementoEmpresa: params.config.CEP_COMPLEMENTO,
        ufEmpresa: params.config.UF,

        sequencialArquivo: params.sequencial,
        dataPagamento: new Date(),
    });
}

export const cnab240Service = {
    async listarRemessas() {
        const result = await oracleExecute(SQL_LISTAR_REMESSAS, {}, {});
        return result.rows || [];
    },

    async buscarFavorecidoPorCpf(cpf: string) {
        const cpfLimpo = onlyCpfCnpjChars(cpf);

        if (!cpfLimpo) {
            throw new Error("CPF/CNPJ não informado.");
        }

        const result = await oracleExecute(
            SQL_BUSCAR_FAVORECIDO,
            { cpf: cpfLimpo },
            {}
        );

        return getFirstRow(result);
    },

    async gerarCnab240({ buffer }: GerarCnabInput) {
        const parsed = parseCnabExcel(buffer);

        if (parsed.totalRegistros === 0) {
            throw new Error("Nenhuma transferência válida foi encontrada no Excel.");
        }

        const transferencias = normalizarTransferencias(parsed.transferencias);
        const config = await obterConfigCnab();

        const sequencialAtual = Number(config.SEQUENCIAL_ATUAL || 0);
        const proximoSequencial = sequencialAtual + 1;

        const nomeArquivo = gerarNomeArquivo(proximoSequencial);
        const valorTotal = transferencias.reduce(
            (acc, item) => acc + Number(item.valor || 0),
            0
        );

        const conteudo = gerarConteudoCnab({
            config,
            transferencias,
            sequencial: proximoSequencial,
        });

        const lote = await salvarLoteEDetalhes({
            sequencial: proximoSequencial,
            transferencias,
            valorTotal,
        });

        await atualizarSequencial(config, proximoSequencial);

        return {
            nomeArquivo,
            conteudo,
            totalLinhas: transferencias.length,
            valorTotal,
            sequencial: proximoSequencial,
            idLote: lote.ID_LOTE,
        };
    },

    async gerarCnab240PorTransferencias(
        transferenciasInput: TransferenciaCnabInput[]
    ) {
        if (!Array.isArray(transferenciasInput) || transferenciasInput.length === 0) {
            throw new Error("Nenhuma transferência foi enviada.");
        }

        const transferencias = normalizarTransferencias(transferenciasInput);

        const invalidas = transferencias.filter((item) => {
            return (
                !item.cpfCnpj ||
                !item.banco ||
                !item.agencia ||
                !item.conta ||
                !item.nome ||
                !item.valor ||
                item.valor <= 0
            );
        });

        if (invalidas.length > 0) {
            throw new Error(
                `Existem ${invalidas.length} transferência(s) com dados incompletos.`
            );
        }

        const config = await obterConfigCnab();

        const sequencialAtual = Number(config.SEQUENCIAL_ATUAL || 0);
        const proximoSequencial = sequencialAtual + 1;

        const nomeArquivo = gerarNomeArquivo(proximoSequencial);

        const valorTotal = transferencias.reduce(
            (acc, item) => acc + Number(item.valor || 0),
            0
        );

        const conteudo = gerarConteudoCnab({
            config,
            transferencias,
            sequencial: proximoSequencial,
        });

        const lote = await salvarLoteEDetalhes({
            sequencial: proximoSequencial,
            transferencias,
            valorTotal,
        });

        await atualizarSequencial(config, proximoSequencial);

        return {
            nomeArquivo,
            conteudo,
            totalLinhas: transferencias.length,
            valorTotal,
            sequencial: proximoSequencial,
            idLote: lote.ID_LOTE,
        };
    },

    async importarRetorno({ buffer, originalName }: ImportarRetornoInput) {
        const conteudo = buffer.toString("utf-8");

        return {
            success: true,
            message: "Arquivo recebido para conciliação.",
            arquivo: originalName,
            tamanho: buffer.length,
            linhas: conteudo.split(/\r?\n/).filter(Boolean).length,
        };
    },

    async listarDetalhesRemessa(idLote: number) {
        if (!idLote) {
            throw new Error("ID do lote não informado.");
        }

        const result = await oracleExecute(
            SQL_DETALHES_REMESSA,
            { id_lote: idLote },
            {}
        );

        return result.rows || [];
    },
};