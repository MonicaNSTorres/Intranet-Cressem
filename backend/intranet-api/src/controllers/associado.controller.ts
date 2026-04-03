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
            const cpf = onlyDigits(cpfQuery);

            if (cpf.length !== 11) {
                return res.status(400).json({ error: "CPF inválido (11 dígitos)." });
            }

            const sql = `
        SELECT
          a.NM_CLIENTE   AS NOME,
          a.NR_MATRICULA AS MATRICULA,
          a.NM_EMPRESA   AS EMPRESA,
          a.NR_CPF_CNPJ  AS CPF,
          a.NM_BAIRRO    AS BAIRRO,
          a.NM_CIDADE    AS CIDADE,
          a.DS_ENDERECO  AS RUA,
          a.SG_ESTADO    AS UF,
          a.NR_CEP       AS CEP,
          a.SL_CONTA_CAPITAL as SALDO_CAPITAL
        FROM ASSOCIADO_ANALITICO a
        WHERE REGEXP_REPLACE(a.NR_CPF_CNPJ, '[^0-9]', '') = :cpf
          AND ROWNUM = 1
      `;

            const result = await oracleExecute(sql, { cpf }, { outFormat: oracledb.OUT_FORMAT_OBJECT });

            if (!result.rows?.length) {
                return res.json({ found: false });
            }

            const row: any = result.rows[0];
            return res.json({
                found: true,
                nome: row.NOME || "",
                matricula: row.MATRICULA || "",
                empresa: row.EMPRESA || "",
                cpf: row.CPF || cpf,
                bairro: row.BAIRRO || "",
                cidade: row.CIDADE || "",
                rua: row.RUA || "",
                uf: row.UF || "",
                cep: row.CEP || "",
                saldo_capital: row.SALDO_CAPITAL || "",
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