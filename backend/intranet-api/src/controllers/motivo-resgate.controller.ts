import { Request, Response } from "express";
import oracledb from "oracledb";
import { oracleExecute } from "../services/oracle.service";

export const motivoResgateController = {
    async buscarMotivos(_req: Request, res: Response) {
        try {
            const sql = `
        SELECT
          M.NM_MOTIVO
        FROM DBACRESSEM.MOTIVO_RESGATE M
        ORDER BY M.NM_MOTIVO
      `;

            const result = await oracleExecute(
                sql,
                {},
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            const rows = (result.rows || []) as Array<{ NM_MOTIVO?: string }>;

            const data = rows.map((r) => ({
                NM_MOTIVO: r.NM_MOTIVO || "",
            }));

            return res.json({ data });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            console.error("motivoResgate erro:", err);
            return res.status(500).json({
                error: "Falha ao consultar motivo de resgate.",
                details: message,
            });
        }
    },
};
