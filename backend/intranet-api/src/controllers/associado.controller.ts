import { Request, Response } from "express";
import oracledb from "oracledb";
import { oracleExecute } from "../services/oracle.service";

function onlyDigits(v: string) {
    return (v || "").replace(/\D/g, "");
}

export const associadoController = {
    async buscarPorCpf(req: Request, res: Response) {
        try {
            const cpfQuery = String(req.query.cpf || "");
            const documento = onlyDigits(cpfQuery);

            if (documento.length !== 11 && documento.length !== 14) {
                return res.status(400).json({
                    error: "CPF/CNPJ inválido (11 ou 14 dígitos).",
                });
            }

            const sql = `
        SELECT
          a.NM_CLIENTE AS NOME,
          a.NR_MATRICULA AS MATRICULA,
          a.DT_NASCIMENTO AS NASCIMENTO,
          a.NM_EMPRESA AS EMPRESA,
          a.NR_CPF_CNPJ AS CPF,
          a.NM_BAIRRO AS BAIRRO,
          a.NM_CIDADE AS CIDADE,
          a.DS_ENDERECO AS RUA,
          a.SG_ESTADO AS UF,
          a.NR_CEP AS CEP,
          a.DS_EMAIL AS EMAIL,
          a.NR_TELEFONE AS TELEFONE,
          a.NR_DOCUMENTO AS DOCUMENTO,
          a.NM_ORGAO AS NM_ORGAO,
          a.NR_IAP AS IAP,
          a.NR_MESES_PORTABILIDADE AS PORTABILIDADE,
          a.NR_CARTAO AS CARTAO,
          a.SL_LIMITE_CHEQUE AS SL_LIMITE_CHEQUE,
          a.NR_LIMITE_CARTAO AS NR_LIMITE_CARTAO,
          a.SL_CONTA_CAPITAL AS SL_CONTA_CAPITAL,
          (
            SELECT TRIM(f.NR_CONTA_CORRENTE)
            FROM DBACRESSEM.FUNCIONARIOS_SICOOB_CRESSEM f
            WHERE REGEXP_REPLACE(f.NR_CPF, '[^0-9]', '') = :documento
            FETCH FIRST 1 ROWS ONLY
          ) AS NR_CONTA_CORRENTE
        FROM DBACRESSEM.ASSOCIADO_ANALITICO a
        WHERE REGEXP_REPLACE(a.NR_CPF_CNPJ, '[^0-9]', '') = :documento
          AND ROWNUM = 1
      `;

            const result = await oracleExecute(
                sql,
                { documento },
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            if (!result.rows?.length) {
                return res.json({ found: false });
            }

            const row: any = result.rows[0];

            return res.json({
                found: true,
                nome: row.NOME || "",
                matricula: row.MATRICULA || "",
                nascimento: row.NASCIMENTO || "",
                empresa: row.EMPRESA || "",
                cpf: row.CPF || documento,
                bairro: row.BAIRRO || "",
                cidade: row.CIDADE || "",
                rua: row.RUA || "",
                uf: row.UF || "",
                cep: row.CEP || "",
                email: row.EMAIL || "",
                telefone: row.TELEFONE || "",
                rg: row.DOCUMENTO || "",
                documento: row.DOCUMENTO || "",
                orgao: row.NM_ORGAO || "",
                iap: row.IAP || "",
                portabilidade: row.PORTABILIDADE || "",
                cartao: row.CARTAO || "",
                limite_chque: row.SL_LIMITE_CHEQUE || "",
                limite_cartao: row.NR_LIMITE_CARTAO || "",
                saldo_capital: row.SL_CONTA_CAPITAL || "",
                conta_corrente: row.NR_CONTA_CORRENTE || "",
                nr_conta_corrente: row.NR_CONTA_CORRENTE || "",
            });
        } catch (err: any) {
            console.error("buscarPorCpf erro:", err);

            return res.status(500).json({
                error: "Falha ao consultar associado.",
                details: String(err?.message || err),
            });
        }
    },
};