import { Request, Response } from "express";
import oracledb from "oracledb";
import { oracleExecute } from "../services/oracle.service";
import { parsePeriodo } from "../services/producao-meta-cooperativa-pa/periodo";
import { getSql, Tema } from "../services/producao-meta-cooperativa-pa/queries";

const TEMAS_VALIDOS: Tema[] = [
    "entrada_cooperados",
    "saldo_cooperados",
    "conta_corrente_abertas",
    "conta_corrente_ativas",
    "volume_transacoes",
    "liquidacao_baixa",
    "faturamento_sipag",
    "portabilidade",
    "seguro_gerais_novo",
    "seguro_gerais_renovado",
    "seguro_venda_nova",
    "seguro_arrecadacao",
    "saldo_previdencia_mi",
    "saldo_previdencia_vgbl",
    "emprestimo_bancoob",
    "consorcio",
];

function isTema(value: string): value is Tema {
    return TEMAS_VALIDOS.includes(value as Tema);
}

function normalizeKeys(row: any) {
    const normalized: any = {};

    Object.keys(row || {}).forEach((key) => {
        normalized[String(key).toLowerCase()] = row[key];
    });

    return normalized;
}

export const producaoMetaCooperativaPaController = {
    async listar(req: Request, res: Response) {
        try {
            const tema = String(req.query.tema || "").trim();
            const data = String(req.query.data || "").trim();

            if (!tema || !isTema(tema)) {
                return res.status(400).json({ error: "Tema inválido." });
            }

            const periodo = parsePeriodo(data);

            if (!periodo?.dt_inicio || !periodo?.dt_fim) {
                return res.status(400).json({ error: "Período inválido." });
            }

            const sql = getSql(tema);

            const result = await oracleExecute(
                sql,
                {
                    dt_inicio: periodo.dt_inicio,
                    dt_fim: periodo.dt_fim,
                },
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            const rows = (result.rows || []).map((row: any) => normalizeKeys(row));

            return res.json(rows);
        } catch (err: any) {
            console.error("producaoMetaCooperativaPaController.listar erro:", err);
            return res.status(500).json({
                error: "Falha ao consultar relatório.",
                details: String(err?.message || err),
            });
        }
    },

    async datas(_req: Request, res: Response) {
        try {
            return res.json([]);
        } catch (err: any) {
            console.error("producaoMetaCooperativaPaController.datas erro:", err);
            return res.status(500).json({
                error: "Falha ao consultar datas do relatório.",
                details: String(err?.message || err),
            });
        }
    },
};