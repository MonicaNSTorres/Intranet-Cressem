import { Request, Response } from "express";
import oracledb from "oracledb";
import { oracleExecute } from "../services/oracle.service";

export const funcionariosNotebookController = {
  async listar(req: Request, res: Response) {
    try {
      const q = String(req.query.q || "").trim();

      const sql = `
        SELECT
          FS.ID_FUNCIONARIO,
          FS.NM_FUNCIONARIO
        FROM DBACRESSEM.FUNCIONARIOS_SICOOB_CRESSEM FS
        WHERE (:q IS NULL OR :q = '' OR (
          UPPER(FS.NM_FUNCIONARIO) LIKE '%' || UPPER(:q) || '%'
        ))
        ORDER BY FS.NM_FUNCIONARIO
        FETCH FIRST 15 ROWS ONLY
      `;

      const result = await oracleExecute(
        sql,
        { q },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      return res.json({ data: result.rows || [] });
    } catch (err: any) {
      console.error("funcionarios notebook listar erro:", err);
      return res.status(500).json({
        error: "Falha ao buscar funcionários.",
        details: String(err?.message || err),
      });
    }
  },
};