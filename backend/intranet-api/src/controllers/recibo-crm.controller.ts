import { Request, Response } from "express";
import oracledb from "oracledb";
import { oracleExecute } from "../services/oracle.service";

function onlyDigits(v: string) {
    return String(v || "").replace(/\D/g, "");
}

function toTrim(v: any) {
    return String(v || "").trim();
}

function toUpperTrim(v: any) {
    return String(v || "").trim().toUpperCase();
}

function toNullableDate(v: any) {
    if (!v) return null;
    return String(v).slice(0, 10);
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

async function salvarParcelas(
    idRecibo: number,
    parcelas: any[],
    conn?: oracledb.Connection
) {
    for (const item of parcelas || []) {
        const sql = `
      INSERT INTO DBACRESSEM.PARCELA_VALOR_CRM (
        ID_RECIBO,
        NM_CATEGORIA,
        SN_QUITACAO,
        DT_PERIODO,
        NR_CONTRATO,
        NR_PARCELA,
        VL_PARCELA_CRM
      ) VALUES (
        :ID_RECIBO,
        :NM_CATEGORIA,
        :SN_QUITACAO,
        TO_DATE(:DT_PERIODO, 'YYYY-MM-DD'),
        :NR_CONTRATO,
        :NR_PARCELA,
        :VL_PARCELA_CRM
      )
    `;

        await oracleExecute(
            sql,
            {
                ID_RECIBO: idRecibo,
                NM_CATEGORIA: toUpperTrim(item?.NM_CATEGORIA),
                SN_QUITACAO: Number(item?.SN_QUITACAO || 0),
                DT_PERIODO: toNullableDate(item?.DT_PERIODO),
                NR_CONTRATO: item?.NR_CONTRATO ? toTrim(item?.NR_CONTRATO) : null,
                NR_PARCELA: toNullableNumber(item?.NR_PARCELA),
                VL_PARCELA_CRM: toNullableNumber(item?.VL_PARCELA_CRM) || 0,
            },
            { autoCommit: true, connection: conn } as any
        );
    }
}

async function salvarPagamentos(
    idRecibo: number,
    pagamentos: any[],
    conn?: oracledb.Connection
) {
    for (const item of pagamentos || []) {
        const sql = `
      INSERT INTO DBACRESSEM.PAGAMENTO_CRM (
        ID_RECIBO,
        NM_FORMA_PAGAMENTO,
        VL_PAGAMENTO
      ) VALUES (
        :ID_RECIBO,
        :NM_FORMA_PAGAMENTO,
        :VL_PAGAMENTO
      )
    `;

        await oracleExecute(
            sql,
            {
                ID_RECIBO: idRecibo,
                NM_FORMA_PAGAMENTO: toUpperTrim(item?.NM_FORMA_PAGAMENTO),
                VL_PAGAMENTO: toNullableNumber(item?.VL_PAGAMENTO) || 0,
            },
            { autoCommit: true, connection: conn } as any
        );
    }
}

export const reciboCrmController = {
    async listarTiposAtendimento(_req: Request, res: Response) {
        try {
            const sql = `
        SELECT DISTINCT
          NM_ATENDIMENTO
        FROM DBACRESSEM.TIPO_ATENDIMENTO_RECIBO
        WHERE NM_ATENDIMENTO IS NOT NULL
        ORDER BY NM_ATENDIMENTO
      `;

            const result = await oracleExecute(
                sql,
                {},
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            return res.json(result.rows || []);
        } catch (err: any) {
            console.error("listar tipos atendimento recibo erro:", err);
            return res.status(500).json({
                error: "Falha ao listar tipos de atendimento.",
                details: String(err?.message || err),
            });
        }
    },

    async listarCategoriasContrato(_req: Request, res: Response) {
        try {
            const sql = `
        SELECT DISTINCT
          NM_CATEGORIA
        FROM DBACRESSEM.CATEGORIA_CONTRATO_RECIBO
        WHERE NM_CATEGORIA IS NOT NULL
        ORDER BY NM_CATEGORIA
      `;

            const result = await oracleExecute(
                sql,
                {},
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            return res.json(result.rows || []);
        } catch (err: any) {
            console.error("listar categorias contrato recibo erro:", err);
            return res.status(500).json({
                error: "Falha ao listar categorias de contrato.",
                details: String(err?.message || err),
            });
        }
    },

    async listarFormasPagamento(_req: Request, res: Response) {
        try {
            const sql = `
        SELECT DISTINCT
          NM_PAGAMENTO
        FROM DBACRESSEM.FORMA_PAGAMENTO_RECIBO
        WHERE NM_PAGAMENTO IS NOT NULL
        ORDER BY NM_PAGAMENTO
      `;

            const result = await oracleExecute(
                sql,
                {},
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            return res.json(result.rows || []);
        } catch (err: any) {
            console.error("listar formas pagamento recibo erro:", err);
            return res.status(500).json({
                error: "Falha ao listar formas de pagamento.",
                details: String(err?.message || err),
            });
        }
    },

    async criar(req: Request, res: Response) {
        try {
            const {
                NR_CPF_CNPJ,
                NM_ASSOCIADO,
                NR_MATRICULA,
                NM_EMPRESA,
                DT_DIA,
                CIDADE,
                TP_ATENDIMENTO,
                OBSERVACAO,
                NM_FUNCIONARIO,
                PARCELAS,
                PAGAMENTOS,
            } = req.body || {};

            if (!NR_CPF_CNPJ) {
                return res.status(400).json({ error: "NR_CPF_CNPJ é obrigatório." });
            }

            if (!NM_ASSOCIADO) {
                return res.status(400).json({ error: "NM_ASSOCIADO é obrigatório." });
            }

            if (!DT_DIA) {
                return res.status(400).json({ error: "DT_DIA é obrigatório." });
            }

            if (!CIDADE) {
                return res.status(400).json({ error: "CIDADE é obrigatória." });
            }

            if (!TP_ATENDIMENTO) {
                return res.status(400).json({ error: "TP_ATENDIMENTO é obrigatório." });
            }

            if (!Array.isArray(PARCELAS) || PARCELAS.length === 0) {
                return res.status(400).json({ error: "PARCELAS é obrigatório." });
            }

            if (!Array.isArray(PAGAMENTOS) || PAGAMENTOS.length === 0) {
                return res.status(400).json({ error: "PAGAMENTOS é obrigatório." });
            }

            const sql = `
        INSERT INTO DBACRESSEM.RECIBO_CRM (
          NR_CPF_CNPJ,
          NM_ASSOCIADO,
          NR_MATRICULA,
          NM_EMPRESA,
          DT_DIA,
          CIDADE,
          TP_ATENDIMENTO,
          OBSERVACAO,
          NM_FUNCIONARIO
        ) VALUES (
          :NR_CPF_CNPJ,
          :NM_ASSOCIADO,
          :NR_MATRICULA,
          :NM_EMPRESA,
          TO_DATE(:DT_DIA, 'YYYY-MM-DD'),
          :CIDADE,
          :TP_ATENDIMENTO,
          :OBSERVACAO,
          :NM_FUNCIONARIO
        )
        RETURNING ID_RECIBO_CRM INTO :ID_RECIBO_CRM
      `;

            const result = await oracleExecute(
                sql,
                {
                    NR_CPF_CNPJ: onlyDigits(NR_CPF_CNPJ),
                    NM_ASSOCIADO: toUpperTrim(NM_ASSOCIADO),
                    NR_MATRICULA: NR_MATRICULA ? toTrim(NR_MATRICULA) : null,
                    NM_EMPRESA: NM_EMPRESA ? toUpperTrim(NM_EMPRESA) : null,
                    DT_DIA: toNullableDate(DT_DIA),
                    CIDADE: toUpperTrim(CIDADE),
                    TP_ATENDIMENTO: toUpperTrim(TP_ATENDIMENTO),
                    OBSERVACAO: OBSERVACAO ? toTrim(OBSERVACAO) : null,
                    NM_FUNCIONARIO: NM_FUNCIONARIO ? toUpperTrim(NM_FUNCIONARIO) : null,
                    ID_RECIBO_CRM: {
                        dir: oracledb.BIND_OUT,
                        type: oracledb.NUMBER,
                    },
                },
                { autoCommit: true } as any
            );

            const idRecibo =
                (result.outBinds as any)?.ID_RECIBO_CRM?.[0] ||
                (result.outBinds as any)?.ID_RECIBO_CRM;

            await salvarParcelas(idRecibo, PARCELAS);
            await salvarPagamentos(idRecibo, PAGAMENTOS);

            return res.status(201).json({
                success: true,
                ID_RECIBO_CRM: idRecibo,
            });
        } catch (err: any) {
            console.error("criar recibo crm erro:", err);
            return res.status(500).json({
                error: "Falha ao cadastrar recibo.",
                details: String(err?.message || err),
            });
        }
    },

    async editar(req: Request, res: Response) {
        try {
            const id = Number(req.params.id);

            if (!id) {
                return res.status(400).json({
                    error: "ID_RECIBO_CRM inválido.",
                });
            }

            const {
                NR_CPF_CNPJ,
                NM_ASSOCIADO,
                NR_MATRICULA,
                NM_EMPRESA,
                DT_DIA,
                CIDADE,
                TP_ATENDIMENTO,
                OBSERVACAO,
                NM_FUNCIONARIO,
                PARCELAS,
                PAGAMENTOS,
            } = req.body || {};

            if (!NR_CPF_CNPJ) {
                return res.status(400).json({ error: "NR_CPF_CNPJ é obrigatório." });
            }

            if (!NM_ASSOCIADO) {
                return res.status(400).json({ error: "NM_ASSOCIADO é obrigatório." });
            }

            if (!DT_DIA) {
                return res.status(400).json({ error: "DT_DIA é obrigatório." });
            }

            if (!CIDADE) {
                return res.status(400).json({ error: "CIDADE é obrigatória." });
            }

            if (!TP_ATENDIMENTO) {
                return res.status(400).json({ error: "TP_ATENDIMENTO é obrigatório." });
            }

            const sql = `
        UPDATE DBACRESSEM.RECIBO_CRM
        SET
          NR_CPF_CNPJ = :NR_CPF_CNPJ,
          NM_ASSOCIADO = :NM_ASSOCIADO,
          NR_MATRICULA = :NR_MATRICULA,
          NM_EMPRESA = :NM_EMPRESA,
          DT_DIA = TO_DATE(:DT_DIA, 'YYYY-MM-DD'),
          CIDADE = :CIDADE,
          TP_ATENDIMENTO = :TP_ATENDIMENTO,
          OBSERVACAO = :OBSERVACAO,
          NM_FUNCIONARIO = :NM_FUNCIONARIO
        WHERE ID_RECIBO_CRM = :ID_RECIBO_CRM
      `;

            const result = await oracleExecute(
                sql,
                {
                    ID_RECIBO_CRM: id,
                    NR_CPF_CNPJ: onlyDigits(NR_CPF_CNPJ),
                    NM_ASSOCIADO: toUpperTrim(NM_ASSOCIADO),
                    NR_MATRICULA: NR_MATRICULA ? toTrim(NR_MATRICULA) : null,
                    NM_EMPRESA: NM_EMPRESA ? toUpperTrim(NM_EMPRESA) : null,
                    DT_DIA: toNullableDate(DT_DIA),
                    CIDADE: toUpperTrim(CIDADE),
                    TP_ATENDIMENTO: toUpperTrim(TP_ATENDIMENTO),
                    OBSERVACAO: OBSERVACAO ? toTrim(OBSERVACAO) : null,
                    NM_FUNCIONARIO: NM_FUNCIONARIO ? toUpperTrim(NM_FUNCIONARIO) : null,
                },
                { autoCommit: true } as any
            );

            if (!result.rowsAffected) {
                return res.status(404).json({
                    error: "Recibo não encontrado.",
                });
            }

            await oracleExecute(
                `DELETE FROM DBACRESSEM.PARCELA_VALOR_CRM WHERE ID_RECIBO = :ID_RECIBO`,
                { ID_RECIBO: id },
                { autoCommit: true } as any
            );

            await oracleExecute(
                `DELETE FROM DBACRESSEM.PAGAMENTO_CRM WHERE ID_RECIBO = :ID_RECIBO`,
                { ID_RECIBO: id },
                { autoCommit: true } as any
            );

            await salvarParcelas(id, PARCELAS || []);
            await salvarPagamentos(id, PAGAMENTOS || []);

            return res.json({
                success: true,
                ID_RECIBO_CRM: id,
            });
        } catch (err: any) {
            console.error("editar recibo crm erro:", err);
            return res.status(500).json({
                error: "Falha ao editar recibo.",
                details: String(err?.message || err),
            });
        }
    },

    async buscarPorId(req: Request, res: Response) {
        try {
            const id = Number(req.params.id);

            if (!id) {
                return res.status(400).json({
                    error: "ID_RECIBO_CRM inválido.",
                });
            }

            const sqlRecibo = `
        SELECT
          ID_RECIBO_CRM,
          NR_CPF_CNPJ,
          NM_ASSOCIADO,
          NR_MATRICULA,
          NM_EMPRESA,
          TO_CHAR(DT_DIA, 'YYYY-MM-DD') AS DT_DIA,
          CIDADE,
          TP_ATENDIMENTO,
          OBSERVACAO,
          NM_FUNCIONARIO
        FROM DBACRESSEM.RECIBO_CRM
        WHERE ID_RECIBO_CRM = :id
      `;

            const reciboResult = await oracleExecute(
                sqlRecibo,
                { id },
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            if (!reciboResult.rows?.length) {
                return res.status(404).json({
                    error: "Recibo não encontrado.",
                });
            }

            const sqlParcelas = `
        SELECT
          NM_CATEGORIA,
          SN_QUITACAO,
          TO_CHAR(DT_PERIODO, 'YYYY-MM-DD') AS DT_PERIODO,
          NR_CONTRATO,
          NR_PARCELA,
          VL_PARCELA_CRM
        FROM DBACRESSEM.PARCELA_VALOR_CRM
        WHERE ID_RECIBO = :id
        ORDER BY ID_PARCELA_VALOR_CRM
      `;

            const sqlPagamentos = `
        SELECT
          NM_FORMA_PAGAMENTO,
          VL_PAGAMENTO
        FROM DBACRESSEM.PAGAMENTO_CRM
        WHERE ID_RECIBO = :id
        ORDER BY ID_PAGAMENTO_CRM
      `;

            const [parcelasResult, pagamentosResult] = await Promise.all([
                oracleExecute(sqlParcelas, { id }, { outFormat: oracledb.OUT_FORMAT_OBJECT }),
                oracleExecute(sqlPagamentos, { id }, { outFormat: oracledb.OUT_FORMAT_OBJECT }),
            ]);

            return res.json({
                ...(reciboResult.rows[0] as any),
                PARCELAS: parcelasResult.rows || [],
                PAGAMENTOS: pagamentosResult.rows || [],
            });
        } catch (err: any) {
            console.error("buscarPorId recibo crm erro:", err);
            return res.status(500).json({
                error: "Falha ao buscar recibo.",
                details: String(err?.message || err),
            });
        }
    },

    async listarPaginado(req: Request, res: Response) {
        try {
            const page = Math.max(Number(req.query.page || 1), 1);
            const limit = Math.max(Number(req.query.limit || 10), 1);
            const offset = (page - 1) * limit;

            const nome = String(req.query.nome || "").trim();
            const dia = String(req.query.dia || "").trim();

            const filtros: string[] = [];
            const bindsWhere: Record<string, any> = {};

            if (nome) {
                filtros.push(`
        (
          UPPER(NM_ASSOCIADO) LIKE '%' || UPPER(:nome) || '%'
          OR NR_CPF_CNPJ LIKE '%' || :nomeDigits || '%'
          OR UPPER(NM_FUNCIONARIO) LIKE '%' || UPPER(:nome) || '%'
        )
      `);
                bindsWhere.nome = nome;
                bindsWhere.nomeDigits = onlyDigits(nome);
            }

            if (dia) {
                filtros.push(`TRUNC(DT_DIA) = TO_DATE(:dia, 'YYYY-MM-DD')`);
                bindsWhere.dia = dia;
            }

            const whereClause = filtros.length ? `WHERE ${filtros.join(" AND ")}` : "";

            const sqlCount = `
      SELECT COUNT(*) AS TOTAL
      FROM DBACRESSEM.RECIBO_CRM
      ${whereClause}
    `;

            const countResult = await oracleExecute(
                sqlCount,
                bindsWhere,
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            const totalItems = Number((countResult.rows?.[0] as any)?.TOTAL || 0);
            const totalPages = Math.ceil(totalItems / limit);

            const sql = `
      SELECT
        ID_RECIBO_CRM,
        NR_CPF_CNPJ,
        NM_ASSOCIADO,
        NR_MATRICULA,
        NM_EMPRESA,
        TO_CHAR(DT_DIA, 'YYYY-MM-DD') AS DT_DIA,
        CIDADE,
        TP_ATENDIMENTO,
        OBSERVACAO,
        NM_FUNCIONARIO
      FROM DBACRESSEM.RECIBO_CRM
      ${whereClause}
      ORDER BY DT_DIA DESC, ID_RECIBO_CRM DESC
      OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
    `;

            const bindsLista = {
                ...bindsWhere,
                offset,
                limit,
            };

            const result = await oracleExecute(
                sql,
                bindsLista,
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            return res.json({
                items: result.rows || [],
                total_items: totalItems,
                total_pages: totalPages,
                current_page: page,
            });
        } catch (err: any) {
            console.error("listarPaginado recibo crm erro:", err);
            return res.status(500).json({
                error: "Falha ao listar recibos.",
                details: String(err?.message || err),
            });
        }
    },

    async excluir(req: Request, res: Response) {
        try {
            const id = Number(req.params.id);

            if (!id) {
                return res.status(400).json({
                    error: "ID_RECIBO_CRM inválido.",
                });
            }

            await oracleExecute(
                `DELETE FROM DBACRESSEM.PARCELA_VALOR_CRM WHERE ID_RECIBO = :ID_RECIBO`,
                { ID_RECIBO: id },
                { autoCommit: true } as any
            );

            await oracleExecute(
                `DELETE FROM DBACRESSEM.PAGAMENTO_CRM WHERE ID_RECIBO = :ID_RECIBO`,
                { ID_RECIBO: id },
                { autoCommit: true } as any
            );

            const result = await oracleExecute(
                `DELETE FROM DBACRESSEM.RECIBO_CRM WHERE ID_RECIBO_CRM = :ID_RECIBO_CRM`,
                { ID_RECIBO_CRM: id },
                { autoCommit: true } as any
            );

            if (!result.rowsAffected) {
                return res.status(404).json({
                    error: "Recibo não encontrado.",
                });
            }

            return res.json({
                success: true,
                ID_RECIBO_CRM: id,
            });
        } catch (err: any) {
            console.error("excluir recibo crm erro:", err);
            return res.status(500).json({
                error: "Falha ao excluir recibo.",
                details: String(err?.message || err),
            });
        }
    },
};