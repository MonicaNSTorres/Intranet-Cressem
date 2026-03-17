import { Request, Response } from "express";
import oracledb from "oracledb";
import { oracleExecute } from "../services/oracle.service";

export const ramaisController = {
  async listar(req: Request, res: Response) {
    try {
      const q = String(req.query.q || "").trim();

      const sql = `
        SELECT
          FS.ID_FUNCIONARIO AS ID,
          FS.NR_RAMAL AS RAMAL,
          FS.NM_FUNCIONARIO AS NOME,
          SSC.NM_SETOR AS DEPARTAMENTO,
          FS.EMAIL AS EMAIL,
          FS.NM_LOGIN AS LOGIN
        FROM DBACRESSEM.FUNCIONARIOS_SICOOB_CRESSEM FS
        INNER JOIN DBACRESSEM.SETOR_SICOOB_CRESSEM SSC
          ON SSC.ID_SETOR = FS.ID_SETOR
        WHERE (:q IS NULL OR :q = '' OR (
          UPPER(FS.NM_FUNCIONARIO) LIKE '%' || UPPER(:q) || '%'
          OR UPPER(SSC.NM_SETOR) LIKE '%' || UPPER(:q) || '%'
          OR UPPER(FS.EMAIL) LIKE '%' || UPPER(:q) || '%'
          OR UPPER(FS.NM_LOGIN) LIKE '%' || UPPER(:q) || '%'
          OR TO_CHAR(FS.NR_RAMAL) LIKE '%' || :q || '%'
        ))
        ORDER BY SSC.NM_SETOR, FS.NM_FUNCIONARIO
      `;

      const result = await oracleExecute(
        sql,
        { q },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      return res.json({ data: result.rows || [] });
    } catch (err: any) {
      console.error("ramais listar erro:", err);
      return res.status(500).json({
        error: "Falha ao listar ramais.",
        details: String(err?.message || err),
      });
    }
  },
};