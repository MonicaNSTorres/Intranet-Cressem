import { Request, Response } from "express";
import oracledb from "oracledb";
import { oracleExecute } from "../services/oracle.service";

function texto(value: unknown) {
  return String(value || "").trim();
}

function upper(value: unknown) {
  return texto(value).toUpperCase();
}

function numero(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function buildBaseSql() {
  return `
    WITH MONITOR AS (
      SELECT
        'PRIMEIRA_RESPOSTA' AS TIPO_MONITOR,
        TO_CHAR(ID_TICKET_EVENT_LOG_ANSWER) AS ID_ORIGEM,
        TICKET_ID,
        SEQUENTIAL_ID,
        PARENT_SEQUENTIAL_ID,
        CUSTOMER_NAME,
        CAST(NULL AS VARCHAR2(255)) AS CUSTOMER_IDENTITY,
        AGENT_IDENTITY,
        UPPER(TRIM(AGENTE_NOME)) AS RESPONSAVEL,
        UPPER(TRIM(GERENTE_NOME)) AS GERENTE,
        CAST(NULL AS VARCHAR2(100)) AS FILA_ORIGEM,
        CAST(NULL AS VARCHAR2(100)) AS FILA_DESTINO,
        CAST(NULL AS VARCHAR2(100)) AS CAMPAIGN_ID,
        CAST(NULL AS VARCHAR2(50)) AS STATUS_ATENDIMENTO,
        CAST(NULL AS DATE) AS DATA_ABERTURA,
        MINUTOS_ESPERA AS MINUTOS,
        DATA_EVENTO,
        EVENT_TYPE,
        CAST(NULL AS VARCHAR2(1000)) AS OBSERVACOES,
        CASE
          WHEN MINUTOS_ESPERA >= 90 THEN 'CRITICA'
          WHEN MINUTOS_ESPERA >= 50 THEN 'ALTA'
          WHEN MINUTOS_ESPERA >= 20 THEN 'BAIXA'
          ELSE 'NORMAL'
        END AS GRAVIDADE
      FROM DBACRESSEM.TICKET_EVENT_LOG_ANSWER
      WHERE MINUTOS_ESPERA IS NOT NULL

      UNION ALL

      SELECT
        'ESPERA_FILA' AS TIPO_MONITOR,
        TO_CHAR(ID_TICKET_EVENT_LOG_QUEUE) AS ID_ORIGEM,
        TICKET_ID,
        SEQUENTIAL_ID,
        PARENT_SEQUENTIAL_ID,
        CUSTOMER_NAME,
        CUSTOMER_IDENTITY,
        AGENT_IDENTITY,
        CAST(NULL AS VARCHAR2(100)) AS RESPONSAVEL,
        UPPER(TRIM(NVL(GERENTE_RESPONSAVEL_DESTINO, GERENTE_RESPONSAVEL_ORIGEM))) AS GERENTE,
        TEAM_ORIGEM AS FILA_ORIGEM,
        TEAM_DESTINO AS FILA_DESTINO,
        CAMPAIGN_ID,
        STATUS AS STATUS_ATENDIMENTO,
        DATA_ABERTURA,
        ESPERA_TOTAL AS MINUTOS,
        DATA_EVENTO,
        EVENT_TYPE,
        DBMS_LOB.SUBSTR(OBSERVACOES, 1000, 1) AS OBSERVACOES,
        CASE
          WHEN ESPERA_TOTAL >= 50 THEN 'CRITICA'
          WHEN ESPERA_TOTAL >= 30 THEN 'ALTA'
          WHEN ESPERA_TOTAL >= 10 THEN 'BAIXA'
          ELSE 'NORMAL'
        END AS GRAVIDADE
      FROM DBACRESSEM.TICKET_EVENT_LOG_QUEUE
      WHERE ESPERA_TOTAL IS NOT NULL
    )
  `;
}

function buildWhere(req: Request) {
  const dataInicio = texto(req.query.dataInicio);
  const dataFim = texto(req.query.dataFim);
  const gravidade = upper(req.query.gravidade);
  const tipo = upper(req.query.tipo);
  const gerente = upper(req.query.gerente);
  const agente = upper(req.query.agente);
  const fila = upper(req.query.fila);
  const busca = upper(req.query.busca);
  const statusAtendimento = upper(req.query.statusAtendimento);
  const evento = upper(req.query.evento);
  const minutosMin = numero(req.query.minutosMin, 0);
  const incluirNormal = upper(req.query.incluirNormal) === "S";

  const where: string[] = [];
  const binds: Record<string, any> = {};

  if (dataInicio) {
    where.push("M.DATA_EVENTO >= TO_DATE(:dataInicio, 'YYYY-MM-DD')");
    binds.dataInicio = dataInicio;
  } else {
    where.push("M.DATA_EVENTO >= TRUNC(SYSDATE) - 30");
  }

  if (dataFim) {
    where.push("M.DATA_EVENTO < TO_DATE(:dataFim, 'YYYY-MM-DD') + 1");
    binds.dataFim = dataFim;
  }

  if (gravidade && gravidade !== "TODAS") {
    where.push("M.GRAVIDADE = :gravidade");
    binds.gravidade = gravidade;
  } else if (!incluirNormal) {
    where.push("M.GRAVIDADE <> 'NORMAL'");
  }

  if (tipo && tipo !== "TODOS") {
    where.push("M.TIPO_MONITOR = :tipo");
    binds.tipo = tipo;
  }

  if (gerente) {
    where.push("UPPER(NVL(M.GERENTE, '')) LIKE :gerente");
    binds.gerente = `%${gerente}%`;
  }

  if (agente) {
    where.push("UPPER(NVL(M.RESPONSAVEL, '')) LIKE :agente");
    binds.agente = `%${agente}%`;
  }

  if (fila) {
    where.push(`
      (
        UPPER(NVL(M.FILA_ORIGEM, '')) LIKE :fila
        OR UPPER(NVL(M.FILA_DESTINO, '')) LIKE :fila
      )
    `);
    binds.fila = `%${fila}%`;
  }

  if (statusAtendimento && statusAtendimento !== "TODOS") {
    where.push("UPPER(NVL(M.STATUS_ATENDIMENTO, '')) = :statusAtendimento");
    binds.statusAtendimento = statusAtendimento;
  }

  if (evento) {
    where.push("UPPER(NVL(M.EVENT_TYPE, '')) LIKE :evento");
    binds.evento = `%${evento}%`;
  }

  if (minutosMin > 0) {
    where.push("M.MINUTOS >= :minutosMin");
    binds.minutosMin = minutosMin;
  }

  if (busca) {
    where.push(`
      (
        UPPER(NVL(M.TICKET_ID, '')) LIKE :busca
        OR UPPER(NVL(TO_CHAR(M.SEQUENTIAL_ID), '')) LIKE :busca
        OR UPPER(NVL(M.CUSTOMER_NAME, '')) LIKE :busca
        OR UPPER(NVL(M.CUSTOMER_IDENTITY, '')) LIKE :busca
        OR UPPER(NVL(M.RESPONSAVEL, '')) LIKE :busca
        OR UPPER(NVL(M.GERENTE, '')) LIKE :busca
        OR UPPER(NVL(M.FILA_ORIGEM, '')) LIKE :busca
        OR UPPER(NVL(M.FILA_DESTINO, '')) LIKE :busca
        OR UPPER(NVL(M.EVENT_TYPE, '')) LIKE :busca
      )
    `);
    binds.busca = `%${busca}%`;
  }

  return {
    whereSql: where.length ? `WHERE ${where.join(" AND ")}` : "",
    binds,
  };
}

export const monitorAtendimentoBlipController = {
  async listar(req: Request, res: Response) {
    try {
      const page = Math.max(numero(req.query.page, 1), 1);
      const limit = Math.min(Math.max(numero(req.query.limit, 10), 1), 100);
      const offset = (page - 1) * limit;
      const baseSql = buildBaseSql();
      const { whereSql, binds } = buildWhere(req);

      const sqlResumo = `
        ${baseSql}
        SELECT
          COUNT(*) AS TOTAL,
          SUM(CASE WHEN M.GRAVIDADE = 'CRITICA' THEN 1 ELSE 0 END) AS CRITICOS,
          SUM(CASE WHEN M.GRAVIDADE = 'ALTA' THEN 1 ELSE 0 END) AS ALTOS,
          SUM(CASE WHEN M.GRAVIDADE = 'BAIXA' THEN 1 ELSE 0 END) AS BAIXOS,
          SUM(CASE WHEN M.TIPO_MONITOR = 'PRIMEIRA_RESPOSTA' THEN 1 ELSE 0 END) AS PRIMEIRA_RESPOSTA,
          SUM(CASE WHEN M.TIPO_MONITOR = 'ESPERA_FILA' THEN 1 ELSE 0 END) AS ESPERA_FILA,
          SUM(CASE WHEN UPPER(NVL(M.EVENT_TYPE, '')) LIKE '%EMAIL%' THEN 1 ELSE 0 END) AS ALERTAS_EMAIL,
          SUM(CASE WHEN UPPER(NVL(M.EVENT_TYPE, '')) LIKE '%TRANSFERIDO%' THEN 1 ELSE 0 END) AS TRANSFERENCIAS,
          COUNT(DISTINCT M.TICKET_ID) AS TICKETS,
          ROUND(AVG(M.MINUTOS), 2) AS MEDIA_MINUTOS,
          MAX(M.MINUTOS) AS MAIOR_ESPERA
        FROM MONITOR M
        ${whereSql}
      `;

      const sqlLista = `
        ${baseSql}
        SELECT *
        FROM (
          SELECT
            M.TIPO_MONITOR,
            M.ID_ORIGEM,
            M.TICKET_ID,
            M.SEQUENTIAL_ID,
            M.PARENT_SEQUENTIAL_ID,
            M.CUSTOMER_NAME,
            M.CUSTOMER_IDENTITY,
            M.AGENT_IDENTITY,
            M.RESPONSAVEL,
            M.GERENTE,
            M.FILA_ORIGEM,
            M.FILA_DESTINO,
            M.CAMPAIGN_ID,
            M.STATUS_ATENDIMENTO,
            TO_CHAR(M.DATA_ABERTURA, 'YYYY-MM-DD HH24:MI:SS') AS DATA_ABERTURA,
            M.MINUTOS,
            TO_CHAR(M.DATA_EVENTO, 'YYYY-MM-DD HH24:MI:SS') AS DATA_EVENTO,
            M.EVENT_TYPE,
            M.OBSERVACOES,
            M.GRAVIDADE,
            ROW_NUMBER() OVER (
              ORDER BY
                CASE M.GRAVIDADE
                  WHEN 'CRITICA' THEN 1
                  WHEN 'ALTA' THEN 2
                  WHEN 'BAIXA' THEN 3
                  ELSE 4
                END,
                M.MINUTOS DESC,
                M.DATA_EVENTO DESC
            ) AS RN
          FROM MONITOR M
          ${whereSql}
        )
        WHERE RN > :offset
          AND RN <= (:offset + :limit)
        ORDER BY RN
      `;

      const sqlRankingFuncionarios = `
        ${baseSql}
        SELECT *
        FROM (
          SELECT
            NVL(M.RESPONSAVEL, 'NÃO INFORMADO') AS RESPONSAVEL,
            NVL(M.GERENTE, 'SEM GERENTE') AS GERENTE,
            COUNT(*) AS QTD_ALERTAS,
            SUM(CASE WHEN M.GRAVIDADE = 'CRITICA' THEN 1 ELSE 0 END) AS QTD_CRITICOS,
            SUM(CASE WHEN M.GRAVIDADE = 'ALTA' THEN 1 ELSE 0 END) AS QTD_ALTOS,
            SUM(CASE WHEN M.GRAVIDADE = 'BAIXA' THEN 1 ELSE 0 END) AS QTD_BAIXOS,
            ROUND(AVG(M.MINUTOS), 2) AS MEDIA_MINUTOS,
            MAX(M.MINUTOS) AS MAIOR_ESPERA
          FROM MONITOR M
          ${whereSql}
            ${whereSql ? "AND" : "WHERE"} M.TIPO_MONITOR = 'PRIMEIRA_RESPOSTA'
          GROUP BY NVL(M.RESPONSAVEL, 'NÃO INFORMADO'), NVL(M.GERENTE, 'SEM GERENTE')
          ORDER BY QTD_ALERTAS DESC, QTD_CRITICOS DESC, MEDIA_MINUTOS DESC
        )
        WHERE ROWNUM <= 10
      `;

      const sqlRankingFilas = `
        ${baseSql}
        SELECT *
        FROM (
          SELECT
            NVL(M.FILA_DESTINO, NVL(M.FILA_ORIGEM, 'Fila não informada')) AS FILA,
            NVL(M.GERENTE, 'SEM GERENTE') AS GERENTE,
            COUNT(*) AS QTD_ALERTAS,
            SUM(CASE WHEN M.GRAVIDADE = 'CRITICA' THEN 1 ELSE 0 END) AS QTD_CRITICOS,
            SUM(CASE WHEN M.GRAVIDADE = 'ALTA' THEN 1 ELSE 0 END) AS QTD_ALTOS,
            SUM(CASE WHEN M.GRAVIDADE = 'BAIXA' THEN 1 ELSE 0 END) AS QTD_BAIXOS,
            ROUND(AVG(M.MINUTOS), 2) AS MEDIA_MINUTOS,
            MAX(M.MINUTOS) AS MAIOR_ESPERA
          FROM MONITOR M
          ${whereSql}
            ${whereSql ? "AND" : "WHERE"} M.TIPO_MONITOR = 'ESPERA_FILA'
          GROUP BY NVL(M.FILA_DESTINO, NVL(M.FILA_ORIGEM, 'Fila não informada')), NVL(M.GERENTE, 'SEM GERENTE')
          ORDER BY QTD_ALERTAS DESC, QTD_CRITICOS DESC, MEDIA_MINUTOS DESC
        )
        WHERE ROWNUM <= 10
      `;

      const sqlRankingGerentes = `
        ${baseSql}
        SELECT *
        FROM (
          SELECT
            NVL(M.GERENTE, 'SEM GERENTE') AS GERENTE,
            COUNT(*) AS QTD_ALERTAS,
            SUM(CASE WHEN M.GRAVIDADE = 'CRITICA' THEN 1 ELSE 0 END) AS QTD_CRITICOS,
            SUM(CASE WHEN M.GRAVIDADE = 'ALTA' THEN 1 ELSE 0 END) AS QTD_ALTOS,
            SUM(CASE WHEN M.GRAVIDADE = 'BAIXA' THEN 1 ELSE 0 END) AS QTD_BAIXOS,
            ROUND(AVG(M.MINUTOS), 2) AS MEDIA_MINUTOS,
            MAX(M.MINUTOS) AS MAIOR_ESPERA
          FROM MONITOR M
          ${whereSql}
          GROUP BY NVL(M.GERENTE, 'SEM GERENTE')
          ORDER BY QTD_ALERTAS DESC, QTD_CRITICOS DESC, MEDIA_MINUTOS DESC
        )
        WHERE ROWNUM <= 10
      `;

      const [resumoResult, listaResult, funcionariosResult, filasResult, gerentesResult] =
        await Promise.all([
          oracleExecute(sqlResumo, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT }),
          oracleExecute(
            sqlLista,
            { ...binds, offset, limit },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
          ),
          oracleExecute(sqlRankingFuncionarios, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT }),
          oracleExecute(sqlRankingFilas, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT }),
          oracleExecute(sqlRankingGerentes, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT }),
        ]);

      const resumo = (resumoResult.rows?.[0] || {}) as any;
      const total = Number(resumo.TOTAL || 0);

      return res.json({
        items: listaResult.rows || [],
        total,
        total_pages: Math.max(Math.ceil(total / limit), 1),
        page,
        limit,
        resumo: {
          total,
          criticos: Number(resumo.CRITICOS || 0),
          altos: Number(resumo.ALTOS || 0),
          baixos: Number(resumo.BAIXOS || 0),
          primeira_resposta: Number(resumo.PRIMEIRA_RESPOSTA || 0),
          espera_fila: Number(resumo.ESPERA_FILA || 0),
          alertas_email: Number(resumo.ALERTAS_EMAIL || 0),
          transferencias: Number(resumo.TRANSFERENCIAS || 0),
          tickets: Number(resumo.TICKETS || 0),
          media_minutos: Number(resumo.MEDIA_MINUTOS || 0),
          maior_espera: Number(resumo.MAIOR_ESPERA || 0),
        },
        ranking_funcionarios: funcionariosResult.rows || [],
        ranking_filas: filasResult.rows || [],
        ranking_gerentes: gerentesResult.rows || [],
      });
    } catch (err: any) {
      console.error("monitorAtendimentoBlip listar erro:", err);
      return res.status(500).json({
        error: "Falha ao listar monitor de atendimento Blip.",
        details: String(err?.message || err),
      });
    }
  },
};
