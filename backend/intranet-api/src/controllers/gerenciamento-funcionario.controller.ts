import { Request, Response } from "express";
import oracledb from "oracledb";
import {
    oracleExecute,
    oracleExecuteCommitWithAudit,
} from "../services/oracle.service";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { execFile } from "child_process";
import { promisify } from "util";
import { sendEmail, type EmailAttachment } from "../services/email.service";

const execFileAsync = promisify(execFile);
const SMB_BASE_FOLDER_FUNCIONARIOS = "CRM/FUNCIONARIOS";

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

function sanitizeFolderName(value: string) {
    return String(value || "")
        .trim()
        .replace(/[\\/:*?"<>|]/g, "")
        .replace(/\s+/g, " ");
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

    console.log("SMB CONFIG:", {
        server,
        share,
        domain,
        user,
        passwordLength: password.length,
    });

    return { server, share, user, password, domain };
}

function getShareRoot() {
    const { server, share } = getSmbConfig();
    return `\\\\${server}\\${share}`;
}

function isWindowsRuntime() {
    return process.platform === "win32";
}

function isUncPath(filePath: string | null | undefined) {
    const caminho = String(filePath || "");
    return caminho.startsWith("\\\\") || caminho.startsWith("//");
}

function getShareRootLinux() {
    const { server, share } = getSmbConfig();
    return `//${server}/${share}`;
}

function getSmbRelativePath(caminhoOriginal: string) {
    const { server, share } = getSmbConfig();
    const caminho = String(caminhoOriginal || "")
        .trim()
        .replace(/\\/g, "/")
        .replace(/^\/+/, "");
    const prefix = `${server}/${share}/`;

    if (caminho.toLowerCase().startsWith(prefix.toLowerCase())) {
        return caminho.slice(prefix.length);
    }

    const marcador = `${SMB_BASE_FOLDER_FUNCIONARIOS}/`;
    const posicaoMarcador = caminho.toUpperCase().indexOf(marcador);

    if (posicaoMarcador >= 0) {
        return caminho.slice(posicaoMarcador);
    }

    return caminho;
}

async function execSmbClient(command: string) {
    const { server, share, user, password, domain } = getSmbConfig();
    const args = [`//${server}/${share}`];

    if (domain) args.push("-W", domain);
    args.push("-U", `${user}%${password}`, "-c", command);

    try {
        return await execFileAsync("smbclient", args);
    } catch (error: any) {
        throw new Error(
            `Falha ao executar smbclient. Comando: ${command}. Detalhes: ${String(
                error?.stderr || error?.stdout || error?.message || error
            )}`
        );
    }
}

async function lerArquivoUploadBuffer(arquivo: any) {
    const nomeArquivo = String(arquivo?.name || arquivo?.filename || "arquivo");

    if (arquivo?.data) {
        const data = Buffer.isBuffer(arquivo.data)
            ? arquivo.data
            : Buffer.from(arquivo.data);

        if (data.length) {
            return data;
        }
    }

    if (arquivo?.tempFilePath) {
        const data = await fs.readFile(arquivo.tempFilePath);

        if (data.length) {
            return data;
        }
    }

    throw new Error(`Arquivo ${nomeArquivo} chegou sem conteúdo para anexar.`);
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

        console.log("Share conectado com sucesso:", remote);
    } catch (error: any) {
        const stderr = String(error?.stderr || "");
        const stdout = String(error?.stdout || "");
        const mensagem = `${stdout}\n${stderr}`.trim();

        if (mensagem.includes("1219")) {
            console.warn("Já existia conexão SMB com outras credenciais. Reconectando...");

            try {
                await execFileAsync("net", ["use", remote, "/delete", "/y"]);
                await execFileAsync("net", [
                    "use",
                    remote,
                    password,
                    `/user:${fullUser}`,
                    "/persistent:no",
                ]);

                console.log("Reconexão SMB concluída com sucesso:", remote);
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
            console.log("Share já estava conectado:", remote);
            return;
        }

        throw new Error(
            `Falha ao conectar no compartilhamento ${remote}. Detalhes: ${mensagem || error?.message || error}`
        );
    }
}

async function salvarArquivoNoServidorSMB(
    arquivo: any,
    funcionario: string
) {
    const shareRoot = getShareRoot();
    const funcionarioSafe = sanitizeFolderName(funcionario);
    const fileName = sanitizeFolderName(arquivo.name || arquivo.filename || "arquivo.pdf");
    const fileData = await lerArquivoUploadBuffer(arquivo);

    if (!isWindowsRuntime()) {
        const diretorioDestino = `${SMB_BASE_FOLDER_FUNCIONARIOS}/${funcionarioSafe}`;
        const pastasParaGarantir = ["CRM", SMB_BASE_FOLDER_FUNCIONARIOS, diretorioDestino];
        const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "funcionario-smb-"));
        const tempFilePath = path.join(tempDir, fileName);

        try {
            for (const pasta of pastasParaGarantir) {
                try {
                    await execSmbClient(`mkdir "${pasta}"`);
                } catch {
                    // Se a pasta ja existe, o smbclient retorna erro. Pode seguir.
                }
            }

            await fs.writeFile(tempFilePath, fileData);
            await execSmbClient(`cd "${diretorioDestino}"; put "${tempFilePath}" "${fileName}"`);

            return `${getShareRootLinux()}/${diretorioDestino}/${fileName}`;
        } finally {
            await fs.rm(tempDir, { recursive: true, force: true });
        }
    }

    await conectarShareWindows();

    const diretorioDestino = path.win32.join(
        shareRoot,
        "CRM",
        "FUNCIONARIOS",
        funcionarioSafe
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

async function readFileFromSmbLinux(caminhoOriginal: string) {
    const caminhoRelativo = getSmbRelativePath(caminhoOriginal);
    const fileName = path.posix.basename(caminhoRelativo);
    const pastaRemota = path.posix.dirname(caminhoRelativo);
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "funcionario-smb-download-"));
    const tempFilePath = path.join(tempDir, fileName);

    try {
        const comando =
            pastaRemota && pastaRemota !== "."
                ? `cd "${pastaRemota}"; get "${fileName}" "${tempFilePath}"`
                : `get "${fileName}" "${tempFilePath}"`;

        await execSmbClient(comando);

        return {
            bytes: await fs.readFile(tempFilePath),
            fileName,
        };
    } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
    }
}

function getUploadedFile(files: any, fieldName: string) {
    if (!files || !files[fieldName]) return null;

    const file = files[fieldName];

    if (Array.isArray(file)) {
        return file[0];
    }

    return file;
}

function escapeHtml(value: any) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatarDataBrasil(value: any) {
    if (!value) return "-";
    const text = String(value).trim();
    const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) return `${match[3]}/${match[2]}/${match[1]}`;

    const date = new Date(text);
    if (Number.isNaN(date.getTime())) return text;

    return date.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

function bomDiaBoaTarde() {
    const hora = new Date().getHours();
    if (hora < 12) return "Bom dia!";
    if (hora < 18) return "Boa tarde!";
    return "Boa noite!";
}

function verificarCargo(nivel: any, sexo: any) {
    const nivelNormalizado = String(nivel || "").trim().toUpperCase();
    const sexoNormalizado = String(sexo || "").trim().toUpperCase();
    const artigo = sexoNormalizado === "F" ? "da" : "do";

    if (nivelNormalizado) {
        return `${artigo} ${nivelNormalizado.toLowerCase()}`;
    }

    return sexoNormalizado === "F" ? "da nova funcionária" : "do novo funcionário";
}

function isTruthyBody(value: any) {
    const normalized = String(value ?? "").trim().toLowerCase();
    return ["1", "true", "sim", "s", "yes"].includes(normalized);
}

function emailTemplateRh(title: string, content: string) {
    return `
      <div style="margin:0;padding:24px;background:#f4f7fb;font-family:Arial,sans-serif;color:#10233f;">
        <div style="max-width:760px;margin:0 auto;background:#ffffff;border:1px solid #dbe5ef;border-radius:16px;overflow:hidden;">
          <div style="background:#64b51f;color:#ffffff;padding:18px 22px;">
            <h2 style="margin:0;font-size:20px;line-height:1.3;">${escapeHtml(title)}</h2>
          </div>
          <div style="padding:22px;font-size:14px;line-height:1.55;">
            ${content}
            <p style="margin:22px 0 0;color:#526783;font-size:12px;">
              Este e-mail foi enviado automaticamente pela intranet.
            </p>
          </div>
        </div>
      </div>
    `;
}

function infoTable(rows: Array<[string, any]>) {
    const htmlRows = rows
        .map(
            ([label, value]) => `
              <tr>
                <td style="width:220px;padding:9px;border:1px solid #dbe5ef;background:#f8fafc;font-weight:700;">${escapeHtml(label)}</td>
                <td style="padding:9px;border:1px solid #dbe5ef;">${escapeHtml(value || "-")}</td>
              </tr>
            `
        )
        .join("");

    return `<table style="width:100%;border-collapse:collapse;margin-top:12px;">${htmlRows}</table>`;
}

const EMAIL_DESTINOS_RH_EFETIVACAO = [
    "luiz.gerhard@sicoob.com.br",
    "fabio.sprado@sicoob.com.br",
    "paulo.tarso@sicoob.com.br",
    "tiago.teixeira@sicoob.com.br",
    "paloma.eduarda@sicoob.com.br",
    "jorge.gregorio@sicoob.com.br",
];

const EMAIL_DESTINOS_RH_CADASTRO = [
    "ana.hespanha@sicoob.com.br",
    "diego.adriano@sicoob.com.br",
    "paloma.eduarda@sicoob.com.br",
    "jorge.gregorio@sicoob.com.br",
    "cadastro.cressem@sicoob.com.br",
];

const EMAIL_DESTINOS_RH_DESIMPEDIMENTO = [
    "diego.adriano@sicoob.com.br",
    "vanderleia.medeiros@sicoob.com.br",
    "thais.yumi@sicoob.com.br",
    "paloma.eduarda@sicoob.com.br",
    "jorge.gregorio@sicoob.com.br",
];

const EMAIL_DESTINOS_RH_DESATIVACAO_ACESSOS = [
    "luiz.gerhard@sicoob.com.br",
    "fabio.sprado@sicoob.com.br",
    "paloma.eduarda@sicoob.com.br",
    "jorge.gregorio@sicoob.com.br",
];

const EMAIL_DESTINOS_RH_DESLIGAMENTO_GERAL = ["lista.geral.cressem@sicoob.com.br"];

const EMAIL_DESTINOS_ASSEM = [
    "convenios01@assem.com.br",
    "convenios@assem.com.br",
    "assem@assem.com.br",
];

const EMAIL_DESTINOS_GREMIO = ["devair.pietraroia@sjc.sp.gov.br"];

async function montarAnexosEmailFuncionario(
    caminhos: Array<string | null>,
    exigirTodos = false
) {
    const attachments: EmailAttachment[] = [];
    const caminhosValidos = caminhos.filter(Boolean) as string[];
    const falhas: string[] = [];

    if (!caminhosValidos.length) {
        return attachments;
    }

    if (isWindowsRuntime()) {
        await conectarShareWindows();
    }

    for (const caminho of caminhosValidos) {
        try {
            const arquivo =
                !isWindowsRuntime() && isUncPath(caminho)
                    ? await readFileFromSmbLinux(caminho)
                    : {
                        bytes: await fs.readFile(caminho),
                        fileName: path.win32.basename(caminho),
                    };

            attachments.push({
                name: arquivo.fileName,
                contentType: getMimeTypeByFileName(caminho),
                contentBytes: arquivo.bytes.toString("base64"),
            });
        } catch (error) {
            console.warn("Não foi possível anexar arquivo ao e-mail de RH:", caminho, error);
            falhas.push(path.win32.basename(caminho));
        }
    }

    if (exigirTodos && falhas.length) {
        throw new Error(
            `Não foi possível anexar ao e-mail: ${falhas.join(", ")}.`
        );
    }

    return attachments;
}

async function montarAnexosEmailFuncionarioDeUploads(arquivos: Array<any | null>) {
    const anexos: EmailAttachment[] = [];
    const arquivosValidos = arquivos.filter(Boolean);

    for (const arquivo of arquivosValidos) {
        const fileName = String(arquivo.name || arquivo.filename || "arquivo.pdf");
        const bytes = await lerArquivoUploadBuffer(arquivo);

        anexos.push({
            name: path.win32.basename(
                fileName
            ),
            contentType: getMimeTypeByFileName(
                fileName
            ),
            contentBytes: bytes.toString("base64"),
        });
    }

    return anexos;
}

async function buscarFuncionarioCompleto(idFuncionario: number) {
    const result = await oracleExecute(
        `
        SELECT
          f.ID_FUNCIONARIO,
          f.NM_FUNCIONARIO,
          f.EMAIL,
          f.NR_CPF,
          f.NR_RG,
          f.NR_CELULAR,
          f.SEXO,
          f.NR_MATRICULA,
          f.NR_CONTA_CORRENTE,
          f.FICHA_DESIMPEDIMENTO,
          TO_CHAR(f.DT_NASCIMENTO, 'YYYY-MM-DD') AS DT_NASCIMENTO,
          TO_CHAR(f.DT_ADMISSAO, 'YYYY-MM-DD') AS DT_ADMISSAO,
          TO_CHAR(f.DT_DESLIGAMENTO, 'YYYY-MM-DD') AS DT_DESLIGAMENTO,
          s.NM_SETOR,
          c.NM_CARGO,
          c.NM_NIVEL,
          p.CD_SICOOB,
          p.NM_POSICAO,
          p.DESC_POSICAO,
          ger.NM_FUNCIONARIO AS NM_GERENCIA,
          ger.EMAIL AS EMAIL_GERENCIA
        FROM DBACRESSEM.FUNCIONARIOS_SICOOB_CRESSEM f
        LEFT JOIN DBACRESSEM.SETOR_SICOOB_CRESSEM s
          ON s.ID_SETOR = f.ID_SETOR
        LEFT JOIN DBACRESSEM.CARGO_GERENTES_SICOOB_CRESSEM c
          ON c.ID_CARGO = f.ID_CARGO
        LEFT JOIN DBACRESSEM.POSICAO_COOPERATIVA_SICOOB p
          ON p.ID_POSICAO = c.ID_POSICAO
        LEFT JOIN DBACRESSEM.FUNCIONARIOS_SICOOB_CRESSEM ger
          ON ger.ID_FUNCIONARIO = f.CD_GERENCIA
        WHERE f.ID_FUNCIONARIO = :idFuncionario
      `,
        { idFuncionario },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    return (result.rows?.[0] || null) as any;
}

async function enviarEmailsCadastroFuncionario(
    funcionario: any,
    anexosCadastro: EmailAttachment[]
) {
    if (!funcionario) {
        throw new Error("Funcionário cadastrado não foi encontrado para montar os e-mails de admissão.");
    }

    const destinosEfetivacao = Array.from(
        new Set([
            ...EMAIL_DESTINOS_RH_EFETIVACAO,
            String(funcionario.EMAIL_GERENCIA || "").trim(),
        ].filter(Boolean))
    );

    const descricaoPosicao = String(funcionario.DESC_POSICAO || "")
        .split(/\r?\n/)
        .map((linha) => linha.trim())
        .filter(Boolean)
        .map((linha) => `<p style="margin:0;">${escapeHtml(linha)}</p>`)
        .join("");

    const assuntoEfetivacao = `Contratação ${verificarCargo(
        funcionario.NM_NIVEL,
        funcionario.SEXO
    )} no Sicoob Cressem - Procedimentos para criação de login e senha`;

    const htmlEfetivacao = emailTemplateRh(
        "Nova contratação - procedimentos internos",
        `
          <p style="margin:0;">${escapeHtml(bomDiaBoaTarde())}</p>
          <p>Segue abaixo os dados ${escapeHtml(verificarCargo(funcionario.NM_NIVEL, funcionario.SEXO))}, para <strong>cadastro, criação de e-mail corporativo, logins e senhas</strong>.</p>
          <p><strong>Observação:</strong> aguardar o cadastro no SISBR pelo setor de cadastro.</p>
          ${funcionario.CD_SICOOB || funcionario.NM_POSICAO
            ? `<p><strong>Singular/posição:</strong> ${escapeHtml(funcionario.CD_SICOOB || "-")} - ${escapeHtml(funcionario.NM_POSICAO || "-")}</p>`
            : ""}
          ${descricaoPosicao ? `<p><strong>Descrição:</strong></p>${descricaoPosicao}` : ""}
          ${infoTable([
            ["Nome", funcionario.NM_FUNCIONARIO],
            ["CPF", funcionario.NR_CPF],
            ["RG", funcionario.NR_RG],
            ["Data de admissão", formatarDataBrasil(funcionario.DT_ADMISSAO)],
            ["Data de nascimento", formatarDataBrasil(funcionario.DT_NASCIMENTO)],
            ["Celular", funcionario.NR_CELULAR],
            ["Matrícula", funcionario.NR_MATRICULA],
            ["Cargo", funcionario.NM_CARGO],
            ["Setor", funcionario.NM_SETOR],
            ["Gerência", funcionario.NM_GERENCIA],
          ])}
          <p style="margin-top:16px;">Equipe RH</p>
        `
    );

    const sexo = String(funcionario.SEXO || "").toUpperCase();
    const contaTexto = sexo === "F" ? "da funcionária nova" : "do funcionário novo";
    const assuntoCadastro = "SICOOB CRESSEM - ABERTURA DE CONTA FUNCIONARIO NOVO";
    const htmlCadastro = emailTemplateRh(
        "Abertura de conta - funcionário novo",
        `
          <p style="margin:0;">${escapeHtml(bomDiaBoaTarde())}</p>
          <p>
            Seguem em anexo os documentos necessários para a abertura de conta ${contaTexto}
            <strong>${escapeHtml(funcionario.NM_FUNCIONARIO)}</strong>.
          </p>
          ${infoTable([
            ["Nome", funcionario.NM_FUNCIONARIO],
            ["CPF", funcionario.NR_CPF],
            ["RG", funcionario.NR_RG],
            ["Data de admissão", formatarDataBrasil(funcionario.DT_ADMISSAO)],
            ["Cargo", funcionario.NM_CARGO],
            ["Setor", funcionario.NM_SETOR],
          ])}
          <p style="margin-top:16px;">Equipe RH</p>
        `
    );

    await sendEmail(destinosEfetivacao, assuntoEfetivacao, htmlEfetivacao);
    await sendEmail(EMAIL_DESTINOS_RH_CADASTRO, assuntoCadastro, htmlCadastro, anexosCadastro);
}

async function enviarEmailDesimpedimentoFuncionario(
    funcionario: any,
    anexos: EmailAttachment[],
    opcoes: {
        enviarAssem?: boolean;
        enviarGremio?: boolean;
        efetivacaoEstagiario?: boolean;
    } = {}
) {
    if (!funcionario) {
        throw new Error("Funcionário não encontrado para montar o e-mail de desimpedimento.");
    }

    if (!anexos.length) {
        throw new Error("Nenhuma ficha de desimpedimento disponível para anexar ao e-mail.");
    }

    const destinos = Array.from(
        new Set([
            ...EMAIL_DESTINOS_RH_DESIMPEDIMENTO,
            ...(opcoes.enviarAssem ? EMAIL_DESTINOS_ASSEM : []),
            ...(opcoes.enviarGremio ? EMAIL_DESTINOS_GREMIO : []),
            String(funcionario.EMAIL_GERENCIA || "").trim(),
        ].filter(Boolean))
    );

    const sexo = String(funcionario.SEXO || "").toUpperCase();
    const artigo = sexo === "F" ? "da" : "do";
    const observacaoEstagiario = opcoes.efetivacaoEstagiario
        ? `<p style="margin:12px 0 0;"><strong>OBS:</strong> Se trata de uma efetivação de estagiário (desligamento do contrato de estágio e contratação como CLT).</p>`
        : "";

    const assunto = `SICOOB CRESSEM-FICHA DE DESIMPEDIMENTO - ${formatarDataBrasil(
        funcionario.DT_DESLIGAMENTO
    )}`;
    const html = emailTemplateRh(
        "Ficha de desimpedimento",
        `
          <p style="margin:0;">${escapeHtml(bomDiaBoaTarde())}</p>
          <p>
            Segue em anexo a ficha de desimpedimento ${artigo}
            <strong>${escapeHtml(funcionario.NM_FUNCIONARIO)}</strong>.
          </p>
          ${observacaoEstagiario}
          ${infoTable([
            ["Nome", funcionario.NM_FUNCIONARIO],
            ["CPF", funcionario.NR_CPF],
            ["RG", funcionario.NR_RG],
            ["Data de desligamento", formatarDataBrasil(funcionario.DT_DESLIGAMENTO)],
            ["Cargo", funcionario.NM_CARGO],
            ["Setor", funcionario.NM_SETOR],
            ["Gerência", funcionario.NM_GERENCIA],
          ])}
          <p style="margin-top:16px;">Equipe RH</p>
        `
    );

    await sendEmail(destinos, assunto, html, anexos);
}

async function enviarEmailDesativacaoAcessosFuncionario(
    funcionario: any,
    efetivacaoEstagiario = false
) {
    if (!funcionario) {
        throw new Error("Funcionário não encontrado para montar o e-mail de desativação.");
    }

    const destinos = Array.from(
        new Set([
            ...EMAIL_DESTINOS_RH_DESATIVACAO_ACESSOS,
            String(funcionario.EMAIL_GERENCIA || "").trim(),
        ].filter(Boolean))
    );

    const observacaoEstagiario = efetivacaoEstagiario
        ? `<p style="margin:12px 0 0;"><strong>OBS:</strong> Se trata de uma efetivação de estagiário (desligamento do contrato de estágio e contratação como CLT).</p>`
        : "";

    const assunto = `Desligamento ${verificarCargo(
        funcionario.NM_NIVEL,
        funcionario.SEXO
    ).replace("nova ", "").replace("novo ", "")} no Sicoob Cressem em ${formatarDataBrasil(
        funcionario.DT_DESLIGAMENTO
    )}`;

    const html = emailTemplateRh(
        "Desativação de acessos",
        `
          <p style="margin:0;">${escapeHtml(bomDiaBoaTarde())}</p>
          <p>
            Seguem abaixo os dados para <strong>desativação de e-mail corporativo, contas, logins e senhas</strong>.
          </p>
          ${infoTable([
            ["Nome", funcionario.NM_FUNCIONARIO],
            ["CPF", funcionario.NR_CPF],
            ["Data de desligamento", formatarDataBrasil(funcionario.DT_DESLIGAMENTO)],
            ["Matrícula", funcionario.NR_MATRICULA],
            ["Cargo", funcionario.NM_CARGO],
            ["Setor", funcionario.NM_SETOR],
            ["Gerência", funcionario.NM_GERENCIA],
          ])}
          ${observacaoEstagiario}
          <p style="margin-top:16px;">Equipe RH</p>
        `
    );

    await sendEmail(destinos, assunto, html);
}

async function enviarEmailDesligamentoGeralFuncionario(funcionario: any) {
    if (!funcionario) {
        throw new Error("Funcionário não encontrado para montar o e-mail geral de desligamento.");
    }

    const sexo = String(funcionario.SEXO || "").toUpperCase();
    const desligado = sexo === "F" ? "desligada" : "desligado";

    const html = emailTemplateRh(
        "Desligamento",
        `
          <p style="margin:0;">${escapeHtml(bomDiaBoaTarde())}</p>
          <p>
            Informamos que, a partir do dia
            <strong>${escapeHtml(formatarDataBrasil(funcionario.DT_DESLIGAMENTO))}</strong>,
            <strong>${escapeHtml(funcionario.NM_FUNCIONARIO)}</strong>, do setor
            <strong>${escapeHtml(funcionario.NM_SETOR || "-")}</strong>, está ${desligado} de nossa equipe.
          </p>
          <p style="margin-top:16px;">Equipe RH</p>
        `
    );

    await sendEmail(
        EMAIL_DESTINOS_RH_DESLIGAMENTO_GERAL,
        "SICOOB CRESSEM-DESLIGAMENTO",
        html
    );
}

export const gerenciamentoFuncionarioController = {
    async listar(req: Request, res: Response) {
        try {
            const sql = `
        SELECT
          f.ID_FUNCIONARIO,
          f.NM_FUNCIONARIO,
          TO_CHAR(f.DT_NASCIMENTO, 'YYYY-MM-DD') AS DT_NASCIMENTO,
          f.ID_SETOR,
          f.ID_CARGO,
          f.NR_RAMAL,
          f.SN_ATIVO,
          f.CD_GERENCIA,
          f.EMAIL,
          f.NR_CPF,
          f.NR_RG,
          f.NR_CELULAR,
          f.SEXO,
          TO_CHAR(f.DT_ADMISSAO, 'YYYY-MM-DD') AS DT_ADMISSAO,
          TO_CHAR(f.DT_DESLIGAMENTO, 'YYYY-MM-DD') AS DT_DESLIGAMENTO,
          f.NR_MATRICULA,
          f.NR_CONTA_CORRENTE,
          f.DOC_INDENTIDADE,
          f.COMP_ENDERECO,
          f.FICHA_RH,
          f.CERT_NASCIMENTO,
          f.CERT_CASAMENTO,
          f.DOC_IDENTIDADE_CONJ,
          f.FICHA_DESIMPEDIMENTO,
          s.NM_SETOR,
          c.NM_CARGO
        FROM DBACRESSEM.FUNCIONARIOS_SICOOB_CRESSEM f
        LEFT JOIN DBACRESSEM.SETOR_SICOOB_CRESSEM s
          ON s.ID_SETOR = f.ID_SETOR
        LEFT JOIN DBACRESSEM.CARGO_GERENTES_SICOOB_CRESSEM c
          ON c.ID_CARGO = f.ID_CARGO
        ORDER BY UPPER(f.NM_FUNCIONARIO)
      `;

            const result = await oracleExecute(
                sql,
                {},
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            const rows = (result.rows || []).map((row: any) => ({
                ID_FUNCIONARIO: row.ID_FUNCIONARIO,
                NM_FUNCIONARIO: row.NM_FUNCIONARIO,
                DT_NASCIMENTO: row.DT_NASCIMENTO,
                ID_SETOR: row.ID_SETOR,
                ID_CARGO: row.ID_CARGO,
                NR_RAMAL: row.NR_RAMAL,
                SN_ATIVO: row.SN_ATIVO,
                CD_GERENCIA: row.CD_GERENCIA,
                EMAIL: row.EMAIL,
                NR_CPF: row.NR_CPF,
                NR_RG: row.NR_RG,
                NR_CELULAR: row.NR_CELULAR,
                SEXO: row.SEXO,
                DT_ADMISSAO: row.DT_ADMISSAO,
                DT_DESLIGAMENTO: row.DT_DESLIGAMENTO,
                NR_MATRICULA: row.NR_MATRICULA,
                NR_CONTA_CORRENTE: row.NR_CONTA_CORRENTE,
                DOC_INDENTIDADE: row.DOC_INDENTIDADE,
                COMP_ENDERECO: row.COMP_ENDERECO,
                FICHA_RH: row.FICHA_RH,
                CERT_NASCIMENTO: row.CERT_NASCIMENTO,
                CERT_CASAMENTO: row.CERT_CASAMENTO,
                DOC_IDENTIDADE_CONJ: row.DOC_IDENTIDADE_CONJ,
                FICHA_DESIMPEDIMENTO: row.FICHA_DESIMPEDIMENTO,
                SETOR: row.ID_SETOR
                    ? {
                        ID_SETOR: row.ID_SETOR,
                        NM_SETOR: row.NM_SETOR,
                    }
                    : null,
                CARGO: row.ID_CARGO
                    ? {
                        ID_CARGO: row.ID_CARGO,
                        NM_CARGO: row.NM_CARGO,
                    }
                    : null,
            }));

            return res.json(rows);
        } catch (err: any) {
            console.error("listar funcionarios erro:", err);
            return res.status(500).json({
                error: "Falha ao listar funcionários.",
                details: String(err?.message || err),
            });
        }
    },

    async buscarNomeTipo(req: Request, res: Response) {
        try {
            const nome = String(req.params.nome || "").trim();

            if (!nome) {
                return res.status(400).json({ error: "Nome não informado." });
            }

            const nomesMarketing = [
                "JULIA DE ALMEIDA COUTINHO",
                "LUIZ RODOLFO GERHARD",
            ];

            if (nomesMarketing.includes(nome.toUpperCase())) {
                return res.json({
                    NM_FUNCIONARIO: nome,
                    TIPO: "marketing",
                });
            }

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
                return res.json({
                    NM_FUNCIONARIO: nome,
                    TIPO: "funcionario",
                });
            }

            const nomeUpper = String(row.NM_FUNCIONARIO || "").toUpperCase();
            const nivelUpper = String(row.NM_NIVEL || "").toUpperCase();

            let tipo = "funcionario";

            const nomesConselho = [
                "JANAINA GABRIELA",
                "ISABELI LOHANA CARVALHO MARTINS",
                "VITORIA BEATRIZ FONTOURA CAVALHEIRO DOS SANTOS"
            ];
            if (nomesConselho.includes(nomeUpper)) {
                tipo = "conselho";
            } else if (nivelUpper === "DIRETORIA") {
                tipo = "diretoria";
            } else if (nivelUpper === "GERENCIA") {
                tipo = "gerencia";
            }

            return res.json({
                NM_FUNCIONARIO: row.NM_FUNCIONARIO,
                TIPO: tipo,
            });
        } catch (err: any) {
            console.error("buscarNomeTipo erro:", err);
            return res.status(500).json({
                error: "Falha ao buscar tipo do funcionário.",
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
        FROM DBACRESSEM.FUNCIONARIOS_SICOOB_CRESSEM f
        LEFT JOIN DBACRESSEM.SETOR_SICOOB_CRESSEM s
          ON s.ID_SETOR = f.ID_SETOR
        WHERE (
          :nome = '%%'
          OR UPPER(f.NM_FUNCIONARIO) LIKE :nome
          OR UPPER(s.NM_SETOR) LIKE :nome
        )
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
            f.ID_FUNCIONARIO,
            f.NM_FUNCIONARIO,
            TO_CHAR(f.DT_NASCIMENTO, 'YYYY-MM-DD') AS DT_NASCIMENTO,
            f.ID_SETOR,
            f.ID_CARGO,
            f.NR_RAMAL,
            f.SN_ATIVO,
            f.CD_GERENCIA,
            f.EMAIL,
            f.NR_CPF,
            f.NR_RG,
            f.NR_CELULAR,
            f.SEXO,
            TO_CHAR(f.DT_ADMISSAO, 'YYYY-MM-DD') AS DT_ADMISSAO,
            TO_CHAR(f.DT_DESLIGAMENTO, 'YYYY-MM-DD') AS DT_DESLIGAMENTO,
            f.NR_MATRICULA,
            f.NR_CONTA_CORRENTE,
            f.DOC_INDENTIDADE,
            f.COMP_ENDERECO,
            f.FICHA_RH,
            f.CERT_NASCIMENTO,
            f.CERT_CASAMENTO,
            f.DOC_IDENTIDADE_CONJ,
            f.FICHA_DESIMPEDIMENTO,
            s.NM_SETOR,
            c.NM_CARGO,
            ROW_NUMBER() OVER (ORDER BY UPPER(f.NM_FUNCIONARIO)) AS RN
          FROM DBACRESSEM.FUNCIONARIOS_SICOOB_CRESSEM f
          LEFT JOIN DBACRESSEM.SETOR_SICOOB_CRESSEM s
            ON s.ID_SETOR = f.ID_SETOR
          LEFT JOIN DBACRESSEM.CARGO_GERENTES_SICOOB_CRESSEM c
            ON c.ID_CARGO = f.ID_CARGO
          WHERE (
            :nome = '%%'
            OR UPPER(f.NM_FUNCIONARIO) LIKE :nome
            OR UPPER(s.NM_SETOR) LIKE :nome
          )
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
                ID_FUNCIONARIO: row.ID_FUNCIONARIO,
                NM_FUNCIONARIO: row.NM_FUNCIONARIO,
                DT_NASCIMENTO: row.DT_NASCIMENTO,
                ID_SETOR: row.ID_SETOR,
                ID_CARGO: row.ID_CARGO,
                NR_RAMAL: row.NR_RAMAL,
                SN_ATIVO: row.SN_ATIVO,
                CD_GERENCIA: row.CD_GERENCIA,
                EMAIL: row.EMAIL,
                NR_CPF: row.NR_CPF,
                NR_RG: row.NR_RG,
                NR_CELULAR: row.NR_CELULAR,
                SEXO: row.SEXO,
                DT_ADMISSAO: row.DT_ADMISSAO,
                DT_DESLIGAMENTO: row.DT_DESLIGAMENTO,
                NR_MATRICULA: row.NR_MATRICULA,
                NR_CONTA_CORRENTE: row.NR_CONTA_CORRENTE,
                DOC_INDENTIDADE: row.DOC_INDENTIDADE,
                COMP_ENDERECO: row.COMP_ENDERECO,
                FICHA_RH: row.FICHA_RH,
                CERT_NASCIMENTO: row.CERT_NASCIMENTO,
                CERT_CASAMENTO: row.CERT_CASAMENTO,
                DOC_IDENTIDADE_CONJ: row.DOC_IDENTIDADE_CONJ,
                FICHA_DESIMPEDIMENTO: row.FICHA_DESIMPEDIMENTO,
                SETOR: row.ID_SETOR
                    ? {
                        ID_SETOR: row.ID_SETOR,
                        NM_SETOR: row.NM_SETOR,
                    }
                    : null,
                CARGO: row.ID_CARGO
                    ? {
                        ID_CARGO: row.ID_CARGO,
                        NM_CARGO: row.NM_CARGO,
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
            console.error("listarPaginado funcionarios erro:", err);
            return res.status(500).json({
                error: "Falha ao listar funcionários paginados.",
                details: String(err?.message || err),
            });
        }
    },

    async baixarArquivo(req: Request, res: Response) {
        try {
            const caminho = String(req.body?.caminho || "").trim();

            if (!caminho) {
                return res.status(400).json({
                    error: "Caminho do arquivo não informado.",
                });
            }

            console.log("BAIXAR ARQUIVO CAMINHO:", caminho);

            const { bytes: arquivoBuffer, fileName } =
                !isWindowsRuntime() && isUncPath(caminho)
                    ? await readFileFromSmbLinux(caminho)
                    : await (async () => {
                        await conectarShareWindows();
                        return {
                            bytes: await fs.readFile(caminho),
                            fileName: path.win32.basename(caminho),
                        };
                    })();

            let contentType = "application/octet-stream";
            const lower = caminho.toLowerCase();

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
            console.error("baixar arquivo funcionario erro:", err);
            return res.status(500).json({
                error: "Falha ao baixar o arquivo.",
                details: String(err?.message || err),
            });
        }
    },

    async listarSetores(req: Request, res: Response) {
        try {
            const sql = `
        SELECT
          ID_SETOR,
          NM_SETOR,
          NM_ENDERECO,
          NR_RAMAL,
          SN_ATIVO
        FROM DBACRESSEM.SETOR_SICOOB_CRESSEM
        ORDER BY UPPER(NM_SETOR)
      `;

            const result = await oracleExecute(
                sql,
                {},
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            return res.json(result.rows || []);
        } catch (err: any) {
            console.error("listar setores erro:", err);
            return res.status(500).json({
                error: "Falha ao listar setores.",
                details: String(err?.message || err),
            });
        }
    },

    async listarGerencias(req: Request, res: Response) {
        try {
            const sql = `
        SELECT
          f.ID_FUNCIONARIO,
          f.NM_FUNCIONARIO,
          f.SN_ATIVO
        FROM DBACRESSEM.FUNCIONARIOS_SICOOB_CRESSEM f
        INNER JOIN DBACRESSEM.CARGO_GERENTES_SICOOB_CRESSEM c
          ON c.ID_CARGO = f.ID_CARGO
        WHERE UPPER(c.NM_NIVEL) IN ('GERENCIA', 'DIRETORIA')
        ORDER BY UPPER(f.NM_FUNCIONARIO)
      `;

            const result = await oracleExecute(
                sql,
                {},
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            return res.json(result.rows || []);
        } catch (err: any) {
            console.error("listar gerencias erro:", err);
            return res.status(500).json({
                error: "Falha ao listar gerências.",
                details: String(err?.message || err),
            });
        }
    },

    async cadastrar(req: Request, res: Response) {
        try {
            const NM_FUNCIONARIO = String(req.body.NM_FUNCIONARIO || "").trim().toUpperCase();
            const DT_NASCIMENTO = req.body.DT_NASCIMENTO || null;
            const ID_SETOR = Number(req.body.ID_SETOR || 0);
            const ID_CARGO = req.body.ID_CARGO ? Number(req.body.ID_CARGO) : null;
            const NR_RAMAL = String(req.body.NR_RAMAL || " ").trim();
            const CD_GERENCIA = req.body.CD_GERENCIA ? Number(req.body.CD_GERENCIA) : null;
            const EMAIL = String(req.body.EMAIL || " ").trim();
            const NR_CPF = String(req.body.NR_CPF || "").trim();
            const NR_RG = String(req.body.NR_RG || "").trim();
            const NR_CELULAR = String(req.body.NR_CELULAR || "").trim();
            const SEXO = String(req.body.SEXO || "").trim().toUpperCase();
            const DT_ADMISSAO = req.body.DT_ADMISSAO || null;
            const DT_DESLIGAMENTO = req.body.DT_DESLIGAMENTO || null;
            const NR_MATRICULA = String(req.body.NR_MATRICULA || " ").trim();
            const NR_CONTA_CORRENTE = String(
                req.body.NR_CONTA_CORRENTE || "0000000000"
            ).trim();

            if (!NM_FUNCIONARIO) {
                return res.status(400).json({ error: "Preencha o nome." });
            }

            if (!NR_CPF) {
                return res.status(400).json({ error: "Preencha o CPF." });
            }

            if (!NR_RG) {
                return res.status(400).json({ error: "Preencha o RG." });
            }

            if (!NR_CELULAR) {
                return res.status(400).json({ error: "Preencha o celular." });
            }

            if (!SEXO) {
                return res.status(400).json({ error: "Preencha o sexo." });
            }

            if (!DT_NASCIMENTO) {
                return res.status(400).json({ error: "Preencha a data de nascimento." });
            }

            if (!DT_ADMISSAO) {
                return res.status(400).json({ error: "Preencha a data de admissão." });
            }

            if (!ID_SETOR) {
                return res.status(400).json({ error: "Preencha o setor." });
            }

            const ENVIAR_EMAIL_ADMISSAO = isTruthyBody(req.body.ENVIAR_EMAIL_ADMISSAO);
            const funcionarioNomePasta = NM_FUNCIONARIO;
            const warnings: string[] = [];

            const fileDocIdentidade = getUploadedFile(req.files, "DOC_INDENTIDADE");
            const fileCompEndereco = getUploadedFile(req.files, "COMP_ENDERECO");
            const fileFichaRh = getUploadedFile(req.files, "FICHA_RH");
            const fileCertNascimento = getUploadedFile(req.files, "CERT_NASCIMENTO");
            const fileCertCasamento = getUploadedFile(req.files, "CERT_CASAMENTO");
            const fileDocConjuge = getUploadedFile(req.files, "DOC_IDENTIDADE_CONJ");
            const fileFichaDesimpedimento = getUploadedFile(req.files, "FICHA_DESIMPEDIMENTO");

            let caminhoDocIdentidade: string | null = null;
            let caminhoCompEndereco: string | null = null;
            let caminhoFichaRh: string | null = null;
            let caminhoCertNascimento: string | null = null;
            let caminhoCertCasamento: string | null = null;
            let caminhoDocConjuge: string | null = null;
            let caminhoFichaDesimpedimento: string | null = null;

            if (fileDocIdentidade) {
                try {
                    caminhoDocIdentidade = await salvarArquivoNoServidorSMB(
                        fileDocIdentidade,
                        funcionarioNomePasta
                    );
                } catch (error: any) {
                    console.error("Falha DOC_INDENTIDADE:", error);
                    warnings.push("Não foi possível salvar o documento de identidade no servidor de arquivos.");
                }
            }

            if (fileCompEndereco) {
                try {
                    caminhoCompEndereco = await salvarArquivoNoServidorSMB(
                        fileCompEndereco,
                        funcionarioNomePasta
                    );
                } catch (error: any) {
                    console.error("Falha COMP_ENDERECO:", error);
                    warnings.push("Não foi possível salvar o comprovante de endereço no servidor de arquivos.");
                }
            }

            if (fileFichaRh) {
                try {
                    caminhoFichaRh = await salvarArquivoNoServidorSMB(
                        fileFichaRh,
                        funcionarioNomePasta
                    );
                } catch (error: any) {
                    console.error("Falha FICHA_RH:", error);
                    warnings.push("Não foi possível salvar a ficha RH no servidor de arquivos.");
                }
            }

            if (fileCertNascimento) {
                try {
                    caminhoCertNascimento = await salvarArquivoNoServidorSMB(
                        fileCertNascimento,
                        funcionarioNomePasta
                    );
                } catch (error: any) {
                    console.error("Falha CERT_NASCIMENTO:", error);
                    warnings.push("Não foi possível salvar a certidão de nascimento no servidor de arquivos.");
                }
            }

            if (fileCertCasamento) {
                try {
                    caminhoCertCasamento = await salvarArquivoNoServidorSMB(
                        fileCertCasamento,
                        funcionarioNomePasta
                    );
                } catch (error: any) {
                    console.error("Falha CERT_CASAMENTO:", error);
                    warnings.push("Não foi possível salvar a certidão de casamento no servidor de arquivos.");
                }
            }

            if (fileDocConjuge) {
                try {
                    caminhoDocConjuge = await salvarArquivoNoServidorSMB(
                        fileDocConjuge,
                        funcionarioNomePasta
                    );
                } catch (error: any) {
                    console.error("Falha DOC_IDENTIDADE_CONJ:", error);
                    warnings.push("Não foi possível salvar o documento do cônjuge no servidor de arquivos.");
                }
            }

            if (fileFichaDesimpedimento) {
                try {
                    caminhoFichaDesimpedimento = await salvarArquivoNoServidorSMB(
                        fileFichaDesimpedimento,
                        funcionarioNomePasta
                    );
                } catch (error: any) {
                    console.error("Falha FICHA_DESIMPEDIMENTO:", error);
                    warnings.push("Não foi possível salvar a ficha de desimpedimento no servidor de arquivos.");
                }
            }

            const sql = `
        INSERT INTO DBACRESSEM.FUNCIONARIOS_SICOOB_CRESSEM (
          NM_FUNCIONARIO,
          DT_NASCIMENTO,
          ID_SETOR,
          ID_CARGO,
          NR_RAMAL,
          SN_ATIVO,
          CD_GERENCIA,
          EMAIL,
          NR_CPF,
          NR_RG,
          NR_CELULAR,
          SEXO,
          DT_ADMISSAO,
          DT_DESLIGAMENTO,
          NR_MATRICULA,
          NR_CONTA_CORRENTE,
          DOC_INDENTIDADE,
          COMP_ENDERECO,
          FICHA_RH,
          CERT_NASCIMENTO,
          CERT_CASAMENTO,
          DOC_IDENTIDADE_CONJ,
          FICHA_DESIMPEDIMENTO
        ) VALUES (
          :NM_FUNCIONARIO,
          TO_DATE(:DT_NASCIMENTO, 'YYYY-MM-DD'),
          :ID_SETOR,
          :ID_CARGO,
          :NR_RAMAL,
          1,
          :CD_GERENCIA,
          :EMAIL,
          :NR_CPF,
          :NR_RG,
          :NR_CELULAR,
          :SEXO,
          TO_DATE(:DT_ADMISSAO, 'YYYY-MM-DD'),
          CASE
            WHEN :DT_DESLIGAMENTO IS NOT NULL THEN TO_DATE(:DT_DESLIGAMENTO, 'YYYY-MM-DD')
            ELSE NULL
          END,
          :NR_MATRICULA,
          :NR_CONTA_CORRENTE,
          :DOC_INDENTIDADE,
          :COMP_ENDERECO,
          :FICHA_RH,
          :CERT_NASCIMENTO,
          :CERT_CASAMENTO,
          :DOC_IDENTIDADE_CONJ,
          :FICHA_DESIMPEDIMENTO
        )
        RETURNING ID_FUNCIONARIO INTO :ID_FUNCIONARIO
      `;

            const result = await oracleExecuteCommitWithAudit(
                req,
                sql,
                {
                    NM_FUNCIONARIO,
                    DT_NASCIMENTO,
                    ID_SETOR,
                    ID_CARGO,
                    NR_RAMAL,
                    CD_GERENCIA,
                    EMAIL,
                    NR_CPF,
                    NR_RG,
                    NR_CELULAR,
                    SEXO,
                    DT_ADMISSAO,
                    DT_DESLIGAMENTO,
                    NR_MATRICULA,
                    NR_CONTA_CORRENTE,
                    DOC_INDENTIDADE: caminhoDocIdentidade,
                    COMP_ENDERECO: caminhoCompEndereco,
                    FICHA_RH: caminhoFichaRh,
                    CERT_NASCIMENTO: caminhoCertNascimento,
                    CERT_CASAMENTO: caminhoCertCasamento,
                    DOC_IDENTIDADE_CONJ: caminhoDocConjuge,
                    FICHA_DESIMPEDIMENTO: caminhoFichaDesimpedimento,
                    ID_FUNCIONARIO: {
                        dir: oracledb.BIND_OUT,
                        type: oracledb.NUMBER,
                    },
                },
                {} as any
            );

            const id = (result.outBinds as any)?.ID_FUNCIONARIO?.[0];
            let emailEnviado = false;
            let emailErro = "";

            if (ENVIAR_EMAIL_ADMISSAO && id) {
                try {
                    const funcionarioCompleto = await buscarFuncionarioCompleto(Number(id));
                    const anexosCadastro = await montarAnexosEmailFuncionarioDeUploads([
                        fileDocIdentidade,
                        fileCompEndereco,
                        fileFichaRh,
                        fileCertNascimento,
                        fileCertCasamento,
                        fileDocConjuge,
                    ]);

                    if (!anexosCadastro.length) {
                        throw new Error(
                            "Nenhum arquivo foi recebido para anexar ao e-mail de abertura de conta."
                        );
                    }

                    await enviarEmailsCadastroFuncionario(funcionarioCompleto, anexosCadastro);
                    emailEnviado = true;
                } catch (emailError: any) {
                    emailErro = String(emailError?.message || emailError);
                    console.error("Falha ao enviar e-mails de admissão do funcionário:", emailError);
                    warnings.push("Funcionário cadastrado, mas não foi possível enviar os e-mails de admissão.");
                }
            }

            return res.status(201).json({
                ID_FUNCIONARIO: id,
                NM_FUNCIONARIO,
                SN_ATIVO: 1,
                DOC_INDENTIDADE: caminhoDocIdentidade,
                COMP_ENDERECO: caminhoCompEndereco,
                FICHA_RH: caminhoFichaRh,
                CERT_NASCIMENTO: caminhoCertNascimento,
                CERT_CASAMENTO: caminhoCertCasamento,
                DOC_IDENTIDADE_CONJ: caminhoDocConjuge,
                FICHA_DESIMPEDIMENTO: caminhoFichaDesimpedimento,
                emailEnviado,
                ...(emailErro ? { emailErro } : {}),
                warnings,
            });
        } catch (err: any) {
            console.error("cadastrar funcionario erro:", err);
            return res.status(500).json({
                error: "Falha ao cadastrar funcionário.",
                details: String(err?.message || err),
            });
        }
    },

    async editar(req: Request, res: Response) {
        try {
            console.log("====================================");
            console.log("BODY EDITAR:", req.body);
            console.log("FILES EDITAR:", req.files);
            console.log("====================================");

            const id = Number(req.params.id || 0);

            if (!id) {
                return res.status(400).json({
                    error: "ID do funcionário inválido.",
                });
            }

            const body = req.body || {};

            const NM_FUNCIONARIO = String(body.NM_FUNCIONARIO || "").trim().toUpperCase();
            const DT_NASCIMENTO = body.DT_NASCIMENTO ? String(body.DT_NASCIMENTO).trim() : null;
            const ID_SETOR = Number(body.ID_SETOR || 0);
            const ID_CARGO =
                body.ID_CARGO !== undefined &&
                    body.ID_CARGO !== null &&
                    String(body.ID_CARGO).trim() !== ""
                    ? Number(body.ID_CARGO)
                    : null;
            const NR_RAMAL = String(body.NR_RAMAL || " ").trim();
            const CD_GERENCIA =
                body.CD_GERENCIA !== undefined &&
                    body.CD_GERENCIA !== null &&
                    String(body.CD_GERENCIA).trim() !== ""
                    ? Number(body.CD_GERENCIA)
                    : null;
            const EMAIL = String(body.EMAIL || " ").trim();
            const NR_CPF = String(body.NR_CPF || "").trim();
            const NR_RG = String(body.NR_RG || "").trim();
            const NR_CELULAR = String(body.NR_CELULAR || "").trim();
            const SEXO = String(body.SEXO || "").trim().toUpperCase();
            const DT_ADMISSAO = body.DT_ADMISSAO ? String(body.DT_ADMISSAO).trim() : null;
            const DT_DESLIGAMENTO =
                body.DT_DESLIGAMENTO && String(body.DT_DESLIGAMENTO).trim() !== ""
                    ? String(body.DT_DESLIGAMENTO).trim()
                    : null;
            const NR_MATRICULA = String(body.NR_MATRICULA || " ").trim();
            const NR_CONTA_CORRENTE = String(
                body.NR_CONTA_CORRENTE || "0000000000"
            ).trim();

            if (!NM_FUNCIONARIO) {
                return res.status(400).json({ error: "Preencha o nome." });
            }

            if (!NR_CPF) {
                return res.status(400).json({ error: "Preencha o CPF." });
            }

            if (!NR_RG) {
                return res.status(400).json({ error: "Preencha o RG." });
            }

            if (!NR_CELULAR) {
                return res.status(400).json({ error: "Preencha o celular." });
            }

            if (!SEXO) {
                return res.status(400).json({ error: "Preencha o sexo." });
            }

            if (!DT_NASCIMENTO) {
                return res.status(400).json({ error: "Preencha a data de nascimento." });
            }

            if (!DT_ADMISSAO) {
                return res.status(400).json({ error: "Preencha a data de admissão." });
            }

            if (!ID_SETOR) {
                return res.status(400).json({ error: "Preencha o setor." });
            }

            const funcionarioNomePasta = NM_FUNCIONARIO;

            const fileDocIdentidade = getUploadedFile(req.files, "DOC_INDENTIDADE");
            const fileCompEndereco = getUploadedFile(req.files, "COMP_ENDERECO");
            const fileFichaRh = getUploadedFile(req.files, "FICHA_RH");
            const fileCertNascimento = getUploadedFile(req.files, "CERT_NASCIMENTO");
            const fileCertCasamento = getUploadedFile(req.files, "CERT_CASAMENTO");
            const fileDocConjuge = getUploadedFile(req.files, "DOC_IDENTIDADE_CONJ");
            const fileFichaDesimpedimento = getUploadedFile(req.files, "FICHA_DESIMPEDIMENTO");

            console.log("fileDocIdentidade:", fileDocIdentidade?.name);
            console.log("fileCompEndereco:", fileCompEndereco?.name);
            console.log("fileFichaRh:", fileFichaRh?.name);
            console.log("fileCertNascimento:", fileCertNascimento?.name);
            console.log("fileCertCasamento:", fileCertCasamento?.name);
            console.log("fileDocConjuge:", fileDocConjuge?.name);
            console.log("fileFichaDesimpedimento:", fileFichaDesimpedimento?.name);

            let caminhoDocIdentidade: string | null = null;
            let caminhoCompEndereco: string | null = null;
            let caminhoFichaRh: string | null = null;
            let caminhoCertNascimento: string | null = null;
            let caminhoCertCasamento: string | null = null;
            let caminhoDocConjuge: string | null = null;
            let caminhoFichaDesimpedimento: string | null = null;
            const warnings: string[] = [];

            if (fileDocIdentidade) {
                try {
                    caminhoDocIdentidade = await salvarArquivoNoServidorSMB(
                        fileDocIdentidade,
                        funcionarioNomePasta
                    );
                    console.log("caminhoDocIdentidade:", caminhoDocIdentidade);
                } catch (error: any) {
                    console.error("Falha DOC_INDENTIDADE:", error);
                    warnings.push("Não foi possível salvar o documento de identidade no servidor de arquivos.");
                }
            }

            if (fileCompEndereco) {
                try {
                    caminhoCompEndereco = await salvarArquivoNoServidorSMB(
                        fileCompEndereco,
                        funcionarioNomePasta
                    );
                    console.log("caminhoCompEndereco:", caminhoCompEndereco);
                } catch (error: any) {
                    console.error("Falha COMP_ENDERECO:", error);
                    warnings.push("Não foi possível salvar o comprovante de endereço no servidor de arquivos.");
                }
            }

            if (fileFichaRh) {
                try {
                    caminhoFichaRh = await salvarArquivoNoServidorSMB(
                        fileFichaRh,
                        funcionarioNomePasta
                    );
                    console.log("caminhoFichaRh:", caminhoFichaRh);
                } catch (error: any) {
                    console.error("Falha FICHA_RH:", error);
                    warnings.push("Não foi possível salvar a ficha RH no servidor de arquivos.");
                }
            }

            if (fileCertNascimento) {
                try {
                    caminhoCertNascimento = await salvarArquivoNoServidorSMB(
                        fileCertNascimento,
                        funcionarioNomePasta
                    );
                    console.log("caminhoCertNascimento:", caminhoCertNascimento);
                } catch (error: any) {
                    console.error("Falha CERT_NASCIMENTO:", error);
                    warnings.push("Não foi possível salvar a certidão de nascimento no servidor de arquivos.");
                }
            }

            if (fileCertCasamento) {
                try {
                    caminhoCertCasamento = await salvarArquivoNoServidorSMB(
                        fileCertCasamento,
                        funcionarioNomePasta
                    );
                    console.log("caminhoCertCasamento:", caminhoCertCasamento);
                } catch (error: any) {
                    console.error("Falha CERT_CASAMENTO:", error);
                    warnings.push("Não foi possível salvar a certidão de casamento no servidor de arquivos.");
                }
            }

            if (fileDocConjuge) {
                try {
                    caminhoDocConjuge = await salvarArquivoNoServidorSMB(
                        fileDocConjuge,
                        funcionarioNomePasta
                    );
                    console.log("caminhoDocConjuge:", caminhoDocConjuge);
                } catch (error: any) {
                    console.error("Falha DOC_IDENTIDADE_CONJ:", error);
                    warnings.push("Não foi possível salvar o documento do cônjuge no servidor de arquivos.");
                }
            }

            if (fileFichaDesimpedimento) {
                try {
                    caminhoFichaDesimpedimento = await salvarArquivoNoServidorSMB(
                        fileFichaDesimpedimento,
                        funcionarioNomePasta
                    );
                    console.log("caminhoFichaDesimpedimento:", caminhoFichaDesimpedimento);
                } catch (error: any) {
                    console.error("Falha FICHA_DESIMPEDIMENTO:", error);
                    warnings.push("Não foi possível salvar a ficha de desimpedimento no servidor de arquivos.");
                }
            }

            const sql = `
      UPDATE DBACRESSEM.FUNCIONARIOS_SICOOB_CRESSEM
      SET
        NM_FUNCIONARIO = :NM_FUNCIONARIO,
        DT_NASCIMENTO = TO_DATE(:DT_NASCIMENTO, 'YYYY-MM-DD'),
        ID_SETOR = :ID_SETOR,
        ID_CARGO = :ID_CARGO,
        NR_RAMAL = :NR_RAMAL,
        CD_GERENCIA = :CD_GERENCIA,
        EMAIL = :EMAIL,
        NR_CPF = :NR_CPF,
        NR_RG = :NR_RG,
        NR_CELULAR = :NR_CELULAR,
        SEXO = :SEXO,
        DT_ADMISSAO = TO_DATE(:DT_ADMISSAO, 'YYYY-MM-DD'),
        DT_DESLIGAMENTO = CASE
          WHEN :DT_DESLIGAMENTO IS NOT NULL THEN TO_DATE(:DT_DESLIGAMENTO, 'YYYY-MM-DD')
          ELSE NULL
        END,
        NR_MATRICULA = :NR_MATRICULA,
        NR_CONTA_CORRENTE = :NR_CONTA_CORRENTE,
        DOC_INDENTIDADE = COALESCE(:DOC_INDENTIDADE, DOC_INDENTIDADE),
        COMP_ENDERECO = COALESCE(:COMP_ENDERECO, COMP_ENDERECO),
        FICHA_RH = COALESCE(:FICHA_RH, FICHA_RH),
        CERT_NASCIMENTO = COALESCE(:CERT_NASCIMENTO, CERT_NASCIMENTO),
        CERT_CASAMENTO = COALESCE(:CERT_CASAMENTO, CERT_CASAMENTO),
        DOC_IDENTIDADE_CONJ = COALESCE(:DOC_IDENTIDADE_CONJ, DOC_IDENTIDADE_CONJ),
        FICHA_DESIMPEDIMENTO = COALESCE(:FICHA_DESIMPEDIMENTO, FICHA_DESIMPEDIMENTO)
      WHERE ID_FUNCIONARIO = :ID_FUNCIONARIO
    `;

            console.log("VALORES PARA UPDATE:", {
                ID_FUNCIONARIO: id,
                NM_FUNCIONARIO,
                DT_NASCIMENTO,
                ID_SETOR,
                ID_CARGO,
                NR_RAMAL,
                CD_GERENCIA,
                EMAIL,
                NR_CPF,
                NR_RG,
                NR_CELULAR,
                SEXO,
                DT_ADMISSAO,
                DT_DESLIGAMENTO,
                NR_MATRICULA,
                NR_CONTA_CORRENTE,
                DOC_INDENTIDADE: caminhoDocIdentidade,
                COMP_ENDERECO: caminhoCompEndereco,
                FICHA_RH: caminhoFichaRh,
                CERT_NASCIMENTO: caminhoCertNascimento,
                CERT_CASAMENTO: caminhoCertCasamento,
                DOC_IDENTIDADE_CONJ: caminhoDocConjuge,
                FICHA_DESIMPEDIMENTO: caminhoFichaDesimpedimento,
            });

            const result = await oracleExecuteCommitWithAudit(
                req,
                sql,
                {
                    ID_FUNCIONARIO: id,
                    NM_FUNCIONARIO,
                    DT_NASCIMENTO,
                    ID_SETOR,
                    ID_CARGO,
                    NR_RAMAL,
                    CD_GERENCIA,
                    EMAIL,
                    NR_CPF,
                    NR_RG,
                    NR_CELULAR,
                    SEXO,
                    DT_ADMISSAO,
                    DT_DESLIGAMENTO,
                    NR_MATRICULA,
                    NR_CONTA_CORRENTE,
                    DOC_INDENTIDADE: caminhoDocIdentidade,
                    COMP_ENDERECO: caminhoCompEndereco,
                    FICHA_RH: caminhoFichaRh,
                    CERT_NASCIMENTO: caminhoCertNascimento,
                    CERT_CASAMENTO: caminhoCertCasamento,
                    DOC_IDENTIDADE_CONJ: caminhoDocConjuge,
                    FICHA_DESIMPEDIMENTO: caminhoFichaDesimpedimento,
                },
                {} as any
            );

            console.log("rowsAffected editar:", result.rowsAffected);

            if (!result.rowsAffected) {
                return res.status(404).json({
                    error: "Funcionário não encontrado.",
                });
            }

            return res.json({
                ID_FUNCIONARIO: id,
                NM_FUNCIONARIO,
                DOC_INDENTIDADE: caminhoDocIdentidade,
                COMP_ENDERECO: caminhoCompEndereco,
                FICHA_RH: caminhoFichaRh,
                CERT_NASCIMENTO: caminhoCertNascimento,
                CERT_CASAMENTO: caminhoCertCasamento,
                DOC_IDENTIDADE_CONJ: caminhoDocConjuge,
                FICHA_DESIMPEDIMENTO: caminhoFichaDesimpedimento,
                warnings,
            });
        } catch (err: any) {
            console.error("editar funcionario erro:", err);
            return res.status(500).json({
                error: "Falha ao atualizar funcionário.",
                details: String(err?.message || err),
            });
        }
    },

    async ativarDesativar(req: Request, res: Response) {
        try {
            const id = Number(req.params.id || 0);
            const SN_ATIVO = Number(req.body.SN_ATIVO);
            const DT_DESLIGAMENTO = req.body.DT_DESLIGAMENTO || null;
            const ENVIAR_EMAIL_DESLIGAMENTO = isTruthyBody(
                req.body.ENVIAR_EMAIL_DESLIGAMENTO ?? "1"
            );
            const ENVIAR_EMAIL_DESLIGAMENTO_GERAL = isTruthyBody(
                req.body.ENVIAR_EMAIL_DESLIGAMENTO_GERAL
            );
            const ENVIAR_EMAIL_ASSEM = isTruthyBody(req.body.ENVIAR_EMAIL_ASSEM);
            const ENVIAR_EMAIL_GREMIO = isTruthyBody(req.body.ENVIAR_EMAIL_GREMIO);
            const EFETIVACAO_ESTAGIARIO = isTruthyBody(req.body.EFETIVACAO_ESTAGIARIO);
            const warnings: string[] = [];

            if (!id) {
                return res.status(400).json({
                    error: "ID do funcionário inválido.",
                });
            }

            if (![0, 1].includes(SN_ATIVO)) {
                return res.status(400).json({
                    error: "Status inválido para o funcionário.",
                });
            }

            const funcionarioAntes = await buscarFuncionarioCompleto(id);
            const fileFichaDesimpedimento = getUploadedFile(req.files, "FICHA_DESIMPEDIMENTO");
            let caminhoFichaDesimpedimento: string | null = null;

            if (fileFichaDesimpedimento && funcionarioAntes?.NM_FUNCIONARIO) {
                try {
                    caminhoFichaDesimpedimento = await salvarArquivoNoServidorSMB(
                        fileFichaDesimpedimento,
                        funcionarioAntes.NM_FUNCIONARIO
                    );
                } catch (error: any) {
                    console.error("Falha FICHA_DESIMPEDIMENTO no desligamento:", error);
                    warnings.push("Não foi possível salvar a ficha de desimpedimento no servidor de arquivos.");
                }
            }

            const sql = `
        UPDATE DBACRESSEM.FUNCIONARIOS_SICOOB_CRESSEM
        SET
          SN_ATIVO = :SN_ATIVO,
          DT_DESLIGAMENTO = CASE
            WHEN :SN_ATIVO = 0 AND :DT_DESLIGAMENTO IS NOT NULL
              THEN TO_DATE(:DT_DESLIGAMENTO, 'YYYY-MM-DD')
            WHEN :SN_ATIVO = 1
              THEN NULL
            ELSE DT_DESLIGAMENTO
          END,
          FICHA_DESIMPEDIMENTO = COALESCE(:FICHA_DESIMPEDIMENTO, FICHA_DESIMPEDIMENTO)
        WHERE ID_FUNCIONARIO = :ID_FUNCIONARIO
      `;

            const result = await oracleExecuteCommitWithAudit(
                req,
                sql,
                {
                    ID_FUNCIONARIO: id,
                    SN_ATIVO,
                    DT_DESLIGAMENTO,
                    FICHA_DESIMPEDIMENTO: caminhoFichaDesimpedimento,
                },
                {} as any
            );

            if (!result.rowsAffected) {
                return res.status(404).json({
                    error: "Funcionário não encontrado.",
                });
            }

            let emailDesimpedimentoEnviado = false;
            let emailDesimpedimentoErro = "";
            let emailDesativacaoAcessosEnviado = false;
            let emailDesativacaoAcessosErro = "";
            let emailDesligamentoGeralEnviado = false;
            let emailDesligamentoGeralErro = "";

            if (SN_ATIVO === 0 && ENVIAR_EMAIL_DESLIGAMENTO) {
                const funcionarioCompleto = await buscarFuncionarioCompleto(id);

                try {
                    const anexos = fileFichaDesimpedimento
                        ? await montarAnexosEmailFuncionarioDeUploads([fileFichaDesimpedimento])
                        : await montarAnexosEmailFuncionario(
                            [
                                caminhoFichaDesimpedimento ||
                                String(funcionarioCompleto?.FICHA_DESIMPEDIMENTO || "").trim() ||
                                null,
                            ],
                            true
                        );

                    await enviarEmailDesimpedimentoFuncionario(funcionarioCompleto, anexos, {
                        enviarAssem: ENVIAR_EMAIL_ASSEM,
                        enviarGremio: ENVIAR_EMAIL_GREMIO,
                        efetivacaoEstagiario: EFETIVACAO_ESTAGIARIO,
                    });
                    emailDesimpedimentoEnviado = true;
                } catch (emailError: any) {
                    emailDesimpedimentoErro = String(emailError?.message || emailError);
                    console.error("Falha ao enviar e-mail de desimpedimento:", emailError);
                    warnings.push("Funcionário inativado, mas não foi possível enviar o e-mail com a ficha de desimpedimento.");
                }

                try {
                    await enviarEmailDesativacaoAcessosFuncionario(
                        funcionarioCompleto,
                        EFETIVACAO_ESTAGIARIO
                    );
                    emailDesativacaoAcessosEnviado = true;
                } catch (emailError: any) {
                    emailDesativacaoAcessosErro = String(emailError?.message || emailError);
                    console.error("Falha ao enviar e-mail de desativação de acessos:", emailError);
                    warnings.push("Funcionário inativado, mas não foi possível enviar o e-mail de desativação de acessos.");
                }

                if (ENVIAR_EMAIL_DESLIGAMENTO_GERAL) {
                    try {
                        await enviarEmailDesligamentoGeralFuncionario(funcionarioCompleto);
                        emailDesligamentoGeralEnviado = true;
                    } catch (emailError: any) {
                        emailDesligamentoGeralErro = String(emailError?.message || emailError);
                        console.error("Falha ao enviar e-mail geral de desligamento:", emailError);
                        warnings.push("Funcionário inativado, mas não foi possível enviar o e-mail geral de desligamento.");
                    }
                }
            }

            return res.json({
                ID_FUNCIONARIO: id,
                SN_ATIVO,
                FICHA_DESIMPEDIMENTO: caminhoFichaDesimpedimento,
                emailDesimpedimentoEnviado,
                emailDesativacaoAcessosEnviado,
                emailDesligamentoGeralEnviado,
                ...(emailDesimpedimentoErro ? { emailDesimpedimentoErro } : {}),
                ...(emailDesativacaoAcessosErro ? { emailDesativacaoAcessosErro } : {}),
                ...(emailDesligamentoGeralErro ? { emailDesligamentoGeralErro } : {}),
                warnings,
            });
        } catch (err: any) {
            console.error("ativar/desativar funcionario erro:", err);
            return res.status(500).json({
                error: "Falha ao alterar status do funcionário.",
                details: String(err?.message || err),
            });
        }
    },

    async downloadCsv(req: Request, res: Response) {
        try {
            const sql = `
        SELECT
          f.NM_FUNCIONARIO,
          f.SN_ATIVO,
          TO_CHAR(f.DT_NASCIMENTO, 'DD/MM/YYYY') AS DT_NASCIMENTO,
          f.NR_RAMAL,
          s.NM_SETOR,
          c.NM_CARGO
        FROM DBACRESSEM.FUNCIONARIOS_SICOOB_CRESSEM f
        LEFT JOIN DBACRESSEM.SETOR_SICOOB_CRESSEM s
          ON s.ID_SETOR = f.ID_SETOR
        LEFT JOIN DBACRESSEM.CARGO_GERENTES_SICOOB_CRESSEM c
          ON c.ID_CARGO = f.ID_CARGO
        ORDER BY UPPER(f.NM_FUNCIONARIO)
      `;

            const result = await oracleExecute(
                sql,
                {},
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            const rows = result.rows || [];

            const header = ["Nome", "Status", "Nascimento", "Ramal", "Setor", "Cargo"];
            const lines = [header.join(";")];

            rows.forEach((row: any) => {
                lines.push(
                    [
                        escapeCsv(row.NM_FUNCIONARIO),
                        escapeCsv(Number(row.SN_ATIVO) === 1 ? "Ativo" : "Inativo"),
                        escapeCsv(row.DT_NASCIMENTO || ""),
                        escapeCsv(row.NR_RAMAL || ""),
                        escapeCsv(capitalizeWords(row.NM_SETOR || "")),
                        escapeCsv(capitalizeWords(row.NM_CARGO || "")),
                    ].join(";")
                );
            });

            const csv = "\uFEFF" + lines.join("\n");

            res.setHeader("Content-Type", "text/csv; charset=utf-8");
            res.setHeader(
                "Content-Disposition",
                'attachment; filename="funcionarios.csv"'
            );

            return res.status(200).send(csv);
        } catch (err: any) {
            console.error("download csv funcionarios erro:", err);
            return res.status(500).json({
                error: "Falha ao gerar relatório CSV.",
                details: String(err?.message || err),
            });
        }
    },

};
