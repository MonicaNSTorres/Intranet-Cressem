import { Request, Response } from "express";
import oracledb from "oracledb";
import { oracleExecute } from "../services/oracle.service";

export const sisbrTiController = {
  async listar(_req: Request, res: Response) {
    try {
      const sql = `
        SELECT
          NR_PA AS FW,
          NR_FW AS LOCAL,
          NR_SISBR AS SISBR,
          NR_SISBR AS IP,
          NR_IP AS PROVEDOR,
          CASE
            WHEN NM_PROVEDOR = 'S' THEN 'SIM'
            WHEN NM_PROVEDOR = 'N' THEN 'NÃO'
          END AS LINK_SISBR
        FROM DBACRESSEM.INFOS_PA
        ORDER BY NR_PA
      `;

      const result = await oracleExecute(
        sql,
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      return res.json(result.rows || []);
    } catch (error) {
      console.error("Erro ao listar tabela SISBR TI:", error);
      return res.status(500).json({
        error: "Erro ao buscar dados da tabela SISBR TI.",
      });
    }
  },
};