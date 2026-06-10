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

const SQL_LISTAR_REMESSAS = `
    SELECT
        ID_LOTE AS ID_REMESSA,
        'CNAB240_' || NR_LOTE || '.txt' AS NM_ARQUIVO,
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
        ON REGEXP_REPLACE(C.CPF, '[^0-9]', '') = REGEXP_REPLACE(F.CPF, '[^0-9]', '')
    WHERE REGEXP_REPLACE(F.CPF, '[^0-9]', '') = :cpf
    FETCH FIRST 1 ROWS ONLY
`;

function onlyDigits(value: unknown): string {
    return String(value ?? "").replace(/\D/g, "");
}

function gerarNomeArquivo(sequencial: number) {
    const agora = new Date();

    const data = agora
        .toLocaleDateString("pt-BR")
        .replace(/\D/g, "");

    return `CNAB${data}_${String(sequencial).padStart(6, "0")}.txt`;
}

function getFirstRow<T = any>(result: any): T | null {
    const rows = result?.rows || [];
    return rows.length ? rows[0] : null;
}

export const cnab240Service = {
    async listarRemessas() {
        const result = await oracleExecute(SQL_LISTAR_REMESSAS, {}, {});
        return result.rows || [];
    },

    async buscarFavorecidoPorCpf(cpf: string) {
        const cpfLimpo = onlyDigits(cpf);

        if (!cpfLimpo) {
            throw new Error("CPF não informado.");
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

        const configResult = await oracleExecute(SQL_CONFIG, {}, {});
        const config = getFirstRow<any>(configResult);

        if (!config) {
            throw new Error("Configuração CNAB não encontrada na tabela CNAB_CONFIG.");
        }

        const sequencialAtual = Number(config.SEQUENCIAL_ATUAL || 0);
        const proximoSequencial = sequencialAtual + 1;
        const nomeArquivo = gerarNomeArquivo(proximoSequencial);

        const conteudo = gerarCnab240Real({
            transferencias: parsed.transferencias,
            empresaNome: config.NOME_EMPRESA || "CRESSEM",
            empresaInscricao: config.CNPJ_EMPRESA,
            agencia: config.AGENCIA,
            conta: config.CONTA_CORRENTE,
            dvConta: config.DV_CONTA,
            codigoBanco: config.BANCO || "033",
            sequencialArquivo: proximoSequencial,
            dataPagamento: new Date(),
        });

        await oracleExecuteCommit(
            SQL_INSERT_LOTE,
            {
                nr_lote: proximoSequencial,
                qtde: parsed.totalRegistros,
                valor_total: parsed.valorTotal,
            },
            {}
        );

        const loteResult = await oracleExecute(
            SQL_SELECT_LOTE,
            { nr_lote: proximoSequencial },
            {}
        );

        const lote = getFirstRow<any>(loteResult);

        if (!lote?.ID_LOTE) {
            throw new Error("Não foi possível recuperar o lote CNAB gerado.");
        }

        const detalhesBinds = parsed.transferencias.map((item) => ({
            id_lote: lote.ID_LOTE,
            nr_lote: proximoSequencial,
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

        await oracleExecuteCommit(
            SQL_UPDATE_SEQUENCIAL,
            {
                sequencial: proximoSequencial,
                id_config: config.ID_CONFIG,
            },
            {}
        );

        return {
            nomeArquivo,
            conteudo,
            totalLinhas: parsed.totalRegistros,
            valorTotal: parsed.valorTotal,
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
};