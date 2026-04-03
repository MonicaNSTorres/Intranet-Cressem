import { Request, Response } from "express";
import oracledb from "oracledb";
import { oracleExecute } from "../services/oracle.service";

function capitalizeWords(value: string) {
    return String(value || "")
        .toLowerCase()
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

function escapeCsv(value: any) {
    const text = String(value ?? "");
    if (text.includes(";") || text.includes('"') || text.includes("\n")) {
        return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
}

export const gerenciamentoCargoController = {
    async listar(req: Request, res: Response) {
        try {
            const sql = `
        SELECT
          c.ID_CARGO,
          c.NM_CARGO,
          c.SN_ATIVO,
          c.NM_NIVEL,
          c.ID_POSICAO,
          p.CD_SICOOB,
          p.NM_POSICAO
        FROM DBACRESSEM.CARGO_GERENTES_SICOOB_CRESSEM c
        LEFT JOIN DBACRESSEM.POSICAO_COOPERATIVA_SICOOB p
          ON p.ID_POSICAO = c.ID_POSICAO
        ORDER BY UPPER(c.NM_CARGO)
      `;

            const result = await oracleExecute(
                sql,
                {},
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            const rows = (result.rows || []).map((row: any) => ({
                ID_CARGO: row.ID_CARGO,
                NM_CARGO: row.NM_CARGO,
                SN_ATIVO: row.SN_ATIVO,
                NM_NIVEL: row.NM_NIVEL,
                ID_POSICAO: row.ID_POSICAO,
                POSICAO: row.ID_POSICAO
                    ? {
                        ID_POSICAO: row.ID_POSICAO,
                        CD_SICOOB: row.CD_SICOOB,
                        NM_POSICAO: row.NM_POSICAO,
                    }
                    : null,
            }));

            return res.json(rows);
        } catch (err: any) {
            console.error("listar cargos erro:", err);
            return res.status(500).json({
                error: "Falha ao listar cargos.",
                details: String(err?.message || err),
            });
        }
    },

    async listarPaginado(req: Request, res: Response) {
        try {
            const nome = String(req.query.nome || "").trim();
            const page = Math.max(Number(req.query.page || 1), 1);
            const limit = Math.max(Number(req.query.limit || 10), 1);
            const offset = (page - 1) * limit;

            const bindsCount = {
                nome: `%${nome.toUpperCase()}%`,
            };

            const bindsLista = {
                nome: `%${nome.toUpperCase()}%`,
                offset,
                limit,
            };

            const sqlCount = `
      SELECT COUNT(*) AS TOTAL
      FROM DBACRESSEM.CARGO_GERENTES_SICOOB_CRESSEM c
      WHERE (:nome = '%%' OR UPPER(c.NM_CARGO) LIKE :nome)
    `;

            const countResult = await oracleExecute(
                sqlCount,
                bindsCount,
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            const total = Number((countResult.rows?.[0] as any)?.TOTAL || 0);
            const total_pages = total > 0 ? Math.ceil(total / limit) : 1;

            const sql = `
      SELECT *
      FROM (
        SELECT
          c.ID_CARGO,
          c.NM_CARGO,
          c.SN_ATIVO,
          c.NM_NIVEL,
          c.ID_POSICAO,
          p.CD_SICOOB,
          p.NM_POSICAO,
          ROW_NUMBER() OVER (ORDER BY UPPER(c.NM_CARGO)) AS RN
        FROM DBACRESSEM.CARGO_GERENTES_SICOOB_CRESSEM c
        LEFT JOIN DBACRESSEM.POSICAO_COOPERATIVA_SICOOB p
          ON p.ID_POSICAO = c.ID_POSICAO
        WHERE (:nome = '%%' OR UPPER(c.NM_CARGO) LIKE :nome)
      )
      WHERE RN > :offset
        AND RN <= (:offset + :limit)
      ORDER BY RN
    `;

            const result = await oracleExecute(
                sql,
                bindsLista,
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            const items = (result.rows || []).map((row: any) => ({
                ID_CARGO: row.ID_CARGO,
                NM_CARGO: row.NM_CARGO,
                SN_ATIVO: row.SN_ATIVO,
                NM_NIVEL: row.NM_NIVEL,
                ID_POSICAO: row.ID_POSICAO,
                POSICAO: row.ID_POSICAO
                    ? {
                        ID_POSICAO: row.ID_POSICAO,
                        CD_SICOOB: row.CD_SICOOB,
                        NM_POSICAO: row.NM_POSICAO,
                    }
                    : null,
            }));

            return res.json({
                items,
                total,
                total_pages,
                page,
                limit,
            });
        } catch (err: any) {
            console.error("listarPaginado cargos erro:", err);
            return res.status(500).json({
                error: "Falha ao listar cargos paginados.",
                details: String(err?.message || err),
            });
        }
    },

    async cadastrar(req: Request, res: Response) {
        try {
            const NM_CARGO = String(req.body.NM_CARGO || "").trim().toUpperCase();
            const NM_NIVEL = String(req.body.NM_NIVEL || "").trim().toUpperCase();
            const ID_POSICAO = Number(req.body.ID_POSICAO || 0);

            if (!NM_CARGO) {
                return res.status(400).json({
                    error: "Preencha o cargo.",
                });
            }

            if (!NM_NIVEL) {
                return res.status(400).json({
                    error: "Preencha o nível.",
                });
            }

            if (!ID_POSICAO) {
                return res.status(400).json({
                    error: "Preencha a posição.",
                });
            }

            const sql = `
        INSERT INTO DBACRESSEM.CARGO_GERENTES_SICOOB_CRESSEM (
          NM_CARGO,
          SN_ATIVO,
          NM_NIVEL,
          ID_POSICAO
        ) VALUES (
          :NM_CARGO,
          1,
          :NM_NIVEL,
          :ID_POSICAO
        )
        RETURNING ID_CARGO INTO :ID_CARGO
      `;

            const result = await oracleExecute(
                sql,
                {
                    NM_CARGO,
                    NM_NIVEL,
                    ID_POSICAO,
                    ID_CARGO: {
                        dir: oracledb.BIND_OUT,
                        type: oracledb.NUMBER,
                    },
                },
                { autoCommit: true }
            );

            const id = (result.outBinds as any)?.ID_CARGO?.[0];

            return res.status(201).json({
                ID_CARGO: id,
                NM_CARGO,
                SN_ATIVO: 1,
                NM_NIVEL,
                ID_POSICAO,
            });
        } catch (err: any) {
            console.error("cadastrar cargo erro:", err);
            return res.status(500).json({
                error: "Falha ao cadastrar cargo.",
                details: String(err?.message || err),
            });
        }
    },

    async editar(req: Request, res: Response) {
        try {
            const id = Number(req.params.id || 0);

            const NM_CARGO = String(req.body.NM_CARGO || "").trim().toUpperCase();
            const SN_ATIVO = Number(req.body.SN_ATIVO);
            const NM_NIVEL = String(req.body.NM_NIVEL || "").trim().toUpperCase();
            const ID_POSICAO = Number(req.body.ID_POSICAO || 0);

            if (!id) {
                return res.status(400).json({
                    error: "ID do cargo inválido.",
                });
            }

            if (!NM_CARGO) {
                return res.status(400).json({
                    error: "Preencha o cargo.",
                });
            }

            if (!NM_NIVEL) {
                return res.status(400).json({
                    error: "Preencha o nível.",
                });
            }

            if (!ID_POSICAO) {
                return res.status(400).json({
                    error: "Preencha a posição.",
                });
            }

            if (![0, 1].includes(SN_ATIVO)) {
                return res.status(400).json({
                    error: "Status inválido para o cargo.",
                });
            }

            const sql = `
        UPDATE DBACRESSEM.CARGO_GERENTES_SICOOB_CRESSEM
        SET
          NM_CARGO = :NM_CARGO,
          SN_ATIVO = :SN_ATIVO,
          NM_NIVEL = :NM_NIVEL,
          ID_POSICAO = :ID_POSICAO
        WHERE ID_CARGO = :ID_CARGO
      `;

            const result = await oracleExecute(
                sql,
                {
                    ID_CARGO: id,
                    NM_CARGO,
                    SN_ATIVO,
                    NM_NIVEL,
                    ID_POSICAO,
                },
                { autoCommit: true }
            );

            if (!result.rowsAffected) {
                return res.status(404).json({
                    error: "Cargo não encontrado.",
                });
            }

            return res.json({
                ID_CARGO: id,
                NM_CARGO,
                SN_ATIVO,
                NM_NIVEL,
                ID_POSICAO,
            });
        } catch (err: any) {
            console.error("editar cargo erro:", err);
            return res.status(500).json({
                error: "Falha ao atualizar cargo.",
                details: String(err?.message || err),
            });
        }
    },

    async listarPosicoes(req: Request, res: Response) {
        try {
            const sql = `
        SELECT
          ID_POSICAO,
          CD_SICOOB,
          DESC_ATUACAO,
          NM_POSICAO,
          DESC_POSICAO,
          SN_ATIVO
        FROM DBACRESSEM.POSICAO_COOPERATIVA_SICOOB
        ORDER BY CD_SICOOB
      `;

            const result = await oracleExecute(
                sql,
                {},
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            return res.json(result.rows || []);
        } catch (err: any) {
            console.error("listar posicoes erro:", err);
            return res.status(500).json({
                error: "Falha ao listar posições.",
                details: String(err?.message || err),
            });
        }
    },

    async downloadCsv(req: Request, res: Response) {
        try {
            const sql = `
        SELECT
          c.NM_CARGO,
          c.SN_ATIVO,
          c.NM_NIVEL,
          p.CD_SICOOB,
          p.NM_POSICAO
        FROM DBACRESSEM.CARGO_GERENTES_SICOOB_CRESSEM c
        LEFT JOIN DBACRESSEM.POSICAO_COOPERATIVA_SICOOB p
          ON p.ID_POSICAO = c.ID_POSICAO
        ORDER BY UPPER(c.NM_CARGO)
      `;

            const result = await oracleExecute(
                sql,
                {},
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            const rows = result.rows || [];

            const header = ["Cargo", "Status", "Nivel", "Codigo", "Posicao"];
            const lines = [header.join(";")];

            rows.forEach((row: any) => {
                lines.push(
                    [
                        escapeCsv(capitalizeWords(row.NM_CARGO)),
                        escapeCsv(Number(row.SN_ATIVO) === 1 ? "Ativo" : "Inativo"),
                        escapeCsv(capitalizeWords(row.NM_NIVEL)),
                        escapeCsv(row.CD_SICOOB || ""),
                        escapeCsv(capitalizeWords(row.NM_POSICAO || "")),
                    ].join(";")
                );
            });

            const csv = "\uFEFF" + lines.join("\n");

            res.setHeader("Content-Type", "text/csv; charset=utf-8");
            res.setHeader(
                "Content-Disposition",
                'attachment; filename="cargos_gestores.csv"'
            );

            return res.status(200).send(csv);
        } catch (err: any) {
            console.error("download csv cargos erro:", err);
            return res.status(500).json({
                error: "Falha ao gerar relatório CSV.",
                details: String(err?.message || err),
            });
        }
    },
};