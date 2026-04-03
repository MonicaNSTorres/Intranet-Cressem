import { Request, Response } from "express";
import oracledb from "oracledb";
import { oracleExecute } from "../services/oracle.service";

export const cidadeController = {
  async listar(req: Request, res: Response) {
    try {
      const sql = `
        SELECT
          ID_CIDADES,
          ID_UF,
          NM_CIDADE
        FROM DBACRESSEM.CIDADES
        ORDER BY NM_CIDADE
      `;

      const result = await oracleExecute(sql, {}, {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
      });

      return res.json(result.rows || []);
    } catch (err: any) {
      console.error("cidadeController.listar erro:", err);
      return res.status(500).json({
        error: "Falha ao listar cidades.",
        details: String(err?.message || err),
      });
    }
  },
};