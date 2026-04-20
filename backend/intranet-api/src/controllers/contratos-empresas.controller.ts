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

function toNullableDate(v: any) {
  if (!v) return null;
  return String(v).slice(0, 10);
}

function toNullableNumber(v: any) {
  if (v === null || v === undefined || v === "") return null;

  if (typeof v === "string") {
    const normalized = v.replace(/\./g, "").replace(",", ".");
    const n = Number(normalized);
    return Number.isFinite(n) ? n : null;
  }

  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export const contratosEmpresasController = {
  async criar(req: Request, res: Response) {
    try {
      const {
        NR_CNPJ,
        NM_EMPRESA,
        NM_CIDADE,
        NM_TIPO_TEMPO_CONTRATO,
        CD_CONTA_CAPITAL,
        NM_TIPO_CONTRATO,
        NM_SISTEMA_CONSIG,
        DT_INICIO,
        DT_FIM,
        OBS_CONTRATO,
      } = req.body || {};

      if (!NM_EMPRESA) {
        return res.status(400).json({
          error: "NM_EMPRESA é obrigatório.",
        });
      }

      if (!NR_CNPJ) {
        return res.status(400).json({
          error: "NR_CNPJ é obrigatório.",
        });
      }

      if (!CD_CONTA_CAPITAL) {
        return res.status(400).json({
          error: "CD_CONTA_CAPITAL é obrigatório.",
        });
      }

      if (!NM_TIPO_TEMPO_CONTRATO) {
        return res.status(400).json({
          error: "NM_TIPO_TEMPO_CONTRATO é obrigatório.",
        });
      }

      if (!NM_CIDADE) {
        return res.status(400).json({
          error: "NM_CIDADE é obrigatório.",
        });
      }

      if (!NM_TIPO_CONTRATO) {
        return res.status(400).json({
          error: "NM_TIPO_CONTRATO é obrigatório.",
        });
      }

      if (!DT_INICIO) {
        return res.status(400).json({
          error: "DT_INICIO é obrigatório.",
        });
      }

      if (
        String(NM_TIPO_TEMPO_CONTRATO).toUpperCase() === "DETERMINADO" &&
        !DT_FIM
      ) {
        return res.status(400).json({
          error: "DT_FIM é obrigatório para contratos determinados.",
        });
      }

      const sql = `
        INSERT INTO DBACRESSEM.CONTRATOS_EMPRESAS (
          NR_CNPJ,
          NM_EMPRESA,
          NM_CIDADE,
          NM_TIPO_TEMPO_CONTRATO,
          CD_CONTA_CAPITAL,
          NM_TIPO_CONTRATO,
          NM_SISTEMA_CONSIG,
          DT_INICIO,
          DT_FIM,
          OBS_CONTRATO,
          SN_ATIVO
        ) VALUES (
          :NR_CNPJ,
          :NM_EMPRESA,
          :NM_CIDADE,
          :NM_TIPO_TEMPO_CONTRATO,
          :CD_CONTA_CAPITAL,
          :NM_TIPO_CONTRATO,
          :NM_SISTEMA_CONSIG,
          TO_DATE(:DT_INICIO, 'YYYY-MM-DD'),
          CASE
            WHEN :DT_FIM IS NULL THEN NULL
            ELSE TO_DATE(:DT_FIM, 'YYYY-MM-DD')
          END,
          :OBS_CONTRATO,
          1
        )
        RETURNING ID_CONTRATOS_EMPRESAS INTO :ID_CONTRATOS_EMPRESAS
      `;

      const binds = {
        NR_CNPJ: onlyDigits(NR_CNPJ),
        NM_EMPRESA: toUpperTrim(NM_EMPRESA),
        NM_CIDADE: toUpperTrim(NM_CIDADE),
        NM_TIPO_TEMPO_CONTRATO: toUpperTrim(NM_TIPO_TEMPO_CONTRATO),
        CD_CONTA_CAPITAL: toTrim(CD_CONTA_CAPITAL),
        NM_TIPO_CONTRATO: toUpperTrim(NM_TIPO_CONTRATO),
        NM_SISTEMA_CONSIG: NM_SISTEMA_CONSIG
          ? toUpperTrim(NM_SISTEMA_CONSIG)
          : null,
        DT_INICIO: toNullableDate(DT_INICIO),
        DT_FIM:
          String(NM_TIPO_TEMPO_CONTRATO).toUpperCase() === "INDETERMINADO"
            ? null
            : toNullableDate(DT_FIM),
        OBS_CONTRATO: OBS_CONTRATO ? toTrim(OBS_CONTRATO) : null,
        ID_CONTRATOS_EMPRESAS: {
          dir: oracledb.BIND_OUT,
          type: oracledb.NUMBER,
        },
      };

      const result = await oracleExecute(sql, binds, {
        autoCommit: true,
      } as any);

      const idContrato =
        (result.outBinds as any)?.ID_CONTRATOS_EMPRESAS?.[0] ||
        (result.outBinds as any)?.ID_CONTRATOS_EMPRESAS;

      return res.status(201).json({
        success: true,
        ID_CONTRATOS_EMPRESAS: idContrato,
      });
    } catch (err: any) {
      console.error("criar contratos empresas erro:", err);
      return res.status(500).json({
        error: "Falha ao cadastrar contrato.",
        details: String(err?.message || err),
      });
    }
  },

  async editar(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);

      if (!id) {
        return res.status(400).json({
          error: "ID_CONTRATOS_EMPRESAS inválido.",
        });
      }

      const {
        NR_CNPJ,
        NM_EMPRESA,
        NM_CIDADE,
        NM_TIPO_CONTRATO,
        NM_SISTEMA_CONSIG,
        DT_INICIO,
        DT_FIM,
        SN_ATIVO,
        CD_CONTA_CAPITAL,
        NM_TIPO_TEMPO_CONTRATO,
        OBS_CONTRATO,
      } = req.body || {};

      if (!NM_EMPRESA) {
        return res.status(400).json({
          error: "NM_EMPRESA é obrigatório.",
        });
      }

      if (!NR_CNPJ) {
        return res.status(400).json({
          error: "NR_CNPJ é obrigatório.",
        });
      }

      if (!CD_CONTA_CAPITAL) {
        return res.status(400).json({
          error: "CD_CONTA_CAPITAL é obrigatório.",
        });
      }

      if (!NM_TIPO_TEMPO_CONTRATO) {
        return res.status(400).json({
          error: "NM_TIPO_TEMPO_CONTRATO é obrigatório.",
        });
      }

      if (!NM_CIDADE) {
        return res.status(400).json({
          error: "NM_CIDADE é obrigatório.",
        });
      }

      if (!NM_TIPO_CONTRATO) {
        return res.status(400).json({
          error: "NM_TIPO_CONTRATO é obrigatório.",
        });
      }

      if (!DT_INICIO) {
        return res.status(400).json({
          error: "DT_INICIO é obrigatório.",
        });
      }

      if (
        String(NM_TIPO_TEMPO_CONTRATO).toUpperCase() === "DETERMINADO" &&
        !DT_FIM
      ) {
        return res.status(400).json({
          error: "DT_FIM é obrigatório para contratos determinados.",
        });
      }

      const sql = `
        UPDATE DBACRESSEM.CONTRATOS_EMPRESAS
        SET
          NR_CNPJ = :NR_CNPJ,
          NM_EMPRESA = :NM_EMPRESA,
          NM_CIDADE = :NM_CIDADE,
          NM_TIPO_CONTRATO = :NM_TIPO_CONTRATO,
          NM_SISTEMA_CONSIG = :NM_SISTEMA_CONSIG,
          DT_INICIO = TO_DATE(:DT_INICIO, 'YYYY-MM-DD'),
          DT_FIM = CASE
            WHEN :DT_FIM IS NULL THEN NULL
            ELSE TO_DATE(:DT_FIM, 'YYYY-MM-DD')
          END,
          SN_ATIVO = :SN_ATIVO,
          CD_CONTA_CAPITAL = :CD_CONTA_CAPITAL,
          NM_TIPO_TEMPO_CONTRATO = :NM_TIPO_TEMPO_CONTRATO,
          OBS_CONTRATO = :OBS_CONTRATO
        WHERE ID_CONTRATOS_EMPRESAS = :ID_CONTRATOS_EMPRESAS
      `;

      const binds = {
        ID_CONTRATOS_EMPRESAS: id,
        NR_CNPJ: onlyDigits(NR_CNPJ),
        NM_EMPRESA: toUpperTrim(NM_EMPRESA),
        NM_CIDADE: toUpperTrim(NM_CIDADE),
        NM_TIPO_CONTRATO: toUpperTrim(NM_TIPO_CONTRATO),
        NM_SISTEMA_CONSIG: NM_SISTEMA_CONSIG
          ? toUpperTrim(NM_SISTEMA_CONSIG)
          : null,
        DT_INICIO: toNullableDate(DT_INICIO),
        DT_FIM:
          String(NM_TIPO_TEMPO_CONTRATO).toUpperCase() === "INDETERMINADO"
            ? null
            : toNullableDate(DT_FIM),
        SN_ATIVO:
          SN_ATIVO === undefined || SN_ATIVO === null || SN_ATIVO === ""
            ? 0
            : Number(SN_ATIVO),
        CD_CONTA_CAPITAL: toTrim(CD_CONTA_CAPITAL),
        NM_TIPO_TEMPO_CONTRATO: toUpperTrim(NM_TIPO_TEMPO_CONTRATO),
        OBS_CONTRATO: OBS_CONTRATO ? toTrim(OBS_CONTRATO) : null,
      };

      const result = await oracleExecute(sql, binds, {
        autoCommit: true,
      } as any);

      if (!result.rowsAffected) {
        return res.status(404).json({
          error: "Contrato não encontrado.",
        });
      }

      return res.json({
        success: true,
        ID_CONTRATOS_EMPRESAS: id,
      });
    } catch (err: any) {
      console.error("editar contratos empresas erro:", err);
      return res.status(500).json({
        error: "Falha ao editar contrato.",
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
      console.error("buscarPorId contratos empresas erro:", err);
      return res.status(500).json({
        error: "Falha ao buscar contrato.",
        details: String(err?.message || err),
      });
    }
  },

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
      console.error("listarPaginado contratos empresas erro:", err);
      return res.status(500).json({
        error: "Falha ao listar contratos.",
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
      `;

      const result = await oracleExecute(sql, {}, {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
      });

      const cidades = (result.rows || [])
        .map((row: any) => String(row.NM_CIDADE || "").trim())
        .filter(Boolean);

      return res.json(cidades);
    } catch (err: any) {
      console.error("listarCidades contratos empresas erro:", err);
      return res.status(500).json({
        error: "Falha ao listar cidades.",
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
      `;

      const result = await oracleExecute(sql, {}, {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
      });

      const tipos = (result.rows || [])
        .map((row: any) => String(row.NM_TIPO_CONTRATO || "").trim())
        .filter(Boolean);

      return res.json(tipos);
    } catch (err: any) {
      console.error("listarTiposContrato contratos empresas erro:", err);
      return res.status(500).json({
        error: "Falha ao listar tipos de contrato.",
        details: String(err?.message || err),
      });
    }
  },

  async listarSistemas(req: Request, res: Response) {
    try {
      const sql = `
        SELECT DISTINCT NM_EMPRESA
        FROM DBACRESSEM.CONTRATOS_EMPRESAS
        WHERE NM_EMPRESA IS NOT NULL
      `;

      const result = await oracleExecute(sql, {}, {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
      });

      const sistemas = (result.rows || [])
        .map((row: any) => String(row.NM_EMPRESA || "").trim())
        .filter(Boolean);

      return res.json(sistemas);
    } catch (err: any) {
      console.error("listarSistemas contratos empresas erro:", err);
      return res.status(500).json({
        error: "Falha ao listar sistemas consignados.",
        details: String(err?.message || err),
      });
    }
  },
};