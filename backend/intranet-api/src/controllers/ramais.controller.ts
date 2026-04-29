import { Request, Response } from "express";
import oracledb from "oracledb";
import { oracleExecute } from "../services/oracle.service";

function likeValue(value: unknown) {
  const v = String(value || "").trim().toUpperCase();
  return v ? `%${v}%` : null;
}

function textValue(value: unknown) {
  const v = String(value || "").trim();
  return v ? v : null;
}

function normalizeSortBy(value: unknown) {
  const v = String(value || "").trim().toLowerCase();

  if (v === "ramal") return "ramal";
  if (v === "departamento") return "departamento";
  return "nome";
}

function normalizeSortOrder(value: unknown) {
  const v = String(value || "").trim().toLowerCase();
  return v === "desc" ? "DESC" : "ASC";
}

export const ramaisController = {
  async listar(req: Request, res: Response) {
    try {
      const q = likeValue(req.query.q);
      const nome = likeValue(req.query.nome);
      const ramal = textValue(req.query.ramal);
      const departamento = likeValue(req.query.departamento);
      const login = likeValue(req.query.login);
      const email = likeValue(req.query.email);

      // deixe preparado; só use quando descobrir a coluna real no banco
      const cidade = likeValue(req.query.cidade);

      const sortBy = normalizeSortBy(req.query.sortBy);
      const sortOrder = normalizeSortOrder(req.query.sortOrder);

      const orderByMap: Record<string, string> = {
        nome: `BASE.NOME ${sortOrder}`,
        ramal: `BASE.RAMAL ${sortOrder}`,
        departamento: `BASE.DEPARTAMENTO ${sortOrder}`,
      };

      const orderBy = orderByMap[sortBy] || `BASE.NOME ${sortOrder}`;

      const sql = `
WITH FILTROS AS (
  SELECT
    :q AS Q,
    :nome AS NOME,
    :ramal AS RAMAL,
    :departamento AS DEPARTAMENTO,
    :login AS LOGIN,
    :email AS EMAIL,
    :cidade AS CIDADE
  FROM DUAL
),
BASE AS (
  SELECT
    FS.ID_FUNCIONARIO AS ID,
    FS.NR_RAMAL AS RAMAL,
    FS.NM_FUNCIONARIO AS NOME,
    SSC.NM_SETOR AS DEPARTAMENTO,
    FS.EMAIL AS EMAIL,
    FS.NM_LOGIN AS LOGIN
    -- Quando descobrir a coluna real, descomente:
    -- , FS.NM_CIDADE AS CIDADE
  FROM DBACRESSEM.FUNCIONARIOS_SICOOB_CRESSEM FS
  INNER JOIN DBACRESSEM.SETOR_SICOOB_CRESSEM SSC
    ON SSC.ID_SETOR = FS.ID_SETOR
  WHERE FS.SN_ATIVO = 1
)
SELECT
  BASE.ID,
  BASE.RAMAL,
  BASE.NOME,
  BASE.DEPARTAMENTO,
  BASE.EMAIL,
  BASE.LOGIN
  -- Quando descobrir a coluna real, descomente:
  -- , BASE.CIDADE
FROM BASE
CROSS JOIN FILTROS
WHERE 1 = 1
  AND (FILTROS.NOME IS NULL OR UPPER(BASE.NOME) LIKE FILTROS.NOME)
  AND (FILTROS.RAMAL IS NULL OR TO_CHAR(BASE.RAMAL) LIKE '%' || FILTROS.RAMAL || '%')
  AND (FILTROS.DEPARTAMENTO IS NULL OR UPPER(BASE.DEPARTAMENTO) LIKE FILTROS.DEPARTAMENTO)
  AND (FILTROS.LOGIN IS NULL OR UPPER(BASE.LOGIN) LIKE FILTROS.LOGIN)
  AND (FILTROS.EMAIL IS NULL OR UPPER(BASE.EMAIL) LIKE FILTROS.EMAIL)

  -- Quando descobrir a coluna real, descomente:
  -- AND (FILTROS.CIDADE IS NULL OR UPPER(BASE.CIDADE) LIKE FILTROS.CIDADE)

  AND (
    FILTROS.Q IS NULL
    OR UPPER(BASE.NOME) LIKE FILTROS.Q
    OR UPPER(BASE.DEPARTAMENTO) LIKE FILTROS.Q
    OR UPPER(BASE.EMAIL) LIKE FILTROS.Q
    OR UPPER(BASE.LOGIN) LIKE FILTROS.Q
    OR TO_CHAR(BASE.RAMAL) LIKE '%' || REPLACE(FILTROS.Q, '%', '') || '%'
    -- Quando descobrir a coluna real, descomente:
    -- OR UPPER(BASE.CIDADE) LIKE FILTROS.Q
  )
ORDER BY ${orderBy}
      `;

      const result = await oracleExecute(
        sql,
        {
          q,
          nome,
          ramal,
          departamento,
          login,
          email,
          cidade,
        },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      return res.json({ data: result.rows || [] });
    } catch (err: any) {
      console.error("ramais listar erro:", err);
      return res.status(500).json({
        error: "Falha ao listar ramais.",
        details: String(err?.message || err),
      });
    }
  },
};