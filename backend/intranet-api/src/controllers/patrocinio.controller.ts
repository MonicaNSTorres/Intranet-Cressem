import { Request, Response } from "express";
import oracledb from "oracledb";
import path from "path";
import fs from "fs/promises";
import { UploadedFile } from "express-fileupload";
import { getOraclePool } from "../config/oracle.pool";
import { execFile } from "child_process";
import { promisify } from "util";
import { oracleExecute } from "../services/oracle.service";

const execFileAsync = promisify(execFile);

function onlyDigits(value: string) {
    return String(value || "").replace(/\D/g, "");
}

function toNumber(value: any, fallback = 0) {
    if (value === null || value === undefined || value === "") return fallback;
    const n = Number(String(value).replace(",", "."));
    return Number.isFinite(n) ? n : fallback;
}

function toNullableNumber(value: any) {
    if (value === null || value === undefined || value === "") return null;
    const n = Number(String(value).replace(",", "."));
    return Number.isFinite(n) ? n : null;
}

function toNullableString(value: any) {
    const v = String(value ?? "").trim();
    return v ? v : null;
}

function ensurePdf(file?: UploadedFile | null) {
    if (!file) return;

    const isPdf =
        file.mimetype === "application/pdf" ||
        file.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
        throw new Error("Apenas arquivos PDF são permitidos.");
    }
}

function sanitizeFileName(name: string) {
    return String(name || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\w.\- ]+/g, "_")
        .replace(/\s+/g, " ")
        .trim();
}

function sanitizeFolderName(value: string) {
    return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[\\/:*?"<>|]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

function escapeCsv(value: any) {
    const text = String(value ?? "");
    if (text.includes(";") || text.includes('"') || text.includes("\n")) {
        return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
}

function capitalizeWords(value: string) {
    return String(value || "")
        .toLowerCase()
        .replace(/\b\w/g, (l) => l.toUpperCase());
}

function formatarCpfOuCnpj(valor: string) {
    const value = onlyDigits(valor);

    if (value.length <= 11) {
        return value
            .replace(/(\d{3})(\d)/, "$1.$2")
            .replace(/(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
            .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d{2})/, "$1.$2.$3-$4");
    }

    return value
        .replace(/^(\d{2})(\d)/, "$1.$2")
        .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
        .replace(/\.(\d{3})(\d)/, ".$1/$2")
        .replace(/(\d{4})(\d)/, "$1-$2");
}

function getMimeTypeByFileName(filePath: string) {
    const lower = filePath.toLowerCase();

    if (lower.endsWith(".pdf")) return "application/pdf";
    if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
    if (lower.endsWith(".png")) return "image/png";
    if (lower.endsWith(".doc")) return "application/msword";
    if (lower.endsWith(".docx")) {
        return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    }

    return "application/octet-stream";
}

function getSmbConfig() {
    const server = String(process.env.SMB_SERVER || "").trim();
    const share = String(process.env.SMB_SHARE || "").trim();
    const user = String(process.env.SMB_USER || "").trim();
    const password = String(process.env.SMB_PASSWORD || "");
    const domain = String(process.env.SMB_DOMAIN || "").trim();

    if (!server) throw new Error("SMB_SERVER não configurado.");
    if (!share) throw new Error("SMB_SHARE não configurado.");
    if (!user) throw new Error("SMB_USER não configurado.");
    if (!password) throw new Error("SMB_PASSWORD não configurado.");

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
            try {
                await execFileAsync("net", ["use", remote, "/delete", "/y"]);
                await execFileAsync("net", [
                    "use",
                    remote,
                    password,
                    `/user:${fullUser}`,
                    "/persistent:no",
                ]);
                return;
            } catch (reconnectError: any) {
                throw new Error(
                    `Falha ao reconectar no compartilhamento ${remote}. Detalhes: ${String(
                        reconnectError?.stderr ||
                        reconnectError?.stdout ||
                        reconnectError?.message ||
                        reconnectError
                    )}`
                );
            }
        }

        if (
            mensagem.toLowerCase().includes("comando concluído com êxito") ||
            mensagem.includes("85")
        ) {
            return;
        }

        throw new Error(
            `Falha ao conectar no compartilhamento ${remote}. Detalhes: ${mensagem || error?.message || error
            }`
        );
    }
}

async function salvarArquivoPatrocinioNoServidorSMB(
    arquivo: UploadedFile,
    solicitante: string
) {
    const shareRoot = getShareRoot();
    const solicitanteSafe = sanitizeFolderName(solicitante);
    const fileName = sanitizeFileName(arquivo.name || "arquivo.pdf");
    const fileData = arquivo.data;

    await conectarShareWindows();

    const diretorioDestino = path.win32.join(
        shareRoot,
        "CRM",
        "PATROCINIO",
        solicitanteSafe
    );

    const caminhoCompleto = path.win32.join(diretorioDestino, fileName);

    try {
        await fs.mkdir(diretorioDestino, { recursive: true });
        await fs.writeFile(caminhoCompleto, fileData);
        return caminhoCompleto;
    } catch (error: any) {
        throw new Error(
            `Falha ao gravar arquivo no caminho ${caminhoCompleto}. Detalhes: ${String(
                error?.message || error
            )}`
        );
    }
}

async function getNextNumericId(
    conn: oracledb.Connection,
    table: string,
    idColumn: string
) {
    const result = await conn.execute(
        `SELECT NVL(MAX(${idColumn}), 0) + 1 AS NEXT_ID FROM ${table}`,
        [],
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const row: any = result.rows?.[0];
    return Number(row?.NEXT_ID || 1);
}

function parseDias(value: any) {
    if (!value) return [];
    if (Array.isArray(value)) return value;

    try {
        return JSON.parse(String(value));
    } catch {
        return [];
    }
}

function parseAuditorio(value: any) {
    if (!value) return null;
    if (typeof value === "object") return value;

    try {
        return JSON.parse(String(value));
    } catch {
        return null;
    }
}

function getSingleUploadedFile(
    file:
        | UploadedFile
        | UploadedFile[]
        | { [fieldname: string]: UploadedFile[] }
        | undefined
): UploadedFile | undefined {
    if (!file) return undefined;

    if (Array.isArray(file)) {
        return file[0];
    }

    if ("name" in file && "mv" in file) {
        return file as UploadedFile;
    }

    const dict = file as { [fieldname: string]: UploadedFile[] };
    const firstKey = Object.keys(dict)[0];
    return firstKey ? dict[firstKey]?.[0] : undefined;
}

async function buscarTipoFuncionarioPorNome(nome: string) {
    const result = await oracleExecute(
        `
      SELECT
        f.NM_FUNCIONARIO,
        c.NM_NIVEL
      FROM DBACRESSEM.FUNCIONARIOS_SICOOB_CRESSEM f
      LEFT JOIN DBACRESSEM.CARGO_GERENTES_SICOOB_CRESSEM c
        ON c.ID_CARGO = f.ID_CARGO
      WHERE UPPER(f.NM_FUNCIONARIO) = UPPER(:nome)
        AND ROWNUM = 1
    `,
        { nome },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const row: any = result.rows?.[0];

    if (!row) {
        return {
            NM_FUNCIONARIO: nome,
            TIPO: "funcionario",
        };
    }

    const nomeUpper = String(row.NM_FUNCIONARIO || "").toUpperCase();
    const nivelUpper = String(row.NM_NIVEL || "").toUpperCase();

    let tipo = "funcionario";

    if (nomeUpper === "JANAINA GABRIELA") {
        tipo = "conselho";
    } else if (nivelUpper === "DIRETORIA") {
        tipo = "diretoria";
    } else if (nivelUpper === "GERENCIA") {
        tipo = "gerencia";
    }

    return {
        NM_FUNCIONARIO: row.NM_FUNCIONARIO,
        TIPO: tipo,
    };
}

async function buscarDiasPatrocinio(id: number) {
    const result = await oracleExecute(
        `
      SELECT
        TO_CHAR(DT_DIA, 'YYYY-MM-DD') AS DT_DIA,
        HR_INICIO,
        HR_FIM
      FROM DBACRESSEM.DATA_HORA_PATROCINIO
      WHERE ID_PATROCINIO = :id
      ORDER BY DT_DIA, HR_INICIO
    `,
        { id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    return result.rows || [];
}

export const patrocinioController = {
    async cadastrar(req: Request, res: Response) {
        let conn: oracledb.Connection | undefined;

        try {
            const pool = getOraclePool();
            conn = await pool.getConnection();

            const body = req.body || {};

            const files = (req.files || {}) as Record<string, any>;
            const oficioFile = getSingleUploadedFile(files.DIR_OFICIO);
            const semFinsFile = getSingleUploadedFile(
                files.DIR_DOC_SEM_FINS_LUCRATIVO
            );

            ensurePdf(oficioFile);
            ensurePdf(semFinsFile);

            const dias = parseDias(body.DIAS);
            const auditorio = parseAuditorio(body.AUDITORIO);

            if (!toNullableString(body.NM_SOLICITANTE)) {
                return res.status(400).json({ error: "NM_SOLICITANTE é obrigatório." });
            }

            if (!toNullableString(body.NR_CPF_CNPJ)) {
                return res.status(400).json({ error: "NR_CPF_CNPJ é obrigatório." });
            }

            if (!toNullableString(body.NM_FUNCIONARIO)) {
                return res.status(400).json({ error: "NM_FUNCIONARIO é obrigatório." });
            }

            if (!toNullableString(body.NM_CIDADE)) {
                return res.status(400).json({ error: "NM_CIDADE é obrigatório." });
            }

            if (!toNullableString(body.DT_SOLICITACAO)) {
                return res.status(400).json({ error: "DT_SOLICITACAO é obrigatório." });
            }

            if (!toNullableString(body.DESC_SOLICITACAO)) {
                return res.status(400).json({
                    error: "DESC_SOLICITACAO é obrigatório.",
                });
            }

            if (!toNullableString(body.DESC_RESUMO_EVENTO)) {
                return res.status(400).json({
                    error: "DESC_RESUMO_EVENTO é obrigatório.",
                });
            }

            if (!dias.length) {
                return res.status(400).json({ error: "DIAS é obrigatório." });
            }

            if (!oficioFile) {
                return res.status(400).json({ error: "DIR_OFICIO é obrigatório." });
            }

            const nomePastaSolicitante =
                toNullableString(body.NM_SOLICITANTE) || "SEM_NOME";

            const oficioPath = await salvarArquivoPatrocinioNoServidorSMB(
                oficioFile,
                nomePastaSolicitante
            );

            let semFinsPath: string | null = null;
            if (semFinsFile) {
                semFinsPath = await salvarArquivoPatrocinioNoServidorSMB(
                    semFinsFile,
                    nomePastaSolicitante
                );
            }

            const idPatrocinio = await getNextNumericId(
                conn,
                "DBACRESSEM.PATROCINIO",
                "ID_PATROCINIO"
            );

            await conn.execute(
                `
          INSERT INTO DBACRESSEM.PATROCINIO (
            ID_PATROCINIO,
            NM_SOLICITANTE,
            NR_CPF_CNPJ,
            VL_PATROCINIO,
            NM_FUNCIONARIO,
            DIR_OFICIO,
            NM_CIDADE,
            DT_SOLICITACAO,
            NM_ANDAMENTO,
            CD_CONTA_COOPERATIVA,
            VL_SALDO_MEDCIOCC,
            DESC_SERVICOS,
            DESC_VINCULO,
            DESC_RETORNO_ULTIMO_EVENTO,
            VL_RENTABILIDADE_MAQUININHA,
            CD_MOTORISTA,
            CD_FUNCIONARIOS,
            DESC_RESUMO_EVENTO,
            DESC_SOLICITACAO,
            VL_MONETARIO,
            QTD_INSUMO,
            VL_ESTIMATIVA,
            SN_SEM_FINS_LUCATRIVOS,
            DIR_DOC_SEM_FINS_LUCRATIVO,
            CD_AUDITORIO_CENTRO,
            CD_AUDITORIO_SEDE
          ) VALUES (
            :ID_PATROCINIO,
            :NM_SOLICITANTE,
            :NR_CPF_CNPJ,
            :VL_PATROCINIO,
            :NM_FUNCIONARIO,
            :DIR_OFICIO,
            :NM_CIDADE,
            TO_DATE(:DT_SOLICITACAO, 'YYYY-MM-DD'),
            :NM_ANDAMENTO,
            :CD_CONTA_COOPERATIVA,
            :VL_SALDO_MEDCIOCC,
            :DESC_SERVICOS,
            :DESC_VINCULO,
            :DESC_RETORNO_ULTIMO_EVENTO,
            :VL_RENTABILIDADE_MAQUININHA,
            :CD_MOTORISTA,
            :CD_FUNCIONARIOS,
            :DESC_RESUMO_EVENTO,
            :DESC_SOLICITACAO,
            :VL_MONETARIO,
            :QTD_INSUMO,
            :VL_ESTIMATIVA,
            :SN_SEM_FINS_LUCATRIVOS,
            :DIR_DOC_SEM_FINS_LUCRATIVO,
            :CD_AUDITORIO_CENTRO,
            :CD_AUDITORIO_SEDE
          )
        `,
                {
                    ID_PATROCINIO: idPatrocinio,
                    NM_SOLICITANTE: toNullableString(body.NM_SOLICITANTE),
                    NR_CPF_CNPJ: onlyDigits(body.NR_CPF_CNPJ),
                    VL_PATROCINIO: toNullableNumber(body.VL_PATROCINIO),
                    NM_FUNCIONARIO: toNullableString(body.NM_FUNCIONARIO),
                    DIR_OFICIO: oficioPath,
                    NM_CIDADE: toNullableString(body.NM_CIDADE),
                    DT_SOLICITACAO: String(body.DT_SOLICITACAO),
                    NM_ANDAMENTO:
                        toNullableString(body.NM_ANDAMENTO) || "Pendente Gerência",
                    CD_CONTA_COOPERATIVA: toNullableNumber(body.CD_CONTA_COOPERATIVA),
                    VL_SALDO_MEDCIOCC: toNullableNumber(body.VL_SALDO_MEDCIOCC),
                    DESC_SERVICOS: toNullableString(body.DESC_SERVICOS),
                    DESC_VINCULO: toNullableString(body.DESC_VINCULO),
                    DESC_RETORNO_ULTIMO_EVENTO: toNullableString(
                        body.DESC_RETORNO_ULTIMO_EVENTO
                    ),
                    VL_RENTABILIDADE_MAQUININHA: toNullableNumber(
                        body.VL_RENTABILIDADE_MAQUININHA
                    ),
                    CD_MOTORISTA: toNullableNumber(body.CD_MOTORISTA),
                    CD_FUNCIONARIOS: toNullableNumber(body.CD_FUNCIONARIOS),
                    DESC_RESUMO_EVENTO: toNullableString(body.DESC_RESUMO_EVENTO),
                    DESC_SOLICITACAO: toNullableString(body.DESC_SOLICITACAO),
                    VL_MONETARIO: toNullableNumber(body.VL_MONETARIO),
                    QTD_INSUMO: toNullableNumber(body.QTD_INSUMO),
                    VL_ESTIMATIVA: toNullableNumber(body.VL_ESTIMATIVA),
                    SN_SEM_FINS_LUCATRIVOS: toNullableNumber(
                        body.SN_SEM_FINS_LUCATRIVOS
                    ),
                    DIR_DOC_SEM_FINS_LUCRATIVO: semFinsPath,
                    CD_AUDITORIO_CENTRO: toNullableNumber(body.CD_AUDITORIO_CENTRO),
                    CD_AUDITORIO_SEDE: toNullableNumber(body.CD_AUDITORIO_SEDE),
                },
                { autoCommit: false }
            );

            for (const dia of dias) {
                const idDataHora = await getNextNumericId(
                    conn,
                    "DBACRESSEM.DATA_HORA_PATROCINIO",
                    "ID_DATA_HORA_PATROCINIO"
                );

                await conn.execute(
                    `
            INSERT INTO DBACRESSEM.DATA_HORA_PATROCINIO (
              ID_DATA_HORA_PATROCINIO,
              DT_DIA,
              HR_INICIO,
              HR_FIM,
              ID_PATROCINIO
            ) VALUES (
              :ID_DATA_HORA_PATROCINIO,
              TO_DATE(:DT_DIA, 'YYYY-MM-DD'),
              :HR_INICIO,
              :HR_FIM,
              :ID_PATROCINIO
            )
          `,
                    {
                        ID_DATA_HORA_PATROCINIO: idDataHora,
                        DT_DIA: String(dia.DT_DIA),
                        HR_INICIO: String(dia.HR_INICIO),
                        HR_FIM: String(dia.HR_FIM),
                        ID_PATROCINIO: idPatrocinio,
                    },
                    { autoCommit: false }
                );
            }

            if (toNumber(body.CD_AUDITORIO_SEDE) === 1 && auditorio) {
                const idAuditorio = await getNextNumericId(
                    conn,
                    "DBACRESSEM.AUDITORIO_SICOOB_SEDE",
                    "ID_AUDITORIO_SICOOB_SEDE"
                );

                await conn.execute(
                    `
            INSERT INTO DBACRESSEM.AUDITORIO_SICOOB_SEDE (
              ID_AUDITORIO_SICOOB_SEDE,
              QTD_ESTIMATIVA_CONVIDADOS,
              SN_USO_MICROFONE,
              QNTD_MICROFONE,
              SN_USO_PROJETOR,
              NM_APRESENTACAO,
              SN_AUDIO_EXTERNO,
              SN_OPERADOR,
              SN_AO_VIVO,
              NM_PLATAFORMA,
              SN_INTERNET,
              DESC_JUSTIFICATIVA,
              OBS_AUDITORIO_SICOOB_SEDE,
              ID_PATROCINIO
            ) VALUES (
              :ID_AUDITORIO_SICOOB_SEDE,
              :QTD_ESTIMATIVA_CONVIDADOS,
              :SN_USO_MICROFONE,
              :QNTD_MICROFONE,
              :SN_USO_PROJETOR,
              :NM_APRESENTACAO,
              :SN_AUDIO_EXTERNO,
              :SN_OPERADOR,
              :SN_AO_VIVO,
              :NM_PLATAFORMA,
              :SN_INTERNET,
              :DESC_JUSTIFICATIVA,
              :OBS_AUDITORIO_SICOOB_SEDE,
              :ID_PATROCINIO
            )
          `,
                    {
                        ID_AUDITORIO_SICOOB_SEDE: idAuditorio,
                        QTD_ESTIMATIVA_CONVIDADOS: toNumber(
                            auditorio.QTD_ESTIMATIVA_CONVIDADOS
                        ),
                        SN_USO_MICROFONE: toNumber(auditorio.SN_USO_MICROFONE),
                        QNTD_MICROFONE: toNumber(auditorio.QNTD_MICROFONE),
                        SN_USO_PROJETOR: toNumber(auditorio.SN_USO_PROJETOR),
                        NM_APRESENTACAO: toNullableString(auditorio.NM_APRESENTACAO),
                        SN_AUDIO_EXTERNO: toNumber(auditorio.SN_AUDIO_EXTERNO),
                        SN_OPERADOR: toNumber(auditorio.SN_OPERADOR),
                        SN_AO_VIVO: toNumber(auditorio.SN_AO_VIVO),
                        NM_PLATAFORMA: toNullableString(auditorio.NM_PLATAFORMA),
                        SN_INTERNET: toNumber(auditorio.SN_INTERNET),
                        DESC_JUSTIFICATIVA: toNullableString(
                            auditorio.DESC_JUSTIFICATIVA
                        ),
                        OBS_AUDITORIO_SICOOB_SEDE: toNullableString(
                            auditorio.OBS_AUDITORIO_SICOOB_SEDE
                        ),
                        ID_PATROCINIO: idPatrocinio,
                    },
                    { autoCommit: false }
                );
            }

            await conn.commit();

            return res.status(201).json({
                message: "Solicitação cadastrada com sucesso.",
                ID_PATROCINIO: idPatrocinio,
                DIR_OFICIO: oficioPath,
                DIR_DOC_SEM_FINS_LUCRATIVO: semFinsPath,
            });
        } catch (err: any) {
            if (conn) {
                try {
                    await conn.rollback();
                } catch {
                    //
                }
            }

            console.error("patrocinioController.cadastrar erro:", err);
            return res.status(500).json({
                error: "Falha ao cadastrar solicitação de participação.",
                details: String(err?.message || err),
            });
        } finally {
            if (conn) {
                try {
                    await conn.close();
                } catch {
                    //
                }
            }
        }
    },

    async listarPaginado(req: Request, res: Response) {
        try {
            const nome = String(req.query.nome || "").trim();
            const pesquisa = String(req.query.pesquisa || "").trim().toUpperCase();
            const page = Math.max(Number(req.query.page || 1), 1);
            const limit = Math.max(Number(req.query.limit || 10), 1);
            const offset = (page - 1) * limit;

            const funcionario = await buscarTipoFuncionarioPorNome(nome);

            let wherePerfil = "1 = 1";
            const bindsBase: Record<string, any> = {
                pesquisa: `%${pesquisa || ""}%`,
                nome,
            };

            if (funcionario.TIPO === "funcionario") {
                wherePerfil = "UPPER(p.NM_FUNCIONARIO) = UPPER(:nome)";
            } else if (funcionario.TIPO === "gerencia") {
                wherePerfil = `
          (
            UPPER(p.NM_GERENCIA) = UPPER(:nome)
            OR UPPER(p.NM_FUNCIONARIO) = UPPER(:nome)
            OR p.NM_ANDAMENTO = 'Pendente Gerência'
          )
        `;
            } else if (funcionario.TIPO === "diretoria") {
                wherePerfil = `
          (
            UPPER(p.NM_DIRETORIA) = UPPER(:nome)
            OR p.NM_ANDAMENTO = 'Pendente Diretoria'
          )
        `;
            } else if (funcionario.TIPO === "conselho") {
                wherePerfil = `
          (
            p.NM_ANDAMENTO = 'Pendente Conselho'
            OR p.NM_ANDAMENTO = 'Aprovado'
            OR p.NM_ANDAMENTO = 'Reprovado'
          )
        `;
            }

            const wherePesquisa = `
        (
          :pesquisa = '%%'
          OR UPPER(p.NM_SOLICITANTE) LIKE :pesquisa
          OR REGEXP_REPLACE(p.NR_CPF_CNPJ, '[^0-9]', '') LIKE REGEXP_REPLACE(:pesquisa, '[^0-9]', '')
          OR UPPER(p.NM_ANDAMENTO) LIKE :pesquisa
        )
      `;

            const sqlCount = `
        SELECT COUNT(*) AS TOTAL
        FROM DBACRESSEM.PATROCINIO p
        WHERE ${wherePerfil}
          AND ${wherePesquisa}
      `;

            const countResult = await oracleExecute(sqlCount, bindsBase, {
                outFormat: oracledb.OUT_FORMAT_OBJECT,
            });

            const total = Number((countResult.rows?.[0] as any)?.TOTAL || 0);
            const total_pages = total > 0 ? Math.ceil(total / limit) : 1;

            const sql = `
        SELECT *
        FROM (
          SELECT
            p.ID_PATROCINIO,
            p.NM_SOLICITANTE,
            p.NR_CPF_CNPJ,
            p.NM_CIDADE,
            p.NM_FUNCIONARIO,
            TO_CHAR(p.DT_SOLICITACAO, 'YYYY-MM-DD') AS DT_SOLICITACAO,
            p.NM_ANDAMENTO,
            p.CD_CONTA_COOPERATIVA,
            p.VL_SALDO_MEDCIOCC,
            p.DESC_SERVICOS,
            p.DESC_VINCULO,
            p.DESC_RETORNO_ULTIMO_EVENTO,
            p.VL_RENTABILIDADE_MAQUININHA,
            p.DESC_SOLICITACAO,
            p.DESC_RESUMO_EVENTO,
            p.CD_MOTORISTA,
            p.CD_FUNCIONARIOS,
            p.VL_MONETARIO,
            p.VL_PATROCINIO,
            p.VL_ESTIMATIVA,
            p.QTD_INSUMO,
            p.CD_AUDITORIO_CENTRO,
            p.CD_AUDITORIO_SEDE,
            p.DIR_OFICIO,
            p.DIR_DOC_SEM_FINS_LUCRATIVO,
            p.NM_GERENCIA,
            p.DESC_PARECER_GERENCIA,
            p.NM_DIRETORIA,
            p.DESC_PARECER_ESCRITO_DIRETORIA,
            p.NM_PARECER_CONSELHO,
            p.DESC_PARECER_ESCRITO_CONSELHO,
            p.NM_GERENTE_EVENTO,
            p.NM_SUGESTAO_PARTICIPANTES,
            ROW_NUMBER() OVER (ORDER BY p.ID_PATROCINIO DESC) AS RN
          FROM DBACRESSEM.PATROCINIO p
          WHERE ${wherePerfil}
            AND ${wherePesquisa}
        )
        WHERE RN > :offset
          AND RN <= (:offset + :limit)
        ORDER BY RN
      `;

            const result = await oracleExecute(
                sql,
                {
                    ...bindsBase,
                    offset,
                    limit,
                },
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            return res.json({
                items: result.rows || [],
                total,
                total_pages,
                page,
                limit,
            });
        } catch (err: any) {
            console.error("patrocinioController.listarPaginado erro:", err);
            return res.status(500).json({
                error: "Falha ao listar solicitações de participação.",
                details: String(err?.message || err),
            });
        }
    },

    async buscarPorId(req: Request, res: Response) {
        try {
            const id = Number(req.params.id || 0);

            if (!id) {
                return res.status(400).json({ error: "ID inválido." });
            }

            const result = await oracleExecute(
                `
          SELECT
            p.ID_PATROCINIO,
            p.NM_SOLICITANTE,
            p.NR_CPF_CNPJ,
            p.VL_PATROCINIO,
            p.NM_FUNCIONARIO,
            p.DIR_OFICIO,
            p.NM_CIDADE,
            TO_CHAR(p.DT_SOLICITACAO, 'YYYY-MM-DD') AS DT_SOLICITACAO,
            TO_CHAR(p.DT_FINALIZACAO, 'YYYY-MM-DD') AS DT_FINALIZACAO,
            p.NM_ANDAMENTO,
            p.CD_CONTA_COOPERATIVA,
            p.VL_SALDO_MEDCIOCC,
            p.DESC_SERVICOS,
            p.DESC_VINCULO,
            p.DESC_RETORNO_ULTIMO_EVENTO,
            p.VL_RENTABILIDADE_MAQUININHA,
            p.CD_MOTORISTA,
            p.CD_FUNCIONARIOS,
            p.DESC_RESUMO_EVENTO,
            p.DESC_SOLICITACAO,
            p.VL_MONETARIO,
            p.NM_GERENTE_EVENTO,
            p.NM_SUGESTAO_PARTICIPANTES,
            p.VL_ESTIMATIVA,
            p.SN_SEM_FINS_LUCATRIVOS,
            p.DIR_DOC_SEM_FINS_LUCRATIVO,
            p.QTD_INSUMO,
            p.CD_AUDITORIO_CENTRO,
            p.CD_AUDITORIO_SEDE,
            p.DESC_PARECER_GERENCIA,
            p.NM_GERENCIA,
            p.DESC_PARECER_DIRETORIA,
            p.DESC_PARECER_ESCRITO_DIRETORIA,
            p.NM_DIRETORIA,
            p.NM_PARECER_CONSELHO,
            p.DESC_PARECER_ESCRITO_CONSELHO
          FROM DBACRESSEM.PATROCINIO p
          WHERE p.ID_PATROCINIO = :id
        `,
                { id },
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            const row: any = result.rows?.[0];

            if (!row) {
                return res.status(404).json({ error: "Solicitação não encontrada." });
            }

            row.DIAS = await buscarDiasPatrocinio(id);

            return res.json(row);
        } catch (err: any) {
            console.error("patrocinioController.buscarPorId erro:", err);
            return res.status(500).json({
                error: "Falha ao buscar solicitação.",
                details: String(err?.message || err),
            });
        }
    },

    async editar(req: Request, res: Response) {
        try {
            const id = Number(req.params.id || 0);

            if (!id) {
                return res.status(400).json({ error: "ID inválido." });
            }

            const body = req.body || {};

            const sql = `
        UPDATE DBACRESSEM.PATROCINIO
        SET
          NM_ANDAMENTO = COALESCE(:NM_ANDAMENTO, NM_ANDAMENTO),
          DESC_PARECER_GERENCIA = COALESCE(:DESC_PARECER_GERENCIA, DESC_PARECER_GERENCIA),
          NM_GERENCIA = COALESCE(:NM_GERENCIA, NM_GERENCIA),
          DESC_PARECER_ESCRITO_DIRETORIA = COALESCE(:DESC_PARECER_ESCRITO_DIRETORIA, DESC_PARECER_ESCRITO_DIRETORIA),
          NM_DIRETORIA = COALESCE(:NM_DIRETORIA, NM_DIRETORIA),
          NM_PARECER_CONSELHO = COALESCE(:NM_PARECER_CONSELHO, NM_PARECER_CONSELHO),
          DESC_PARECER_ESCRITO_CONSELHO = COALESCE(:DESC_PARECER_ESCRITO_CONSELHO, DESC_PARECER_ESCRITO_CONSELHO),
          NM_GERENTE_EVENTO = COALESCE(:NM_GERENTE_EVENTO, NM_GERENTE_EVENTO),
          NM_SUGESTAO_PARTICIPANTES = COALESCE(:NM_SUGESTAO_PARTICIPANTES, NM_SUGESTAO_PARTICIPANTES),
          DT_FINALIZACAO = CASE
            WHEN :DT_FINALIZACAO IS NOT NULL THEN TO_DATE(:DT_FINALIZACAO, 'YYYY-MM-DD')
            ELSE DT_FINALIZACAO
          END
        WHERE ID_PATROCINIO = :ID_PATROCINIO
      `;

            const result = await oracleExecute(
                sql,
                {
                    ID_PATROCINIO: id,
                    NM_ANDAMENTO: toNullableString(body.NM_ANDAMENTO),
                    DESC_PARECER_GERENCIA: toNullableString(body.DESC_PARECER_GERENCIA),
                    NM_GERENCIA: toNullableString(body.NM_GERENCIA),
                    DESC_PARECER_ESCRITO_DIRETORIA: toNullableString(
                        body.DESC_PARECER_ESCRITO_DIRETORIA
                    ),
                    NM_DIRETORIA: toNullableString(body.NM_DIRETORIA),
                    NM_PARECER_CONSELHO: toNullableString(body.NM_PARECER_CONSELHO),
                    DESC_PARECER_ESCRITO_CONSELHO: toNullableString(
                        body.DESC_PARECER_ESCRITO_CONSELHO
                    ),
                    NM_GERENTE_EVENTO: toNullableString(body.NM_GERENTE_EVENTO),
                    NM_SUGESTAO_PARTICIPANTES: toNullableString(
                        body.NM_SUGESTAO_PARTICIPANTES
                    ),
                    DT_FINALIZACAO: toNullableString(body.DT_FINALIZACAO),
                },
                { autoCommit: true }
            );

            if (!result.rowsAffected) {
                return res.status(404).json({ error: "Solicitação não encontrada." });
            }

            return res.json({
                message: "Solicitação atualizada com sucesso.",
                ID_PATROCINIO: id,
            });
        } catch (err: any) {
            console.error("patrocinioController.editar erro:", err);
            return res.status(500).json({
                error: "Falha ao atualizar solicitação.",
                details: String(err?.message || err),
            });
        }
    },

    async downloadArquivo(req: Request, res: Response) {
        try {
            const caminho = String(req.body?.oficio || "").trim();

            if (!caminho) {
                return res.status(400).json({
                    error: "Caminho do arquivo não informado.",
                });
            }

            await conectarShareWindows();

            const arquivoBuffer = await fs.readFile(caminho);
            const fileName = path.win32.basename(caminho);
            const contentType = getMimeTypeByFileName(caminho);

            res.setHeader("Content-Type", contentType);
            res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

            return res.end(arquivoBuffer);
        } catch (err: any) {
            console.error("patrocinioController.downloadArquivo erro:", err);
            return res.status(500).json({
                error: "Falha ao baixar o arquivo.",
                details: String(err?.message || err),
            });
        }
    },

    async downloadCsv(req: Request, res: Response) {
        try {
            const result = await oracleExecute(
                `
          SELECT
            NM_SOLICITANTE,
            NR_CPF_CNPJ,
            NM_CIDADE,
            NM_FUNCIONARIO,
            TO_CHAR(DT_SOLICITACAO, 'DD/MM/YYYY') AS DT_SOLICITACAO,
            NM_ANDAMENTO
          FROM DBACRESSEM.PATROCINIO
          ORDER BY ID_PATROCINIO DESC
        `,
                {},
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            const rows = result.rows || [];

            const header = [
                "Nome Fantasia",
                "CPF/CNPJ",
                "Cidade",
                "Funcionário",
                "Dia",
                "Status",
            ];

            const lines = [header.join(";")];

            rows.forEach((row: any) => {
                lines.push(
                    [
                        escapeCsv(capitalizeWords(row.NM_SOLICITANTE || "")),
                        escapeCsv(formatarCpfOuCnpj(row.NR_CPF_CNPJ || "")),
                        escapeCsv(capitalizeWords(row.NM_CIDADE || "")),
                        escapeCsv(capitalizeWords(row.NM_FUNCIONARIO || "")),
                        escapeCsv(row.DT_SOLICITACAO || ""),
                        escapeCsv(capitalizeWords(row.NM_ANDAMENTO || "")),
                    ].join(";")
                );
            });

            const csv = "\uFEFF" + lines.join("\n");

            res.setHeader("Content-Type", "text/csv; charset=utf-8");
            res.setHeader(
                "Content-Disposition",
                'attachment; filename="patrocinios.csv"'
            );

            return res.status(200).send(csv);
        } catch (err: any) {
            console.error("patrocinioController.downloadCsv erro:", err);
            return res.status(500).json({
                error: "Falha ao gerar relatório CSV.",
                details: String(err?.message || err),
            });
        }
    },
};