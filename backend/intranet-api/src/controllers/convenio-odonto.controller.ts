import { Request, Response } from "express";
import oracledb from "oracledb";
import { oracleExecute } from "../services/oracle.service";


function toNumber(v: any, fallback = 0) {
    if (v === null || v === undefined || v === "") return fallback;

    if (typeof v === "string") {
        const normalized = v.replace(/\./g, "").replace(",", ".");
        const n = Number(normalized);
        return Number.isFinite(n) ? n : fallback;
    }

    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
}

function toNullableNumber(v: any) {
    if (v === null || v === undefined || v === "") return null;

    if (typeof v === "string") {
        const normalized = v.replace(/\./g, "").replace(",", ".");
        const n = Number(normalized);
        return Number.isFinite(n) ? n : null;
    }

    const n = Number(v);
    return Number.isFinite(n) ? n : null;
}

function toNullableDate(v: any) {
    if (!v) return null;
    return String(v).slice(0, 10);
}

function paramToString(v: any) {
    if (Array.isArray(v)) return String(v[0] || "");
    return String(v || "");
}

function onlyDigits(v: any) {
    return paramToString(v).replace(/\D/g, "");
}

function toUpperTrim(v: any) {
    return String(v || "").trim().toUpperCase();
}

function toTrim(v: any) {
    return String(v || "").trim();
}


export const convenioOdontoController = {
    async listarFatorAjuste(req: Request, res: Response) {
        try {
            const sql = `
        SELECT
          ID_CONVENIO_FATOR_AJUSTE,
          ID_OPERADORA,
          NM_FATOR_AJUSTE,
          VL_AJUSTE,
          DT_VIGENCIA
        FROM DBACRESSEM.CONVENIO_FATOR_AJUSTE
        ORDER BY ID_CONVENIO_FATOR_AJUSTE
      `;

            const result = await oracleExecute(sql, {}, {
                outFormat: oracledb.OUT_FORMAT_OBJECT,
            });

            return res.json(result.rows || []);
        } catch (err: any) {
            console.error("listarFatorAjuste convenio odonto erro:", err);
            return res.status(500).json({
                error: "Falha ao listar fatores de ajuste.",
                details: String(err?.message || err),
            });
        }
    },

    async listarParentesco(req: Request, res: Response) {
        try {
            const sql = `
        SELECT
          ID_PARENTESCO,
          NM_PARENTESCO
        FROM DBACRESSEM.PARENTESCO
        ORDER BY NM_PARENTESCO
      `;

            const result = await oracleExecute(sql, {}, {
                outFormat: oracledb.OUT_FORMAT_OBJECT,
            });

            return res.json(result.rows || []);
        } catch (err: any) {
            console.error("listarParentesco convenio odonto erro:", err);
            return res.status(500).json({
                error: "Falha ao listar parentescos.",
                details: String(err?.message || err),
            });
        }
    },

    async downloadCsvTitular(req: Request, res: Response) {
        try {
            const cpf = onlyDigits(req.params.cpf);

            if (!cpf) {
                return res.status(400).json({
                    error: "CPF do titular é obrigatório.",
                });
            }

            const sql = `
      SELECT
        CP.NM_USUARIO,
        CP.NR_CPF_USUARIO,
        CP.CD_CARTAO,
        CP.DESC_PARENTESCO,
        CFA.NM_FATOR_AJUSTE,
        TO_CHAR(CP.DT_INCLUSAO, 'DD/MM/YYYY') AS DT_INCLUSAO,
        TO_CHAR(CP.DT_EXCLUSAO, 'DD/MM/YYYY') AS DT_EXCLUSAO,
        NVL(CFA.VL_AJUSTE, 0) AS VL_AJUSTE,
        CO.DESC_CONVENIO,
        CP.NM_MAE,
        TO_CHAR(CP.DT_NASCIMENTO, 'YYYY-MM-DD') AS DT_NASCIMENTO,
        CP.NM_CIDADE,
        CP.SN_ATIVO
      FROM DBACRESSEM.CONVENIO_PESSOAS CP
      LEFT JOIN DBACRESSEM.CONVENIO_OPERADORA CO
        ON CO.ID_CONVENIO_OPERADORA = CP.ID_OPERADORA
      LEFT JOIN DBACRESSEM.CONVENIO_FATOR_AJUSTE CFA
        ON CFA.ID_CONVENIO_FATOR_AJUSTE = CP.ID_CONVENIO_FATOR_AJUSTE
      WHERE CP.NR_CPF_TITULAR = :cpf
      ORDER BY CP.SN_ATIVO DESC, CP.NM_USUARIO
    `;

            const result = await oracleExecute(
                sql,
                { cpf },
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            const rows = result.rows || [];

            if (!rows.length) {
                return res.status(404).json({
                    error: "Nenhum registro encontrado para o CPF informado.",
                });
            }

            const header = [
                "NOME",
                "CPF_PESSOA",
                "COD_CARTAO",
                "PARENTESCO",
                "PLANO",
                "INCLUSAO",
                "EXCLUSAO",
                "VALOR",
                "CONVENIO",
                "NOME_MAE",
                "DATA_NASCIMENTO",
                "CIDADE",
                "ATIVO",
            ];

            const csvLines = [
                header.join(";"),
                ...rows.map((row: any) =>
                    [
                        `"${String(row.NM_USUARIO || "").replace(/"/g, '""')}"`,
                        `"${String(row.NR_CPF_USUARIO || "").replace(/"/g, '""')}"`,
                        `"${String(row.CD_CARTAO || "").replace(/"/g, '""')}"`,
                        `"${String(row.DESC_PARENTESCO || "").replace(/"/g, '""')}"`,
                        `"${String(row.NM_FATOR_AJUSTE || "").replace(/"/g, '""')}"`,
                        `"${String(row.DT_INCLUSAO || "").replace(/"/g, '""')}"`,
                        `"${String(row.DT_EXCLUSAO || "").replace(/"/g, '""')}"`,
                        `"${String(row.VL_AJUSTE || 0).replace(".", ",")}"`,
                        `"${String(row.DESC_CONVENIO || "").replace(/"/g, '""')}"`,
                        `"${String(row.NM_MAE || "").replace(/"/g, '""')}"`,
                        `"${String(row.DT_NASCIMENTO || "").replace(/"/g, '""')}"`,
                        `"${String(row.NM_CIDADE || "").replace(/"/g, '""')}"`,
                        `"${Number(row.SN_ATIVO || 0) === 1 ? "SIM" : "NAO"}"`,
                    ].join(";")
                ),
            ];

            const csv = "\uFEFF" + csvLines.join("\n");

            res.setHeader("Content-Type", "text/csv; charset=utf-8");
            res.setHeader(
                "Content-Disposition",
                `attachment; filename="convenio_odontologico_${cpf}.csv"`
            );

            return res.status(200).send(csv);
        } catch (err: any) {
            console.error("downloadCsvTitular convenio odonto erro:", err);
            return res.status(500).json({
                error: "Falha ao gerar relatório CSV.",
                details: String(err?.message || err),
            });
        }
    },

    async buscarCpfTitular(req: Request, res: Response) {
        try {
            const cpf = onlyDigits(req.params.cpf);

            if (!cpf) {
                return res.status(400).json({
                    error: "CPF do titular é obrigatório.",
                });
            }

            const sql = `
        SELECT
          CP.*,
          CO.ID_CONVENIO_OPERADORA,
          CO.DESC_CONVENIO,
          CFA.NM_FATOR_AJUSTE,
          CFA.VL_AJUSTE,
          CFA.DT_VIGENCIA
        FROM DBACRESSEM.CONVENIO_PESSOAS CP
        LEFT JOIN DBACRESSEM.CONVENIO_OPERADORA CO
          ON CO.ID_CONVENIO_OPERADORA = CP.ID_OPERADORA
        LEFT JOIN DBACRESSEM.CONVENIO_FATOR_AJUSTE CFA
          ON CFA.ID_CONVENIO_FATOR_AJUSTE = CP.ID_CONVENIO_FATOR_AJUSTE
        WHERE CP.NR_CPF_TITULAR = :cpf
        ORDER BY CP.SN_ATIVO DESC, CP.DT_INCLUSAO DESC, CP.ID_CONVENIO_PESSOAS DESC
      `;

            const result = await oracleExecute(
                sql,
                { cpf },
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            return res.json(result.rows || []);
        } catch (err: any) {
            console.error("buscarCpfTitular convenio odonto erro:", err);
            return res.status(500).json({
                error: "Falha ao buscar registros por CPF do titular.",
                details: String(err?.message || err),
            });
        }
    },

    async buscarCpfTitularUnico(req: Request, res: Response) {
        try {
            const cpf = onlyDigits(req.params.cpf);

            if (!cpf) {
                return res.status(400).json({
                    error: "CPF do titular é obrigatório.",
                });
            }

            const sql = `
        SELECT * FROM (
          SELECT
            CP.*,
            CO.ID_CONVENIO_OPERADORA,
            CO.DESC_CONVENIO,
            CFA.NM_FATOR_AJUSTE,
            CFA.VL_AJUSTE,
            CFA.DT_VIGENCIA
          FROM DBACRESSEM.CONVENIO_PESSOAS CP
          LEFT JOIN DBACRESSEM.CONVENIO_OPERADORA CO
            ON CO.ID_CONVENIO_OPERADORA = CP.ID_OPERADORA
          LEFT JOIN DBACRESSEM.CONVENIO_FATOR_AJUSTE CFA
            ON CFA.ID_CONVENIO_FATOR_AJUSTE = CP.ID_CONVENIO_FATOR_AJUSTE
          WHERE CP.NR_CPF_TITULAR = :cpf
            AND CP.DESC_PARENTESCO = 'TITULAR'
          ORDER BY CP.SN_ATIVO DESC, CP.DT_INCLUSAO DESC, CP.ID_CONVENIO_PESSOAS DESC
        )
        WHERE ROWNUM = 1
      `;

            const result = await oracleExecute(
                sql,
                { cpf },
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            if (!result.rows?.length) {
                return res.status(404).json({
                    error: "Titular não encontrado.",
                });
            }

            return res.json(result.rows[0]);
        } catch (err: any) {
            console.error("buscarCpfTitularUnico convenio odonto erro:", err);
            return res.status(500).json({
                error: "Falha ao buscar titular único.",
                details: String(err?.message || err),
            });
        }
    },

    async buscarCpfUsuario(req: Request, res: Response) {
        try {
            const cpf = onlyDigits(req.params.cpf);

            if (!cpf) {
                return res.status(400).json({
                    error: "CPF do usuário é obrigatório.",
                });
            }

            const sql = `
        SELECT * FROM (
          SELECT
            CP.*,
            CO.ID_CONVENIO_OPERADORA,
            CO.DESC_CONVENIO,
            CFA.NM_FATOR_AJUSTE,
            CFA.VL_AJUSTE,
            CFA.DT_VIGENCIA
          FROM DBACRESSEM.CONVENIO_PESSOAS CP
          LEFT JOIN DBACRESSEM.CONVENIO_OPERADORA CO
            ON CO.ID_CONVENIO_OPERADORA = CP.ID_OPERADORA
          LEFT JOIN DBACRESSEM.CONVENIO_FATOR_AJUSTE CFA
            ON CFA.ID_CONVENIO_FATOR_AJUSTE = CP.ID_CONVENIO_FATOR_AJUSTE
          WHERE CP.NR_CPF_USUARIO = :cpf
          ORDER BY CP.ID_CONVENIO_PESSOAS DESC
        )
        WHERE ROWNUM = 1
      `;

            const result = await oracleExecute(
                sql,
                { cpf },
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            if (!result.rows?.length) {
                return res.status(404).json({
                    error: "Usuário não encontrado.",
                });
            }

            return res.json(result.rows[0]);
        } catch (err: any) {
            console.error("buscarCpfUsuario convenio odonto erro:", err);
            return res.status(500).json({
                error: "Falha ao buscar usuário por CPF.",
                details: String(err?.message || err),
            });
        }
    },

    async buscarTodosCpfUsuario(req: Request, res: Response) {
        try {
            const cpf = onlyDigits(req.params.cpf);

            if (!cpf) {
                return res.status(400).json({
                    error: "CPF do usuário é obrigatório.",
                });
            }

            const sql = `
        SELECT * FROM (
          SELECT
            CP.*,
            CO.ID_CONVENIO_OPERADORA,
            CO.DESC_CONVENIO,
            CFA.NM_FATOR_AJUSTE,
            CFA.VL_AJUSTE,
            CFA.DT_VIGENCIA
          FROM DBACRESSEM.CONVENIO_PESSOAS CP
          LEFT JOIN DBACRESSEM.CONVENIO_OPERADORA CO
            ON CO.ID_CONVENIO_OPERADORA = CP.ID_OPERADORA
          LEFT JOIN DBACRESSEM.CONVENIO_FATOR_AJUSTE CFA
            ON CFA.ID_CONVENIO_FATOR_AJUSTE = CP.ID_CONVENIO_FATOR_AJUSTE
          WHERE CP.NR_CPF_USUARIO = :cpf
          ORDER BY CP.ID_CONVENIO_PESSOAS DESC
        )
        WHERE ROWNUM = 1
      `;

            const result = await oracleExecute(
                sql,
                { cpf },
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            if (!result.rows?.length) {
                return res.status(404).json({
                    error: "Usuário não encontrado.",
                });
            }

            return res.json(result.rows[0]);
        } catch (err: any) {
            console.error("buscarTodosCpfUsuario convenio odonto erro:", err);
            return res.status(500).json({
                error: "Falha ao buscar último registro do usuário.",
                details: String(err?.message || err),
            });
        }
    },

    async buscarCpfUsuarioLista(req: Request, res: Response) {
        try {
            const cpf = onlyDigits(req.params.cpf);

            if (!cpf) {
                return res.status(400).json({
                    error: "CPF do usuário é obrigatório.",
                });
            }

            const sql = `
        SELECT
          CP.*,
          CO.ID_CONVENIO_OPERADORA,
          CO.DESC_CONVENIO,
          CFA.NM_FATOR_AJUSTE,
          CFA.VL_AJUSTE,
          CFA.DT_VIGENCIA
        FROM DBACRESSEM.CONVENIO_PESSOAS CP
        LEFT JOIN DBACRESSEM.CONVENIO_OPERADORA CO
          ON CO.ID_CONVENIO_OPERADORA = CP.ID_OPERADORA
        LEFT JOIN DBACRESSEM.CONVENIO_FATOR_AJUSTE CFA
          ON CFA.ID_CONVENIO_FATOR_AJUSTE = CP.ID_CONVENIO_FATOR_AJUSTE
        WHERE CP.NR_CPF_USUARIO = :cpf
        ORDER BY CP.ID_CONVENIO_PESSOAS DESC
      `;

            const result = await oracleExecute(
                sql,
                { cpf },
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            return res.json(result.rows || []);
        } catch (err: any) {
            console.error("buscarCpfUsuarioLista convenio odonto erro:", err);
            return res.status(500).json({
                error: "Falha ao listar registros do usuário.",
                details: String(err?.message || err),
            });
        }
    },

    async buscarUsuarioSemCpf(req: Request, res: Response) {
        try {
            const nome = toUpperTrim(req.params.nome);

            if (!nome) {
                return res.status(400).json({
                    error: "Nome é obrigatório.",
                });
            }

            const sql = `
        SELECT * FROM (
          SELECT
            CP.*,
            CO.ID_CONVENIO_OPERADORA,
            CO.DESC_CONVENIO,
            CFA.NM_FATOR_AJUSTE,
            CFA.VL_AJUSTE,
            CFA.DT_VIGENCIA
          FROM DBACRESSEM.CONVENIO_PESSOAS CP
          LEFT JOIN DBACRESSEM.CONVENIO_OPERADORA CO
            ON CO.ID_CONVENIO_OPERADORA = CP.ID_OPERADORA
          LEFT JOIN DBACRESSEM.CONVENIO_FATOR_AJUSTE CFA
            ON CFA.ID_CONVENIO_FATOR_AJUSTE = CP.ID_CONVENIO_FATOR_AJUSTE
          WHERE UPPER(TRIM(CP.NM_USUARIO)) = :nome
            AND (CP.NR_CPF_USUARIO IS NULL OR TRIM(CP.NR_CPF_USUARIO) = '')
          ORDER BY CP.ID_CONVENIO_PESSOAS DESC
        )
        WHERE ROWNUM = 1
      `;

            const result = await oracleExecute(
                sql,
                { nome },
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            if (!result.rows?.length) {
                return res.status(404).json({
                    error: "Usuário sem CPF não encontrado.",
                });
            }

            return res.json(result.rows[0]);
        } catch (err: any) {
            console.error("buscarUsuarioSemCpf convenio odonto erro:", err);
            return res.status(500).json({
                error: "Falha ao buscar usuário sem CPF.",
                details: String(err?.message || err),
            });
        }
    },

    async buscarPorCodAssociado(req: Request, res: Response) {
        try {
            const cod = toTrim(req.params.cod);

            if (!cod) {
                return res.status(400).json({
                    error: "Código do associado é obrigatório.",
                });
            }

            const sql = `
        SELECT
          CP.*,
          CO.ID_CONVENIO_OPERADORA,
          CO.DESC_CONVENIO,
          CFA.NM_FATOR_AJUSTE,
          CFA.VL_AJUSTE,
          CFA.DT_VIGENCIA
        FROM DBACRESSEM.CONVENIO_PESSOAS CP
        LEFT JOIN DBACRESSEM.CONVENIO_OPERADORA CO
          ON CO.ID_CONVENIO_OPERADORA = CP.ID_OPERADORA
        LEFT JOIN DBACRESSEM.CONVENIO_FATOR_AJUSTE CFA
          ON CFA.ID_CONVENIO_FATOR_AJUSTE = CP.ID_CONVENIO_FATOR_AJUSTE
        WHERE CP.CD_ASSOCIADO = :cod
          AND CP.SN_ATIVO = 1
        ORDER BY CP.ID_CONVENIO_PESSOAS DESC
      `;

            const result = await oracleExecute(
                sql,
                { cod },
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            return res.json(result.rows || []);
        } catch (err: any) {
            console.error("buscarPorCodAssociado convenio odonto erro:", err);
            return res.status(500).json({
                error: "Falha ao buscar por código do associado.",
                details: String(err?.message || err),
            });
        }
    },

    async buscarPorCodCartao(req: Request, res: Response) {
        try {
            const cod = toTrim(req.params.cod);
            const cpfUsuario = onlyDigits(req.params.cpf_usuario);
            const cpfTitular = onlyDigits(req.params.cpf_titular);
            const nome = toUpperTrim(req.params.nome);

            if (!cod) {
                return res.status(400).json({
                    error: "Código do cartão é obrigatório.",
                });
            }

            const sql = `
        SELECT * FROM (
          SELECT
            CP.*,
            CO.ID_CONVENIO_OPERADORA,
            CO.DESC_CONVENIO,
            CFA.NM_FATOR_AJUSTE,
            CFA.VL_AJUSTE,
            CFA.DT_VIGENCIA
          FROM DBACRESSEM.CONVENIO_PESSOAS CP
          LEFT JOIN DBACRESSEM.CONVENIO_OPERADORA CO
            ON CO.ID_CONVENIO_OPERADORA = CP.ID_OPERADORA
          LEFT JOIN DBACRESSEM.CONVENIO_FATOR_AJUSTE CFA
            ON CFA.ID_CONVENIO_FATOR_AJUSTE = CP.ID_CONVENIO_FATOR_AJUSTE
          WHERE CP.CD_CARTAO = :cod
            AND CP.SN_ATIVO = 1
          ORDER BY CP.ID_CONVENIO_PESSOAS DESC
        )
        WHERE ROWNUM = 1
      `;

            const result = await oracleExecute(
                sql,
                { cod },
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            if (!result.rows?.length) {
                return res.status(404).json({
                    error: "Código de cartão não encontrado.",
                });
            }

            const pessoa: any = result.rows[0];

            if (pessoa.NR_CPF_USUARIO && onlyDigits(pessoa.NR_CPF_USUARIO) !== cpfUsuario) {
                return res.json({
                    cpf_titular: pessoa.NR_CPF_TITULAR,
                    conflito: true,
                });
            }

            if (
                (!pessoa.NR_CPF_USUARIO || String(pessoa.NR_CPF_USUARIO).trim() === "") &&
                onlyDigits(pessoa.NR_CPF_TITULAR) === cpfTitular &&
                toUpperTrim(pessoa.NM_USUARIO) === nome
            ) {
                return res.status(404).json({
                    error: "Mesmo usuário sem conflito.",
                });
            }

            return res.json({
                cpf_titular: pessoa.NR_CPF_TITULAR,
                conflito: true,
            });
        } catch (err: any) {
            console.error("buscarPorCodCartao convenio odonto erro:", err);
            return res.status(500).json({
                error: "Falha ao verificar código do cartão.",
                details: String(err?.message || err),
            });
        }
    },

    async totalCustoEStatus(req: Request, res: Response) {
        try {
            const cpf = onlyDigits(req.params.cpf);

            if (!cpf) {
                return res.status(400).json({
                    error: "CPF do titular é obrigatório.",
                });
            }

            const sqlTitular = `
        SELECT COUNT(*) AS TOTAL
        FROM DBACRESSEM.CONVENIO_PESSOAS
        WHERE NR_CPF_TITULAR = :cpf
          AND SN_ATIVO = 1
          AND (
            NR_CPF_USUARIO = :cpf
            OR DESC_PARENTESCO IN ('TITULAR', 'Titular', 'T')
          )
      `;

            const sqlTotal = `
        SELECT NVL(SUM(CFA.VL_AJUSTE), 0) AS TOTAL_CUSTO
        FROM DBACRESSEM.CONVENIO_PESSOAS CP
        LEFT JOIN DBACRESSEM.CONVENIO_FATOR_AJUSTE CFA
          ON CFA.ID_CONVENIO_FATOR_AJUSTE = CP.ID_CONVENIO_FATOR_AJUSTE
        WHERE CP.NR_CPF_TITULAR = :cpf
          AND CP.SN_ATIVO = 1
      `;

            const titularResult = await oracleExecute(
                sqlTitular,
                { cpf },
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            const totalResult = await oracleExecute(
                sqlTotal,
                { cpf },
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            const titularAtivo = Number((titularResult.rows?.[0] as any)?.TOTAL || 0) > 0;
            const totalCusto = Number((totalResult.rows?.[0] as any)?.TOTAL_CUSTO || 0);

            return res.json({
                titular_ativo: titularAtivo,
                total_custo: totalCusto,
            });
        } catch (err: any) {
            console.error("totalCustoEStatus convenio odonto erro:", err);
            return res.status(500).json({
                error: "Falha ao calcular custo total e status.",
                details: String(err?.message || err),
            });
        }
    },

    async criar(req: Request, res: Response) {
        try {
            const {
                ID_OPERADORA,
                CD_PLANO,
                CD_CARTAO,
                CD_ASSOCIADO,
                CD_USUARIO,
                NR_CPF_TITULAR,
                CD_MATRICULA,
                NM_EMPRESA,
                NR_CNPJ_EMPRESA,
                NM_USUARIO,
                NR_CPF_USUARIO,
                DT_INCLUSAO,
                DT_EXCLUSAO,
                DESC_PARENTESCO,
                ID_CONVENIO_FATOR_AJUSTE,
                SN_ATIVO,
                NM_ATENDENTE_CADASTRO,
                NM_ATENDENTE_EDICAO,
                NM_MAE,
                DT_NASCIMENTO,
                NM_CIDADE,
            } = req.body || {};

            if (!ID_OPERADORA) {
                return res.status(400).json({
                    error: "ID_OPERADORA é obrigatório.",
                });
            }

            if (!NR_CPF_TITULAR) {
                return res.status(400).json({
                    error: "NR_CPF_TITULAR é obrigatório.",
                });
            }

            if (!NM_USUARIO) {
                return res.status(400).json({
                    error: "NM_USUARIO é obrigatório.",
                });
            }

            if (!DESC_PARENTESCO) {
                return res.status(400).json({
                    error: "DESC_PARENTESCO é obrigatório.",
                });
            }

            if (!ID_CONVENIO_FATOR_AJUSTE) {
                return res.status(400).json({
                    error: "ID_CONVENIO_FATOR_AJUSTE é obrigatório.",
                });
            }

            const sql = `
        INSERT INTO DBACRESSEM.CONVENIO_PESSOAS (
          ID_OPERADORA,
          CD_PLANO,
          CD_CARTAO,
          CD_ASSOCIADO,
          CD_USUARIO,
          NR_CPF_TITULAR,
          CD_MATRICULA,
          NM_EMPRESA,
          NR_CNPJ_EMPRESA,
          NM_USUARIO,
          NR_CPF_USUARIO,
          DT_INCLUSAO,
          DT_EXCLUSAO,
          DESC_PARENTESCO,
          ID_CONVENIO_FATOR_AJUSTE,
          SN_ATIVO,
          NM_ATENDENTE_CADASTRO,
          NM_ATENDENTE_EDICAO,
          NM_MAE,
          DT_NASCIMENTO,
          NM_CIDADE
        ) VALUES (
          :ID_OPERADORA,
          :CD_PLANO,
          :CD_CARTAO,
          :CD_ASSOCIADO,
          :CD_USUARIO,
          :NR_CPF_TITULAR,
          :CD_MATRICULA,
          :NM_EMPRESA,
          :NR_CNPJ_EMPRESA,
          :NM_USUARIO,
          :NR_CPF_USUARIO,
          CASE
            WHEN :DT_INCLUSAO IS NULL THEN NULL
            ELSE TO_DATE(:DT_INCLUSAO, 'YYYY-MM-DD')
          END,
          CASE
            WHEN :DT_EXCLUSAO IS NULL THEN NULL
            ELSE TO_DATE(:DT_EXCLUSAO, 'YYYY-MM-DD')
          END,
          :DESC_PARENTESCO,
          :ID_CONVENIO_FATOR_AJUSTE,
          :SN_ATIVO,
          :NM_ATENDENTE_CADASTRO,
          :NM_ATENDENTE_EDICAO,
          :NM_MAE,
          CASE
            WHEN :DT_NASCIMENTO IS NULL THEN NULL
            ELSE TO_DATE(:DT_NASCIMENTO, 'YYYY-MM-DD')
          END,
          :NM_CIDADE
        )
      `;

            const binds = {
                ID_OPERADORA: toNumber(ID_OPERADORA),
                CD_PLANO: toNullableNumber(CD_PLANO),
                CD_CARTAO: CD_CARTAO ? toTrim(CD_CARTAO) : null,
                CD_ASSOCIADO: toNullableNumber(CD_ASSOCIADO),
                CD_USUARIO: toNullableNumber(CD_USUARIO),
                NR_CPF_TITULAR: onlyDigits(NR_CPF_TITULAR),
                CD_MATRICULA: CD_MATRICULA ? toTrim(CD_MATRICULA) : null,
                NM_EMPRESA: NM_EMPRESA ? toTrim(NM_EMPRESA) : null,
                NR_CNPJ_EMPRESA: NR_CNPJ_EMPRESA ? onlyDigits(NR_CNPJ_EMPRESA) : null,
                NM_USUARIO: toUpperTrim(NM_USUARIO),
                NR_CPF_USUARIO: NR_CPF_USUARIO ? onlyDigits(NR_CPF_USUARIO) : null,
                DT_INCLUSAO: toNullableDate(DT_INCLUSAO),
                DT_EXCLUSAO: toNullableDate(DT_EXCLUSAO),
                DESC_PARENTESCO: toUpperTrim(DESC_PARENTESCO),
                ID_CONVENIO_FATOR_AJUSTE: toNumber(ID_CONVENIO_FATOR_AJUSTE),
                SN_ATIVO:
                    SN_ATIVO === undefined || SN_ATIVO === null || SN_ATIVO === ""
                        ? 1
                        : Number(SN_ATIVO),
                NM_ATENDENTE_CADASTRO: NM_ATENDENTE_CADASTRO
                    ? toTrim(NM_ATENDENTE_CADASTRO)
                    : null,
                NM_ATENDENTE_EDICAO: NM_ATENDENTE_EDICAO
                    ? toTrim(NM_ATENDENTE_EDICAO)
                    : null,
                NM_MAE: NM_MAE ? toUpperTrim(NM_MAE) : null,
                DT_NASCIMENTO: toNullableDate(DT_NASCIMENTO),
                NM_CIDADE: NM_CIDADE ? toUpperTrim(NM_CIDADE) : null,
            };

            await oracleExecute(sql, binds, {
                autoCommit: true,
            } as any);

            return res.status(201).json({
                success: true,
            });
        } catch (err: any) {
            console.error("criar convenio odonto erro:", err);
            return res.status(500).json({
                error: "Falha ao salvar convênio odontológico.",
                details: String(err?.message || err),
            });
        }
    },

    async editar(req: Request, res: Response) {
        try {
            const id = Number(req.params.id);

            if (!id) {
                return res.status(400).json({
                    error: "ID_CONVENIO_PESSOAS inválido.",
                });
            }

            const {
                ID_OPERADORA,
                CD_PLANO,
                CD_CARTAO,
                CD_ASSOCIADO,
                CD_USUARIO,
                NR_CPF_TITULAR,
                CD_MATRICULA,
                NM_EMPRESA,
                NR_CNPJ_EMPRESA,
                NM_USUARIO,
                NR_CPF_USUARIO,
                DT_INCLUSAO,
                DT_EXCLUSAO,
                DESC_PARENTESCO,
                ID_CONVENIO_FATOR_AJUSTE,
                SN_ATIVO,
                NM_ATENDENTE_CADASTRO,
                NM_ATENDENTE_EDICAO,
                NM_MAE,
                DT_NASCIMENTO,
                NM_CIDADE,
            } = req.body || {};

            const sql = `
        UPDATE DBACRESSEM.CONVENIO_PESSOAS
        SET
          ID_OPERADORA = :ID_OPERADORA,
          CD_PLANO = :CD_PLANO,
          CD_CARTAO = :CD_CARTAO,
          CD_ASSOCIADO = :CD_ASSOCIADO,
          CD_USUARIO = :CD_USUARIO,
          NR_CPF_TITULAR = :NR_CPF_TITULAR,
          CD_MATRICULA = :CD_MATRICULA,
          NM_EMPRESA = :NM_EMPRESA,
          NR_CNPJ_EMPRESA = :NR_CNPJ_EMPRESA,
          NM_USUARIO = :NM_USUARIO,
          NR_CPF_USUARIO = :NR_CPF_USUARIO,
          DT_INCLUSAO = CASE
            WHEN :DT_INCLUSAO IS NULL THEN NULL
            ELSE TO_DATE(:DT_INCLUSAO, 'YYYY-MM-DD')
          END,
          DT_EXCLUSAO = CASE
            WHEN :DT_EXCLUSAO IS NULL THEN NULL
            ELSE TO_DATE(:DT_EXCLUSAO, 'YYYY-MM-DD')
          END,
          DESC_PARENTESCO = :DESC_PARENTESCO,
          ID_CONVENIO_FATOR_AJUSTE = :ID_CONVENIO_FATOR_AJUSTE,
          SN_ATIVO = :SN_ATIVO,
          NM_ATENDENTE_CADASTRO = :NM_ATENDENTE_CADASTRO,
          NM_ATENDENTE_EDICAO = :NM_ATENDENTE_EDICAO,
          NM_MAE = :NM_MAE,
          DT_NASCIMENTO = CASE
            WHEN :DT_NASCIMENTO IS NULL THEN NULL
            ELSE TO_DATE(:DT_NASCIMENTO, 'YYYY-MM-DD')
          END,
          NM_CIDADE = :NM_CIDADE
        WHERE ID_CONVENIO_PESSOAS = :ID_CONVENIO_PESSOAS
      `;

            const binds = {
                ID_CONVENIO_PESSOAS: id,
                ID_OPERADORA: toNumber(ID_OPERADORA),
                CD_PLANO: toNullableNumber(CD_PLANO),
                CD_CARTAO: CD_CARTAO ? toTrim(CD_CARTAO) : null,
                CD_ASSOCIADO: toNullableNumber(CD_ASSOCIADO),
                CD_USUARIO: toNullableNumber(CD_USUARIO),
                NR_CPF_TITULAR: onlyDigits(NR_CPF_TITULAR),
                CD_MATRICULA: CD_MATRICULA ? toTrim(CD_MATRICULA) : null,
                NM_EMPRESA: NM_EMPRESA ? toTrim(NM_EMPRESA) : null,
                NR_CNPJ_EMPRESA: NR_CNPJ_EMPRESA ? onlyDigits(NR_CNPJ_EMPRESA) : null,
                NM_USUARIO: NM_USUARIO ? toUpperTrim(NM_USUARIO) : null,
                NR_CPF_USUARIO: NR_CPF_USUARIO ? onlyDigits(NR_CPF_USUARIO) : null,
                DT_INCLUSAO: toNullableDate(DT_INCLUSAO),
                DT_EXCLUSAO: toNullableDate(DT_EXCLUSAO),
                DESC_PARENTESCO: DESC_PARENTESCO ? toUpperTrim(DESC_PARENTESCO) : null,
                ID_CONVENIO_FATOR_AJUSTE: toNullableNumber(ID_CONVENIO_FATOR_AJUSTE),
                SN_ATIVO:
                    SN_ATIVO === undefined || SN_ATIVO === null || SN_ATIVO === ""
                        ? null
                        : Number(SN_ATIVO),
                NM_ATENDENTE_CADASTRO: NM_ATENDENTE_CADASTRO
                    ? toTrim(NM_ATENDENTE_CADASTRO)
                    : null,
                NM_ATENDENTE_EDICAO: NM_ATENDENTE_EDICAO
                    ? toTrim(NM_ATENDENTE_EDICAO)
                    : null,
                NM_MAE: NM_MAE ? toUpperTrim(NM_MAE) : null,
                DT_NASCIMENTO: toNullableDate(DT_NASCIMENTO),
                NM_CIDADE: NM_CIDADE ? toUpperTrim(NM_CIDADE) : null,
            };

            const result = await oracleExecute(sql, binds, {
                autoCommit: true,
            } as any);

            if (!result.rowsAffected) {
                return res.status(404).json({
                    error: "Registro não encontrado.",
                });
            }

            return res.json({
                success: true,
            });
        } catch (err: any) {
            console.error("editar convenio odonto erro:", err);
            return res.status(500).json({
                error: "Falha ao editar convênio odontológico.",
                details: String(err?.message || err),
            });
        }
    },

    async criarHistorico(req: Request, res: Response) {
        try {
            const {
                CD_PLANO,
                NR_CPF_TITULAR,
                CD_MATRICULA,
                NM_EMPRESA,
                NR_CNPJ_EMPRESA,
                NM_USUARIO,
                NR_CPF_USUARIO,
                DT_INCLUSAO,
                DT_EXCLUSAO,
                NM_PARENTESCO,
                SN_ATIVO,
                NM_ATENDENTE_CADASTRO,
                NM_ATENDENTE_EDICAO,
                DT_NASCIMENTO,
                NM_MAE,
                NM_CIDADE,
                VL_FATOR_AJUSTE,
                NM_PLANO_FATOR_AJUSTE,
                NM_OPERADORA,
            } = req.body || {};

            const sql = `
        INSERT INTO DBACRESSEM.CONVENIO_PESSOAS_HISTORICO (
          CD_PLANO,
          NR_CPF_TITULAR,
          CD_MATRICULA,
          NM_EMPRESA,
          NR_CNPJ_EMPRESA,
          NM_USUARIO,
          NR_CPF_USUARIO,
          DT_INCLUSAO,
          DT_EXCLUSAO,
          NM_PARENTESCO,
          SN_ATIVO,
          NM_ATENDENTE_CADASTRO,
          NM_ATENDENTE_EDICAO,
          DT_NASCIMENTO,
          NM_MAE,
          NM_CIDADE,
          VL_FATOR_AJUSTE,
          NM_PLANO_FATOR_AJUSTE,
          NM_OPERADORA
        ) VALUES (
          :CD_PLANO,
          :NR_CPF_TITULAR,
          :CD_MATRICULA,
          :NM_EMPRESA,
          :NR_CNPJ_EMPRESA,
          :NM_USUARIO,
          :NR_CPF_USUARIO,
          CASE
            WHEN :DT_INCLUSAO IS NULL THEN NULL
            ELSE TO_DATE(:DT_INCLUSAO, 'YYYY-MM-DD')
          END,
          CASE
            WHEN :DT_EXCLUSAO IS NULL THEN NULL
            ELSE TO_DATE(:DT_EXCLUSAO, 'YYYY-MM-DD')
          END,
          :NM_PARENTESCO,
          :SN_ATIVO,
          :NM_ATENDENTE_CADASTRO,
          :NM_ATENDENTE_EDICAO,
          CASE
            WHEN :DT_NASCIMENTO IS NULL THEN NULL
            ELSE TO_DATE(:DT_NASCIMENTO, 'YYYY-MM-DD')
          END,
          :NM_MAE,
          :NM_CIDADE,
          :VL_FATOR_AJUSTE,
          :NM_PLANO_FATOR_AJUSTE,
          :NM_OPERADORA
        )
      `;

            const binds = {
                CD_PLANO: toNullableNumber(CD_PLANO),
                NR_CPF_TITULAR: NR_CPF_TITULAR ? onlyDigits(NR_CPF_TITULAR) : null,
                CD_MATRICULA: CD_MATRICULA ? toTrim(CD_MATRICULA) : null,
                NM_EMPRESA: NM_EMPRESA ? toTrim(NM_EMPRESA) : null,
                NR_CNPJ_EMPRESA: NR_CNPJ_EMPRESA ? onlyDigits(NR_CNPJ_EMPRESA) : null,
                NM_USUARIO: NM_USUARIO ? toUpperTrim(NM_USUARIO) : null,
                NR_CPF_USUARIO: NR_CPF_USUARIO ? onlyDigits(NR_CPF_USUARIO) : null,
                DT_INCLUSAO: toNullableDate(DT_INCLUSAO),
                DT_EXCLUSAO: toNullableDate(DT_EXCLUSAO),
                NM_PARENTESCO: NM_PARENTESCO ? toUpperTrim(NM_PARENTESCO) : null,
                SN_ATIVO:
                    SN_ATIVO === undefined || SN_ATIVO === null || SN_ATIVO === ""
                        ? null
                        : Number(SN_ATIVO),
                NM_ATENDENTE_CADASTRO: NM_ATENDENTE_CADASTRO
                    ? toTrim(NM_ATENDENTE_CADASTRO)
                    : null,
                NM_ATENDENTE_EDICAO: NM_ATENDENTE_EDICAO
                    ? toTrim(NM_ATENDENTE_EDICAO)
                    : null,
                DT_NASCIMENTO: toNullableDate(DT_NASCIMENTO),
                NM_MAE: NM_MAE ? toUpperTrim(NM_MAE) : null,
                NM_CIDADE: NM_CIDADE ? toUpperTrim(NM_CIDADE) : null,
                VL_FATOR_AJUSTE: toNullableNumber(VL_FATOR_AJUSTE),
                NM_PLANO_FATOR_AJUSTE: NM_PLANO_FATOR_AJUSTE
                    ? toUpperTrim(NM_PLANO_FATOR_AJUSTE)
                    : null,
                NM_OPERADORA: NM_OPERADORA ? toUpperTrim(NM_OPERADORA) : null,
            };

            await oracleExecute(sql, binds, {
                autoCommit: true,
            } as any);

            return res.status(201).json({
                success: true,
            });
        } catch (err: any) {
            console.error("criarHistorico convenio odonto erro:", err);
            return res.status(500).json({
                error: "Falha ao salvar histórico do convênio odontológico.",
                details: String(err?.message || err),
            });
        }
    },

    async desativarPorCpfTitular(req: Request, res: Response) {
        try {
            const cpf = onlyDigits(req.params.cpf);

            if (!cpf) {
                return res.status(400).json({
                    error: "CPF do titular é obrigatório.",
                });
            }

            const sql = `
        UPDATE DBACRESSEM.CONVENIO_PESSOAS
        SET
          SN_ATIVO = 0,
          DT_EXCLUSAO = SYSDATE
        WHERE NR_CPF_TITULAR = :cpf
          AND SN_ATIVO = 1
      `;

            const result = await oracleExecute(
                sql,
                { cpf },
                { autoCommit: true } as any
            );

            return res.json({
                success: true,
                rowsAffected: result.rowsAffected || 0,
            });
        } catch (err: any) {
            console.error("desativarPorCpfTitular convenio odonto erro:", err);
            return res.status(500).json({
                error: "Falha ao desativar registros do titular.",
                details: String(err?.message || err),
            });
        }
    },
};