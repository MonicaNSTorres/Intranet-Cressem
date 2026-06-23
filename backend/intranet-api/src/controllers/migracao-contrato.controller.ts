import { Request, Response } from "express";
import oracledb from "oracledb";
import { oracleExecute } from "../services/oracle.service";

function onlyDigits(v: string) {
  return String(v || "").replace(/\D/g, "");
}

function onlyCpfCnpjChars(v: string) {
  return String(v || "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase();
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

function formatDateToBR(value: any): string {
  if (!value) return "00/00/0000";

  const str = String(value).trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [yyyy, mm, dd] = str.split("-");
    return `${dd}/${mm}/${yyyy}`;
  }

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "00/00/0000";

  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();

  return `${day}/${month}/${year}`;
}

function padRight(value: any, length: number) {
  return String(value || "").padEnd(length, " ").slice(0, length);
}

function padLeft(value: any, length: number, char = "0") {
  return String(value || "").padStart(length, char).slice(-length);
}

function formatSalarioSisbr(value: any) {
  const numero = Number(value || 0);
  const texto = numero.toFixed(2).replace(".", ",");

  return texto.padStart(11, "0").slice(-11);
}

function gerarLinhaSisbr(item: any) {
  const dtNascimento = formatDateToBR(item.DT_NASCIMENTO);
  const cargo = padRight(item.NM_CARGO, 20);
  const salario = formatSalarioSisbr(item.VL_RENDA_BRUTA);
  const dtAdmissao = formatDateToBR(item.DT_ADMISSAO);
  const cpf = padLeft(onlyDigits(item.NR_CPF_CNPJ || ""), 11, "0");
  const matricula = padLeft(onlyDigits(item.NR_MATRICULA || ""), 10, "0");

  const situacao = "INATIVO   ";

  return (
    " ".repeat(55) +
    dtNascimento +
    " ".repeat(175) +
    cargo +
    " ".repeat(51) +
    salario +
    dtAdmissao +
    " ".repeat(3) +
    cpf +
    " ".repeat(255) +
    situacao +
    " ".repeat(111) +
    matricula +
    "\r\n"
  );
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

  async buscarCpfMigracao(req: Request, res: Response) {
    try {
      const cpfParam = String(req.params.cpf || "");
      const cpf = onlyCpfCnpjChars(cpfParam);

      if (![11, 14].includes(cpf.length)) {
        return res.status(400).json({
          error: "CPF/CNPJ inválido (11 ou 14 caracteres).",
        });
      }

      const sql = `
      SELECT
        AA.DT_NASCIMENTO,
        AA.NM_CARGO,
        AA.VL_RENDA_BRUTA,
        AA.DT_ADMISSA,
        AA.NR_CPF_CNPJ,
        'ATIVO' AS SN_ATIVO,
        AA.NR_MATRICULA
      FROM DBACRESSEM.ASSOCIADO_ANALITICO AA
      WHERE REGEXP_REPLACE(UPPER(AA.NR_CPF_CNPJ), '[^A-Z0-9]', '') = :cpf
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
        DT_NASCIMENTO: formatDateToISO(row.DT_NASCIMENTO),
        NM_CARGO: row.NM_CARGO || "",
        VL_RENDA_BRUTA: Number(row.VL_RENDA_BRUTA || 0),
        DT_ADMISSAO: formatDateToISO(row.DT_ADMISSA),
        NR_CPF_CNPJ: row.NR_CPF_CNPJ || cpf,
        DESC_SITUACAO: row.SN_ATIVO || "ATIVO",
        NR_MATRICULA: row.NR_MATRICULA || "",
      });
    } catch (err: any) {
      console.error("buscarCpfMigracao erro:", err);
      return res.status(500).json({
        error: "Falha ao consultar CPF para migração de contrato.",
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

      const conteudo = linhas.map((item: any) => gerarLinhaSisbr(item)).join("");

      res.setHeader("Content-Type", "text/plain; charset=latin1");
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="migracao_contrato_destino.txt"'
      );

      return res.status(200).send(Buffer.from(conteudo, "latin1"));
    } catch (err: any) {
      console.error("gerarArquivo migracao contrato erro:", err);
      return res.status(500).json({
        error: "Falha ao gerar arquivo de migração.",
        details: String(err?.message || err),
      });
    }
  },
};