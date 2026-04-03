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

export const gerenciamentoSetorController = {
  async listar(req: Request, res: Response) {
    try {
      const sql = `
        SELECT
          ID_SETOR,
          NM_SETOR,
          NM_ENDERECO,
          NR_RAMAL,
          SN_ATIVO
        FROM DBACRESSEM.SETOR_SICOOB_CRESSEM
        ORDER BY UPPER(NM_SETOR)
      `;

      const result = await oracleExecute(
        sql,
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      return res.json(result.rows || []);
    } catch (err: any) {
      console.error("listar setores erro:", err);
      return res.status(500).json({
        error: "Falha ao listar setores.",
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

      const bindsCount = {
        nome: `%${nome.toUpperCase()}%`,
      };

      const bindsLista = {
        nome: `%${nome.toUpperCase()}%`,
        offset,
        limit,
      };

      const sqlCount = `
        SELECT COUNT(*) AS TOTAL
        FROM DBACRESSEM.SETOR_SICOOB_CRESSEM s
        WHERE (
          :nome = '%%'
          OR UPPER(s.NM_SETOR) LIKE :nome
          OR UPPER(s.NM_ENDERECO) LIKE :nome
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
            s.ID_SETOR,
            s.NM_SETOR,
            s.NM_ENDERECO,
            s.NR_RAMAL,
            s.SN_ATIVO,
            ROW_NUMBER() OVER (ORDER BY UPPER(s.NM_SETOR)) AS RN
          FROM DBACRESSEM.SETOR_SICOOB_CRESSEM s
          WHERE (
            :nome = '%%'
            OR UPPER(s.NM_SETOR) LIKE :nome
            OR UPPER(s.NM_ENDERECO) LIKE :nome
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
      console.error("listarPaginado setores erro:", err);
      return res.status(500).json({
        error: "Falha ao listar setores paginados.",
        details: String(err?.message || err),
      });
    }
  },

  async cadastrar(req: Request, res: Response) {
    try {
      const NM_SETOR = String(req.body.NM_SETOR || "").trim().toUpperCase();
      const NM_ENDERECO = String(req.body.NM_ENDERECO || "").trim().toUpperCase();
      const NR_RAMAL = String(req.body.NR_RAMAL || "").trim();

      if (!NM_SETOR) {
        return res.status(400).json({
          error: "Preencha o setor.",
        });
      }

      if (!NM_ENDERECO) {
        return res.status(400).json({
          error: "Preencha o endereço.",
        });
      }

      const sql = `
        INSERT INTO DBACRESSEM.SETOR_SICOOB_CRESSEM (
          NM_SETOR,
          NM_ENDERECO,
          NR_RAMAL,
          SN_ATIVO
        ) VALUES (
          :NM_SETOR,
          :NM_ENDERECO,
          :NR_RAMAL,
          1
        )
        RETURNING ID_SETOR INTO :ID_SETOR
      `;

      const result = await oracleExecute(
        sql,
        {
          NM_SETOR,
          NM_ENDERECO,
          NR_RAMAL,
          ID_SETOR: {
            dir: oracledb.BIND_OUT,
            type: oracledb.NUMBER,
          },
        },
        { autoCommit: true }
      );

      const id = (result.outBinds as any)?.ID_SETOR?.[0];

      return res.status(201).json({
        ID_SETOR: id,
        NM_SETOR,
        NM_ENDERECO,
        NR_RAMAL,
        SN_ATIVO: 1,
      });
    } catch (err: any) {
      console.error("cadastrar setor erro:", err);
      return res.status(500).json({
        error: "Falha ao cadastrar setor.",
        details: String(err?.message || err),
      });
    }
  },

  async editar(req: Request, res: Response) {
    try {
      const id = Number(req.params.id || 0);

      const NM_SETOR = String(req.body.NM_SETOR || "").trim().toUpperCase();
      const NM_ENDERECO = String(req.body.NM_ENDERECO || "").trim().toUpperCase();
      const NR_RAMAL = String(req.body.NR_RAMAL || "").trim();
      const SN_ATIVO = Number(req.body.SN_ATIVO);

      if (!id) {
        return res.status(400).json({
          error: "ID do setor inválido.",
        });
      }

      if (!NM_SETOR) {
        return res.status(400).json({
          error: "Preencha o setor.",
        });
      }

      if (!NM_ENDERECO) {
        return res.status(400).json({
          error: "Preencha o endereço.",
        });
      }

      if (![0, 1].includes(SN_ATIVO)) {
        return res.status(400).json({
          error: "Status inválido para o setor.",
        });
      }

      const sql = `
        UPDATE DBACRESSEM.SETOR_SICOOB_CRESSEM
        SET
          NM_SETOR = :NM_SETOR,
          NM_ENDERECO = :NM_ENDERECO,
          NR_RAMAL = :NR_RAMAL,
          SN_ATIVO = :SN_ATIVO
        WHERE ID_SETOR = :ID_SETOR
      `;

      const result = await oracleExecute(
        sql,
        {
          ID_SETOR: id,
          NM_SETOR,
          NM_ENDERECO,
          NR_RAMAL,
          SN_ATIVO,
        },
        { autoCommit: true }
      );

      if (!result.rowsAffected) {
        return res.status(404).json({
          error: "Setor não encontrado.",
        });
      }

      return res.json({
        ID_SETOR: id,
        NM_SETOR,
        NM_ENDERECO,
        NR_RAMAL,
        SN_ATIVO,
      });
    } catch (err: any) {
      console.error("editar setor erro:", err);
      return res.status(500).json({
        error: "Falha ao atualizar setor.",
        details: String(err?.message || err),
      });
    }
  },

  async listarSimples(req: Request, res: Response) {
    try {
      const sql = `
        SELECT
          ID_SETOR,
          NM_SETOR
        FROM DBACRESSEM.SETOR_SICOOB_CRESSEM
        WHERE SN_ATIVO = 1
        ORDER BY UPPER(NM_SETOR)
      `;

      const result = await oracleExecute(
        sql,
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      return res.json(result.rows || []);
    } catch (err: any) {
      console.error("listar setores simples erro:", err);
      return res.status(500).json({
        error: "Falha ao listar setores simples.",
        details: String(err?.message || err),
      });
    }
  },

  async downloadCsv(req: Request, res: Response) {
    try {
      const sql = `
        SELECT
          NM_SETOR,
          NR_RAMAL,
          NM_ENDERECO,
          SN_ATIVO
        FROM DBACRESSEM.SETOR_SICOOB_CRESSEM
        ORDER BY UPPER(NM_SETOR)
      `;

      const result = await oracleExecute(
        sql,
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const rows = result.rows || [];

      const header = ["Setor", "Ramal", "Endereco", "Status"];
      const lines = [header.join(";")];

      rows.forEach((row: any) => {
        lines.push(
          [
            escapeCsv(capitalizeWords(row.NM_SETOR || "")),
            escapeCsv(row.NR_RAMAL || ""),
            escapeCsv(capitalizeWords(row.NM_ENDERECO || "")),
            escapeCsv(Number(row.SN_ATIVO) === 1 ? "Ativo" : "Inativo"),
          ].join(";")
        );
      });

      const csv = "\uFEFF" + lines.join("\n");

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="setores.csv"'
      );

      return res.status(200).send(csv);
    } catch (err: any) {
      console.error("download csv setores erro:", err);
      return res.status(500).json({
        error: "Falha ao gerar relatório CSV.",
        details: String(err?.message || err),
      });
    }
  },
};