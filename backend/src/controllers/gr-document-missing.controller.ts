import { Request, Response } from "express";
import oracledb from "oracledb";
import { oracleExecute } from "../services/oracle.service";

function formatDateForOracle(dateStr: string) {
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}

export const grDocumentMissingController = {
  async listar(req: Request, res: Response) {
    try {
      const fromParam = String(req.query.from_date || "");
      const toParam = String(req.query.to_date || "");
      const statusParam = String(req.query.status || "");
      const responsavelParam = String(req.query.responsavel || "");

      const binds: Record<string, any> = {};

      let sql = `
        SELECT
          envelope_id,
          status,
          email_subject,
          responsavel_email,
          responsavel_nome,
          documento,
          created_at,
          completed_at
        FROM DBACRESSEM.DOCUSIGN_ENVELOPES_RESOLVIDO
        WHERE 1=1
      `;

      if (fromParam && fromParam.trim() !== "") {
        sql += ` AND created_at >= TO_DATE(:from_date, 'DD/MM/YYYY')`;
        binds.from_date = {
          val: formatDateForOracle(fromParam),
          type: oracledb.STRING,
        };
      }

      if (toParam && toParam.trim() !== "") {
        sql += ` AND created_at < TO_DATE(:to_date, 'DD/MM/YYYY') + 1`;
        binds.to_date = {
          val: formatDateForOracle(toParam),
          type: oracledb.STRING,
        };
      }

      console.log("DATA INICIAL:", fromParam);
      console.log("DATA FINAL:", toParam);

      if (statusParam && statusParam.trim() !== "") {
        sql += ` AND LOWER(status) LIKE '%' || LOWER(:status) || '%'`;
        binds.status = {
          val: statusParam,
          type: oracledb.STRING,
        };
      }

      if (responsavelParam && responsavelParam.trim() !== "") {
        sql += ` AND LOWER(responsavel_nome) LIKE '%' || LOWER(:responsavel) || '%'`;
        binds.responsavel = {
          val: responsavelParam,
          type: oracledb.STRING,
        };
      }

      sql += ` ORDER BY created_at DESC`;

      console.log("SQL:", sql);
      console.log("BINDS:", binds);

      const result = await oracleExecute(sql, binds, {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
      });

      return res.json({
        rows: result.rows || [],
      });
    } catch (error: any) {
      console.error("Erro ao consultar o banco:", error);
      return res.status(500).json({
        error: "Erro ao consultar banco",
        details: error.message,
      });
    }
  },
};