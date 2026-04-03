import { Request, Response } from "express";
import oracledb from "oracledb";

function onlyDigits(v: string) {
  return String(v || "").replace(/\D/g, "");
}

function toDateOnly(value: any): string {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function escapeCsv(value: any) {
  const text = String(value ?? "");
  if (text.includes(",") || text.includes('"') || text.includes("\n")) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export const chequeEspecialController = {
  async listar(req: Request, res: Response) {
    let connection: oracledb.Connection | undefined;

    try {
      connection = await oracledb.getConnection();

      const result = await connection.execute(
        `
          SELECT
            a.ID_ATUALIZACAO_BENEFICIO_CHEQUE_ESPECIAL,
            a.NR_CONTA_CORRENTE,
            a.NR_CPF_CNPJ,
            a.NM_ASSOCIADO,
            a.VL_PERC_TAXA_ADICIONAL_LIM_CRED,
            a.VL_LIMITE,
            a.NM_ALTERACAO,
            a.SN_FEITO,
            a.NM_ATENDENTE,
            TO_CHAR(a.DT_ALTERACAO, 'YYYY-MM-DD') AS DT_ALTERACAO
          FROM DBACRESSEM.ATUALIZACAO_BENEFICIO_CHEQUE_ESPECIAL a
          ORDER BY UPPER(a.NM_ASSOCIADO)
        `,
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      return res.json(result.rows || []);
    } catch (err: any) {
      console.error("listar cheque especial erro:", err);
      return res.status(500).json({
        error: "Falha ao listar alterações do cheque especial.",
        details: String(err?.message || err),
      });
    } finally {
      if (connection) {
        try {
          await connection.close();
        } catch {}
      }
    }
  },

  async listarPaginado(req: Request, res: Response) {
    let connection: oracledb.Connection | undefined;

    try {
      const nome = String(req.query.nome || "").trim();
      const page = Math.max(Number(req.query.page || 1), 1);
      const limit = Math.max(Number(req.query.limit || 15), 1);
      const offset = (page - 1) * limit;

      connection = await oracledb.getConnection();

      const termoBusca = `%${nome.toUpperCase()}%`;
      const termoDigitos = `%${onlyDigits(nome)}%`;

      const resultCount = await connection.execute(
        `
          SELECT COUNT(*) AS TOTAL
          FROM DBACRESSEM.ATUALIZACAO_BENEFICIO_CHEQUE_ESPECIAL a
          WHERE (
            :nome = '%%'
            OR UPPER(a.NM_ASSOCIADO) LIKE :nome
            OR UPPER(a.NM_ALTERACAO) LIKE :nome
            OR TO_CHAR(a.NR_CONTA_CORRENTE) LIKE :nomeNumerico
            OR REGEXP_REPLACE(a.NR_CPF_CNPJ, '[^0-9]', '') LIKE :cpfNumerico
          )
        `,
        {
          nome: termoBusca,
          nomeNumerico: termoDigitos,
          cpfNumerico: termoDigitos,
        },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const total = Number((resultCount.rows?.[0] as any)?.TOTAL || 0);
      const total_pages = total > 0 ? Math.ceil(total / limit) : 1;

      const result = await connection.execute(
        `
          SELECT *
          FROM (
            SELECT
              a.ID_ATUALIZACAO_BENEFICIO_CHEQUE_ESPECIAL,
              a.NR_CONTA_CORRENTE,
              a.NR_CPF_CNPJ,
              a.NM_ASSOCIADO,
              a.VL_PERC_TAXA_ADICIONAL_LIM_CRED,
              a.VL_LIMITE,
              a.NM_ALTERACAO,
              a.SN_FEITO,
              a.NM_ATENDENTE,
              TO_CHAR(a.DT_ALTERACAO, 'YYYY-MM-DD') AS DT_ALTERACAO,
              ROW_NUMBER() OVER (
                ORDER BY
                  NVL(a.SN_FEITO, 0),
                  UPPER(a.NM_ASSOCIADO)
              ) AS RN
            FROM DBACRESSEM.ATUALIZACAO_BENEFICIO_CHEQUE_ESPECIAL a
            WHERE (
              :nome = '%%'
              OR UPPER(a.NM_ASSOCIADO) LIKE :nome
              OR UPPER(a.NM_ALTERACAO) LIKE :nome
              OR TO_CHAR(a.NR_CONTA_CORRENTE) LIKE :nomeNumerico
              OR REGEXP_REPLACE(a.NR_CPF_CNPJ, '[^0-9]', '') LIKE :cpfNumerico
            )
          )
          WHERE RN > :offset
            AND RN <= (:offset + :limit)
          ORDER BY RN
        `,
        {
          nome: termoBusca,
          nomeNumerico: termoDigitos,
          cpfNumerico: termoDigitos,
          offset,
          limit,
        },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      return res.json({
        items: result.rows || [],
        total_items: total,
        total_pages,
        current_page: page,
      });
    } catch (err: any) {
      console.error("listarPaginado cheque especial erro:", err);
      return res.status(500).json({
        error: "Falha ao listar alterações paginadas do cheque especial.",
        details: String(err?.message || err),
      });
    } finally {
      if (connection) {
        try {
          await connection.close();
        } catch {}
      }
    }
  },

  async atualizar(req: Request, res: Response) {
    let connection: oracledb.Connection | undefined;

    try {
      const id = Number(req.params.id || 0);
      const atendente = decodeURIComponent(String(req.params.atendente || "")).trim();
      const data = toDateOnly(req.params.data);

      if (!id) {
        return res.status(400).json({
          error: "ID da atualização inválido.",
        });
      }

      if (!atendente) {
        return res.status(400).json({
          error: "Nome do atendente não informado.",
        });
      }

      if (!data) {
        return res.status(400).json({
          error: "Data da alteração inválida.",
        });
      }

      connection = await oracledb.getConnection();

      const resultCheck = await connection.execute(
        `
          SELECT
            ID_ATUALIZACAO_BENEFICIO_CHEQUE_ESPECIAL,
            SN_FEITO
          FROM DBACRESSEM.ATUALIZACAO_BENEFICIO_CHEQUE_ESPECIAL
          WHERE ID_ATUALIZACAO_BENEFICIO_CHEQUE_ESPECIAL = :id
        `,
        { id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const row = resultCheck.rows?.[0] as any;

      if (!row) {
        return res.status(404).json({
          error: "Registro de alteração não encontrado.",
        });
      }

      if (Number(row.SN_FEITO) === 1) {
        return res.status(400).json({
          error: "Esta alteração já foi concluída.",
        });
      }

      const resultUpdate = await connection.execute(
        `
          UPDATE DBACRESSEM.ATUALIZACAO_BENEFICIO_CHEQUE_ESPECIAL
          SET
            SN_FEITO = 1,
            NM_ATENDENTE = :atendente,
            DT_ALTERACAO = TO_DATE(:data, 'YYYY-MM-DD')
          WHERE ID_ATUALIZACAO_BENEFICIO_CHEQUE_ESPECIAL = :id
        `,
        {
          id,
          atendente,
          data,
        }
      );

      if (!resultUpdate.rowsAffected) {
        return res.status(404).json({
          error: "Registro não encontrado para atualização.",
        });
      }

      await connection.commit();

      return res.json({
        success: true,
        message: "Alteração do cheque especial concluída com sucesso.",
      });
    } catch (err: any) {
      if (connection) {
        try {
          await connection.rollback();
        } catch {}
      }

      console.error("atualizar cheque especial erro:", err);
      return res.status(500).json({
        error: "Falha ao atualizar alteração do cheque especial.",
        details: String(err?.message || err),
      });
    } finally {
      if (connection) {
        try {
          await connection.close();
        } catch {}
      }
    }
  },

  async downloadCsv(req: Request, res: Response) {
    let connection: oracledb.Connection | undefined;

    try {
      connection = await oracledb.getConnection();

      const result = await connection.execute(
        `
          SELECT
            a.ID_ATUALIZACAO_BENEFICIO_CHEQUE_ESPECIAL,
            a.NR_CONTA_CORRENTE,
            a.NR_CPF_CNPJ,
            a.NM_ASSOCIADO,
            a.VL_PERC_TAXA_ADICIONAL_LIM_CRED,
            a.VL_LIMITE,
            a.NM_ALTERACAO,
            a.SN_FEITO,
            a.NM_ATENDENTE,
            TO_CHAR(a.DT_ALTERACAO, 'DD/MM/YYYY') AS DT_ALTERACAO
          FROM DBACRESSEM.ATUALIZACAO_BENEFICIO_CHEQUE_ESPECIAL a
          ORDER BY
            NVL(a.SN_FEITO, 0),
            UPPER(a.NM_ASSOCIADO)
        `,
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const rows = (result.rows || []) as any[];

      const header = [
        "ID_ATUALIZACAO_BENEFICIO_CHEQUE_ESPECIAL",
        "NR_CONTA_CORRENTE",
        "NR_CPF_CNPJ",
        "NM_ASSOCIADO",
        "VL_PERC_TAXA_ADICIONAL_LIM_CRED",
        "VL_LIMITE",
        "NM_ALTERACAO",
        "SN_FEITO",
        "NM_ATENDENTE",
        "DT_ALTERACAO",
      ];

      const lines = rows.map((row) =>
        [
          row.ID_ATUALIZACAO_BENEFICIO_CHEQUE_ESPECIAL,
          row.NR_CONTA_CORRENTE,
          row.NR_CPF_CNPJ,
          row.NM_ASSOCIADO,
          row.VL_PERC_TAXA_ADICIONAL_LIM_CRED,
          row.VL_LIMITE,
          row.NM_ALTERACAO,
          row.SN_FEITO,
          row.NM_ATENDENTE,
          row.DT_ALTERACAO,
        ]
          .map(escapeCsv)
          .join(",")
      );

      const csv = [header.join(","), ...lines].join("\n");

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=atualizacao_cheque_especial.csv"
      );

      return res.status(200).send("\uFEFF" + csv);
    } catch (err: any) {
      console.error("downloadCsv cheque especial erro:", err);
      return res.status(500).json({
        error: "Falha ao baixar relatório do cheque especial.",
        details: String(err?.message || err),
      });
    } finally {
      if (connection) {
        try {
          await connection.close();
        } catch {}
      }
    }
  },
};