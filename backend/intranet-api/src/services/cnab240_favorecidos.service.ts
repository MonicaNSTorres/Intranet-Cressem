import { oracleExecute, oracleExecuteCommit } from "./oracle.service";

export type CnabFavorecidoInput = {
    CPF: string;
    IDCLIENTE?: string | null;
    BANCO?: string | null;
    AGENCIA?: string | null;
    CONTA?: string | null;
    DV_CONTA?: string | null;
    NOME: string;
    ENDERECO?: string | null;
    NUMERO?: string | null;
    COMPLEMENTO?: string | null;
    BAIRRO?: string | null;
    CEP?: string | null;
    CEP_COMPLEMENTO?: string | null;
    CIDADE?: string | null;
    UF?: string | null;
};

export type ListarFavorecidosParams = {
    busca?: string;
    page?: number;
    limit?: number;
};

function onlyDigits(value: unknown) {
    return String(value ?? "").replace(/\D/g, "");
}

function onlyCpfCnpjChars(value: unknown) {
    return String(value ?? "")
        .replace(/[^a-zA-Z0-9]/g, "")
        .toUpperCase();
}

function normalizarBusca(value: unknown) {
    const str = String(value ?? "").trim();

    if (!str) return null;

    return onlyCpfCnpjChars(str) || str.toUpperCase();
}

const SQL_LISTAR = `
    SELECT
        ID_FAVORECIDO,
        CPF,
        IDCLIENTE,
        BANCO,
        AGENCIA,
        CONTA,
        DV_CONTA,
        NOME,
        ENDERECO,
        NUMERO,
        COMPLEMENTO,
        BAIRRO,
        CEP,
        CEP_COMPLEMENTO,
        CIDADE,
        UF,
        TO_CHAR(CREATED_AT, 'DD/MM/YYYY HH24:MI:SS') AS CREATED_AT,
        TO_CHAR(UPDATED_AT, 'DD/MM/YYYY HH24:MI:SS') AS UPDATED_AT
    FROM DBACRESSEM.CNAB_FAVORECIDOS
    WHERE
        (:busca IS NULL OR
         REGEXP_REPLACE(UPPER(CPF), '[^A-Z0-9]', '') LIKE '%' || :busca || '%' OR
         UPPER(NOME) LIKE '%' || UPPER(:busca) || '%')
    ORDER BY NOME
    OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
`;

const SQL_TOTAL = `
    SELECT COUNT(*) AS TOTAL
    FROM DBACRESSEM.CNAB_FAVORECIDOS
    WHERE
        (:busca IS NULL OR
         REGEXP_REPLACE(UPPER(CPF), '[^A-Z0-9]', '') LIKE '%' || :busca || '%' OR
         UPPER(NOME) LIKE '%' || UPPER(:busca) || '%')
`;

const SQL_RESUMO = `
    SELECT
        COUNT(*) AS TOTAL_FAVORECIDOS,
        COUNT(DISTINCT NULLIF(TRIM(BANCO), '')) AS TOTAL_BANCOS,
        COUNT(DISTINCT NULLIF(TRIM(CIDADE), '')) AS TOTAL_CIDADES
    FROM DBACRESSEM.CNAB_FAVORECIDOS
`;

const SQL_BUSCAR_POR_ID = `
    SELECT *
    FROM DBACRESSEM.CNAB_FAVORECIDOS
    WHERE ID_FAVORECIDO = :id
`;

const SQL_BUSCAR_POR_CPF = `
    SELECT *
    FROM DBACRESSEM.CNAB_FAVORECIDOS
    WHERE REGEXP_REPLACE(UPPER(CPF), '[^A-Z0-9]', '') = :cpf
    FETCH FIRST 1 ROWS ONLY
`;

const SQL_INSERIR = `
    INSERT INTO DBACRESSEM.CNAB_FAVORECIDOS (
        CPF,
        IDCLIENTE,
        BANCO,
        AGENCIA,
        CONTA,
        DV_CONTA,
        NOME,
        ENDERECO,
        NUMERO,
        COMPLEMENTO,
        BAIRRO,
        CEP,
        CEP_COMPLEMENTO,
        CIDADE,
        UF,
        CREATED_AT
    ) VALUES (
        :cpf,
        :idcliente,
        :banco,
        :agencia,
        :conta,
        :dv_conta,
        :nome,
        :endereco,
        :numero,
        :complemento,
        :bairro,
        :cep,
        :cep_complemento,
        :cidade,
        :uf,
        SYSDATE
    )
`;

const SQL_ATUALIZAR = `
    UPDATE DBACRESSEM.CNAB_FAVORECIDOS
    SET
        CPF = :cpf,
        IDCLIENTE = :idcliente,
        BANCO = :banco,
        AGENCIA = :agencia,
        CONTA = :conta,
        DV_CONTA = :dv_conta,
        NOME = :nome,
        ENDERECO = :endereco,
        NUMERO = :numero,
        COMPLEMENTO = :complemento,
        BAIRRO = :bairro,
        CEP = :cep,
        CEP_COMPLEMENTO = :cep_complemento,
        CIDADE = :cidade,
        UF = :uf,
        UPDATED_AT = SYSDATE
    WHERE ID_FAVORECIDO = :id
`;

const SQL_EXCLUIR = `
    DELETE FROM DBACRESSEM.CNAB_FAVORECIDOS
    WHERE ID_FAVORECIDO = :id
`;

function normalizarPayload(data: CnabFavorecidoInput) {
    return {
        cpf: onlyCpfCnpjChars(data.CPF),
        idcliente: data.IDCLIENTE || null,
        banco: onlyDigits(data.BANCO) || null,
        agencia: onlyDigits(data.AGENCIA) || null,
        conta: onlyDigits(data.CONTA) || null,
        dv_conta: String(data.DV_CONTA ?? "").trim() || null,
        nome: String(data.NOME ?? "").trim().toUpperCase(),
        endereco: String(data.ENDERECO ?? "").trim().toUpperCase() || null,
        numero: String(data.NUMERO ?? "").trim() || null,
        complemento: String(data.COMPLEMENTO ?? "").trim().toUpperCase() || null,
        bairro: String(data.BAIRRO ?? "").trim().toUpperCase() || null,
        cep: onlyDigits(data.CEP).slice(0, 5) || null,
        cep_complemento: onlyDigits(data.CEP_COMPLEMENTO).slice(0, 3) || "000",
        cidade: String(data.CIDADE ?? "").trim().toUpperCase() || null,
        uf: String(data.UF ?? "").trim().toUpperCase().slice(0, 2) || null,
    };
}

function validarPayload(data: ReturnType<typeof normalizarPayload>) {
    if (!data.cpf) throw new Error("CPF é obrigatório.");
    if (!data.nome) throw new Error("Nome é obrigatório.");

    if (data.cpf.length !== 11 && data.cpf.length !== 14) {
        throw new Error("CPF/CNPJ inválido.");
    }
}

function firstRow(result: any) {
    return result?.rows?.[0] || null;
}

export const cnab240FavorecidosService = {
    async listar(params: ListarFavorecidosParams = {}) {
        const busca = normalizarBusca(params.busca);

        const page = Math.max(Number(params.page || 1), 1);
        const limitRaw = Number(params.limit || 20);
        const limit = Math.min(Math.max(limitRaw, 5), 100);
        const offset = (page - 1) * limit;

        const [dataResult, totalResult, resumoResult] = await Promise.all([
            oracleExecute(SQL_LISTAR, { busca, offset, limit }, {}),
            oracleExecute(SQL_TOTAL, { busca }, {}),
            oracleExecute(SQL_RESUMO, {}, {}),
        ]);

        const total = Number(firstRow(totalResult)?.TOTAL || 0);
        const resumo = firstRow(resumoResult) || {};

        return {
            data: dataResult.rows || [],
            total,
            page,
            limit,
            totalPages: Math.max(Math.ceil(total / limit), 1),
            resumo: {
                totalFavorecidos: Number(resumo.TOTAL_FAVORECIDOS || 0),
                totalBancos: Number(resumo.TOTAL_BANCOS || 0),
                totalCidades: Number(resumo.TOTAL_CIDADES || 0),
            },
        };
    },

    async buscarPorId(id: number) {
        const result = await oracleExecute(SQL_BUSCAR_POR_ID, { id }, {});
        return firstRow(result);
    },

    async buscarPorCpf(cpf: string) {
        const cpfLimpo = onlyCpfCnpjChars(cpf);

        const result = await oracleExecute(
            SQL_BUSCAR_POR_CPF,
            { cpf: cpfLimpo },
            {}
        );

        return firstRow(result);
    },

    async criar(data: CnabFavorecidoInput) {
        const payload = normalizarPayload(data);
        validarPayload(payload);

        const existente = await this.buscarPorCpf(payload.cpf);

        if (existente) {
            throw new Error("Já existe um favorecido cadastrado com esse CPF/CNPJ.");
        }

        await oracleExecuteCommit(SQL_INSERIR, payload, {});

        return {
            success: true,
            message: "Favorecido cadastrado com sucesso.",
        };
    },

    async atualizar(id: number, data: CnabFavorecidoInput) {
        if (!id) {
            throw new Error("ID do favorecido não informado.");
        }

        const payload = normalizarPayload(data);
        validarPayload(payload);

        await oracleExecuteCommit(
            SQL_ATUALIZAR,
            {
                ...payload,
                id,
            },
            {}
        );

        return {
            success: true,
            message: "Favorecido atualizado com sucesso.",
        };
    },

    async excluir(id: number) {
        if (!id) {
            throw new Error("ID do favorecido não informado.");
        }

        await oracleExecuteCommit(SQL_EXCLUIR, { id }, {});

        return {
            success: true,
            message: "Favorecido excluído com sucesso.",
        };
    },
};