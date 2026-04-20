import { Request, Response } from "express";
import oracledb from "oracledb";
import { oracleExecute } from "../services/oracle.service";

export const kpiController = {
    async resumo(_req: Request, res: Response) {
        try {
            const sql = `
        SELECT
          (SELECT COUNT(*) FROM DBACRESSEM.ASSOCIADO_ANALITICO) AS TOTAL_COOPERADOS,
          (SELECT COUNT(DISTINCT NM_FUNCIONARIO) FROM DBACRESSEM.FUNCIONARIOS_SICOOB_CRESSEM) AS TOTAL_FUNCIONARIOS,
          (SELECT COUNT(DISTINCT NR_PA) FROM DBACRESSEM.PA) AS TOTAL_PAS,
          (SELECT COUNT(DISTINCT NR_RAMAL) FROM DBACRESSEM.SETOR_SICOOB_CRESSEM) AS TOTAL_RAMAL
        FROM DUAL
      `;

            const result = await oracleExecute(sql, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });

            const row: any = result.rows?.[0] || {};

            return res.json({
                totalCooperados: Number(row.TOTAL_COOPERADOS || 0),
                totalFuncionarios: Number(row.TOTAL_FUNCIONARIOS || 0),
                totalPAs: Number(row.TOTAL_PAS || 0),
                totalRamal: Number(row.TOTAL_RAMAL || 0),
            });
        } catch (err: any) {
            console.error("kpi resumo erro:", err);
            return res.status(500).json({
                error: "Falha ao consultar KPIs.",
                details: String(err?.message || err),
            });
        }
    },

    async aniversariantesHoje(_req: Request, res: Response) {
        try {
            const sql = `
        SELECT
          FS.NM_FUNCIONARIO AS NOME, 
          SC.NM_SETOR       AS SETOR,
          FS.NR_RAMAL       AS RAMAL
        FROM DBACRESSEM.FUNCIONARIOS_SICOOB_CRESSEM FS
        INNER JOIN DBACRESSEM.SETOR_SICOOB_CRESSEM SC
          ON FS.ID_SETOR = SC.ID_SETOR
        WHERE TO_CHAR(FS.DT_NASCIMENTO,'DDMM') = TO_CHAR(SYSDATE,'DDMM')
        AND FS.DT_DESLIGAMENTO IS NULL
        ORDER BY FS.NM_FUNCIONARIO
      `;

            const result = await oracleExecute(sql, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });

            return res.json({
                total: result.rows?.length || 0,
                data: result.rows || [],
            });
        } catch (err: any) {
            console.error("aniversariantesHoje erro:", err);

            return res.status(500).json({
                error: "Falha ao consultar aniversariantes.",
                details: String(err?.message || err),
            });
        }
    },

    // caso eu queira usar o que tinha antes
    async totalCooperados(_req: Request, res: Response) {
        try {
            const sql = `SELECT COUNT(*) AS TOTAL FROM DBACRESSEM.ASSOCIADO_ANALITICO`;
            const result = await oracleExecute(sql, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });

            const row: any = result.rows?.[0] || {};
            return res.json({ total: Number(row.TOTAL || 0) });
        } catch (err: any) {
            console.error("totalCooperados erro:", err);
            return res.status(500).json({
                error: "Falha ao consultar total de cooperados.",
                details: String(err?.message || err),
            });
        }
    },

    async aniversariantesPorMes(req: Request, res: Response) {
        try {
            const mesIn = Number(req.query.mes);

            if (!Number.isFinite(mesIn) || mesIn < 1 || mesIn > 12) {
                return res.status(400).json({ error: "Parâmetro 'mes' inválido. Use 1 a 12." });
            }

            const sql = `
      SELECT
        FS.NM_FUNCIONARIO AS NOME,
        SC.NM_SETOR       AS SETOR,
        FS.NR_RAMAL       AS RAMAL,
        TO_NUMBER(TO_CHAR(FS.DT_NASCIMENTO, 'DD')) AS DIA
      FROM DBACRESSEM.FUNCIONARIOS_SICOOB_CRESSEM FS
      INNER JOIN DBACRESSEM.SETOR_SICOOB_CRESSEM SC
        ON FS.ID_SETOR = SC.ID_SETOR
      WHERE TO_NUMBER(TO_CHAR(FS.DT_NASCIMENTO, 'MM')) = :mes
        AND FS.DT_DESLIGAMENTO IS NULL
      ORDER BY DIA, NOME
    `;

            const result = await oracleExecute(
                sql,
                { mes: mesIn },
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            return res.json({
                total: result.rows?.length || 0,
                data: result.rows || [],
            });
        } catch (err: any) {
            console.error("Erro aniversariantesPorMes:", err);
            return res.status(500).json({
                error: "Erro ao buscar aniversariantes por mês.",
                details: String(err?.message || err),
            });
        }
    },
};