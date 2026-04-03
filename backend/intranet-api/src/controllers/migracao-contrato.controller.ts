import { Request, Response } from "express";
import oracledb from "oracledb";
import { oracleExecute } from "../services/oracle.service";

function onlyDigits(v: string) {
  return String(v || "").replace(/\D/g, "");
}

function formatDateToISO(value: any): string {
  if (!value) return "";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    return String(value).slice(0, 10);
  }

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function padRight(value: string, length: number) {
  return String(value || "").padEnd(length, " ").slice(0, length);
}

function padLeft(value: string, length: number, char = "0") {
  return String(value || "").padStart(length, char).slice(-length);
}

function valorParaTextoSemPontuacao(valor: number | null | undefined) {
  const numero = Number(valor || 0).toFixed(2).replace(".", "");
  return padLeft(numero, 15, "0");
}

export const migracaoContratoController = {
  async buscarPorCpf(req: Request, res: Response) {
    try {
      const cpfParam = String(req.params.cpf || "");
      const cpf = onlyDigits(cpfParam);

      if (cpf.length !== 11) {
        return res.status(400).json({ error: "CPF inválido (11 dígitos)." });
      }

      const sql = `
        SELECT
          f.DT_NASCIMENTO,
          c.NM_CARGO,
          f.DT_ADMISSAO,
          f.NR_CPF AS CPF,
          CASE
            WHEN f.SN_ATIVO = 1 THEN 'ATIVO'
            ELSE 'INATIVO'
          END AS SITUACAO,
          f.NR_MATRICULA,
          0 AS SALARIO
        FROM DBACRESSEM.FUNCIONARIOS_SICOOB_CRESSEM f
        LEFT JOIN DBACRESSEM.CARGO_GERENTES_SICOOB_CRESSEM c
          ON c.ID_CARGO = f.ID_CARGO
        WHERE REGEXP_REPLACE(f.NR_CPF, '[^0-9]', '') = :cpf
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

      const row: any = result.rows[0];

      return res.json({
        found: true,
        nascimento: formatDateToISO(row.DT_NASCIMENTO),
        cargo: row.NM_CARGO || "",
        salario: Number(row.SALARIO || 0),
        admissao: formatDateToISO(row.DT_ADMISSAO),
        cpf: row.CPF || cpf,
        situacao: row.SITUACAO || "",
        matricula: row.NR_MATRICULA || "",
      });
    } catch (err: any) {
      console.error("buscarPorCpf migracao contrato erro:", err);
      return res.status(500).json({
        error: "Falha ao consultar dados para migração de contrato.",
        details: String(err?.message || err),
      });
    }
  },

  async gerarArquivo(req: Request, res: Response) {
    try {
      const linhas = Array.isArray(req.body) ? req.body : [];

      if (!linhas.length) {
        return res.status(400).json({
          error: "Nenhuma linha foi enviada para gerar o arquivo.",
        });
      }

      const conteudo = linhas
        .map((item: any) => {
          const dtNascimento = String(item.DT_NASCIMENTO || "");
          const nmCargo = String(item.NM_CARGO || "");
          const vlRendaBruta = Number(item.VL_RENDA_BRUTA || 0);
          const dtAdmissao = String(item.DT_ADMISSAO || "");
          const nrCpfCnpj = onlyDigits(item.NR_CPF_CNPJ || "");
          const descSituacao = String(item.DESC_SITUACAO || "");
          const nrMatricula = String(item.NR_MATRICULA || "");

          return [
            padRight(dtNascimento, 10),
            padRight(nmCargo, 60),
            valorParaTextoSemPontuacao(vlRendaBruta),
            padRight(dtAdmissao, 10),
            padLeft(nrCpfCnpj, 11, "0"),
            padRight(descSituacao, 20),
            padRight(nrMatricula, 20),
          ].join(";");
        })
        .join("\n");

      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="migracao_contrato_destino.txt"'
      );

      return res.status(200).send(conteudo);
    } catch (err: any) {
      console.error("gerarArquivo migracao contrato erro:", err);
      return res.status(500).json({
        error: "Falha ao gerar arquivo de migração.",
        details: String(err?.message || err),
      });
    }
  },
};