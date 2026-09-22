import { Request, Response } from "express";
import oracledb from "oracledb";
import { oracleExecute } from "../services/oracle.service";

function toNumber(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export const emailContratoController = {
  async criar(req: Request, res: Response) {
    try {
      const { ID_FUNCIONARIO, ID_CONTRATO } = req.body || {};

      if (!ID_FUNCIONARIO) {
        return res.status(400).json({
          error: "ID_FUNCIONARIO é obrigatório.",
        });
      }

      if (!ID_CONTRATO) {
        return res.status(400).json({
          error: "ID_CONTRATO é obrigatório.",
        });
      }

      const sql = `
        INSERT INTO DBACRESSEM.EMAIL_CONTRATO (
          ID_FUNCIONARIO,
          ID_CONTRATO
        ) VALUES (
          :ID_FUNCIONARIO,
          :ID_CONTRATO
        )
        RETURNING ID_EMAIL_CONTRATO INTO :ID_EMAIL_CONTRATO
      `;

      const binds = {
        ID_FUNCIONARIO: toNumber(ID_FUNCIONARIO),
        ID_CONTRATO: toNumber(ID_CONTRATO),
        ID_EMAIL_CONTRATO: {
          dir: oracledb.BIND_OUT,
          type: oracledb.NUMBER,
        },
      };

      const result = await oracleExecute(sql, binds, {
        autoCommit: true,
      } as any);

      const idContratoEmail =
        (result.outBinds as any)?.ID_EMAIL_CONTRATO?.[0] ||
        (result.outBinds as any)?.ID_EMAIL_CONTRATO;

      return res.status(201).json({
        success: true,
        ID_EMAIL_CONTRATO: idContratoEmail,
      });
    } catch (err: any) {
      console.error("criar email contrato erro:", err);
      return res.status(500).json({
        error: "Falha ao criar vínculo de e-mail do contrato.",
        details: String(err?.message || err),
      });
    }
  },

  async listarPorContrato(req: Request, res: Response) {
    try {
      const idContrato = toNumber(req.params.id);

      if (!idContrato) {
        return res.status(400).json({
          error: "ID_CONTRATO inválido.",
        });
      }

      const sql = `
        SELECT
          ec.ID_EMAIL_CONTRATO,
          ec.ID_CONTRATO,
          ec.ID_FUNCIONARIO,
          f.ID_FUNCIONARIO AS FUNCIONARIO_ID_FUNCIONARIO,
          f.NM_FUNCIONARIO AS FUNCIONARIO_NM_FUNCIONARIO,
          f.EMAIL AS FUNCIONARIO_EMAIL
        FROM DBACRESSEM.EMAIL_CONTRATO ec
        LEFT JOIN DBACRESSEM.FUNCIONARIOS_SICOOB_CRESSEM f
          ON f.ID_FUNCIONARIO = ec.ID_FUNCIONARIO
        WHERE ec.ID_CONTRATO = :ID_CONTRATO
        ORDER BY ec.ID_EMAIL_CONTRATO DESC
      `;

      const result = await oracleExecute(
        sql,
        { ID_CONTRATO: idContrato },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const items = (result.rows || []).map((row: any) => ({
        ID_EMAIL_CONTRATO: row.ID_EMAIL_CONTRATO,
        ID_CONTRATO: row.ID_CONTRATO,
        ID_FUNCIONARIO: row.ID_FUNCIONARIO,
        FUNCIONARIO: {
          ID_FUNCIONARIO: row.FUNCIONARIO_ID_FUNCIONARIO,
          NM_FUNCIONARIO: row.FUNCIONARIO_NM_FUNCIONARIO,
          EMAIL: row.FUNCIONARIO_EMAIL,
        },
      }));

      return res.json(items);
    } catch (err: any) {
      console.error("listarPorContrato email contrato erro:", err);
      return res.status(500).json({
        error: "Falha ao listar e-mails do contrato.",
        details: String(err?.message || err),
      });
    }
  },

  async listarPorFuncionario(req: Request, res: Response) {
    try {
      const idFuncionario = toNumber(req.params.id);

      if (!idFuncionario) {
        return res.status(400).json({
          error: "ID_FUNCIONARIO inválido.",
        });
      }

      const sql = `
        SELECT
          ID_EMAIL_CONTRATO,
          ID_CONTRATO,
          ID_FUNCIONARIO
        FROM DBACRESSEM.EMAIL_CONTRATO
        WHERE ID_FUNCIONARIO = :ID_FUNCIONARIO
        ORDER BY ID_EMAIL_CONTRATO DESC
      `;

      const result = await oracleExecute(
        sql,
        { ID_FUNCIONARIO: idFuncionario },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      if (!result.rows?.length) {
        return res.status(404).json({
          error: "Vínculo de e-mail não encontrado para este funcionário.",
        });
      }

      return res.json(result.rows[0]);
    } catch (err: any) {
      console.error("listarPorFuncionario email contrato erro:", err);
      return res.status(500).json({
        error: "Falha ao buscar vínculo de e-mail por funcionário.",
        details: String(err?.message || err),
      });
    }
  },

  async remover(req: Request, res: Response) {
    try {
      const idContratoEmail = toNumber(req.params.id);

      if (!idContratoEmail) {
        return res.status(400).json({
          error: "ID_EMAIL_CONTRATO inválido.",
        });
      }

      const sql = `
        DELETE FROM DBACRESSEM.EMAIL_CONTRATO
        WHERE ID_EMAIL_CONTRATO = :ID_EMAIL_CONTRATO
      `;

      const result = await oracleExecute(
        sql,
        { ID_EMAIL_CONTRATO: idContratoEmail },
        { autoCommit: true } as any
      );

      if (!result.rowsAffected) {
        return res.status(404).json({
          error: "Vínculo de e-mail não encontrado.",
        });
      }

      return res.json({
        success: true,
        ID_EMAIL_CONTRATO: idContratoEmail,
      });
    } catch (err: any) {
      console.error("remover email contrato erro:", err);
      return res.status(500).json({
        error: "Falha ao remover vínculo de e-mail do contrato.",
        details: String(err?.message || err),
      });
    }
  },
};