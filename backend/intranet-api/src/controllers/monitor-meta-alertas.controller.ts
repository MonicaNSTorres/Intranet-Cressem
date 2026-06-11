import { Request, Response } from "express";
import oracledb from "oracledb";
import {
  oracleExecute,
  oracleExecuteCommitWithAudit,
} from "../services/oracle.service";

function normalizarTexto(value: unknown) {
  return String(value || "").trim();
}

function normalizarStatus(value: unknown) {
  const status = normalizarTexto(value).toLowerCase();
  if (status === "resolvido") return 1;
  if (status === "todos") return null;
  return 0;
}

function getRowString(row: any, key: string) {
  return row?.[key] == null ? null : String(row[key]);
}

export const monitorMetaAlertasController = {
  async listar(req: Request, res: Response) {
    try {
      const page = Math.max(Number(req.query.page || 1), 1);
      const limit = Math.min(Math.max(Number(req.query.limit || 10), 1), 100);
      const offset = (page - 1) * limit;

      const status = normalizarStatus(req.query.status);
      const tela = normalizarTexto(req.query.tela);
      const tema = normalizarTexto(req.query.tema);
      const gravidade = normalizarTexto(req.query.gravidade);
      const entidade = normalizarTexto(req.query.entidade);
      const tipoEntidade = normalizarTexto(req.query.tipo_entidade).toUpperCase();

      const where: string[] = [];
      const binds: Record<string, any> = {};

      if (status !== null) {
        where.push("A.SN_RESOLVIDO = :status");
        binds.status = status;
      }

      if (gravidade) {
        where.push("UPPER(A.NM_GRAVIDADE) = :gravidade");
        binds.gravidade = gravidade.toUpperCase();
      }

      if (entidade) {
        where.push("UPPER(A.NM_ENTIDADE) LIKE :entidade");
        binds.entidade = `%${entidade.toUpperCase()}%`;
      }

      if (tipoEntidade === "PA") {
        where.push("UPPER(A.NM_ENTIDADE) LIKE 'PA:%'");
      }

      if (tipoEntidade === "FUNC") {
        where.push("UPPER(A.NM_ENTIDADE) LIKE 'FUNC:%'");
      }

      if (tema) {
        where.push("UPPER(A.NM_OBSERVACAO) LIKE :tema");
        binds.tema = `%TEMA=${tema.toUpperCase()}%`;
      }

      if (tela) {
        where.push("UPPER(A.NM_OBSERVACAO) LIKE :tela");
        binds.tela = `%TELA=${tela.toUpperCase()}%`;
      }

      const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

      const sqlCount = `
        SELECT
          COUNT(*) AS TOTAL,
          SUM(CASE WHEN A.SN_RESOLVIDO = 0 THEN 1 ELSE 0 END) AS ABERTOS,
          SUM(CASE WHEN A.SN_RESOLVIDO = 1 THEN 1 ELSE 0 END) AS RESOLVIDOS
        FROM DBACRESSEM.MONITOR_META_ALERTA A
        ${whereSql}
      `;

      const countResult = await oracleExecute(
        sqlCount,
        binds,
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const countRow = (countResult.rows?.[0] || {}) as any;
      const total = Number(countRow.TOTAL || 0);
      const total_pages = total > 0 ? Math.ceil(total / limit) : 1;

      const sqlAgrupamentoTema = `
        SELECT
          NVL(REGEXP_SUBSTR(A.NM_OBSERVACAO, 'Tema=([^;]+)', 1, 1, NULL, 1), 'Sem tema') AS TEMA,
          COUNT(*) AS TOTAL,
          SUM(CASE WHEN A.SN_RESOLVIDO = 0 THEN 1 ELSE 0 END) AS ABERTOS,
          SUM(CASE WHEN A.SN_RESOLVIDO = 1 THEN 1 ELSE 0 END) AS RESOLVIDOS
        FROM DBACRESSEM.MONITOR_META_ALERTA A
        ${whereSql}
        GROUP BY NVL(REGEXP_SUBSTR(A.NM_OBSERVACAO, 'Tema=([^;]+)', 1, 1, NULL, 1), 'Sem tema')
        ORDER BY ABERTOS DESC, TOTAL DESC, TEMA
      `;

      const agrupamentoResult = await oracleExecute(
        sqlAgrupamentoTema,
        binds,
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const sqlLista = `
        SELECT *
        FROM (
          SELECT
            ROWIDTOCHAR(A.ROWID) AS ID_ALERTA,
            A.DT_EXECUCAO,
            A.NM_GRAVIDADE,
            A.NM_REGRA,
            A.NM_ENTIDADE,
            A.VL_ENCONTRADO,
            A.VL_ESPERADO,
            A.SN_RESOLVIDO,
            A.NM_OBSERVACAO,
            ROW_NUMBER() OVER (
              ORDER BY
                A.SN_RESOLVIDO ASC,
                CASE UPPER(A.NM_GRAVIDADE)
                  WHEN 'CRITICA' THEN 1
                  WHEN 'ALTA' THEN 2
                  WHEN 'MEDIA' THEN 3
                  WHEN 'BAIXA' THEN 4
                  ELSE 5
                END ASC,
                A.DT_EXECUCAO DESC,
                A.NM_ENTIDADE
            ) AS RN
          FROM DBACRESSEM.MONITOR_META_ALERTA A
          ${whereSql}
        )
        WHERE RN > :offset
          AND RN <= (:offset + :limit)
        ORDER BY RN
      `;

      const listaResult = await oracleExecute(
        sqlLista,
        {
          ...binds,
          offset,
          limit,
        },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const items = (listaResult.rows || []).map((row: any) => ({
        id_alerta: getRowString(row, "ID_ALERTA"),
        dt_execucao: row.DT_EXECUCAO,
        nm_gravidade: getRowString(row, "NM_GRAVIDADE"),
        nm_regra: getRowString(row, "NM_REGRA"),
        nm_entidade: getRowString(row, "NM_ENTIDADE"),
        vl_encontrado: getRowString(row, "VL_ENCONTRADO"),
        vl_esperado: getRowString(row, "VL_ESPERADO"),
        sn_resolvido: Number(row.SN_RESOLVIDO || 0),
        nm_observacao: getRowString(row, "NM_OBSERVACAO"),
      }));

      return res.json({
        items,
        total,
        total_pages,
        page,
        limit,
        resumo: {
          total,
          abertos: Number(countRow.ABERTOS || 0),
          resolvidos: Number(countRow.RESOLVIDOS || 0),
        },
        agrupamento_tema: (agrupamentoResult.rows || []).map((row: any) => ({
          tema: getRowString(row, "TEMA"),
          total: Number(row.TOTAL || 0),
          abertos: Number(row.ABERTOS || 0),
          resolvidos: Number(row.RESOLVIDOS || 0),
        })),
      });
    } catch (err: any) {
      console.error("listar alertas de meta erro:", err);
      return res.status(500).json({
        error: "Falha ao listar alertas de meta.",
        details: String(err?.message || err),
      });
    }
  },

  async resolver(req: Request, res: Response) {
    try {
      const id = normalizarTexto(req.body?.id_alerta || req.body?.id);

      if (!id) {
        return res.status(400).json({
          error: "Informe o alerta que será resolvido.",
        });
      }

      const result = await oracleExecuteCommitWithAudit(
        req,
        `
          UPDATE DBACRESSEM.MONITOR_META_ALERTA
             SET SN_RESOLVIDO = 1
           WHERE ROWID = CHARTOROWID(:id)
             AND SN_RESOLVIDO = 0
        `,
        { id },
        {}
      );

      if (!result.rowsAffected) {
        return res.status(404).json({
          error: "Alerta não encontrado ou já resolvido.",
        });
      }

      return res.json({
        sucesso: true,
        mensagem: "Alerta marcado como resolvido.",
      });
    } catch (err: any) {
      console.error("resolver alerta de meta erro:", err);
      return res.status(500).json({
        error: "Falha ao resolver alerta de meta.",
        details: String(err?.message || err),
      });
    }
  },
};
