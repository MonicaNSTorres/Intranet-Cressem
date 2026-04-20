import { Request, Response } from "express";
import oracledb from "oracledb";
import { oracleExecute } from "../services/oracle.service";

export const tipoDespesaController = {
  async listar(req: Request, res: Response) {
    try {
      const sql = `
        SELECT NM_TIPO_DESPESA
        FROM DBACRESSEM.TIPO_DESPESA
        ORDER BY NM_TIPO_DESPESA
      `;

      const result = await oracleExecute(
        sql,
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      return res.json(result.rows || []);
    } catch (err: any) {
      console.error("listar tipo_despesa erro:", err);
      return res.status(500).json({
        error: "Falha ao listar tipos de despesa.",
        details: String(err?.message || err),
      });
    }
  },
};