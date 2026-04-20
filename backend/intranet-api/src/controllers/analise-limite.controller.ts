import { Request, Response } from "express";
import oracledb from "oracledb";
import { oracleExecute } from "../services/oracle.service";
import fs from "fs/promises";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

function onlyDigits(v: string) {
    return String(v || "").replace(/\D/g, "");
}

function toNumber(v: any, fallback = 0) {
    if (v === null || v === undefined || v === "") return fallback;

    if (typeof v === "string") {
        const normalized = v.replace(/\./g, "").replace(",", ".");
        const n = Number(normalized);
        return Number.isFinite(n) ? n : fallback;
    }

    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
}

function toNullableNumber(v: any) {
    if (v === null || v === undefined || v === "") return null;

    if (typeof v === "string") {
        const normalized = v.replace(/\./g, "").replace(",", ".");
        const n = Number(normalized);
        return Number.isFinite(n) ? n : null;
    }

    const n = Number(v);
    return Number.isFinite(n) ? n : null;
}

function toNullableDate(v: any) {
    if (!v) return null;
    return String(v).slice(0, 10);
}

function toUpperTrim(v: any) {
    return String(v || "").trim().toUpperCase();
}

function toTrim(v: any) {
    return String(v || "").trim();
}

function sanitizeFolderName(value: string) {
    return String(value || "")
        .trim()
        .replace(/[\\/:*?"<>|]/g, "")
        .replace(/\s+/g, " ");
}

function getUploadedFile(files: any, fieldName: string) {
    if (!files || !files[fieldName]) return null;

    const file = files[fieldName];

    if (Array.isArray(file)) {
        return file[0];
    }

    return file;
}

function getSmbConfig() {
    const server = String(process.env.SMB_SERVER || "").trim();
    const share = String(process.env.SMB_SHARE || "").trim();
    const user = String(process.env.SMB_USER || "").trim();
    const password = String(process.env.SMB_PASSWORD || "");
    const domain = String(process.env.SMB_DOMAIN || "").trim();

    if (!server) {
        throw new Error("SMB_SERVER não configurado.");
    }

    if (!share) {
        throw new Error("SMB_SHARE não configurado.");
    }

    if (!user) {
        throw new Error("SMB_USER não configurado.");
    }

    if (!password) {
        throw new Error("SMB_PASSWORD não configurado.");
    }

    return { server, share, user, password, domain };
}

function getShareRoot() {
    const { server, share } = getSmbConfig();
    return `\\\\${server}\\${share}`;
}

async function conectarShareWindows() {
    const { server, share, user, password, domain } = getSmbConfig();
    const remote = `\\\\${server}\\${share}`;
    const fullUser = domain ? `${domain}\\${user}` : user;

    try {
        await execFileAsync("net", [
            "use",
            remote,
            password,
            `/user:${fullUser}`,
            "/persistent:no",
        ]);
    } catch (error: any) {
        const stderr = String(error?.stderr || "");
        const stdout = String(error?.stdout || "");
        const mensagem = `${stdout}\n${stderr}`.trim();

        if (mensagem.includes("1219")) {
            await execFileAsync("net", ["use", remote, "/delete", "/y"]);
            await execFileAsync("net", [
                "use",
                remote,
                password,
                `/user:${fullUser}`,
                "/persistent:no",
            ]);
            return;
        }

        if (
            mensagem.toLowerCase().includes("comando concluído com êxito") ||
            mensagem.includes("85")
        ) {
            return;
        }

        throw new Error(
            `Falha ao conectar no compartilhamento ${remote}. Detalhes: ${mensagem || error?.message || error}`
        );
    }
}

async function salvarArquivoAnaliseNoServidorSMB(
    arquivo: any,
    cpfCnpj: string
) {
    const shareRoot = getShareRoot();
    const pastaAssociado = sanitizeFolderName(onlyDigits(cpfCnpj));
    const fileName = sanitizeFolderName(
        arquivo.name || arquivo.filename || "assinatura.pdf"
    );
    const fileData = arquivo.data;

    await conectarShareWindows();

    const diretorioDestino = path.win32.join(
        shareRoot,
        "CRM",
        "ANALISE_LIMITE",
        pastaAssociado
    );

    const caminhoCompleto = path.win32.join(diretorioDestino, fileName);

    await fs.mkdir(diretorioDestino, { recursive: true });
    await fs.writeFile(caminhoCompleto, fileData);

    return caminhoCompleto;
}

export const analiseLimiteController = {
    async criar(req: Request, res: Response) {
        try {
            const {
                NR_CPF_CNPJ_ASSOCIADO,
                NM_ASSOCIADO,
                NR_CELULAR,
                NM_EMPRESA,
                NR_CONTA_CORRENTE,
                SL_BRUTO,
                SL_LIQUIDO,
                PORTABILIDADE,
                FUNCIONARIO_EFETIVO,
                CESSAO_CREDITO,
                DT_PAGAMENTO,
                NV_CARTEIRA,
                NR_IAP,
                OCORRENCIA_CRM,
                OBS_CRM,
                RISCO,
                PD,
                NR_CRL,
                CAPITAL,
                DIVIDA,
                RESTRICAO,
                DESC_RESTRICAO,
                SG_LIMITE,
                CARTAO,
                LT_ATUAL_CARTAO,
                LT_APROVADO_CARTAO,
                CHEQUE_ESPECIAL,
                LT_ATUAL_CH,
                LT_APROVADO_CH,
                DT,
                NM_FUNCIONARIO,
                NM_ASSINATURA,
                VL_FATURAMENTO_MENSAL,
                VL_FATURAMENTO_ANUAL,
            } = req.body || {};

            if (!NR_CPF_CNPJ_ASSOCIADO) {
                return res.status(400).json({
                    error: "NR_CPF_CNPJ_ASSOCIADO é obrigatório.",
                });
            }

            if (!NM_ASSOCIADO) {
                return res.status(400).json({
                    error: "NM_ASSOCIADO é obrigatório.",
                });
            }

            if (!NR_CELULAR) {
                return res.status(400).json({
                    error: "NR_CELULAR é obrigatório.",
                });
            }

            if (!NR_CONTA_CORRENTE) {
                return res.status(400).json({
                    error: "NR_CONTA_CORRENTE é obrigatório.",
                });
            }

            if (CESSAO_CREDITO === undefined || CESSAO_CREDITO === null || CESSAO_CREDITO === "") {
                return res.status(400).json({
                    error: "CESSAO_CREDITO é obrigatório.",
                });
            }

            if (!NV_CARTEIRA) {
                return res.status(400).json({
                    error: "NV_CARTEIRA é obrigatório.",
                });
            }

            if (NR_IAP === undefined || NR_IAP === null || NR_IAP === "") {
                return res.status(400).json({
                    error: "NR_IAP é obrigatório.",
                });
            }

            if (OCORRENCIA_CRM === undefined || OCORRENCIA_CRM === null || OCORRENCIA_CRM === "") {
                return res.status(400).json({
                    error: "OCORRENCIA_CRM é obrigatório.",
                });
            }

            if (!RISCO) {
                return res.status(400).json({
                    error: "RISCO é obrigatório.",
                });
            }

            if (!PD) {
                return res.status(400).json({
                    error: "PD é obrigatório.",
                });
            }

            if (NR_CRL === undefined || NR_CRL === null || NR_CRL === "") {
                return res.status(400).json({
                    error: "NR_CRL é obrigatório.",
                });
            }

            if (CAPITAL === undefined || CAPITAL === null || CAPITAL === "") {
                return res.status(400).json({
                    error: "CAPITAL é obrigatório.",
                });
            }

            if (DIVIDA === undefined || DIVIDA === null || DIVIDA === "") {
                return res.status(400).json({
                    error: "DIVIDA é obrigatório.",
                });
            }

            if (RESTRICAO === undefined || RESTRICAO === null || RESTRICAO === "") {
                return res.status(400).json({
                    error: "RESTRICAO é obrigatório.",
                });
            }

            if (CARTAO === undefined || CARTAO === null || CARTAO === "") {
                return res.status(400).json({
                    error: "CARTAO é obrigatório.",
                });
            }

            if (CHEQUE_ESPECIAL === undefined || CHEQUE_ESPECIAL === null || CHEQUE_ESPECIAL === "") {
                return res.status(400).json({
                    error: "CHEQUE_ESPECIAL é obrigatório.",
                });
            }

            if (!DT) {
                return res.status(400).json({
                    error: "DT é obrigatório.",
                });
            }

            if (!NM_FUNCIONARIO) {
                return res.status(400).json({
                    error: "NM_FUNCIONARIO é obrigatório.",
                });
            }

            const sql = `
        INSERT INTO DBACRESSEM.ANALISE_LIMITE_CHEQUE_CARTAO (
          NR_CPF_CNPJ_ASSOCIADO,
          NM_ASSOCIADO,
          NR_CELULAR,
          NM_EMPRESA,
          NR_CONTA_CORRENTE,
          SL_BRUTO,
          SL_LIQUIDO,
          PORTABILIDADE,
          FUNCIONARIO_EFETIVO,
          CESSAO_CREDITO,
          DT_PAGAMENTO,
          NV_CARTEIRA,
          NR_IAP,
          OCORRENCIA_CRM,
          OBS_CRM,
          RISCO,
          PD,
          NR_CRL,
          CAPITAL,
          DIVIDA,
          RESTRICAO,
          DESC_RESTRICAO,
          SG_LIMITE,
          CARTAO,
          LT_ATUAL_CARTAO,
          LT_APROVADO_CARTAO,
          CHEQUE_ESPECIAL,
          LT_ATUAL_CH,
          LT_APROVADO_CH,
          DT,
          NM_FUNCIONARIO,
          NM_ASSINATURA,
          VL_FATURAMENTO_MENSAL,
          VL_FATURAMENTO_ANUAL
        ) VALUES (
          :NR_CPF_CNPJ_ASSOCIADO,
          :NM_ASSOCIADO,
          :NR_CELULAR,
          :NM_EMPRESA,
          :NR_CONTA_CORRENTE,
          :SL_BRUTO,
          :SL_LIQUIDO,
          :PORTABILIDADE,
          :FUNCIONARIO_EFETIVO,
          :CESSAO_CREDITO,
          CASE
            WHEN :DT_PAGAMENTO IS NULL THEN NULL
            ELSE TO_DATE(:DT_PAGAMENTO, 'YYYY-MM-DD')
          END,
          :NV_CARTEIRA,
          :NR_IAP,
          :OCORRENCIA_CRM,
          :OBS_CRM,
          :RISCO,
          :PD,
          :NR_CRL,
          :CAPITAL,
          :DIVIDA,
          :RESTRICAO,
          :DESC_RESTRICAO,
          :SG_LIMITE,
          :CARTAO,
          :LT_ATUAL_CARTAO,
          :LT_APROVADO_CARTAO,
          :CHEQUE_ESPECIAL,
          :LT_ATUAL_CH,
          :LT_APROVADO_CH,
          TO_DATE(:DT, 'YYYY-MM-DD'),
          :NM_FUNCIONARIO,
          :NM_ASSINATURA,
          :VL_FATURAMENTO_MENSAL,
          :VL_FATURAMENTO_ANUAL
        )
        RETURNING ID_ANALISE INTO :ID_ANALISE
      `;

            const binds = {
                NR_CPF_CNPJ_ASSOCIADO: onlyDigits(NR_CPF_CNPJ_ASSOCIADO),
                NM_ASSOCIADO: toTrim(NM_ASSOCIADO),
                NR_CELULAR: onlyDigits(NR_CELULAR),
                NM_EMPRESA: NM_EMPRESA ? toTrim(NM_EMPRESA) : null,
                NR_CONTA_CORRENTE: toTrim(NR_CONTA_CORRENTE),
                SL_BRUTO: toNullableNumber(SL_BRUTO),
                SL_LIQUIDO: toNullableNumber(SL_LIQUIDO),
                PORTABILIDADE:
                    PORTABILIDADE === undefined || PORTABILIDADE === null || PORTABILIDADE === ""
                        ? null
                        : Number(PORTABILIDADE),
                FUNCIONARIO_EFETIVO:
                    FUNCIONARIO_EFETIVO === undefined ||
                        FUNCIONARIO_EFETIVO === null ||
                        FUNCIONARIO_EFETIVO === ""
                        ? null
                        : Number(FUNCIONARIO_EFETIVO),
                CESSAO_CREDITO: Number(CESSAO_CREDITO),
                DT_PAGAMENTO: toNullableDate(DT_PAGAMENTO),
                NV_CARTEIRA: toUpperTrim(NV_CARTEIRA),
                NR_IAP: Number(NR_IAP),
                OCORRENCIA_CRM: Number(OCORRENCIA_CRM),
                OBS_CRM: OBS_CRM ? toTrim(OBS_CRM) : null,
                RISCO: toUpperTrim(RISCO),
                PD: toUpperTrim(PD),
                NR_CRL: toNumber(NR_CRL),
                CAPITAL: toNumber(CAPITAL),
                DIVIDA: toNumber(DIVIDA),
                RESTRICAO: Number(RESTRICAO),
                DESC_RESTRICAO: DESC_RESTRICAO ? toTrim(DESC_RESTRICAO) : null,
                SG_LIMITE: toNullableNumber(SG_LIMITE),
                CARTAO: Number(CARTAO),
                LT_ATUAL_CARTAO: toNullableNumber(LT_ATUAL_CARTAO),
                LT_APROVADO_CARTAO: toNullableNumber(LT_APROVADO_CARTAO),
                CHEQUE_ESPECIAL: Number(CHEQUE_ESPECIAL),
                LT_ATUAL_CH: toNullableNumber(LT_ATUAL_CH),
                LT_APROVADO_CH: toNullableNumber(LT_APROVADO_CH),
                DT: toNullableDate(DT),
                NM_FUNCIONARIO: toTrim(NM_FUNCIONARIO),
                NM_ASSINATURA: NM_ASSINATURA ? toTrim(NM_ASSINATURA) : null,
                VL_FATURAMENTO_MENSAL: toNullableNumber(VL_FATURAMENTO_MENSAL),
                VL_FATURAMENTO_ANUAL: toNullableNumber(VL_FATURAMENTO_ANUAL),
                ID_ANALISE: {
                    dir: oracledb.BIND_OUT,
                    type: oracledb.NUMBER,
                },
            };

            const result = await oracleExecute(sql, binds, {
                autoCommit: true,
            } as any);

            const idAnalise =
                (result.outBinds as any)?.ID_ANALISE?.[0] ||
                (result.outBinds as any)?.ID_ANALISE;

            return res.status(201).json({
                success: true,
                ID_ANALISE: idAnalise,
            });
        } catch (err: any) {
            console.error("criar analise limite erro:", err);
            return res.status(500).json({
                error: "Falha ao salvar análise de limite.",
                details: String(err?.message || err),
            });
        }
    },

    async listarPaginado(req: Request, res: Response) {
        try {
            const cpf = onlyDigits(String(req.query.cpf || ""));
            const nome = String(req.query.nome || "").trim();
            const funcionario = String(req.query.funcionario || "").trim();

            const current_page = Math.max(Number(req.query.page || 1), 1);
            const limit = Math.max(Number(req.query.limit || 10), 1);
            const offset = (current_page - 1) * limit;

            let where = ` WHERE 1 = 1 `;
            const bindsWhere: any = {};

            if (cpf) {
                where += ` AND REGEXP_REPLACE(NR_CPF_CNPJ_ASSOCIADO, '[^0-9]', '') = :cpf `;
                bindsWhere.cpf = cpf;
            }

            if (nome) {
                where += ` AND UPPER(NM_ASSOCIADO) LIKE :nome `;
                bindsWhere.nome = `%${nome.toUpperCase()}%`;
            }

            if (funcionario) {
                where += ` AND UPPER(NM_FUNCIONARIO) LIKE :funcionario `;
                bindsWhere.funcionario = `%${funcionario.toUpperCase()}%`;
            }

            const sqlCount = `
      SELECT COUNT(*) AS TOTAL_ITEMS
      FROM DBACRESSEM.ANALISE_LIMITE_CHEQUE_CARTAO
      ${where}
    `;

            const countResult = await oracleExecute(sqlCount, bindsWhere, {
                outFormat: oracledb.OUT_FORMAT_OBJECT,
            });

            const total_items = Number((countResult.rows?.[0] as any)?.TOTAL_ITEMS || 0);
            const total_pages = Math.max(Math.ceil(total_items / limit), 1);

            const sql = `
      SELECT *
      FROM (
        SELECT
          a.*,
          ROW_NUMBER() OVER (ORDER BY a.ID_ANALISE DESC) AS RN
        FROM DBACRESSEM.ANALISE_LIMITE_CHEQUE_CARTAO a
        ${where}
      )
      WHERE RN > :offset
        AND RN <= (:offset + :limit)
    `;

            const bindsPaged = {
                ...bindsWhere,
                offset,
                limit,
            };

            const result = await oracleExecute(sql, bindsPaged, {
                outFormat: oracledb.OUT_FORMAT_OBJECT,
            });

            return res.json({
                items: result.rows || [],
                total_items,
                total_pages,
                current_page,
            });
        } catch (err: any) {
            console.error("listarPaginado analise limite erro:", err);
            return res.status(500).json({
                error: "Falha ao listar análises de limite.",
                details: String(err?.message || err),
            });
        }
    },

    async buscarPorId(req: Request, res: Response) {
        try {
            const id = Number(req.params.id);

            if (!id) {
                return res.status(400).json({
                    error: "ID_ANALISE inválido.",
                });
            }

            const sql = `
        SELECT *
        FROM DBACRESSEM.ANALISE_LIMITE_CHEQUE_CARTAO
        WHERE ID_ANALISE = :id
      `;

            const result = await oracleExecute(
                sql,
                { id },
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            if (!result.rows?.length) {
                return res.status(404).json({
                    error: "Análise não encontrada.",
                });
            }

            return res.json(result.rows[0]);
        } catch (err: any) {
            console.error("buscarPorId analise limite erro:", err);
            return res.status(500).json({
                error: "Falha ao buscar análise de limite.",
                details: String(err?.message || err),
            });
        }
    },

    async uploadAssinatura(req: Request, res: Response) {
        try {
            const ID_ANALISE = Number(req.body.ID_ANALISE || 0);
            const NR_CPF_CNPJ_ASSOCIADO = String(
                req.body.NR_CPF_CNPJ_ASSOCIADO || ""
            ).trim();

            if (!ID_ANALISE) {
                return res.status(400).json({
                    error: "ID_ANALISE é obrigatório.",
                });
            }

            if (!NR_CPF_CNPJ_ASSOCIADO) {
                return res.status(400).json({
                    error: "NR_CPF_CNPJ_ASSOCIADO é obrigatório.",
                });
            }

            const arquivo = getUploadedFile(req.files, "OFICIO");

            if (!arquivo) {
                return res.status(400).json({
                    error: "Arquivo OFICIO não enviado.",
                });
            }

            const caminhoAssinatura = await salvarArquivoAnaliseNoServidorSMB(
                arquivo,
                NR_CPF_CNPJ_ASSOCIADO
            );

            const sql = `
        UPDATE DBACRESSEM.ANALISE_LIMITE_CHEQUE_CARTAO
        SET NM_ASSINATURA = :NM_ASSINATURA
        WHERE ID_ANALISE = :ID_ANALISE
      `;

            const result = await oracleExecute(
                sql,
                {
                    ID_ANALISE,
                    NM_ASSINATURA: caminhoAssinatura,
                },
                { autoCommit: true }
            );

            if (!result.rowsAffected) {
                return res.status(404).json({
                    error: "Análise não encontrada.",
                });
            }

            return res.json({
                success: true,
                ID_ANALISE,
                NM_ASSINATURA: caminhoAssinatura,
            });
        } catch (err: any) {
            console.error("upload assinatura analise limite erro:", err);
            return res.status(500).json({
                error: "Falha ao salvar assinatura.",
                details: String(err?.message || err),
            });
        }
    },

    async downloadAssinatura(req: Request, res: Response) {
        try {
            const oficio = String(req.body?.oficio || "").trim();

            if (!oficio) {
                return res.status(400).json({
                    error: "Caminho do arquivo não informado.",
                });
            }

            await conectarShareWindows();

            const arquivoBuffer = await fs.readFile(oficio);
            const fileName = path.win32.basename(oficio);

            let contentType = "application/octet-stream";
            const lower = oficio.toLowerCase();

            if (lower.endsWith(".pdf")) contentType = "application/pdf";
            else if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) contentType = "image/jpeg";
            else if (lower.endsWith(".png")) contentType = "image/png";
            else if (lower.endsWith(".doc")) contentType = "application/msword";
            else if (lower.endsWith(".docx")) {
                contentType =
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
            }

            res.setHeader("Content-Type", contentType);
            res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

            return res.end(arquivoBuffer);
        } catch (err: any) {
            console.error("download assinatura analise limite erro:", err);
            return res.status(500).json({
                error: "Falha ao baixar assinatura.",
                details: String(err?.message || err),
            });
        }
    },
};