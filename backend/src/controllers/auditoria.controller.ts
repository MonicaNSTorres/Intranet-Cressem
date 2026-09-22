import { Request, Response } from "express";
import oracledb from "oracledb";
import { oracleExecute } from "../services/oracle.service";

function somenteNumeros(valor: string) {
  return String(valor || "").replace(/\D/g, "");
}

export const auditoriaController = {
  async buscarAssociado(req: Request, res: Response) {
    try {
      const cpfCnpj = somenteNumeros(String(req.params.cpfCnpj || ""));

      if (!cpfCnpj) {
        return res.status(400).json({
          error: "CPF/CNPJ não informado.",
        });
      }

      const sql = `
        SELECT
          a.NM_CLIENTE,
          a.NM_EMPRESA,
          a.NR_IAP,
          TO_CHAR(a.DT_ADMISSA, 'YYYY-MM-DD') AS DT_ADMISSA,
          a.NR_ANO_CORRENTISTA,
          a.NR_MESES_PORTABILIDADE,
          a.NR_CARTAO,
          a.SL_CONTA_CAPITAL,
          a.SN_VINCULO_EMPREGATICIO
        FROM DBACRESSEM.ASSOCIADO_ANALITICO a
        WHERE REGEXP_REPLACE(a.NR_CPF_CNPJ, '[^0-9]', '') = :cpfCnpj
        FETCH FIRST 1 ROWS ONLY
      `;

      const result = await oracleExecute(
        sql,
        { cpfCnpj },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const row: any = result.rows?.[0];

      if (!row) {
        return res.status(404).json({
          error: "Associado não encontrado.",
        });
      }

      return res.json({
        NM_CLIENTE: row.NM_CLIENTE || "",
        NM_EMPRESA: row.NM_EMPRESA || "",
        NR_IAP: row.NR_IAP || "",
        DT_ADMISSA: row.DT_ADMISSA || "",
        NR_ANO_CORRENTISTA: row.NR_ANO_CORRENTISTA ?? null,
        NR_MESES_PORTABILIDADE: row.NR_MESES_PORTABILIDADE ?? null,
        NR_CARTAO: row.NR_CARTAO ?? null,
        SL_CONTA_CAPITAL: row.SL_CONTA_CAPITAL ?? 0,
        SN_VINCULO_EMPREGATICIO: row.SN_VINCULO_EMPREGATICIO ?? null,
      });
    } catch (error: any) {
      console.error("Erro ao buscar associado da auditoria:", error);

      return res.status(500).json({
        error: "Erro ao buscar associado da auditoria",
        details: error.message,
      });
    }
  },

  async buscarAuditoria(req: Request, res: Response) {
    try {
      const cpfCnpj = somenteNumeros(String(req.params.cpfCnpj || ""));

      if (!cpfCnpj) {
        return res.status(400).json({
          error: "CPF/CNPJ não informado.",
        });
      }

      const sql = `
        SELECT
          au.VL_VENCIDO,
          au.VL_A_VENCER,
          au.VL_PREJUIZO,
          au.DESC_MV_RSC_BACEN_ATT,
          au.DSC_NV_RSC_LIMITE
        FROM DBACRESSEM.AUDITORIA au
        WHERE REGEXP_REPLACE(au.NR_CPF_CNPJ, '[^0-9]', '') = :cpfCnpj
        FETCH FIRST 1 ROWS ONLY
      `;

      const result = await oracleExecute(
        sql,
        { cpfCnpj },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const row: any = result.rows?.[0];

      if (!row) {
        return res.status(404).json({
          error: "Dados de auditoria não encontrados.",
        });
      }

      return res.json({
        VL_VENCIDO: row.VL_VENCIDO ?? 0,
        VL_A_VENCER: row.VL_A_VENCER ?? 0,
        VL_PREJUIZO: row.VL_PREJUIZO ?? 0,
        DESC_MV_RSC_BACEN_ATT: row.DESC_MV_RSC_BACEN_ATT || "",
        DSC_NV_RSC_LIMITE: row.DSC_NV_RSC_LIMITE || "",
      });
    } catch (error: any) {
      console.error("Erro ao buscar dados da auditoria:", error);

      return res.status(500).json({
        error: "Erro ao buscar dados da auditoria",
        details: error.message,
      });
    }
  },
};