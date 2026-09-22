import { Request, Response } from "express";
import oracledb from "oracledb";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { execFile } from "child_process";
import { promisify } from "util";
import { getOraclePool } from "../config/oracle.pool";
import { sendEmail } from "../services/email.service";
import { setAuditoriaContext } from "../services/oracle.service";
import { AuthenticatedRequest } from "../middleware/auth.middleware";

const execFileAsync = promisify(execFile);
const SMB_BASE_FOLDER = "CRM/SUBSIDIO_AUDITIVO";

function onlyDigits(value: string) {
  return String(value || "").replace(/\D/g, "");
}

function toNumber(value: any, fallback = 0) {
  if (value === null || value === undefined || value === "") return fallback;
  const n =
    typeof value === "string"
      ? Number(String(value).replace(/\./g, "").replace(",", "."))
      : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

const TIPO_ANEXO_DOCUMENTOS = "DOCUMENTOS_GERAIS";
const TIPO_ANEXO_ORCAMENTOS_NOTA = "ORCAMENTOS_NOTA_FISCAL";
const TIPO_ANEXO_TERMO_ASSINADO = "AUTORIZACAO_ASSINADA_SOLICITANTE";
const TIPO_ANEXO_TERMO_DIRETORIA = "AUTORIZACAO_ASSINADA_DIRETORIA";
const AD_GROUP_SUPORTE = "GG_USERS_SUPORTE";
const AD_GROUP_FINANCEIRO = "GG_USERS_FIN";
const AD_GROUP_FINANCEIRO_CADASTRO = "GG_INTRANET_CADASTRO_FIN";
const AD_GROUP_GERENCIA_DIRETORIA = "GG_USERS_GERENCIA_DIRETORIA";
const USUARIOS_PERFIL_TESTE = [
  "MARCELO.BUENO",
  "MARCELO.BUENO@SICOOB.COM.BR",
];

function toUpperTrim(value: any) {
  return String(value || "").trim().toUpperCase();
}

function hasGroup(grupos: string[], target: string) {
  const alvo = toUpperTrim(target);
  return grupos.some((grupo) => toUpperTrim(grupo) === alvo);
}

function getPerfilTeste(req: AuthenticatedRequest) {
  const perfil = toUpperTrim(req.headers["x-subsidio-auditivo-perfil-teste"]);
  if (!["FINANCEIRO", "DIRETORIA"].includes(perfil)) {
    return null;
  }

  const identificadores = [
    toUpperTrim(req.user?.sub),
    toUpperTrim(req.user?.email),
  ].filter(Boolean);

  return identificadores.some((valor) => USUARIOS_PERFIL_TESTE.includes(valor))
    ? perfil
    : null;
}

function usuarioEhSolicitante(
  usuario: {
    login?: string | null;
    email?: string | null;
    nome?: string | null;
  },
  solicitacao?: any
) {
  const loginUsuario = toUpperTrim(usuario.login);
  const emailUsuario = toUpperTrim(usuario.email);
  const nomeUsuario = toUpperTrim(usuario.nome);
  const loginAbertura = toUpperTrim(solicitacao?.LOGIN_USUARIO_ABERTURA);
  const nomeAbertura = toUpperTrim(solicitacao?.NM_USUARIO_ABERTURA);

  const identificadoresUsuario = [loginUsuario, emailUsuario].filter(Boolean);
  const identificadoresAbertura = [loginAbertura, nomeAbertura].filter(Boolean);

  if (
    identificadoresUsuario.length &&
    identificadoresAbertura.length &&
    identificadoresUsuario.some((valor) => identificadoresAbertura.includes(valor))
  ) {
    return true;
  }

  return Boolean(nomeUsuario) && Boolean(nomeAbertura) && nomeUsuario === nomeAbertura;
}

function normalizarTipoAnexo(tipo: any) {
  const valor = String(tipo || "").trim().toUpperCase();

  if (!valor) return TIPO_ANEXO_DOCUMENTOS;

  if (
    ["DOCUMENTACAO_UNICA", "DOCUMENTOS_GERAIS", "DOCUMENTOS", "DOCUMENTACAO"].includes(
      valor
    )
  ) {
    return TIPO_ANEXO_DOCUMENTOS;
  }

  if (
    ["ORCAMENTOS_NOTA_FISCAL", "ORCAMENTOS", "NOTA_FISCAL_ORCAMENTOS"].includes(
      valor
    )
  ) {
    return TIPO_ANEXO_ORCAMENTOS_NOTA;
  }

  if (
    [
      "AUTORIZACAO_GERADA",
      "AUTORIZACAO_ASSINADA_SOLICITANTE",
      "TERMO_GERADO_ASSINADO",
      "TERMO_ASSINADO",
      "TERMO_SOLICITANTE",
    ].includes(valor)
  ) {
    return TIPO_ANEXO_TERMO_ASSINADO;
  }

  if (
    [
      "AUTORIZACAO_ASSINADA_DIRETORIA",
      "TERMO_ASSINADO_DIRETORIA",
      "TERMO_DIRETORIA",
      "TERMO_DIRETORIA_ASSINADO",
    ].includes(valor)
  ) {
    return TIPO_ANEXO_TERMO_DIRETORIA;
  }

  return valor;
}

function termoAssinadoTravado(status: any) {
  return [
    "AGUARDANDO_FINANCEIRO",
    "AGUARDANDO_DIRETORIA",
    "FINALIZADO",
    "CANCELADO",
  ].includes(String(status || "").trim());
}

function parseJsonIfNeeded<T = any>(value: any, fallback: T): T {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return value as T;
}

function sanitizeFileName(name: string) {
  return String(name || "arquivo")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w.\-]+/g, "_");
}

function sanitizeFolderName(value: string) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, " ");
}

function extFromMime(mime: string) {
  const map: Record<string, string> = {
    "application/pdf": ".pdf",
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/webp": ".webp",
  };

  return map[mime] || ".bin";
}

function parseBase64File(dataUrl: string | null, nomeOriginal?: string | null) {
  if (!dataUrl || typeof dataUrl !== "string") return null;

  const match = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!match) return null;

  const mime = match[1];
  const base64 = match[2];
  const buffer = Buffer.from(base64, "base64");
  let ext = path.extname(nomeOriginal || "");
  if (!ext) ext = extFromMime(mime);

  return {
    buffer,
    mime,
    ext,
    nomeOriginal: sanitizeFileName(nomeOriginal || `arquivo${ext}`),
  };
}

async function ensureDir(dirPath: string) {
  await fs.mkdir(dirPath, { recursive: true });
}

function getBasePath() {
  const server = String(process.env.SMB_SERVER || "10.0.107.251").trim();
  const share = String(process.env.SMB_SHARE || "dados$").trim();

  return (
    process.env.SUBSIDIO_AUDITIVO_BASE_PATH ||
    process.env.SUBSIDIO_FUNERAL_BASE_PATH ||
    `\\\\${server}\\${share}\\${SMB_BASE_FOLDER.replace(/\//g, "\\")}`
  );
}

function isWindowsRuntime() {
  return process.platform === "win32";
}

function isUncPath(filePath: string | null | undefined) {
  const caminho = String(filePath || "");
  return caminho.startsWith("\\\\") || caminho.startsWith("//");
}

function getSmbConfig() {
  const server = String(process.env.SMB_SERVER || "10.0.107.251").trim();
  const share = String(process.env.SMB_SHARE || "dados$").trim();
  const user = String(process.env.SMB_USER || "").trim();
  const password = String(process.env.SMB_PASSWORD || "");
  const domain = String(process.env.SMB_DOMAIN || "").trim();

  if (!server) throw new Error("SMB_SERVER não configurado.");
  if (!share) throw new Error("SMB_SHARE não configurado.");
  if (!user) throw new Error("SMB_USER não configurado.");
  if (!password) throw new Error("SMB_PASSWORD não configurado.");

  return { server, share, user, password, domain };
}

function getSmbShareRootLinux() {
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

  const marcador = `${SMB_BASE_FOLDER}/`;
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

async function salvarAnexoLinux(
  parsed: NonNullable<ReturnType<typeof parseBase64File>>,
  pastaAssociado: string,
  idSolicitacao: number,
  finalName: string
) {
  const diretorioDestino = `${SMB_BASE_FOLDER}/${pastaAssociado}/SOLICITACAO_${idSolicitacao}`;
  const pastasParaGarantir = [
    "CRM",
    SMB_BASE_FOLDER,
    `${SMB_BASE_FOLDER}/${pastaAssociado}`,
    diretorioDestino,
  ];
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "subsidio-auditivo-smb-"));
  const tempFilePath = path.join(tempDir, finalName);

  try {
    for (const pasta of pastasParaGarantir) {
      try {
        await execSmbClient(`mkdir "${pasta}"`);
      } catch {
        // Se a pasta ja existe, o smbclient retorna erro. Pode seguir.
      }
    }

    await fs.writeFile(tempFilePath, parsed.buffer);
    await execSmbClient(`cd "${diretorioDestino}"; put "${tempFilePath}" "${finalName}"`);

    return `${getSmbShareRootLinux()}/${diretorioDestino}/${finalName}`;
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

async function readFileFromSmbLinux(caminhoOriginal: string) {
  const caminhoRelativo = getSmbRelativePath(caminhoOriginal);
  const fileName = path.posix.basename(caminhoRelativo);
  const pastaRemota = path.posix.dirname(caminhoRelativo);
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "subsidio-auditivo-smb-download-"));
  const tempFilePath = path.join(tempDir, fileName);

  try {
    const comando =
      pastaRemota && pastaRemota !== "."
        ? `cd "${pastaRemota}"; get "${fileName}" "${tempFilePath}"`
        : `get "${fileName}" "${tempFilePath}"`;

    await execSmbClient(comando);

    return {
      arquivoBuffer: await fs.readFile(tempFilePath),
      nomeArquivo: fileName,
    };
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

async function removeFileIfExists(filePath: string | null | undefined) {
  if (!filePath) return;
  try {
    if (!isWindowsRuntime() && isUncPath(filePath)) {
      const caminhoRelativo = getSmbRelativePath(filePath);
      const fileName = path.posix.basename(caminhoRelativo);
      const pastaRemota = path.posix.dirname(caminhoRelativo);
      const comando =
        pastaRemota && pastaRemota !== "."
          ? `cd "${pastaRemota}"; del "${fileName}"`
          : `del "${fileName}"`;

      await execSmbClient(comando);
      return;
    }

    await fs.unlink(filePath);
  } catch {
    // ignora
  }
}

async function salvarAnexo(
  dataUrl: string | null,
  nomeOriginal: string | null | undefined,
  idSolicitacao: number,
  indice: number,
  nomeAssociado?: string | null
) {
  const parsed = parseBase64File(dataUrl, nomeOriginal);
  if (!parsed) return null;

  const pastaAssociado = sanitizeFolderName(nomeAssociado || "SEM_ASSOCIADO");
  const finalName = sanitizeFileName(
    `${String(indice + 1).padStart(2, "0")}_${parsed.nomeOriginal}`
  );

  if (!isWindowsRuntime()) {
    return {
      finalPath: await salvarAnexoLinux(parsed, pastaAssociado, idSolicitacao, finalName),
      mime: parsed.mime,
    };
  }

  const baseDir = path.win32.join(
    getBasePath(),
    pastaAssociado,
    `SOLICITACAO_${idSolicitacao}`
  );

  await ensureDir(baseDir);

  const finalPath = path.win32.join(baseDir, finalName);
  await fs.writeFile(finalPath, parsed.buffer);

  return {
    finalPath,
    mime: parsed.mime,
  };
}

function escapeHtml(value: any) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatCpfEmail(value?: string) {
  const cpf = onlyDigits(String(value || ""));
  if (cpf.length !== 11) return escapeHtml(value || "");
  return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`;
}

function formatCurrencyBRL(value: any) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

function montarLinhaInfoEmail(label: string, value: any) {
  return `
    <tr>
      <td style="width:34%;padding:11px 14px;background:#f8faf9;border-bottom:1px solid #e8eeeb;font-weight:700;color:#2f3a35;">
        ${escapeHtml(label)}
      </td>
      <td style="padding:11px 14px;border-bottom:1px solid #e8eeeb;color:#1f2933;">
        ${escapeHtml(value || "-")}
      </td>
    </tr>
  `;
}

function montarWrapperEmail(conteudo: string) {
  return `
    <div style="margin:0;padding:0;background:#f3f6f4;font-family:Arial,Helvetica,sans-serif;color:#1f2933;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;background:#f3f6f4;">
        <tr>
          <td align="center" style="padding:24px 12px;">
            <table role="presentation" cellpadding="0" cellspacing="0" width="760" style="width:100%;max-width:760px;border-collapse:separate;background:#ffffff;border:1px solid #dfe7e2;border-radius:14px;overflow:hidden;">
              ${conteudo}
            </table>
          </td>
        </tr>
      </table>
    </div>
  `;
}

function parseMailList(value: string | string[] | null | undefined) {
  if (Array.isArray(value)) {
    return value
      .flatMap((item) => String(item || "").split(","))
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);
  }

  return String(value || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function addMails(destinatarios: Set<string>, value: string | string[] | null | undefined) {
  for (const email of parseMailList(value)) {
    destinatarios.add(email);
  }
}

function getEmailFinanceiro() {
  return process.env.REEMBOLSO_FINANCEIRO_EMAIL || process.env.FINANCEIRO_EMAIL || "";
}

function getEmailDiretoria() {
  return (
    process.env.SUBSIDIO_AUDITIVO_DIRETORIA_EMAIL ||
    process.env.REEMBOLSO_DIRETORIA_EMAIL ||
    process.env.DIRETORIA_EMAIL ||
    ""
  );
}

function getDebugEmail() {
  return String(
    process.env.SUBSIDIO_AUDITIVO_DEBUG_EMAIL ||
      process.env.SUBSIDIO_FUNERAL_DEBUG_EMAIL ||
      process.env.REEMBOLSO_DEBUG_EMAIL ||
      ""
  )
    .trim()
    .toLowerCase();
}

function aplicarDebugDestinatarios(destinatarios: string[]) {
  const debugEmail = getDebugEmail();
  if (!debugEmail) return destinatarios;
  return [debugEmail];
}

async function buscarContatoFuncionarioPorNome(
  connection: oracledb.Connection,
  nomeFuncionario: string
) {
  const nome = String(nomeFuncionario || "").trim();
  if (!nome) return null;

  const result = await connection.execute(
    `
      SELECT
        TRIM(f.NM_FUNCIONARIO) AS NM_FUNCIONARIO,
        TRIM(f.EMAIL) AS EMAIL
      FROM DBACRESSEM.FUNCIONARIOS_SICOOB_CRESSEM f
      WHERE UPPER(TRIM(f.NM_FUNCIONARIO)) = UPPER(TRIM(:nomeFuncionario))
      FETCH FIRST 1 ROWS ONLY
    `,
    { nomeFuncionario: nome },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  const row: any = result.rows?.[0];
  if (!row) return null;

  return {
    NM_FUNCIONARIO: String(row.NM_FUNCIONARIO || "").trim(),
    EMAIL: String(row.EMAIL || "").trim(),
  };
}

async function buscarContatoFuncionarioPorId(
  connection: oracledb.Connection,
  idFuncionario: number
) {
  if (!idFuncionario) return null;

  const result = await connection.execute(
    `
      SELECT
        TRIM(f.NM_FUNCIONARIO) AS NM_FUNCIONARIO,
        TRIM(f.EMAIL) AS EMAIL
      FROM DBACRESSEM.FUNCIONARIOS_SICOOB_CRESSEM f
      WHERE f.ID_FUNCIONARIO = :idFuncionario
      FETCH FIRST 1 ROWS ONLY
    `,
    { idFuncionario },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  const row: any = result.rows?.[0];
  if (!row) return null;

  return {
    NM_FUNCIONARIO: String(row.NM_FUNCIONARIO || "").trim(),
    EMAIL: String(row.EMAIL || "").trim(),
  };
}

function normalizarNivelHierarquia(value: string) {
  const nivel = String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();

  if (nivel.includes("DIRETOR")) return "DIRETORIA";
  return "";
}

async function buscarFuncionarioHierarquiaPorNome(
  connection: oracledb.Connection,
  nome: string
) {
  const result = await connection.execute(
    `
      SELECT
        f.ID_FUNCIONARIO,
        f.CD_GERENCIA,
        UPPER(TRIM(NVL(c.NM_NIVEL, ''))) AS NM_NIVEL
      FROM DBACRESSEM.FUNCIONARIOS_SICOOB_CRESSEM f
      LEFT JOIN DBACRESSEM.CARGO_GERENTES_SICOOB_CRESSEM c
        ON c.ID_CARGO = f.ID_CARGO
      WHERE UPPER(TRIM(f.NM_FUNCIONARIO)) = UPPER(TRIM(:nome))
      FETCH FIRST 1 ROWS ONLY
    `,
    { nome: String(nome || "").trim() },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  return (result.rows?.[0] as any) || null;
}

async function buscarNivelPorIdFuncionario(
  connection: oracledb.Connection,
  idFuncionario: number
) {
  const result = await connection.execute(
    `
      SELECT
        f.ID_FUNCIONARIO,
        f.CD_GERENCIA,
        UPPER(TRIM(NVL(c.NM_NIVEL, ''))) AS NM_NIVEL
      FROM DBACRESSEM.FUNCIONARIOS_SICOOB_CRESSEM f
      LEFT JOIN DBACRESSEM.CARGO_GERENTES_SICOOB_CRESSEM c
        ON c.ID_CARGO = f.ID_CARGO
      WHERE f.ID_FUNCIONARIO = :idFuncionario
      FETCH FIRST 1 ROWS ONLY
    `,
    { idFuncionario },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  return (result.rows?.[0] as any) || null;
}

async function buscarEmailDiretoriaPorHierarquia(
  connection: oracledb.Connection,
  nomeUsuarioAbertura: string
) {
  const solicitante = await buscarFuncionarioHierarquiaPorNome(
    connection,
    nomeUsuarioAbertura
  );

  let proximoId = Number(solicitante?.CD_GERENCIA || 0);
  const visitados = new Set<number>();
  let limite = 0;

  while (proximoId && !visitados.has(proximoId) && limite < 20) {
    visitados.add(proximoId);
    limite += 1;

    const superior = await buscarNivelPorIdFuncionario(connection, proximoId);
    if (!superior) break;

    if (normalizarNivelHierarquia(String(superior.NM_NIVEL || "")) === "DIRETORIA") {
      const contato = await buscarContatoFuncionarioPorId(
        connection,
        Number(superior.ID_FUNCIONARIO || 0)
      );
      return contato?.EMAIL || "";
    }

    proximoId = Number(superior.CD_GERENCIA || 0);
  }

  return "";
}

function montarHtmlEmailSubsidio(params: {
  idSolicitacao: number;
  titulo: string;
  introducao: string;
  solicitacao: any;
  observacao?: string | null;
}) {
  const conteudo = `
    <tr>
      <td style="background:#006b3f;padding:22px 26px;color:#ffffff;">
        <div style="font-size:12px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;opacity:.9;">
          subsídio auditivo
        </div>
        <h2 style="margin:6px 0 0;font-size:22px;line-height:1.3;font-weight:700;">
          ${escapeHtml(params.titulo)}
        </h2>
      </td>
    </tr>
    <tr>
      <td style="padding:24px 26px;">
        <p style="margin:0 0 18px;font-size:14px;line-height:1.6;color:#4b5563;">
          ${escapeHtml(params.introducao)}
        </p>
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:separate;border-spacing:0;border:1px solid #e1e8e4;border-radius:10px;overflow:hidden;margin-bottom:18px;">
          ${montarLinhaInfoEmail("Status", params.solicitacao.ST_SOLICITACAO)}
          ${montarLinhaInfoEmail("Associado solicitante", params.solicitacao.NM_ASSOCIADO)}
          ${montarLinhaInfoEmail("CPF associado", formatCpfEmail(params.solicitacao.NR_CPF_ASSOCIADO))}
          ${montarLinhaInfoEmail("Matrícula", params.solicitacao.NR_MATRICULA_ASSOCIADO)}
          ${montarLinhaInfoEmail("Órgão / local", params.solicitacao.NM_ORGAO_ASSOCIADO)}
          ${montarLinhaInfoEmail("Valor liberado", formatCurrencyBRL(params.solicitacao.VL_SUBSIDIO_APROVADO))}
          ${params.observacao ? montarLinhaInfoEmail("Observação", params.observacao) : ""}
        </table>
        <p style="margin:0;font-size:12px;line-height:1.5;color:#6b7280;">
          Este e-mail foi enviado automaticamente pelo sistema.
        </p>
      </td>
    </tr>
  `;

  return montarWrapperEmail(conteudo);
}

async function enviarEmailFluxoSubsidio(
  connection: oracledb.Connection,
  params: {
    idSolicitacao: number;
    solicitacao: any;
    tipo: "FINANCEIRO" | "DIRETORIA" | "SOLICITANTE" | "FINANCEIRO_SOLICITANTE";
    titulo: string;
    introducao: string;
    observacao?: string | null;
  }
) {
  const destinatarios = new Set<string>();

  if (params.tipo === "FINANCEIRO" || params.tipo === "FINANCEIRO_SOLICITANTE") {
    addMails(destinatarios, getEmailFinanceiro());
  }

  if (params.tipo === "DIRETORIA") {
    addMails(destinatarios, getEmailDiretoria());
    if (!destinatarios.size) {
      addMails(
        destinatarios,
        await buscarEmailDiretoriaPorHierarquia(
          connection,
          String(params.solicitacao.NM_USUARIO_ABERTURA || "")
        )
      );
    }
  }

  if (params.tipo === "SOLICITANTE" || params.tipo === "FINANCEIRO_SOLICITANTE") {
    const contato = await buscarContatoFuncionarioPorNome(
      connection,
      String(params.solicitacao.NM_USUARIO_ABERTURA || "")
    );
    addMails(destinatarios, contato?.EMAIL);
    addMails(destinatarios, String(params.solicitacao.LOGIN_USUARIO_ABERTURA || "").includes("@") ? params.solicitacao.LOGIN_USUARIO_ABERTURA : "");
  }

  const emailsOriginais = Array.from(destinatarios);
  const emails = aplicarDebugDestinatarios(emailsOriginais);
  if (!emails.length) {
    return {
      enviado: false,
      destinatarios: [],
      motivo: "Nenhum destinatário configurado/encontrado para esta transição.",
    };
  }

  const subject = `subsídio auditivo - ${params.titulo}`;
  const html = montarHtmlEmailSubsidio({
    idSolicitacao: params.idSolicitacao,
    titulo: params.titulo,
    introducao: params.introducao,
    solicitacao: params.solicitacao,
    observacao: params.observacao,
  });

  await sendEmail(emails, subject, html);

  return {
    enviado: true,
    destinatarios: emails,
    destinatarios_originais: emailsOriginais,
    debug_email_ativo: Boolean(getDebugEmail()),
    subject,
  };
}

async function inserirHistorico(
  connection: oracledb.Connection,
  params: {
    idSolicitacao: number;
    statusAnterior?: string | null;
    statusNovo: string;
    acao: string;
    observacao?: string | null;
    nomeUsuario?: string | null;
    loginUsuario?: string | null;
  }
) {
  await connection.execute(
    `
      INSERT INTO DBACRESSEM.SUBSIDIO_AUDITIVO_HISTORICO (
        ID_SUBSIDIO_AUDITIVO,
        ST_ANTERIOR,
        ST_NOVO,
        DS_ACAO,
        DS_OBSERVACAO,
        NM_USUARIO,
        LOGIN_USUARIO,
        DT_ACAO
      ) VALUES (
        :ID_SUBSIDIO_AUDITIVO,
        :ST_ANTERIOR,
        :ST_NOVO,
        :DS_ACAO,
        :DS_OBSERVACAO,
        :NM_USUARIO,
        :LOGIN_USUARIO,
        SYSDATE
      )
    `,
    {
      ID_SUBSIDIO_AUDITIVO: params.idSolicitacao,
      ST_ANTERIOR: params.statusAnterior || null,
      ST_NOVO: params.statusNovo,
      DS_ACAO: params.acao,
      DS_OBSERVACAO: params.observacao || null,
      NM_USUARIO: params.nomeUsuario || null,
      LOGIN_USUARIO: params.loginUsuario || null,
    },
    { autoCommit: false }
  );
}

function validarCadastro(body: any) {
  const anexos = parseJsonIfNeeded<any[]>(body.ANEXOS, []);
  const possuiDocumentacao = anexos.some(
    (item) => normalizarTipoAnexo(item?.TP_ANEXO) === TIPO_ANEXO_DOCUMENTOS
  );
  const possuiOrcamentosNota = anexos.some(
    (item) => normalizarTipoAnexo(item?.TP_ANEXO) === TIPO_ANEXO_ORCAMENTOS_NOTA
  );

  if (!String(body.NM_ASSOCIADO || "").trim()) return "Preencha o nome do associado.";
  if (onlyDigits(body.NR_CPF_ASSOCIADO).length !== 11) return "CPF do associado inválido.";
  if (!String(body.NM_ORGAO_ASSOCIADO || "").trim()) return "Preencha o órgão ou local de trabalho do associado.";
  if (!String(body.NR_CELULAR || "").trim()) return "Preencha o celular para contato.";
  if (toNumber(body.VL_CUSTO_APARELHO, -1) < 0) return "Informe o custo do aparelho.";
  if (toNumber(body.VL_SUBSIDIO_APROVADO, -1) < 0) return "Informe o valor liberado.";
  if (!String(body.NM_PRESTADOR_SERVICO || "").trim()) return "Preencha o nome do prestador de serviço.";
  if (!onlyDigits(body.NR_CPF_CNPJ_PRESTADOR || "").trim()) return "Preencha o CPF/CNPJ do prestador de serviço.";
  if (!String(body.CD_BANCO || "").trim()) return "Preencha o código do banco.";
  if (!String(body.NM_BANCO || "").trim()) return "Preencha o nome do banco.";
  if (!String(body.CD_AGENCIA || "").trim()) return "Preencha a agência.";
  if (!String(body.NR_CONTA || "").trim()) return "Preencha a conta.";
  if (!String(body.TP_CONTA || "").trim()) return "Selecione o tipo de conta.";
  if (!possuiDocumentacao) return "Anexe os documentos pessoais / obrigatórios antes de salvar a solicitação.";
  if (!possuiOrcamentosNota) return "Anexe o arquivo de orçamentos / nota fiscal antes de salvar a solicitação.";
  return null;
}

function possuiAnexoLista(anexos: any[], tipo: string) {
  return Array.isArray(anexos)
    ? anexos.some((item) => normalizarTipoAnexo(item?.TP_ANEXO || item?.tipo) === tipo)
    : false;
}

async function buscarSolicitacao(connection: oracledb.Connection, id: number) {
  const result = await connection.execute(
    `
      SELECT
        s.*,
        TO_CHAR(s.DT_SOLICITACAO, 'YYYY-MM-DD') AS DT_SOLICITACAO_FMT,
        TO_CHAR(s.DT_ASSOCIACAO, 'YYYY-MM-DD') AS DT_ASSOCIACAO_FMT,
        TO_CHAR(s.DT_LIMITE_NOTA_FISCAL, 'YYYY-MM-DD') AS DT_LIMITE_NOTA_FISCAL_FMT,
        TO_CHAR(s.DT_ENVIO_DIRETORIA, 'YYYY-MM-DD') AS DT_ENVIO_DIRETORIA_FMT,
        TO_CHAR(s.DT_APROVACAO_DIRETORIA, 'YYYY-MM-DD') AS DT_APROVACAO_DIRETORIA_FMT,
        TO_CHAR(s.DT_ENVIO_FINANCEIRO, 'YYYY-MM-DD') AS DT_ENVIO_FINANCEIRO_FMT,
        TO_CHAR(s.DT_FINALIZACAO, 'YYYY-MM-DD') AS DT_FINALIZACAO_FMT,
        TO_CHAR(s.DT_CRIACAO, 'YYYY-MM-DD') AS DT_CRIACAO_FMT,
        TO_CHAR(s.DT_ATUALIZACAO, 'YYYY-MM-DD') AS DT_ATUALIZACAO_FMT
      FROM DBACRESSEM.SOLICITACAO_SUBSIDIO_AUDITIVO s
      WHERE s.ID_SUBSIDIO_AUDITIVO = :id
    `,
    { id },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  return (result.rows?.[0] as any) || null;
}

async function buscarAnexos(connection: oracledb.Connection, id: number) {
  const result = await connection.execute(
    `
      SELECT
        a.ID_SUBSIDIO_AUDITIVO_ANEXO,
        a.ID_SUBSIDIO_AUDITIVO,
        a.TP_ANEXO,
        a.NM_ARQUIVO_ORIGINAL,
        a.DS_CAMINHO_ARQUIVO,
        a.DS_MIME_TYPE,
        a.NR_TAMANHO_BYTES,
        a.NM_USUARIO_UPLOAD,
        a.LOGIN_USUARIO_UPLOAD,
        TO_CHAR(a.DT_UPLOAD, 'YYYY-MM-DD HH24:MI:SS') AS DT_UPLOAD,
        a.SN_ATIVO
      FROM DBACRESSEM.SUBSIDIO_AUDITIVO_ANEXO a
      WHERE a.ID_SUBSIDIO_AUDITIVO = :id
        AND NVL(a.SN_ATIVO, 1) = 1
      ORDER BY a.ID_SUBSIDIO_AUDITIVO_ANEXO
    `,
    { id },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  return (result.rows || []) as any[];
}

function possuiAnexo(anexos: any[], tipo: string) {
  const tipoNormalizado = normalizarTipoAnexo(tipo);
  return anexos.some((item) => normalizarTipoAnexo(item.TP_ANEXO) === tipoNormalizado);
}

function getPerfilPermissaoSubsidio(req: AuthenticatedRequest, solicitacao?: any) {
  const loginUsuario = String(req.user?.sub || "").trim();
  const emailUsuario = String(req.user?.email || "").trim();
  const nomeUsuario = String(req.user?.nome_completo || "").trim();
  const grupos = Array.isArray(req.user?.grupos) ? req.user!.grupos! : [];
  const perfilTeste = getPerfilTeste(req);

  const isSuporte = hasGroup(grupos, AD_GROUP_SUPORTE);
  const isFinanceiro =
    perfilTeste === "FINANCEIRO" ||
    hasGroup(grupos, AD_GROUP_FINANCEIRO) ||
    hasGroup(grupos, AD_GROUP_FINANCEIRO_CADASTRO);
  const isDiretoria =
    perfilTeste === "DIRETORIA" ||
    hasGroup(grupos, AD_GROUP_GERENCIA_DIRETORIA);
  const isSolicitanteAtual = usuarioEhSolicitante(
    {
      login: loginUsuario,
      email: emailUsuario,
      nome: nomeUsuario,
    },
    solicitacao
  ) && !perfilTeste;

  return {
    isSuporte,
    isFinanceiro,
    isDiretoria,
    isSolicitanteAtual,
    perfilTeste,
    podeVisualizar: isSuporte || isFinanceiro || isDiretoria || isSolicitanteAtual,
  };
}

async function buscarHistorico(connection: oracledb.Connection, id: number) {
  const result = await connection.execute(
    `
      SELECT
        h.ID_SUBSIDIO_AUDITIVO_HIST,
        h.ST_ANTERIOR,
        h.ST_NOVO,
        h.DS_ACAO,
        h.DS_OBSERVACAO,
        h.NM_USUARIO,
        h.LOGIN_USUARIO,
        TO_CHAR(h.DT_ACAO, 'YYYY-MM-DD HH24:MI:SS') AS DT_ACAO
      FROM DBACRESSEM.SUBSIDIO_AUDITIVO_HISTORICO h
      WHERE h.ID_SUBSIDIO_AUDITIVO = :id
      ORDER BY h.ID_SUBSIDIO_AUDITIVO_HIST
    `,
    { id },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  return (result.rows || []) as any[];
}

export const solicitacaoSubsidioAuditivoController = {
  async cadastrar(req: Request, res: Response) {
    const erro = validarCadastro(req.body);
    if (erro) return res.status(400).json({ error: erro });

    const pool = await getOraclePool();
    const connection = await pool.getConnection();

    try {
      setAuditoriaContext(connection, req);

      const anexos = parseJsonIfNeeded<any[]>(req.body.ANEXOS, []);

      const insertResult = await connection.execute(
        `
          INSERT INTO DBACRESSEM.SOLICITACAO_SUBSIDIO_AUDITIVO (
            ST_SOLICITACAO,
            DT_SOLICITACAO,
            NM_USUARIO_ABERTURA,
            LOGIN_USUARIO_ABERTURA,
            ID_ASSOCIADO,
            NR_CPF_ASSOCIADO,
            NM_ASSOCIADO,
            NR_MATRICULA_ASSOCIADO,
            NM_ORGAO_ASSOCIADO,
            DS_FUNCAO_ASSOCIADO,
            DT_ASSOCIACAO,
            NR_CELULAR,
            NR_TELEFONE_RESIDENCIAL,
            VL_NIVEL_INTEGRALIZACAO,
            VL_CAPITAL,
            DS_ORCAMENTOS,
            VL_CUSTO_APARELHO,
            VL_SUBSIDIO_APROVADO,
            NM_PRESTADOR_SERVICO,
            NR_CPF_CNPJ_PRESTADOR,
            DS_INFORMACOES_ADICIONAIS,
            DT_LIMITE_NOTA_FISCAL,
            CD_BANCO,
            NM_BANCO,
            CD_AGENCIA,
            NR_CONTA,
            TP_CONTA,
            DS_MOTIVO_DEVOLUCAO,
            DT_CRIACAO,
            SN_ATIVO
          ) VALUES (
            :ST_SOLICITACAO,
            NVL(TO_DATE(:DT_SOLICITACAO, 'YYYY-MM-DD'), SYSDATE),
            :NM_USUARIO_ABERTURA,
            :LOGIN_USUARIO_ABERTURA,
            :ID_ASSOCIADO,
            :NR_CPF_ASSOCIADO,
            :NM_ASSOCIADO,
            :NR_MATRICULA_ASSOCIADO,
            :NM_ORGAO_ASSOCIADO,
            :DS_FUNCAO_ASSOCIADO,
            TO_DATE(:DT_ASSOCIACAO, 'YYYY-MM-DD'),
            :NR_CELULAR,
            :NR_TELEFONE_RESIDENCIAL,
            :VL_NIVEL_INTEGRALIZACAO,
            :VL_CAPITAL,
            :DS_ORCAMENTOS,
            :VL_CUSTO_APARELHO,
            :VL_SUBSIDIO_APROVADO,
            :NM_PRESTADOR_SERVICO,
            :NR_CPF_CNPJ_PRESTADOR,
            :DS_INFORMACOES_ADICIONAIS,
            TO_DATE(:DT_LIMITE_NOTA_FISCAL, 'YYYY-MM-DD'),
            :CD_BANCO,
            :NM_BANCO,
            :CD_AGENCIA,
            :NR_CONTA,
            :TP_CONTA,
            :DS_MOTIVO_DEVOLUCAO,
            SYSDATE,
            1
          )
          RETURNING ID_SUBSIDIO_AUDITIVO INTO :ID_SUBSIDIO_AUDITIVO_OUT
        `,
        {
          ST_SOLICITACAO: String(req.body.ST_SOLICITACAO || "AGUARDANDO_ASSINATURA_SOLICITANTE").trim(),
          DT_SOLICITACAO: String(req.body.DT_SOLICITACAO || "").trim() || null,
          NM_USUARIO_ABERTURA: String(req.body.NM_USUARIO_ABERTURA || "").trim() || null,
          LOGIN_USUARIO_ABERTURA: String(req.body.LOGIN_USUARIO_ABERTURA || "").trim() || null,
          ID_ASSOCIADO: req.body.ID_ASSOCIADO ? Number(req.body.ID_ASSOCIADO) : null,
          NR_CPF_ASSOCIADO: onlyDigits(req.body.NR_CPF_ASSOCIADO),
          NM_ASSOCIADO: String(req.body.NM_ASSOCIADO || "").trim(),
          NR_MATRICULA_ASSOCIADO: String(req.body.NR_MATRICULA_ASSOCIADO || "").trim() || null,
          NM_ORGAO_ASSOCIADO: String(req.body.NM_ORGAO_ASSOCIADO || "").trim() || null,
          DS_FUNCAO_ASSOCIADO: String(req.body.DS_FUNCAO_ASSOCIADO || "").trim() || null,
          DT_ASSOCIACAO: String(req.body.DT_ASSOCIACAO || "").trim() || null,
          NR_CELULAR: String(req.body.NR_CELULAR || "").trim() || null,
          NR_TELEFONE_RESIDENCIAL: String(req.body.NR_TELEFONE_RESIDENCIAL || "").trim() || null,
          VL_NIVEL_INTEGRALIZACAO: toNumber(req.body.VL_NIVEL_INTEGRALIZACAO),
          VL_CAPITAL: toNumber(req.body.VL_CAPITAL),
          DS_ORCAMENTOS: String(req.body.DS_ORCAMENTOS || "").trim() || null,
          VL_CUSTO_APARELHO: toNumber(req.body.VL_CUSTO_APARELHO),
          VL_SUBSIDIO_APROVADO: toNumber(req.body.VL_SUBSIDIO_APROVADO),
          NM_PRESTADOR_SERVICO: String(req.body.NM_PRESTADOR_SERVICO || "").trim() || null,
          NR_CPF_CNPJ_PRESTADOR: onlyDigits(req.body.NR_CPF_CNPJ_PRESTADOR || ""),
          DS_INFORMACOES_ADICIONAIS: String(req.body.DS_INFORMACOES_ADICIONAIS || "").trim() || null,
          DT_LIMITE_NOTA_FISCAL: String(req.body.DT_LIMITE_NOTA_FISCAL || "").trim() || null,
          CD_BANCO: String(req.body.CD_BANCO || "").trim() || null,
          NM_BANCO: String(req.body.NM_BANCO || "").trim() || null,
          CD_AGENCIA: String(req.body.CD_AGENCIA || "").trim() || null,
          NR_CONTA: String(req.body.NR_CONTA || "").trim() || null,
          TP_CONTA: String(req.body.TP_CONTA || "").trim() || null,
          DS_MOTIVO_DEVOLUCAO: String(req.body.DS_MOTIVO_DEVOLUCAO || "").trim() || null,
          ID_SUBSIDIO_AUDITIVO_OUT: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
        },
        { autoCommit: false }
      );

      const idSolicitacao = Number(
        ((insertResult.outBinds as any)?.ID_SUBSIDIO_AUDITIVO_OUT || [])[0]
      );

      if (!Number.isFinite(idSolicitacao) || idSolicitacao <= 0) {
        throw new Error("Não foi possível obter o ID gerado da solicitação.");
      }

      for (let i = 0; i < anexos.length; i++) {
        const anexo = anexos[i];
        const salvo = await salvarAnexo(
          anexo.ARQUIVO || null,
          anexo.NM_ARQUIVO_ORIGINAL || null,
          idSolicitacao,
          i,
          req.body.NM_ASSOCIADO
        );

        await connection.execute(
          `
            INSERT INTO DBACRESSEM.SUBSIDIO_AUDITIVO_ANEXO (
              ID_SUBSIDIO_AUDITIVO,
              TP_ANEXO,
              NM_ARQUIVO_ORIGINAL,
              DS_CAMINHO_ARQUIVO,
              DS_MIME_TYPE,
              NR_TAMANHO_BYTES,
              NM_USUARIO_UPLOAD,
              LOGIN_USUARIO_UPLOAD,
              DT_UPLOAD,
              SN_ATIVO
            ) VALUES (
              :ID_SUBSIDIO_AUDITIVO,
              :TP_ANEXO,
              :NM_ARQUIVO_ORIGINAL,
              :DS_CAMINHO_ARQUIVO,
              :DS_MIME_TYPE,
              :NR_TAMANHO_BYTES,
              :NM_USUARIO_UPLOAD,
              :LOGIN_USUARIO_UPLOAD,
              SYSDATE,
              1
            )
          `,
          {
            ID_SUBSIDIO_AUDITIVO: idSolicitacao,
            TP_ANEXO: normalizarTipoAnexo(anexo.TP_ANEXO),
            NM_ARQUIVO_ORIGINAL: String(anexo.NM_ARQUIVO_ORIGINAL || "arquivo").trim(),
            DS_CAMINHO_ARQUIVO: salvo?.finalPath || null,
            DS_MIME_TYPE: salvo?.mime || null,
            NR_TAMANHO_BYTES: Number(anexo.NR_TAMANHO_BYTES || 0) || null,
            NM_USUARIO_UPLOAD: String(req.body.NM_USUARIO_ABERTURA || "").trim() || null,
            LOGIN_USUARIO_UPLOAD: String(req.body.LOGIN_USUARIO_ABERTURA || "").trim() || null,
          },
          { autoCommit: false }
        );
      }

      await inserirHistorico(connection, {
        idSolicitacao,
        statusNovo: String(req.body.ST_SOLICITACAO || "AGUARDANDO_ASSINATURA_SOLICITANTE").trim(),
        acao: "CRIACAO",
        observacao: "Solicitação criada.",
        nomeUsuario: req.body.NM_USUARIO_ABERTURA,
        loginUsuario: req.body.LOGIN_USUARIO_ABERTURA,
      });

      await connection.commit();

      return res.status(201).json({
        ok: true,
        id: idSolicitacao,
        message: "Solicitação de subsídio auditivo cadastrada com sucesso.",
      });
    } catch (err: any) {
      await connection.rollback();
      console.error("cadastrar Subsidio Auditivo erro:", err);
      return res.status(500).json({
        error: "Falha ao cadastrar solicitação de subsídio auditivo.",
        details: String(err?.message || err),
      });
    } finally {
      await connection.close();
    }
  },

  async editar(req: AuthenticatedRequest, res: Response) {
    const idSolicitacao = Number(req.body.ID_SUBSIDIO_AUDITIVO);
    if (!Number.isFinite(idSolicitacao) || idSolicitacao <= 0) {
      return res.status(400).json({ error: "ID_SUBSIDIO_AUDITIVO inválido." });
    }

    const erro = validarCadastro(req.body);
    if (erro) return res.status(400).json({ error: erro });

    const pool = await getOraclePool();
    const connection = await pool.getConnection();

    try {
      setAuditoriaContext(connection, req);

      const atual = await buscarSolicitacao(connection, idSolicitacao);
      if (!atual) {
        return res.status(404).json({ error: "Solicitação não encontrada." });
      }

      const perfil = getPerfilPermissaoSubsidio(req, atual);
      if (!perfil.podeVisualizar) {
        return res.status(403).json({
          error: "Você não tem permissão para editar esta solicitação.",
        });
      }

      if (!perfil.isSolicitanteAtual) {
        return res.status(403).json({
          error: "Somente quem abriu a solicitação pode editar este cadastro.",
        });
      }

      let anexos = parseJsonIfNeeded<any[]>(req.body.ANEXOS, []);
      const anexosAtuais = await buscarAnexos(connection, idSolicitacao);
      const termoAssinadoAtual = anexosAtuais.find(
        (item) => normalizarTipoAnexo(item.TP_ANEXO) === TIPO_ANEXO_TERMO_ASSINADO
      );

      const retornandoAoAtendimento =
        String(atual.ST_SOLICITACAO || "").trim() === "DEVOLVIDO_AO_ATENDIMENTO";

      if (termoAssinadoAtual && (termoAssinadoTravado(atual.ST_SOLICITACAO) || retornandoAoAtendimento)) {
        anexos = anexos.filter(
          (item) => normalizarTipoAnexo(item.TP_ANEXO) !== TIPO_ANEXO_TERMO_ASSINADO
        );
        anexos.push({
          TP_ANEXO: TIPO_ANEXO_TERMO_ASSINADO,
          NM_ARQUIVO_ORIGINAL: termoAssinadoAtual.NM_ARQUIVO_ORIGINAL,
          DS_CAMINHO_ARQUIVO: termoAssinadoAtual.DS_CAMINHO_ARQUIVO,
          DS_MIME_TYPE: termoAssinadoAtual.DS_MIME_TYPE,
          NR_TAMANHO_BYTES: termoAssinadoAtual.NR_TAMANHO_BYTES,
          ARQUIVO: null,
        });
      }

      if (retornandoAoAtendimento) {
        if (!possuiAnexoLista(anexos, TIPO_ANEXO_DOCUMENTOS)) {
          return res.status(400).json({
            error: "Na devolução, mantenha ou reenvie os documentos pessoais / obrigatórios antes de salvar.",
          });
        }

        if (!possuiAnexoLista(anexos, TIPO_ANEXO_ORCAMENTOS_NOTA)) {
          return res.status(400).json({
            error: "Na devolução, mantenha ou reenvie o arquivo de orçamentos / nota fiscal antes de salvar.",
          });
        }

        if (!possuiAnexoLista(anexos, TIPO_ANEXO_TERMO_ASSINADO)) {
          return res.status(400).json({
            error: "O termo assinado pelo solicitante já precisa estar anexado para reenviar a solicitação.",
          });
        }
      }

      const dadosPersistidos = retornandoAoAtendimento
        ? {
            ...atual,
            DT_ASSOCIACAO: atual.DT_ASSOCIACAO_FMT,
            DT_LIMITE_NOTA_FISCAL: atual.DT_LIMITE_NOTA_FISCAL_FMT,
          }
        : req.body;

      await connection.execute(
        `
          UPDATE DBACRESSEM.SOLICITACAO_SUBSIDIO_AUDITIVO
             SET ID_ASSOCIADO = :ID_ASSOCIADO,
                 NR_CPF_ASSOCIADO = :NR_CPF_ASSOCIADO,
                 NM_ASSOCIADO = :NM_ASSOCIADO,
                 NR_MATRICULA_ASSOCIADO = :NR_MATRICULA_ASSOCIADO,
                 NM_ORGAO_ASSOCIADO = :NM_ORGAO_ASSOCIADO,
                 DS_FUNCAO_ASSOCIADO = :DS_FUNCAO_ASSOCIADO,
                 DT_ASSOCIACAO = TO_DATE(:DT_ASSOCIACAO, 'YYYY-MM-DD'),
                 NR_CELULAR = :NR_CELULAR,
                 NR_TELEFONE_RESIDENCIAL = :NR_TELEFONE_RESIDENCIAL,
                 VL_NIVEL_INTEGRALIZACAO = :VL_NIVEL_INTEGRALIZACAO,
                 VL_CAPITAL = :VL_CAPITAL,
                 DS_ORCAMENTOS = :DS_ORCAMENTOS,
                 VL_CUSTO_APARELHO = :VL_CUSTO_APARELHO,
                 VL_SUBSIDIO_APROVADO = :VL_SUBSIDIO_APROVADO,
                 NM_PRESTADOR_SERVICO = :NM_PRESTADOR_SERVICO,
                 NR_CPF_CNPJ_PRESTADOR = :NR_CPF_CNPJ_PRESTADOR,
                 DS_INFORMACOES_ADICIONAIS = :DS_INFORMACOES_ADICIONAIS,
                 DT_LIMITE_NOTA_FISCAL = TO_DATE(:DT_LIMITE_NOTA_FISCAL, 'YYYY-MM-DD'),
                 CD_BANCO = :CD_BANCO,
                 NM_BANCO = :NM_BANCO,
                 CD_AGENCIA = :CD_AGENCIA,
                 NR_CONTA = :NR_CONTA,
                 TP_CONTA = :TP_CONTA,
                 DS_MOTIVO_DEVOLUCAO = :DS_MOTIVO_DEVOLUCAO,
                 ST_SOLICITACAO = :ST_SOLICITACAO,
                 DT_ENVIO_DIRETORIA = CASE WHEN :RETORNANDO_AO_ATENDIMENTO = 1 THEN NULL ELSE DT_ENVIO_DIRETORIA END,
                 DT_ENVIO_FINANCEIRO = CASE WHEN :RETORNANDO_AO_ATENDIMENTO = 1 THEN SYSDATE ELSE DT_ENVIO_FINANCEIRO END,
                 DT_ATUALIZACAO = SYSDATE
           WHERE ID_SUBSIDIO_AUDITIVO = :ID_SUBSIDIO_AUDITIVO
        `,
        {
          ID_SUBSIDIO_AUDITIVO: idSolicitacao,
          ID_ASSOCIADO: dadosPersistidos.ID_ASSOCIADO ? Number(dadosPersistidos.ID_ASSOCIADO) : null,
          NR_CPF_ASSOCIADO: onlyDigits(dadosPersistidos.NR_CPF_ASSOCIADO),
          NM_ASSOCIADO: String(dadosPersistidos.NM_ASSOCIADO || "").trim(),
          NR_MATRICULA_ASSOCIADO: String(dadosPersistidos.NR_MATRICULA_ASSOCIADO || "").trim() || null,
          NM_ORGAO_ASSOCIADO: String(dadosPersistidos.NM_ORGAO_ASSOCIADO || "").trim() || null,
          DS_FUNCAO_ASSOCIADO: String(dadosPersistidos.DS_FUNCAO_ASSOCIADO || "").trim() || null,
          DT_ASSOCIACAO: String(dadosPersistidos.DT_ASSOCIACAO || "").trim() || null,
          NR_CELULAR: String(dadosPersistidos.NR_CELULAR || "").trim() || null,
          NR_TELEFONE_RESIDENCIAL: String(dadosPersistidos.NR_TELEFONE_RESIDENCIAL || "").trim() || null,
          VL_NIVEL_INTEGRALIZACAO: toNumber(dadosPersistidos.VL_NIVEL_INTEGRALIZACAO),
          VL_CAPITAL: toNumber(dadosPersistidos.VL_CAPITAL),
          DS_ORCAMENTOS: String(dadosPersistidos.DS_ORCAMENTOS || "").trim() || null,
          VL_CUSTO_APARELHO: toNumber(dadosPersistidos.VL_CUSTO_APARELHO),
          VL_SUBSIDIO_APROVADO: toNumber(dadosPersistidos.VL_SUBSIDIO_APROVADO),
          NM_PRESTADOR_SERVICO: String(dadosPersistidos.NM_PRESTADOR_SERVICO || "").trim() || null,
          NR_CPF_CNPJ_PRESTADOR: onlyDigits(dadosPersistidos.NR_CPF_CNPJ_PRESTADOR || ""),
          DS_INFORMACOES_ADICIONAIS: String(dadosPersistidos.DS_INFORMACOES_ADICIONAIS || "").trim() || null,
          DT_LIMITE_NOTA_FISCAL: String(dadosPersistidos.DT_LIMITE_NOTA_FISCAL || "").trim() || null,
          CD_BANCO: String(dadosPersistidos.CD_BANCO || "").trim() || null,
          NM_BANCO: String(dadosPersistidos.NM_BANCO || "").trim() || null,
          CD_AGENCIA: String(dadosPersistidos.CD_AGENCIA || "").trim() || null,
          NR_CONTA: String(dadosPersistidos.NR_CONTA || "").trim() || null,
          TP_CONTA: String(dadosPersistidos.TP_CONTA || "").trim() || null,
          DS_MOTIVO_DEVOLUCAO: retornandoAoAtendimento ? null : String(req.body.DS_MOTIVO_DEVOLUCAO || "").trim() || null,
          ST_SOLICITACAO: retornandoAoAtendimento ? "AGUARDANDO_FINANCEIRO" : String(atual.ST_SOLICITACAO || "").trim(),
          RETORNANDO_AO_ATENDIMENTO: retornandoAoAtendimento ? 1 : 0,
        },
        { autoCommit: false }
      );

      await connection.execute(
        `
          UPDATE DBACRESSEM.SUBSIDIO_AUDITIVO_ANEXO
             SET SN_ATIVO = 0
           WHERE ID_SUBSIDIO_AUDITIVO = :id
        `,
        { id: idSolicitacao },
        { autoCommit: false }
      );

      for (let i = 0; i < anexos.length; i++) {
        const anexo = anexos[i];

        let caminhoArquivo = String(anexo.DS_CAMINHO_ARQUIVO || "").trim() || null;
        let mimeType = String(anexo.DS_MIME_TYPE || "").trim() || null;

        if (String(anexo.ARQUIVO || "").startsWith("data:")) {
          const salvo = await salvarAnexo(
            anexo.ARQUIVO,
            anexo.NM_ARQUIVO_ORIGINAL || null,
            idSolicitacao,
            i,
            req.body.NM_ASSOCIADO
          );
          caminhoArquivo = salvo?.finalPath || null;
          mimeType = salvo?.mime || null;
        }

        await connection.execute(
          `
            INSERT INTO DBACRESSEM.SUBSIDIO_AUDITIVO_ANEXO (
              ID_SUBSIDIO_AUDITIVO,
              TP_ANEXO,
              NM_ARQUIVO_ORIGINAL,
              DS_CAMINHO_ARQUIVO,
              DS_MIME_TYPE,
              NR_TAMANHO_BYTES,
              NM_USUARIO_UPLOAD,
              LOGIN_USUARIO_UPLOAD,
              DT_UPLOAD,
              SN_ATIVO
            ) VALUES (
              :ID_SUBSIDIO_AUDITIVO,
              :TP_ANEXO,
              :NM_ARQUIVO_ORIGINAL,
              :DS_CAMINHO_ARQUIVO,
              :DS_MIME_TYPE,
              :NR_TAMANHO_BYTES,
              :NM_USUARIO_UPLOAD,
              :LOGIN_USUARIO_UPLOAD,
              SYSDATE,
              1
            )
          `,
          {
            ID_SUBSIDIO_AUDITIVO: idSolicitacao,
            TP_ANEXO: normalizarTipoAnexo(anexo.TP_ANEXO),
            NM_ARQUIVO_ORIGINAL: String(anexo.NM_ARQUIVO_ORIGINAL || "arquivo").trim(),
            DS_CAMINHO_ARQUIVO: caminhoArquivo,
            DS_MIME_TYPE: mimeType,
            NR_TAMANHO_BYTES: Number(anexo.NR_TAMANHO_BYTES || 0) || null,
            NM_USUARIO_UPLOAD: String(req.body.NM_USUARIO_ABERTURA || "").trim() || null,
            LOGIN_USUARIO_UPLOAD: String(req.body.LOGIN_USUARIO_ABERTURA || "").trim() || null,
          },
          { autoCommit: false }
        );
      }

      const novoStatus = retornandoAoAtendimento ? "AGUARDANDO_FINANCEIRO" : String(atual.ST_SOLICITACAO || "").trim();

      await inserirHistorico(connection, {
        idSolicitacao,
        statusAnterior: atual.ST_SOLICITACAO,
        statusNovo: novoStatus,
        acao: retornandoAoAtendimento ? "REENVIO_ATENDIMENTO" : "EDICAO",
        observacao: retornandoAoAtendimento ? "Solicitação corrigida e reenviada ao financeiro." : "Solicitação atualizada.",
        nomeUsuario: req.body.NM_USUARIO_ABERTURA,
        loginUsuario: req.body.LOGIN_USUARIO_ABERTURA,
      });

      await connection.commit();

      let notificacao: any = { enviado: false, destinatarios: [] };
      if (retornandoAoAtendimento) {
        try {
          notificacao = await enviarEmailFluxoSubsidio(connection, {
            idSolicitacao,
            solicitacao: {
              ...atual,
              ST_SOLICITACAO: novoStatus,
            },
            tipo: "FINANCEIRO",
            titulo: "Documentação corrigida aguardando conferência do financeiro",
            introducao:
              "O atendimento atualizou os anexos da solicitação devolvida e o processo voltou para conferência do financeiro.",
          });
        } catch (emailErr: any) {
          console.error("[subsidio_auditivo] Erro ao enviar e-mail no reenvio da edição:", emailErr);
          notificacao = {
            enviado: false,
            destinatarios: [],
            erro: String(emailErr?.message || emailErr),
          };
        }
      }

      return res.json({
        ok: true,
        id: idSolicitacao,
        status: novoStatus,
        motivoDevolucao: retornandoAoAtendimento ? null : String(req.body.DS_MOTIVO_DEVOLUCAO || "").trim() || null,
        notificacao,
        message: retornandoAoAtendimento
          ? "Solicitação atualizada e reenviada ao financeiro com sucesso."
          : "Solicitação de subsídio auditivo atualizada com sucesso.",
      });
    } catch (err: any) {
      await connection.rollback();
      console.error("editar Subsidio Auditivo erro:", err);
      return res.status(500).json({
        error: "Falha ao editar solicitação de subsídio auditivo.",
        details: String(err?.message || err),
      });
    } finally {
      await connection.close();
    }
  },

  async buscarPorId(req: AuthenticatedRequest, res: Response) {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: "ID inválido." });
    }

    const pool = await getOraclePool();
    const connection = await pool.getConnection();

    try {
      const solicitacao = await buscarSolicitacao(connection, id);
      if (!solicitacao) {
        return res.status(404).json({ error: "Solicitação não encontrada." });
      }

      const perfil = getPerfilPermissaoSubsidio(req, solicitacao);
      if (!perfil.podeVisualizar) {
        return res.status(403).json({
          error: "Você não tem permissão para visualizar esta solicitação.",
        });
      }

      const anexos = await buscarAnexos(connection, id);
      const historico = await buscarHistorico(connection, id);

      return res.json({
        ...solicitacao,
        DT_SOLICITACAO: solicitacao.DT_SOLICITACAO_FMT,
        DT_ASSOCIACAO: solicitacao.DT_ASSOCIACAO_FMT,
        DT_LIMITE_NOTA_FISCAL: solicitacao.DT_LIMITE_NOTA_FISCAL_FMT,
        DT_ENVIO_DIRETORIA: solicitacao.DT_ENVIO_DIRETORIA_FMT,
        DT_APROVACAO_DIRETORIA: solicitacao.DT_APROVACAO_DIRETORIA_FMT,
        DT_ENVIO_FINANCEIRO: solicitacao.DT_ENVIO_FINANCEIRO_FMT,
        DT_FINALIZACAO: solicitacao.DT_FINALIZACAO_FMT,
        DT_CRIACAO: solicitacao.DT_CRIACAO_FMT,
        DT_ATUALIZACAO: solicitacao.DT_ATUALIZACAO_FMT,
        ANEXOS: anexos,
        HISTORICO: historico,
        PERMISSOES: {
          isSolicitanteAtual: perfil.isSolicitanteAtual,
          isFinanceiro: perfil.isFinanceiro,
          isDiretoria: perfil.isDiretoria,
          isSuporte: perfil.isSuporte,
          podeEditarCadastro:
            perfil.isSolicitanteAtual &&
            String(solicitacao.ST_SOLICITACAO || "").trim() ===
              "DEVOLVIDO_AO_ATENDIMENTO",
        },
      });
    } catch (err: any) {
      console.error("buscar Subsidio Auditivo por id erro:", err);
      return res.status(500).json({
        error: "Falha ao buscar solicitação.",
        details: String(err?.message || err),
      });
    } finally {
      await connection.close();
    }
  },

  async salvarAnexoFluxo(req: AuthenticatedRequest, res: Response) {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: "ID inválido." });
    }

    const tipo = normalizarTipoAnexo(req.body.TP_ANEXO);
    const tiposPermitidos = [
      TIPO_ANEXO_TERMO_ASSINADO,
      TIPO_ANEXO_TERMO_DIRETORIA,
    ];

    if (!tiposPermitidos.includes(tipo)) {
      return res.status(400).json({
        error: "Este tipo de anexo não pode ser enviado pelo gerenciamento.",
      });
    }

    if (!String(req.body.ARQUIVO || "").startsWith("data:")) {
      return res.status(400).json({ error: "Selecione um arquivo válido." });
    }

    const pool = await getOraclePool();
    const connection = await pool.getConnection();
    let caminhoNovo: string | null = null;

    try {
      setAuditoriaContext(connection, req);

      const atual = await buscarSolicitacao(connection, id);
      if (!atual) {
        return res.status(404).json({ error: "Solicitação não encontrada." });
      }

      const perfil = getPerfilPermissaoSubsidio(req, atual);
      const statusAtual = String(atual.ST_SOLICITACAO || "").trim();

      if (tipo === TIPO_ANEXO_TERMO_ASSINADO) {
        if (
          !perfil.isSolicitanteAtual ||
          statusAtual !== "AGUARDANDO_ASSINATURA_SOLICITANTE"
        ) {
          return res.status(403).json({
            error:
              "Somente quem abriu a solicitação pode anexar o termo do solicitante nesta etapa.",
          });
        }
      }

      if (tipo === TIPO_ANEXO_TERMO_DIRETORIA) {
        if (!perfil.isDiretoria || statusAtual !== "AGUARDANDO_DIRETORIA") {
          return res.status(403).json({
            error:
              "Somente a diretoria pode anexar o termo da diretoria nesta etapa.",
          });
        }
      }

      const anexosAtuais = await buscarAnexos(connection, id);
      const anexosMesmoTipo = anexosAtuais.filter(
        (item) => normalizarTipoAnexo(item.TP_ANEXO) === tipo
      );

      const salvo = await salvarAnexo(
        req.body.ARQUIVO,
        String(req.body.NM_ARQUIVO_ORIGINAL || "arquivo").trim(),
        id,
        anexosAtuais.length,
        atual.NM_ASSOCIADO
      );

      if (!salvo?.finalPath) {
        return res.status(400).json({ error: "Não foi possível processar o arquivo." });
      }

      caminhoNovo = salvo.finalPath;

      for (const anexoAtual of anexosMesmoTipo) {
        await connection.execute(
          `
            UPDATE DBACRESSEM.SUBSIDIO_AUDITIVO_ANEXO
               SET SN_ATIVO = 0
             WHERE ID_SUBSIDIO_AUDITIVO_ANEXO = :idAnexo
          `,
          { idAnexo: anexoAtual.ID_SUBSIDIO_AUDITIVO_ANEXO },
          { autoCommit: false }
        );
      }

      await connection.execute(
        `
          INSERT INTO DBACRESSEM.SUBSIDIO_AUDITIVO_ANEXO (
            ID_SUBSIDIO_AUDITIVO,
            TP_ANEXO,
            NM_ARQUIVO_ORIGINAL,
            DS_CAMINHO_ARQUIVO,
            DS_MIME_TYPE,
            NR_TAMANHO_BYTES,
            NM_USUARIO_UPLOAD,
            LOGIN_USUARIO_UPLOAD,
            DT_UPLOAD,
            SN_ATIVO
          ) VALUES (
            :ID_SUBSIDIO_AUDITIVO,
            :TP_ANEXO,
            :NM_ARQUIVO_ORIGINAL,
            :DS_CAMINHO_ARQUIVO,
            :DS_MIME_TYPE,
            :NR_TAMANHO_BYTES,
            :NM_USUARIO_UPLOAD,
            :LOGIN_USUARIO_UPLOAD,
            SYSDATE,
            1
          )
        `,
        {
          ID_SUBSIDIO_AUDITIVO: id,
          TP_ANEXO: tipo,
          NM_ARQUIVO_ORIGINAL: String(
            req.body.NM_ARQUIVO_ORIGINAL || "arquivo"
          ).trim(),
          DS_CAMINHO_ARQUIVO: salvo.finalPath,
          DS_MIME_TYPE:
            String(req.body.DS_MIME_TYPE || "").trim() || salvo.mime || null,
          NR_TAMANHO_BYTES: Number(req.body.NR_TAMANHO_BYTES || 0) || null,
          NM_USUARIO_UPLOAD:
            String(req.user?.nome_completo || "").trim() || null,
          LOGIN_USUARIO_UPLOAD: String(req.user?.sub || "").trim() || null,
        },
        { autoCommit: false }
      );

      await inserirHistorico(connection, {
        idSolicitacao: id,
        statusAnterior: statusAtual,
        statusNovo: statusAtual,
        acao:
          tipo === TIPO_ANEXO_TERMO_DIRETORIA
            ? "ANEXO_DIRETORIA"
            : "ANEXO_SOLICITANTE",
        observacao:
          tipo === TIPO_ANEXO_TERMO_DIRETORIA
            ? "Termo assinado pela diretoria anexado."
            : "Termo assinado pelo solicitante anexado.",
        nomeUsuario: req.user?.nome_completo,
        loginUsuario: req.user?.sub,
      });

      await connection.commit();
      caminhoNovo = null;

      return res.json({
        ok: true,
        message: "Anexo salvo com sucesso.",
      });
    } catch (err: any) {
      await connection.rollback();
      await removeFileIfExists(caminhoNovo);
      console.error("salvar anexo de fluxo Subsidio Auditivo erro:", err);
      return res.status(500).json({
        error: "Falha ao salvar anexo da solicitação.",
        details: String(err?.message || err),
      });
    } finally {
      await connection.close();
    }
  },

  async atualizarStatus(req: AuthenticatedRequest, res: Response) {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: "ID inválido." });
    }

    const acao = String(req.body.acao || "").trim().toUpperCase();
    const observacao = String(req.body.observacao || "").trim() || null;
    const nomeResponsavel = String(req.body.nomeResponsavel || "").trim() || null;
    const loginResponsavel = String(req.body.loginResponsavel || "").trim() || null;

    const pool = await getOraclePool();
    const connection = await pool.getConnection();

    try {
      setAuditoriaContext(connection, req);

      const atual = await buscarSolicitacao(connection, id);
      if (!atual) {
        return res.status(404).json({ error: "Solicitação não encontrada." });
      }

      const perfil = getPerfilPermissaoSubsidio(req, atual);
      if (!perfil.podeVisualizar) {
        return res.status(403).json({
          error: "Você não tem permissão para atuar nesta solicitação.",
        });
      }

      let novoStatus = String(atual.ST_SOLICITACAO || "").trim();
      let extraSql = "";
      const bindsExtra: Record<string, any> = {};

      const anexosAtuais = await buscarAnexos(connection, id);
      const statusAtual = String(atual.ST_SOLICITACAO || "").trim();
      const podeAtuarComoSolicitante =
        perfil.isSolicitanteAtual &&
        ["AGUARDANDO_ASSINATURA_SOLICITANTE", "DEVOLVIDO_AO_ATENDIMENTO"].includes(statusAtual);
      const podeAtuarComoFinanceiro =
        perfil.isFinanceiro && statusAtual === "AGUARDANDO_FINANCEIRO";
      const podeAtuarComoDiretoria =
        perfil.isDiretoria && statusAtual === "AGUARDANDO_DIRETORIA";

      if (acao === "ENVIAR_DIRETORIA" || acao === "ENVIAR_FINANCEIRO" || acao === "REENVIAR") {
        if (!podeAtuarComoSolicitante) {
          return res.status(403).json({
            error: "Somente quem abriu a solicitação pode enviar para o financeiro.",
          });
        }

        if (!possuiAnexo(anexosAtuais, TIPO_ANEXO_DOCUMENTOS)) {
          return res.status(400).json({
            error: "Anexe os documentos pessoais / obrigatórios antes de enviar ao financeiro.",
          });
        }

        if (!possuiAnexo(anexosAtuais, TIPO_ANEXO_ORCAMENTOS_NOTA)) {
          return res.status(400).json({
            error: "Anexe o arquivo de orçamentos / nota fiscal antes de enviar ao financeiro.",
          });
        }

        if (!possuiAnexo(anexosAtuais, TIPO_ANEXO_TERMO_ASSINADO)) {
          return res.status(400).json({
            error: "Anexe o termo assinado pelo solicitante antes de enviar ao financeiro.",
          });
        }

        novoStatus = "AGUARDANDO_FINANCEIRO";
        extraSql =
          ", DT_ENVIO_DIRETORIA = NULL, DT_ENVIO_FINANCEIRO = SYSDATE, DS_MOTIVO_DEVOLUCAO = NULL";
      } else if (acao === "APROVAR_FINANCEIRO") {
        if (!podeAtuarComoFinanceiro) {
          return res.status(403).json({
            error: "Somente o financeiro pode aprovar esta solicitação nesta etapa.",
          });
        }

        novoStatus = "FINALIZADO";
        extraSql =
          ", DT_FINALIZACAO = SYSDATE, NM_RESP_FINANCEIRO = :NM_RESP_FINANCEIRO, DS_MOTIVO_DEVOLUCAO = NULL";
        bindsExtra.NM_RESP_FINANCEIRO = nomeResponsavel;
      } else if (acao === "APROVAR_DIRETORIA") {
        if (!podeAtuarComoDiretoria) {
          return res.status(403).json({
            error: "Somente a diretoria pode aprovar esta solicitação nesta etapa.",
          });
        }

        novoStatus = "AGUARDANDO_FINANCEIRO";
        extraSql =
          ", DT_APROVACAO_DIRETORIA = SYSDATE, DT_ENVIO_FINANCEIRO = SYSDATE, NM_RESP_DIRETORIA = :NM_RESP_DIRETORIA, DS_MOTIVO_DEVOLUCAO = NULL";
        bindsExtra.NM_RESP_DIRETORIA = nomeResponsavel;
      } else if (acao === "REPROVAR_DIRETORIA") {
        if (!podeAtuarComoDiretoria) {
          return res.status(403).json({
            error: "Somente a diretoria pode reprovar esta solicitação nesta etapa.",
          });
        }

        if (!observacao) {
          return res.status(400).json({
            error: "Informe o motivo da reprovação.",
          });
        }

        novoStatus = "CANCELADO";
        extraSql =
          ", NM_RESP_DIRETORIA = :NM_RESP_DIRETORIA, DS_MOTIVO_DEVOLUCAO = :DS_MOTIVO_DEVOLUCAO";
        bindsExtra.NM_RESP_DIRETORIA = nomeResponsavel;
        bindsExtra.DS_MOTIVO_DEVOLUCAO = observacao;
      } else if (acao === "DEVOLVER_ATENDIMENTO") {
        if (!podeAtuarComoFinanceiro) {
          return res.status(403).json({
            error: "Somente o financeiro pode devolver esta solicitação ao atendimento.",
          });
        }

        novoStatus = "DEVOLVIDO_AO_ATENDIMENTO";
        extraSql = ", DS_MOTIVO_DEVOLUCAO = :DS_MOTIVO_DEVOLUCAO";
        bindsExtra.DS_MOTIVO_DEVOLUCAO = observacao;
      } else if (acao === "FINALIZAR") {
        if (!podeAtuarComoFinanceiro) {
          return res.status(403).json({
            error: "Somente o financeiro pode finalizar esta solicitação.",
          });
        }

        novoStatus = "FINALIZADO";
        extraSql =
          ", DT_FINALIZACAO = SYSDATE, NM_RESP_FINANCEIRO = :NM_RESP_FINANCEIRO, DS_MOTIVO_DEVOLUCAO = NULL";
        bindsExtra.NM_RESP_FINANCEIRO = nomeResponsavel;
      } else if (acao === "CANCELAR") {
        novoStatus = "CANCELADO";
      } else {
        return res.status(400).json({ error: "Ação inválida." });
      }

      await connection.execute(
        `
          UPDATE DBACRESSEM.SOLICITACAO_SUBSIDIO_AUDITIVO
             SET ST_SOLICITACAO = :ST_SOLICITACAO,
                 DT_ATUALIZACAO = SYSDATE
                 ${extraSql}
           WHERE ID_SUBSIDIO_AUDITIVO = :ID_SUBSIDIO_AUDITIVO
        `,
        {
          ST_SOLICITACAO: novoStatus,
          ID_SUBSIDIO_AUDITIVO: id,
          ...bindsExtra,
        },
        { autoCommit: false }
      );

      await inserirHistorico(connection, {
        idSolicitacao: id,
        statusAnterior: atual.ST_SOLICITACAO,
        statusNovo: novoStatus,
        acao,
        observacao,
        nomeUsuario: nomeResponsavel,
        loginUsuario: loginResponsavel,
      });

      await connection.commit();

      let notificacao: any = { enviado: false, destinatarios: [] };
      try {
        const solicitacaoEmail = {
          ...atual,
          ST_SOLICITACAO: novoStatus,
        };

        if (acao === "ENVIAR_DIRETORIA" || acao === "ENVIAR_FINANCEIRO" || acao === "REENVIAR") {
          notificacao = await enviarEmailFluxoSubsidio(connection, {
            idSolicitacao: id,
            solicitacao: solicitacaoEmail,
            tipo: "FINANCEIRO",
            titulo: "Solicitação aguardando conferência do financeiro",
            introducao:
              "O termo assinado pelo solicitante foi anexado e a solicitação está aguardando conferência do financeiro.",
            observacao,
          });
        } else if (acao === "DEVOLVER_ATENDIMENTO") {
          notificacao = await enviarEmailFluxoSubsidio(connection, {
            idSolicitacao: id,
            solicitacao: solicitacaoEmail,
            tipo: "SOLICITANTE",
            titulo: "Documentação devolvida para ajuste",
            introducao:
              "O financeiro devolveu a solicitação para correção da documentação. Ajuste apenas os anexos necessários e reenvie pelo cadastro.",
            observacao,
          });
        } else if (acao === "APROVAR_DIRETORIA") {
          notificacao = await enviarEmailFluxoSubsidio(connection, {
            idSolicitacao: id,
            solicitacao: solicitacaoEmail,
            tipo: "FINANCEIRO",
            titulo: "Diretoria aprovou a solicitação",
            introducao:
              "A diretoria aprovou a solicitação. Confira a documentação e finalize o processo após o depósito.",
            observacao,
          });
        } else if (acao === "REPROVAR_DIRETORIA") {
          notificacao = await enviarEmailFluxoSubsidio(connection, {
            idSolicitacao: id,
            solicitacao: solicitacaoEmail,
            tipo: "SOLICITANTE",
            titulo: "Solicitação reprovada pela diretoria",
            introducao:
              "A diretoria analisou e reprovou a solicitação de subsídio auditivo. Consulte abaixo o motivo informado.",
            observacao,
          });
        } else if (acao === "FINALIZAR") {
          notificacao = await enviarEmailFluxoSubsidio(connection, {
            idSolicitacao: id,
            solicitacao: solicitacaoEmail,
            tipo: "SOLICITANTE",
            titulo: "Solicitação finalizada",
            introducao:
              "O financeiro marcou a solicitação como concluída após o depósito.",
            observacao,
          });
        }
      } catch (emailErr: any) {
        console.error("[subsidio_auditivo] Erro ao enviar e-mail:", emailErr);
        notificacao = {
          enviado: false,
          destinatarios: [],
          erro: String(emailErr?.message || emailErr),
        };
      }

      return res.json({
        ok: true,
        id,
        status: novoStatus,
        notificacao,
        message: "Status atualizado com sucesso.",
      });
    } catch (err: any) {
      await connection.rollback();
      console.error("atualizar status Subsidio Auditivo erro:", err);
      return res.status(500).json({
        error: "Falha ao atualizar o status da solicitação.",
        details: String(err?.message || err),
      });
    } finally {
      await connection.close();
    }
  },

  async downloadAnexo(req: Request, res: Response) {
    try {
      const caminho = String(req.body.caminho || "").trim();
      if (!caminho) {
        return res.status(400).json({ error: "Caminho do arquivo não informado." });
      }

      const { arquivoBuffer, nomeArquivo } =
        !isWindowsRuntime() && isUncPath(caminho)
          ? await readFileFromSmbLinux(caminho)
          : {
              arquivoBuffer: await fs.readFile(caminho),
              nomeArquivo: path.win32.basename(caminho),
            };

      res.setHeader("Content-Disposition", `attachment; filename="${nomeArquivo}"`);
      return res.end(arquivoBuffer);
    } catch (err: any) {
      console.error("download anexo Subsidio Auditivo erro:", err);
      return res.status(500).json({
        error: "Falha ao baixar anexo.",
        details: String(err?.message || err),
      });
    }
  },

  async resumoEmail(req: Request, res: Response) {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: "ID inválido." });
    }

    const pool = await getOraclePool();
    const connection = await pool.getConnection();

    try {
      const solicitacao = await buscarSolicitacao(connection, id);
      if (!solicitacao) {
        return res.status(404).json({ error: "Solicitação não encontrada." });
      }

      const html = `
        <table cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
          <tr>
            <td style="padding:18px 24px;background:#7BC51D;color:#fff;font-size:18px;font-weight:700;">
              Solicitação de subsídio auditivo
            </td>
          </tr>
          <tr>
            <td style="padding:24px;">
              <p style="margin:0 0 14px 0;color:#1f2933;">
                O associado ${escapeHtml(solicitacao.NM_ASSOCIADO)} abriu uma solicitação de subsídio auditivo.
              </p>
              <table cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;border:1px solid #e5ebe8;">
                <tr><td style="padding:10px;font-weight:700;background:#f8faf9;">Status</td><td style="padding:10px;">${escapeHtml(solicitacao.ST_SOLICITACAO)}</td></tr>
                <tr><td style="padding:10px;font-weight:700;background:#f8faf9;">Associado</td><td style="padding:10px;">${escapeHtml(solicitacao.NM_ASSOCIADO)}</td></tr>
                <tr><td style="padding:10px;font-weight:700;background:#f8faf9;">Órgão / local</td><td style="padding:10px;">${escapeHtml(solicitacao.NM_ORGAO_ASSOCIADO || "-")}</td></tr>
                <tr><td style="padding:10px;font-weight:700;background:#f8faf9;">Valor liberado</td><td style="padding:10px;">R$ ${Number(solicitacao.VL_SUBSIDIO_APROVADO || 0).toFixed(2)}</td></tr>
              </table>
            </td>
          </tr>
        </table>
      `;

      return res.json({ html });
    } catch (err: any) {
      return res.status(500).json({
        error: "Falha ao gerar resumo.",
        details: String(err?.message || err),
      });
    } finally {
      await connection.close();
    }
  },
};



