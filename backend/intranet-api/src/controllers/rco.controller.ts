import { Request, Response } from "express";
import oracledb from "oracledb";
import { oracleExecute } from "../services/oracle.service";

function calculaDataDia(data1: string, data2: string): number {
    const d1 = new Date(data1);
    const d2 = new Date(data2);

    if (Number.isNaN(d1.getTime()) || Number.isNaN(d2.getTime())) {
        throw new Error("Data invalida. Use formato YYYY-MM-DD.");
    }

    const diffMs = d1.getTime() - d2.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export const rcoController = {
    async listarOrigens(_req: Request, res: Response) {
        try {
            const sql = `
        SELECT DISTINCT TR.NM_ORIGEM
        FROM DBACRESSEM.VALORES_RCO TR
        ORDER BY TR.NM_ORIGEM
        `;

            const result = await oracleExecute(
                sql,
                {},
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            const origens = (result.rows || []).map((r: any) => r.NM_ORIGEM);
            return res.json({ data: origens });
        } catch (err: any) {
            return res.status(500).json({
                error: "Falha ao listar origens.",
                details: String(err?.message || err),
            });
        }
    },

    async buscarRco(req: Request, res: Response) {
        try {
            const origem = String(req.query.origem || "").trim();
            const valor = Number(req.query.valor || 0);

            if (!origem) {
                return res.status(400).json({ error: "origem obrigatoria." });
            }

            const sql = `
        SELECT
          TR.NM_ORIGEM,
          TR.VL_INICIAL,
          TR.VL_FINAL,
          TR.VL_RETORNO
        FROM DBACRESSEM.VALORES_RCO TR
        WHERE TR.NM_ORIGEM = :origem
        ORDER BY TR.VL_INICIAL
        `;

            const result = await oracleExecute(
                sql,
                { origem },
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            const fatores = (result.rows || []) as any[];
            let fatorEncontrado: any = null;

            for (const fator of fatores) {
                if (valor <= Number(fator.VL_FINAL)) {
                    fatorEncontrado = fator;
                    break;
                } else if (Number(fator.VL_INICIAL) > Number(fator.VL_FINAL)) {
                    fatorEncontrado = fator;
                    break;
                }
            }

            return res.json({ data: fatorEncontrado });
        } catch (err: any) {
            return res.status(500).json({
                error: "Falha ao buscar RCO.",
                details: String(err?.message || err),
            });
        }
    },

    processaCalculoRco(req: Request, res: Response) {
        try {
            const { data_operacao, data_ultima, rco, data_hoje } = req.body || {};

            if (!data_operacao || !data_ultima || rco === undefined || !data_hoje) {
                return res.status(400).json({
                    error: "Campos obrigatorios: data_operacao, data_ultima, rco, data_hoje.",
                });
            }

            // Mantendo a mesma ordem do Python para preservar regra atual
            const primeiro = calculaDataDia(String(data_ultima), String(data_hoje));
            const segundo = calculaDataDia(String(data_ultima), String(data_operacao));

            if (segundo === 0) {
                return res.status(400).json({ error: "Divisao por zero no calculo (segundo = 0)." });
            }

            const processamento = Number(rco) * (primeiro / segundo);

            return res.json({
                processamento_rco: processamento.toFixed(2),
            });
        } catch (err: any) {
            return res.status(500).json({
                error: "Falha ao processar calculo RCO.",
                details: String(err?.message || err),
            });
        }
    },
};
