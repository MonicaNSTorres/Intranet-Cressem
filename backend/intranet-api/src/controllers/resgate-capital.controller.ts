import { Request, Response } from "express";
import oracledb from "oracledb";
import {
  oracleExecute,
  oracleExecuteCommitWithAudit,
} from "../services/oracle.service";

function onlyDigits(v: string) {
  return String(v || "").replace(/\D/g, "");
}

function onlyCpfCnpjChars(v: string) {
  return String(v || "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase();
}

function toNumber(v: any) {
  if (v === null || v === undefined || v === "") return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function toUpperTrim(v: any) {
  return String(v || "").trim().toUpperCase();
}

async function proximoIdTabela(
  tabela: string,
  colunaId: string
): Promise<number> {
  const result = await oracleExecute(
    `SELECT NVL(MAX(${colunaId}), 0) + 1 AS NEXT_ID FROM DBACRESSEM.${tabela}`,
    {},
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  const row: any = result.rows?.[0];
  return Number(row?.NEXT_ID || 1);
}

export const resgateCapitalController = {
  async buscarMotivos(req: Request, res: Response) {
    try {
      const sql = `
        SELECT
          ID_MOTIVO_RESGATE,
          NM_MOTIVO,
          SN_ATIVO
        FROM DBACRESSEM.MOTIVO_RESGATE
        ORDER BY NM_MOTIVO
      `;

      const result = await oracleExecute(
        sql,
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      return res.json(result.rows || []);
    } catch (err: any) {
      console.error("buscarMotivos erro:", err);
      return res.status(500).json({
        error: "Falha ao consultar motivos de resgate.",
        details: String(err?.message || err),
      });
    }
  },

  async buscarAutorizacoes(req: Request, res: Response) {
    try {
      const sql = `
        SELECT
          ID_AUTORIZACAO_RESGATE,
          NM_AUTORIZADO,
          SN_ATIVO
        FROM DBACRESSEM.AUTORIZACAO_RESGATE
        ORDER BY NM_AUTORIZADO
      `;

      const result = await oracleExecute(
        sql,
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      return res.json(result.rows || []);
    } catch (err: any) {
      console.error("buscarAutorizacoes erro:", err);
      return res.status(500).json({
        error: "Falha ao consultar autorizações.",
        details: String(err?.message || err),
      });
    }
  },

  async buscarCidades(req: Request, res: Response) {
    try {
      const sql = `
        SELECT
          ID_CIDADES,
          ID_UF,
          NM_CIDADE
        FROM DBACRESSEM.CIDADES
        ORDER BY NM_CIDADE
      `;

      const result = await oracleExecute(
        sql,
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      return res.json(result.rows || []);
    } catch (err: any) {
      console.error("buscarCidades erro:", err);
      return res.status(500).json({
        error: "Falha ao consultar cidades.",
        details: String(err?.message || err),
      });
    }
  },

  async buscarEmprestimosPorCpf(req: Request, res: Response) {
    try {
      const cpfQuery = String(req.query.cpf || "");
      const cpf = onlyCpfCnpjChars(cpfQuery);

      if (!cpf) {
        return res.status(400).json({ error: "CPF/CNPJ não informado." });
      }

      const sqlAssociado = `
        SELECT
          ID_CLIENTE,
          SL_DEVEDOR_DIA
        FROM DBACRESSEM.ASSOCIADO_ANALITICO
        WHERE REGEXP_REPLACE(UPPER(NR_CPF_CNPJ), '[^A-Z0-9]', '') = :cpf
          AND ROWNUM = 1
      `;

      const associadoResult = await oracleExecute(
        sqlAssociado,
        { cpf },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      if (!associadoResult.rows?.length) {
        return res.json([]);
      }

      const associado: any = associadoResult.rows[0];

      if (!associado?.ID_CLIENTE) {
        return res.json([]);
      }

      const sqlEmprestimos = `
        SELECT
          '' AS DESC_TIPO,
          '' AS NR_CONTRATO,
          NVL(:saldoDevedorDia, 0) AS SALDODEVEDORDIA
        FROM DUAL
      `;

      const result = await oracleExecute(
        sqlEmprestimos,
        { saldoDevedorDia: associado.SL_DEVEDOR_DIA || 0 },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      return res.json(result.rows || []);
    } catch (err: any) {
      console.error("buscarEmprestimosPorCpf erro:", err);
      return res.status(500).json({
        error: "Falha ao consultar empréstimos do associado.",
        details: String(err?.message || err),
      });
    }
  },

  async buscarIdAssociado(req: Request, res: Response) {
    try {
      const cpfQuery = String(req.query.cpf || "");
      const cpf = onlyCpfCnpjChars(cpfQuery);

      if (!cpf) {
        return res.status(400).json({ error: "CPF/CNPJ não informado." });
      }

      const sql = `
        SELECT
          ID_CLIENTE,
          NM_CLIENTE,
          NR_CPF_CNPJ
        FROM DBACRESSEM.ASSOCIADO_ANALITICO
        WHERE REGEXP_REPLACE(UPPER(NR_CPF_CNPJ), '[^A-Z0-9]', '') = :cpf
          AND ROWNUM = 1
      `;

      const result = await oracleExecute(
        sql,
        { cpf },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      if (!result.rows?.length) {
        return res.json({ found: false });
      }

      return res.json({
        found: true,
        ...(result.rows[0] as any),
      });
    } catch (err: any) {
      console.error("buscarIdAssociado erro:", err);
      return res.status(500).json({
        error: "Falha ao consultar ID do associado.",
        details: String(err?.message || err),
      });
    }
  },

  async buscarDiaUtil(req: Request, res: Response) {
    try {
      const data = String(req.query.data || "");

      if (!data) {
        return res.status(400).json({ error: "Data não informada." });
      }

      const sql = `
        SELECT
          CASE
            WHEN TO_CHAR(TO_DATE(:data, 'YYYY-MM-DD'), 'DY', 'NLS_DATE_LANGUAGE=ENGLISH') IN ('SAT', 'SUN')
              THEN 0
            ELSE 1
          END AS DIA_UTIL
        FROM DUAL
      `;

      const result = await oracleExecute(
        sql,
        { data },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const row: any = result.rows?.[0];

      return res.json({
        diaUtil: Number(row?.DIA_UTIL || 0) === 1,
      });
    } catch (err: any) {
      console.error("buscarDiaUtil erro:", err);
      return res.status(500).json({
        error: "Falha ao consultar dia útil.",
        details: String(err?.message || err),
      });
    }
  },

  async criarResgate(req: Request, res: Response) {
    try {
      const {
        ID_CLIENTE,
        NR_CPF_CNPJ,
        NM_CLIENTE,
        CD_MATRICULA,
        NM_EMPRESA,
        DESC_MOTIVO,
        NM_AUTORIZADO,
        VL_CAPITAL_ATUAL,
        VL_CAPITAL_AMORTIZACAO,
        VL_SALDO_RESTANTE,
        DT_CARENCIA,
        DT_RESGATE_PARCIAL_CAPITAL,
        NM_ATENDENTE,
        NM_CIDADE,
      } = req.body || {};

      if (!NM_CLIENTE) {
        return res.status(400).json({ error: "NM_CLIENTE é obrigatório." });
      }

      if (!DESC_MOTIVO) {
        return res.status(400).json({ error: "DESC_MOTIVO é obrigatório." });
      }

      if (!NM_AUTORIZADO) {
        return res.status(400).json({ error: "NM_AUTORIZADO é obrigatório." });
      }

      const nextIdResgate = await proximoIdTabela(
        "RESGATE_PARCIAL_CAPITAL",
        "ID_RESGATE_PARCIAL_CAPITAL"
      );

      const sql = `
        INSERT INTO DBACRESSEM.RESGATE_PARCIAL_CAPITAL (
          ID_RESGATE_PARCIAL_CAPITAL,
          ID_CLIENTE,
          NR_CPF_CNPJ,
          NM_CLIENTE,
          CD_MATRICULA,
          NM_EMPRESA,
          DESC_MOTIVO,
          NM_AUTORIZADO,
          VL_CAPITAL_ATUAL,
          VL_CAPITAL_AMORTIZACAO,
          VL_SALDO_RESTANTE,
          DT_CARENCIA,
          DT_RESGATE_PARCIAL_CAPITAL,
          NM_ATENDENTE,
          NM_CIDADE
        ) VALUES (
          :ID_RESGATE_PARCIAL_CAPITAL,
          :ID_CLIENTE,
          :NR_CPF_CNPJ,
          :NM_CLIENTE,
          :CD_MATRICULA,
          :NM_EMPRESA,
          :DESC_MOTIVO,
          :NM_AUTORIZADO,
          :VL_CAPITAL_ATUAL,
          :VL_CAPITAL_AMORTIZACAO,
          :VL_SALDO_RESTANTE,
          TO_DATE(:DT_CARENCIA, 'YYYY-MM-DD'),
          TO_DATE(:DT_RESGATE_PARCIAL_CAPITAL, 'YYYY-MM-DD'),
          :NM_ATENDENTE,
          :NM_CIDADE
        )
      `;

      const binds = {
        ID_RESGATE_PARCIAL_CAPITAL: nextIdResgate,
        ID_CLIENTE: ID_CLIENTE || null,
        NR_CPF_CNPJ: onlyCpfCnpjChars(NR_CPF_CNPJ),
        NM_CLIENTE: String(NM_CLIENTE || "").trim(),
        CD_MATRICULA: CD_MATRICULA || null,
        NM_EMPRESA: NM_EMPRESA || null,
        DESC_MOTIVO: toUpperTrim(DESC_MOTIVO),
        NM_AUTORIZADO: toUpperTrim(NM_AUTORIZADO),
        VL_CAPITAL_ATUAL: toNumber(VL_CAPITAL_ATUAL),
        VL_CAPITAL_AMORTIZACAO: toNumber(VL_CAPITAL_AMORTIZACAO),
        VL_SALDO_RESTANTE: toNumber(VL_SALDO_RESTANTE),
        DT_CARENCIA: DT_CARENCIA || "2000-01-01",
        DT_RESGATE_PARCIAL_CAPITAL: DT_RESGATE_PARCIAL_CAPITAL,
        NM_ATENDENTE: String(NM_ATENDENTE || "").trim(),
        NM_CIDADE: toUpperTrim(NM_CIDADE),
      };

      await oracleExecuteCommitWithAudit(req, sql, binds, {} as any);

      return res.status(201).json({
        success: true,
        ID_RESGATE_PARCIAL_CAPITAL: nextIdResgate,
      });
    } catch (err: any) {
      console.error("criarResgate erro:", err);
      return res.status(500).json({
        error: "Falha ao criar resgate parcial de capital.",
        details: String(err?.message || err),
      });
    }
  },

  async criarEmprestimo(req: Request, res: Response) {
    try {
      const {
        ID_RESGATE,
        DESC_TIPO,
        NR_CONTRATO,
        VL_SALDO_DEVEDOR,
        VL_SALDO_AMORTIZADO,
      } = req.body || {};

      if (!ID_RESGATE) {
        return res.status(400).json({ error: "ID_RESGATE é obrigatório." });
      }

      const nextIdEmprestimo = await proximoIdTabela(
        "EMPRESTIMO_RESGATE",
        "ID_EMPRESTIMO_RESGATE"
      );

      const sql = `
        INSERT INTO DBACRESSEM.EMPRESTIMO_RESGATE (
          ID_EMPRESTIMO_RESGATE,
          ID_RESGATE,
          DESC_TIPO,
          NR_CONTRATO,
          VL_SALDO_DEVEDOR,
          VL_SALDO_AMORTIZADO
        ) VALUES (
          :ID_EMPRESTIMO_RESGATE,
          :ID_RESGATE,
          :DESC_TIPO,
          :NR_CONTRATO,
          :VL_SALDO_DEVEDOR,
          :VL_SALDO_AMORTIZADO
        )
      `;

      await oracleExecuteCommitWithAudit(
        req,
        sql,
        {
          ID_EMPRESTIMO_RESGATE: nextIdEmprestimo,
          ID_RESGATE,
          DESC_TIPO: String(DESC_TIPO || "").trim(),
          NR_CONTRATO: String(NR_CONTRATO || "").trim(),
          VL_SALDO_DEVEDOR: toNumber(VL_SALDO_DEVEDOR),
          VL_SALDO_AMORTIZADO: toNumber(VL_SALDO_AMORTIZADO),
        },
        {} as any
      );

      return res.status(201).json({ success: true });
    } catch (err: any) {
      console.error("criarEmprestimo erro:", err);
      return res.status(500).json({
        error: "Falha ao registrar empréstimo do resgate.",
        details: String(err?.message || err),
      });
    }
  },

  async criarContaCorrente(req: Request, res: Response) {
    try {
      const { NR_CONTA, VL_SALDO_DEVEDOR, VL_SALDO_AMORTIZADO, ID_RESGATE } =
        req.body || {};

      if (!ID_RESGATE) {
        return res.status(400).json({ error: "ID_RESGATE é obrigatório." });
      }

      const nextIdContaCorrente = await proximoIdTabela(
        "CONTA_CORRENTE_RESGATE",
        "ID_CONTA_CORRENTE_RESGATE"
      );

      const sql = `
        INSERT INTO DBACRESSEM.CONTA_CORRENTE_RESGATE (
          ID_CONTA_CORRENTE_RESGATE,
          NR_CONTA,
          VL_SALDO_DEVEDOR,
          VL_SALDO_AMORTIZADO,
          ID_RESGATE
        ) VALUES (
          :ID_CONTA_CORRENTE_RESGATE,
          :NR_CONTA,
          :VL_SALDO_DEVEDOR,
          :VL_SALDO_AMORTIZADO,
          :ID_RESGATE
        )
      `;

      await oracleExecuteCommitWithAudit(
        req,
        sql,
        {
          ID_CONTA_CORRENTE_RESGATE: nextIdContaCorrente,
          NR_CONTA: String(NR_CONTA || "").trim(),
          VL_SALDO_DEVEDOR: toNumber(VL_SALDO_DEVEDOR),
          VL_SALDO_AMORTIZADO: toNumber(VL_SALDO_AMORTIZADO),
          ID_RESGATE,
        },
        {} as any
      );

      return res.status(201).json({ success: true });
    } catch (err: any) {
      console.error("criarContaCorrente erro:", err);
      return res.status(500).json({
        error: "Falha ao registrar conta corrente do resgate.",
        details: String(err?.message || err),
      });
    }
  },

  async criarCartaoCredito(req: Request, res: Response) {
    try {
      const { NR_CARTAO, VL_SALDO_DEVEDOR, VL_SALDO_AMORTIZADO, ID_RESGATE } =
        req.body || {};

      if (!ID_RESGATE) {
        return res.status(400).json({ error: "ID_RESGATE é obrigatório." });
      }

      const nextIdCartao = await proximoIdTabela(
        "CARTAO_CREDITO_RESGATE",
        "ID_CARTAO_CREDITO_RESGATE"
      );

      const sql = `
        INSERT INTO DBACRESSEM.CARTAO_CREDITO_RESGATE (
          ID_CARTAO_CREDITO_RESGATE,
          NR_CARTAO,
          VL_SALDO_DEVEDOR,
          VL_SALDO_AMORTIZADO,
          ID_RESGATE
        ) VALUES (
          :ID_CARTAO_CREDITO_RESGATE,
          :NR_CARTAO,
          :VL_SALDO_DEVEDOR,
          :VL_SALDO_AMORTIZADO,
          :ID_RESGATE
        )
      `;

      await oracleExecuteCommitWithAudit(
        req,
        sql,
        {
          ID_CARTAO_CREDITO_RESGATE: nextIdCartao,
          NR_CARTAO: onlyDigits(NR_CARTAO),
          VL_SALDO_DEVEDOR: toNumber(VL_SALDO_DEVEDOR),
          VL_SALDO_AMORTIZADO: toNumber(VL_SALDO_AMORTIZADO),
          ID_RESGATE,
        },
        {} as any
      );

      return res.status(201).json({ success: true });
    } catch (err: any) {
      console.error("criarCartaoCredito erro:", err);
      return res.status(500).json({
        error: "Falha ao registrar cartão de crédito do resgate.",
        details: String(err?.message || err),
      });
    }
  },

  async criarContaDeposito(req: Request, res: Response) {
    try {
      const { CD_BANCO, CD_AGENCIA, CD_CONTA_CORRENTE } = req.body || {};

      if (!CD_BANCO || !CD_AGENCIA || !CD_CONTA_CORRENTE) {
        return res.status(400).json({
          error: "CD_BANCO, CD_AGENCIA e CD_CONTA_CORRENTE são obrigatórios.",
        });
      }

      const nextIdContaDeposito = await proximoIdTabela(
        "CONTA_DEPOSITO_RESGATE",
        "ID_CONTA_DEPOSITO_RESGATE"
      );

      const sql = `
        INSERT INTO DBACRESSEM.CONTA_DEPOSITO_RESGATE (
          ID_CONTA_DEPOSITO_RESGATE,
          CD_BANCO,
          CD_AGENCIA,
          CD_CONTA_CORRENTE
        ) VALUES (
          :ID_CONTA_DEPOSITO_RESGATE,
          :CD_BANCO,
          :CD_AGENCIA,
          :CD_CONTA_CORRENTE
        )
      `;

      await oracleExecuteCommitWithAudit(
        req,
        sql,
        {
          ID_CONTA_DEPOSITO_RESGATE: nextIdContaDeposito,
          CD_BANCO: String(CD_BANCO || "").trim(),
          CD_AGENCIA: String(CD_AGENCIA || "").trim(),
          CD_CONTA_CORRENTE: String(CD_CONTA_CORRENTE || "").trim(),
        },
        {} as any
      );

      return res.status(201).json({
        success: true,
        ID_CONTA_DEPOSITO_RESGATE: nextIdContaDeposito,
      });
    } catch (err: any) {
      console.error("criarContaDeposito erro:", err);
      return res.status(500).json({
        error: "Falha ao registrar conta de depósito.",
        details: String(err?.message || err),
      });
    }
  },

  async criarParcela(req: Request, res: Response) {
    try {
      const {
        DT_PARCELA,
        DT_PAGAMENTO,
        SN_PAGO,
        VL_PARCELA_RESGATE,
        NM_ATENDENTE,
        ID_RESGATE,
        ID_CONTA_DEPOSITO,
      } = req.body || {};

      if (!DT_PARCELA) {
        return res.status(400).json({ error: "DT_PARCELA é obrigatório." });
      }

      if (!ID_RESGATE) {
        return res.status(400).json({ error: "ID_RESGATE é obrigatório." });
      }

      if (!ID_CONTA_DEPOSITO) {
        return res.status(400).json({ error: "ID_CONTA_DEPOSITO é obrigatório." });
      }

      const nextIdParcela = await proximoIdTabela(
        "PARCELA_RESGATE",
        "ID_PARCELA_RESGATE"
      );

      const sql = `
        INSERT INTO DBACRESSEM.PARCELA_RESGATE (
          ID_PARCELA_RESGATE,
          DT_PARCELA,
          DT_PAGAMENTO,
          SN_PAGO,
          VL_PARCELA_RESGATE,
          NM_ATENDENTE,
          ID_RESGATE,
          ID_CONTA_DEPOSITO
        ) VALUES (
          :ID_PARCELA_RESGATE,
          TO_DATE(:DT_PARCELA, 'YYYY-MM-DD'),
          CASE
            WHEN :DT_PAGAMENTO IS NULL THEN NULL
            ELSE TO_DATE(:DT_PAGAMENTO, 'YYYY-MM-DD')
          END,
          :SN_PAGO,
          :VL_PARCELA_RESGATE,
          :NM_ATENDENTE,
          :ID_RESGATE,
          :ID_CONTA_DEPOSITO
        )
      `;

      await oracleExecuteCommitWithAudit(
        req,
        sql,
        {
          ID_PARCELA_RESGATE: nextIdParcela,
          DT_PARCELA,
          DT_PAGAMENTO: DT_PAGAMENTO || null,
          SN_PAGO: SN_PAGO ?? 0,
          VL_PARCELA_RESGATE: toNumber(VL_PARCELA_RESGATE),
          NM_ATENDENTE: NM_ATENDENTE || null,
          ID_RESGATE,
          ID_CONTA_DEPOSITO,
        },
        {} as any
      );

      return res.status(201).json({ success: true });
    } catch (err: any) {
      console.error("criarParcela erro:", err);
      return res.status(500).json({
        error: "Falha ao registrar parcela do resgate.",
        details: String(err?.message || err),
      });
    }
  },
};
