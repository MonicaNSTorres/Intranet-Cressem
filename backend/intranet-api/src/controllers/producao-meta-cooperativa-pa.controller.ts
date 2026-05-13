import { Request, Response } from "express";
import oracledb from "oracledb";
import { oracleExecute } from "../services/oracle.service";
import { parsePeriodo } from "../services/producao-meta-cooperativa-pa/periodo";
import { getSql, Tema } from "../services/producao-meta-cooperativa-pa/queries";

const TEMAS_VALIDOS: Tema[] = [
    "entrada_cooperados",
    "saldo_cooperados",
    "conta_corrente_abertas",
    "conta_corrente_ativas",
    "volume_transacoes",
    "liquidacao_baixa",
    "faturamento_sipag",
    "portabilidade",
    "seguro_gerais_novo",
    "seguro_gerais_renovado",
    "seguro_venda_nova",
    "seguro_arrecadacao",
    "saldo_previdencia_mi",
    "saldo_previdencia_vgbl",
    "emprestimo_bancoob",
    "consorcio",
];

function isTema(value: string): value is Tema {
    return TEMAS_VALIDOS.includes(value as Tema);
}

function normalizarTemaEntrada(value: string): Tema | null {
    const base = String(value || "").trim().toLowerCase();
    if (!base) return null;

    if (isTema(base)) return base;

    const semAcento = base.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (isTema(semAcento)) return semAcento;

    return null;
}

function normalizeKeys(row: any) {
    const normalized: any = {};

    Object.keys(row || {}).forEach((key) => {
        normalized[String(key).toLowerCase()] = row[key];
    });

    return normalized;
}

const SQL_DATAS_RELATORIO = `
WITH
BASE_TABELAS AS (
  SELECT 'ANALITICO_SEGUROS_ARRECADACAO' AS NM_TABELA FROM DUAL UNION ALL
  SELECT 'ANALITICO_SEGUROS_VENDA_NOVA' FROM DUAL UNION ALL
  SELECT 'CARTAO_CREDITO_BANCOOB_DIARIO' FROM DUAL UNION ALL
  SELECT 'CARTEIRA_CREDITO_DIARIO' FROM DUAL UNION ALL
  SELECT 'CONSORCIO_MENSAL_NOVO' FROM DUAL UNION ALL
  SELECT 'CONTA_CAPITAL_DIARIO_NOVO' FROM DUAL UNION ALL
  SELECT 'CONTA_CORRENTE_DIARIO_NOVO' FROM DUAL UNION ALL
  SELECT 'FATURAMENTO_SIPAG_DIARIO' FROM DUAL UNION ALL
  SELECT 'MOVIMENTO_LIQUIDACOES_BAIXA' FROM DUAL UNION ALL
  SELECT 'PORTABILIDADE_DIARIO' FROM DUAL UNION ALL
  SELECT 'PREVIDENCIA_MI_DIARIO_NOVO' FROM DUAL UNION ALL
  SELECT 'PREVIDENCIA_VGBL_PRODUCAO_DIARIO' FROM DUAL UNION ALL
  SELECT 'SEGUROS_GERAIS_PRODUCAO_DIARIO' FROM DUAL UNION ALL
  SELECT 'VOLUME_TRANSACOES_DIARIO' FROM DUAL
),
LOG AS (
  SELECT
    B.NM_TABELA,
    MAX(L.DT_CARGA) AS DT_CARGA
  FROM BASE_TABELAS B
  LEFT JOIN DBACRESSEM.LOG_CARGA_DIARIA L
    ON L.NM_TABELA = B.NM_TABELA
  GROUP BY B.NM_TABELA
),
MOV AS (
  SELECT
    'ANALITICO_SEGUROS_ARRECADACAO' AS NM_TABELA,
    MAX(
      CASE
        WHEN REGEXP_LIKE(TRIM(DT_COMPETENCIA), '^\\d{2}/\\d{2}/\\d{4}$')
          THEN TO_DATE(TRIM(DT_COMPETENCIA), 'DD/MM/YYYY')
        WHEN REGEXP_LIKE(TRIM(DT_COMPETENCIA), '^\\d{4}-\\d{2}-\\d{2}$')
          THEN TO_DATE(TRIM(DT_COMPETENCIA), 'YYYY-MM-DD')
      END
    ) AS DT_MOVIMENTO
  FROM DBACRESSEM.ANALITICO_SEGUROS_ARRECADACAO

  UNION ALL

  SELECT
    'ANALITICO_SEGUROS_VENDA_NOVA',
    MAX(
      CASE
        WHEN REGEXP_LIKE(TRIM(DT_ATUALIZACAO), '^\\d{2}/\\d{2}/\\d{4}$')
          THEN TO_DATE(TRIM(DT_ATUALIZACAO), 'DD/MM/YYYY')
        WHEN REGEXP_LIKE(TRIM(DT_ATUALIZACAO), '^\\d{2}/\\d{2}/\\d{4}\\s\\d{2}:\\d{2}:\\d{2}$')
          THEN TO_DATE(TRIM(DT_ATUALIZACAO), 'DD/MM/YYYY HH24:MI:SS')
        WHEN REGEXP_LIKE(TRIM(DT_ATUALIZACAO), '^\\d{4}-\\d{2}-\\d{2}$')
          THEN TO_DATE(TRIM(DT_ATUALIZACAO), 'YYYY-MM-DD')
        WHEN REGEXP_LIKE(TRIM(DT_ATUALIZACAO), '^\\d{4}-\\d{2}-\\d{2}\\s\\d{2}:\\d{2}:\\d{2}$')
          THEN TO_DATE(TRIM(DT_ATUALIZACAO), 'YYYY-MM-DD HH24:MI:SS')
      END
    )
  FROM DBACRESSEM.ANALITICO_SEGUROS_VENDA_NOVA

  UNION ALL

  SELECT
    'CARTAO_CREDITO_BANCOOB_DIARIO',
    MAX(
      CASE
        WHEN REGEXP_LIKE(TRIM(DT_MOVIMENTO), '^\\d{2}/\\d{2}/\\d{4}$')
          THEN TO_DATE(TRIM(DT_MOVIMENTO), 'DD/MM/YYYY')
        WHEN REGEXP_LIKE(TRIM(DT_MOVIMENTO), '^\\d{2}/\\d{2}/\\d{4}\\s\\d{2}:\\d{2}:\\d{2}$')
          THEN TO_DATE(TRIM(DT_MOVIMENTO), 'DD/MM/YYYY HH24:MI:SS')
        WHEN REGEXP_LIKE(TRIM(DT_MOVIMENTO), '^\\d{4}-\\d{2}-\\d{2}$')
          THEN TO_DATE(TRIM(DT_MOVIMENTO), 'YYYY-MM-DD')
        WHEN REGEXP_LIKE(TRIM(DT_MOVIMENTO), '^\\d{4}-\\d{2}-\\d{2}\\s\\d{2}:\\d{2}:\\d{2}$')
          THEN TO_DATE(TRIM(DT_MOVIMENTO), 'YYYY-MM-DD HH24:MI:SS')
      END
    )
  FROM DBACRESSEM.CARTAO_CREDITO_BANCOOB_DIARIO

  UNION ALL

  SELECT 'CARTEIRA_CREDITO_DIARIO', MAX(TRUNC(DT_COMPETENCIA))
  FROM DBACRESSEM.CARTEIRA_CREDITO_DIARIO

  UNION ALL

  SELECT
    'CONSORCIO_MENSAL_NOVO',
    MAX(
      CASE
        WHEN REGEXP_LIKE(TRIM(DT_ATUALIZACAO), '^\\d{2}/\\d{2}/\\d{4}$')
          THEN TO_DATE(TRIM(DT_ATUALIZACAO), 'DD/MM/YYYY')
        WHEN REGEXP_LIKE(TRIM(DT_ATUALIZACAO), '^\\d{4}-\\d{2}-\\d{2}$')
          THEN TO_DATE(TRIM(DT_ATUALIZACAO), 'YYYY-MM-DD')
      END
    )
  FROM DBACRESSEM.CONSORCIO_MENSAL_NOVO

  UNION ALL

  SELECT
    'CONTA_CAPITAL_DIARIO_NOVO',
    MAX(
      CASE
        WHEN REGEXP_LIKE(TRIM(DT_MOVIMENTO), '^\\d{2}/\\d{2}/\\d{4}$')
          THEN TO_DATE(TRIM(DT_MOVIMENTO), 'DD/MM/YYYY')
        WHEN REGEXP_LIKE(TRIM(DT_MOVIMENTO), '^\\d{4}-\\d{2}-\\d{2}$')
          THEN TO_DATE(TRIM(DT_MOVIMENTO), 'YYYY-MM-DD')
      END
    )
  FROM DBACRESSEM.CONTA_CAPITAL_DIARIO_NOVO

  UNION ALL

  SELECT
    'CONTA_CORRENTE_DIARIO_NOVO',
    MAX(
      CASE
        WHEN REGEXP_LIKE(TRIM(DT_MOVIMENTO), '^\\d{2}/\\d{2}/\\d{4}$')
          THEN TO_DATE(TRIM(DT_MOVIMENTO), 'DD/MM/YYYY')
        WHEN REGEXP_LIKE(TRIM(DT_MOVIMENTO), '^\\d{4}-\\d{2}-\\d{2}$')
          THEN TO_DATE(TRIM(DT_MOVIMENTO), 'YYYY-MM-DD')
      END
    )
  FROM DBACRESSEM.CONTA_CORRENTE_DIARIO_NOVO

  UNION ALL

  SELECT
    'FATURAMENTO_SIPAG_DIARIO',
    MAX(
      CASE
        WHEN REGEXP_LIKE(TRIM(DT_MOVIMENTO), '^\\d{2}/\\d{2}/\\d{4}$')
          THEN TO_DATE(TRIM(DT_MOVIMENTO), 'DD/MM/YYYY')
        WHEN REGEXP_LIKE(TRIM(DT_MOVIMENTO), '^\\d{4}-\\d{2}-\\d{2}$')
          THEN TO_DATE(TRIM(DT_MOVIMENTO), 'YYYY-MM-DD')
      END
    )
  FROM DBACRESSEM.FATURAMENTO_SIPAG_DIARIO

  UNION ALL

  SELECT 'MOVIMENTO_LIQUIDACOES_BAIXA', MAX(TRUNC(DT_PAGAMENTO))
  FROM DBACRESSEM.MOVIMENTO_LIQUIDACOES_BAIXA

  UNION ALL

  SELECT 'PORTABILIDADE_DIARIO', MAX(TRUNC(DT_COMPETENCIA))
  FROM DBACRESSEM.PORTABILIDADE_DIARIO

  UNION ALL

  SELECT
    'PREVIDENCIA_MI_DIARIO_NOVO',
    MAX(
      CASE
        WHEN REGEXP_LIKE(TRIM(DT_MOVIMENTO), '^\\d{2}/\\d{2}/\\d{4}$')
          THEN TO_DATE(TRIM(DT_MOVIMENTO), 'DD/MM/YYYY')
        WHEN REGEXP_LIKE(TRIM(DT_MOVIMENTO), '^\\d{4}-\\d{2}-\\d{2}$')
          THEN TO_DATE(TRIM(DT_MOVIMENTO), 'YYYY-MM-DD')
      END
    )
  FROM DBACRESSEM.PREVIDENCIA_MI_DIARIO_NOVO

  UNION ALL

  SELECT 'PREVIDENCIA_VGBL_PRODUCAO_DIARIO', MAX(TRUNC(DT_PROPOSTA))
  FROM DBACRESSEM.PREVIDENCIA_VGBL_PRODUCAO_DIARIO

  UNION ALL

  SELECT
    'SEGUROS_GERAIS_PRODUCAO_DIARIO',
    MAX(
      CASE
        WHEN REGEXP_LIKE(TRIM(DT_MOVIMENTO), '^\\d{2}/\\d{2}/\\d{4}$')
          THEN TO_DATE(TRIM(DT_MOVIMENTO), 'DD/MM/YYYY')
        WHEN REGEXP_LIKE(TRIM(DT_MOVIMENTO), '^\\d{4}-\\d{2}-\\d{2}$')
          THEN TO_DATE(TRIM(DT_MOVIMENTO), 'YYYY-MM-DD')
      END
    )
  FROM DBACRESSEM.SEGUROS_GERAIS_PRODUCAO_DIARIO

  UNION ALL

  SELECT
    'VOLUME_TRANSACOES_DIARIO',
    MAX(
      CASE
        WHEN REGEXP_LIKE(TRIM(DT_COMPETENCIA), '^\\d{2}/\\d{2}/\\d{4}$')
          THEN TO_DATE(TRIM(DT_COMPETENCIA), 'DD/MM/YYYY')
        WHEN REGEXP_LIKE(TRIM(DT_COMPETENCIA), '^\\d{4}-\\d{2}-\\d{2}$')
          THEN TO_DATE(TRIM(DT_COMPETENCIA), 'YYYY-MM-DD')
      END
    )
  FROM DBACRESSEM.VOLUME_TRANSACOES_DIARIO
)
SELECT
  B.NM_TABELA,
  L.DT_CARGA,
  M.DT_MOVIMENTO
FROM BASE_TABELAS B
LEFT JOIN LOG L
  ON L.NM_TABELA = B.NM_TABELA
LEFT JOIN MOV M
  ON M.NM_TABELA = B.NM_TABELA
ORDER BY B.NM_TABELA
`;

export const producaoMetaCooperativaPaController = {
    async listar(req: Request, res: Response) {
        try {
            const tema = normalizarTemaEntrada(String(req.query.tema || ""));
            const data = String(req.query.data || "").trim();

            if (!tema) {
                return res.status(400).json({ error: "Tema inválido." });
            }

            const periodo = parsePeriodo(data);

            if (!periodo?.dt_inicio || !periodo?.dt_fim) {
                return res.status(400).json({ error: "Período inválido." });
            }

            const sql = getSql(tema);

            const result = await oracleExecute(
                sql,
                {
                    dt_inicio: periodo.dt_inicio,
                    dt_fim: periodo.dt_fim,
                },
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            const rows = (result.rows || []).map((row: any) => normalizeKeys(row));

            return res.json(rows);
        } catch (err: any) {
            console.error("producaoMetaCooperativaPaController.listar erro:", err);
            return res.status(500).json({
                error: "Falha ao consultar relatório.",
                details: String(err?.message || err),
            });
        }
    },

    async datas(_req: Request, res: Response) {
        try {
            const result = await oracleExecute(
                SQL_DATAS_RELATORIO,
                {},
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            const rows = (result.rows || []).map((row: any) => normalizeKeys(row));

            return res.json(rows);
        } catch (err: any) {
            console.error("producaoMetaCooperativaPaController.datas erro:", err);
            return res.status(500).json({
                error: "Falha ao consultar datas do relatório.",
                details: String(err?.message || err),
            });
        }
    },
};
