export type Tema =
    | "entrada_cooperados"
    | "saldo_cooperados"
    | "conta_corrente_abertas"
    | "conta_corrente_ativas"
    | "volume_transacoes"
    | "liquidacao_baixa"
    | "faturamento_sipag"
    | "portabilidade"
    | "seguro_gerais_novo"
    | "seguro_gerais_renovado"
    | "seguro_venda_nova"
    | "seguro_arrecadacao"
    | "saldo_previdencia_mi"
    | "saldo_previdencia_vgbl"
    | "emprestimo_bancoob"
    | "consorcio";

export function getSql(tema: Tema) {
    switch (tema) {
        case "entrada_cooperados":
            return `
        WITH
        PARAMS AS (
          SELECT
            TO_DATE(:dt_inicio, 'DD/MM/YYYY') AS DT_INI_SEMANA,
            TO_DATE(:dt_fim, 'DD/MM/YYYY') AS DT_FIM_SEMANA
          FROM DUAL
        ),

        AA_BASE_ALL AS (
          SELECT
            AA.NR_PA,
            TRUNC(AA.DT_MATRICULA) AS DT_MOV,
            AA.NR_CONTA_CAPITAL
          FROM DBACRESSEM.CONTA_CAPITAL_DIARIO_NOVO_NORMALIZADO AA
          WHERE AA.DT_MATRICULA IS NOT NULL
            AND AA.NR_CONTA_CAPITAL IS NOT NULL
            AND AA.SN_CONTA_CAPITAL = 'ATIVO'

          UNION ALL

          SELECT
            4317 AS NR_PA,
            TRUNC(AA.DT_MATRICULA) AS DT_MOV,
            AA.NR_CONTA_CAPITAL
          FROM DBACRESSEM.CONTA_CAPITAL_DIARIO_NOVO_NORMALIZADO AA
          WHERE AA.DT_MATRICULA IS NOT NULL
            AND AA.NR_CONTA_CAPITAL IS NOT NULL
            AND AA.SN_CONTA_CAPITAL = 'ATIVO'
            AND REGEXP_LIKE(TRIM(AA.NR_COOPERATIVA), '^[0-9]+$')
            AND TO_NUMBER(TRIM(AA.NR_COOPERATIVA)) = 4317
        ),

        AA_BASE AS (
          SELECT
            B.*
          FROM AA_BASE_ALL B
          CROSS JOIN PARAMS PR
          WHERE
            (PR.DT_INI_SEMANA IS NULL AND PR.DT_FIM_SEMANA IS NULL)
            OR
            (
              B.DT_MOV BETWEEN NVL(PR.DT_INI_SEMANA, DATE '1900-01-01')
                           AND NVL(PR.DT_FIM_SEMANA, DATE '2999-12-31')
            )
        ),

        AA_ANO AS (
          SELECT
            NR_PA,
            EXTRACT(YEAR FROM DT_MOV) AS ANO,
            COUNT(DISTINCT NR_CONTA_CAPITAL) AS PRODUCAO_ANO
          FROM AA_BASE_ALL
          CROSS JOIN PARAMS PR
          WHERE DT_MOV BETWEEN
                TRUNC(NVL(PR.DT_FIM_SEMANA, SYSDATE), 'YYYY')
                AND NVL(PR.DT_FIM_SEMANA, SYSDATE)
          GROUP BY
            NR_PA,
            EXTRACT(YEAR FROM DT_MOV)
        ),

        AA_SEMANAL AS (
          SELECT
            B.NR_PA,
            EXTRACT(YEAR FROM B.DT_MOV) AS ANO,
            COUNT(DISTINCT B.NR_CONTA_CAPITAL) AS PRODUCAO_SEMANAL
          FROM AA_BASE B
          CROSS JOIN PARAMS PR
          WHERE
            (
              (PR.DT_INI_SEMANA IS NULL AND PR.DT_FIM_SEMANA IS NULL)
              AND B.DT_MOV BETWEEN TRUNC(SYSDATE,'IW') AND (TRUNC(SYSDATE,'IW') + 6)
            )
            OR
            (
              (PR.DT_INI_SEMANA IS NOT NULL OR PR.DT_FIM_SEMANA IS NOT NULL)
              AND B.DT_MOV BETWEEN NVL(PR.DT_INI_SEMANA, DATE '1900-01-01')
                              AND NVL(PR.DT_FIM_SEMANA, DATE '2999-12-31')
            )
          GROUP BY
            B.NR_PA,
            EXTRACT(YEAR FROM B.DT_MOV)
        ),

        META AS (
          SELECT
            MT.NR_PA,
            TO_NUMBER(MT.DT_ANO_META) AS ANO,
            SUM(MT.QTD_META) AS META_ANO
          FROM DBACRESSEM.META_TOTAL_NOVA MT
          CROSS JOIN PARAMS PR
          WHERE UPPER(MT.NM_PRODUTO) IN ('COOPERADOS NOVOS')
            AND TO_NUMBER(MT.DT_ANO_META) = EXTRACT(YEAR FROM NVL(PR.DT_FIM_SEMANA, SYSDATE))
          GROUP BY
            MT.NR_PA,
            TO_NUMBER(MT.DT_ANO_META)
        )

        SELECT
          P.NR_PA AS "numero_pa",
          P.NM_PA AS "nome_pa",

          CASE
            WHEN P.NR_PA = 95 THEN 0
            ELSE NVL(SW.PRODUCAO_SEMANAL, 0)
          END AS "producao_semanal",

          ROUND(NVL(M.META_ANO, 0) / 52, 2) AS "meta_semanal",

          CASE
            WHEN P.NR_PA = 95 THEN 0
            WHEN NVL(M.META_ANO, 0) > 0
              THEN ROUND((NVL(SW.PRODUCAO_SEMANAL, 0) / (M.META_ANO / 52)) * 100, 2)
            ELSE 0
          END AS "porcentagem_semanal",

          CASE
            WHEN P.NR_PA = 95 THEN 0
            ELSE (NVL(SW.PRODUCAO_SEMANAL, 0) - ROUND(NVL(M.META_ANO, 0) / 52, 2))
          END AS "gap_semanal",

          CASE
            WHEN P.NR_PA = 95 THEN 0
            ELSE NVL(AY.PRODUCAO_ANO, 0)
          END AS "producao_ano",

          NVL(M.META_ANO, 0) AS "meta_2026",

          CASE
            WHEN P.NR_PA = 95 THEN 0
            WHEN NVL(M.META_ANO, 0) > 0
              THEN ROUND((NVL(AY.PRODUCAO_ANO, 0) / M.META_ANO) * 100, 2)
            ELSE 0
          END AS "perc_meta_realizada",

          CASE
            WHEN P.NR_PA = 95 THEN 0
            ELSE NVL(AY.PRODUCAO_ANO, 0) - NVL(M.META_ANO, 0)
          END AS "falta_para_meta"

        FROM META M
        JOIN DBACRESSEM.PA P
          ON P.NR_PA = M.NR_PA

        LEFT JOIN AA_ANO AY
          ON AY.NR_PA = M.NR_PA
         AND AY.ANO = M.ANO

        LEFT JOIN AA_SEMANAL SW
          ON SW.NR_PA = M.NR_PA
         AND SW.ANO = M.ANO

        ORDER BY P.NR_PA
      `;

        case "conta_corrente_abertas":
            return `
        WITH
        PARAMS AS (
          SELECT
            TO_DATE(:dt_inicio, 'DD/MM/YYYY') AS DT_INI_SEMANA,
            TO_DATE(:dt_fim, 'DD/MM/YYYY') AS DT_FIM_SEMANA
          FROM DUAL
        ),

        CC_BASE_ALL AS (
          SELECT
            C.NR_PA,
            C.DT_ABERTURA_CONTA,
            C.NR_CONTA_CORRENTE,
            C.NM_USUARIO_RESPONSAVEL_CADASTRO
          FROM DBACRESSEM.CONTA_CORRENTE_DIARIO_NOVO_NORMALIZADO C
          CROSS JOIN PARAMS PR
          WHERE C.DT_ABERTURA_CONTA IS NOT NULL
            AND C.NM_MODALIDADE_CONTA IN ('CONTA CORRENTE')
            AND C.TP_CONTA_CORRENTE IN ('PESSOAS FÍSICAS', 'PESSOAS JURÍDICAS')
            AND C.NM_SITUACAO_CONTA_CORRENTE IN ('ATIVA', 'ATIVA BLOQUEADA JUDICIALMENTE', 'ATIVA BLOQUEADA')
            AND (
              PR.DT_INI_SEMANA IS NULL
              OR PR.DT_FIM_SEMANA IS NULL
              OR TRUNC(C.DT_ABERTURA_CONTA) BETWEEN TRUNC(PR.DT_INI_SEMANA) AND TRUNC(PR.DT_FIM_SEMANA)
            )
            AND C.NR_PA <> 4317

          UNION ALL

          SELECT
            4317 AS NR_PA,
            C.DT_ABERTURA_CONTA,
            C.NR_CONTA_CORRENTE,
            C.NM_USUARIO_RESPONSAVEL_CADASTRO
          FROM DBACRESSEM.CONTA_CORRENTE_DIARIO_NOVO_NORMALIZADO C
          CROSS JOIN PARAMS PR
          WHERE C.DT_ABERTURA_CONTA IS NOT NULL
            AND C.NM_MODALIDADE_CONTA IN ('CONTA CORRENTE')
            AND C.TP_CONTA_CORRENTE IN ('PESSOAS FÍSICAS', 'PESSOAS JURÍDICAS')
            AND C.NM_SITUACAO_CONTA_CORRENTE IN ('ATIVA', 'ATIVA BLOQUEADA JUDICIALMENTE', 'ATIVA BLOQUEADA')
            AND (
              PR.DT_INI_SEMANA IS NULL
              OR PR.DT_FIM_SEMANA IS NULL
              OR TRUNC(C.DT_ABERTURA_CONTA) BETWEEN TRUNC(PR.DT_INI_SEMANA) AND TRUNC(PR.DT_FIM_SEMANA)
            )
            AND C.NR_PA <> 4317
            AND REGEXP_LIKE(TRIM(C.NR_COOPERATIVA), '^[0-9]+$')
            AND TO_NUMBER(TRIM(C.NR_COOPERATIVA)) = 4317
        ),

        CC_ANO AS (
          SELECT
            NR_PA,
            EXTRACT(YEAR FROM DT_ABERTURA_CONTA) AS ANO,
            COUNT(DISTINCT NR_CONTA_CORRENTE) AS PRODUCAO_ANO
          FROM CC_BASE_ALL
          GROUP BY
            NR_PA,
            EXTRACT(YEAR FROM DT_ABERTURA_CONTA)
        ),

        CC_ANO_USUARIOS_PARA_95 AS (
          SELECT
            EXTRACT(YEAR FROM DT_ABERTURA_CONTA) AS ANO,
            COUNT(DISTINCT NR_CONTA_CORRENTE) AS QTD_USUARIOS_PARA_95
          FROM CC_BASE_ALL
          WHERE UPPER(TRIM(NM_USUARIO_RESPONSAVEL_CADASTRO)) IN (
            UPPER('Christian Jesus Siqueira'),
            UPPER('YASMIN DE QUEIROZ LEMOS RIBEIRO'),
            UPPER('GUSTAVO COLAFRANCESCO AMIM SOARES'),
            UPPER('THIAGO SILVERIO DOS REIS')
          )
          GROUP BY EXTRACT(YEAR FROM DT_ABERTURA_CONTA)
        ),

        CC_MES AS (
          SELECT
            NR_PA,
            EXTRACT(YEAR FROM DT_ABERTURA_CONTA) AS ANO,
            EXTRACT(MONTH FROM DT_ABERTURA_CONTA) AS MES,
            COUNT(DISTINCT NR_CONTA_CORRENTE) AS PRODUCAO_MES
          FROM CC_BASE_ALL
          GROUP BY
            NR_PA,
            EXTRACT(YEAR FROM DT_ABERTURA_CONTA),
            EXTRACT(MONTH FROM DT_ABERTURA_CONTA)
        ),

        CC_SEMANA AS (
          SELECT
            NR_PA,
            EXTRACT(YEAR FROM DT_ABERTURA_CONTA) AS ANO,
            COUNT(DISTINCT NR_CONTA_CORRENTE) AS PRODUCAO_SEMANAL
          FROM CC_BASE_ALL
          GROUP BY
            NR_PA,
            EXTRACT(YEAR FROM DT_ABERTURA_CONTA)
        ),

        META AS (
          SELECT
            NR_PA,
            TO_NUMBER(DT_ANO_META) AS ANO,
            QTD_META AS META_ANO
          FROM DBACRESSEM.META_TOTAL_NOVA
          WHERE UPPER(NM_PRODUTO) = 'CONTA CORRENTE NOVA'
        )

        SELECT
          PA.NR_PA AS "numero_pa",
          PA.NM_PA AS "nome_pa",

          NVL(SW.PRODUCAO_SEMANAL, 0) AS "producao_semanal",

          ROUND(NVL(M.META_ANO, 0) / 52, 0) AS "meta_semanal",

          CASE
            WHEN ROUND(NVL(M.META_ANO, 0) / 52, 0) > 0
              THEN ROUND((NVL(SW.PRODUCAO_SEMANAL, 0) / ROUND(NVL(M.META_ANO, 0) / 52, 0)) * 100, 2)
            ELSE 0
          END AS "porcentagem_semanal",

          (NVL(SW.PRODUCAO_SEMANAL, 0) - ROUND(NVL(M.META_ANO, 0) / 52, 0)) AS "gap_semanal",

          CASE
            WHEN PA.NR_PA = 95
              THEN NVL(AY.PRODUCAO_ANO, 0) + NVL(U95.QTD_USUARIOS_PARA_95, 0)
            WHEN PA.NR_PA = 0
              THEN NVL(AY.PRODUCAO_ANO, 0) - NVL(U95.QTD_USUARIOS_PARA_95, 0)
            ELSE NVL(AY.PRODUCAO_ANO, 0)
          END AS "producao_ano",

          ROUND(NVL(M.META_ANO, 0), 0) AS "meta_ano",

          CASE
            WHEN NVL(M.META_ANO, 0) > 0
              THEN ROUND(
                (
                  (CASE
                     WHEN PA.NR_PA = 95
                       THEN NVL(AY.PRODUCAO_ANO, 0) + NVL(U95.QTD_USUARIOS_PARA_95, 0)
                     WHEN PA.NR_PA = 0
                       THEN NVL(AY.PRODUCAO_ANO, 0) - NVL(U95.QTD_USUARIOS_PARA_95, 0)
                     ELSE NVL(AY.PRODUCAO_ANO, 0)
                   END) / M.META_ANO
                ) * 100
              , 2)
            ELSE 0
          END AS "perc_meta_realizada",

          (
            (CASE
               WHEN PA.NR_PA = 95
                 THEN NVL(AY.PRODUCAO_ANO, 0) + NVL(U95.QTD_USUARIOS_PARA_95, 0)
               WHEN PA.NR_PA = 0
                 THEN NVL(AY.PRODUCAO_ANO, 0) - NVL(U95.QTD_USUARIOS_PARA_95, 0)
               ELSE NVL(AY.PRODUCAO_ANO, 0)
             END)
            - NVL(M.META_ANO, 0)
          ) AS "falta_para_meta"

        FROM META M
        JOIN DBACRESSEM.PA PA
          ON PA.NR_PA = M.NR_PA
        CROSS JOIN PARAMS PR

        LEFT JOIN CC_ANO AY
          ON AY.NR_PA = M.NR_PA
         AND AY.ANO = M.ANO

        LEFT JOIN CC_ANO_USUARIOS_PARA_95 U95
          ON U95.ANO = M.ANO

        LEFT JOIN CC_SEMANA SW
          ON SW.NR_PA = M.NR_PA
         AND SW.ANO = M.ANO

        ORDER BY PA.NR_PA
      `;

        case "conta_corrente_ativas":
            return `
        WITH
        PARAMS AS (
          SELECT
            TO_DATE(:dt_inicio, 'DD/MM/YYYY') AS DT_INI_SEMANA,
            TO_DATE(:dt_fim, 'DD/MM/YYYY') AS DT_FIM_SEMANA
          FROM DUAL
        ),

        CC_BASE_SEMANA_ALL AS (
          SELECT
            C.NR_PA,
            TRUNC(TO_DATE(TRIM(C.DT_MOVIMENTO), 'DD/MM/YYYY')) AS DT_MOV,
            C.NR_CONTA_CORRENTE
          FROM DBACRESSEM.CONTA_CORRENTE_DIARIO_NOVO C
          CROSS JOIN PARAMS PR
          WHERE C.DT_MOVIMENTO IS NOT NULL
            AND REGEXP_LIKE(TRIM(C.DT_MOVIMENTO), '^\\d{2}/\\d{2}/\\d{4}$')
            AND C.NM_MODALIDADE_CONTA IN ('CONTA CORRENTE')
            AND C.TP_CONTA_CORRENTE IN ('PESSOAS FÍSICAS', 'PESSOAS JURÍDICAS')
            AND C.NM_SITUACAO_CONTA_CORRENTE IN ('ATIVA', 'ATIVA BLOQUEADA JUDICIALMENTE', 'ATIVA BLOQUEADA')
            AND (
              (PR.DT_INI_SEMANA IS NULL AND PR.DT_FIM_SEMANA IS NULL)
              OR (
                TRUNC(TO_DATE(TRIM(C.DT_MOVIMENTO), 'DD/MM/YYYY')) BETWEEN
                NVL(TRUNC(PR.DT_INI_SEMANA), DATE '1900-01-01')
                AND NVL(TRUNC(PR.DT_FIM_SEMANA), DATE '2999-12-31')
              )
            )
            AND C.NR_PA <> 4317

          UNION ALL

          SELECT
            4317 AS NR_PA,
            TRUNC(TO_DATE(TRIM(C.DT_MOVIMENTO), 'DD/MM/YYYY')) AS DT_MOV,
            C.NR_CONTA_CORRENTE
          FROM DBACRESSEM.CONTA_CORRENTE_DIARIO_NOVO C
          CROSS JOIN PARAMS PR
          WHERE C.DT_MOVIMENTO IS NOT NULL
            AND REGEXP_LIKE(TRIM(C.DT_MOVIMENTO), '^\\d{2}/\\d{2}/\\d{4}$')
            AND C.NM_MODALIDADE_CONTA IN ('CONTA CORRENTE')
            AND C.TP_CONTA_CORRENTE IN ('PESSOAS FÍSICAS', 'PESSOAS JURÍDICAS')
            AND C.NM_SITUACAO_CONTA_CORRENTE IN ('ATIVA', 'ATIVA BLOQUEADA JUDICIALMENTE', 'ATIVA BLOQUEADA')
            AND (
              (PR.DT_INI_SEMANA IS NULL AND PR.DT_FIM_SEMANA IS NULL)
              OR (
                TRUNC(TO_DATE(TRIM(C.DT_MOVIMENTO), 'DD/MM/YYYY')) BETWEEN
                NVL(TRUNC(PR.DT_INI_SEMANA), DATE '1900-01-01')
                AND NVL(TRUNC(PR.DT_FIM_SEMANA), DATE '2999-12-31')
              )
            )
            AND REGEXP_LIKE(TRIM(C.NR_COOPERATIVA), '^[0-9]+$')
            AND TO_NUMBER(TRIM(C.NR_COOPERATIVA)) = 4317
        ),

        CC_BASE_ANO_ALL AS (
          SELECT
            C.NR_PA,
            TRUNC(TO_DATE(TRIM(C.DT_MOVIMENTO), 'DD/MM/YYYY')) AS DT_MOV,
            C.NR_CONTA_CORRENTE
          FROM DBACRESSEM.CONTA_CORRENTE_DIARIO_NOVO C
          WHERE C.DT_MOVIMENTO IS NOT NULL
            AND REGEXP_LIKE(TRIM(C.DT_MOVIMENTO), '^\\d{2}/\\d{2}/\\d{4}$')
            AND C.NM_MODALIDADE_CONTA IN ('CONTA CORRENTE')
            AND C.TP_CONTA_CORRENTE IN ('PESSOAS FÍSICAS', 'PESSOAS JURÍDICAS')
            AND C.NM_SITUACAO_CONTA_CORRENTE IN ('ATIVA', 'ATIVA BLOQUEADA JUDICIALMENTE', 'ATIVA BLOQUEADA')
            AND C.NR_PA <> 4317

          UNION ALL

          SELECT
            4317 AS NR_PA,
            TRUNC(TO_DATE(TRIM(C.DT_MOVIMENTO), 'DD/MM/YYYY')) AS DT_MOV,
            C.NR_CONTA_CORRENTE
          FROM DBACRESSEM.CONTA_CORRENTE_DIARIO_NOVO C
          WHERE C.DT_MOVIMENTO IS NOT NULL
            AND REGEXP_LIKE(TRIM(C.DT_MOVIMENTO), '^\\d{2}/\\d{2}/\\d{4}$')
            AND C.NM_MODALIDADE_CONTA IN ('CONTA CORRENTE')
            AND C.TP_CONTA_CORRENTE IN ('PESSOAS FÍSICAS', 'PESSOAS JURÍDICAS')
            AND C.NM_SITUACAO_CONTA_CORRENTE IN ('ATIVA', 'ATIVA BLOQUEADA JUDICIALMENTE', 'ATIVA BLOQUEADA')
            AND REGEXP_LIKE(TRIM(C.NR_COOPERATIVA), '^[0-9]+$')
            AND TO_NUMBER(TRIM(C.NR_COOPERATIVA)) = 4317
        ),

        CC_ANO AS (
          SELECT
            X.NR_PA,
            EXTRACT(YEAR FROM NVL(PR.DT_FIM_SEMANA, SYSDATE)) AS ANO,
            COUNT(DISTINCT X.NR_CONTA_CORRENTE) AS PRODUCAO_ANO
          FROM (
            SELECT
              B.NR_PA,
              B.NR_CONTA_CORRENTE,
              MIN(B.DT_MOV) AS DT_PRIMEIRO_MOV
            FROM CC_BASE_ANO_ALL B
            GROUP BY
              B.NR_PA,
              B.NR_CONTA_CORRENTE
          ) X
          CROSS JOIN PARAMS PR
          WHERE X.DT_PRIMEIRO_MOV BETWEEN TRUNC(NVL(PR.DT_FIM_SEMANA, SYSDATE), 'YYYY')
                                     AND NVL(PR.DT_FIM_SEMANA, SYSDATE)
          GROUP BY
            X.NR_PA,
            EXTRACT(YEAR FROM NVL(PR.DT_FIM_SEMANA, SYSDATE))
        ),

        CC_SEMANA AS (
          SELECT
            B.NR_PA,
            EXTRACT(YEAR FROM B.DT_MOV) AS ANO,
            TO_NUMBER(TO_CHAR(B.DT_MOV, 'IW')) AS SEMANA,
            COUNT(DISTINCT B.NR_CONTA_CORRENTE) AS PRODUCAO_SEMANAL
          FROM CC_BASE_SEMANA_ALL B
          GROUP BY
            B.NR_PA,
            EXTRACT(YEAR FROM B.DT_MOV),
            TO_NUMBER(TO_CHAR(B.DT_MOV, 'IW'))
        ),

        META AS (
          SELECT
            NR_PA,
            TO_NUMBER(DT_ANO_META) AS ANO,
            QTD_META AS META_ANO
          FROM DBACRESSEM.META_TOTAL_NOVA
          WHERE UPPER(NM_PRODUTO) = 'CONTA CORRENTE ATIVA'
        )

        SELECT
          PA.NR_PA AS "numero_pa",
          PA.NM_PA AS "nome_pa",

          NVL(SW.PRODUCAO_SEMANAL, 0) AS "producao_semanal",

          ROUND(NVL(M.META_ANO, 0) / 52, 0) AS "meta_semanal_ano",

          (NVL(SW.PRODUCAO_SEMANAL, 0) - ROUND(NVL(M.META_ANO, 0) / 52, 0)) AS "gap_semanal",

          NVL(AY.PRODUCAO_ANO, 0) AS "producao_ano",

          ROUND(NVL(M.META_ANO, 0), 0) AS "meta_ano",

          CASE
            WHEN NVL(M.META_ANO, 0) > 0
              THEN ROUND((NVL(AY.PRODUCAO_ANO, 0) / M.META_ANO) * 100, 2)
            ELSE 0
          END AS "perc_meta_realizada",

          (NVL(AY.PRODUCAO_ANO, 0) - ROUND(NVL(M.META_ANO, 0), 0)) AS "falta_para_meta"

        FROM META M
        JOIN DBACRESSEM.PA PA
          ON PA.NR_PA = M.NR_PA
        CROSS JOIN PARAMS PR

        LEFT JOIN CC_ANO AY
          ON AY.NR_PA = M.NR_PA
         AND AY.ANO = M.ANO

        LEFT JOIN CC_SEMANA SW
          ON SW.NR_PA = M.NR_PA
         AND SW.ANO = M.ANO
         AND SW.SEMANA = TO_NUMBER(TO_CHAR(NVL(PR.DT_INI_SEMANA, SYSDATE), 'IW'))

        ORDER BY PA.NR_PA, M.ANO
      `;

        case "saldo_cooperados":
            return `
        WITH
        PARAMS AS (
          SELECT
            TO_DATE(:dt_inicio, 'DD/MM/YYYY') AS DT_INI_SEMANA,
            TO_DATE(:dt_fim, 'DD/MM/YYYY') AS DT_FIM_SEMANA
          FROM DUAL
        ),

        CCD_BASE AS (
          SELECT
            CCD.NR_PA,
            TO_DATE(TRIM(CCD.DT_MOVIMENTO), 'DD/MM/YYYY') AS DT_MOV,
            CCD.NR_CONTA_CAPITAL,
            CCD.SN_CONTA_CAPITAL
          FROM DBACRESSEM.CONTA_CAPITAL_DIARIO_NOVO CCD
          CROSS JOIN PARAMS PR
          WHERE CCD.DT_MOVIMENTO IS NOT NULL
            AND CCD.NR_CONTA_CAPITAL IS NOT NULL
            AND UPPER(TRIM(CCD.SN_CONTA_CAPITAL)) = 'ATIVO'
            AND CCD.NR_PA <> 4317
            AND (
              (PR.DT_INI_SEMANA IS NULL AND PR.DT_FIM_SEMANA IS NULL)
              OR TO_DATE(TRIM(CCD.DT_MOVIMENTO), 'DD/MM/YYYY')
                 BETWEEN NVL(PR.DT_INI_SEMANA, DATE '1900-01-01')
                     AND NVL(PR.DT_FIM_SEMANA, DATE '2999-12-31')
            )

          UNION ALL

          SELECT
            4317 AS NR_PA,
            TO_DATE(TRIM(CCD.DT_MOVIMENTO), 'DD/MM/YYYY') AS DT_MOV,
            CCD.NR_CONTA_CAPITAL,
            CCD.SN_CONTA_CAPITAL
          FROM DBACRESSEM.CONTA_CAPITAL_DIARIO_NOVO CCD
          CROSS JOIN PARAMS PR
          WHERE CCD.DT_MOVIMENTO IS NOT NULL
            AND CCD.NR_CONTA_CAPITAL IS NOT NULL
            AND UPPER(TRIM(CCD.SN_CONTA_CAPITAL)) = 'ATIVO'
            AND REGEXP_LIKE(TRIM(CCD.NR_COOPERATIVA), '^[0-9]+$')
            AND TO_NUMBER(TRIM(CCD.NR_COOPERATIVA)) = 4317
            AND (
              (PR.DT_INI_SEMANA IS NULL AND PR.DT_FIM_SEMANA IS NULL)
              OR TO_DATE(TRIM(CCD.DT_MOVIMENTO), 'DD/MM/YYYY')
                 BETWEEN NVL(PR.DT_INI_SEMANA, DATE '1900-01-01')
                     AND NVL(PR.DT_FIM_SEMANA, DATE '2999-12-31')
            )
        ),

        CCD_ULT_DIA_MES AS (
          SELECT
            NR_PA,
            EXTRACT(YEAR FROM DT_MOV) AS ANO,
            EXTRACT(MONTH FROM DT_MOV) AS MES,
            MAX(DT_MOV) AS DT_ULT_MES
          FROM CCD_BASE
          GROUP BY
            NR_PA,
            EXTRACT(YEAR FROM DT_MOV),
            EXTRACT(MONTH FROM DT_MOV)
        ),

        CCD_SALDO_MES AS (
          SELECT
            B.NR_PA,
            EXTRACT(YEAR FROM B.DT_MOV) AS ANO,
            EXTRACT(MONTH FROM B.DT_MOV) AS MES,
            COUNT(DISTINCT B.NR_CONTA_CAPITAL) AS SALDO_MES
          FROM CCD_BASE B
          JOIN CCD_ULT_DIA_MES U
            ON U.NR_PA = B.NR_PA
           AND U.ANO = EXTRACT(YEAR FROM B.DT_MOV)
           AND U.MES = EXTRACT(MONTH FROM B.DT_MOV)
           AND U.DT_ULT_MES = B.DT_MOV
          GROUP BY
            B.NR_PA,
            EXTRACT(YEAR FROM B.DT_MOV),
            EXTRACT(MONTH FROM B.DT_MOV)
        ),

        CCD_ULT_DIA_ANO AS (
          SELECT
            NR_PA,
            EXTRACT(YEAR FROM DT_MOV) AS ANO,
            MAX(DT_MOV) AS DT_ULT_ANO
          FROM CCD_BASE
          GROUP BY
            NR_PA,
            EXTRACT(YEAR FROM DT_MOV)
        ),

        CCD_SALDO_ANO AS (
          SELECT
            B.NR_PA,
            EXTRACT(YEAR FROM B.DT_MOV) AS ANO,
            COUNT(DISTINCT B.NR_CONTA_CAPITAL) AS SALDO_ANO
          FROM CCD_BASE B
          JOIN CCD_ULT_DIA_ANO U
            ON U.NR_PA = B.NR_PA
           AND U.ANO = EXTRACT(YEAR FROM B.DT_MOV)
           AND U.DT_ULT_ANO = B.DT_MOV
          GROUP BY
            B.NR_PA,
            EXTRACT(YEAR FROM B.DT_MOV)
        ),

        META AS (
          SELECT
            MT.NR_PA,
            TO_NUMBER(MT.DT_ANO_META) AS ANO,
            MT.QTD_META AS META_ANO
          FROM DBACRESSEM.META_TOTAL_NOVA MT
          WHERE UPPER(MT.NM_PRODUTO) IN ('COOPERADOS SALDO')
            AND MT.NR_PA <> 4317

          UNION ALL

          SELECT
            4317 AS NR_PA,
            TO_NUMBER(MT.DT_ANO_META) AS ANO,
            MT.QTD_META AS META_ANO
          FROM DBACRESSEM.META_TOTAL_NOVA MT
          WHERE UPPER(MT.NM_PRODUTO) IN ('COOPERADOS SALDO')
            AND MT.NR_PA = 4317
        )

        SELECT
          P.NR_PA AS "numero_pa",
          P.NM_PA AS "nome_pa",

          NVL(JAN.SALDO_MES, 0) AS "feito_no_mes_vigente",

          NVL(M.META_ANO, 0) AS "meta_2026",

          CASE
            WHEN NVL(M.META_ANO, 0) > 0
              THEN ROUND((NVL(AY.SALDO_ANO, 0) / M.META_ANO) * 100, 2)
            ELSE 0
          END AS "perc_meta_realizada",

          (NVL(AY.SALDO_ANO, 0) - NVL(M.META_ANO, 0)) AS "falta_para_meta"

        FROM META M
        JOIN DBACRESSEM.PA P
          ON P.NR_PA = M.NR_PA

        CROSS JOIN PARAMS PR

        LEFT JOIN CCD_SALDO_ANO AY
          ON AY.NR_PA = M.NR_PA
         AND AY.ANO = M.ANO

        LEFT JOIN CCD_SALDO_MES JAN
          ON JAN.NR_PA = M.NR_PA
         AND JAN.ANO = EXTRACT(YEAR FROM NVL(PR.DT_FIM_SEMANA, SYSDATE))
         AND JAN.MES = EXTRACT(MONTH FROM NVL(PR.DT_FIM_SEMANA, SYSDATE))

        ORDER BY P.NR_PA, M.ANO
      `;

        case "volume_transacoes":
            return `
    WITH
    PARAMS AS (
      SELECT
        TO_DATE(:dt_inicio, 'DD/MM/YYYY') AS DT_INI_SEMANA,
        TO_DATE(:dt_fim, 'DD/MM/YYYY') AS DT_FIM_SEMANA
      FROM DUAL
    ),

    VTD_BASE AS (
      SELECT
        TO_NUMBER(VTD.CD_UNIDADE_INSTITUICAO) AS NR_PA,
        TO_DATE(TRIM(VTD.DT_COMPETENCIA), 'DD/MM/YYYY') AS DT_MOV,
        NVL(VTD.VL_TRANSACAO, 0) AS VL_TRANSACAO_NUM
      FROM DBACRESSEM.VOLUME_TRANSACOES_DIARIO VTD
      CROSS JOIN PARAMS PR
      WHERE VTD.DT_COMPETENCIA IS NOT NULL
        AND UPPER(VTD.NM_FUNCAO_TRANSACAO) = 'CRÉDITO'
        AND (
          (PR.DT_INI_SEMANA IS NULL AND PR.DT_FIM_SEMANA IS NULL)
          OR
          TO_DATE(TRIM(VTD.DT_COMPETENCIA), 'DD/MM/YYYY')
            BETWEEN NVL(PR.DT_INI_SEMANA, DATE '1900-01-01')
                AND NVL(PR.DT_FIM_SEMANA, DATE '2999-12-31')
        )

      UNION ALL

      SELECT
        4317 AS NR_PA,
        TO_DATE(TRIM(VTD.DT_COMPETENCIA), 'DD/MM/YYYY') AS DT_MOV,
        NVL(VTD.VL_TRANSACAO, 0) AS VL_TRANSACAO_NUM
      FROM DBACRESSEM.VOLUME_TRANSACOES_DIARIO VTD
      CROSS JOIN PARAMS PR
      WHERE VTD.DT_COMPETENCIA IS NOT NULL
        AND UPPER(VTD.NM_FUNCAO_TRANSACAO) = 'CRÉDITO'
        AND VTD.NR_SINGULAR = 4317
        AND (
          (PR.DT_INI_SEMANA IS NULL AND PR.DT_FIM_SEMANA IS NULL)
          OR
          TO_DATE(TRIM(VTD.DT_COMPETENCIA), 'DD/MM/YYYY')
            BETWEEN NVL(PR.DT_INI_SEMANA, DATE '1900-01-01')
                AND NVL(PR.DT_FIM_SEMANA, DATE '2999-12-31')
        )
    ),

    VTD_ANO AS (
      SELECT
        X.NR_PA,
        EXTRACT(YEAR FROM NVL(PR.DT_FIM_SEMANA, SYSDATE)) AS ANO,
        SUM(X.VL_TRANSACAO_NUM) AS PRODUCAO_ANO
      FROM (
        SELECT
          TO_NUMBER(VTD.CD_UNIDADE_INSTITUICAO) AS NR_PA,
          NVL(VTD.VL_TRANSACAO, 0) AS VL_TRANSACAO_NUM,
          TO_DATE(TRIM(VTD.DT_COMPETENCIA), 'DD/MM/YYYY') AS DT_MOV
        FROM DBACRESSEM.VOLUME_TRANSACOES_DIARIO VTD
        WHERE VTD.DT_COMPETENCIA IS NOT NULL
          AND UPPER(VTD.NM_FUNCAO_TRANSACAO) = 'CRÉDITO'

        UNION ALL

        SELECT
          4317 AS NR_PA,
          NVL(VTD.VL_TRANSACAO, 0) AS VL_TRANSACAO_NUM,
          TO_DATE(TRIM(VTD.DT_COMPETENCIA), 'DD/MM/YYYY') AS DT_MOV
        FROM DBACRESSEM.VOLUME_TRANSACOES_DIARIO VTD
        WHERE VTD.DT_COMPETENCIA IS NOT NULL
          AND UPPER(VTD.NM_FUNCAO_TRANSACAO) = 'CRÉDITO'
          AND VTD.NR_SINGULAR = 4317
      ) X
      CROSS JOIN PARAMS PR
      WHERE X.DT_MOV <= NVL(PR.DT_FIM_SEMANA, SYSDATE)
        AND X.DT_MOV >= TRUNC(NVL(PR.DT_FIM_SEMANA, SYSDATE), 'YYYY')
      GROUP BY
        X.NR_PA,
        EXTRACT(YEAR FROM NVL(PR.DT_FIM_SEMANA, SYSDATE))
    ),

    VTD_SEMANA AS (
      SELECT
        B.NR_PA,
        EXTRACT(YEAR FROM B.DT_MOV) AS ANO,
        SUM(
          CASE
            WHEN PR.DT_INI_SEMANA IS NULL
             AND PR.DT_FIM_SEMANA IS NULL
             AND B.DT_MOV BETWEEN TRUNC(SYSDATE,'IW') AND TRUNC(SYSDATE,'IW') + 6
             AND EXTRACT(YEAR FROM B.DT_MOV) = EXTRACT(YEAR FROM SYSDATE)
            THEN B.VL_TRANSACAO_NUM
            WHEN PR.DT_INI_SEMANA IS NOT NULL
              OR PR.DT_FIM_SEMANA IS NOT NULL
            THEN B.VL_TRANSACAO_NUM
            ELSE 0
          END
        ) AS PRODUCAO_SEMANAL
      FROM VTD_BASE B
      CROSS JOIN PARAMS PR
      GROUP BY
        B.NR_PA,
        EXTRACT(YEAR FROM B.DT_MOV)
    ),

    META AS (
      SELECT
        MT.NR_PA,
        TO_NUMBER(MT.DT_ANO_META) AS ANO,
        SUM(MT.QTD_META) AS META_ANO
      FROM DBACRESSEM.META_TOTAL_NOVA MT
      WHERE UPPER(MT.NM_PRODUTO) IN ('SICOOBCARD')
      GROUP BY
        MT.NR_PA,
        TO_NUMBER(MT.DT_ANO_META)
    )

    SELECT
      P.NR_PA AS "numero_pa",
      P.NM_PA AS "nome_pa",

      TO_CHAR(
        NVL(SW.PRODUCAO_SEMANAL, 0),
        'FML999G999G999G990D00',
        'NLS_NUMERIC_CHARACTERS='',.'' NLS_CURRENCY=''R$ '''
      ) AS "producao_semanal",

      TO_CHAR(
        ROUND(M.META_ANO / 52, 2),
        'FML999G999G999G990D00',
        'NLS_NUMERIC_CHARACTERS='',.'' NLS_CURRENCY=''R$ '''
      ) AS "meta_semanal_ano",

      CASE
        WHEN M.META_ANO > 0
          THEN ROUND((NVL(SW.PRODUCAO_SEMANAL,0) / (M.META_ANO / 52)) * 100, 2)
        ELSE 0
      END AS "porcentagem_semanal",

      TO_CHAR(
        (NVL(SW.PRODUCAO_SEMANAL,0) - (M.META_ANO / 52)),
        'FML999G999G999G990D00',
        'NLS_NUMERIC_CHARACTERS='',.'' NLS_CURRENCY=''R$ '''
      ) AS "gap_semanal",

      TO_CHAR(
        CASE
          WHEN P.NR_PA = 0 THEN
            NVL((
              SELECT SUM(NVL(V95.VL_TRANSACAO,0))
              FROM DBACRESSEM.VOLUME_TRANSACOES_DIARIO V95
              CROSS JOIN PARAMS PR95
              WHERE V95.DT_COMPETENCIA IS NOT NULL
                AND UPPER(V95.NM_FUNCAO_TRANSACAO) = 'CRÉDITO'
                AND TO_DATE(TRIM(V95.DT_COMPETENCIA),'DD/MM/YYYY')
                      BETWEEN TRUNC(NVL(PR95.DT_FIM_SEMANA, SYSDATE), 'YYYY')
                          AND NVL(PR95.DT_FIM_SEMANA, SYSDATE)
                AND (
                  (95 = 4317 AND V95.NR_SINGULAR = 4317)
                  OR
                  (95 <> 4317
                    AND REGEXP_LIKE(V95.CD_UNIDADE_INSTITUICAO, '^\d+$')
                    AND TO_NUMBER(V95.CD_UNIDADE_INSTITUICAO) = 95
                  )
                )
            ), 0)

          WHEN P.NR_PA = 95 THEN
            0

          ELSE
            NVL((
              SELECT SUM(NVL(V2.VL_TRANSACAO,0))
              FROM DBACRESSEM.VOLUME_TRANSACOES_DIARIO V2
              CROSS JOIN PARAMS PR2
              WHERE V2.DT_COMPETENCIA IS NOT NULL
                AND UPPER(V2.NM_FUNCAO_TRANSACAO) = 'CRÉDITO'
                AND TO_DATE(TRIM(V2.DT_COMPETENCIA),'DD/MM/YYYY')
                      BETWEEN TRUNC(NVL(PR2.DT_FIM_SEMANA, SYSDATE), 'YYYY')
                          AND NVL(PR2.DT_FIM_SEMANA, SYSDATE)
                AND (
                  (P.NR_PA = 4317 AND V2.NR_SINGULAR = 4317)
                  OR
                  (P.NR_PA <> 4317
                    AND REGEXP_LIKE(V2.CD_UNIDADE_INSTITUICAO, '^\d+$')
                    AND TO_NUMBER(V2.CD_UNIDADE_INSTITUICAO) = P.NR_PA
                  )
                )
            ), 0)
        END,
        'FML999G999G999G990D00',
        'NLS_NUMERIC_CHARACTERS='',.'' NLS_CURRENCY=''R$ '''
      ) AS "producao_ano",

      TO_CHAR(
        NVL(M.META_ANO, 0),
        'FML999G999G999G990D00',
        'NLS_NUMERIC_CHARACTERS='',.'' NLS_CURRENCY=''R$ '''
      ) AS "meta_2026",

      CASE
        WHEN M.META_ANO > 0
          THEN ROUND((NVL(AY.PRODUCAO_ANO,0) / M.META_ANO) * 100, 2)
        ELSE 0
      END AS "perc_meta_realizada",

      TO_CHAR(
        (NVL(AY.PRODUCAO_ANO,0) - M.META_ANO),
        'FML999G999G999G990D00',
        'NLS_NUMERIC_CHARACTERS='',.'' NLS_CURRENCY=''R$ '''
      ) AS "falta_para_meta"

    FROM META M
    JOIN DBACRESSEM.PA P
      ON P.NR_PA = M.NR_PA

    LEFT JOIN VTD_ANO AY
      ON AY.NR_PA = M.NR_PA
     AND AY.ANO = M.ANO

    LEFT JOIN VTD_SEMANA SW
      ON SW.NR_PA = M.NR_PA
     AND SW.ANO = M.ANO

    ORDER BY P.NR_PA
  `;
        case "liquidacao_baixa":
            return `
    WITH
    PARAMS AS (
      SELECT
        TO_DATE(:dt_inicio, 'DD/MM/YYYY') AS DT_INI_SEMANA,
        TO_DATE(:dt_fim, 'DD/MM/YYYY') AS DT_FIM_SEMANA
      FROM DUAL
    ),

    MLB_BASE AS (
      SELECT
        MLB.NR_PA,
        MLB.DT_PAGAMENTO,
        MLB.VL_COBRADO
      FROM DBACRESSEM.MOVIMENTO_LIQUIDACOES_BAIXA MLB
      CROSS JOIN PARAMS PR
      WHERE MLB.DT_PAGAMENTO IS NOT NULL
        AND MLB.DESC_HISTORICO LIKE '%LIQUIDAÇÃO%'
        AND (
          PR.DT_INI_SEMANA IS NULL
          OR PR.DT_FIM_SEMANA IS NULL
          OR TRUNC(MLB.DT_PAGAMENTO) BETWEEN TRUNC(PR.DT_INI_SEMANA) AND TRUNC(PR.DT_FIM_SEMANA)
        )
    ),

    MLB_ANO AS (
      SELECT
        NR_PA,
        EXTRACT(YEAR FROM DT_PAGAMENTO) AS ANO,
        SUM(NVL(VL_COBRADO,0)) AS PRODUCAO_ANO
      FROM MLB_BASE
      GROUP BY
        NR_PA,
        EXTRACT(YEAR FROM DT_PAGAMENTO)
    ),

    MLB_SEMANA AS (
      SELECT
        NR_PA,
        SUM(NVL(VL_COBRADO,0)) AS PRODUCAO_SEMANAL
      FROM MLB_BASE
      GROUP BY
        NR_PA
    ),

    META AS (
      SELECT
        NR_PA,
        TO_NUMBER(DT_ANO_META) AS ANO,
        QTD_META AS META_ANO
      FROM DBACRESSEM.META_TOTAL_NOVA
      WHERE UPPER(NM_PRODUTO) = 'COBRANÇA'
    )

    SELECT
      P.NR_PA AS "numero_pa",
      P.NM_PA AS "nome_pa",

      TO_CHAR(
        CASE
          WHEN P.NR_PA = 95 THEN
            NVL((
              SELECT SUM(NVL(B2.VL_COBRADO,0))
              FROM MLB_BASE B2
              CROSS JOIN PARAMS PR2
              WHERE B2.NR_PA IN (0,95)
            ),0)
          WHEN P.NR_PA = 4317 THEN
            NVL((
              SELECT SUM(NVL(B4.VL_COBRADO,0))
              FROM DBACRESSEM.MOVIMENTO_LIQUIDACOES_BAIXA B4
              CROSS JOIN PARAMS PR4
              WHERE B4.NR_PA <> 4317
                AND B4.DT_PAGAMENTO IS NOT NULL
                AND B4.DESC_HISTORICO LIKE '%LIQUIDAÇÃO%'
                AND (
                  PR4.DT_INI_SEMANA IS NULL
                  OR PR4.DT_FIM_SEMANA IS NULL
                  OR TRUNC(B4.DT_PAGAMENTO) BETWEEN TRUNC(PR4.DT_INI_SEMANA) AND TRUNC(PR4.DT_FIM_SEMANA)
                )
            ),0)
          ELSE NVL(SW.PRODUCAO_SEMANAL,0)
        END,
        'FML999G999G999G990D00',
        'NLS_NUMERIC_CHARACTERS='',.'' NLS_CURRENCY=''R$ '''
      ) AS "producao_semanal",

      TO_CHAR(
        ROUND(NVL(M.META_ANO,0)/52,2),
        'FML999G999G999G990D00',
        'NLS_NUMERIC_CHARACTERS='',.'' NLS_CURRENCY=''R$ '''
      ) AS "meta_semanal_ano",

      TO_CHAR(
        (
          CASE
            WHEN P.NR_PA = 95 THEN
              NVL((
                SELECT SUM(NVL(B2.VL_COBRADO,0))
                FROM MLB_BASE B2
                CROSS JOIN PARAMS PR2
                WHERE B2.NR_PA IN (0,95)
              ),0)
            WHEN P.NR_PA = 4317 THEN
              NVL((
                SELECT SUM(NVL(B4.VL_COBRADO,0))
                FROM DBACRESSEM.MOVIMENTO_LIQUIDACOES_BAIXA B4
                CROSS JOIN PARAMS PR4
                WHERE B4.NR_PA <> 4317
                  AND B4.DT_PAGAMENTO IS NOT NULL
                  AND B4.DESC_HISTORICO LIKE '%LIQUIDAÇÃO%'
                  AND (
                    PR4.DT_INI_SEMANA IS NULL
                    OR PR4.DT_FIM_SEMANA IS NULL
                    OR TRUNC(B4.DT_PAGAMENTO) BETWEEN TRUNC(PR4.DT_INI_SEMANA) AND TRUNC(PR4.DT_FIM_SEMANA)
                  )
              ),0)
            ELSE NVL(SW.PRODUCAO_SEMANAL,0)
          END
          - ROUND(NVL(M.META_ANO,0)/52,2)
        ),
        'FML999G999G999G990D00',
        'NLS_NUMERIC_CHARACTERS='',.'' NLS_CURRENCY=''R$ '''
      ) AS "gap_semanal",

      TO_CHAR(
        CASE
          WHEN P.NR_PA = 95 THEN
            NVL((
              SELECT SUM(NVL(B3.VL_COBRADO,0))
              FROM MLB_BASE B3
              CROSS JOIN PARAMS PR3
              WHERE B3.NR_PA IN (0,95)
                AND TRUNC(B3.DT_PAGAMENTO) BETWEEN
                    TRUNC(NVL(PR3.DT_FIM_SEMANA,SYSDATE),'YYYY')
                    AND NVL(PR3.DT_FIM_SEMANA,SYSDATE)
            ),0)

          WHEN P.NR_PA = 0 THEN
            0

          WHEN P.NR_PA = 4317 THEN
            NVL((
              SELECT SUM(NVL(B4.VL_COBRADO,0))
              FROM DBACRESSEM.MOVIMENTO_LIQUIDACOES_BAIXA B4
              CROSS JOIN PARAMS PR4
              WHERE B4.NR_PA <> 4317
                AND B4.DT_PAGAMENTO IS NOT NULL
                AND B4.DESC_HISTORICO LIKE '%LIQUIDAÇÃO%'
                AND TRUNC(B4.DT_PAGAMENTO) BETWEEN
                    TRUNC(NVL(PR4.DT_FIM_SEMANA,SYSDATE),'YYYY')
                    AND NVL(PR4.DT_FIM_SEMANA,SYSDATE)
            ),0)

          ELSE NVL(AY.PRODUCAO_ANO,0)
        END,
        'FML999G999G999G990D00',
        'NLS_NUMERIC_CHARACTERS='',.'' NLS_CURRENCY=''R$ '''
      ) AS "producao_ano",

      TO_CHAR(
        NVL(M.META_ANO,0),
        'FML999G999G999G990D00',
        'NLS_NUMERIC_CHARACTERS='',.'' NLS_CURRENCY=''R$ '''
      ) AS "meta_2026",

      CASE
        WHEN NVL(M.META_ANO,0) > 0
          THEN ROUND((NVL(AY.PRODUCAO_ANO,0)/M.META_ANO)*100,2)
        ELSE 0
      END AS "perc_meta_realizada",

      TO_CHAR(
        (NVL(AY.PRODUCAO_ANO,0)-NVL(M.META_ANO,0)),
        'FML999G999G999G990D00',
        'NLS_NUMERIC_CHARACTERS='',.'' NLS_CURRENCY=''R$ '''
      ) AS "falta_para_meta"

    FROM META M
    JOIN DBACRESSEM.PA P
      ON P.NR_PA = M.NR_PA
    CROSS JOIN PARAMS PR

    LEFT JOIN MLB_ANO AY
      ON AY.NR_PA = M.NR_PA
     AND AY.ANO = M.ANO

    LEFT JOIN MLB_SEMANA SW
      ON SW.NR_PA = M.NR_PA

    ORDER BY P.NR_PA, M.ANO
  `;
        case "faturamento_sipag":
            return `
    WITH
    PARAMS AS (
      SELECT
        TO_DATE(:dt_inicio, 'DD/MM/YYYY') AS DT_INI_SEMANA,
        TO_DATE(:dt_fim, 'DD/MM/YYYY') AS DT_FIM_SEMANA
      FROM DUAL
    ),

    FSD_BASE_ALL AS (
      SELECT
        FSD.NR_PA,
        TO_DATE(TRIM(FSD.DT_TRANSACAO), 'DD/MM/YYYY') AS DT_MOV,
        NVL(FSD.VL_FATURAMENTO, 0) AS VL_FATURAMENTO_NUM
      FROM DBACRESSEM.FATURAMENTO_SIPAG_DIARIO FSD
      WHERE FSD.DT_TRANSACAO IS NOT NULL

      UNION ALL

      SELECT
        4317 AS NR_PA,
        TO_DATE(TRIM(FSD.DT_TRANSACAO), 'DD/MM/YYYY') AS DT_MOV,
        NVL(FSD.VL_FATURAMENTO, 0) AS VL_FATURAMENTO_NUM
      FROM DBACRESSEM.FATURAMENTO_SIPAG_DIARIO FSD
      WHERE FSD.DT_TRANSACAO IS NOT NULL
        AND TO_NUMBER(FSD.NR_COOPERATIVA) = 4317
    ),

    FSD_PERIODO AS (
      SELECT B.*
      FROM FSD_BASE_ALL B
      CROSS JOIN PARAMS PR
      WHERE
        (PR.DT_INI_SEMANA IS NULL AND PR.DT_FIM_SEMANA IS NULL)
        OR
        (B.DT_MOV BETWEEN NVL(PR.DT_INI_SEMANA, DATE '1900-01-01')
                     AND NVL(PR.DT_FIM_SEMANA, DATE '2999-12-31'))
    ),

    FSD_ANO AS (
      SELECT
        B.NR_PA,
        EXTRACT(YEAR FROM B.DT_MOV) AS ANO,
        SUM(B.VL_FATURAMENTO_NUM) AS PRODUCAO_ANO
      FROM FSD_BASE_ALL B
      CROSS JOIN PARAMS PR
      WHERE
        B.DT_MOV BETWEEN TRUNC(NVL(PR.DT_FIM_SEMANA, TRUNC(SYSDATE)), 'YYYY')
                    AND NVL(PR.DT_FIM_SEMANA, TRUNC(SYSDATE))
      GROUP BY
        B.NR_PA,
        EXTRACT(YEAR FROM B.DT_MOV)
    ),

    FSD_SEMANA AS (
      SELECT
        B.NR_PA,
        EXTRACT(YEAR FROM B.DT_MOV) AS ANO,
        SUM(
          CASE
            WHEN PR.DT_INI_SEMANA IS NULL
             AND PR.DT_FIM_SEMANA IS NULL
             AND B.DT_MOV BETWEEN TRUNC(SYSDATE,'IW') AND TRUNC(SYSDATE,'IW') + 6
             AND EXTRACT(YEAR FROM B.DT_MOV) = EXTRACT(YEAR FROM SYSDATE)
            THEN B.VL_FATURAMENTO_NUM

            WHEN PR.DT_INI_SEMANA IS NOT NULL
              OR PR.DT_FIM_SEMANA IS NOT NULL
            THEN B.VL_FATURAMENTO_NUM

            ELSE 0
          END
        ) AS PRODUCAO_SEMANAL
      FROM FSD_PERIODO B
      CROSS JOIN PARAMS PR
      GROUP BY
        B.NR_PA,
        EXTRACT(YEAR FROM B.DT_MOV)
    ),

    META AS (
      SELECT
        MT.NR_PA,
        TO_NUMBER(MT.DT_ANO_META) AS ANO,
        SUM(MT.QTD_META) AS META_ANO
      FROM DBACRESSEM.META_TOTAL_NOVA MT
      WHERE UPPER(MT.NM_PRODUTO) IN ('SIPAG')
      GROUP BY
        MT.NR_PA,
        TO_NUMBER(MT.DT_ANO_META)
    )

    SELECT
      P.NR_PA AS "numero_pa",
      P.NM_PA AS "nome_pa",

      TO_CHAR(
        CASE
          WHEN P.NR_PA = 95 THEN NVL(SW0.PRODUCAO_SEMANAL, 0)
          ELSE NVL(SW.PRODUCAO_SEMANAL, 0)
        END,
        'FML999G999G999G990D00',
        'NLS_NUMERIC_CHARACTERS='',.'' NLS_CURRENCY=''R$ '''
      ) AS "producao_semanal",

      TO_CHAR(
        ROUND(M.META_ANO / 52, 2),
        'FML999G999G999G990D00',
        'NLS_NUMERIC_CHARACTERS='',.'' NLS_CURRENCY=''R$ '''
      ) AS "meta_semanal_ano",

      CASE
        WHEN ROUND(
          (M.META_ANO / 12) /
          CEIL(
            (LAST_DAY(ADD_MONTHS(TRUNC(SYSDATE,'MM'),1))
             - ADD_MONTHS(TRUNC(SYSDATE,'MM'),1) + 1) / 7
          )
        , 2) > 0
          THEN ROUND(
            (
              CASE
                WHEN P.NR_PA = 95 THEN NVL(SW0.PRODUCAO_SEMANAL, 0)
                ELSE NVL(SW.PRODUCAO_SEMANAL, 0)
              END
              /
              ROUND(
                (M.META_ANO / 12) /
                CEIL(
                  (LAST_DAY(ADD_MONTHS(TRUNC(SYSDATE,'MM'),1))
                   - ADD_MONTHS(TRUNC(SYSDATE,'MM'),1) + 1) / 7
                )
              , 2)
            ) * 100
          , 2)
        ELSE 0
      END AS "porcentagem_semanal",

      TO_CHAR(
        (
          CASE
            WHEN P.NR_PA = 95 THEN NVL(SW0.PRODUCAO_SEMANAL, 0)
            ELSE NVL(SW.PRODUCAO_SEMANAL, 0)
          END
          -
          ROUND(
            (M.META_ANO / 12) /
            CEIL(
              (LAST_DAY(ADD_MONTHS(TRUNC(SYSDATE,'MM'),1))
               - ADD_MONTHS(TRUNC(SYSDATE,'MM'),1) + 1) / 7
            )
          , 2)
        ),
        'FML999G999G999G990D00',
        'NLS_NUMERIC_CHARACTERS='',.'' NLS_CURRENCY=''R$ '''
      ) AS "gap_semanal",

      TO_CHAR(
        CASE
          WHEN P.NR_PA = 95 THEN NVL(AY0.PRODUCAO_ANO, 0)
          ELSE NVL(AY.PRODUCAO_ANO, 0)
        END,
        'FML999G999G999G990D00',
        'NLS_NUMERIC_CHARACTERS='',.'' NLS_CURRENCY=''R$ '''
      ) AS "producao_ano",

      TO_CHAR(
        NVL(M.META_ANO, 0),
        'FML999G999G999G990D00',
        'NLS_NUMERIC_CHARACTERS='',.'' NLS_CURRENCY=''R$ '''
      ) AS "meta_2026",

      CASE
        WHEN M.META_ANO > 0
          THEN ROUND((
            CASE
              WHEN P.NR_PA = 95 THEN NVL(AY0.PRODUCAO_ANO, 0)
              ELSE NVL(AY.PRODUCAO_ANO, 0)
            END
            / M.META_ANO
          ) * 100, 2)
        ELSE 0
      END AS "perc_meta_realizada",

      TO_CHAR((
          CASE
            WHEN P.NR_PA = 95 THEN NVL(AY0.PRODUCAO_ANO, 0)
            ELSE NVL(AY.PRODUCAO_ANO, 0)
          END
          - M.META_ANO
        ),
        'FML999G999G999G990D00',
        'NLS_NUMERIC_CHARACTERS='',.'' NLS_CURRENCY=''R$ '''
      ) AS "falta_para_meta"

    FROM META M
    JOIN DBACRESSEM.PA P
      ON P.NR_PA = M.NR_PA

    LEFT JOIN FSD_ANO AY
      ON AY.NR_PA = M.NR_PA
     AND AY.ANO = M.ANO

    LEFT JOIN FSD_ANO AY0
      ON AY0.NR_PA = 0
     AND AY0.ANO = M.ANO

    LEFT JOIN FSD_SEMANA SW
      ON SW.NR_PA = M.NR_PA
     AND SW.ANO = M.ANO

    LEFT JOIN FSD_SEMANA SW0
      ON SW0.NR_PA = 0
     AND SW0.ANO = M.ANO

    ORDER BY P.NR_PA
  `;
        case "portabilidade":
            return `
    WITH
    PARAMS AS (
      SELECT
        TO_DATE(:dt_inicio, 'DD/MM/YYYY') AS DT_INI_SEMANA,
        TO_DATE(:dt_fim, 'DD/MM/YYYY') AS DT_FIM_SEMANA
      FROM DUAL
    ),

    P_BASE AS (
      SELECT
        P.NR_PA,
        TRUNC(P.DT_COMPETENCIA) AS DT_MOV,
        CASE
          WHEN REGEXP_LIKE(TRIM(P.NR_CONTA_CORRENTE), '^[0-9]+$')
            THEN TO_CHAR(TO_NUMBER(TRIM(P.NR_CONTA_CORRENTE)))
          ELSE TRIM(P.NR_CONTA_CORRENTE)
        END AS NR_CONTA_CORRENTE
      FROM DBACRESSEM.PORTABILIDADE_DIARIO P
      CROSS JOIN PARAMS PR
      WHERE P.DT_COMPETENCIA IS NOT NULL
        AND (
          PR.DT_INI_SEMANA IS NULL
          OR PR.DT_FIM_SEMANA IS NULL
          OR TRUNC(P.DT_COMPETENCIA) BETWEEN TRUNC(PR.DT_INI_SEMANA) AND TRUNC(PR.DT_FIM_SEMANA)
        )
        AND P.NR_PA <> 4317

      UNION

      SELECT
        4317 AS NR_PA,
        TRUNC(P.DT_COMPETENCIA) AS DT_MOV,
        CASE
          WHEN REGEXP_LIKE(TRIM(P.NR_CONTA_CORRENTE), '^[0-9]+$')
            THEN TO_CHAR(TO_NUMBER(TRIM(P.NR_CONTA_CORRENTE)))
          ELSE TRIM(P.NR_CONTA_CORRENTE)
        END AS NR_CONTA_CORRENTE
      FROM DBACRESSEM.PORTABILIDADE_DIARIO P
      CROSS JOIN PARAMS PR
      WHERE P.DT_COMPETENCIA IS NOT NULL
        AND (
          PR.DT_INI_SEMANA IS NULL
          OR PR.DT_FIM_SEMANA IS NULL
          OR TRUNC(P.DT_COMPETENCIA) BETWEEN TRUNC(PR.DT_INI_SEMANA) AND TRUNC(PR.DT_FIM_SEMANA)
        )
        AND REGEXP_LIKE(TRIM(P.NR_COOPERATIVA), '^[0-9]+$')
        AND TO_NUMBER(TRIM(P.NR_COOPERATIVA)) = 4317
        AND (P.NR_PA IS NULL OR P.NR_PA <> 4317)
    ),

    P_ANO AS (
      SELECT
        NR_PA,
        EXTRACT(YEAR FROM DT_MOV) AS ANO,
        COUNT(DISTINCT NR_CONTA_CORRENTE) AS PRODUCAO_ANO
      FROM P_BASE
      GROUP BY
        NR_PA,
        EXTRACT(YEAR FROM DT_MOV)
    ),

    P_SEMANA AS (
      SELECT
        NR_PA,
        EXTRACT(YEAR FROM DT_MOV) AS ANO,
        TO_NUMBER(TO_CHAR(DT_MOV, 'IW')) AS SEMANA,
        COUNT(DISTINCT NR_CONTA_CORRENTE) AS PRODUCAO_SEMANAL
      FROM P_BASE
      GROUP BY
        NR_PA,
        EXTRACT(YEAR FROM DT_MOV),
        TO_NUMBER(TO_CHAR(DT_MOV, 'IW'))
    ),

    META AS (
      SELECT
        NR_PA,
        TO_NUMBER(DT_ANO_META) AS ANO,
        QTD_META AS META_ANO
      FROM DBACRESSEM.META_TOTAL_NOVA
      WHERE UPPER(NM_PRODUTO) = 'PORTABILIDADE DE SALÁRIO'
    )

    SELECT
      PA.NR_PA AS "numero_pa",
      PA.NM_PA AS "nome_pa",

      NVL(SW.PRODUCAO_SEMANAL, 0) AS "producao_semanal",

      ROUND(NVL(M.META_ANO, 0) / 52, 0) AS "meta_semanal_ano",

      (NVL(SW.PRODUCAO_SEMANAL, 0) - ROUND(NVL(M.META_ANO, 0) / 52, 0)) AS "gap_semanal",

      NVL(AY.PRODUCAO_ANO, 0) AS "producao_ano",

      ROUND(NVL(M.META_ANO, 0), 0) AS "meta_ano",

      CASE
        WHEN NVL(M.META_ANO, 0) > 0
          THEN ROUND((NVL(AY.PRODUCAO_ANO, 0) / M.META_ANO) * 100, 2)
        ELSE 0
      END AS "perc_meta_realizada",

      (NVL(AY.PRODUCAO_ANO, 0) - ROUND(NVL(M.META_ANO, 0), 0)) AS "falta_para_meta"

    FROM META M
    JOIN DBACRESSEM.PA PA
      ON PA.NR_PA = M.NR_PA
    CROSS JOIN PARAMS PR

    LEFT JOIN P_ANO AY
      ON AY.NR_PA = M.NR_PA
     AND AY.ANO = M.ANO

    LEFT JOIN P_SEMANA SW
      ON SW.NR_PA = M.NR_PA
     AND SW.ANO = M.ANO
     AND SW.SEMANA = TO_NUMBER(
       TO_CHAR(
         NVL(PR.DT_INI_SEMANA, SYSDATE),
         'IW'
       )
     )

    ORDER BY PA.NR_PA, M.ANO
  `;
        case "seguro_gerais_novo":
            return `
    WITH
    PARAMS AS (
      SELECT
        TO_DATE(:dt_inicio, 'DD/MM/YYYY') AS DT_INI_SEMANA,
        TO_DATE(:dt_fim, 'DD/MM/YYYY') AS DT_FIM_SEMANA
      FROM DUAL
    ),

    SGPD_BASE_ALL AS (
      SELECT
        NR_PA,
        TO_DATE(DT_MOVIMENTO, 'DD/MM/YYYY') AS DT_MOV,
        NVL(VL_PREMIO_LIQUIDO, 0) AS VL_PREMIO_LIQUIDO_NUM
      FROM DBACRESSEM.SEGUROS_GERAIS_PRODUCAO_DIARIO
      WHERE DT_MOVIMENTO IS NOT NULL
        AND UPPER(DESC_TP_PROPOSTA) = 'SEGURO NOVO'

      UNION ALL

      SELECT
        4317 AS NR_PA,
        TO_DATE(DT_MOVIMENTO, 'DD/MM/YYYY') AS DT_MOV,
        NVL(VL_PREMIO_LIQUIDO, 0) AS VL_PREMIO_LIQUIDO_NUM
      FROM DBACRESSEM.SEGUROS_GERAIS_PRODUCAO_DIARIO
      WHERE DT_MOVIMENTO IS NOT NULL
        AND UPPER(DESC_TP_PROPOSTA) = 'SEGURO NOVO'
        AND TO_NUMBER(NR_COOPERATIVA) = 4317
    ),

    SGPD_BASE AS (
      SELECT
        B.*
      FROM SGPD_BASE_ALL B
      CROSS JOIN PARAMS PR
      WHERE
        (PR.DT_INI_SEMANA IS NULL AND PR.DT_FIM_SEMANA IS NULL)
        OR
        (
          B.DT_MOV BETWEEN NVL(PR.DT_INI_SEMANA, DATE '1900-01-01')
                      AND NVL(PR.DT_FIM_SEMANA, DATE '2999-12-31')
        )
    ),

    SGPD_ANO AS (
      SELECT
        B.NR_PA,
        EXTRACT(YEAR FROM B.DT_MOV) AS ANO,
        SUM(B.VL_PREMIO_LIQUIDO_NUM) AS PRODUCAO_ANO
      FROM SGPD_BASE_ALL B
      CROSS JOIN PARAMS PR
      WHERE B.DT_MOV BETWEEN
            TRUNC(NVL(PR.DT_FIM_SEMANA, SYSDATE), 'YYYY')
            AND NVL(PR.DT_FIM_SEMANA, SYSDATE)
      GROUP BY
        B.NR_PA,
        EXTRACT(YEAR FROM B.DT_MOV)
    ),

    SGPD_SEMANAL AS (
      SELECT
        B.NR_PA,
        EXTRACT(YEAR FROM B.DT_MOV) AS ANO,
        SUM(B.VL_PREMIO_LIQUIDO_NUM) AS PRODUCAO_SEMANAL
      FROM SGPD_BASE_ALL B
      CROSS JOIN PARAMS PR
      WHERE
        (
          (PR.DT_INI_SEMANA IS NULL AND PR.DT_FIM_SEMANA IS NULL)
          AND B.DT_MOV BETWEEN TRUNC(SYSDATE,'IW') AND (TRUNC(SYSDATE,'IW') + 6)
        )
        OR
        (
          (PR.DT_INI_SEMANA IS NOT NULL OR PR.DT_FIM_SEMANA IS NOT NULL)
          AND B.DT_MOV BETWEEN NVL(PR.DT_INI_SEMANA, DATE '1900-01-01')
                          AND NVL(PR.DT_FIM_SEMANA, DATE '2999-12-31')
        )
      GROUP BY
        B.NR_PA,
        EXTRACT(YEAR FROM B.DT_MOV)
    ),

    SGPD_95_SEMANAL AS (
      SELECT
        EXTRACT(YEAR FROM TO_DATE(D.DT_MOVIMENTO, 'DD/MM/YYYY')) AS ANO,
        SUM(NVL(D.VL_PREMIO_LIQUIDO, 0)) AS VALOR_95_SEMANAL
      FROM DBACRESSEM.SEGUROS_GERAIS_PRODUCAO_DIARIO D
      CROSS JOIN PARAMS PR
      WHERE D.DT_MOVIMENTO IS NOT NULL
        AND UPPER(D.DESC_TP_PROPOSTA) = 'SEGURO NOVO'
        AND D.NR_PA IN (0, 95)
        AND UPPER(D.NM_ANGARIADOR) IN (
          'YASMIN QUEIROS LEMOS RIBEIRO',
          'CHRISTIAN JESUS SIQUEIRA',
          'THIAGO SILVERIO DOS REIS',
          'THIAGO SILVÉRIO DOS REIS',
          'GUSTAVO COLAFRANCESCO AMIM SOARES'
        )
        AND (
          (
            PR.DT_INI_SEMANA IS NULL AND PR.DT_FIM_SEMANA IS NULL
            AND TO_DATE(D.DT_MOVIMENTO, 'DD/MM/YYYY')
                BETWEEN TRUNC(SYSDATE,'IW') AND (TRUNC(SYSDATE,'IW') + 6)
          )
          OR
          (
            (PR.DT_INI_SEMANA IS NOT NULL OR PR.DT_FIM_SEMANA IS NOT NULL)
            AND TO_DATE(D.DT_MOVIMENTO, 'DD/MM/YYYY')
                BETWEEN NVL(PR.DT_INI_SEMANA, DATE '1900-01-01')
                    AND NVL(PR.DT_FIM_SEMANA, DATE '2999-12-31')
          )
        )
      GROUP BY EXTRACT(YEAR FROM TO_DATE(D.DT_MOVIMENTO, 'DD/MM/YYYY'))
    ),

    SGPD_95_ANO AS (
      SELECT
        EXTRACT(YEAR FROM TO_DATE(D.DT_MOVIMENTO, 'DD/MM/YYYY')) AS ANO,
        SUM(NVL(D.VL_PREMIO_LIQUIDO, 0)) AS VALOR_95_ANO
      FROM DBACRESSEM.SEGUROS_GERAIS_PRODUCAO_DIARIO D
      CROSS JOIN PARAMS PR
      WHERE D.DT_MOVIMENTO IS NOT NULL
        AND UPPER(D.DESC_TP_PROPOSTA) = 'SEGURO NOVO'
        AND D.NR_PA IN (0, 95)
        AND UPPER(D.NM_ANGARIADOR) IN (
          'YASMIN QUEIROS LEMOS RIBEIRO',
          'CHRISTIAN JESUS SIQUEIRA',
          'THIAGO SILVERIO DOS REIS',
          'THIAGO SILVÉRIO DOS REIS',
          'GUSTAVO COLAFRANCESCO AMIM SOARES'
        )
        AND TO_DATE(D.DT_MOVIMENTO, 'DD/MM/YYYY') BETWEEN
            TRUNC(NVL(PR.DT_FIM_SEMANA, SYSDATE), 'YYYY')
            AND NVL(PR.DT_FIM_SEMANA, SYSDATE)
      GROUP BY EXTRACT(YEAR FROM TO_DATE(D.DT_MOVIMENTO, 'DD/MM/YYYY'))
    ),

    META AS (
      SELECT
        NR_PA,
        TO_NUMBER(DT_ANO_META) AS ANO,
        QTD_META AS META_ANO
      FROM DBACRESSEM.META_TOTAL_NOVA
      WHERE UPPER(NM_PRODUTO) IN ('SEGUROS GERAIS NOVOS')
    )

    SELECT
      P.NR_PA AS "numero_pa",
      P.NM_PA AS "nome_pa",

      TO_CHAR(
        CASE
          WHEN P.NR_PA = 95 THEN NVL(V95S.VALOR_95_SEMANAL, 0)
          WHEN P.NR_PA = 0 THEN NVL(SW.PRODUCAO_SEMANAL, 0) - NVL(V95S.VALOR_95_SEMANAL, 0)
          ELSE NVL(SW.PRODUCAO_SEMANAL, 0)
        END,
        'FML999G999G999G999G990D00',
        'NLS_NUMERIC_CHARACTERS='',.'' NLS_CURRENCY=''R$ '''
      ) AS "producao_semanal",

      TO_CHAR(
        ROUND(M.META_ANO / 52, 2),
        'FML999G999G999G990D00',
        'NLS_NUMERIC_CHARACTERS='',.'' NLS_CURRENCY=''R$ '''
      ) AS "meta_semanal_ano",

      CASE
        WHEN ROUND(
          (M.META_ANO / 12) /
          CEIL(
            (LAST_DAY(ADD_MONTHS(TRUNC(SYSDATE,'MM'),1))
             - ADD_MONTHS(TRUNC(SYSDATE,'MM'),1) + 1) / 7
          )
        , 2) > 0
        THEN ROUND(
          (
            CASE
              WHEN P.NR_PA = 95 THEN NVL(V95S.VALOR_95_SEMANAL, 0)
              WHEN P.NR_PA = 0 THEN NVL(SW.PRODUCAO_SEMANAL, 0) - NVL(V95S.VALOR_95_SEMANAL, 0)
              ELSE NVL(SW.PRODUCAO_SEMANAL, 0)
            END
          ) /
          ROUND(
            (M.META_ANO / 12) /
            CEIL(
              (LAST_DAY(ADD_MONTHS(TRUNC(SYSDATE,'MM'),1))
               - ADD_MONTHS(TRUNC(SYSDATE,'MM'),1) + 1) / 7
            )
          , 2) * 100
        , 2)
        ELSE 0
      END AS "porcentagem_semanal",

      TO_CHAR(
        (
          CASE
            WHEN P.NR_PA = 95 THEN NVL(V95S.VALOR_95_SEMANAL, 0)
            WHEN P.NR_PA = 0 THEN NVL(SW.PRODUCAO_SEMANAL, 0) - NVL(V95S.VALOR_95_SEMANAL, 0)
            ELSE NVL(SW.PRODUCAO_SEMANAL, 0)
          END
        ) -
        ROUND(
          (M.META_ANO / 12) /
          CEIL(
            (LAST_DAY(ADD_MONTHS(TRUNC(SYSDATE,'MM'),1))
             - ADD_MONTHS(TRUNC(SYSDATE,'MM'),1) + 1) / 7
          )
        , 2),
        'FML999G999G999G999G990D00',
        'NLS_NUMERIC_CHARACTERS='',.'' NLS_CURRENCY=''R$ '''
      ) AS "gap_semanal",

      TO_CHAR(
        CASE
          WHEN P.NR_PA = 95 THEN NVL(V95A.VALOR_95_ANO, 0)
          WHEN P.NR_PA = 0 THEN NVL(AY.PRODUCAO_ANO, 0) - NVL(V95A.VALOR_95_ANO, 0)
          ELSE NVL(AY.PRODUCAO_ANO, 0)
        END,
        'FML999G999G999G999G990D00',
        'NLS_NUMERIC_CHARACTERS='',.'' NLS_CURRENCY=''R$ '''
      ) AS "producao_ano",

      TO_CHAR(
        NVL(M.META_ANO, 0),
        'FML999G999G999G990D00',
        'NLS_NUMERIC_CHARACTERS='',.'' NLS_CURRENCY=''R$ '''
      ) AS "meta_2026",

      CASE
        WHEN M.META_ANO > 0 THEN
          CASE
            WHEN P.NR_PA = 95 THEN ROUND((NVL(V95A.VALOR_95_ANO, 0) / M.META_ANO) * 100, 2)
            WHEN P.NR_PA = 0 THEN ROUND(((NVL(AY.PRODUCAO_ANO, 0) - NVL(V95A.VALOR_95_ANO, 0)) / M.META_ANO) * 100, 2)
            ELSE ROUND((NVL(AY.PRODUCAO_ANO, 0) / M.META_ANO) * 100, 2)
          END
        ELSE 0
      END AS "perc_meta_realizada",

      TO_CHAR(
        CASE
          WHEN P.NR_PA = 95 THEN NVL(V95A.VALOR_95_ANO, 0) - M.META_ANO
          WHEN P.NR_PA = 0 THEN (NVL(AY.PRODUCAO_ANO, 0) - NVL(V95A.VALOR_95_ANO, 0)) - M.META_ANO
          ELSE NVL(AY.PRODUCAO_ANO, 0) - M.META_ANO
        END,
        'FML999G999G999G990D00',
        'NLS_NUMERIC_CHARACTERS='',.'' NLS_CURRENCY=''R$ '''
      ) AS "falta_para_meta"

    FROM META M
    JOIN DBACRESSEM.PA P
      ON P.NR_PA = M.NR_PA

    LEFT JOIN SGPD_ANO AY
      ON AY.NR_PA = M.NR_PA
     AND AY.ANO = M.ANO

    LEFT JOIN SGPD_SEMANAL SW
      ON SW.NR_PA = M.NR_PA
     AND SW.ANO = M.ANO

    LEFT JOIN SGPD_95_SEMANAL V95S
      ON V95S.ANO = M.ANO

    LEFT JOIN SGPD_95_ANO V95A
      ON V95A.ANO = M.ANO

    ORDER BY P.NR_PA
  `;
        case "seguro_gerais_renovado":
            return `
    WITH
    PARAMS AS (
      SELECT
        TO_DATE(:dt_inicio, 'DD/MM/YYYY') AS DT_INI_SEMANA,
        TO_DATE(:dt_fim, 'DD/MM/YYYY') AS DT_FIM_SEMANA
      FROM DUAL
    ),

    SGPD_BASE_ALL AS (
      SELECT
        NR_PA,
        TRUNC(DT_EMISSAO_APOLICE) AS DT_MOV,
        NVL(VL_PREMIO_LIQUIDO, 0) AS VL_PREMIO_LIQUIDO_NUM
      FROM DBACRESSEM.SEGUROS_GERAIS_PRODUCAO_DIARIO
      WHERE DT_EMISSAO_APOLICE IS NOT NULL
        AND UPPER(DESC_TP_PROPOSTA) IN (
          'SEGURO DA CORRETORA RENOVADO',
          'SEGURO CORRETORA RENOVADA'
        )

      UNION ALL

      SELECT
        4317 AS NR_PA,
        TRUNC(DT_EMISSAO_APOLICE) AS DT_MOV,
        NVL(VL_PREMIO_LIQUIDO, 0) AS VL_PREMIO_LIQUIDO_NUM
      FROM DBACRESSEM.SEGUROS_GERAIS_PRODUCAO_DIARIO
      WHERE DT_EMISSAO_APOLICE IS NOT NULL
        AND UPPER(DESC_TP_PROPOSTA) IN (
          'SEGURO DA CORRETORA RENOVADO',
          'SEGURO CORRETORA RENOVADA'
        )
        AND REGEXP_LIKE(TRIM(NR_COOPERATIVA), '^\\d+$')
        AND TO_NUMBER(TRIM(NR_COOPERATIVA)) = 4317
    ),

    SGPD_BASE AS (
      SELECT
        B.*
      FROM SGPD_BASE_ALL B
      CROSS JOIN PARAMS PR
      WHERE
        (PR.DT_INI_SEMANA IS NULL AND PR.DT_FIM_SEMANA IS NULL)
        OR
        (B.DT_MOV BETWEEN NVL(PR.DT_INI_SEMANA, DATE '1900-01-01')
                     AND NVL(PR.DT_FIM_SEMANA, DATE '2999-12-31'))
    ),

    SGPD_ANO AS (
      SELECT
        B.NR_PA,
        EXTRACT(YEAR FROM B.DT_MOV) AS ANO,
        SUM(B.VL_PREMIO_LIQUIDO_NUM) AS PRODUCAO_ANO
      FROM SGPD_BASE_ALL B
      CROSS JOIN PARAMS PR
      WHERE
        EXTRACT(YEAR FROM B.DT_MOV) = EXTRACT(YEAR FROM NVL(PR.DT_FIM_SEMANA, SYSDATE))
        AND B.DT_MOV BETWEEN TRUNC(NVL(PR.DT_FIM_SEMANA, SYSDATE), 'YYYY')
                        AND NVL(PR.DT_FIM_SEMANA, TRUNC(SYSDATE))
      GROUP BY
        B.NR_PA,
        EXTRACT(YEAR FROM B.DT_MOV)
    ),

    SGPD_SEMANAL AS (
      SELECT
        B.NR_PA,
        EXTRACT(YEAR FROM B.DT_MOV) AS ANO,
        SUM(B.VL_PREMIO_LIQUIDO_NUM) AS PRODUCAO_SEMANAL
      FROM SGPD_BASE_ALL B
      CROSS JOIN PARAMS PR
      WHERE
        (
          (PR.DT_INI_SEMANA IS NULL AND PR.DT_FIM_SEMANA IS NULL)
          AND B.DT_MOV BETWEEN TRUNC(SYSDATE,'IW') AND (TRUNC(SYSDATE,'IW') + 6)
        )
        OR
        (
          (PR.DT_INI_SEMANA IS NOT NULL OR PR.DT_FIM_SEMANA IS NOT NULL)
          AND B.DT_MOV BETWEEN NVL(PR.DT_INI_SEMANA, DATE '1900-01-01')
                          AND NVL(PR.DT_FIM_SEMANA, DATE '2999-12-31')
        )
      GROUP BY
        B.NR_PA,
        EXTRACT(YEAR FROM B.DT_MOV)
    ),

    META AS (
      SELECT
        NR_PA,
        TO_NUMBER(DT_ANO_META) AS ANO,
        QTD_META AS META_ANO
      FROM DBACRESSEM.META_TOTAL_NOVA
      WHERE UPPER(NM_PRODUTO) IN ('SEGUROS GERAIS RENOVAÇÕES')
    )

    SELECT
      P.NR_PA AS "numero_pa",
      P.NM_PA AS "nome_pa",

      TO_CHAR(
        NVL(SW.PRODUCAO_SEMANAL, 0),
        'FML999G999G999G990D00',
        'NLS_NUMERIC_CHARACTERS='',.'' NLS_CURRENCY=''R$ '''
      ) AS "producao_semanal",

      TO_CHAR(
        ROUND(M.META_ANO / 52, 2),
        'FML999G999G999G990D00',
        'NLS_NUMERIC_CHARACTERS='',.'' NLS_CURRENCY=''R$ '''
      ) AS "meta_semanal_ano",

      CASE
        WHEN ROUND(
          (M.META_ANO / 12) /
          CEIL(
            (LAST_DAY(ADD_MONTHS(TRUNC(SYSDATE,'MM'),1))
             - ADD_MONTHS(TRUNC(SYSDATE,'MM'),1) + 1) / 7
          )
        , 2) > 0
          THEN ROUND(
            (NVL(SW.PRODUCAO_SEMANAL,0) /
              ROUND(
                (M.META_ANO / 12) /
                CEIL(
                  (LAST_DAY(ADD_MONTHS(TRUNC(SYSDATE,'MM'),1))
                   - ADD_MONTHS(TRUNC(SYSDATE,'MM'),1) + 1) / 7
                )
              , 2)
            ) * 100
          , 2)
        ELSE 0
      END AS "porcentagem_semanal",

      TO_CHAR(
        (NVL(SW.PRODUCAO_SEMANAL,0) -
          ROUND(
            (M.META_ANO / 12) /
            CEIL(
              (LAST_DAY(ADD_MONTHS(TRUNC(SYSDATE,'MM'),1))
               - ADD_MONTHS(TRUNC(SYSDATE,'MM'),1) + 1) / 7
            )
          , 2)
        ),
        'FML999G999G999G990D00',
        'NLS_NUMERIC_CHARACTERS='',.'' NLS_CURRENCY=''R$ '''
      ) AS "gap_semanal",

      TO_CHAR(
        NVL(AY.PRODUCAO_ANO, 0),
        'FML999G999G999G990D00',
        'NLS_NUMERIC_CHARACTERS='',.'' NLS_CURRENCY=''R$ '''
      ) AS "producao_ano",

      TO_CHAR(
        NVL(M.META_ANO, 0),
        'FML999G999G999G990D00',
        'NLS_NUMERIC_CHARACTERS='',.'' NLS_CURRENCY=''R$ '''
      ) AS "meta_2026",

      CASE
        WHEN M.META_ANO > 0
          THEN ROUND((NVL(AY.PRODUCAO_ANO,0) / M.META_ANO) * 100, 2)
        ELSE 0
      END AS "perc_meta_realizada",

      TO_CHAR(
        CASE
          WHEN P.NR_PA = 4317 THEN (NVL(AY.PRODUCAO_ANO,0) - M.META_ANO)
          ELSE 0
        END,
        'FML999G999G999G990D00',
        'NLS_NUMERIC_CHARACTERS='',.'' NLS_CURRENCY=''R$ '''
      ) AS "falta_para_meta"

    FROM META M
    JOIN DBACRESSEM.PA P
      ON P.NR_PA = M.NR_PA

    LEFT JOIN SGPD_ANO AY
      ON AY.NR_PA = M.NR_PA
     AND AY.ANO = M.ANO

    LEFT JOIN SGPD_SEMANAL SW
      ON SW.NR_PA = M.NR_PA
     AND SW.ANO = M.ANO

    ORDER BY P.NR_PA
  `;
        case "seguro_venda_nova":
            return `
    WITH
    PARAMS AS (
      SELECT
        TO_DATE(:dt_inicio, 'DD/MM/YYYY') AS DT_INI_SEMANA,
        TO_DATE(:dt_fim, 'DD/MM/YYYY') AS DT_FIM_SEMANA
      FROM DUAL
    ),

    SV_DEDUP AS (
      SELECT
        SV.NR_PA,
        TRUNC(SV.DT_VENDA) AS DT_MOV,
        SV.NR_PROPOSTA_VENDA,
        SV.NR_COOPERATIVA,
        MAX(NVL(SV.VL_PREMIO_MENSAL, 0)) AS VL_PREMIO_MENSAL_NUM
      FROM DBACRESSEM.SEGURO_VENDA_NOVA_ATUALIZADA SV
      WHERE SV.DT_VENDA IS NOT NULL
      GROUP BY
        SV.NR_PA,
        TRUNC(SV.DT_VENDA),
        SV.NR_PROPOSTA_VENDA,
        SV.NR_COOPERATIVA
    ),

    SVNA_BASE_ALL AS (
      SELECT
        TO_NUMBER(P.NR_PA) AS NR_PA,
        D.DT_MOV,
        D.VL_PREMIO_MENSAL_NUM
      FROM DBACRESSEM.PA P
      LEFT JOIN SV_DEDUP D
        ON D.NR_PA = P.NR_PA
      WHERE D.DT_MOV IS NOT NULL
        AND TO_NUMBER(P.NR_PA) <> 4317
        AND EXISTS (
          SELECT 1
          FROM DBACRESSEM.ANALITICO_SEGUROS_VENDA_NOVA AV
          WHERE AV.NR_PROPOSTA = D.NR_PROPOSTA_VENDA
            AND AV.SN_VALIDO_CNV IN ('SIM')
            AND AV.NM_STATUS IN ('Implantada', 'Aceita')
        )

      UNION ALL

      SELECT
        TO_NUMBER('4317') AS NR_PA,
        D.DT_MOV,
        D.VL_PREMIO_MENSAL_NUM
      FROM DBACRESSEM.PA P
      LEFT JOIN SV_DEDUP D
        ON D.NR_PA = P.NR_PA
      WHERE D.DT_MOV IS NOT NULL
        AND TO_NUMBER(P.NR_PA) <> 4317
        AND REGEXP_LIKE(TRIM(D.NR_COOPERATIVA), '^[0-9]+$')
        AND TO_NUMBER(TRIM(D.NR_COOPERATIVA)) = 4317
        AND EXISTS (
          SELECT 1
          FROM DBACRESSEM.ANALITICO_SEGUROS_VENDA_NOVA AV
          WHERE AV.NR_PROPOSTA = D.NR_PROPOSTA_VENDA
            AND AV.SN_VALIDO_CNV IN ('SIM')
            AND AV.NM_STATUS IN ('Implantada', 'Aceita')
        )
    ),

    SVNA_ANO AS (
      SELECT
        B.NR_PA,
        EXTRACT(YEAR FROM NVL(PR.DT_FIM_SEMANA, SYSDATE)) AS ANO,
        SUM(B.VL_PREMIO_MENSAL_NUM) AS PRODUCAO_ANO
      FROM SVNA_BASE_ALL B
      CROSS JOIN PARAMS PR
      WHERE B.DT_MOV BETWEEN TRUNC(NVL(PR.DT_FIM_SEMANA, SYSDATE), 'YYYY')
                         AND NVL(PR.DT_FIM_SEMANA, SYSDATE)
      GROUP BY
        B.NR_PA,
        EXTRACT(YEAR FROM NVL(PR.DT_FIM_SEMANA, SYSDATE))
    ),

    SVNA_SEMANAL AS (
      SELECT
        B.NR_PA,
        EXTRACT(YEAR FROM NVL(PR.DT_FIM_SEMANA, SYSDATE)) AS ANO,
        SUM(B.VL_PREMIO_MENSAL_NUM) AS PRODUCAO_SEMANAL
      FROM SVNA_BASE_ALL B
      CROSS JOIN PARAMS PR
      WHERE
        (
          (PR.DT_INI_SEMANA IS NULL AND PR.DT_FIM_SEMANA IS NULL)
          AND B.DT_MOV BETWEEN TRUNC(SYSDATE,'IW') AND (TRUNC(SYSDATE,'IW') + 6)
        )
        OR
        (
          (PR.DT_INI_SEMANA IS NOT NULL OR PR.DT_FIM_SEMANA IS NOT NULL)
          AND B.DT_MOV BETWEEN NVL(PR.DT_INI_SEMANA, DATE '1900-01-01')
                          AND NVL(PR.DT_FIM_SEMANA, DATE '2999-12-31')
        )
      GROUP BY
        B.NR_PA,
        EXTRACT(YEAR FROM NVL(PR.DT_FIM_SEMANA, SYSDATE))
    ),

    META AS (
      SELECT
        TO_NUMBER(MT.NR_PA) AS NR_PA,
        TO_NUMBER(MT.DT_ANO_META) AS ANO,
        MT.QTD_META AS META_ANO
      FROM DBACRESSEM.META_TOTAL_NOVA MT
      WHERE UPPER(MT.NM_PRODUTO) IN ('SEGURO VIDA VENDA NOVA')
    )

    SELECT
      P.NR_PA AS "numero_pa",
      P.NM_PA AS "nome_pa",

      TO_CHAR(
        NVL(SW.PRODUCAO_SEMANAL, 0),
        'FML999G999G999G990D00',
        'NLS_NUMERIC_CHARACTERS='',.'' NLS_CURRENCY=''R$ '''
      ) AS "producao_semanal",

      TO_CHAR(
        ROUND(M.META_ANO / 52, 2),
        'FML999G999G999G990D00',
        'NLS_NUMERIC_CHARACTERS='',.'' NLS_CURRENCY=''R$ '''
      ) AS "meta_semanal_ano",

      CASE
        WHEN ROUND(
          (M.META_ANO / 12) /
          CEIL(
            (LAST_DAY(ADD_MONTHS(TRUNC(SYSDATE,'MM'),1))
             - ADD_MONTHS(TRUNC(SYSDATE,'MM'),1) + 1) / 7
          )
        , 2) > 0
          THEN ROUND(
            (NVL(SW.PRODUCAO_SEMANAL,0) /
              ROUND(
                (M.META_ANO / 12) /
                CEIL(
                  (LAST_DAY(ADD_MONTHS(TRUNC(SYSDATE,'MM'),1))
                   - ADD_MONTHS(TRUNC(SYSDATE,'MM'),1) + 1) / 7
                )
              , 2)
            ) * 100
          , 2)
        ELSE 0
      END AS "porcentagem_semanal",

      TO_CHAR(
        (NVL(SW.PRODUCAO_SEMANAL,0) -
          ROUND(
            (M.META_ANO / 12) /
            CEIL(
              (LAST_DAY(ADD_MONTHS(TRUNC(SYSDATE,'MM'),1))
               - ADD_MONTHS(TRUNC(SYSDATE,'MM'),1) + 1) / 7
            )
          , 2)
        ),
        'FML999G999G999G990D00',
        'NLS_NUMERIC_CHARACTERS='',.'' NLS_CURRENCY=''R$ '''
      ) AS "gap_semanal",

      TO_CHAR(
        NVL(AY.PRODUCAO_ANO, 0),
        'FML999G999G999G990D00',
        'NLS_NUMERIC_CHARACTERS='',.'' NLS_CURRENCY=''R$ '''
      ) AS "producao_ano",

      TO_CHAR(
        NVL(M.META_ANO, 0),
        'FML999G999G999G990D00',
        'NLS_NUMERIC_CHARACTERS='',.'' NLS_CURRENCY=''R$ '''
      ) AS "meta_2026",

      CASE
        WHEN M.META_ANO > 0
          THEN ROUND((NVL(AY.PRODUCAO_ANO,0) / M.META_ANO) * 100, 2)
        ELSE 0
      END AS "perc_meta_realizada",

      TO_CHAR(
        (NVL(AY.PRODUCAO_ANO,0) - M.META_ANO),
        'FML999G999G999G990D00',
        'NLS_NUMERIC_CHARACTERS='',.'' NLS_CURRENCY=''R$ '''
      ) AS "falta_para_meta"

    FROM META M
    JOIN DBACRESSEM.PA P
      ON TO_NUMBER(P.NR_PA) = M.NR_PA

    LEFT JOIN SVNA_ANO AY
      ON AY.NR_PA = M.NR_PA
     AND AY.ANO = M.ANO

    LEFT JOIN SVNA_SEMANAL SW
      ON SW.NR_PA = M.NR_PA
     AND SW.ANO = M.ANO

    ORDER BY P.NR_PA
  `;
        case "seguro_arrecadacao":
            return `
    WITH
    PARAMS AS (
      SELECT
        TO_DATE(:dt_inicio, 'DD/MM/YYYY') AS DT_INI_SEMANA,
        TO_DATE(:dt_fim, 'DD/MM/YYYY') AS DT_FIM_SEMANA
      FROM DUAL
    ),

    ASA_BASE AS (
      SELECT
        ASA.NR_COOPERATIVA AS NR_PA,
        TRUNC(ASA.DT_PAGAMENTO) AS DT_MOV,
        NVL(ASA.VL_ARRECADACAO, 0) AS VL_ARRECADACAO_NUM
      FROM DBACRESSEM.ANALITICO_SEGUROS_ARRECADACAO ASA
      CROSS JOIN PARAMS PR
      WHERE ASA.DT_PAGAMENTO IS NOT NULL
        AND (
          (PR.DT_INI_SEMANA IS NULL AND PR.DT_FIM_SEMANA IS NULL)
          OR
          TRUNC(ASA.DT_PAGAMENTO)
            BETWEEN NVL(PR.DT_INI_SEMANA, DATE '1900-01-01')
                AND NVL(PR.DT_FIM_SEMANA, DATE '2999-12-31')
        )
    ),

    ASA_ANO AS (
      SELECT
        X.NR_PA,
        EXTRACT(YEAR FROM NVL(PR.DT_FIM_SEMANA, SYSDATE)) AS ANO,
        SUM(X.VL_ARRECADACAO_NUM) AS PRODUCAO_ANO
      FROM (
        SELECT
          ASA.NR_COOPERATIVA AS NR_PA,
          TRUNC(ASA.DT_PAGAMENTO) AS DT_MOV,
          NVL(ASA.VL_ARRECADACAO, 0) AS VL_ARRECADACAO_NUM
        FROM DBACRESSEM.ANALITICO_SEGUROS_ARRECADACAO ASA
        WHERE ASA.DT_PAGAMENTO IS NOT NULL
      ) X
      CROSS JOIN PARAMS PR
      WHERE X.DT_MOV BETWEEN TRUNC(NVL(PR.DT_FIM_SEMANA, SYSDATE), 'YYYY')
                         AND NVL(PR.DT_FIM_SEMANA, SYSDATE)
      GROUP BY
        X.NR_PA,
        EXTRACT(YEAR FROM NVL(PR.DT_FIM_SEMANA, SYSDATE))
    ),

    ASA_SEMANA AS (
      SELECT
        B.NR_PA,
        EXTRACT(YEAR FROM B.DT_MOV) AS ANO,
        SUM(B.VL_ARRECADACAO_NUM) AS PRODUCAO_SEMANAL
      FROM ASA_BASE B
      CROSS JOIN PARAMS PR
      WHERE
        (
          (PR.DT_INI_SEMANA IS NULL AND PR.DT_FIM_SEMANA IS NULL)
          AND TO_NUMBER(TO_CHAR(B.DT_MOV, 'IW')) = TO_NUMBER(TO_CHAR(SYSDATE, 'IW'))
        )
        OR
        (
          (PR.DT_INI_SEMANA IS NOT NULL OR PR.DT_FIM_SEMANA IS NOT NULL)
        )
      GROUP BY
        B.NR_PA,
        EXTRACT(YEAR FROM B.DT_MOV)
    ),

    META AS (
      SELECT
        MT.NR_PA,
        TO_NUMBER(MT.DT_ANO_META) AS ANO,
        MT.QTD_META AS META_ANO
      FROM DBACRESSEM.META_TOTAL_NOVA MT
      WHERE UPPER(MT.NM_PRODUTO) IN ('SEGURO VIDA ARRECADAÇÃO')
    )

    SELECT
      P.NR_PA AS "numero_pa",
      P.NM_PA AS "nome_pa",

      TO_CHAR(
        NVL(SW.PRODUCAO_SEMANAL, 0),
        'FML999G999G999G990D00',
        'NLS_NUMERIC_CHARACTERS='',.'' NLS_CURRENCY=''R$ '''
      ) AS "producao_semanal",

      TO_CHAR(
        ROUND(M.META_ANO / 52, 2),
        'FML999G999G999G990D00',
        'NLS_NUMERIC_CHARACTERS='',.'' NLS_CURRENCY=''R$ '''
      ) AS "meta_semanal_ano",

      CASE
        WHEN ROUND(
          (M.META_ANO / 12) /
          CEIL(
            (LAST_DAY(ADD_MONTHS(TRUNC(SYSDATE,'MM'),1))
             - ADD_MONTHS(TRUNC(SYSDATE,'MM'),1) + 1) / 7
          )
        , 2) > 0
          THEN ROUND(
            (NVL(SW.PRODUCAO_SEMANAL,0) /
              ROUND(
                (M.META_ANO / 12) /
                CEIL(
                  (LAST_DAY(ADD_MONTHS(TRUNC(SYSDATE,'MM'),1))
                   - ADD_MONTHS(TRUNC(SYSDATE,'MM'),1) + 1) / 7
                )
              , 2)
            ) * 100
          , 2)
        ELSE 0
      END AS "porcentagem_semanal",

      TO_CHAR(
        (NVL(SW.PRODUCAO_SEMANAL,0) -
          ROUND(
            (M.META_ANO / 12) /
            CEIL(
              (LAST_DAY(ADD_MONTHS(TRUNC(SYSDATE,'MM'),1))
               - ADD_MONTHS(TRUNC(SYSDATE,'MM'),1) + 1) / 7
            )
          , 2)
        ),
        'FML999G999G999G990D00',
        'NLS_NUMERIC_CHARACTERS='',.'' NLS_CURRENCY=''R$ '''
      ) AS "gap_semanal",

      TO_CHAR(
        NVL(AY.PRODUCAO_ANO, 0),
        'FML999G999G999G990D00',
        'NLS_NUMERIC_CHARACTERS='',.'' NLS_CURRENCY=''R$ '''
      ) AS "producao_ano",

      TO_CHAR(
        NVL(M.META_ANO, 0),
        'FML999G999G999G990D00',
        'NLS_NUMERIC_CHARACTERS='',.'' NLS_CURRENCY=''R$ '''
      ) AS "meta_2026",

      CASE
        WHEN M.META_ANO > 0
          THEN ROUND((NVL(AY.PRODUCAO_ANO,0) / M.META_ANO) * 100, 2)
        ELSE 0
      END AS "perc_meta_realizada",

      TO_CHAR(
        (NVL(AY.PRODUCAO_ANO,0) - M.META_ANO),
        'FML999G999G999G990D00',
        'NLS_NUMERIC_CHARACTERS='',.'' NLS_CURRENCY=''R$ '''
      ) AS "falta_para_meta"

    FROM META M
    JOIN DBACRESSEM.PA P
      ON P.NR_PA = M.NR_PA

    LEFT JOIN ASA_ANO AY
      ON AY.NR_PA = M.NR_PA
     AND AY.ANO = M.ANO

    LEFT JOIN ASA_SEMANA SW
      ON SW.NR_PA = M.NR_PA
     AND SW.ANO = M.ANO

    ORDER BY P.NR_PA, M.ANO
  `;
        case "saldo_previdencia_mi":
            return `
    WITH
    PARAMS AS (
      SELECT
        TO_DATE(:dt_inicio, 'DD/MM/YYYY') AS DT_INI_SEMANA,
        TO_DATE(:dt_fim, 'DD/MM/YYYY') AS DT_FIM_SEMANA
      FROM DUAL
    ),

    PMDN_BASE_ALL AS (
      SELECT
        PMDN.NR_PA,
        TRUNC(PMDN.DT_ADESAO) AS DT_MOV
      FROM DBACRESSEM.PREVIDENCIA_MI_DIARIO_NOVO PMDN
      WHERE PMDN.DT_ADESAO IS NOT NULL
        AND PMDN.NR_PA <> 4317
        AND DESC_SITUACAO_PARTICIPANTE = 'CONTRIBUINTE'
        AND DESC_TP_PARTICIPANTE <> 'CANCELADO'

      UNION ALL

      SELECT
        4317 AS NR_PA,
        TRUNC(PMDN.DT_ADESAO) AS DT_MOV
      FROM DBACRESSEM.PREVIDENCIA_MI_DIARIO_NOVO PMDN
      WHERE PMDN.DT_ADESAO IS NOT NULL
        AND DESC_SITUACAO_PARTICIPANTE = 'CONTRIBUINTE'
        AND DESC_TP_PARTICIPANTE <> 'CANCELADO'
        AND REGEXP_LIKE(TRIM(PMDN.NR_COOPERATIVA), '^[0-9]+$')
        AND TO_NUMBER(TRIM(PMDN.NR_COOPERATIVA)) = 4317
    ),

    PMDN_BASE AS (
      SELECT
        B.NR_PA,
        B.DT_MOV
      FROM PMDN_BASE_ALL B
      CROSS JOIN PARAMS PR
      WHERE
        (PR.DT_INI_SEMANA IS NULL AND PR.DT_FIM_SEMANA IS NULL)
        OR
        (B.DT_MOV BETWEEN NVL(PR.DT_INI_SEMANA, DATE '1900-01-01')
                     AND NVL(PR.DT_FIM_SEMANA, DATE '2999-12-31'))
    ),

    PMDN_ANO AS (
      SELECT
        B.NR_PA,
        EXTRACT(YEAR FROM NVL(PR.DT_FIM_SEMANA, SYSDATE)) AS ANO,
        COUNT(1) AS PRODUCAO_ANO
      FROM PMDN_BASE_ALL B
      CROSS JOIN PARAMS PR
      WHERE B.DT_MOV BETWEEN TRUNC(NVL(PR.DT_FIM_SEMANA, SYSDATE), 'YYYY')
                         AND NVL(PR.DT_FIM_SEMANA, SYSDATE)
      GROUP BY
        B.NR_PA,
        EXTRACT(YEAR FROM NVL(PR.DT_FIM_SEMANA, SYSDATE))
    ),

    PMDN_SEMANA AS (
      SELECT
        B.NR_PA,
        EXTRACT(YEAR FROM B.DT_MOV) AS ANO,
        COUNT(1) AS PRODUCAO_SEMANAL
      FROM PMDN_BASE B
      CROSS JOIN PARAMS PR
      WHERE
        (
          (PR.DT_INI_SEMANA IS NULL AND PR.DT_FIM_SEMANA IS NULL)
          AND B.DT_MOV BETWEEN TRUNC(SYSDATE, 'IW') AND (TRUNC(SYSDATE, 'IW') + 6)
        )
        OR
        (
          (PR.DT_INI_SEMANA IS NOT NULL OR PR.DT_FIM_SEMANA IS NOT NULL)
          AND B.DT_MOV BETWEEN NVL(PR.DT_INI_SEMANA, DATE '1900-01-01')
                          AND NVL(PR.DT_FIM_SEMANA, DATE '2999-12-31')
        )
      GROUP BY
        B.NR_PA,
        EXTRACT(YEAR FROM B.DT_MOV)
    ),

    META AS (
      SELECT
        MT.NR_PA,
        TO_NUMBER(MT.DT_ANO_META) AS ANO,
        MT.QTD_META AS META_ANO
      FROM DBACRESSEM.META_TOTAL_NOVA MT
      WHERE UPPER(MT.NM_PRODUTO) IN ('PREVIDÊNCIA MI')
    )

    SELECT
      P.NR_PA AS "numero_pa",
      P.NM_PA AS "nome_pa",

      ROUND(NVL(SW.PRODUCAO_SEMANAL, 0), 0) AS "producao_semanal",

      ROUND(NVL(M.META_ANO, 0) / 52, 0) AS "meta_semanal_ano",

      CASE
        WHEN ROUND(
          (NVL(M.META_ANO, 0) / 12) /
          CEIL(
            (
              LAST_DAY(TRUNC(NVL(PR.DT_FIM_SEMANA, SYSDATE), 'MM'))
              - TRUNC(NVL(PR.DT_FIM_SEMANA, SYSDATE), 'MM') + 1
            ) / 7
          )
        , 0) > 0
          THEN ROUND(
            (NVL(SW.PRODUCAO_SEMANAL,0) /
              ROUND(
                (NVL(M.META_ANO, 0) / 12) /
                CEIL(
                  (
                    LAST_DAY(TRUNC(NVL(PR.DT_FIM_SEMANA, SYSDATE), 'MM'))
                    - TRUNC(NVL(PR.DT_FIM_SEMANA, SYSDATE), 'MM') + 1
                  ) / 7
                )
              , 0)
            ) * 100
          , 2)
        ELSE 0
      END AS "porcentagem_semanal",

      ROUND(NVL(SW.PRODUCAO_SEMANAL, 0), 0)
      - ROUND(
          (NVL(M.META_ANO, 0) / 12) /
          CEIL(
            (
              LAST_DAY(TRUNC(NVL(PR.DT_FIM_SEMANA, SYSDATE), 'MM'))
              - TRUNC(NVL(PR.DT_FIM_SEMANA, SYSDATE), 'MM') + 1
            ) / 7
          )
        , 0) AS "gap_semanal",

      ROUND(NVL(AY.PRODUCAO_ANO, 0), 0) AS "producao_ano",

      ROUND(NVL(M.META_ANO, 0), 0) AS "meta_2026",

      CASE
        WHEN NVL(M.META_ANO, 0) > 0
          THEN ROUND((NVL(AY.PRODUCAO_ANO,0) / M.META_ANO) * 100, 2)
        ELSE 0
      END AS "perc_meta_realizada",

      ROUND(NVL(AY.PRODUCAO_ANO,0), 0) - ROUND(NVL(M.META_ANO,0), 0) AS "falta_para_meta"

    FROM META M
    JOIN DBACRESSEM.PA P
      ON P.NR_PA = M.NR_PA
    CROSS JOIN PARAMS PR

    LEFT JOIN PMDN_ANO AY
      ON AY.NR_PA = M.NR_PA
     AND AY.ANO = M.ANO

    LEFT JOIN PMDN_SEMANA SW
      ON SW.NR_PA = M.NR_PA
     AND SW.ANO = M.ANO

    ORDER BY P.NR_PA, M.ANO
  `;
        case "saldo_previdencia_vgbl":
            return `
    WITH
    PARAMS AS (
      SELECT
        TO_DATE(:dt_inicio, 'DD/MM/YYYY') AS DT_INI_SEMANA,
        TO_DATE(:dt_fim, 'DD/MM/YYYY') AS DT_FIM_SEMANA
      FROM DUAL
    ),

    PVPD_BASE_ALL AS (
      SELECT
        PVPD.NR_PA,
        TRUNC(PVPD.DT_PROPOSTA) AS DT_MOV,
        PVPD.NR_APOLICE_CERTIFICADO_SEGURO,
        PVPD.NR_COOPERATIVA,
        PVPD.DESC_PRODUTO,
        PVPD.DESC_TP_PROPOSTA
      FROM DBACRESSEM.PREVIDENCIA_VGBL_PRODUCAO_DIARIO PVPD
      WHERE PVPD.DT_PROPOSTA IS NOT NULL
        AND PVPD.NR_PA <> 4317
        AND UPPER(TRIM(PVPD.DESC_TP_PROPOSTA)) = 'SEGURO NOVO'
        AND TRIM(PVPD.DESC_PRODUTO) <> 'SQ-NOVO PECÚLIO PREVI'
        AND PVPD.NR_APOLICE_CERTIFICADO_SEGURO IS NOT NULL

      UNION ALL

      SELECT
        4317 AS NR_PA,
        TRUNC(PVPD.DT_PROPOSTA) AS DT_MOV,
        PVPD.NR_APOLICE_CERTIFICADO_SEGURO,
        PVPD.NR_COOPERATIVA,
        PVPD.DESC_PRODUTO,
        PVPD.DESC_TP_PROPOSTA
      FROM DBACRESSEM.PREVIDENCIA_VGBL_PRODUCAO_DIARIO PVPD
      WHERE PVPD.DT_PROPOSTA IS NOT NULL
        AND UPPER(TRIM(PVPD.DESC_TP_PROPOSTA)) = 'SEGURO NOVO'
        AND TRIM(PVPD.DESC_PRODUTO) <> 'SQ-NOVO PECÚLIO PREVI'
        AND PVPD.NR_APOLICE_CERTIFICADO_SEGURO IS NOT NULL
        AND REGEXP_LIKE(TRIM(PVPD.NR_COOPERATIVA), '^[0-9]+$')
        AND TO_NUMBER(TRIM(PVPD.NR_COOPERATIVA)) = 4317
    ),

    PVPD_BASE AS (
      SELECT
        B.*
      FROM PVPD_BASE_ALL B
      CROSS JOIN PARAMS PR
      WHERE
        (PR.DT_INI_SEMANA IS NULL AND PR.DT_FIM_SEMANA IS NULL)
        OR
        (B.DT_MOV BETWEEN NVL(PR.DT_INI_SEMANA, DATE '1900-01-01')
                     AND NVL(PR.DT_FIM_SEMANA, DATE '2999-12-31'))
    ),

    PVPD_ANO AS (
      SELECT
        B.NR_PA,
        EXTRACT(YEAR FROM NVL(PR.DT_FIM_SEMANA, SYSDATE)) AS ANO,
        COUNT(DISTINCT B.NR_APOLICE_CERTIFICADO_SEGURO) AS PRODUCAO_ANO
      FROM PVPD_BASE_ALL B
      CROSS JOIN PARAMS PR
      WHERE B.DT_MOV BETWEEN TRUNC(NVL(PR.DT_FIM_SEMANA, SYSDATE), 'YYYY')
                         AND NVL(PR.DT_FIM_SEMANA, SYSDATE)
      GROUP BY
        B.NR_PA,
        EXTRACT(YEAR FROM NVL(PR.DT_FIM_SEMANA, SYSDATE))
    ),

    PVPD_PERIODO AS (
      SELECT
        B.NR_PA,
        EXTRACT(YEAR FROM NVL(PR.DT_FIM_SEMANA, SYSDATE)) AS ANO,
        COUNT(DISTINCT B.NR_APOLICE_CERTIFICADO_SEGURO) AS PRODUCAO_SEMANAL
      FROM PVPD_BASE B
      CROSS JOIN PARAMS PR
      GROUP BY
        B.NR_PA,
        EXTRACT(YEAR FROM NVL(PR.DT_FIM_SEMANA, SYSDATE))
    ),

    META AS (
      SELECT
        MT.NR_PA,
        TO_NUMBER(MT.DT_ANO_META) AS ANO,
        MT.QTD_META AS META_ANO
      FROM DBACRESSEM.META_TOTAL_NOVA MT
      WHERE UPPER(MT.NM_PRODUTO) IN ('PREVIDÊNCIA VGBL')
    )

    SELECT
      P.NR_PA AS "numero_pa",
      P.NM_PA AS "nome_pa",

      ROUND(NVL(SW.PRODUCAO_SEMANAL, 0), 0) AS "producao_semanal",

      ROUND(NVL(M.META_ANO,0) / 12, 0) AS "meta_semanal_ano",

      CASE
        WHEN ROUND(
          (NVL(M.META_ANO,0) / 12) /
          CEIL(
            (
              LAST_DAY(TRUNC(NVL(PR.DT_FIM_SEMANA, SYSDATE), 'MM'))
              - TRUNC(NVL(PR.DT_FIM_SEMANA, SYSDATE), 'MM') + 1
            ) / 7
          )
        , 0) > 0
          THEN ROUND(
            (NVL(SW.PRODUCAO_SEMANAL,0) /
              ROUND(
                (NVL(M.META_ANO,0) / 12) /
                CEIL(
                  (
                    LAST_DAY(TRUNC(NVL(PR.DT_FIM_SEMANA, SYSDATE), 'MM'))
                    - TRUNC(NVL(PR.DT_FIM_SEMANA, SYSDATE), 'MM') + 1
                  ) / 7
                )
              , 0)
            ) * 100
          , 2)
        ELSE 0
      END AS "porcentagem_semanal",

      ROUND(NVL(SW.PRODUCAO_SEMANAL,0), 0)
      -
      ROUND(
        (NVL(M.META_ANO,0) / 12) /
        CEIL(
          (
            LAST_DAY(TRUNC(NVL(PR.DT_FIM_SEMANA, SYSDATE), 'MM'))
            - TRUNC(NVL(PR.DT_FIM_SEMANA, SYSDATE), 'MM') + 1
          ) / 7
        )
      , 0) AS "gap_semanal",

      ROUND(NVL(AY.PRODUCAO_ANO, 0), 0) AS "producao_ano",

      ROUND(NVL(M.META_ANO, 0), 0) AS "meta_2026",

      CASE
        WHEN NVL(M.META_ANO,0) > 0
          THEN ROUND((NVL(AY.PRODUCAO_ANO,0) / M.META_ANO) * 100, 2)
        ELSE 0
      END AS "perc_meta_realizada",

      ROUND(NVL(AY.PRODUCAO_ANO,0), 0) - ROUND(NVL(M.META_ANO,0), 0) AS "falta_para_meta"

    FROM META M
    JOIN DBACRESSEM.PA P
      ON P.NR_PA = M.NR_PA
    CROSS JOIN PARAMS PR

    LEFT JOIN PVPD_ANO AY
      ON AY.NR_PA = M.NR_PA
     AND AY.ANO = M.ANO

    LEFT JOIN PVPD_PERIODO SW
      ON SW.NR_PA = M.NR_PA
     AND SW.ANO = M.ANO

    ORDER BY P.NR_PA, M.ANO
  `;
        case "emprestimo_bancoob":
            return `
    WITH
    PARAMS AS (
      SELECT
        TO_DATE(:dt_inicio, 'DD/MM/YYYY') AS DT_INI_SEMANA,
        TO_DATE(:dt_fim, 'DD/MM/YYYY') AS DT_FIM_SEMANA
      FROM DUAL
    ),

    CCBD_BASE_ALL AS (
      SELECT
        NR_PA_LOCAL_NEGOCIO,
        TRUNC(CAST(DT_LIBERACAO_CREDITO AS DATE)) AS DT_MOV,
        NVL(VL_CONTRATO, 0) AS VL_CONTRATO_NUM
      FROM DBACRESSEM.CARTAO_CREDITO_BANCOOB_DIARIO
      WHERE DT_LIBERACAO_CREDITO IS NOT NULL
        AND DS_SUBMODALIDADE_BACEN = 'CRÉDITO PESSOAL - COM CONSIGNAÇÃO EM FOLHA DE PAGAM.'
        AND NVL(NR_PA_LOCAL_NEGOCIO, -1) <> 4317

      UNION ALL

      SELECT
        4317 AS NR_PA_LOCAL_NEGOCIO,
        TRUNC(CAST(DT_LIBERACAO_CREDITO AS DATE)) AS DT_MOV,
        NVL(VL_CONTRATO, 0) AS VL_CONTRATO_NUM
      FROM DBACRESSEM.CARTAO_CREDITO_BANCOOB_DIARIO
      WHERE DT_LIBERACAO_CREDITO IS NOT NULL
        AND DS_SUBMODALIDADE_BACEN = 'CRÉDITO PESSOAL - COM CONSIGNAÇÃO EM FOLHA DE PAGAM.'
        AND REGEXP_LIKE(TRIM(NR_COOPERATIVA_LOCAL_NEGOCIO), '^\\d+$')
        AND TO_NUMBER(TRIM(NR_COOPERATIVA_LOCAL_NEGOCIO)) = 4317
    ),

    CCBD_BASE AS (
      SELECT
        B.*
      FROM CCBD_BASE_ALL B
      CROSS JOIN PARAMS PR
      WHERE
        (PR.DT_INI_SEMANA IS NULL AND PR.DT_FIM_SEMANA IS NULL)
        OR
        (B.DT_MOV BETWEEN NVL(PR.DT_INI_SEMANA, DATE '1900-01-01')
                     AND NVL(PR.DT_FIM_SEMANA, DATE '2999-12-31'))
    ),

    CCBD_ANO AS (
      SELECT
        B.NR_PA_LOCAL_NEGOCIO AS NR_PA,
        EXTRACT(YEAR FROM B.DT_MOV) AS ANO,
        SUM(B.VL_CONTRATO_NUM) AS PRODUCAO_ANO
      FROM CCBD_BASE_ALL B
      CROSS JOIN PARAMS PR
      WHERE
        (
          (PR.DT_INI_SEMANA IS NULL AND PR.DT_FIM_SEMANA IS NULL)
        )
        OR
        (
          (PR.DT_INI_SEMANA IS NOT NULL OR PR.DT_FIM_SEMANA IS NOT NULL)
          AND B.DT_MOV BETWEEN TRUNC(NVL(PR.DT_FIM_SEMANA, SYSDATE), 'YYYY')
                          AND NVL(PR.DT_FIM_SEMANA, DATE '2999-12-31')
        )
      GROUP BY
        B.NR_PA_LOCAL_NEGOCIO,
        EXTRACT(YEAR FROM B.DT_MOV)
    ),

    CCBD_SEMANAL AS (
      SELECT
        B.NR_PA_LOCAL_NEGOCIO AS NR_PA,
        EXTRACT(YEAR FROM B.DT_MOV) AS ANO,
        SUM(B.VL_CONTRATO_NUM) AS PRODUCAO_SEMANAL
      FROM CCBD_BASE_ALL B
      CROSS JOIN PARAMS PR
      WHERE
        (
          (PR.DT_INI_SEMANA IS NULL AND PR.DT_FIM_SEMANA IS NULL)
          AND B.DT_MOV BETWEEN TRUNC(SYSDATE,'IW') AND (TRUNC(SYSDATE,'IW') + 6)
        )
        OR
        (
          (PR.DT_INI_SEMANA IS NOT NULL OR PR.DT_FIM_SEMANA IS NOT NULL)
          AND B.DT_MOV BETWEEN NVL(PR.DT_INI_SEMANA, DATE '1900-01-01')
                          AND NVL(PR.DT_FIM_SEMANA, DATE '2999-12-31')
        )
      GROUP BY
        B.NR_PA_LOCAL_NEGOCIO,
        EXTRACT(YEAR FROM B.DT_MOV)
    ),

    META AS (
      SELECT
        NR_PA,
        TO_NUMBER(DT_ANO_META) AS ANO,
        QTD_META AS META_ANO
      FROM DBACRESSEM.META_TOTAL_NOVA
      WHERE UPPER(NM_PRODUTO) IN ('EMPRÉSTIMO CONSIGNADO - CCS')
    )

    SELECT
      P.NR_PA AS "numero_pa",
      P.NM_PA AS "nome_pa",

      TO_CHAR(
        NVL(SW.PRODUCAO_SEMANAL, 0),
        'FML999G999G999G990D00',
        'NLS_NUMERIC_CHARACTERS='',.'' NLS_CURRENCY=''R$ '''
      ) AS "producao_semanal",

      TO_CHAR(
        ROUND(M.META_ANO / 52, 2),
        'FML999G999G999G990D00',
        'NLS_NUMERIC_CHARACTERS='',.'' NLS_CURRENCY=''R$ '''
      ) AS "meta_semanal_ano",

      CASE
        WHEN ROUND((M.META_ANO / 12) / 4, 2) > 0
          THEN ROUND((NVL(SW.PRODUCAO_SEMANAL,0) / ROUND((M.META_ANO / 12) / 4, 2)) * 100, 2)
        ELSE 0
      END AS "porcentagem_semanal",

      TO_CHAR(
        (NVL(SW.PRODUCAO_SEMANAL,0) - ROUND((M.META_ANO / 12) / 4, 2)),
        'FML999G999G999G990D00',
        'NLS_NUMERIC_CHARACTERS='',.'' NLS_CURRENCY=''R$ '''
      ) AS "gap_semanal",

      TO_CHAR(
        NVL(AY.PRODUCAO_ANO, 0),
        'FML999G999G999G990D00',
        'NLS_NUMERIC_CHARACTERS='',.'' NLS_CURRENCY=''R$ '''
      ) AS "producao_ano",

      TO_CHAR(
        NVL(M.META_ANO, 0),
        'FML999G999G999G990D00',
        'NLS_NUMERIC_CHARACTERS='',.'' NLS_CURRENCY=''R$ '''
      ) AS "meta_2026",

      CASE
        WHEN M.META_ANO > 0
          THEN ROUND((NVL(AY.PRODUCAO_ANO,0) / M.META_ANO) * 100, 2)
        ELSE 0
      END AS "perc_meta_realizada",

      TO_CHAR(
        (NVL(AY.PRODUCAO_ANO,0) - M.META_ANO),
        'FML999G999G999G990D00',
        'NLS_NUMERIC_CHARACTERS='',.'' NLS_CURRENCY=''R$ '''
      ) AS "falta_para_meta"

    FROM META M
    JOIN DBACRESSEM.PA P
      ON P.NR_PA = M.NR_PA

    LEFT JOIN CCBD_ANO AY
      ON AY.NR_PA = M.NR_PA
     AND AY.ANO   = M.ANO

    LEFT JOIN CCBD_SEMANAL SW
      ON SW.NR_PA = M.NR_PA
     AND SW.ANO   = M.ANO

    ORDER BY P.NR_PA
  `;
        case "consorcio":
            return `
    WITH
    PARAMS AS (
      SELECT
        TO_DATE(:dt_inicio,'DD/MM/YYYY') AS DT_INI_SEMANA,
        TO_DATE(:dt_fim,'DD/MM/YYYY')    AS DT_FIM_SEMANA
      FROM DUAL
    ),

    VENDEDORES_95 AS (
      SELECT 'YASMIN DE QUEIROZ LEMOS RIBEIRO' AS NM FROM DUAL UNION ALL
      SELECT 'CHRISTIAN JESUS SIQUEIRA' FROM DUAL UNION ALL
      SELECT 'GUSTAVO COLAFRANCESCO AMIM SOARES' FROM DUAL UNION ALL
      SELECT 'THIAGO SILVERIO DOS REIS' FROM DUAL
    ),

    CDN_BASE_ALL AS (
      SELECT
        NR_PA,
        TRUNC(TO_DATE(DT_ADESAO,'DD/MM/YYYY')) AS DT_MOV,
        NVL(VL_CONTRATADO,0) AS VL_CONTRATADO_NUM,
        SN_VENDA_CONCLUIDA,
        SITUACAO_COTA,
        DESC_VERSAO_COTA,
        NR_COOPERATIVA,
        NM_VENDEDOR
      FROM DBACRESSEM.CONSORCIO_MENSAL_NOVO
      WHERE DT_ADESAO IS NOT NULL

      UNION ALL

      SELECT
        4317 AS NR_PA,
        TRUNC(TO_DATE(DT_ADESAO,'DD/MM/YYYY')) AS DT_MOV,
        NVL(VL_CONTRATADO,0) AS VL_CONTRATADO_NUM,
        SN_VENDA_CONCLUIDA,
        SITUACAO_COTA,
        DESC_VERSAO_COTA,
        NR_COOPERATIVA,
        NM_VENDEDOR
      FROM DBACRESSEM.CONSORCIO_MENSAL_NOVO
      WHERE DT_ADESAO IS NOT NULL
        AND REGEXP_LIKE(TRIM(NR_COOPERATIVA), '^\\d+$')
        AND TO_NUMBER(TRIM(NR_COOPERATIVA)) = 4317
    ),

    CDN_BASE_AJUSTADA AS (
      SELECT
        CASE
          WHEN B.NR_PA = 0
           AND EXISTS (
             SELECT 1
             FROM VENDEDORES_95 V
             WHERE V.NM = UPPER(TRIM(B.NM_VENDEDOR))
           )
          THEN 95
          ELSE B.NR_PA
        END AS NR_PA_EFETIVO,
        B.*
      FROM CDN_BASE_ALL B
    ),

    CDN_BASE AS (
      SELECT B.*
      FROM CDN_BASE_AJUSTADA B
      CROSS JOIN PARAMS PR
      WHERE
        (PR.DT_INI_SEMANA IS NULL AND PR.DT_FIM_SEMANA IS NULL)
        OR
        (B.DT_MOV BETWEEN NVL(PR.DT_INI_SEMANA, DATE '1900-01-01')
                     AND NVL(PR.DT_FIM_SEMANA, DATE '2999-12-31'))
    ),

    CONS_ANO AS (
      SELECT
        B.NR_PA_EFETIVO AS NR_PA,
        EXTRACT(YEAR FROM B.DT_MOV) AS ANO,
        SUM(B.VL_CONTRATADO_NUM) AS PRODUCAO_ANO
      FROM CDN_BASE B
      CROSS JOIN PARAMS PR
      WHERE B.SN_VENDA_CONCLUIDA = 'SIM'
        AND B.SITUACAO_COTA <> 'EXCLUIDO'
        AND B.DESC_VERSAO_COTA = 'ATIVA'
        AND B.DT_MOV BETWEEN TRUNC(NVL(PR.DT_FIM_SEMANA, SYSDATE), 'YYYY')
                         AND NVL(PR.DT_FIM_SEMANA, SYSDATE)
      GROUP BY B.NR_PA_EFETIVO, EXTRACT(YEAR FROM B.DT_MOV)
    ),

    CONS_SEMANAL AS (
      SELECT
        B.NR_PA_EFETIVO AS NR_PA,
        EXTRACT(YEAR FROM B.DT_MOV) AS ANO,
        SUM(B.VL_CONTRATADO_NUM) AS PRODUCAO_SEMANAL
      FROM CDN_BASE B
      CROSS JOIN PARAMS PR
      WHERE B.SN_VENDA_CONCLUIDA = 'SIM'
        AND B.SITUACAO_COTA <> 'EXCLUIDO'
        AND B.DESC_VERSAO_COTA = 'ATIVA'
      GROUP BY B.NR_PA_EFETIVO, EXTRACT(YEAR FROM B.DT_MOV)
    ),

    META AS (
      SELECT
        NR_PA,
        TO_NUMBER(DT_ANO_META) AS ANO,
        QTD_META AS META_ANO
      FROM DBACRESSEM.META_TOTAL_NOVA
      WHERE UPPER(NM_PRODUTO) IN ('CONSÓRCIOS')
    ),

    PA_REL AS (
      SELECT DISTINCT NR_PA, ANO
      FROM META
    )

    SELECT
      R.NR_PA AS "numero_pa",
      P.NM_PA AS "nome_pa",

      TO_CHAR(
        NVL(SW.PRODUCAO_SEMANAL, 0),
        'FML999G999G999G990D00',
        'NLS_NUMERIC_CHARACTERS='',.'' NLS_CURRENCY=''R$ '''
      ) AS "producao_semanal",

      TO_CHAR(
        ROUND(M.META_ANO / 52, 2),
        'FML999G999G999G990D00',
        'NLS_NUMERIC_CHARACTERS='',.'' NLS_CURRENCY=''R$ '''
      ) AS "meta_semanal_ano",

      CASE
        WHEN ROUND(
          (M.META_ANO / 12) /
          CEIL(
            (LAST_DAY(ADD_MONTHS(TRUNC(SYSDATE,'MM'),1))
             - ADD_MONTHS(TRUNC(SYSDATE,'MM'),1) + 1) / 7
          )
        , 2) > 0
        THEN ROUND(
          (NVL(SW.PRODUCAO_SEMANAL,0) /
            ROUND(
              (M.META_ANO / 12) /
              CEIL(
                (LAST_DAY(ADD_MONTHS(TRUNC(SYSDATE,'MM'),1))
                 - ADD_MONTHS(TRUNC(SYSDATE,'MM'),1) + 1) / 7
              )
            , 2)
          ) * 100
        , 2)
        ELSE 0
      END AS "porcentagem_semanal",

      TO_CHAR(
        (NVL(SW.PRODUCAO_SEMANAL,0) -
          ROUND(
            (M.META_ANO / 12) /
            CEIL(
              (LAST_DAY(ADD_MONTHS(TRUNC(SYSDATE,'MM'),1))
               - ADD_MONTHS(TRUNC(SYSDATE,'MM'),1) + 1) / 7
            )
          , 2)
        ),
        'FML999G999G999G990D00',
        'NLS_NUMERIC_CHARACTERS='',.'' NLS_CURRENCY=''R$ '''
      ) AS "gap_semanal",

      TO_CHAR(
        NVL(AY.PRODUCAO_ANO, 0),
        'FML999G999G999G990D00',
        'NLS_NUMERIC_CHARACTERS='',.'' NLS_CURRENCY=''R$ '''
      ) AS "producao_ano",

      TO_CHAR(
        NVL(M.META_ANO, 0),
        'FML999G999G999G990D00',
        'NLS_NUMERIC_CHARACTERS='',.'' NLS_CURRENCY=''R$ '''
      ) AS "meta_2026",

      CASE
        WHEN M.META_ANO > 0
          THEN ROUND((NVL(AY.PRODUCAO_ANO,0) / M.META_ANO) * 100, 2)
        ELSE 0
      END AS "perc_meta_realizada",

      TO_CHAR(
        (NVL(AY.PRODUCAO_ANO,0) - M.META_ANO),
        'FML999G999G999G990D00',
        'NLS_NUMERIC_CHARACTERS='',.'' NLS_CURRENCY=''R$ '''
      ) AS "falta_para_meta"

    FROM PA_REL R
    JOIN META M
      ON M.NR_PA = R.NR_PA
     AND M.ANO   = R.ANO
    JOIN DBACRESSEM.PA P
      ON P.NR_PA = R.NR_PA

    CROSS JOIN PARAMS PR

    LEFT JOIN CONS_ANO AY
      ON AY.NR_PA = R.NR_PA
     AND AY.ANO   = R.ANO

    LEFT JOIN CONS_SEMANAL SW
      ON SW.NR_PA = R.NR_PA
     AND SW.ANO   = R.ANO

    ORDER BY R.NR_PA
  `;

        default:
            throw new Error("Tema não implementado");
    }
}