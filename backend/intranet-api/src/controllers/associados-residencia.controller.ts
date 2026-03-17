import { Request, Response } from "express";
import oracledb from "oracledb";
import { oracleExecute } from "../services/oracle.service";

function onlyDigits(v: string) {
    return (v || "").replace(/\D/g, "");
}

function splitEndereco(ds: string) {
    let rua = ds;
    let numero = "";
    let complemento = "";

    const m = ds.match(/^(.+?)\s*,?\s*(\d{1,6})(?:\s*[-–]\s*|\s+)(.*)$/i);
    if (m) {
        rua = m[1].trim();
        numero = m[2].trim();
        complemento = (m[3] || "").trim();
        if (/^$/i.test(complemento)) complemento = "";
    }

    return { rua, numero, complemento };
}

export const associadoResidenciaController = {
    async buscarPorCpfResidencia(req: Request, res: Response) {
        try {
            const cpfQuery = String(req.query.cpf || "");
            const cpf = onlyDigits(cpfQuery);

            if (cpf.length !== 11) {
                return res.status(400).json({ error: "CPF inválido (11 dígitos)." });
            }

            const sql = `
        SELECT
          a.NM_CLIENTE        AS NOME,
          a.NR_CPF_CNPJ       AS CPF,
          a.NR_DOCUMENTO      AS RG,
          a.DS_ENDERECO       AS DS_ENDERECO,
          a.NM_BAIRRO         AS BAIRRO,
          a.NM_CIDADE         AS CIDADE,
          a.SG_ESTADO         AS UF,
          a.NR_CEP            AS CEP
        FROM ASSOCIADO_ANALITICO a
        WHERE REGEXP_REPLACE(a.NR_CPF_CNPJ, '[^0-9]', '') = :cpf
          AND ROWNUM = 1
      `;

            const result = await oracleExecute(sql, { cpf }, { outFormat: oracledb.OUT_FORMAT_OBJECT });

            if (!result.rows?.length) {
                return res.json({ found: false });
            }

            const row: any = result.rows[0];
            const dsEndereco = (row.DS_ENDERECO || "").toString();
            const { rua, numero, complemento } = splitEndereco(dsEndereco);

            return res.json({
                found: true,
                nome: row.NOME || "",
                cpf: row.CPF || cpf,
                rg: row.RG || "",
                enderecoCompleto: dsEndereco,
                rua,
                numero,
                complemento,
                bairro: row.BAIRRO || "",
                cidade: row.CIDADE || "",
                uf: (row.UF || "").toString().toUpperCase(),
                cep: row.CEP || "",
            });
        } catch (err: any) {
            console.error("buscarPorCpfResidencia erro:", err);
            return res.status(500).json({
                error: "Falha ao consultar.",
                details: String(err?.message || err),
            });
        }
    },
};