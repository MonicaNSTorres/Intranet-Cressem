import { oracleExecute, oracleExecuteCommit } from "./oracle.service";

export type CnabAgenciaInput = {
    NUMBANCO: string;
    NUMAGENCIA: string;
    DESCAGENCIA?: string | null;
    NUMCAMARACOMP?: string | null;
    CGCCOMPLETO?: string | null;
    CODMUNICIPIO?: string | null;
    NOMEMUNICIPIO?: string | null;
    UF?: string | null;
};

export type ListarAgenciasParams = {
    busca?: string;
    page?: number;
    limit?: number;
};

export type CnabAgenciaImportarLinha = CnabAgenciaInput;

function onlyDigits(value: unknown) {
    return String(value ?? "").replace(/\D/g, "");
}

function normalizarBusca(value: unknown) {
    const str = String(value ?? "").trim();

    if (!str) return null;

    return onlyDigits(str) || str.toUpperCase();
}

function gerarBancoAgencia(numBanco: unknown, numAgencia: unknown) {
    const banco = onlyDigits(numBanco).padStart(3, "0").slice(-3);
    const agencia = onlyDigits(numAgencia).padStart(5, "0").slice(-5);

    return `${banco}${agencia}`;
}

const SQL_LISTAR = `
    SELECT
        ID_AGENCIA,
        BANCOAGENCIA,
        NUMBANCO,
        NUMAGENCIA,
        DESCAGENCIA,
        NUMCAMARACOMP,
        CGCCOMPLETO,
        CODMUNICIPIO,
        NOMEMUNICIPIO,
        UF,
        TO_CHAR(CREATED_AT, 'DD/MM/YYYY HH24:MI:SS') AS CREATED_AT
    FROM DBACRESSEM.CNAB_AGENCIAS
    WHERE
        (:busca IS NULL OR
         UPPER(BANCOAGENCIA) LIKE '%' || UPPER(:busca) || '%' OR
         REGEXP_REPLACE(NUMBANCO, '[^0-9]', '') LIKE '%' || :busca || '%' OR
         REGEXP_REPLACE(NUMAGENCIA, '[^0-9]', '') LIKE '%' || :busca || '%' OR
         UPPER(DESCAGENCIA) LIKE '%' || UPPER(:busca) || '%' OR
         UPPER(NOMEMUNICIPIO) LIKE '%' || UPPER(:busca) || '%' OR
         UPPER(UF) LIKE '%' || UPPER(:busca) || '%')
    ORDER BY ID_AGENCIA DESC
    OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
`;

const SQL_TOTAL = `
    SELECT COUNT(*) AS TOTAL
    FROM DBACRESSEM.CNAB_AGENCIAS
    WHERE
        (:busca IS NULL OR
         UPPER(BANCOAGENCIA) LIKE '%' || UPPER(:busca) || '%' OR
         REGEXP_REPLACE(NUMBANCO, '[^0-9]', '') LIKE '%' || :busca || '%' OR
         REGEXP_REPLACE(NUMAGENCIA, '[^0-9]', '') LIKE '%' || :busca || '%' OR
         UPPER(DESCAGENCIA) LIKE '%' || UPPER(:busca) || '%' OR
         UPPER(NOMEMUNICIPIO) LIKE '%' || UPPER(:busca) || '%' OR
         UPPER(UF) LIKE '%' || UPPER(:busca) || '%')
`;

const SQL_RESUMO = `
    SELECT
        COUNT(*) AS TOTAL_AGENCIAS,
        COUNT(DISTINCT NUMBANCO) AS TOTAL_BANCOS,
        COUNT(DISTINCT NOMEMUNICIPIO) AS TOTAL_MUNICIPIOS
    FROM DBACRESSEM.CNAB_AGENCIAS
`;

const SQL_BUSCAR_POR_ID = `
    SELECT
        ID_AGENCIA,
        BANCOAGENCIA,
        NUMBANCO,
        NUMAGENCIA,
        DESCAGENCIA,
        NUMCAMARACOMP,
        CGCCOMPLETO,
        CODMUNICIPIO,
        NOMEMUNICIPIO,
        UF,
        TO_CHAR(CREATED_AT, 'DD/MM/YYYY HH24:MI:SS') AS CREATED_AT
    FROM DBACRESSEM.CNAB_AGENCIAS
    WHERE ID_AGENCIA = :id
`;

const SQL_INSERIR = `
    INSERT INTO DBACRESSEM.CNAB_AGENCIAS (
        BANCOAGENCIA,
        NUMBANCO,
        NUMAGENCIA,
        DESCAGENCIA,
        NUMCAMARACOMP,
        CGCCOMPLETO,
        CODMUNICIPIO,
        NOMEMUNICIPIO,
        UF,
        CREATED_AT
    ) VALUES (
        :bancoagencia,
        :numbanco,
        :numagencia,
        :descagencia,
        :numcamaracomp,
        :cgccompleto,
        :codmunicipio,
        :nomemunicipio,
        :uf,
        SYSDATE
    )
`;

const SQL_ATUALIZAR = `
    UPDATE DBACRESSEM.CNAB_AGENCIAS
    SET
        BANCOAGENCIA = :bancoagencia,
        NUMBANCO = :numbanco,
        NUMAGENCIA = :numagencia,
        DESCAGENCIA = :descagencia,
        NUMCAMARACOMP = :numcamaracomp,
        CGCCOMPLETO = :cgccompleto,
        CODMUNICIPIO = :codmunicipio,
        NOMEMUNICIPIO = :nomemunicipio,
        UF = :uf
    WHERE ID_AGENCIA = :id
`;

const SQL_EXCLUIR = `
    DELETE FROM DBACRESSEM.CNAB_AGENCIAS
    WHERE ID_AGENCIA = :id
`;

function firstRow(result: any) {
    return result?.rows?.[0] || null;
}

function normalizarPayload(data: CnabAgenciaInput) {
    const numbanco = onlyDigits(data.NUMBANCO).slice(0, 3);
    const numagencia = onlyDigits(data.NUMAGENCIA).slice(0, 5);

    return {
        bancoagencia: gerarBancoAgencia(numbanco, numagencia),
        numbanco,
        numagencia,
        descagencia: String(data.DESCAGENCIA ?? "").trim().toUpperCase() || null,
        numcamaracomp: onlyDigits(data.NUMCAMARACOMP).slice(0, 3) || null,
        cgccompleto: onlyDigits(data.CGCCOMPLETO).slice(0, 14) || null,
        codmunicipio: onlyDigits(data.CODMUNICIPIO).slice(0, 10) || null,
        nomemunicipio: String(data.NOMEMUNICIPIO ?? "").trim().toUpperCase() || null,
        uf: String(data.UF ?? "").trim().toUpperCase().slice(0, 2) || null,
    };
}

function validarPayload(data: ReturnType<typeof normalizarPayload>) {
    if (!data.numbanco) {
        throw new Error("Banco é obrigatório.");
    }

    if (!data.numagencia) {
        throw new Error("Agência é obrigatória.");
    }

    if (!data.descagencia) {
        throw new Error("Descrição da agência é obrigatória.");
    }

    if (data.uf && data.uf.length !== 2) {
        throw new Error("UF inválida.");
    }
}

export const cnab240AgenciasService = {
    gerarBancoAgencia,

    async listar(params: ListarAgenciasParams = {}) {
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
                totalAgencias: Number(resumo.TOTAL_AGENCIAS || 0),
                totalBancos: Number(resumo.TOTAL_BANCOS || 0),
                totalMunicipios: Number(resumo.TOTAL_MUNICIPIOS || 0),
            },
        };
    },

    async buscarPorId(id: number) {
        const result = await oracleExecute(SQL_BUSCAR_POR_ID, { id }, {});
        return firstRow(result);
    },

    async criar(data: CnabAgenciaInput) {
        const payload = normalizarPayload(data);
        validarPayload(payload);

        await oracleExecuteCommit(SQL_INSERIR, payload, {});

        return {
            success: true,
            message: "Agência cadastrada com sucesso.",
        };
    },

    async atualizar(id: number, data: CnabAgenciaInput) {
        if (!id) {
            throw new Error("ID da agência não informado.");
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
            message: "Agência atualizada com sucesso.",
        };
    },

    async excluir(id: number) {
        if (!id) {
            throw new Error("ID da agência não informado.");
        }

        await oracleExecuteCommit(SQL_EXCLUIR, { id }, {});

        return {
            success: true,
            message: "Agência excluída com sucesso.",
        };
    },

    async importarEmMassa(linhas: CnabAgenciaImportarLinha[]) {
        if (!Array.isArray(linhas) || linhas.length === 0) {
            throw new Error("Nenhuma linha informada para importação.");
        }

        let processados = 0;
        let inseridos = 0;
        let erros = 0;

        const detalhes: {
            linha: number;
            bancoagencia: string;
            numbanco: string;
            numagencia: string;
            descagencia: string | null;
            status: "INSERIDO" | "ERRO";
            mensagem: string;
        }[] = [];

        for (let index = 0; index < linhas.length; index++) {
            const linha = linhas[index];
            processados++;

            try {
                const payload = normalizarPayload(linha);
                validarPayload(payload);

                await oracleExecuteCommit(SQL_INSERIR, payload, {});

                inseridos++;

                detalhes.push({
                    linha: index + 1,
                    bancoagencia: payload.bancoagencia,
                    numbanco: payload.numbanco,
                    numagencia: payload.numagencia,
                    descagencia: payload.descagencia,
                    status: "INSERIDO",
                    mensagem: "Registro inserido com sucesso.",
                });
            } catch (error: any) {
                erros++;

                const numbanco = onlyDigits(linha?.NUMBANCO);
                const numagencia = onlyDigits(linha?.NUMAGENCIA);

                detalhes.push({
                    linha: index + 1,
                    bancoagencia: gerarBancoAgencia(numbanco, numagencia),
                    numbanco,
                    numagencia,
                    descagencia: String(linha?.DESCAGENCIA ?? "").trim() || null,
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