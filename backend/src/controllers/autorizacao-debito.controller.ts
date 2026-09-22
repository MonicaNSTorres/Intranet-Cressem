import { Request, Response } from "express";
import oracledb from "oracledb";
import { oracleExecute } from "../services/oracle.service";

function onlyDigits(value: string) {
    return String(value || "").replace(/\D/g, "");
}

export const autorizacaoDebitoController = {
    async listarContaCorrente(req: Request, res: Response) {
        try {
            const cpf = onlyDigits(String(req.query.cpf || ""));

            if (!cpf) {
                return res.status(400).json({
                    error: "cpf é obrigatório.",
                });
            }

            const sql = `
                        SELECT DISTINCT
                            NR_CONTA_CORRENTE
                        FROM DBACRESSEM.CONTA_CORRENTE_DIARIO_NOVO
                        WHERE REGEXP_REPLACE(NR_CPF_CNPJ_CLIENTE, '[^0-9]', '') = :cpf
                            AND NR_CONTA_CORRENTE IS NOT NULL
                        ORDER BY NR_CONTA_CORRENTE
                        `;

            const result = await oracleExecute(
                sql,
                { cpf },
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            return res.json(result.rows || []);
        } catch (err: any) {
            console.error("listarContaCorrente erro:", err);
            return res.status(500).json({
                error: "Falha ao listar conta corrente.",
                details: String(err?.message || err),
            });
        }
    },
};