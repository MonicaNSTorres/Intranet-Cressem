import { oracleExecute, oracleExecuteCommit } from "./oracle.service";

export type CnabCcoInput = {
    CPF: string;
    CONTA?: string | null;
    ATIVA?: string | null;
};

export type ListarCcoParams = {
    busca?: string;
    page?: number;
    limit?: number;
};

export type CnabCcoImportarLinha = {
    CPF: string;
    CONTA?: string | null;
    ATIVA?: string | null;
};

function onlyDigits(value: unknown) {
    return String(value ?? "").replace(/\D/g, "");
}

function normalizarBusca(value: unknown) {
    const str = String(value ?? "").trim();

    if (!str) return null;

    return onlyDigits(str) || str.toUpperCase();
}

const SQL_LISTAR = `
    SELECT
        ID_CCO,
        CHAVE_CPF_ATIVA,
        CPF,
        CONTA,
        ATIVA,
        TO_CHAR(CREATED_AT, 'DD/MM/YYYY HH24:MI:SS') AS CREATED_AT
    FROM DBACRESSEM.CNAB_CCO
    WHERE
        (:busca IS NULL OR
         REGEXP_REPLACE(CPF, '[^0-9]', '') LIKE '%' || :busca || '%' OR
         REGEXP_REPLACE(CONTA, '[^0-9]', '') LIKE '%' || :busca || '%' OR
         UPPER(CHAVE_CPF_ATIVA) LIKE '%' || UPPER(:busca) || '%')
    ORDER BY ID_CCO DESC
    OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
`;

const SQL_TOTAL = `
    SELECT COUNT(*) AS TOTAL
    FROM DBACRESSEM.CNAB_CCO
    WHERE
        (:busca IS NULL OR
         REGEXP_REPLACE(CPF, '[^0-9]', '') LIKE '%' || :busca || '%' OR
         REGEXP_REPLACE(CONTA, '[^0-9]', '') LIKE '%' || :busca || '%' OR
         UPPER(CHAVE_CPF_ATIVA) LIKE '%' || UPPER(:busca) || '%')
`;

const SQL_RESUMO = `
    SELECT
        COUNT(*) AS TOTAL_CCO,
        SUM(CASE WHEN UPPER(TRIM(ATIVA)) = 'S' THEN 1 ELSE 0 END) AS TOTAL_ATIVAS,
        SUM(CASE WHEN UPPER(TRIM(ATIVA)) = 'N' THEN 1 ELSE 0 END) AS TOTAL_INATIVAS
    FROM DBACRESSEM.CNAB_CCO
`;

const SQL_BUSCAR_POR_ID = `
    SELECT
        ID_CCO,
        CHAVE_CPF_ATIVA,
        CPF,
        CONTA,
        ATIVA,
        TO_CHAR(CREATED_AT, 'DD/MM/YYYY HH24:MI:SS') AS CREATED_AT
    FROM DBACRESSEM.CNAB_CCO
    WHERE ID_CCO = :id
`;

const SQL_INSERIR = `
    INSERT INTO DBACRESSEM.CNAB_CCO (
        CPF,
        CONTA,
        ATIVA,
        CREATED_AT
    ) VALUES (
        :cpf,
        :conta,
        :ativa,
        SYSDATE
    )
`;

const SQL_ATUALIZAR = `
    UPDATE DBACRESSEM.CNAB_CCO
    SET
        CPF = :cpf,
        CONTA = :conta,
        ATIVA = :ativa
    WHERE ID_CCO = :id
`;

const SQL_EXCLUIR = `
    DELETE FROM DBACRESSEM.CNAB_CCO
    WHERE ID_CCO = :id
`;

function firstRow(result: any) {
    return result?.rows?.[0] || null;
}

function normalizarPayload(data: CnabCcoInput) {
    return {
        cpf: onlyDigits(data.CPF),
        conta: onlyDigits(data.CONTA).slice(0, 12) || null,
        ativa: String(data.ATIVA ?? "S").trim().toUpperCase().slice(0, 1),
    };
}

function validarPayload(data: ReturnType<typeof normalizarPayload>) {
    if (!data.cpf) {
        throw new Error("CPF é obrigatório.");
    }

    if (data.cpf.length !== 11 && data.cpf.length !== 14) {
        throw new Error("CPF/CNPJ inválido.");
    }

    if (!data.conta) {
        throw new Error("Conta é obrigatória.");
    }

    if (!["S", "N"].includes(data.ativa)) {
        throw new Error("Campo ativa deve ser S ou N.");
    }
}

export const cnab240CcoService = {
    async listar(params: ListarCcoParams = {}) {
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
                totalCco: Number(resumo.TOTAL_CCO || 0),
                totalAtivas: Number(resumo.TOTAL_ATIVAS || 0),
                totalInativas: Number(resumo.TOTAL_INATIVAS || 0),
            },
        };
    },

    async buscarPorId(id: number) {
        const result = await oracleExecute(SQL_BUSCAR_POR_ID, { id }, {});
        return firstRow(result);
    },

    async criar(data: CnabCcoInput) {
        const payload = normalizarPayload(data);
        validarPayload(payload);

        await oracleExecuteCommit(SQL_INSERIR, payload, {});

        return {
            success: true,
            message: "Conta CCO cadastrada com sucesso.",
        };
    },

    async atualizar(id: number, data: CnabCcoInput) {
        if (!id) {
            throw new Error("ID da conta CCO não informado.");
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
            message: "Conta CCO atualizada com sucesso.",
        };
    },

    async excluir(id: number) {
        if (!id) {
            throw new Error("ID da conta CCO não informado.");
        }

        await oracleExecuteCommit(SQL_EXCLUIR, { id }, {});

        return {
            success: true,
            message: "Conta CCO excluída com sucesso.",
        };
    },

    async importarEmMassa(linhas: CnabCcoImportarLinha[]) {
        if (!Array.isArray(linhas) || linhas.length === 0) {
            throw new Error("Nenhuma linha informada para importação.");
        }

        let processados = 0;
        let inseridos = 0;
        let erros = 0;

        const detalhes: {
            linha: number;
            cpf: string;
            conta: string | null;
            ativa: string;
            status: "INSERIDO" | "ERRO";
            mensagem: string;
        }[] = [];

        for (let index = 0; index < linhas.length; index++) {
            const linha = linhas[index];

            processados++;

            try {
                const payload = normalizarPayload({
                    CPF: linha.CPF,
                    CONTA: linha.CONTA,
                    ATIVA: linha.ATIVA,
                });

                validarPayload(payload);

                await oracleExecuteCommit(SQL_INSERIR, payload, {});

                inseridos++;

                detalhes.push({
                    linha: index + 1,
                    cpf: payload.cpf,
                    conta: payload.conta,
                    ativa: payload.ativa,
                    status: "INSERIDO",
                    mensagem: "Registro inserido com sucesso.",
                });
            } catch (error: any) {
                erros++;

                detalhes.push({
                    linha: index + 1,
                    cpf: onlyDigits(linha?.CPF),
                    conta: onlyDigits(linha?.CONTA) || null,
                    ativa: String(linha?.ATIVA || "").trim().toUpperCase().slice(0, 1),
                    status: "ERRO",
                    mensagem: error?.message || "Erro ao importar linha.",
                });
            }
        }

        return {
            success: true,
            message: "Importação em massa finalizada.",
            processados,
            inseridos,
            erros,
            detalhes,
        };
    },
};