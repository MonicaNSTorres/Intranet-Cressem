import { Request, Response } from "express";
import oracledb from "oracledb";
import { oracleExecute } from "../services/oracle.service";

function onlyDigits(v: string) {
  return String(v || "").replace(/\D/g, "");
}

function toTrim(v: any) {
  return String(v || "").trim();
}

function toUpperTrim(v: any) {
  return String(v || "").trim().toUpperCase();
}

export const consultaContratosController = {
  async listarPaginado(req: Request, res: Response) {
    try {
      const NM_EMPRESA = toTrim(req.query.NM_EMPRESA);
      const NR_CNPJ = onlyDigits(String(req.query.NR_CNPJ || ""));
      const NM_CIDADE = toTrim(req.query.NM_CIDADE);
      const NM_TIPO_CONTRATO = toTrim(req.query.NM_TIPO_CONTRATO);
      const NM_SISTEMA_CONSIG = toTrim(req.query.NM_SISTEMA_CONSIG);
      const SN_ATIVO_RAW = String(req.query.SN_ATIVO ?? "").trim();

      const current_page = Math.max(Number(req.query.page || 1), 1);
      const limit = Math.max(Number(req.query.limit || 10), 1);
      const offset = (current_page - 1) * limit;

      let where = ` WHERE 1 = 1 `;
      const bindsWhere: any = {};

      if (NM_EMPRESA) {
        where += ` AND UPPER(NM_EMPRESA) LIKE :NM_EMPRESA `;
        bindsWhere.NM_EMPRESA = `%${toUpperTrim(NM_EMPRESA)}%`;
      }

      if (NR_CNPJ) {
        where += ` AND REGEXP_REPLACE(NR_CNPJ, '[^0-9]', '') = :NR_CNPJ `;
        bindsWhere.NR_CNPJ = NR_CNPJ;
      }

      if (NM_CIDADE) {
        where += ` AND UPPER(NM_CIDADE) LIKE :NM_CIDADE `;
        bindsWhere.NM_CIDADE = `%${toUpperTrim(NM_CIDADE)}%`;
      }

      if (NM_TIPO_CONTRATO) {
        where += ` AND UPPER(NM_TIPO_CONTRATO) LIKE :NM_TIPO_CONTRATO `;
        bindsWhere.NM_TIPO_CONTRATO = `%${toUpperTrim(NM_TIPO_CONTRATO)}%`;
      }

      if (NM_SISTEMA_CONSIG) {
        where += ` AND UPPER(NM_SISTEMA_CONSIG) LIKE :NM_SISTEMA_CONSIG `;
        bindsWhere.NM_SISTEMA_CONSIG = `%${toUpperTrim(NM_SISTEMA_CONSIG)}%`;
      }

      if (SN_ATIVO_RAW !== "") {
        where += ` AND SN_ATIVO = :SN_ATIVO `;
        bindsWhere.SN_ATIVO = Number(SN_ATIVO_RAW);
      }

      const sqlCount = `
        SELECT COUNT(*) AS TOTAL_ITEMS
        FROM DBACRESSEM.CONTRATOS_EMPRESAS
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
            c.ID_CONTRATOS_EMPRESAS,
            c.NR_CNPJ,
            c.NM_EMPRESA,
            c.NM_CIDADE,
            c.NM_TIPO_CONTRATO,
            c.NM_SISTEMA_CONSIG,
            TO_CHAR(c.DT_INICIO, 'YYYY-MM-DD') AS DT_INICIO,
            TO_CHAR(c.DT_FIM, 'YYYY-MM-DD') AS DT_FIM,
            c.SN_ATIVO,
            c.CD_CONTA_CAPITAL,
            c.NM_TIPO_TEMPO_CONTRATO,
            c.OBS_CONTRATO,
            ROW_NUMBER() OVER (ORDER BY c.ID_CONTRATOS_EMPRESAS DESC) AS RN
          FROM DBACRESSEM.CONTRATOS_EMPRESAS c
          ${where}
        )
        WHERE RN > :offset
          AND RN <= (:offset + :limit)
      `;

      const result = await oracleExecute(
        sql,
        {
          ...bindsWhere,
          offset,
          limit,
        },
        {
          outFormat: oracledb.OUT_FORMAT_OBJECT,
        }
      );

      return res.json({
        items: result.rows || [],
        total_items,
        total_pages,
        current_page,
      });
    } catch (err: any) {
      console.error("listarPaginado contratos erro:", err);
      return res.status(500).json({
        error: "Falha ao listar contratos.",
        details: String(err?.message || err),
      });
    }
  },

  async buscarPorId(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);

      if (!id) {
        return res.status(400).json({
          error: "ID_CONTRATOS_EMPRESAS inválido.",
        });
      }

      const sql = `
        SELECT
          ID_CONTRATOS_EMPRESAS,
          NR_CNPJ,
          NM_EMPRESA,
          NM_CIDADE,
          NM_TIPO_CONTRATO,
          NM_SISTEMA_CONSIG,
          TO_CHAR(DT_INICIO, 'YYYY-MM-DD') AS DT_INICIO,
          TO_CHAR(DT_FIM, 'YYYY-MM-DD') AS DT_FIM,
          SN_ATIVO,
          CD_CONTA_CAPITAL,
          NM_TIPO_TEMPO_CONTRATO,
          OBS_CONTRATO
        FROM DBACRESSEM.CONTRATOS_EMPRESAS
        WHERE ID_CONTRATOS_EMPRESAS = :id
      `;

      const result = await oracleExecute(
        sql,
        { id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      if (!result.rows?.length) {
        return res.status(404).json({
          error: "Contrato não encontrado.",
        });
      }

      return res.json(result.rows[0]);
    } catch (err: any) {
      console.error("buscarPorId contratos erro:", err);
      return res.status(500).json({
        error: "Falha ao buscar contrato.",
        details: String(err?.message || err),
      });
    }
  },

  async listarCidades(req: Request, res: Response) {
    try {
      const sql = `
        SELECT DISTINCT NM_CIDADE
        FROM DBACRESSEM.CONTRATOS_EMPRESAS
        WHERE NM_CIDADE IS NOT NULL
          AND TRIM(NM_CIDADE) <> ''
        ORDER BY NM_CIDADE
      `;

      const result = await oracleExecute(sql, {}, {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
      });

      const cidades = (result.rows || [])
        .map((row: any) => String(row.NM_CIDADE || "").trim())
        .filter(Boolean);

      return res.json(cidades);
    } catch (err: any) {
      console.error("listarCidades contratos erro:", err);
      return res.status(500).json({
        error: "Falha ao listar cidades de contratos.",
        details: String(err?.message || err),
      });
    }
  },

  async listarTiposContrato(req: Request, res: Response) {
    try {
      const sql = `
        SELECT DISTINCT NM_TIPO_CONTRATO
        FROM DBACRESSEM.CONTRATOS_EMPRESAS
        WHERE NM_TIPO_CONTRATO IS NOT NULL
          AND TRIM(NM_TIPO_CONTRATO) <> ''
        ORDER BY NM_TIPO_CONTRATO
      `;

      const result = await oracleExecute(sql, {}, {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
      });

      const tipos = (result.rows || [])
        .map((row: any) => String(row.NM_TIPO_CONTRATO || "").trim())
        .filter(Boolean);

      return res.json(tipos);
    } catch (err: any) {
      console.error("listarTiposContrato contratos erro:", err);
      return res.status(500).json({
        error: "Falha ao listar tipos de contrato.",
        details: String(err?.message || err),
      });
    }
  },

  async listarSistemas(req: Request, res: Response) {
    try {
      const sql = `
        SELECT DISTINCT NM_SISTEMA_CONSIG
        FROM DBACRESSEM.CONTRATOS_EMPRESAS
        WHERE NM_SISTEMA_CONSIG IS NOT NULL
          AND TRIM(NM_SISTEMA_CONSIG) <> ''
        ORDER BY NM_SISTEMA_CONSIG
      `;

      const result = await oracleExecute(sql, {}, {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
      });

      const sistemas = (result.rows || [])
        .map((row: any) => String(row.NM_SISTEMA_CONSIG || "").trim())
        .filter(Boolean);

      return res.json(sistemas);
    } catch (err: any) {
      console.error("listarSistemas contratos erro:", err);
      return res.status(500).json({
        error: "Falha ao listar sistemas consignados.",
        details: String(err?.message || err),
      });
    }
  },
};