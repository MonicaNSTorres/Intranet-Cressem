import { Request, Response } from "express";
import oracledb from "oracledb";
import { oracleExecute } from "../services/oracle.service";

function somenteNumeros(valor: string) {
  return String(valor || "").replace(/\D/g, "");
}

export const antecipacaoCapitalController = {
  async buscarAssociado(req: Request, res: Response) {
    try {
      const cpf = somenteNumeros(String(req.params.cpf || ""));

      if (!cpf) {
        return res.status(400).json({
          error: "CPF não informado.",
        });
      }

      if (cpf.length !== 11) {
        return res.status(400).json({
          error: "CPF inválido. Informe os 11 dígitos.",
        });
      }

      const sql = `
        SELECT
          a.NM_CLIENTE,
          a.NR_MATRICULA,
          a.NM_EMPRESA,
          a.NR_CPF_CNPJ
        FROM DBACRESSEM.ASSOCIADO_ANALITICO a
        WHERE REGEXP_REPLACE(a.NR_CPF_CNPJ, '[^0-9]', '') = :cpf
        FETCH FIRST 1 ROWS ONLY
      `;

      const result = await oracleExecute(
        sql,
        { cpf },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const row: any = result.rows?.[0];

      if (!row) {
        return res.status(404).json({
          error: "Associado não encontrado.",
        });
      }

      return res.json({
        NOME: row.NM_CLIENTE || "",
        MATRICULA: row.NR_MATRICULA || "",
        EMPRESA: row.NM_EMPRESA || "",
        CPF: row.NR_CPF_CNPJ || cpf,
      });
    } catch (error: any) {
      console.error("Erro ao buscar associado da antecipação de capital:", error);

      return res.status(500).json({
        error: "Erro ao buscar associado da antecipação de capital",
        details: error.message,
      });
    }
  },

  async listarCidades(_req: Request, res: Response) {
    try {
      const sql = `
        SELECT DISTINCT
          c.NM_CIDADE
        FROM DBACRESSEM.CIDADES c
        WHERE c.NM_CIDADE IS NOT NULL
        ORDER BY c.NM_CIDADE
      `;

      const result = await oracleExecute(
        sql,
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const cidades = (result.rows || []).map((row: any) => ({
        value: row.NM_CIDADE,
        label: row.NM_CIDADE,
      }));

      return res.json(cidades);
    } catch (error: any) {
      console.error("Erro ao listar cidades da antecipação de capital:", error);

      return res.status(500).json({
        error: "Erro ao listar cidades da antecipação de capital",
        details: error.message,
      });
    }
  },
};