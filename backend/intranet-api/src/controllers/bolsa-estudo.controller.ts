import { Request, Response } from "express";
import oracledb from "oracledb";
import { oracleExecute } from "../services/oracle.service";

function somenteTexto(valor: any): string {
  return String(valor || "").trim();
}

export const bolsaEstudoController = {
  async buscarFuncionarioPorNome(req: Request, res: Response) {
    try {
      const nome = decodeURIComponent(String(req.params.nome || "")).trim();

      if (!nome) {
        return res.status(400).json({
          error: "Nome do funcionário não informado.",
        });
      }

      const sql = `
        SELECT
          f.NM_FUNCIONARIO,
          TO_CHAR(f.DT_ADMISSAO, 'YYYY-MM-DD') AS DT_ADMISSAO,
          f.CD_GERENCIA
        FROM DBACRESSEM.FUNCIONARIOS_SICOOB_CRESSEM f
        WHERE UPPER(TRIM(f.NM_FUNCIONARIO)) = UPPER(TRIM(:nome))
        FETCH FIRST 1 ROWS ONLY
      `;

      const result = await oracleExecute(
        sql,
        { nome },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const row: any = result.rows?.[0];

      if (!row) {
        return res.status(404).json({
          error: "Funcionário não encontrado.",
        });
      }

      return res.json({
        NM_FUNCIONARIO: row.NM_FUNCIONARIO || "",
        DT_ADMISSAO: row.DT_ADMISSAO || "",
        CD_GERENCIA: row.CD_GERENCIA || "",
      });
    } catch (error: any) {
      console.error("Erro ao buscar funcionário por nome:", error);

      return res.status(500).json({
        error: "Erro ao buscar funcionário por nome",
        details: error.message,
      });
    }
  },

  async buscarGerenciaPorCodigo(req: Request, res: Response) {
    try {
      const codigo = String(req.params.codigo || "").trim();

      if (!codigo) {
        return res.status(400).json({
          error: "Código da gerência não informado.",
        });
      }

      const sql = `
      SELECT
        f.NM_FUNCIONARIO,
        f.CD_GERENCIA,
        f.ID_FUNCIONARIO
      FROM DBACRESSEM.FUNCIONARIOS_SICOOB_CRESSEM f
      WHERE TRIM(TO_CHAR(f.ID_FUNCIONARIO)) = TRIM(:codigo)
      FETCH FIRST 1 ROWS ONLY
    `;

      const result = await oracleExecute(
        sql,
        { codigo },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const row: any = result.rows?.[0];

      if (!row) {
        return res.status(404).json({
          error: "Gestor não encontrado.",
        });
      }

      return res.json({
        NM_FUNCIONARIO: row.NM_FUNCIONARIO || "",
        CD_GERENCIA: row.CD_GERENCIA || "",
        ID_FUNCIONARIO: row.ID_FUNCIONARIO || "",
      });
    } catch (error: any) {
      console.error("Erro ao buscar gerência por código:", error);

      return res.status(500).json({
        error: "Erro ao buscar gerência por código",
        details: error.message,
      });
    }
  },

  async listarCidades(_req: Request, res: Response) {
    try {
      const sql = `
        SELECT DISTINCT
          TRIM(a.NM_CIDADE) AS NM_CIDADE
        FROM DBACRESSEM.ASSOCIADO_ANALITICO a
        WHERE a.NM_CIDADE IS NOT NULL
          AND TRIM(a.NM_CIDADE) IS NOT NULL
        ORDER BY TRIM(a.NM_CIDADE)
      `;

      const result = await oracleExecute(
        sql,
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const cidades =
        result.rows?.map((row: any) => ({
          nome: somenteTexto(row.NM_CIDADE),
        })) || [];

      return res.json(cidades);
    } catch (error: any) {
      console.error("Erro ao listar cidades:", error);

      return res.status(500).json({
        error: "Erro ao listar cidades",
        details: error.message,
      });
    }
  },
};