import { Request, Response } from "express";
import oracledb from "oracledb";
import { oracleExecute } from "../services/oracle.service";

function somenteNumeros(valor: string) {
  return String(valor || "").replace(/\D/g, "");
}

export const demissaoController = {

  async buscarAssociado(req: Request, res: Response) {

    try {

      const cpf = somenteNumeros(String(req.params.cpf || ""));

      if (!cpf) {
        return res.status(400).json({
          error: "CPF não informado",
        });
      }

      const sql = `
        SELECT
          a.NM_CLIENTE AS NOME,
          a.NR_MATRICULA AS MATRICULA,
          a.NM_EMPRESA AS EMPRESA
        FROM DBACRESSEM.ASSOCIADO_ANALITICO a
        WHERE REGEXP_REPLACE(a.NR_CPF_CNPJ,'[^0-9]','') = :cpf
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
          error: "Associado não encontrado",
        });
      }

      return res.json(row);

    } catch (error: any) {

      console.error("Erro ao buscar associado demissão:", error);

      return res.status(500).json({
        error: "Erro ao buscar associado",
        details: error.message,
      });
    }
  }
};