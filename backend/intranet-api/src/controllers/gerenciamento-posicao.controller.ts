import { Request, Response } from "express";
import oracledb from "oracledb";
import { oracleExecute } from "../services/oracle.service";

function capitalizeWords(value: string) {
  return String(value || "")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function escapeCsv(value: any) {
  const text = String(value ?? "");
  if (text.includes(";") || text.includes('"') || text.includes("\n")) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export const gerenciamentoPosicaoController = {
  async listar(req: Request, res: Response) {
    try {
      const sql = `
        SELECT
          ID_POSICAO,
          CD_SICOOB,
          DESC_ATUACAO,
          NM_POSICAO,
          DESC_POSICAO,
          SN_ATIVO
        FROM DBACRESSEM.POSICAO_COOPERATIVA_SICOOB
        ORDER BY CD_SICOOB
      `;

      const result = await oracleExecute(
        sql,
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      return res.json(result.rows || []);
    } catch (err: any) {
      console.error("listar posicoes erro:", err);
      return res.status(500).json({
        error: "Falha ao listar posições.",
        details: String(err?.message || err),
      });
    }
  },

  async listarPaginado(req: Request, res: Response) {
    try {
      const nome = String(req.query.nome || "").trim();
      const page = Math.max(Number(req.query.page || 1), 1);
      const limit = Math.max(Number(req.query.limit || 10), 1);
      const offset = (page - 1) * limit;

      const filtro = `%${nome.toUpperCase()}%`;

      const bindsCount = {
        nome: filtro,
      };

      const bindsLista = {
        nome: filtro,
        offset,
        limit,
      };

      const sqlCount = `
        SELECT COUNT(*) AS TOTAL
        FROM DBACRESSEM.POSICAO_COOPERATIVA_SICOOB p
        WHERE (
          :nome = '%%'
          OR UPPER(p.CD_SICOOB) LIKE :nome
          OR UPPER(p.DESC_ATUACAO) LIKE :nome
          OR UPPER(p.NM_POSICAO) LIKE :nome
        )
      `;

      const countResult = await oracleExecute(
        sqlCount,
        bindsCount,
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const total = Number((countResult.rows?.[0] as any)?.TOTAL || 0);
      const total_pages = total > 0 ? Math.ceil(total / limit) : 1;

      const sql = `
        SELECT *
        FROM (
          SELECT
            p.ID_POSICAO,
            p.CD_SICOOB,
            p.DESC_ATUACAO,
            p.NM_POSICAO,
            p.DESC_POSICAO,
            p.SN_ATIVO,
            ROW_NUMBER() OVER (ORDER BY p.CD_SICOOB) AS RN
          FROM DBACRESSEM.POSICAO_COOPERATIVA_SICOOB p
          WHERE (
            :nome = '%%'
            OR UPPER(p.CD_SICOOB) LIKE :nome
            OR UPPER(p.DESC_ATUACAO) LIKE :nome
            OR UPPER(p.NM_POSICAO) LIKE :nome
          )
        )
        WHERE RN > :offset
          AND RN <= (:offset + :limit)
        ORDER BY RN
      `;

      const result = await oracleExecute(
        sql,
        bindsLista,
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      return res.json({
        items: result.rows || [],
        total,
        total_pages,
        current_page: page,
        page,
        limit,
      });
    } catch (err: any) {
      console.error("listarPaginado posicoes erro:", err);
      return res.status(500).json({
        error: "Falha ao listar posições paginadas.",
        details: String(err?.message || err),
      });
    }
  },

  async cadastrar(req: Request, res: Response) {
    try {
      const CD_SICOOB = String(req.body.CD_SICOOB || "").trim().toUpperCase();
      const DESC_ATUACAO = String(req.body.DESC_ATUACAO || "").trim().toUpperCase();
      const NM_POSICAO = String(req.body.NM_POSICAO || "").trim().toUpperCase();
      const DESC_POSICAO = String(req.body.DESC_POSICAO || "").trim().toUpperCase();

      if (!CD_SICOOB) {
        return res.status(400).json({
          error: "Preencha o código.",
        });
      }

      if (!DESC_ATUACAO) {
        return res.status(400).json({
          error: "Preencha a atuação.",
        });
      }

      if (!NM_POSICAO) {
        return res.status(400).json({
          error: "Preencha a posição.",
        });
      }

      if (!DESC_POSICAO) {
        return res.status(400).json({
          error: "Preencha a descrição.",
        });
      }

      const sql = `
        INSERT INTO DBACRESSEM.POSICAO_COOPERATIVA_SICOOB (
          CD_SICOOB,
          DESC_ATUACAO,
          NM_POSICAO,
          DESC_POSICAO,
          SN_ATIVO
        ) VALUES (
          :CD_SICOOB,
          :DESC_ATUACAO,
          :NM_POSICAO,
          :DESC_POSICAO,
          1
        )
        RETURNING ID_POSICAO INTO :ID_POSICAO
      `;

      const result = await oracleExecute(
        sql,
        {
          CD_SICOOB,
          DESC_ATUACAO,
          NM_POSICAO,
          DESC_POSICAO,
          ID_POSICAO: {
            dir: oracledb.BIND_OUT,
            type: oracledb.NUMBER,
          },
        },
        { autoCommit: true }
      );

      const id = (result.outBinds as any)?.ID_POSICAO?.[0];

      return res.status(201).json({
        ID_POSICAO: id,
        CD_SICOOB,
        DESC_ATUACAO,
        NM_POSICAO,
        DESC_POSICAO,
        SN_ATIVO: 1,
      });
    } catch (err: any) {
      console.error("cadastrar posicao erro:", err);
      return res.status(500).json({
        error: "Falha ao cadastrar posição.",
        details: String(err?.message || err),
      });
    }
  },

  async editar(req: Request, res: Response) {
    try {
      const id = Number(req.params.id || 0);

      const CD_SICOOB = String(req.body.CD_SICOOB || "").trim().toUpperCase();
      const DESC_ATUACAO = String(req.body.DESC_ATUACAO || "").trim().toUpperCase();
      const NM_POSICAO = String(req.body.NM_POSICAO || "").trim().toUpperCase();
      const DESC_POSICAO = String(req.body.DESC_POSICAO || "").trim().toUpperCase();
      const SN_ATIVO = Number(req.body.SN_ATIVO);

      if (!id) {
        return res.status(400).json({
          error: "ID da posição inválido.",
        });
      }

      if (!CD_SICOOB) {
        return res.status(400).json({
          error: "Preencha o código.",
        });
      }

      if (!DESC_ATUACAO) {
        return res.status(400).json({
          error: "Preencha a atuação.",
        });
      }

      if (!NM_POSICAO) {
        return res.status(400).json({
          error: "Preencha a posição.",
        });
      }

      if (!DESC_POSICAO) {
        return res.status(400).json({
          error: "Preencha a descrição.",
        });
      }

      if (![0, 1].includes(SN_ATIVO)) {
        return res.status(400).json({
          error: "Status inválido para a posição.",
        });
      }

      const sql = `
        UPDATE DBACRESSEM.POSICAO_COOPERATIVA_SICOOB
        SET
          CD_SICOOB = :CD_SICOOB,
          DESC_ATUACAO = :DESC_ATUACAO,
          NM_POSICAO = :NM_POSICAO,
          DESC_POSICAO = :DESC_POSICAO,
          SN_ATIVO = :SN_ATIVO
        WHERE ID_POSICAO = :ID_POSICAO
      `;

      const result = await oracleExecute(
        sql,
        {
          ID_POSICAO: id,
          CD_SICOOB,
          DESC_ATUACAO,
          NM_POSICAO,
          DESC_POSICAO,
          SN_ATIVO,
        },
        { autoCommit: true }
      );

      if (!result.rowsAffected) {
        return res.status(404).json({
          error: "Posição não encontrada.",
        });
      }

      return res.json({
        ID_POSICAO: id,
        CD_SICOOB,
        DESC_ATUACAO,
        NM_POSICAO,
        DESC_POSICAO,
        SN_ATIVO,
      });
    } catch (err: any) {
      console.error("editar posicao erro:", err);
      return res.status(500).json({
        error: "Falha ao atualizar posição.",
        details: String(err?.message || err),
      });
    }
  },

  async downloadCsv(req: Request, res: Response) {
    try {
      const sql = `
        SELECT
          CD_SICOOB,
          DESC_ATUACAO,
          NM_POSICAO,
          DESC_POSICAO,
          SN_ATIVO
        FROM DBACRESSEM.POSICAO_COOPERATIVA_SICOOB
        ORDER BY CD_SICOOB
      `;

      const result = await oracleExecute(
        sql,
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const rows = result.rows || [];

      const header = ["Codigo", "Atuacao", "Posicao", "Descricao", "Status"];
      const lines = [header.join(";")];

      rows.forEach((row: any) => {
        lines.push(
          [
            escapeCsv(row.CD_SICOOB || ""),
            escapeCsv(capitalizeWords(row.DESC_ATUACAO || "")),
            escapeCsv(capitalizeWords(row.NM_POSICAO || "")),
            escapeCsv(capitalizeWords(row.DESC_POSICAO || "")),
            escapeCsv(Number(row.SN_ATIVO) === 1 ? "Ativo" : "Inativo"),
          ].join(";")
        );
      });

      const csv = "\uFEFF" + lines.join("\n");

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="posicoes_sicoob.csv"'
      );

      return res.status(200).send(csv);
    } catch (err: any) {
      console.error("download csv posicoes erro:", err);
      return res.status(500).json({
        error: "Falha ao gerar relatório CSV.",
        details: String(err?.message || err),
      });
    }
  },
};