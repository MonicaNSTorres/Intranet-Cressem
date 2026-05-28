import { Request, Response } from "express";
import oracledb from "oracledb";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { oracleExecute } from "../services/oracle.service";
import { registrarMonitorMeta } from "../services/monitor-meta.service";
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

const AD_GROUP_SUPORTE = "GG_USERS_SUPORTE";
const DEBUG_FORCAR_GERENTE_NOME = String(process.env.META_PA_DEBUG_GERENTE_NOME || "").trim();

const SQL_USUARIO_NIVEL = `
SELECT
  f.ID_FUNCIONARIO,
  UPPER(TRIM(NVL(c.NM_NIVEL, ''))) AS NM_NIVEL,
  UPPER(TRIM(NVL(f.NM_FUNCIONARIO, ''))) AS NM_FUNCIONARIO
FROM DBACRESSEM.FUNCIONARIOS_SICOOB_CRESSEM f
LEFT JOIN DBACRESSEM.CARGO_GERENTES_SICOOB_CRESSEM c
  ON c.ID_CARGO = f.ID_CARGO
WHERE UPPER(TRIM(NVL(f.NM_LOGIN, ''))) = UPPER(TRIM(:login))
FETCH FIRST 1 ROWS ONLY
`;

const SQL_SUBORDINADOS_POR_GESTOR = `
SELECT DISTINCT
  UPPER(TRIM(NVL(f.NM_FUNCIONARIO, ''))) AS NM_FUNCIONARIO
FROM DBACRESSEM.FUNCIONARIOS_SICOOB_CRESSEM f
WHERE f.ID_FUNCIONARIO IS NOT NULL
  AND UPPER(TRIM(NVL(f.NM_FUNCIONARIO, ''))) IS NOT NULL
START WITH f.CD_GERENCIA = :id_gestor
CONNECT BY NOCYCLE PRIOR f.ID_FUNCIONARIO = f.CD_GERENCIA
`;

const SQL_PA_GESTAO_ALL = `
SELECT
  TRIM(NR_PA) AS NR_PA,
  UPPER(TRIM(NVL(NM_GERENTE, ''))) AS NM_GERENTE
FROM DBACRESSEM.PA_GESTAO
`;

const SQL_FUNCIONARIO_POR_NOME = `
SELECT
  f.ID_FUNCIONARIO,
  UPPER(TRIM(NVL(f.NM_FUNCIONARIO, ''))) AS NM_FUNCIONARIO
FROM DBACRESSEM.FUNCIONARIOS_SICOOB_CRESSEM f
WHERE UPPER(TRIM(NVL(f.NM_FUNCIONARIO, ''))) = UPPER(TRIM(:nome_funcionario))
FETCH FIRST 1 ROWS ONLY
`;

function toUpperTrim(value: any) {
  return String(value || "").trim().toUpperCase();
}

function hasGroup(grupos: string[], target: string) {
  const alvo = toUpperTrim(target);
  return grupos.some((g) => toUpperTrim(g) === alvo);
}

function parseNumeroPa(value: any) {
  const txt = String(value ?? "").trim();
  if (!txt) return "";

  if (/^\d+$/.test(txt)) {
    return String(Number(txt));
  }

  return txt.toUpperCase();
}

async function buscarNomesSubordinadosPorId(idGestor: number) {
  if (!idGestor) return new Set<string>();

  const subordinadosResult = await oracleExecute(
    SQL_SUBORDINADOS_POR_GESTOR,
    { id_gestor: idGestor },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  return new Set<string>(
    (subordinadosResult.rows || [])
      .map((row: any) => toUpperTrim(row.NM_FUNCIONARIO))
      .filter((nome: string) => Boolean(nome))
  );
}

async function buscarPaPermitidosPorNomesGestor(nomesGestor: Set<string>) {
  if (!nomesGestor.size) return new Set<string>();

  const paGestaoResult = await oracleExecute(
    SQL_PA_GESTAO_ALL,
    {},
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  return new Set<string>(
    (paGestaoResult.rows || [])
      .filter((row: any) => nomesGestor.has(toUpperTrim(row.NM_GERENTE)))
      .map((row: any) => parseNumeroPa(row.NR_PA))
      .filter((nrPa: string) => Boolean(nrPa))
  );
}

async function buscarPerfilAcessoMetaPA(user?: AuthenticatedRequest["user"]) {
  const login = String(user?.sub || "").trim();
  const nomeAd = String(user?.nome_completo || "").trim();
  const grupos = Array.isArray(user?.grupos) ? user!.grupos! : [];

  if (!login && !nomeAd) {
    return {
      verTudo: false,
      nrPaPermitidos: new Set<string>(),
    };
  }

  if (hasGroup(grupos, AD_GROUP_SUPORTE)) {
    return {
      verTudo: true,
      nrPaPermitidos: new Set<string>(),
    };
  }

  let nomeFuncionario = "";
  let idFuncionario = 0;

  if (login) {
    const perfilResult = await oracleExecute(
      SQL_USUARIO_NIVEL,
      { login },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const perfil: any = perfilResult.rows?.[0] || {};
    const nmNivel = toUpperTrim(perfil.NM_NIVEL);
    idFuncionario = Number(perfil.ID_FUNCIONARIO || 0);
    nomeFuncionario = String(perfil.NM_FUNCIONARIO || "").trim();

    if (nmNivel === "DIRETORIA") {
      return {
        verTudo: true,
        nrPaPermitidos: new Set<string>(),
      };
    }
  }

  const nomesGestorPermitidos = new Set<string>();
  if (nomeAd) nomesGestorPermitidos.add(toUpperTrim(nomeAd));
  if (nomeFuncionario) nomesGestorPermitidos.add(toUpperTrim(nomeFuncionario));

  if (idFuncionario) {
    const nomesSubordinados = await buscarNomesSubordinadosPorId(idFuncionario);
    nomesSubordinados.forEach((nome) => nomesGestorPermitidos.add(nome));
  }

  const nrPaPermitidos = await buscarPaPermitidosPorNomesGestor(nomesGestorPermitidos);

  return {
    verTudo: false,
    nrPaPermitidos,
  };
}

async function buscarPaPermitidosSomenteGerente(nomeGerente: string) {
  const nome = String(nomeGerente || "").trim();
  if (!nome) {
    return new Set<string>();
  }

  const funcionarioResult = await oracleExecute(
    SQL_FUNCIONARIO_POR_NOME,
    { nome_funcionario: nome },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  const funcionario: any = funcionarioResult.rows?.[0] || {};
  const idFuncionario = Number(funcionario.ID_FUNCIONARIO || 0);

  const nomesGestorPermitidos = new Set<string>([toUpperTrim(nome)]);

  if (funcionario.NM_FUNCIONARIO) {
    nomesGestorPermitidos.add(toUpperTrim(funcionario.NM_FUNCIONARIO));
  }

  if (idFuncionario) {
    const nomesSubordinados = await buscarNomesSubordinadosPorId(idFuncionario);
    nomesSubordinados.forEach((nm) => nomesGestorPermitidos.add(nm));
  }

  return await buscarPaPermitidosPorNomesGestor(nomesGestorPermitidos);
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
            const authReq = req as AuthenticatedRequest;
            const forcarNomeGerente = String(
                req.query.forcar_nome_gerente || DEBUG_FORCAR_GERENTE_NOME || ""
            ).trim();


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

            let rowsFiltradas = rows;

            if (forcarNomeGerente) {
                const nrPaPermitidos = await buscarPaPermitidosSomenteGerente(forcarNomeGerente);
                rowsFiltradas = rows.filter((row: any) =>
                    nrPaPermitidos.has(parseNumeroPa(row.numero_pa))
                );
            } else {
                const perfilAcesso = await buscarPerfilAcessoMetaPA(authReq.user);
                rowsFiltradas = perfilAcesso.verTudo
                    ? rows
                    : rows.filter((row: any) =>
                        perfilAcesso.nrPaPermitidos.has(parseNumeroPa(row.numero_pa))
                    );
            }

            try {
                await registrarMonitorMeta({
                    tela: "producao_meta_cooperativa_pa",
                    tema,
                    periodo: `${periodo.dt_inicio}|${periodo.dt_fim}`,
                    fonte: "API_PRODUCAO_META_COOPERATIVA_PA",
                    dtFimPeriodo: periodo.dt_fim,
                    rows: rowsFiltradas,
                });
            } catch (monitorErr: any) {
                console.error("Erro ao registrar monitor meta cooperativa:", monitorErr);
            }

            return res.json(rowsFiltradas);
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
