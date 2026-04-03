import { Request, Response } from "express";
import oracledb from "oracledb";
import { oracleExecute } from "../services/oracle.service";

export const cidadesCressemController = {
    async buscarCidades(_req: Request, res: Response) {
        try {
            const sql = `
        SELECT
          C.NM_CIDADE
        FROM DBACRESSEM.CIDADES C
        ORDER BY C.NM_CIDADE
      `;

            const result = await oracleExecute(
                sql,
                {},
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            const rows = (result.rows || []) as Array<{ NM_CIDADE?: string }>;

            const data = rows.map((r) => ({
                NM_CIDADE: r.NM_CIDADE || "",
            }));

            return res.json({ data });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            console.error("buscarCidades erro:", err);
            return res.status(500).json({
                error: "Falha ao consultar cidades.",
                details: message,
            });
        }
    },
};
