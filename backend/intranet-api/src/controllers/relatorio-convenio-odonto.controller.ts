import { Request, Response } from "express";
import oracledb from "oracledb";
import { oracleExecute } from "../services/oracle.service";

function csvEscape(value: any) {
  const text = String(value ?? "").replace(/"/g, '""');
  return `"${text}"`;
}

function buildCsv(rows: any[], headers: string[], mapRow: (row: any) => string[]) {
  const lines = [
    headers.join(";"),
    ...rows.map((row) => mapRow(row).join(";")),
  ];

  return "\uFEFF" + lines.join("\n");
}

function sendCsv(res: Response, filename: string, csv: string) {
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  return res.status(200).send(csv);
}

export const relatorioConvenioOdontoController = {
  async downloadContratantes(req: Request, res: Response) {
    try {
      const sql = `
        SELECT
          CP.ID_CONVENIO_PESSOAS,
          CP.NR_CPF_TITULAR,
          CP.NM_USUARIO,
          CP.NR_CPF_USUARIO,
          CP.CD_CARTAO,
          CP.DESC_PARENTESCO,
          CP.SN_ATIVO,
          TO_CHAR(CP.DT_INCLUSAO, 'DD/MM/YYYY') AS DT_INCLUSAO,
          TO_CHAR(CP.DT_EXCLUSAO, 'DD/MM/YYYY') AS DT_EXCLUSAO,
          TO_CHAR(CP.DT_NASCIMENTO, 'DD/MM/YYYY') AS DT_NASCIMENTO,
          CP.NM_MAE,
          CP.NM_CIDADE,
          CP.CD_ASSOCIADO,
          CP.CD_MATRICULA,
          CP.NM_EMPRESA,
          CP.NR_CNPJ_EMPRESA,
          CO.DESC_CONVENIO,
          CFA.NM_FATOR_AJUSTE,
          NVL(CFA.VL_AJUSTE, 0) AS VL_AJUSTE,
          TO_CHAR(CFA.DT_VIGENCIA, 'DD/MM/YYYY') AS DT_VIGENCIA
        FROM DBACRESSEM.CONVENIO_PESSOAS CP
        LEFT JOIN DBACRESSEM.CONVENIO_OPERADORA CO
          ON CO.ID_CONVENIO_OPERADORA = CP.ID_OPERADORA
        LEFT JOIN DBACRESSEM.CONVENIO_FATOR_AJUSTE CFA
          ON CFA.ID_CONVENIO_FATOR_AJUSTE = CP.ID_CONVENIO_FATOR_AJUSTE
        ORDER BY CP.NR_CPF_TITULAR, CP.NM_USUARIO
      `;

      const result = await oracleExecute(sql, {}, {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
      });

      const rows = result.rows || [];

      const csv = buildCsv(
        rows,
        [
          "ID_CONVENIO_PESSOAS",
          "CPF_TITULAR",
          "NOME_USUARIO",
          "CPF_USUARIO",
          "COD_CARTAO",
          "PARENTESCO",
          "ATIVO",
          "DATA_INCLUSAO",
          "DATA_EXCLUSAO",
          "DATA_NASCIMENTO",
          "NOME_MAE",
          "CIDADE",
          "COD_ASSOCIADO",
          "MATRICULA",
          "EMPRESA",
          "CNPJ_EMPRESA",
          "CONVENIO",
          "PLANO",
          "VALOR",
          "VIGENCIA",
        ],
        (row) => [
          csvEscape(row.ID_CONVENIO_PESSOAS),
          csvEscape(row.NR_CPF_TITULAR),
          csvEscape(row.NM_USUARIO),
          csvEscape(row.NR_CPF_USUARIO),
          csvEscape(row.CD_CARTAO),
          csvEscape(row.DESC_PARENTESCO),
          csvEscape(Number(row.SN_ATIVO || 0) === 1 ? "SIM" : "NAO"),
          csvEscape(row.DT_INCLUSAO),
          csvEscape(row.DT_EXCLUSAO),
          csvEscape(row.DT_NASCIMENTO),
          csvEscape(row.NM_MAE),
          csvEscape(row.NM_CIDADE),
          csvEscape(row.CD_ASSOCIADO),
          csvEscape(row.CD_MATRICULA),
          csvEscape(row.NM_EMPRESA),
          csvEscape(row.NR_CNPJ_EMPRESA),
          csvEscape(row.DESC_CONVENIO),
          csvEscape(row.NM_FATOR_AJUSTE),
          csvEscape(String(row.VL_AJUSTE || 0).replace(".", ",")),
          csvEscape(row.DT_VIGENCIA),
        ]
      );

      return sendCsv(res, "convenio_odontologico.csv", csv);
    } catch (err: any) {
      console.error("downloadContratantes convenio odonto erro:", err);
      return res.status(500).json({
        error: "Falha ao gerar relatório de contratantes.",
        details: String(err?.message || err),
      });
    }
  },

  async downloadHistoricoCusto(req: Request, res: Response) {
    try {
      const sql = `
        SELECT
          NR_CPF_TITULAR,
          NM_USUARIO,
          NR_CPF_USUARIO,
          NM_PARENTESCO,
          SN_ATIVO,
          TO_CHAR(DT_INCLUSAO, 'DD/MM/YYYY') AS DT_INCLUSAO,
          TO_CHAR(DT_EXCLUSAO, 'DD/MM/YYYY') AS DT_EXCLUSAO,
          TO_CHAR(DT_NASCIMENTO, 'DD/MM/YYYY') AS DT_NASCIMENTO,
          NM_MAE,
          NM_CIDADE,
          NM_EMPRESA,
          NR_CNPJ_EMPRESA,
          NM_OPERADORA,
          NM_PLANO_FATOR_AJUSTE,
          VL_FATOR_AJUSTE
        FROM DBACRESSEM.CONVENIO_PESSOAS_HISTORICO
        ORDER BY NR_CPF_TITULAR, NM_USUARIO
      `;

      const result = await oracleExecute(sql, {}, {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
      });

      const rows = result.rows || [];

      const csv = buildCsv(
        rows,
        [
          "CPF_TITULAR",
          "NOME_USUARIO",
          "CPF_USUARIO",
          "PARENTESCO",
          "ATIVO",
          "DATA_INCLUSAO",
          "DATA_EXCLUSAO",
          "DATA_NASCIMENTO",
          "NOME_MAE",
          "CIDADE",
          "EMPRESA",
          "CNPJ_EMPRESA",
          "OPERADORA",
          "PLANO",
          "VALOR",
        ],
        (row) => [
          csvEscape(row.NR_CPF_TITULAR),
          csvEscape(row.NM_USUARIO),
          csvEscape(row.NR_CPF_USUARIO),
          csvEscape(row.NM_PARENTESCO),
          csvEscape(Number(row.SN_ATIVO || 0) === 1 ? "SIM" : "NAO"),
          csvEscape(row.DT_INCLUSAO),
          csvEscape(row.DT_EXCLUSAO),
          csvEscape(row.DT_NASCIMENTO),
          csvEscape(row.NM_MAE),
          csvEscape(row.NM_CIDADE),
          csvEscape(row.NM_EMPRESA),
          csvEscape(row.NR_CNPJ_EMPRESA),
          csvEscape(row.NM_OPERADORA),
          csvEscape(row.NM_PLANO_FATOR_AJUSTE),
          csvEscape(String(row.VL_FATOR_AJUSTE || 0).replace(".", ",")),
        ]
      );

      return sendCsv(res, "custo_odontologico.csv", csv);
    } catch (err: any) {
      console.error("downloadHistoricoCusto convenio odonto erro:", err);
      return res.status(500).json({
        error: "Falha ao gerar relatório de histórico de custo.",
        details: String(err?.message || err),
      });
    }
  },

  async downloadMaiorIdade(req: Request, res: Response) {
    try {
      const sql = `
        SELECT
          CP.ID_CONVENIO_PESSOAS,
          CP.NR_CPF_TITULAR,
          CP.NM_USUARIO,
          CP.NR_CPF_USUARIO,
          CP.DESC_PARENTESCO,
          TO_CHAR(CP.DT_NASCIMENTO, 'DD/MM/YYYY') AS DT_NASCIMENTO,
          CP.NM_MAE,
          CP.NM_CIDADE,
          CO.DESC_CONVENIO,
          CFA.NM_FATOR_AJUSTE,
          NVL(CFA.VL_AJUSTE, 0) AS VL_AJUSTE
        FROM DBACRESSEM.CONVENIO_PESSOAS CP
        LEFT JOIN DBACRESSEM.CONVENIO_OPERADORA CO
          ON CO.ID_CONVENIO_OPERADORA = CP.ID_OPERADORA
        LEFT JOIN DBACRESSEM.CONVENIO_FATOR_AJUSTE CFA
          ON CFA.ID_CONVENIO_FATOR_AJUSTE = CP.ID_CONVENIO_FATOR_AJUSTE
        WHERE CP.SN_ATIVO = 1
          AND CP.ID_CONVENIO_FATOR_AJUSTE IN (3, 8)
          AND CP.DT_NASCIMENTO IS NOT NULL
          AND EXTRACT(MONTH FROM CP.DT_NASCIMENTO) = EXTRACT(MONTH FROM SYSDATE)
          AND FLOOR(MONTHS_BETWEEN(SYSDATE, CP.DT_NASCIMENTO) / 12) = 17
        ORDER BY CP.NM_USUARIO
      `;

      const result = await oracleExecute(sql, {}, {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
      });

      const rows = result.rows || [];

      const csv = buildCsv(
        rows,
        [
          "ID_CONVENIO_PESSOAS",
          "CPF_TITULAR",
          "NOME_USUARIO",
          "CPF_USUARIO",
          "PARENTESCO",
          "DATA_NASCIMENTO",
          "NOME_MAE",
          "CIDADE",
          "CONVENIO",
          "PLANO",
          "VALOR",
        ],
        (row) => [
          csvEscape(row.ID_CONVENIO_PESSOAS),
          csvEscape(row.NR_CPF_TITULAR),
          csvEscape(row.NM_USUARIO),
          csvEscape(row.NR_CPF_USUARIO),
          csvEscape(row.DESC_PARENTESCO),
          csvEscape(row.DT_NASCIMENTO),
          csvEscape(row.NM_MAE),
          csvEscape(row.NM_CIDADE),
          csvEscape(row.DESC_CONVENIO),
          csvEscape(row.NM_FATOR_AJUSTE),
          csvEscape(String(row.VL_AJUSTE || 0).replace(".", ",")),
        ]
      );

      return sendCsv(res, "maior_idade_odontologico.csv", csv);
    } catch (err: any) {
      console.error("downloadMaiorIdade convenio odonto erro:", err);
      return res.status(500).json({
        error: "Falha ao gerar relatório de maior idade.",
        details: String(err?.message || err),
      });
    }
  },

  async downloadFolha(req: Request, res: Response) {
    try {
      const sql = `
        SELECT
          CP.NR_CPF_TITULAR,
          MIN(CP.NM_USUARIO) AS NOME_USUARIO,
          SUM(CFA.VL_AJUSTE) AS TOTAL,
          CO.DESC_CONVENIO
        FROM DBACRESSEM.CONVENIO_OPERADORA CO
        INNER JOIN DBACRESSEM.CONVENIO_FATOR_AJUSTE CFA
          ON CO.ID_CONVENIO_OPERADORA = CFA.ID_OPERADORA
        INNER JOIN DBACRESSEM.CONVENIO_PESSOAS CP
          ON CP.ID_CONVENIO_FATOR_AJUSTE = CFA.ID_CONVENIO_FATOR_AJUSTE
         AND CO.ID_CONVENIO_OPERADORA = CP.ID_OPERADORA
        WHERE CP.DT_EXCLUSAO IS NULL
          AND CP.DT_INCLUSAO <= SYSDATE
        GROUP BY CP.NR_CPF_TITULAR, CO.DESC_CONVENIO
        ORDER BY CP.NR_CPF_TITULAR
      `;

      const result = await oracleExecute(sql, {}, {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
      });

      const rows = result.rows || [];

      const csv = buildCsv(
        rows,
        ["CPF_TITULAR", "NOME_USUARIO", "TOTAL", "CONVENIO"],
        (row) => [
          csvEscape(row.NR_CPF_TITULAR),
          csvEscape(row.NOME_USUARIO),
          csvEscape(String(row.TOTAL || 0).replace(".", ",")),
          csvEscape(row.DESC_CONVENIO),
        ]
      );

      return sendCsv(res, "convenio_odonto_folha.csv", csv);
    } catch (err: any) {
      console.error("downloadFolha convenio odonto erro:", err);
      return res.status(500).json({
        error: "Falha ao gerar relatório de folha.",
        details: String(err?.message || err),
      });
    }
  },
};