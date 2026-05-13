import { Request, Response } from "express";
import oracledb from "oracledb";
import fs from "fs/promises";
import path from "path";
import { getOraclePool } from "../config/oracle.pool";
import { sendEmail } from "../services/email.service";


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

function extFromMime(mime: string) {
  const map: Record<string, string> = {
    "application/pdf": ".pdf",
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/webp": ".webp",
  };

  return map[mime] || "";
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

function parseBase64File(dataUrl: string | null, nomeOriginal?: string | null) {
  if (!dataUrl || typeof dataUrl !== "string") {
    return null;
  }

  const match = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!match) return null;

  const mime = match[1];
  const base64 = match[2];
  const buffer = Buffer.from(base64, "base64");

  let ext = path.extname(nomeOriginal || "");
  if (!ext) ext = extFromMime(mime) || ".bin";

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

function formatFolderDateTime(date = new Date()) {
  const dia = String(date.getDate()).padStart(2, "0");
  const mes = String(date.getMonth() + 1).padStart(2, "0");
  const ano = String(date.getFullYear());
  const hora = String(date.getHours()).padStart(2, "0");
  const minuto = String(date.getMinutes()).padStart(2, "0");

  return `${dia}-${mes}-${ano}_${hora}-${minuto}`;
}

function getBaseReembolsoPath() {
  return (
    process.env.REEMBOLSO_DESPESA_BASE_PATH ||
    "\\\\10.0.107.251\\dados$\\CRM\\REEMBOLSO_DESPESA"
  );
}

function isUncPath(filePath: string | null | undefined) {
  return String(filePath || "").startsWith("\\\\");
}

async function removeFileIfExists(filePath: string | null | undefined) {
  if (!filePath) return;

  try {
    await fs.unlink(filePath);
  } catch {
    // ignora se não existir
  }
}

async function salvarComprovante(
  dataUrl: string | null,
  nomeOriginal: string | null | undefined,
  idSolicitacao: number,
  indice: number,
  nomeFuncionario?: string | null
) {
  const parsed = parseBase64File(dataUrl, nomeOriginal);
  if (!parsed) return null;

  const funcionarioSafe = sanitizeFolderName(nomeFuncionario || "SEM_NOME");
  const pastaDataHora = formatFolderDateTime();

  const baseDir = path.join(
    getBaseReembolsoPath(),
    funcionarioSafe,
    pastaDataHora
  );

  await ensureDir(baseDir);

  const finalName = sanitizeFileName(parsed.nomeOriginal);
  const finalPath = path.join(baseDir, finalName);

  await fs.writeFile(finalPath, parsed.buffer);

  return finalPath;
}

function validarCamposPrincipais(body: any) {
  const cpf = onlyDigits(body.NR_CPF_FUNCIONARIO);

  if (!body.NM_FUNCIONARIO) return "Preencha o nome do funcionário.";
  if (cpf.length !== 11) return "CPF do funcionário inválido.";
  if (!body.DT_IDA) return "Preencha a data de ida.";
  if (!body.DT_VOLTA) return "Preencha a data de volta.";
  if (!body.DESC_JTF_EVENTO) return "Preencha a justificativa do evento.";
  if (!body.NM_CIDADE) return "Preencha a cidade.";
  if (!body.NR_BANCO) return "Preencha o número do banco.";
  if (!body.CD_AGENCIA) return "Preencha a agência.";
  if (!body.NR_CONTA) return "Preencha a conta.";

  const despesas = parseJsonIfNeeded<any[]>(body.DESPESAS, []);
  if (!Array.isArray(despesas) || !despesas.length) {
    return "Informe ao menos uma despesa.";
  }

  return null;
}

async function getNextSolicitacaoId(connection: oracledb.Connection) {
  const result = await connection.execute(
    `
      SELECT NVL(MAX(ID_SOLICITACAO_REEMBOLSO_DESPESA), 0) + 1 AS NEXT_ID
      FROM DBACRESSEM.SOLICITACAO_REEMBOLSO_DESPESA
    `,
    {},
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  const row: any = result.rows?.[0];
  return Number(row?.NEXT_ID || 1);
}

async function getNextDespesaId(connection: oracledb.Connection) {
  const result = await connection.execute(
    `
      SELECT NVL(MAX(ID_DESPESA_SOLICITADA), 0) + 1 AS NEXT_ID
      FROM DBACRESSEM.DESPESA_SOLICITADA
    `,
    {},
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  const row: any = result.rows?.[0];
  return Number(row?.NEXT_ID || 1);
}

function getEmailFinanceiro() {
  return process.env.REEMBOLSO_FINANCEIRO_EMAIL || process.env.FINANCEIRO_EMAIL || "";
}

function getReembolsoDebugEmail() {
  return String(process.env.REEMBOLSO_DEBUG_EMAIL || "")
    .trim()
    .toLowerCase();
}

function aplicarDebugDestinatariosReembolso(destinatarios: string[]) {
  const debugEmail = getReembolsoDebugEmail();
  if (!debugEmail) return destinatarios;
  return [debugEmail];
}

type ContatoFuncionario = {
  ID_FUNCIONARIO: number;
  NM_FUNCIONARIO: string;
  EMAIL: string;
};

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
  const items = parseMailList(value);
  for (const email of items) {
    destinatarios.add(email);
  }
}

async function buscarContatoFuncionarioPorId(
  connection: oracledb.Connection,
  idFuncionario: number
) {
  if (!idFuncionario) return null;

  const result = await connection.execute(
    `
      SELECT
        f.ID_FUNCIONARIO,
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
    ID_FUNCIONARIO: Number(row.ID_FUNCIONARIO || 0),
    NM_FUNCIONARIO: String(row.NM_FUNCIONARIO || "").trim(),
    EMAIL: String(row.EMAIL || "").trim(),
  } as ContatoFuncionario;
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
        f.ID_FUNCIONARIO,
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
    ID_FUNCIONARIO: Number(row.ID_FUNCIONARIO || 0),
    NM_FUNCIONARIO: String(row.NM_FUNCIONARIO || "").trim(),
    EMAIL: String(row.EMAIL || "").trim(),
  } as ContatoFuncionario;
}

function montarHtmlNotificacaoDecisaoReembolso(params: {
  idSolicitacao: number;
  nomeSolicitante: string;
  etapaAnterior: string;
  etapaAtual: string;
  acao: string;
  nomeResponsavel: string;
  parecer: string;
}) {
  const acaoFmt =
    params.acao === "aprovar"
      ? "Aprovado"
      : params.acao === "reprovar"
        ? "Reprovado"
        : params.acao === "devolver"
          ? "Devolvido"
          : params.acao;

  const observacaoAprovadoDiretoria =
    params.etapaAnterior === "Pendente Diretoria" && params.etapaAtual === "Aprovado"
      ? `
        <div style="margin-top:18px;padding:14px 16px;background:#edf7f1;border-left:4px solid #008542;border-radius:8px;color:#244434;">
          <strong>Orientação:</strong> Solicitação aprovada. O pagamento deve ocorrer em até 48 horas e o financeiro precisa finalizar no sistema.
        </div>
      `
      : "";

  const conteudo = `
    <tr>
      <td style="background:#006b3f;padding:22px 26px;color:#ffffff;">
        <div style="font-size:12px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;opacity:.9;">
          Reembolso de despesa
        </div>
        <h2 style="margin:6px 0 0;font-size:22px;line-height:1.3;font-weight:700;">
          Atualização de solicitação
        </h2>
      </td>
    </tr>

    <tr>
      <td style="padding:24px 26px;">
        <p style="margin:0 0 18px;font-size:14px;line-height:1.6;color:#4b5563;">
          Uma solicitação foi atualizada no fluxo de aprovação.
        </p>

        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:separate;border-spacing:0;border:1px solid #e1e8e4;border-radius:10px;overflow:hidden;">
          ${montarLinhaInfoEmail("ID da solicitação", params.idSolicitacao)}
          ${montarLinhaInfoEmail("Funcionário", params.nomeSolicitante)}
          ${montarLinhaInfoEmail("Etapa anterior", params.etapaAnterior)}
          ${montarLinhaInfoEmail("Etapa atual", params.etapaAtual)}
          ${montarLinhaInfoEmail("Ação", acaoFmt)}
          ${montarLinhaInfoEmail("Responsável", params.nomeResponsavel)}
          ${montarLinhaInfoEmail("Parecer", params.parecer)}
        </table>

        ${observacaoAprovadoDiretoria}

        <p style="margin:20px 0 0;font-size:12px;line-height:1.5;color:#6b7280;">
          Este e-mail foi enviado automaticamente pelo sistema.
        </p>
      </td>
    </tr>
  `;

  return montarWrapperEmail(conteudo);
}

async function enviarNotificacaoDecisaoReembolso(
  connection: oracledb.Connection,
  params: {
    idSolicitacao: number;
    nomeSolicitante: string;
    etapaAnterior: string;
    etapaAtual: string;
    acao: string;
    nomeResponsavel: string;
    parecer: string;
    idSolicitante: number;
    idAprovGerencia: number;
    idAprovGerenciaSup: number;
    idAprovDiretoria: number;
  }
) {
  const destinatarios = new Set<string>();
  const emailFinanceiro = getEmailFinanceiro();

  const [
    contatoSolicitantePorId,
    contatoSolicitantePorNome,
    contatoGerencia,
    contatoGerenciaSup,
    contatoDiretoria,
  ] = await Promise.all([
    buscarContatoFuncionarioPorId(connection, params.idSolicitante),
    buscarContatoFuncionarioPorNome(connection, params.nomeSolicitante),
    buscarContatoFuncionarioPorId(connection, params.idAprovGerencia),
    buscarContatoFuncionarioPorId(connection, params.idAprovGerenciaSup),
    buscarContatoFuncionarioPorId(connection, params.idAprovDiretoria),
  ]);

  const contatoSolicitante = contatoSolicitantePorId || contatoSolicitantePorNome;
  addMails(destinatarios, contatoSolicitante?.EMAIL);

  if (params.etapaAnterior === "Pendente Financeiro") {
    if (params.acao === "aprovar") {
      if (params.etapaAtual === "Pendente Gerencia") {
        addMails(destinatarios, contatoGerencia?.EMAIL);
      } else if (params.etapaAtual === "Pendente Gerencia Superior") {
        addMails(destinatarios, contatoGerenciaSup?.EMAIL);
      } else if (params.etapaAtual === "Pendente Diretoria") {
        addMails(destinatarios, contatoDiretoria?.EMAIL);
      }
    }
  } else if (params.etapaAnterior === "Pendente Gerencia") {
    if (params.acao === "reprovar" || params.etapaAtual === "Reprovado") {
      addMails(destinatarios, emailFinanceiro);
    } else if (params.acao === "aprovar") {
      if (params.etapaAtual === "Pendente Gerencia Superior") {
        addMails(destinatarios, contatoGerenciaSup?.EMAIL);
      } else if (params.etapaAtual === "Pendente Diretoria") {
        addMails(destinatarios, contatoDiretoria?.EMAIL);
      }
    }
  } else if (params.etapaAnterior === "Pendente Gerencia Superior") {
    if (params.acao === "reprovar" || params.etapaAtual === "Reprovado") {
      addMails(destinatarios, emailFinanceiro);
      addMails(destinatarios, contatoGerencia?.EMAIL);
    } else if (params.acao === "aprovar") {
      addMails(destinatarios, contatoDiretoria?.EMAIL);
    }
  } else if (params.etapaAnterior === "Pendente Diretoria") {
    addMails(destinatarios, emailFinanceiro);
  }

  // Regra global: toda finalização deve avisar o financeiro.
  if (params.etapaAtual === "Aprovado" || params.etapaAtual === "Reprovado") {
    addMails(destinatarios, emailFinanceiro);
  }

  const emailsOriginais = Array.from(destinatarios);
  const emails = aplicarDebugDestinatariosReembolso(emailsOriginais);
  if (!emails.length) {
    return {
      enviado: false,
      destinatarios: [],
      motivo: "Nenhum destinatário encontrado para esta transição.",
    };
  }

  const subject = `Reembolso #${params.idSolicitacao} - ${params.etapaAtual}`;
  const html = montarHtmlNotificacaoDecisaoReembolso({
    idSolicitacao: params.idSolicitacao,
    nomeSolicitante: params.nomeSolicitante,
    etapaAnterior: params.etapaAnterior,
    etapaAtual: params.etapaAtual,
    acao: params.acao,
    nomeResponsavel: params.nomeResponsavel,
    parecer: params.parecer,
  });

  await sendEmail(emails, subject, html);

  return {
    enviado: true,
    destinatarios: emails,
    destinatarios_originais: emailsOriginais,
    debug_email_ativo: Boolean(getReembolsoDebugEmail()),
    subject,
  };
}

function formatDateBR(value?: string) {
  if (!value) return "";
  const [y, m, d] = String(value).split("-");
  if (!y || !m || !d) return value;
  return `${d}/${m}/${y}`;
}

function formatCurrencyBRL(value: number) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

function montarHtmlEmailReembolso(params: {
  idSolicitacao: number;
  nomeFuncionario: string;
  cpfFuncionario: string;
  cidade: string;
  dtIda: string;
  dtVolta: string;
  justificativa: string;
  despesas: any[];
  titulo?: string;
  introducao?: string;
}) {
  const total = (params.despesas || []).reduce(
    (acc, item) => acc + Number(toNumber(item?.VALOR, 0)),
    0
  );

  const despesasHtml = (params.despesas || [])
    .map((despesa, index) => {
      return `
        <tr>
          <td style="padding:12px 14px;border-bottom:1px solid #edf1ef;color:#374151;text-align:center;">
            ${index + 1}
          </td>
          <td style="padding:12px 14px;border-bottom:1px solid #edf1ef;color:#374151;font-weight:600;">
            ${escapeHtml(despesa?.TP_DESPESA || "-")}
          </td>
          <td style="padding:12px 14px;border-bottom:1px solid #edf1ef;color:#374151;">
            ${escapeHtml(despesa?.DESC_DESPESA || "-")}
          </td>
          <td style="padding:12px 14px;border-bottom:1px solid #edf1ef;color:#111827;text-align:right;font-weight:600;white-space:nowrap;">
            ${formatCurrencyBRL(toNumber(despesa?.VALOR, 0))}
          </td>
        </tr>
      `;
    })
    .join("");

  const titulo = params.titulo || "Nova solicitação de reembolso de despesa";

  const introducao =
    params.introducao ||
    "Uma nova solicitação foi cadastrada no sistema e está aguardando análise do financeiro.";

  const conteudo = `
    <tr>
      <td style="background:#006b3f;padding:22px 26px;color:#ffffff;">
        <div style="font-size:12px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;opacity:.9;">
          Reembolso de despesa
        </div>
        <h2 style="margin:6px 0 0;font-size:22px;line-height:1.3;font-weight:700;">
          ${escapeHtml(titulo)}
        </h2>
      </td>
    </tr>

    <tr>
      <td style="padding:24px 26px;">
        <p style="margin:0 0 18px;font-size:14px;line-height:1.6;color:#4b5563;">
          ${escapeHtml(introducao)}
        </p>

        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:separate;border-spacing:0;border:1px solid #e1e8e4;border-radius:10px;overflow:hidden;margin-bottom:22px;">
          ${montarLinhaInfoEmail("ID da solicitação", params.idSolicitacao)}
          ${montarLinhaInfoEmail("Funcionário", params.nomeFuncionario)}
          ${montarLinhaInfoEmail("CPF", formatCpfEmail(params.cpfFuncionario))}
          ${montarLinhaInfoEmail("Cidade", params.cidade)}
          ${montarLinhaInfoEmail("Data de ida", formatDateBR(params.dtIda))}
          ${montarLinhaInfoEmail("Data de volta", formatDateBR(params.dtVolta))}
          ${montarLinhaInfoEmail("Justificativa", params.justificativa)}
        </table>

        <h3 style="margin:0 0 10px;font-size:16px;line-height:1.4;color:#1f2933;">
          Despesas informadas
        </h3>

        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:separate;border-spacing:0;border:1px solid #e1e8e4;border-radius:10px;overflow:hidden;">
          <thead>
            <tr>
              <th style="padding:11px 14px;background:#eef5f1;border-bottom:1px solid #dce7e1;color:#2f3a35;font-size:13px;text-align:center;width:50px;">
                #
              </th>
              <th style="padding:11px 14px;background:#eef5f1;border-bottom:1px solid #dce7e1;color:#2f3a35;font-size:13px;text-align:left;width:170px;">
                Tipo
              </th>
              <th style="padding:11px 14px;background:#eef5f1;border-bottom:1px solid #dce7e1;color:#2f3a35;font-size:13px;text-align:left;">
                Descrição
              </th>
              <th style="padding:11px 14px;background:#eef5f1;border-bottom:1px solid #dce7e1;color:#2f3a35;font-size:13px;text-align:right;width:140px;">
                Valor
              </th>
            </tr>
          </thead>

          <tbody>
            ${despesasHtml}

            <tr>
              <td colspan="3" style="padding:14px;background:#fafafa;text-align:right;color:#1f2933;font-weight:700;">
                Total
              </td>
              <td style="padding:14px;background:#fafafa;text-align:right;color:#006b3f;font-weight:800;white-space:nowrap;">
                ${formatCurrencyBRL(total)}
              </td>
            </tr>
          </tbody>
        </table>

        <p style="margin:20px 0 0;font-size:12px;line-height:1.5;color:#6b7280;">
          Este e-mail foi enviado automaticamente pelo sistema.
        </p>
      </td>
    </tr>
  `;

  return montarWrapperEmail(conteudo);
}

async function buscarResumoSolicitacaoParaEmail(
  connection: oracledb.Connection,
  idSolicitacao: number
) {
  const resultSolicitacao = await connection.execute(
    `
      SELECT
        ID_SOLICITACAO_REEMBOLSO_DESPESA,
        NM_FUNCIONARIO,
        NR_CPF_FUNCIONARIO,
        TO_CHAR(DT_IDA, 'YYYY-MM-DD') AS DT_IDA,
        TO_CHAR(DT_VOLTA, 'YYYY-MM-DD') AS DT_VOLTA,
        DESC_JTF_EVENTO,
        NM_CIDADE
      FROM DBACRESSEM.SOLICITACAO_REEMBOLSO_DESPESA
      WHERE ID_SOLICITACAO_REEMBOLSO_DESPESA = :id
    `,
    { id: idSolicitacao },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  const solicitacao: any = resultSolicitacao.rows?.[0] || null;
  if (!solicitacao) return null;

  const resultDespesas = await connection.execute(
    `
      SELECT
        TP_DESPESA,
        DESC_DESPESA,
        VALOR
      FROM DBACRESSEM.DESPESA_SOLICITADA
      WHERE ID_SOLICITACAO = :id
      ORDER BY ID_DESPESA_SOLICITADA
    `,
    { id: idSolicitacao },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  return {
    ...solicitacao,
    DESPESAS: (resultDespesas.rows || []) as any[],
  };
}

async function enviarEmailPendenciaProximoAprovador(
  connection: oracledb.Connection,
  params: {
    idSolicitacao: number;
    etapaAtual: string;
    idAprovGerencia: number;
    idAprovGerenciaSup: number;
    idAprovDiretoria: number;
  }
) {
  let idDestino = 0;

  if (params.etapaAtual === "Pendente Gerencia") {
    idDestino = Number(params.idAprovGerencia || 0);
  } else if (params.etapaAtual === "Pendente Gerencia Superior") {
    idDestino = Number(params.idAprovGerenciaSup || 0);
  } else if (params.etapaAtual === "Pendente Diretoria") {
    idDestino = Number(params.idAprovDiretoria || 0);
  } else {
    return {
      enviado: false,
      destinatarios: [],
      motivo: "Etapa atual não é etapa de aprovação.",
    };
  }

  if (!idDestino) {
    return {
      enviado: false,
      destinatarios: [],
      motivo: "Aprovador da etapa atual não encontrado.",
    };
  }

  const contatoDestino = await buscarContatoFuncionarioPorId(connection, idDestino);
  if (!contatoDestino?.EMAIL) {
    return {
      enviado: false,
      destinatarios: [],
      motivo: "E-mail do aprovador da etapa atual não encontrado.",
    };
  }

  const resumo = await buscarResumoSolicitacaoParaEmail(connection, params.idSolicitacao);
  if (!resumo) {
    return {
      enviado: false,
      destinatarios: [],
      motivo: "Resumo da solicitação não encontrado para notificação.",
    };
  }

  const destinatariosOriginais = [contatoDestino.EMAIL];
  const destinatarios = aplicarDebugDestinatariosReembolso(destinatariosOriginais);

  const subject = `Solicitação de reembolso #${params.idSolicitacao} - Aguardando sua aprovação`;
  const html = montarHtmlEmailReembolso({
    idSolicitacao: params.idSolicitacao,
    nomeFuncionario: String(resumo.NM_FUNCIONARIO || ""),
    cpfFuncionario: onlyDigits(String(resumo.NR_CPF_FUNCIONARIO || "")),
    cidade: String(resumo.NM_CIDADE || ""),
    dtIda: String(resumo.DT_IDA || ""),
    dtVolta: String(resumo.DT_VOLTA || ""),
    justificativa: String(resumo.DESC_JTF_EVENTO || ""),
    despesas: resumo.DESPESAS || [],
    titulo: "Solicitação de reembolso aguardando sua aprovação",
    introducao: `Uma solicitação avançou no fluxo e está aguardando sua análise na etapa "${params.etapaAtual}".`,
  });

  await sendEmail(destinatarios, subject, html);

  return {
    enviado: true,
    destinatarios,
    destinatarios_originais: destinatariosOriginais,
    debug_email_ativo: Boolean(getReembolsoDebugEmail()),
    etapaAtual: params.etapaAtual,
    aprovador: contatoDestino.NM_FUNCIONARIO,
  };
}

type NivelHierarquia =
  | "FUNCIONARIO"
  | "GERENCIA"
  | "GERENCIA SUPERIOR"
  | "DIRETORIA"
  | "";

function normalizarNivelHierarquia(value: string): NivelHierarquia {
  const nivel = String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();

  if (nivel.includes("GERENCIA") && nivel.includes("SUPERIOR")) {
    return "GERENCIA SUPERIOR";
  }

  if (nivel.includes("GERENCIA")) {
    return "GERENCIA";
  }

  if (nivel.includes("DIRETOR")) {
    return "DIRETORIA";
  }

  if (nivel.includes("FUNCION")) {
    return "FUNCIONARIO";
  }

  return "";
}

async function buscarFuncionarioHierarquia(
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

async function estaDeFeriasHoje(
  connection: oracledb.Connection,
  idFuncionario: number
) {
  if (!idFuncionario) return false;

  const result = await connection.execute(
    `
      SELECT 1 AS EM_FERIAS
      FROM DBACRESSEM.FERIAS_FUNCIONARIOS ff
      WHERE ff.ID_FUNCIONARIO = :idFuncionario
        AND ff.DT_DIA_INICIO <= TRUNC(SYSDATE)
        AND ff.DT_DIA_FIM >= TRUNC(SYSDATE)
        AND NVL(ff.SN_EFETUADO, 0) <> 1
      FETCH FIRST 1 ROWS ONLY
    `,
    { idFuncionario },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  return Boolean(result.rows?.length);
}

async function derivarAprovadoresPorEscala(
  connection: oracledb.Connection,
  nomeSolicitante: string
) {
  const solicitante = await buscarFuncionarioHierarquia(connection, nomeSolicitante);
  const idSolicitante = Number(solicitante?.ID_FUNCIONARIO || 0);

  let idAprovGerencia = 0;
  let idAprovGerenciaSup = 0;
  let idAprovDiretoria = 0;

  let proximoId = Number(solicitante?.CD_GERENCIA || 0);
  const visitados = new Set<number>();
  let limite = 0;

  while (proximoId && !visitados.has(proximoId) && limite < 20) {
    visitados.add(proximoId);
    limite += 1;

    const superior = await buscarNivelPorIdFuncionario(connection, proximoId);
    if (!superior) break;

    const nivel = normalizarNivelHierarquia(String(superior.NM_NIVEL || ""));
    const idSuperior = Number(superior.ID_FUNCIONARIO || 0);

    if (nivel === "GERENCIA" && !idAprovGerencia) {
      idAprovGerencia = idSuperior;
    } else if (nivel === "GERENCIA SUPERIOR" && !idAprovGerenciaSup) {
      idAprovGerenciaSup = idSuperior;
    } else if (nivel === "DIRETORIA" && !idAprovDiretoria) {
      idAprovDiretoria = idSuperior;
      break;
    }

    proximoId = Number(superior.CD_GERENCIA || 0);
  }

  return {
    idSolicitante,
    idAprovGerencia: idAprovGerencia || null,
    idAprovGerenciaSup: idAprovGerenciaSup || null,
    idAprovDiretoria: idAprovDiretoria || null,
  };
}

async function resolverProximoAndamentoPorHierarquia(
  connection: oracledb.Connection,
  nomeSolicitante: string,
  etapaAtual: "Pendente Financeiro" | "Pendente Gerencia",
  idsAprovadores?: {
    idAprovGerencia?: number | null;
    idAprovGerenciaSup?: number | null;
    idAprovDiretoria?: number | null;
  }
) {
  const solicitante = await buscarFuncionarioHierarquia(connection, nomeSolicitante);
  const nivelSolicitante = normalizarNivelHierarquia(String(solicitante?.NM_NIVEL || ""));

  const aprovadoresDerivados = await derivarAprovadoresPorEscala(
    connection,
    nomeSolicitante
  );
  const idSolicitante = Number(aprovadoresDerivados.idSolicitante || 0);

  const idAprovGerenciaRaw = Number(
    idsAprovadores?.idAprovGerencia || aprovadoresDerivados.idAprovGerencia || 0
  );
  const idAprovGerenciaSupRaw = Number(
    idsAprovadores?.idAprovGerenciaSup || aprovadoresDerivados.idAprovGerenciaSup || 0
  );
  const idAprovDiretoriaRaw = Number(
    idsAprovadores?.idAprovDiretoria || aprovadoresDerivados.idAprovDiretoria || 0
  );

  const idAprovGerencia =
    idAprovGerenciaRaw && idAprovGerenciaRaw !== idSolicitante
      ? idAprovGerenciaRaw
      : 0;
  const idAprovGerenciaSup =
    idAprovGerenciaSupRaw && idAprovGerenciaSupRaw !== idSolicitante
      ? idAprovGerenciaSupRaw
      : 0;
  const idAprovDiretoria =
    idAprovDiretoriaRaw && idAprovDiretoriaRaw !== idSolicitante
      ? idAprovDiretoriaRaw
      : 0;

  const escolherStatusDisponivel = async (
    candidatos: Array<{ id: number; status: "Pendente Gerencia" | "Pendente Gerencia Superior" | "Pendente Diretoria" }>
  ) => {
    for (const candidato of candidatos) {
      if (!candidato.id) continue;
      const emFerias = await estaDeFeriasHoje(connection, candidato.id);
      if (!emFerias) return candidato.status;
    }
    return "";
  };

  if (etapaAtual === "Pendente Financeiro") {
    const status = await escolherStatusDisponivel([
      { id: idAprovGerencia, status: "Pendente Gerencia" },
      { id: idAprovGerenciaSup, status: "Pendente Gerencia Superior" },
      { id: idAprovDiretoria, status: "Pendente Diretoria" },
    ]);
    if (status) return status;
  }

  if (etapaAtual === "Pendente Gerencia") {
    const status = await escolherStatusDisponivel([
      { id: idAprovGerenciaSup, status: "Pendente Gerencia Superior" },
      { id: idAprovDiretoria, status: "Pendente Diretoria" },
    ]);
    if (status) return status;
  }

  if (etapaAtual === "Pendente Financeiro") {
    if (nivelSolicitante === "GERENCIA SUPERIOR") return "Pendente Diretoria";
    if (nivelSolicitante === "GERENCIA") return "Pendente Diretoria";
    return "Pendente Gerencia";
  }

  return "Pendente Diretoria";
}

export const solicitacaoReembolsoDespesaController = {
  async cadastrar(req: Request, res: Response) {
    let connection: oracledb.Connection | undefined;

    try {
      const erroValidacao = validarCamposPrincipais(req.body);
      if (erroValidacao) {
        return res.status(400).json({ error: erroValidacao });
      }

      const despesas = parseJsonIfNeeded<any[]>(req.body.DESPESAS, []);
      const pool = await getOraclePool();
      connection = await pool.getConnection();

      const idSolicitacao = await getNextSolicitacaoId(connection);
      const nomeSolicitanteCadastro = String(req.body.NM_FUNCIONARIO || "").toUpperCase();
      const aprovadores = await derivarAprovadoresPorEscala(
        connection,
        nomeSolicitanteCadastro
      );

      const insertSolicitacaoSql = `
        INSERT INTO DBACRESSEM.SOLICITACAO_REEMBOLSO_DESPESA (
          ID_SOLICITACAO_REEMBOLSO_DESPESA,
          NM_FUNCIONARIO,
          NR_CPF_FUNCIONARIO,
          DT_ABERTURA,
          DT_IDA,
          DT_VOLTA,
          DESC_JTF_EVENTO,
          NM_CIDADE,
          NR_BANCO,
          CD_AGENCIA,
          NR_CONTA,
          DESC_ANDAMENTO,
          ID_SOLICITANTE,
          ID_APROV_GERENCIA,
          ID_APROV_GERENCIA_SUP,
          ID_APROV_DIRETORIA
        ) VALUES (
          :ID_SOLICITACAO_REEMBOLSO_DESPESA,
          :NM_FUNCIONARIO,
          :NR_CPF_FUNCIONARIO,
          SYSDATE,
          TO_DATE(:DT_IDA, 'YYYY-MM-DD'),
          TO_DATE(:DT_VOLTA, 'YYYY-MM-DD'),
          :DESC_JTF_EVENTO,
          :NM_CIDADE,
          :NR_BANCO,
          :CD_AGENCIA,
          :NR_CONTA,
          :DESC_ANDAMENTO,
          :ID_SOLICITANTE,
          :ID_APROV_GERENCIA,
          :ID_APROV_GERENCIA_SUP,
          :ID_APROV_DIRETORIA
        )
      `;

      await connection.execute(insertSolicitacaoSql, {
        ID_SOLICITACAO_REEMBOLSO_DESPESA: idSolicitacao,
        NM_FUNCIONARIO: nomeSolicitanteCadastro,
        NR_CPF_FUNCIONARIO: onlyDigits(req.body.NR_CPF_FUNCIONARIO),
        DT_IDA: req.body.DT_IDA,
        DT_VOLTA: req.body.DT_VOLTA,
        DESC_JTF_EVENTO: req.body.DESC_JTF_EVENTO,
        NM_CIDADE: req.body.NM_CIDADE,
        NR_BANCO: req.body.NR_BANCO,
        CD_AGENCIA: req.body.CD_AGENCIA,
        NR_CONTA: req.body.NR_CONTA,
        DESC_ANDAMENTO: req.body.DESC_ANDAMENTO || "Pendente Financeiro",
        ID_SOLICITANTE: aprovadores.idSolicitante || null,
        ID_APROV_GERENCIA: aprovadores.idAprovGerencia || null,
        ID_APROV_GERENCIA_SUP: aprovadores.idAprovGerenciaSup || null,
        ID_APROV_DIRETORIA: aprovadores.idAprovDiretoria || null,
      });

      const insertDespesaSql = `
        INSERT INTO DBACRESSEM.DESPESA_SOLICITADA (
          ID_DESPESA_SOLICITADA,
          ID_SOLICITACAO,
          TP_DESPESA,
          DESC_DESPESA,
          VALOR,
          COMPROVANTE
        ) VALUES (
          :ID_DESPESA_SOLICITADA,
          :ID_SOLICITACAO,
          :TP_DESPESA,
          :DESC_DESPESA,
          :VALOR,
          :COMPROVANTE
        )
      `;

      let nextDespesaId = await getNextDespesaId(connection);

      for (let i = 0; i < despesas.length; i++) {
        const despesa = despesas[i];

        const comprovantePath = await salvarComprovante(
          despesa?.COMPROVANTE || null,
          despesa?.COMPROVANTE_NOME || null,
          idSolicitacao,
          i + 1,
          req.body.NM_FUNCIONARIO
        );

        await connection.execute(insertDespesaSql, {
          ID_DESPESA_SOLICITADA: nextDespesaId,
          ID_SOLICITACAO: idSolicitacao,
          TP_DESPESA: despesa?.TP_DESPESA || "",
          DESC_DESPESA: despesa?.DESC_DESPESA || "",
          VALOR: toNumber(despesa?.VALOR, 0),
          COMPROVANTE: comprovantePath,
        });

        nextDespesaId += 1;
      }

      await connection.commit();

      let emailEnviado = false;
      let emailErro = "";

      try {
        const emailFinanceiro = getEmailFinanceiro();
        const destinatariosFinanceiro = aplicarDebugDestinatariosReembolso(
          parseMailList(emailFinanceiro)
        );

        if (!destinatariosFinanceiro.length) {
          throw new Error(
            "Configure REEMBOLSO_FINANCEIRO_EMAIL ou FINANCEIRO_EMAIL no ambiente."
          );
        }

        const subject = `Nova solicitação de reembolso #${idSolicitacao} - ${String(
          req.body.NM_FUNCIONARIO || ""
        ).toUpperCase()}`;

        const html = montarHtmlEmailReembolso({
          idSolicitacao,
          nomeFuncionario: String(req.body.NM_FUNCIONARIO || "").toUpperCase(),
          cpfFuncionario: onlyDigits(req.body.NR_CPF_FUNCIONARIO),
          cidade: String(req.body.NM_CIDADE || ""),
          dtIda: String(req.body.DT_IDA || ""),
          dtVolta: String(req.body.DT_VOLTA || ""),
          justificativa: String(req.body.DESC_JTF_EVENTO || ""),
          despesas,
        });

        console.log("[REEMBOLSO] Iniciando envio de e-mail para o financeiro...");
        console.log("[REEMBOLSO] Destinatário(s):", destinatariosFinanceiro);

        if (getReembolsoDebugEmail()) {
          console.log(
            "[REEMBOLSO] DEBUG ativo, redirecionando envio para:",
            getReembolsoDebugEmail()
          );
        }

        await sendEmail(destinatariosFinanceiro, subject, html);

        emailEnviado = true;
        console.log("[REEMBOLSO] E-mail enviado com sucesso.");
      } catch (emailErr: any) {
        emailErro = String(emailErr?.message || emailErr);
        console.error("[REEMBOLSO] Erro ao enviar e-mail:", emailErr);
      }

      return res.status(201).json({
        success: true,
        message: emailEnviado
          ? "Solicitação cadastrada com sucesso e e-mail enviado ao financeiro."
          : "Solicitação cadastrada com sucesso, mas o e-mail não pôde ser enviado.",
        ID_SOLICITACAO_REEMBOLSO_DESPESA: idSolicitacao,
        emailEnviado,
        ...(emailErro ? { emailErro } : {}),
      });
    } catch (err: any) {
      console.error("cadastrar reembolso despesa erro:", err);

      if (connection) {
        try {
          await connection.rollback();
        } catch { }
      }

      return res.status(500).json({
        error: "Falha ao cadastrar solicitação de reembolso.",
        details: String(err?.message || err),
      });
    } finally {
      if (connection) {
        try {
          await connection.close();
        } catch { }
      }
    }
  },

  async editar(req: Request, res: Response) {
    let connection: oracledb.Connection | undefined;

    try {
      const idSolicitacao = Number(req.body.ID_SOLICITACAO_REEMBOLSO_DESPESA);

      if (!Number.isFinite(idSolicitacao) || idSolicitacao <= 0) {
        return res.status(400).json({
          error: "ID_SOLICITACAO_REEMBOLSO_DESPESA inválido.",
        });
      }

      const erroValidacao = validarCamposPrincipais(req.body);
      if (erroValidacao) {
        return res.status(400).json({ error: erroValidacao });
      }

      const despesas = parseJsonIfNeeded<any[]>(req.body.DESPESAS, []);
      const pool = await getOraclePool();
      connection = await pool.getConnection();

      const resultAtualSolicitacao = await connection.execute(
        `
          SELECT
            DESC_ANDAMENTO
          FROM DBACRESSEM.SOLICITACAO_REEMBOLSO_DESPESA
          WHERE ID_SOLICITACAO_REEMBOLSO_DESPESA = :id
        `,
        { id: idSolicitacao },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const rowAtualSolicitacao: any = resultAtualSolicitacao.rows?.[0] || null;
      const andamentoAnterior = String(
        rowAtualSolicitacao?.DESC_ANDAMENTO || ""
      ).trim();

      const despesasAntigas = await connection.execute(
        `
          SELECT COMPROVANTE
          FROM DBACRESSEM.DESPESA_SOLICITADA
          WHERE ID_SOLICITACAO = :id
        `,
        { id: idSolicitacao },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const updateSolicitacaoSql = `
        UPDATE DBACRESSEM.SOLICITACAO_REEMBOLSO_DESPESA
           SET NM_FUNCIONARIO      = :NM_FUNCIONARIO,
               NR_CPF_FUNCIONARIO  = :NR_CPF_FUNCIONARIO,
               DT_IDA              = TO_DATE(:DT_IDA, 'YYYY-MM-DD'),
               DT_VOLTA            = TO_DATE(:DT_VOLTA, 'YYYY-MM-DD'),
               DESC_JTF_EVENTO     = :DESC_JTF_EVENTO,
               NM_CIDADE           = :NM_CIDADE,
               NR_BANCO            = :NR_BANCO,
               CD_AGENCIA          = :CD_AGENCIA,
               NR_CONTA            = :NR_CONTA,
               DESC_ANDAMENTO      = :DESC_ANDAMENTO
         WHERE ID_SOLICITACAO_REEMBOLSO_DESPESA = :ID_SOLICITACAO_REEMBOLSO_DESPESA
      `;

      const resultUpdate = await connection.execute(updateSolicitacaoSql, {
        NM_FUNCIONARIO: String(req.body.NM_FUNCIONARIO || "").toUpperCase(),
        NR_CPF_FUNCIONARIO: onlyDigits(req.body.NR_CPF_FUNCIONARIO),
        DT_IDA: req.body.DT_IDA,
        DT_VOLTA: req.body.DT_VOLTA,
        DESC_JTF_EVENTO: req.body.DESC_JTF_EVENTO,
        NM_CIDADE: req.body.NM_CIDADE,
        NR_BANCO: req.body.NR_BANCO,
        CD_AGENCIA: req.body.CD_AGENCIA,
        NR_CONTA: req.body.NR_CONTA,
        DESC_ANDAMENTO: req.body.DESC_ANDAMENTO || "Pendente Financeiro",
        ID_SOLICITACAO_REEMBOLSO_DESPESA: idSolicitacao,
      });

      if (!resultUpdate.rowsAffected) {
        await connection.rollback();
        return res.status(404).json({
          error: "Solicitação não encontrada para edição.",
        });
      }

      await connection.execute(
        `
          DELETE FROM DBACRESSEM.DESPESA_SOLICITADA
          WHERE ID_SOLICITACAO = :id
        `,
        { id: idSolicitacao }
      );

      const linhasAntigas = (despesasAntigas.rows || []) as any[];
      const comprovantesAntigos = new Set<string>(
        linhasAntigas
          .map((row) => String(row?.COMPROVANTE || "").trim())
          .filter(Boolean)
      );

      const insertDespesaSql = `
        INSERT INTO DBACRESSEM.DESPESA_SOLICITADA (
          ID_DESPESA_SOLICITADA,
          ID_SOLICITACAO,
          TP_DESPESA,
          DESC_DESPESA,
          VALOR,
          COMPROVANTE
        ) VALUES (
          :ID_DESPESA_SOLICITADA,
          :ID_SOLICITACAO,
          :TP_DESPESA,
          :DESC_DESPESA,
          :VALOR,
          :COMPROVANTE
        )
      `;

      let nextDespesaId = await getNextDespesaId(connection);
      const comprovantesMantidos = new Set<string>();

      for (let i = 0; i < despesas.length; i++) {
        const despesa = despesas[i];
        const comprovanteEntrada = String(despesa?.COMPROVANTE || "").trim();
        let comprovantePath: string | null = null;

        // Aceita dois formatos:
        // 1) data URL (arquivo novo) => salva em disco
        // 2) caminho existente (edição sem troca de arquivo) => mantém referência
        if (comprovanteEntrada) {
          if (/^data:.+;base64,/i.test(comprovanteEntrada)) {
            comprovantePath = await salvarComprovante(
              comprovanteEntrada,
              despesa?.COMPROVANTE_NOME || null,
              idSolicitacao,
              i + 1,
              req.body.NM_FUNCIONARIO
            );
          } else {
            comprovantePath = comprovanteEntrada;
            comprovantesMantidos.add(comprovantePath);
          }
        }

        await connection.execute(insertDespesaSql, {
          ID_DESPESA_SOLICITADA: nextDespesaId,
          ID_SOLICITACAO: idSolicitacao,
          TP_DESPESA: despesa?.TP_DESPESA || "",
          DESC_DESPESA: despesa?.DESC_DESPESA || "",
          VALOR: toNumber(despesa?.VALOR, 0),
          COMPROVANTE: comprovantePath,
        });

        nextDespesaId += 1;
      }

      // Remove apenas comprovantes que não foram mantidos na edição.
      for (const caminhoAntigo of comprovantesAntigos) {
        if (!comprovantesMantidos.has(caminhoAntigo)) {
          await removeFileIfExists(caminhoAntigo);
        }
      }

      await connection.commit();

      let emailReenvioEnviado = false;
      let emailReenvioErro = "";

      try {
        const novoAndamento = String(
          req.body.DESC_ANDAMENTO || "Pendente Financeiro"
        ).trim();

        const precisaNotificarFinanceiro =
          andamentoAnterior === "Pendente Funcionario" &&
          novoAndamento === "Pendente Financeiro";

        if (precisaNotificarFinanceiro) {
          const emailFinanceiro = getEmailFinanceiro();
          const destinatariosFinanceiro = aplicarDebugDestinatariosReembolso(
            parseMailList(emailFinanceiro)
          );

          if (!destinatariosFinanceiro.length) {
            throw new Error(
              "Configure REEMBOLSO_FINANCEIRO_EMAIL ou FINANCEIRO_EMAIL no ambiente."
            );
          }

          const subject = `Solicitação de reembolso #${idSolicitacao} reenviada pelo funcionário`;
          const html = montarHtmlEmailReembolso({
            idSolicitacao,
            nomeFuncionario: String(req.body.NM_FUNCIONARIO || "").toUpperCase(),
            cpfFuncionario: onlyDigits(req.body.NR_CPF_FUNCIONARIO),
            cidade: String(req.body.NM_CIDADE || ""),
            dtIda: String(req.body.DT_IDA || ""),
            dtVolta: String(req.body.DT_VOLTA || ""),
            justificativa: String(req.body.DESC_JTF_EVENTO || ""),
            despesas,
          });

          await sendEmail(destinatariosFinanceiro, subject, html);
          emailReenvioEnviado = true;
        }
      } catch (emailErr: any) {
        emailReenvioErro = String(emailErr?.message || emailErr);
        console.error(
          "[REEMBOLSO] Erro ao enviar e-mail de reenvio ao financeiro:",
          emailErr
        );
      }

      return res.json({
        success: true,
        message: "Solicitação atualizada com sucesso.",
        ID_SOLICITACAO_REEMBOLSO_DESPESA: idSolicitacao,
        emailReenvioEnviado,
        ...(emailReenvioErro ? { emailReenvioErro } : {}),
      });
    } catch (err: any) {
      console.error("editar reembolso despesa erro:", err);

      if (connection) {
        try {
          await connection.rollback();
        } catch { }
      }

      return res.status(500).json({
        error: "Falha ao atualizar solicitação de reembolso.",
        details: String(err?.message || err),
      });
    } finally {
      if (connection) {
        try {
          await connection.close();
        } catch { }
      }
    }
  },

  async decidir(req: Request, res: Response) {
    let connection: oracledb.Connection | undefined;

    try {
      const idSolicitacao = Number(req.params.id);
      const nomeResponsavel = decodeURIComponent(
        String(req.params.nomeResponsavel || "")
      ).trim();
      const acao = String(req.body?.acao || "").trim().toLowerCase();
      const parecer = String(req.body?.parecer || "").trim();

      if (!Number.isFinite(idSolicitacao) || idSolicitacao <= 0) {
        return res.status(400).json({ error: "ID da solicitação inválido." });
      }

      if (!nomeResponsavel) {
        return res.status(400).json({ error: "Nome do responsável não informado." });
      }

      if (!acao || !["aprovar", "reprovar", "devolver"].includes(acao)) {
        return res.status(400).json({
          error: "Ação inválida. Use aprovar, reprovar ou devolver.",
        });
      }

      if (!parecer) {
        return res.status(400).json({ error: "Parecer não informado." });
      }

      const pool = await getOraclePool();
      connection = await pool.getConnection();

      const resultAtual = await connection.execute(
        `
        SELECT
          ID_SOLICITACAO_REEMBOLSO_DESPESA,
          DESC_ANDAMENTO,
          NM_FUNCIONARIO,
          ID_SOLICITANTE,
          ID_APROV_GERENCIA,
          ID_APROV_GERENCIA_SUP,
          ID_APROV_DIRETORIA
        FROM DBACRESSEM.SOLICITACAO_REEMBOLSO_DESPESA
        WHERE ID_SOLICITACAO_REEMBOLSO_DESPESA = :id
      `,
        { id: idSolicitacao },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      if (!resultAtual.rows?.length) {
        return res.status(404).json({ error: "Solicitação não encontrada." });
      }

      const atual: any = resultAtual.rows[0];
      const andamentoAtual = String(atual.DESC_ANDAMENTO || "");
      const nomeSolicitante = String(atual.NM_FUNCIONARIO || "");
      let idSolicitante = Number(atual.ID_SOLICITANTE || 0);
      let idAprovGerencia = Number(atual.ID_APROV_GERENCIA || 0);
      let idAprovGerenciaSup = Number(atual.ID_APROV_GERENCIA_SUP || 0);
      let idAprovDiretoria = Number(atual.ID_APROV_DIRETORIA || 0);

      if (!idSolicitante || !idAprovDiretoria) {
        const aprovadores = await derivarAprovadoresPorEscala(connection, nomeSolicitante);
        idSolicitante = idSolicitante || Number(aprovadores.idSolicitante || 0);
        idAprovGerencia =
          idAprovGerencia || Number(aprovadores.idAprovGerencia || 0);
        idAprovGerenciaSup =
          idAprovGerenciaSup || Number(aprovadores.idAprovGerenciaSup || 0);
        idAprovDiretoria =
          idAprovDiretoria || Number(aprovadores.idAprovDiretoria || 0);

        await connection.execute(
          `
            UPDATE DBACRESSEM.SOLICITACAO_REEMBOLSO_DESPESA
               SET ID_SOLICITANTE = NVL(ID_SOLICITANTE, :ID_SOLICITANTE),
                   ID_APROV_GERENCIA = NVL(ID_APROV_GERENCIA, :ID_APROV_GERENCIA),
                   ID_APROV_GERENCIA_SUP = NVL(ID_APROV_GERENCIA_SUP, :ID_APROV_GERENCIA_SUP),
                   ID_APROV_DIRETORIA = NVL(ID_APROV_DIRETORIA, :ID_APROV_DIRETORIA)
             WHERE ID_SOLICITACAO_REEMBOLSO_DESPESA = :id
          `,
          {
            id: idSolicitacao,
            ID_SOLICITANTE: aprovadores.idSolicitante || null,
            ID_APROV_GERENCIA: aprovadores.idAprovGerencia || null,
            ID_APROV_GERENCIA_SUP: aprovadores.idAprovGerenciaSup || null,
            ID_APROV_DIRETORIA: aprovadores.idAprovDiretoria || null,
          }
        );
      }

      let sql = "";
      let binds: Record<string, any> = {
        id: idSolicitacao,
        parecer,
        nomeResponsavel,
      };
      let novoAndamento = andamentoAtual;

      if (andamentoAtual === "Pendente Financeiro") {
        if (acao === "aprovar") {
          const proximoAndamento = await resolverProximoAndamentoPorHierarquia(
            connection,
            nomeSolicitante,
            "Pendente Financeiro",
            {
              idAprovGerencia,
              idAprovGerenciaSup,
              idAprovDiretoria,
            }
          );

          sql = `
          UPDATE DBACRESSEM.SOLICITACAO_REEMBOLSO_DESPESA
             SET DESC_PRC_FINANCEIRO = :parecer,
                 NM_FNC_FINANCEIRO = :nomeResponsavel,
                 DESC_ANDAMENTO = :proximoAndamento
          WHERE ID_SOLICITACAO_REEMBOLSO_DESPESA = :id
        `;
          binds.proximoAndamento = proximoAndamento;
          novoAndamento = proximoAndamento;
        } else if (acao === "devolver") {
          sql = `
          UPDATE DBACRESSEM.SOLICITACAO_REEMBOLSO_DESPESA
             SET DESC_PRC_FINANCEIRO = :parecer,
                 NM_FNC_FINANCEIRO = :nomeResponsavel,
                 DESC_ANDAMENTO = 'Pendente Funcionario'
           WHERE ID_SOLICITACAO_REEMBOLSO_DESPESA = :id
        `;
          novoAndamento = "Pendente Funcionario";
        } else {
          return res.status(400).json({
            error: "Ação inválida para Pendente Financeiro. Use aprovar ou devolver.",
          });
        }
      } else if (andamentoAtual === "Pendente Gerencia") {
        if (acao === "aprovar") {
          const proximoAndamento = await resolverProximoAndamentoPorHierarquia(
            connection,
            nomeSolicitante,
            "Pendente Gerencia",
            {
              idAprovGerencia,
              idAprovGerenciaSup,
              idAprovDiretoria,
            }
          );

          sql = `
          UPDATE DBACRESSEM.SOLICITACAO_REEMBOLSO_DESPESA
             SET DESC_PRC_GERENCIA = :parecer,
                 NM_FNC_GERENCIA = :nomeResponsavel,
                 DESC_ANDAMENTO = :proximoAndamento
          WHERE ID_SOLICITACAO_REEMBOLSO_DESPESA = :id
        `;
          binds.proximoAndamento = proximoAndamento;
          novoAndamento = proximoAndamento;
        } else if (acao === "reprovar") {
          sql = `
          UPDATE DBACRESSEM.SOLICITACAO_REEMBOLSO_DESPESA
             SET DESC_PRC_GERENCIA = :parecer,
                 NM_FNC_GERENCIA = :nomeResponsavel,
                 DESC_ANDAMENTO = 'Reprovado'
           WHERE ID_SOLICITACAO_REEMBOLSO_DESPESA = :id
        `;
          novoAndamento = "Reprovado";
        } else {
          return res.status(400).json({
            error: "Ação inválida para Pendente Gerencia. Use aprovar ou reprovar.",
          });
        }
      } else if (andamentoAtual === "Pendente Gerencia Superior") {
        if (acao === "aprovar") {
          sql = `
          UPDATE DBACRESSEM.SOLICITACAO_REEMBOLSO_DESPESA
             SET DESC_PRC_GERENCIA_SUP = :parecer,
                 NM_FNC_GERENCIA_SUP = :nomeResponsavel,
                 DESC_ANDAMENTO = 'Pendente Diretoria'
           WHERE ID_SOLICITACAO_REEMBOLSO_DESPESA = :id
        `;
          novoAndamento = "Pendente Diretoria";
        } else if (acao === "reprovar") {
          sql = `
          UPDATE DBACRESSEM.SOLICITACAO_REEMBOLSO_DESPESA
             SET DESC_PRC_GERENCIA_SUP = :parecer,
                 NM_FNC_GERENCIA_SUP = :nomeResponsavel,
                 DESC_ANDAMENTO = 'Reprovado'
           WHERE ID_SOLICITACAO_REEMBOLSO_DESPESA = :id
        `;
          novoAndamento = "Reprovado";
        } else {
          return res.status(400).json({
            error: "Ação inválida para Pendente Gerencia Superior. Use aprovar ou reprovar.",
          });
        }
      } else if (andamentoAtual === "Pendente Diretoria") {
        if (acao === "aprovar") {
          sql = `
          UPDATE DBACRESSEM.SOLICITACAO_REEMBOLSO_DESPESA
             SET DESC_PRC_DIRETORIA = :parecer,
                 NM_FNC_DIRETORIA = :nomeResponsavel,
                 DESC_ANDAMENTO = 'Aprovado'
           WHERE ID_SOLICITACAO_REEMBOLSO_DESPESA = :id
        `;
          novoAndamento = "Aprovado";
        } else if (acao === "reprovar") {
          sql = `
          UPDATE DBACRESSEM.SOLICITACAO_REEMBOLSO_DESPESA
             SET DESC_PRC_DIRETORIA = :parecer,
                 NM_FNC_DIRETORIA = :nomeResponsavel,
                 DESC_ANDAMENTO = 'Reprovado'
           WHERE ID_SOLICITACAO_REEMBOLSO_DESPESA = :id
        `;
          novoAndamento = "Reprovado";
        } else {
          return res.status(400).json({
            error: "Ação inválida para Pendente Diretoria. Use aprovar ou reprovar.",
          });
        }
      } else {
        return res.status(400).json({
          error: `Não é possível decidir uma solicitação com status "${andamentoAtual}".`,
        });
      }

      const resultUpdate = await connection.execute(sql, binds);

      if (!resultUpdate.rowsAffected) {
        await connection.rollback();
        return res.status(404).json({ error: "Solicitação não encontrada para atualização." });
      }

      await connection.commit();

      let notificacao: any = {
        enviado: false,
        destinatarios: [],
      };
      let notificacaoPendencia: any = {
        enviado: false,
        destinatarios: [],
      };

      try {
        notificacao = await enviarNotificacaoDecisaoReembolso(connection, {
          idSolicitacao,
          nomeSolicitante,
          etapaAnterior: andamentoAtual,
          etapaAtual: novoAndamento,
          acao,
          nomeResponsavel,
          parecer,
          idSolicitante,
          idAprovGerencia,
          idAprovGerenciaSup,
          idAprovDiretoria,
        });
      } catch (emailErr: any) {
        console.error(
          "[REEMBOLSO] Erro ao enviar notificação de decisão:",
          emailErr
        );
        notificacao = {
          enviado: false,
          destinatarios: [],
          erro: String(emailErr?.message || emailErr),
        };
      }

      try {
        notificacaoPendencia = await enviarEmailPendenciaProximoAprovador(
          connection,
          {
            idSolicitacao,
            etapaAtual: novoAndamento,
            idAprovGerencia,
            idAprovGerenciaSup,
            idAprovDiretoria,
          }
        );
      } catch (emailErr: any) {
        console.error(
          "[REEMBOLSO] Erro ao enviar notificação de pendência para próximo aprovador:",
          emailErr
        );
        notificacaoPendencia = {
          enviado: false,
          destinatarios: [],
          erro: String(emailErr?.message || emailErr),
        };
      }

      return res.json({
        success: true,
        message: "Solicitação atualizada com sucesso.",
        id: idSolicitacao,
        acao,
        andamento_anterior: andamentoAtual,
        andamento_atual: novoAndamento,
        notificacao,
        notificacaoPendencia,
      });
    } catch (err: any) {
      console.error("decidir reembolso despesa erro:", err);

      if (connection) {
        try {
          await connection.rollback();
        } catch { }
      }

      return res.status(500).json({
        error: "Falha ao decidir solicitação de reembolso.",
        details: String(err?.message || err),
      });
    } finally {
      if (connection) {
        try {
          await connection.close();
        } catch { }
      }
    }
  },

  async concluir(req: Request, res: Response) {
    let connection: oracledb.Connection | undefined;

    try {
      const idSolicitacao = Number(req.params.id);

      if (!Number.isFinite(idSolicitacao) || idSolicitacao <= 0) {
        return res.status(400).json({ error: "ID da solicitação inválido." });
      }

      const pool = await getOraclePool();
      connection = await pool.getConnection();

      const result = await connection.execute(
        `
        UPDATE DBACRESSEM.SOLICITACAO_REEMBOLSO_DESPESA
           SET SN_FINALIZADO = 1,
               DT_FINALIZADO = TRUNC(SYSDATE)
         WHERE ID_SOLICITACAO_REEMBOLSO_DESPESA = :id
           AND DESC_ANDAMENTO = 'Aprovado'
           AND NVL(SN_FINALIZADO, 0) <> 1
      `,
        { id: idSolicitacao }
      );

      if (!result.rowsAffected) {
        await connection.rollback();
        return res.status(400).json({
          error: "Só é possível concluir solicitações aprovadas e ainda não finalizadas.",
        });
      }

      await connection.commit();

      return res.json({
        success: true,
        message: "Solicitação concluída com sucesso.",
        id: idSolicitacao,
      });
    } catch (err: any) {
      console.error("concluir reembolso despesa erro:", err);

      if (connection) {
        try {
          await connection.rollback();
        } catch { }
      }

      return res.status(500).json({
        error: "Falha ao concluir solicitação de reembolso.",
        details: String(err?.message || err),
      });
    } finally {
      if (connection) {
        try {
          await connection.close();
        } catch { }
      }
    }
  },

  async buscarPorId(req: Request, res: Response) {
    let connection: oracledb.Connection | undefined;

    try {
      const id = Number(req.params.id);

      if (!Number.isFinite(id) || id <= 0) {
        return res.status(400).json({ error: "ID inválido." });
      }

      const pool = await getOraclePool();
      connection = await pool.getConnection();

      const resultSolicitacao = await connection.execute(
        `
          SELECT
            ID_SOLICITACAO_REEMBOLSO_DESPESA,
            NM_FUNCIONARIO,
            NR_CPF_FUNCIONARIO,
            TO_CHAR(DT_IDA, 'YYYY-MM-DD') AS DT_IDA,
            TO_CHAR(DT_VOLTA, 'YYYY-MM-DD') AS DT_VOLTA,
            DESC_JTF_EVENTO,
            NM_CIDADE,
            NR_BANCO,
            CD_AGENCIA,
            NR_CONTA,
            DESC_ANDAMENTO
          FROM DBACRESSEM.SOLICITACAO_REEMBOLSO_DESPESA
          WHERE ID_SOLICITACAO_REEMBOLSO_DESPESA = :id
        `,
        { id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      if (!resultSolicitacao.rows?.length) {
        return res.status(404).json({ error: "Solicitação não encontrada." });
      }

      const solicitacao: any = resultSolicitacao.rows[0];

      const resultDespesas = await connection.execute(
        `
          SELECT
            ID_DESPESA_SOLICITADA,
            TP_DESPESA,
            DESC_DESPESA,
            VALOR,
            COMPROVANTE
          FROM DBACRESSEM.DESPESA_SOLICITADA
          WHERE ID_SOLICITACAO = :id
          ORDER BY ID_DESPESA_SOLICITADA
        `,
        { id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const despesas = (resultDespesas.rows || []).map((row: any) => ({
        ID_DESPESA_SOLICITADA: row.ID_DESPESA_SOLICITADA,
        TP_DESPESA: row.TP_DESPESA || "",
        DESC_DESPESA: row.DESC_DESPESA || "",
        VALOR: Number(row.VALOR || 0),
        COMPROVANTE: row.COMPROVANTE || null,
        COMPROVANTE_NOME: row.COMPROVANTE
          ? path.basename(String(row.COMPROVANTE))
          : null,
      }));

      return res.json({
        ...solicitacao,
        DESPESAS: despesas,
      });
    } catch (err: any) {
      console.error("buscarPorId reembolso despesa erro:", err);

      return res.status(500).json({
        error: "Falha ao buscar solicitação.",
        details: String(err?.message || err),
      });
    } finally {
      if (connection) {
        try {
          await connection.close();
        } catch { }
      }
    }
  },

  async downloadComprovante(req: Request, res: Response) {
    try {
      const oficio = String(req.body?.oficio || req.query?.oficio || "");

      if (!oficio) {
        return res.status(400).json({ error: "Arquivo não informado." });
      }

      const filePath = path.isAbsolute(oficio) || isUncPath(oficio)
        ? oficio
        : path.resolve(process.cwd(), oficio);

      await fs.access(filePath);

      return res.download(filePath, path.basename(filePath));
    } catch (err: any) {
      console.error("downloadComprovante erro:", err);
      return res.status(404).json({
        error: "Arquivo não encontrado.",
        details: String(err?.message || err),
      });
    }
  },
};
