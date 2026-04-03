import { Request, Response } from "express";
import oracledb from "oracledb";
import { oracleExecute } from "../services/oracle.service";

export const autorizacaoResgateController = {
    async buscarAutorizacao(_req: Request, res: Response) {
        try {
            const sql = `
        SELECT
          M.NM_AUTORIZADO
        FROM DBACRESSEM.AUTORIZACAO_RESGATE M
        ORDER BY M.NM_AUTORIZADO
      `;

            const result = await oracleExecute(
                sql,
                {},
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            const rows = (result.rows || []) as Array<{ NM_AUTORIZADO?: string }>;

            const data = rows.map((r) => ({
                NM_AUTORIZADO: r.NM_AUTORIZADO || "",
            }));

            return res.json({ data });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            console.error("autorizacaoResgate erro:", err);
            return res.status(500).json({
                error: "Falha ao consultar autorização de resgate.",
                details: message,
            });
        }
    },
};
