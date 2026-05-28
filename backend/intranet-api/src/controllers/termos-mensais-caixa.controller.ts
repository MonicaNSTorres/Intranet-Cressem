import { Request, Response } from "express";
import oracledb from "oracledb";
import { oracleExecute } from "../services/oracle.service";
import path from "path";
import fs from "fs";

function normalizarCompetencia(competencia: string) {
    if (!/^\d{4}-\d{2}$/.test(competencia)) {
        return null;
    }

    return `${competencia}-01`;
}

async function lerClobComoString(clob: any): Promise<string> {
    return new Promise((resolve, reject) => {
        let data = "";

        clob.setEncoding("utf8");

        clob.on("data", (chunk: string) => {
            data += chunk;
        });

        clob.on("end", () => {
            resolve(data);
        });

        clob.on("error", (err: any) => {
            reject(err);
        });
    });
}

async function normalizarDadosFormulario(value: any) {
    if (!value) return null;

    if (typeof value === "object" && typeof value.setEncoding === "function") {
        const clobString = await lerClobComoString(value);
        return clobString ? JSON.parse(clobString) : null;
    }

    if (Buffer.isBuffer(value)) {
        const bufferString = value.toString("utf8");
        return bufferString ? JSON.parse(bufferString) : null;
    }

    if (typeof value === "string") {
        return value ? JSON.parse(value) : null;
    }

    if (typeof value === "object") {
        return value;
    }

    return null;
}

export const termosMensaisCaixaController = {
    async listar(req: Request, res: Response) {
        try {
            const competenciaQuery = String(req.query.competencia || "");
            const pa = String(req.query.pa || "");
            const status = String(req.query.status || "");

            const binds: any = {};
            let where = "WHERE 1 = 1";

            if (competenciaQuery) {
                const competencia = normalizarCompetencia(competenciaQuery);

                if (!competencia) {
                    return res.status(400).json({
                        error: "Competência inválida. Use o formato YYYY-MM.",
                    });
                }

                where += " AND DT_COMPETENCIA = TO_DATE(:competencia, 'YYYY-MM-DD')";
                binds.competencia = competencia;
            }

            if (pa) {
                where += " AND UPPER(NM_PA) LIKE UPPER(:pa)";
                binds.pa = `%${pa}%`;
            }

            if (status) {
                where += " AND SN_STATUS = :status";
                binds.status = status;
            }

            const sql = `
                SELECT
                    ID_TERMOS_MENSAIS_CAIXA,
                    TO_CHAR(DT_COMPETENCIA, 'YYYY-MM') AS DT_COMPETENCIA,
                    NM_PA,
                    SN_STATUS,
                    NM_ARQUIVO_GERADO,
                    NM_CAMINHO_ARQUIVO_GERADO,
                    NM_ARQUIVO_ASSINADO,
                    NM_CAMINHO_ARQUIVO_ASSINADO,
                    TO_CHAR(DT_UPLOAD_ASSINADO, 'DD/MM/YYYY HH24:MI') AS DT_UPLOAD_ASSINADO,
                    NM_USUARIO_CRIACAO,
                    TO_CHAR(DT_CRIACAO, 'DD/MM/YYYY HH24:MI') AS DT_CRIACAO,
                    NM_USUARIO_ATUALIZACAO,
                    TO_CHAR(DT_ATUALIZACAO, 'DD/MM/YYYY HH24:MI') AS DT_ATUALIZACAO
                FROM DBACRESSEM.TERMOS_MENSAIS_CAIXA
                ${where}
                ORDER BY DT_COMPETENCIA DESC, DT_CRIACAO DESC
            `;

            const result = await oracleExecute(
                sql,
                binds,
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            return res.json({
                success: true,
                data: result.rows || [],
            });
        } catch (err: any) {
            console.error("listar termos mensais caixa erro:", err);

            return res.status(500).json({
                error: "Falha ao listar termos mensais caixa.",
                details: String(err?.message || err),
            });
        }
    },

    async obterPorId(req: Request, res: Response) {
        try {
            const id = Number(req.params.id);

            if (!id) {
                return res.status(400).json({
                    error: "ID inválido.",
                });
            }

            const result = await oracleExecute(
                `
                    SELECT
                        ID_TERMOS_MENSAIS_CAIXA,
                        TO_CHAR(DT_COMPETENCIA, 'YYYY-MM') AS DT_COMPETENCIA,
                        NM_PA,
                        DS_DADOS_FORMULARIO,
                        SN_STATUS,
                        NM_ARQUIVO_GERADO,
                        NM_CAMINHO_ARQUIVO_GERADO,
                        NM_ARQUIVO_ASSINADO,
                        NM_CAMINHO_ARQUIVO_ASSINADO,
                        TO_CHAR(DT_UPLOAD_ASSINADO, 'DD/MM/YYYY HH24:MI') AS DT_UPLOAD_ASSINADO,
                        NM_USUARIO_CRIACAO,
                        TO_CHAR(DT_CRIACAO, 'DD/MM/YYYY HH24:MI') AS DT_CRIACAO,
                        NM_USUARIO_ATUALIZACAO,
                        TO_CHAR(DT_ATUALIZACAO, 'DD/MM/YYYY HH24:MI') AS DT_ATUALIZACAO
                    FROM DBACRESSEM.TERMOS_MENSAIS_CAIXA
                    WHERE ID_TERMOS_MENSAIS_CAIXA = :id
                `,
                { id },
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            if (!result.rows?.length) {
                return res.status(404).json({
                    error: "Termo mensal caixa não encontrado.",
                });
            }

            const row: any = result.rows[0];
            const dadosFormulario = await normalizarDadosFormulario(
                row.DS_DADOS_FORMULARIO
            );

            return res.json({
                success: true,
                data: {
                    ...row,
                    DS_DADOS_FORMULARIO: dadosFormulario,
                },
            });
        } catch (err: any) {
            console.error("obter termo mensal caixa erro:", err);

            return res.status(500).json({
                error: "Falha ao buscar termo mensal caixa.",
                details: String(err?.message || err),
            });
        }
    },

    async criar(req: Request, res: Response) {
        try {
            const {
                competencia,
                pa,
                dadosFormulario,
                usuarioCriacao,
            } = req.body;

            const competenciaNormalizada = normalizarCompetencia(String(competencia || ""));

            if (!competenciaNormalizada) {
                return res.status(400).json({
                    error: "Competência inválida. Use o formato YYYY-MM.",
                });
            }

            if (!pa) {
                return res.status(400).json({
                    error: "Informe o PA.",
                });
            }

            if (!dadosFormulario) {
                return res.status(400).json({
                    error: "Informe os dados do formulário.",
                });
            }

            const dadosJson = JSON.stringify(dadosFormulario);

            const sql = `
                INSERT INTO DBACRESSEM.TERMOS_MENSAIS_CAIXA (
                    DT_COMPETENCIA,
                    NM_PA,
                    DS_DADOS_FORMULARIO,
                    SN_STATUS,
                    NM_USUARIO_CRIACAO
                ) VALUES (
                    TO_DATE(:competencia, 'YYYY-MM-DD'),
                    :pa,
                    :dadosFormulario,
                    'RASCUNHO',
                    :usuarioCriacao
                )
            `;

            await oracleExecute(
                sql,
                {
                    competencia: competenciaNormalizada,
                    pa,
                    dadosFormulario: dadosJson,
                    usuarioCriacao: usuarioCriacao || "INTRANET",
                },
                { autoCommit: true }
            );

            return res.json({
                success: true,
                message: "Termo mensal caixa criado com sucesso.",
            });
        } catch (err: any) {
            console.error("criar termo mensal caixa erro:", err);

            return res.status(500).json({
                error: "Falha ao criar termo mensal caixa.",
                details: String(err?.message || err),
            });
        }
    },

    async atualizar(req: Request, res: Response) {
        try {
            const id = Number(req.params.id);

            if (!id) {
                return res.status(400).json({
                    error: "ID inválido.",
                });
            }

            const {
                competencia,
                pa,
                dadosFormulario,
                status,
                usuarioAtualizacao,
            } = req.body;

            const competenciaNormalizada = normalizarCompetencia(String(competencia || ""));

            if (!competenciaNormalizada) {
                return res.status(400).json({
                    error: "Competência inválida. Use o formato YYYY-MM.",
                });
            }

            if (!pa) {
                return res.status(400).json({
                    error: "Informe o PA.",
                });
            }

            if (!dadosFormulario) {
                return res.status(400).json({
                    error: "Informe os dados do formulário.",
                });
            }

            const dadosJson = JSON.stringify(dadosFormulario);

            await oracleExecute(
                `
                    UPDATE DBACRESSEM.TERMOS_MENSAIS_CAIXA
                    SET
                        DT_COMPETENCIA = TO_DATE(:competencia, 'YYYY-MM-DD'),
                        NM_PA = :pa,
                        DS_DADOS_FORMULARIO = :dadosFormulario,
                        SN_STATUS = :status,
                        NM_USUARIO_ATUALIZACAO = :usuarioAtualizacao,
                        DT_ATUALIZACAO = SYSDATE
                    WHERE ID_TERMOS_MENSAIS_CAIXA = :id
                `,
                {
                    id,
                    competencia: competenciaNormalizada,
                    pa,
                    dadosFormulario: dadosJson,
                    status: status || "RASCUNHO",
                    usuarioAtualizacao: usuarioAtualizacao || "INTRANET",
                },
                { autoCommit: true }
            );

            return res.json({
                success: true,
                message: "Termo mensal caixa atualizado com sucesso.",
            });
        } catch (err: any) {
            console.error("atualizar termo mensal caixa erro:", err);

            return res.status(500).json({
                error: "Falha ao atualizar termo mensal caixa.",
                details: String(err?.message || err),
            });
        }
    },

    async alterarStatus(req: Request, res: Response) {
        try {
            const id = Number(req.params.id);
            const { status, usuarioAtualizacao } = req.body;

            if (!id) {
                return res.status(400).json({
                    error: "ID inválido.",
                });
            }

            if (!status) {
                return res.status(400).json({
                    error: "Informe o status.",
                });
            }

            await oracleExecute(
                `
                    UPDATE DBACRESSEM.TERMOS_MENSAIS_CAIXA
                    SET
                        SN_STATUS = :status,
                        NM_USUARIO_ATUALIZACAO = :usuarioAtualizacao,
                        DT_ATUALIZACAO = SYSDATE
                    WHERE ID_TERMOS_MENSAIS_CAIXA = :id
                `,
                {
                    id,
                    status,
                    usuarioAtualizacao: usuarioAtualizacao || "INTRANET",
                },
                { autoCommit: true }
            );

            return res.json({
                success: true,
                message: "Status atualizado com sucesso.",
            });
        } catch (err: any) {
            console.error("alterar status termo mensal caixa erro:", err);

            return res.status(500).json({
                error: "Falha ao alterar status.",
                details: String(err?.message || err),
            });
        }
    },

    async uploadAssinado(req: Request, res: Response) {
        try {
            const id = Number(req.params.id);
            const usuarioAtualizacao = String(req.body.usuarioAtualizacao || "INTRANET");

            if (!id) {
                return res.status(400).json({
                    error: "ID inválido.",
                });
            }

            const file = (req as any).files?.arquivo;

            if (!file) {
                return res.status(400).json({
                    error: "Nenhum arquivo enviado.",
                });
            }

            const arquivo = Array.isArray(file) ? file[0] : file;

            const extensao = path.extname(arquivo.name).toLowerCase();

            if (extensao !== ".pdf") {
                return res.status(400).json({
                    error: "Envie apenas arquivo PDF assinado.",
                });
            }

            const termoResult = await oracleExecute(
                `
                SELECT
                    ID_TERMOS_MENSAIS_CAIXA,
                    TO_CHAR(DT_COMPETENCIA, 'YYYY-MM') AS DT_COMPETENCIA,
                    NM_PA
                FROM DBACRESSEM.TERMOS_MENSAIS_CAIXA
                WHERE ID_TERMOS_MENSAIS_CAIXA = :id
            `,
                { id },
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            if (!termoResult.rows?.length) {
                return res.status(404).json({
                    error: "Termo mensal caixa não encontrado.",
                });
            }

            const termo: any = termoResult.rows[0];

            const uploadDir = path.resolve(
                process.cwd(),
                "src",
                "uploads",
                "termos-mensais-caixa",
                "assinados"
            );

            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }

            const paSanitizado = String(termo.NM_PA || "PA")
                .replace(/\s+/g, "_")
                .replace(/[^\w\-_.]/g, "");

            const nomeArquivo = `termo_caixa_assinado_${termo.DT_COMPETENCIA}_${paSanitizado}_${Date.now()}${extensao}`;
            const caminhoArquivo = path.join(uploadDir, nomeArquivo);

            await arquivo.mv(caminhoArquivo);

            await oracleExecute(
                `
                UPDATE DBACRESSEM.TERMOS_MENSAIS_CAIXA
                SET
                    NM_ARQUIVO_ASSINADO = :nomeArquivo,
                    NM_CAMINHO_ARQUIVO_ASSINADO = :caminhoArquivo,
                    DT_UPLOAD_ASSINADO = SYSDATE,
                    SN_STATUS = 'ASSINADO_ANEXADO',
                    NM_USUARIO_ATUALIZACAO = :usuarioAtualizacao,
                    DT_ATUALIZACAO = SYSDATE
                WHERE ID_TERMOS_MENSAIS_CAIXA = :id
            `,
                {
                    id,
                    nomeArquivo,
                    caminhoArquivo,
                    usuarioAtualizacao,
                },
                { autoCommit: true }
            );

            return res.json({
                success: true,
                message: "Termo assinado anexado com sucesso.",
                arquivo: nomeArquivo,
            });
        } catch (err: any) {
            console.error("upload termo assinado erro:", err);

            return res.status(500).json({
                error: "Falha ao anexar termo assinado.",
                details: String(err?.message || err),
            });
        }
    },

    async downloadAssinado(req: Request, res: Response) {
        try {
            const id = Number(req.params.id);

            if (!id) {
                return res.status(400).json({
                    error: "ID inválido.",
                });
            }

            const result = await oracleExecute(
                `
                SELECT
                    NM_ARQUIVO_ASSINADO,
                    NM_CAMINHO_ARQUIVO_ASSINADO
                FROM DBACRESSEM.TERMOS_MENSAIS_CAIXA
                WHERE ID_TERMOS_MENSAIS_CAIXA = :id
            `,
                { id },
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            if (!result.rows?.length) {
                return res.status(404).json({
                    error: "Termo mensal caixa não encontrado.",
                });
            }

            const row: any = result.rows[0];

            if (!row.NM_CAMINHO_ARQUIVO_ASSINADO) {
                return res.status(404).json({
                    error: "Nenhum termo assinado anexado para este registro.",
                });
            }

            if (!fs.existsSync(row.NM_CAMINHO_ARQUIVO_ASSINADO)) {
                return res.status(404).json({
                    error: "Arquivo assinado não encontrado no servidor.",
                });
            }

            return res.download(
                row.NM_CAMINHO_ARQUIVO_ASSINADO,
                row.NM_ARQUIVO_ASSINADO
            );
        } catch (err: any) {
            console.error("download termo assinado erro:", err);

            return res.status(500).json({
                error: "Falha ao baixar termo assinado.",
                details: String(err?.message || err),
            });
        }
    },

    async listarPAs(req: Request, res: Response) {
        try {
            const result = await oracleExecute(
                `
                SELECT
                    ID_PA_ATUALIZADA,
                    NR_PA,
                    NM_PA,
                    NM_FANTASIA
                FROM DBACRESSEM.PA_ATUALIZADA
                ORDER BY NR_PA
            `,
                {},
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            return res.json({
                success: true,
                data: result.rows || [],
            });
        } catch (err: any) {
            console.error("listar PAs erro:", err);

            return res.status(500).json({
                error: "Falha ao listar PAs.",
                details: String(err?.message || err),
            });
        }
    },
};