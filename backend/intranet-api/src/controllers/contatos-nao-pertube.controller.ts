import { Request, Response } from "express";
import oracledb from "oracledb";
import { oracleExecute } from "../services/oracle.service";

function toTrim(value: unknown) {
  return String(value || "").trim();
}

function toUpperLike(value: unknown) {
  const v = toTrim(value).toUpperCase();
  return v ? `%${v}%` : "";
}

function onlyDigits(value: unknown) {
  return String(value || "").replace(/\D/g, "");
}

export const contatosNaoPertubeController = {
  async listarPaginado(req: Request, res: Response) {
    try {
      const q = toTrim(req.query.q);
      const nome = toTrim(req.query.nome);
      const cpfCnpj = onlyDigits(req.query.cpfCnpj);
      const contato = onlyDigits(req.query.contato);
      const pa = toTrim(req.query.pa);
      const empresa = toTrim(req.query.empresa);
      const cidade = toTrim(req.query.cidade);

      const current_page = Math.max(Number(req.query.page || 1), 1);
      const limit = Math.max(Number(req.query.limit || 10), 1);
      const offset = (current_page - 1) * limit;

      let where = " WHERE 1 = 1 ";
      const bindsWhere: any = {};

      if (q) {
        const qDigits = onlyDigits(q);

        where += `
          AND (
            UPPER(NVL(NM_CONTATO, '')) LIKE :q
            OR REGEXP_REPLACE(NVL(NR_CPF_CNPJ, ''), '[^0-9]', '') LIKE :q_digits
            OR REGEXP_REPLACE(NVL(NR_CONTATO, ''), '[^0-9]', '') LIKE :q_digits
            OR UPPER(NVL(NR_PA, '')) LIKE :q
            OR UPPER(NVL(NM_EMPRESA, '')) LIKE :q
            OR UPPER(NVL(CIDADE, '')) LIKE :q
          )
        `;
        bindsWhere.q = toUpperLike(q);
        bindsWhere.q_digits = qDigits ? `%${qDigits}%` : "###SEM_DIGITOS###";
      }

      if (nome) {
        where += " AND UPPER(NVL(NM_CONTATO, '')) LIKE :nome ";
        bindsWhere.nome = toUpperLike(nome);
      }

      if (cpfCnpj) {
        where += " AND REGEXP_REPLACE(NVL(NR_CPF_CNPJ, ''), '[^0-9]', '') LIKE :cpfCnpj ";
        bindsWhere.cpfCnpj = `%${cpfCnpj}%`;
      }

      if (contato) {
        where += " AND REGEXP_REPLACE(NVL(NR_CONTATO, ''), '[^0-9]', '') LIKE :contato ";
        bindsWhere.contato = `%${contato}%`;
      }

      if (pa) {
        where += " AND UPPER(NVL(NR_PA, '')) LIKE :pa ";
        bindsWhere.pa = toUpperLike(pa);
      }

      if (empresa) {
        where += " AND UPPER(NVL(NM_EMPRESA, '')) LIKE :empresa ";
        bindsWhere.empresa = toUpperLike(empresa);
      }

      if (cidade) {
        where += " AND UPPER(NVL(CIDADE, '')) LIKE :cidade ";
        bindsWhere.cidade = toUpperLike(cidade);
      }

      const sqlCount = `
        SELECT COUNT(*) AS TOTAL_ITEMS
        FROM DBACRESSEM.CONTATO_BLIP_NAO_PERTUBE
        ${where}
      `;

      const countResult = await oracleExecute(sqlCount, bindsWhere, {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
      });

      const total_items = Number((countResult.rows?.[0] as any)?.TOTAL_ITEMS || 0);
      const total_pages = Math.max(Math.ceil(total_items / limit), 1);

      const sql = `
        SELECT *
        FROM (
          SELECT
            ID_CONTATO_BLIP_NAO_PERTUBE,
            NM_CONTATO,
            NR_CPF_CNPJ,
            TO_CHAR(DIA_REGISTRO, 'YYYY-MM-DD HH24:MI:SS') AS DIA_REGISTRO,
            NR_CONTATO,
            NR_PA,
            NM_EMPRESA,
            CIDADE,
            ROW_NUMBER() OVER (
              ORDER BY
                NLSSORT(UPPER(NVL(NM_CONTATO, '')), 'NLS_SORT=BINARY_AI') ASC,
                ID_CONTATO_BLIP_NAO_PERTUBE ASC
            ) AS RN
          FROM DBACRESSEM.CONTATO_BLIP_NAO_PERTUBE
          ${where}
        )
        WHERE RN > :offset
          AND RN <= (:offset + :limit)
        ORDER BY RN
      `;

      const result = await oracleExecute(
        sql,
        {
          ...bindsWhere,
          offset,
          limit,
        },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      return res.json({
        items: result.rows || [],
        total_items,
        total_pages,
        current_page,
      });
    } catch (err: any) {
      console.error("contatosNaoPertube listarPaginado erro:", err);
      return res.status(500).json({
        error: "Falha ao listar contatos do Não Perturbe.",
        details: String(err?.message || err),
      });
    }
  },
};
