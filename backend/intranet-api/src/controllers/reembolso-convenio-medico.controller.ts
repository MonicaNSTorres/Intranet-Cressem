import { Request, Response } from "express";
import oracledb from "oracledb";
import { oracleExecute } from "../services/oracle.service";

export const reembolsoConvenioMedicoController = {
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
          f.NR_MATRICULA,
          s.NM_SETOR,
          c.NM_CARGO
        FROM DBACRESSEM.FUNCIONARIOS_SICOOB_CRESSEM f
        LEFT JOIN DBACRESSEM.SETOR_SICOOB_CRESSEM s
          ON f.ID_SETOR = s.ID_SETOR
        LEFT JOIN DBACRESSEM.CARGO_GERENTES_SICOOB_CRESSEM c
          ON f.ID_CARGO = c.ID_CARGO
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
        NR_MATRICULA: row.NR_MATRICULA || "",
        SETOR: {
          NM_SETOR: row.NM_SETOR || "",
        },
        CARGO: {
          NM_CARGO: row.NM_CARGO || "",
        },
      });
    } catch (error: any) {
      console.error("Erro ao buscar funcionário por nome:", error);

      return res.status(500).json({
        error: "Erro ao buscar funcionário por nome",
        details: error.message,
      });
    }
  },

  async listarDiretoria(_req: Request, res: Response) {
    try {
      const sql = `
        SELECT
          f.NM_FUNCIONARIO
        FROM DBACRESSEM.FUNCIONARIOS_SICOOB_CRESSEM f
        LEFT JOIN DBACRESSEM.CARGO_GERENTES_SICOOB_CRESSEM c
          ON f.ID_CARGO = c.ID_CARGO
        WHERE UPPER(c.NM_CARGO) LIKE '%DIRETOR%'
        ORDER BY f.NM_FUNCIONARIO
      `;

      const result = await oracleExecute(
        sql,
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      return res.json(result.rows || []);
    } catch (error: any) {
      console.error("Erro ao listar diretoria:", error);

      return res.status(500).json({
        error: "Erro ao listar diretoria",
        details: error.message,
      });
    }
  },

  async buscarDiretorPorNome(req: Request, res: Response) {
    try {
      const nome = decodeURIComponent(String(req.params.nome || "")).trim();

      if (!nome) {
        return res.status(400).json({
          error: "Nome do diretor não informado.",
        });
      }

      const sql = `
        SELECT
          f.NM_FUNCIONARIO,
          c.NM_CARGO
        FROM DBACRESSEM.FUNCIONARIOS_SICOOB_CRESSEM f
        LEFT JOIN DBACRESSEM.CARGO_GERENTES_SICOOB_CRESSEM c
          ON f.ID_CARGO = c.ID_CARGO
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
          error: "Diretor não encontrado.",
        });
      }

      return res.json({
        NM_FUNCIONARIO: row.NM_FUNCIONARIO || "",
        CARGO: {
          NM_CARGO: row.NM_CARGO || "",
        },
      });
    } catch (error: any) {
      console.error("Erro ao buscar diretor por nome:", error);

      return res.status(500).json({
        error: "Erro ao buscar diretor por nome",
        details: error.message,
      });
    }
  },
};