import { Request, Response } from "express";
import oracledb from "oracledb";
import { oracleExecute } from "../services/oracle.service";

export const sisbrTiController = {
  async listar(_req: Request, res: Response) {
    try {
      const sql = `
        SELECT
          NR_PA_SISBR AS FW,
          NM_LOCAL AS LOCAL,
          NR_IP_GERENCIA AS IP,
          NM_PROVEDOR_INTERNET AS PROVEDOR,
          NR_ANTIGO_PA AS ANTIGO_PA,
          NR_CNPJ AS CNPJ
        FROM DBACRESSEM.INFOS_PA
        ORDER BY NR_PA_SISBR
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