import { Request, Response } from "express";
import oracledb from "oracledb";
import { oracleExecute } from "../services/oracle.service";
import { parsePeriodo } from "../services/producao-meta-funcionario/periodo";
import { getSql, TemaFuncionario } from "../services/producao-meta-funcionario/queries";

const TEMAS_VALIDOS: TemaFuncionario[] = [
    "consorcio",
    "seguro_gerais_novo",
    "entrada_cooperados",
    "conta_corrente_abertas",
    "seguro_venda_nova",
    "seguro_rural",
    "saldo_previdencia_mi",
    "saldo_previdencia_vgbl",
];

function isTema(value: string): value is TemaFuncionario {
    return TEMAS_VALIDOS.includes(value as TemaFuncionario);
}

function normalizeKeys(row: any) {
    const normalized: any = {};

    Object.keys(row || {}).forEach((key) => {
        normalized[String(key).toLowerCase()] = row[key];
    });

    return normalized;
}

export const producaoMetaFuncionarioController = {
    async listar(req: Request, res: Response) {
        try {
            const tema = String(req.query.tema || "").trim();
            const data = String(req.query.data || "").trim();

            console.log("Tema recebido:", tema);
            console.log("Data recebida:", data);

            if (!tema || !isTema(tema)) {
                return res.status(400).json({ error: "Tema inválido." });
            }

            const periodo = parsePeriodo(data);

            console.log("Período parseado:", periodo);

            if (!periodo?.dt_inicio || !periodo?.dt_fim) {
                return res.status(400).json({ error: "Período inválido." });
            }

            const sql = getSql(tema);

            console.log("Executando SQL do tema:", tema);

            const result = await oracleExecute(
                sql,
                {
                    dt_inicio: periodo.dt_inicio,
                    dt_fim: periodo.dt_fim,
                },
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            console.log("Quantidade de linhas:", result.rows?.length || 0);
            console.log("Primeira linha:", result.rows?.[0]);

            const rows = (result.rows || []).map((row: any) => normalizeKeys(row));

            return res.json(rows);
        } catch (err: any) {
            console.error("producaoMetaFuncionarioController.listar erro:", err);
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
            console.error("producaoMetaFuncionarioController.datas erro:", err);
            return res.status(500).json({
                error: "Falha ao consultar datas do relatório.",
                details: String(err?.message || err),
            });
        }
    },
};