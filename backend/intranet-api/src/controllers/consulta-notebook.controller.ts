import { Request, Response } from "express";
import oracledb from "oracledb";
import { oracleExecute } from "../services/oracle.service";

export const consultaNotebookController = {
  async listar(req: Request, res: Response) {
    try {
      const q = String(req.query.q || "").trim();

      const sql = `
        SELECT
          NS.ID_NOTEBOOKS_SICOOB,
          NS.NM_NOTEBOOK,
          NS.NM_MODELO,
          NS.DT_INICIO_OPERACAO,
          NS.DT_GARANTIA,
          NS.NR_MAC,
          NS.CD_PATRIMONIO,
          NS.NR_IP,
          NS.NR_BITLOCKER,
          NS.OBS_NOTEBOOKS_SICOOB,
          NS.ID_FUNCIONARIO,
          NS.NM_FUNCIONARIO_TI,
          NS.DIR_TERMO_ASSINADO,
          NS.DESC_SITUACAO
        FROM DBACRESSEM.NOTEBOOKS_SICOOB NS
        WHERE (:q IS NULL OR :q = '' OR (
          UPPER(NS.NM_NOTEBOOK) LIKE '%' || UPPER(:q) || '%'
          OR UPPER(NS.NM_MODELO) LIKE '%' || UPPER(:q) || '%'
          OR UPPER(NS.NR_MAC) LIKE '%' || UPPER(:q) || '%'
          OR UPPER(NS.NR_IP) LIKE '%' || UPPER(:q) || '%'
          OR UPPER(NS.NR_BITLOCKER) LIKE '%' || UPPER(:q) || '%'
          OR UPPER(NS.NM_FUNCIONARIO_TI) LIKE '%' || UPPER(:q) || '%'
          OR UPPER(NS.DESC_SITUACAO) LIKE '%' || UPPER(:q) || '%'
          OR UPPER(NS.OBS_NOTEBOOKS_SICOOB) LIKE '%' || UPPER(:q) || '%'
          OR TO_CHAR(NS.CD_PATRIMONIO) LIKE '%' || :q || '%'
          OR TO_CHAR(NS.ID_NOTEBOOKS_SICOOB) LIKE '%' || :q || '%'
        ))
        ORDER BY NS.ID_NOTEBOOKS_SICOOB DESC
      `;

      const result = await oracleExecute(
        sql,
        { q },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      return res.json({ data: result.rows || [] });
    } catch (err: any) {
      console.error("consulta notebook listar erro:", err);
      return res.status(500).json({
        error: "Falha ao listar notebooks.",
        details: String(err?.message || err),
      });
    }
  },
};