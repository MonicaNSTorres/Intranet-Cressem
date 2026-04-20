import { Request, Response } from "express";
import oracledb from "oracledb";
import { oracleExecute } from "../services/oracle.service";

function toTrim(v: any) {
  return String(v || "").trim();
}

function toUpperTrim(v: any) {
  return String(v || "").trim().toUpperCase();
}

export const funcionariosSimplesController = {
  async listarEmails(req: Request, res: Response) {
    try {
      const sql = `
        SELECT DISTINCT
        F.ID_FUNCIONARIO,
        TRIM(F.EMAIL) AS EMAIL
        FROM DBACRESSEM.FUNCIONARIOS_SICOOB_CRESSEM F
        WHERE F.EMAIL IS NOT NULL
      `;

      const result = await oracleExecute(sql, {}, {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
      });

      return res.json(result.rows || []);
    } catch (err: any) {
      console.error("listarEmails funcionarios erro:", err);
      return res.status(500).json({
        error: "Falha ao listar e-mails dos funcionários.",
        details: String(err?.message || err),
      });
    }
  },

  async buscarPorEmail(req: Request, res: Response) {
    try {
      const email = toTrim(req.params.email);

      if (!email) {
        return res.status(400).json({
          error: "E-mail é obrigatório.",
        });
      }

      const sql = `
        SELECT
          F.ID_FUNCIONARIO,
          F.NM_FUNCIONARIO,
          TRIM(F.EMAIL) AS EMAIL
        FROM DBACRESSEM.FUNCIONARIOS_SICOOB_CRESSEM F
        WHERE UPPER(TRIM(F.EMAIL)) = :EMAIL
      `;

      const result = await oracleExecute(
        sql,
        { EMAIL: toUpperTrim(email) },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      if (!result.rows?.length) {
        return res.status(404).json({
          error: "Funcionário não encontrado para o e-mail informado.",
        });
      }

      return res.json(result.rows[0]);
    } catch (err: any) {
      console.error("buscarPorEmail funcionarios erro:", err);
      return res.status(500).json({
        error: "Falha ao buscar funcionário por e-mail.",
        details: String(err?.message || err),
      });
    }
  },
};