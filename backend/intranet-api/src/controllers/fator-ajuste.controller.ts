import { Request, Response } from "express";
import oracledb from "oracledb";
import { oracleExecute } from "../services/oracle.service";

function toNumber(v: any, fallback = 0) {
  if (v === null || v === undefined || v === "") return fallback;

  if (typeof v === "string") {
    const normalized = v.replace(/\./g, "").replace(",", ".");
    const n = Number(normalized);
    return Number.isFinite(n) ? n : fallback;
  }

  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
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

function toNullableDate(v: any) {
  if (!v) return null;
  return String(v).slice(0, 10);
}

function toUpperTrim(v: any) {
  return String(v || "").trim().toUpperCase();
}

function toTrim(v: any) {
  return String(v || "").trim();
}

export const fatorAjusteController = {
  async listar(req: Request, res: Response) {
    try {
      const sql = `
        SELECT
          ID_CONVENIO_FATOR_AJUSTE,
          ID_OPERADORA,
          ID_OPERADORA AS CONVENIO_FATOR_AJUSTE_HISTORICO,
          NM_FATOR_AJUSTE,
          VL_AJUSTE,
          TO_CHAR(DT_VIGENCIA, 'YYYY-MM-DD') AS DT_VIGENCIA
        FROM DBACRESSEM.CONVENIO_FATOR_AJUSTE
        ORDER BY ID_OPERADORA, NM_FATOR_AJUSTE
      `;

      const result = await oracleExecute(sql, {}, {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
      });

      return res.json(result.rows || []);
    } catch (err: any) {
      console.error("listar fator ajuste erro:", err);
      return res.status(500).json({
        error: "Falha ao listar fatores de ajuste.",
        details: String(err?.message || err),
      });
    }
  },

  async buscarPorId(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);

      if (!id) {
        return res.status(400).json({
          error: "ID_CONVENIO_FATOR_AJUSTE inválido.",
        });
      }

      const sql = `
        SELECT
          ID_CONVENIO_FATOR_AJUSTE,
          ID_OPERADORA,
          ID_OPERADORA AS CONVENIO_FATOR_AJUSTE_HISTORICO,
          NM_FATOR_AJUSTE,
          VL_AJUSTE,
          TO_CHAR(DT_VIGENCIA, 'YYYY-MM-DD') AS DT_VIGENCIA
        FROM DBACRESSEM.CONVENIO_FATOR_AJUSTE
        WHERE ID_CONVENIO_FATOR_AJUSTE = :id
      `;

      const result = await oracleExecute(
        sql,
        { id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      if (!result.rows?.length) {
        return res.status(404).json({
          error: "Fator de ajuste não encontrado.",
        });
      }

      return res.json(result.rows[0]);
    } catch (err: any) {
      console.error("buscarPorId fator ajuste erro:", err);
      return res.status(500).json({
        error: "Falha ao buscar fator de ajuste.",
        details: String(err?.message || err),
      });
    }
  },

  async editar(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const usuario = toTrim(req.params.usuario);

      if (!id) {
        return res.status(400).json({
          error: "ID_CONVENIO_FATOR_AJUSTE inválido.",
        });
      }

      if (!usuario) {
        return res.status(400).json({
          error: "Usuário é obrigatório.",
        });
      }

      const {
        ID_CONVENIO_FATOR_AJUSTE,
        NM_FATOR_AJUSTE,
        VL_AJUSTE,
        DT_VIGENCIA,
      } = req.body || {};

      if (!NM_FATOR_AJUSTE) {
        return res.status(400).json({
          error: "NM_FATOR_AJUSTE é obrigatório.",
        });
      }

      if (VL_AJUSTE === undefined || VL_AJUSTE === null || VL_AJUSTE === "") {
        return res.status(400).json({
          error: "VL_AJUSTE é obrigatório.",
        });
      }

      if (!DT_VIGENCIA) {
        return res.status(400).json({
          error: "DT_VIGENCIA é obrigatório.",
        });
      }

      const sql = `
        UPDATE DBACRESSEM.CONVENIO_FATOR_AJUSTE
        SET
          NM_FATOR_AJUSTE = :NM_FATOR_AJUSTE,
          VL_AJUSTE = :VL_AJUSTE,
          DT_VIGENCIA = TO_DATE(:DT_VIGENCIA, 'YYYY-MM-DD')
        WHERE ID_CONVENIO_FATOR_AJUSTE = :ID_CONVENIO_FATOR_AJUSTE
      `;

      const binds = {
        ID_CONVENIO_FATOR_AJUSTE: Number(ID_CONVENIO_FATOR_AJUSTE || id),
        NM_FATOR_AJUSTE: toUpperTrim(NM_FATOR_AJUSTE),
        VL_AJUSTE: toNumber(VL_AJUSTE),
        DT_VIGENCIA: toNullableDate(DT_VIGENCIA),
      };

      const result = await oracleExecute(sql, binds, {
        autoCommit: true,
      } as any);

      if (!result.rowsAffected) {
        return res.status(404).json({
          error: "Fator de ajuste não encontrado para atualização.",
        });
      }

      return res.json({
        success: true,
        usuario,
      });
    } catch (err: any) {
      console.error("editar fator ajuste erro:", err);
      return res.status(500).json({
        error: "Falha ao editar fator de ajuste.",
        details: String(err?.message || err),
      });
    }
  },

  async criar(req: Request, res: Response) {
    try {
      const {
        ID_OPERADORA,
        NM_FATOR_AJUSTE,
        VL_AJUSTE,
        DT_VIGENCIA,
      } = req.body || {};

      if (!ID_OPERADORA) {
        return res.status(400).json({
          error: "ID_OPERADORA é obrigatório.",
        });
      }

      if (!NM_FATOR_AJUSTE) {
        return res.status(400).json({
          error: "NM_FATOR_AJUSTE é obrigatório.",
        });
      }

      if (VL_AJUSTE === undefined || VL_AJUSTE === null || VL_AJUSTE === "") {
        return res.status(400).json({
          error: "VL_AJUSTE é obrigatório.",
        });
      }

      if (!DT_VIGENCIA) {
        return res.status(400).json({
          error: "DT_VIGENCIA é obrigatório.",
        });
      }

      const sql = `
        INSERT INTO DBACRESSEM.CONVENIO_FATOR_AJUSTE (
          ID_OPERADORA,
          NM_FATOR_AJUSTE,
          VL_AJUSTE,
          DT_VIGENCIA
        ) VALUES (
          :ID_OPERADORA,
          :NM_FATOR_AJUSTE,
          :VL_AJUSTE,
          TO_DATE(:DT_VIGENCIA, 'YYYY-MM-DD')
        )
      `;

      const binds = {
        ID_OPERADORA: toNumber(ID_OPERADORA),
        NM_FATOR_AJUSTE: toUpperTrim(NM_FATOR_AJUSTE),
        VL_AJUSTE: toNullableNumber(VL_AJUSTE),
        DT_VIGENCIA: toNullableDate(DT_VIGENCIA),
      };

      await oracleExecute(sql, binds, {
        autoCommit: true,
      } as any);

      return res.status(201).json({
        success: true,
      });
    } catch (err: any) {
      console.error("criar fator ajuste erro:", err);
      return res.status(500).json({
        error: "Falha ao criar fator de ajuste.",
        details: String(err?.message || err),
      });
    }
  },
};