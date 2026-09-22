import { Request, Response } from "express";
import oracledb from "oracledb";
import { oracleExecute } from "../services/oracle.service";

function toNumber(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function toUpperTrim(v: unknown) {
  return String(v || "").trim().toUpperCase();
}

function onlyDigits(v: unknown) {
  return String(v || "").replace(/\D/g, "");
}

type ContatoInput = {
  NM_RESPONSAVEL?: string;
  NR_TELEFONE?: string;
  DESC_EMAIL?: string;
};

function normalizarContatos(contatos: unknown): ContatoInput[] {
  if (!Array.isArray(contatos)) return [];

  return contatos
    .map((item) => {
      const c = (item || {}) as ContatoInput;

      return {
        NM_RESPONSAVEL: toUpperTrim(c.NM_RESPONSAVEL),
        NR_TELEFONE: onlyDigits(c.NR_TELEFONE),
        DESC_EMAIL: toUpperTrim(c.DESC_EMAIL),
      };
    })
    .filter(
      (item) =>
        String(item.NM_RESPONSAVEL || "") ||
        String(item.NR_TELEFONE || "") ||
        String(item.DESC_EMAIL || "")
    );
}

async function substituirContatosDoContrato(
  idContrato: number,
  contatos: ContatoInput[]
) {
  const sqlDelete = `
    DELETE FROM DBACRESSEM.RH_CONTRATO_CONTATO
    WHERE ID_CONTRATO = :ID_CONTRATO
  `;

  await oracleExecute(
    sqlDelete,
    { ID_CONTRATO: idContrato },
    { autoCommit: true } as any
  );

  if (!contatos.length) return;

  const sqlInsert = `
    INSERT INTO DBACRESSEM.RH_CONTRATO_CONTATO (
      NM_RESPONSAVEL,
      NR_TELEFONE,
      DESC_EMAIL,
      ID_CONTRATO
    ) VALUES (
      :NM_RESPONSAVEL,
      :NR_TELEFONE,
      :DESC_EMAIL,
      :ID_CONTRATO
    )
  `;

  for (const contato of contatos) {
    await oracleExecute(
      sqlInsert,
      {
        NM_RESPONSAVEL: contato.NM_RESPONSAVEL || null,
        NR_TELEFONE: contato.NR_TELEFONE || null,
        DESC_EMAIL: contato.DESC_EMAIL || null,
        ID_CONTRATO: idContrato,
      },
      { autoCommit: true } as any
    );
  }
}

export const rhContatoController = {
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
          ID_RH_CONTRATO_CONTATO,
          ID_CONTRATO,
          NM_RESPONSAVEL,
          NR_TELEFONE,
          DESC_EMAIL
        FROM DBACRESSEM.RH_CONTRATO_CONTATO
        WHERE ID_CONTRATO = :ID_CONTRATO
        ORDER BY ID_RH_CONTRATO_CONTATO
      `;

      const result = await oracleExecute(
        sql,
        { ID_CONTRATO: idContrato },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      return res.json(result.rows || []);
    } catch (err: any) {
      console.error("listarPorContrato rh_contato erro:", err);
      return res.status(500).json({
        error: "Falha ao listar contatos do contrato.",
        details: String(err?.message || err),
      });
    }
  },

  async criarLote(req: Request, res: Response) {
    try {
      const { ID_CONTRATO, CONTATOS } = req.body || {};
      const idContrato = toNumber(ID_CONTRATO);

      if (!idContrato) {
        return res.status(400).json({
          error: "ID_CONTRATO é obrigatório.",
        });
      }

      const contatos = normalizarContatos(CONTATOS);
      await substituirContatosDoContrato(idContrato, contatos);

      return res.status(201).json({
        success: true,
        ID_CONTRATO: idContrato,
        total: contatos.length,
      });
    } catch (err: any) {
      console.error("criarLote rh_contato erro:", err);
      return res.status(500).json({
        error: "Falha ao cadastrar contatos do contrato.",
        details: String(err?.message || err),
      });
    }
  },

  async editarLote(req: Request, res: Response) {
    try {
      const idContrato = toNumber(req.params.id);
      const { CONTATOS } = req.body || {};

      if (!idContrato) {
        return res.status(400).json({
          error: "ID_CONTRATO inválido.",
        });
      }

      const contatos = normalizarContatos(CONTATOS);
      await substituirContatosDoContrato(idContrato, contatos);

      return res.json({
        success: true,
        ID_CONTRATO: idContrato,
        total: contatos.length,
      });
    } catch (err: any) {
      console.error("editarLote rh_contato erro:", err);
      return res.status(500).json({
        error: "Falha ao atualizar contatos do contrato.",
        details: String(err?.message || err),
      });
    }
  },
};

