import oracledb from "oracledb";
import { oracleExecute, oracleExecuteCommit } from "./oracle.service";
import { sendEmail } from "./email.service";
import os from "os";

const EMAIL_RH = [
  "paloma.eduarda@sicoob.com.br",
  "jorge.gregorio@sicoob.com.br",
];

const EMAIL_DIRETORIA = [
  "tiago.teixeira@sicoob.com.br",
  "paulo.tarso@sicoob.com.br",
  "luiz.gerhard@sicoob.com.br",
];

const EMAIL_TI = [
  "informatica.cressem@sicoob.com.br",
  "monica.torres@sicoob.com.br",
];
const ROTINA = "FERIAS_NOTIFICACAO";

type TipoNotificacaoMensal = "RH_DIRETORIA" | "GERENCIAS" | "PREVIA_DIA17";
type TipoNotificacaoTiFerias = "RETORNO_PREVIA" | "RETORNO_DIA" | "TODAS";

function getAllowedEmailIps() {
  return String(process.env.EMAIL_ALLOWED_IPS || "")
    .split(",")
    .map((ip) => ip.trim())
    .filter(Boolean);
}

function getLocalIpv4s() {
  const nets = os.networkInterfaces();
  const ips = new Set<string>();

  Object.values(nets).forEach((entries) => {
    (entries || []).forEach((entry) => {
      if (!entry) return;
      if (entry.family !== "IPv4") return;
      if (entry.internal) return;
      if (!entry.address) return;
      ips.add(entry.address);
    });
  });

  return Array.from(ips);
}

function validarHostAutorizadoParaEmail() {
  const ipsPermitidos = getAllowedEmailIps();
  const ipsLocais = getLocalIpv4s();

  if (!ipsPermitidos.length) {
    return {
      autorizado: true,
      motivo: "EMAIL_ALLOWED_IPS não configurado; envio liberado.",
      ipsPermitidos,
      ipsLocais,
    };
  }

  const autorizado = ipsLocais.some((ip) => ipsPermitidos.includes(ip));
  return {
    autorizado,
    motivo: autorizado
      ? "Host autorizado para envio."
      : `Host sem IP autorizado. Locais=[${ipsLocais.join(", ")}] Permitidos=[${ipsPermitidos.join(", ")}]`,
    ipsPermitidos,
    ipsLocais,
  };
}

function dataRefMesSaoPaulo(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((p) => p.type === "year")?.value || "0000";
  const month = parts.find((p) => p.type === "month")?.value || "00";
  const day = Number(parts.find((p) => p.type === "day")?.value || "0");

  return {
    refMes: `${year}-${month}`,
    diaDoMes: day,
  };
}

function chaveControle(tipo: TipoNotificacaoMensal, refMes: string) {
  return `${ROTINA}:${tipo}:${refMes}`;
}

function destinatarioControle(tipo: TipoNotificacaoMensal) {
  return tipo === "RH_DIRETORIA"
    ? "RH_DIRETORIA@INTRANET"
    : "GERENCIAS@INTRANET";
}

function assuntoControle(tipo: TipoNotificacaoMensal, refMes: string) {
  return `Controle envio ${tipo} ${refMes}`;
}

async function reservarEnvioNoMes(tipo: TipoNotificacaoMensal, refMes: string) {
  const idempotencyKey = chaveControle(tipo, refMes);

  try {
    await oracleExecuteCommit(
      `
        INSERT INTO DBACRESSEM.EMAIL_ENVIO_CONTROLE (
          ID_EMPOTENCY_KEY,
          NM_ROTINA,
          NM_COMPETENCIA,
          NM_DESTINATARIO,
          NM_ASSUNTO,
          NM_STATUS,
          NM_ORIGEM_HOST,
          NM_ORIGEM_PID
        ) VALUES (
          :idempotencyKey,
          :rotina,
          :competencia,
          :destinatario,
          :assunto,
          'RESERVADO',
          :origemHost,
          :origemPid
        )
      `,
      {
        idempotencyKey,
        rotina: ROTINA,
        competencia: refMes,
        destinatario: destinatarioControle(tipo),
        assunto: assuntoControle(tipo, refMes),
        origemHost: os.hostname(),
        origemPid: String(process.pid),
      }
    );
    return true;
  } catch (error: any) {
    const message = String(error?.message || "");
    const jaExiste =
      error?.errorNum === 1 ||
      message.includes("ORA-00001") ||
      message.toUpperCase().includes("UNIQUE");

    if (jaExiste) return false;
    throw error;
  }
}

async function marcarEnviadoNoMes(tipo: TipoNotificacaoMensal, refMes: string) {
  const idempotencyKey = chaveControle(tipo, refMes);
  await oracleExecuteCommit(
    `
      UPDATE DBACRESSEM.EMAIL_ENVIO_CONTROLE
         SET NM_STATUS = 'ENVIADO',
             DT_SENT_AT = SYSDATE,
             NM_ERRO = NULL
       WHERE ID_EMPOTENCY_KEY = :idempotencyKey
    `,
    { idempotencyKey }
  );
}

async function marcarFalhaNoMes(
  tipo: TipoNotificacaoMensal,
  refMes: string,
  erro: unknown
) {
  const idempotencyKey = chaveControle(tipo, refMes);
  const erroTexto = String((erro as any)?.message || erro || "").slice(0, 2000);
  await oracleExecuteCommit(
    `
      UPDATE DBACRESSEM.EMAIL_ENVIO_CONTROLE
         SET NM_STATUS = 'FALHA',
             NM_ERRO = :erro
       WHERE ID_EMPOTENCY_KEY = :idempotencyKey
    `,
    {
      idempotencyKey,
      erro: erroTexto || "Falha sem detalhe.",
    }
  );
}

async function limparReservaNoMes(tipo: TipoNotificacaoMensal, refMes: string) {
  const idempotencyKey = chaveControle(tipo, refMes);
  await oracleExecuteCommit(
    `
      DELETE FROM DBACRESSEM.EMAIL_ENVIO_CONTROLE
       WHERE ID_EMPOTENCY_KEY = :idempotencyKey
         AND NM_STATUS = 'RESERVADO'
    `,
    { idempotencyKey }
  );
}

function podeExecutarMensalHoje(force = false) {
  if (force) return true;
  const { diaDoMes } = dataRefMesSaoPaulo();
  return diaDoMes >= 1 && diaDoMes <= 3;
}

function podeExecutarPreviaDia17Hoje(force = false) {
  if (force) return true;
  const { diaDoMes } = dataRefMesSaoPaulo();
  return diaDoMes === 17;
}

function alvoDoAvisoDia17(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);

  const anoBase = Number(parts.find((p) => p.type === "year")?.value || "0");
  const mesBase = Number(parts.find((p) => p.type === "month")?.value || "0");
  const idxBase = anoBase * 12 + (mesBase - 1);
  const idxAlvo = idxBase + 2;
  const anoAlvo = Math.floor(idxAlvo / 12);
  const mesAlvo = (idxAlvo % 12) + 1;

  return {
    anoAlvo,
    mesAlvo,
    refAlvo: `${anoAlvo}-${String(mesAlvo).padStart(2, "0")}`,
  };
}



function dataBR(value: any) {
  if (!value) return "-";

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString("pt-BR");
}

function mesAnoAtual() {
  const hoje = new Date();

  return {
    mes: String(hoje.getMonth() + 1).padStart(2, "0"),
    ano: hoje.getFullYear(),
  };
}

function hojeSaoPaulo() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = Number(parts.find((p) => p.type === "year")?.value || "0");
  const month = Number(parts.find((p) => p.type === "month")?.value || "1");
  const day = Number(parts.find((p) => p.type === "day")?.value || "1");

  return new Date(year, month - 1, day);
}

function addDiasEm(dataBase: Date, dias: number) {
  const data = new Date(dataBase);
  data.setDate(data.getDate() + dias);
  return data;
}

function ehFimDeSemana(data: Date) {
  const diaSemana = data.getDay();
  return diaSemana === 0 || diaSemana === 6;
}

function proximoDiaUtil(dataBase: Date) {
  let data = addDiasEm(dataBase, 1);

  while (ehFimDeSemana(data)) {
    data = addDiasEm(data, 1);
  }

  return data;
}

function descricaoPreviaRetorno(hoje: Date, dataRetorno: Date) {
  const diffDias = Math.round(
    (dataRetorno.getTime() - hoje.getTime()) / (24 * 60 * 60 * 1000)
  );

  return diffDias > 1 ? "no próximo dia útil" : "amanhã";
}

function feriasFakeTeste() {
  const hoje = new Date();
  const fim = new Date();
  fim.setDate(hoje.getDate() + 10);

  return [
    {
      ID_FERIAS_FUNCIONARIOS: 999999,
      ID_FUNCIONARIO: 999999,
      NOME: "Funcionário Teste",
      EMAIL: "teste@sicoob.com.br",
      DT_DIA_INICIO: hoje,
      DT_DIA_FIM: fim,
      NOME_GERENTE: "Gerente Teste",
      EMAIL_GERENTE: "monica.torres@sicoob.com.br",
    },
  ];
}

function escapeHtml(value: any) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function montarLinhaInfoFerias(label: string, value: any) {
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

function montarWrapperEmailFerias(conteudo: string) {
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

function montarHtmlEmailFerias(params: {
  titulo: string;
  introducao: string;
  introducaoHtml?: string;
  listaHtml: string;
  observacaoFinal?: string;
}) {
  const conteudo = `
    <tr>
      <td style="background:#00AE9D;padding:22px 26px;color:#ffffff;">
        <div style="font-size:12px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;opacity:.9;">
          Gestão de férias
        </div>
        <h2 style="margin:6px 0 0;font-size:22px;line-height:1.3;font-weight:700;">
          ${escapeHtml(params.titulo)}
        </h2>
      </td>
    </tr>

    <tr>
      <td style="padding:24px 26px;">
        <p style="margin:0 0 18px;font-size:14px;line-height:1.6;color:#4b5563;">
          ${params.introducaoHtml || escapeHtml(params.introducao)}
        </p>

        ${params.listaHtml}

        <p style="margin:18px 0 0;font-size:13px;line-height:1.6;color:#4b5563;">
          ${escapeHtml(params.observacaoFinal || "Este e-mail foi enviado automaticamente pela intranet.")}
        </p>
      </td>
    </tr>
  `;

  return montarWrapperEmailFerias(conteudo);
}

function buildListaHtml(rows: any[]) {
  if (!rows?.length) {
    return `
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:separate;border-spacing:0;border:1px solid #e1e8e4;border-radius:10px;overflow:hidden;">
        ${montarLinhaInfoFerias("Registros", "Nenhum registro para exibir")}
      </table>
    `;
  }

  return `
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:separate;border-spacing:0;border:1px solid #e1e8e4;border-radius:10px;overflow:hidden;">
      <thead>
        <tr>
          <th style="padding:11px 14px;background:#eef5f1;border-bottom:1px solid #dce7e1;color:#2f3a35;font-size:13px;text-align:left;">
            Colaborador
          </th>
          <th style="padding:11px 14px;background:#eef5f1;border-bottom:1px solid #dce7e1;color:#2f3a35;font-size:13px;text-align:left;width:150px;">
            Início
          </th>
          <th style="padding:11px 14px;background:#eef5f1;border-bottom:1px solid #dce7e1;color:#2f3a35;font-size:13px;text-align:left;width:150px;">
            Fim
          </th>
        </tr>
      </thead>
      <tbody>
        ${rows
      .map(
        (row) => `
              <tr>
                <td style="padding:12px 14px;border-bottom:1px solid #edf1ef;color:#374151;font-weight:600;">
                  ${escapeHtml(row.NOME || row.NM_FUNCIONARIO || "-")}
                </td>
                <td style="padding:12px 14px;border-bottom:1px solid #edf1ef;color:#374151;">
                  ${escapeHtml(dataBR(row.DT_DIA_INICIO))}
                </td>
                <td style="padding:12px 14px;border-bottom:1px solid #edf1ef;color:#374151;">
                  ${escapeHtml(dataBR(row.DT_DIA_FIM))}
                </td>
              </tr>
            `
      )
      .join("")}
      </tbody>
    </table>
  `;
}

async function buscarFeriasMesAtual() {
  const sql = `
    SELECT
      F.ID_FERIAS_FUNCIONARIOS,
      F.DT_DIA_INICIO,
      F.DT_DIA_FIM,
      F.DT_DIAS_TOTAIS,
      F.ID_FUNCIONARIO,
      P.NM_FUNCIONARIO AS NOME,
      P.EMAIL AS EMAIL,
      P.CD_GERENCIA,
      G.NM_FUNCIONARIO AS NOME_GERENTE,
      G.EMAIL AS EMAIL_GERENTE
    FROM DBACRESSEM.FERIAS_FUNCIONARIOS F
    JOIN DBACRESSEM.FUNCIONARIOS_SICOOB_CRESSEM P
      ON P.ID_FUNCIONARIO = F.ID_FUNCIONARIO
    LEFT JOIN DBACRESSEM.FUNCIONARIOS_SICOOB_CRESSEM G
      ON G.ID_FUNCIONARIO = P.CD_GERENCIA
    WHERE EXTRACT(MONTH FROM F.DT_DIA_INICIO) = EXTRACT(MONTH FROM SYSDATE)
      AND EXTRACT(YEAR FROM F.DT_DIA_INICIO) = EXTRACT(YEAR FROM SYSDATE)
    ORDER BY F.DT_DIA_INICIO, P.NM_FUNCIONARIO
  `;

  const result = await oracleExecute(
    sql,
    {},
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  return (result.rows || []) as any[];
}

async function buscarFeriasPorMesAno(mes: number, ano: number) {
  const sql = `
    SELECT
      F.ID_FERIAS_FUNCIONARIOS,
      F.DT_DIA_INICIO,
      F.DT_DIA_FIM,
      F.DT_DIAS_TOTAIS,
      F.ID_FUNCIONARIO,
      P.NM_FUNCIONARIO AS NOME,
      P.EMAIL AS EMAIL,
      P.CD_GERENCIA,
      G.NM_FUNCIONARIO AS NOME_GERENTE,
      G.EMAIL AS EMAIL_GERENTE
    FROM DBACRESSEM.FERIAS_FUNCIONARIOS F
    JOIN DBACRESSEM.FUNCIONARIOS_SICOOB_CRESSEM P
      ON P.ID_FUNCIONARIO = F.ID_FUNCIONARIO
    LEFT JOIN DBACRESSEM.FUNCIONARIOS_SICOOB_CRESSEM G
      ON G.ID_FUNCIONARIO = P.CD_GERENCIA
    WHERE EXTRACT(MONTH FROM F.DT_DIA_INICIO) = :mes
      AND EXTRACT(YEAR FROM F.DT_DIA_INICIO) = :ano
    ORDER BY F.DT_DIA_INICIO, P.NM_FUNCIONARIO
  `;

  const result = await oracleExecute(
    sql,
    { mes, ano },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  return (result.rows || []) as any[];
}

//função para fins de teste de envio do e-mail ao RH/Diretoria
{/*async function buscarFeriasMesAtual() {
  console.log("[FÉRIAS TESTE] Usando férias fake para teste.");

  return feriasFakeTeste();

  //depois do teste, remova o return acima e volte para o SQL original
}*/}

async function buscarRetornoNaData(dataRetorno: Date) {
  const sql = `
    SELECT
      F.ID_FERIAS_FUNCIONARIOS,
      F.DT_DIA_INICIO,
      F.DT_DIA_FIM,
      F.ID_FUNCIONARIO,
      P.NM_FUNCIONARIO AS NOME,
      P.EMAIL
    FROM DBACRESSEM.FERIAS_FUNCIONARIOS F
    JOIN DBACRESSEM.FUNCIONARIOS_SICOOB_CRESSEM P
      ON P.ID_FUNCIONARIO = F.ID_FUNCIONARIO
    WHERE TRUNC(F.DT_DIA_FIM) + 1 = TRUNC(:dataRetorno)
    ORDER BY P.NM_FUNCIONARIO
  `;

  const result = await oracleExecute(
    sql,
    { dataRetorno },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  return (result.rows || []) as any[];
}

export async function enviarEmailRhDiretoria() {
  const rows = await buscarFeriasMesAtual();

  if (!rows.length) {
    console.log("[Férias] Nenhum início de férias no mês para RH/Diretoria.");
    return { enviados: 0 };
  }

  const { mes, ano } = mesAnoAtual();

  const assunto = `[RH/Diretoria] Férias do mês ${mes}/${ano}`;

  const html = montarHtmlEmailFerias({
    titulo: `Férias do mês ${mes}/${ano}`,
    introducao: `Colaboradores que iniciam férias em ${mes}/${ano}.`,
    listaHtml: buildListaHtml(rows),
    observacaoFinal: "Atenciosamente, Equipe RH.",
  });

  await sendEmail([...EMAIL_RH, ...EMAIL_DIRETORIA], assunto, html);

  return { enviados: 1 };
}

export async function enviarEmailGerencias() {
  const rows = await buscarFeriasMesAtual();

  if (!rows.length) {
    console.log("[Férias] Nenhum início de férias no mês para Gerências.");
    return { enviados: 0 };
  }

  const porGerente: Record<string, any[]> = {};

  for (const row of rows) {
    const emailGerente = String(row.EMAIL_GERENTE || "").trim();

    if (!emailGerente) continue;

    if (!porGerente[emailGerente]) {
      porGerente[emailGerente] = [];
    }

    porGerente[emailGerente].push(row);
  }

  const { mes, ano } = mesAnoAtual();

  let enviados = 0;

  for (const emailGerente of Object.keys(porGerente)) {
    const itens = porGerente[emailGerente];
    const nomeGerente = itens[0]?.NOME_GERENTE || "Gerência";

    const assunto = `[Gerência] Férias dos seus liderados em ${mes}/${ano}`;

    const html = montarHtmlEmailFerias({
      titulo: `Férias dos liderados - ${mes}/${ano}`,
      introducao: `Olá, ${nomeGerente}. Seguem os liderados que iniciam férias em ${mes}/${ano}.`,
      introducaoHtml: `Olá, <strong>${escapeHtml(nomeGerente)}</strong>. Seguem os liderados que iniciam férias em ${escapeHtml(`${mes}/${ano}`)}.`,
      listaHtml: buildListaHtml(itens),
      observacaoFinal: "Qualquer dúvida, conte com o RH.",
    });

    await sendEmail(emailGerente, assunto, html);
    enviados++;
  }

  return { enviados };
}

async function enviarEmailPreviaRhDiretoriaDia17(params: {
  mesAlvo: number;
  anoAlvo: number;
}) {
  const { mesAlvo, anoAlvo } = params;
  const rows = await buscarFeriasPorMesAno(mesAlvo, anoAlvo);
  const mesFmt = String(mesAlvo).padStart(2, "0");

  if (!rows.length) {
    const assunto = `[RH/Diretoria] Prévia de férias ${mesFmt}/${anoAlvo} - sem cadastro`;
    const html = montarHtmlEmailFerias({
      titulo: `Prévia de férias ${mesFmt}/${anoAlvo}`,
      introducao: `Não há cadastro de férias para ${mesFmt}/${anoAlvo}.`,
      listaHtml: buildListaHtml([]),
      observacaoFinal: "Sem registros para o período consultado.",
    });
    await sendEmail(EMAIL_RH, assunto, html);
    return { enviados: 1, semCadastro: true };
  }

  const assunto = `[RH/Diretoria] Prévia de férias ${mesFmt}/${anoAlvo}`;
  const html = montarHtmlEmailFerias({
    titulo: `Prévia de férias ${mesFmt}/${anoAlvo}`,
    introducao: `Colaboradores que iniciam férias em ${mesFmt}/${anoAlvo}.`,
    listaHtml: buildListaHtml(rows),
  });

  await sendEmail([...EMAIL_RH, ...EMAIL_DIRETORIA], assunto, html);
  return { enviados: 1, semCadastro: false };
}

async function enviarEmailPreviaGerenciasDia17(params: {
  mesAlvo: number;
  anoAlvo: number;
}) {
  const { mesAlvo, anoAlvo } = params;
  const rows = await buscarFeriasPorMesAno(mesAlvo, anoAlvo);
  const mesFmt = String(mesAlvo).padStart(2, "0");

  if (!rows.length) {
    return { enviados: 0, semCadastro: true };
  }

  const porGerente: Record<string, any[]> = {};
  for (const row of rows) {
    const emailGerente = String(row.EMAIL_GERENTE || "").trim();
    if (!emailGerente) continue;
    if (!porGerente[emailGerente]) {
      porGerente[emailGerente] = [];
    }
    porGerente[emailGerente].push(row);
  }

  let enviados = 0;
  for (const emailGerente of Object.keys(porGerente)) {
    const itens = porGerente[emailGerente];
    const nomeGerente = itens[0]?.NOME_GERENTE || "Gerência";
    const assunto = `[Gerência] Prévia de férias dos liderados ${mesFmt}/${anoAlvo}`;
    const html = montarHtmlEmailFerias({
      titulo: `Prévia de férias dos liderados ${mesFmt}/${anoAlvo}`,
      introducao: `Olá, ${nomeGerente}. Seguem os liderados com início de férias em ${mesFmt}/${anoAlvo}.`,
      introducaoHtml: `Olá, <strong>${escapeHtml(nomeGerente)}</strong>. Seguem os liderados com início de férias em ${escapeHtml(`${mesFmt}/${anoAlvo}`)}.`,
      listaHtml: buildListaHtml(itens),
    });
    await sendEmail(emailGerente, assunto, html);
    enviados++;
  }

  return { enviados, semCadastro: false };
}

export async function enviarEmailTiFerias(options?: {
  tipo?: TipoNotificacaoTiFerias;
}) {
  const tipo = options?.tipo || "TODAS";
  const gate = validarHostAutorizadoParaEmail();
  if (!gate.autorizado) {
    console.log(`[FÉRIAS][TI] Envio pulado: ${gate.motivo}`);
    return { enviados: 0, pulado: true, motivo: gate.motivo };
  }

  const hoje = hojeSaoPaulo();
  const dataProximoRetorno = proximoDiaUtil(hoje);
  const executarPrevia = tipo === "RETORNO_PREVIA" || tipo === "TODAS";
  const executarDia = tipo === "RETORNO_DIA" || tipo === "TODAS";

  if (executarPrevia && tipo !== "TODAS" && ehFimDeSemana(hoje)) {
    const motivo =
      "Prévia de retorno não é enviada no fim de semana; sexta-feira cobre o retorno de segunda.";
    console.log(`[FÉRIAS][TI] Envio pulado: ${motivo}`);
    return { enviados: 0, pulado: true, motivo, tipo };
  }

  const retornoPrevia =
    executarPrevia && !ehFimDeSemana(hoje)
      ? await buscarRetornoNaData(dataProximoRetorno)
      : [];
  const retornoHoje = executarDia ? await buscarRetornoNaData(hoje) : [];

  console.log("[FÉRIAS][TI] Resultado das consultas:", {
    tipo,
    hoje: dataBR(hoje),
    retornoPrevia: retornoPrevia.length,
    dataProximoRetorno: dataBR(dataProximoRetorno),
    retornoHoje: retornoHoje.length,
  });

  let enviados = 0;

  if (retornoPrevia.length) {
    const descricao = descricaoPreviaRetorno(hoje, dataProximoRetorno);
    const assunto = `[TI] Retorno de férias ${descricao} (${dataBR(dataProximoRetorno)})`;
    const html = montarHtmlEmailFerias({
      titulo: `TI - Retorno de férias ${descricao} (${dataBR(dataProximoRetorno)})`,
      introducao: `Os seguintes colaboradores retornam de férias ${descricao}.`,
      listaHtml: buildListaHtml(retornoPrevia),
    });

    await sendEmail(EMAIL_TI, assunto, html);
    enviados++;
  }

  if (retornoHoje.length) {
    const assunto = `[TI] Retorno de férias HOJE (${dataBR(hoje)})`;
    const html = montarHtmlEmailFerias({
      titulo: `TI - Retorno de férias hoje (${dataBR(hoje)})`,
      introducao: "Os seguintes colaboradores retornam de férias hoje.",
      listaHtml: buildListaHtml(retornoHoje),
    });

    await sendEmail(EMAIL_TI, assunto, html);
    enviados++;
  }

  return {
    enviados,
    tipo,
    encontrados: {
      retornoPrevia: retornoPrevia.length,
      retornoHoje: retornoHoje.length,
    },
    datas: {
      hoje: dataBR(hoje),
      proximoDiaUtil: dataBR(dataProximoRetorno),
    },
  };
}

export async function executarNotificacoesMensaisFerias(options?: {
  force?: boolean;
  origem?: "cron" | "startup" | "manual";
}) {
  const force = Boolean(options?.force);
  const origem = options?.origem || "cron";
  const { refMes } = dataRefMesSaoPaulo();
  const gate = validarHostAutorizadoParaEmail();

  if (!gate.autorizado) {
    console.log(`[FÉRIAS][MENSAL] Envio pulado: ${gate.motivo}`);
    return {
      pulado: true,
      motivo: gate.motivo,
      refMes,
      origem,
      rhDiretoria: { enviados: 0, pulado: true },
      gerencias: { enviados: 0, pulado: true },
    };
  }

  if (!podeExecutarMensalHoje(force)) {
    console.log(
      `[FÉRIAS] Mensal ignorado (${origem}): fora da janela de envio (dia 1 a 3).`
    );
    return {
      pulado: true,
      motivo: "Fora da janela mensal (dia 1 a 3).",
      refMes,
      origem,
      rhDiretoria: { enviados: 0, pulado: true },
      gerencias: { enviados: 0, pulado: true },
    };
  }

  let rhDiretoria: any = { enviados: 0, pulado: false };
  let gerencias: any = { enviados: 0, pulado: false };

  const rhReservado = force ? true : await reservarEnvioNoMes("RH_DIRETORIA", refMes);
  const gerReservado = force ? true : await reservarEnvioNoMes("GERENCIAS", refMes);

  if (!rhReservado && !force) {
    rhDiretoria = { enviados: 0, pulado: true, motivo: "Já enviado no mês." };
  } else {
    try {
      rhDiretoria = await enviarEmailRhDiretoria();
      if (Number(rhDiretoria?.enviados || 0) > 0 && !force) {
        await marcarEnviadoNoMes("RH_DIRETORIA", refMes);
      } else if (!force) {
        await limparReservaNoMes("RH_DIRETORIA", refMes);
      }
    } catch (error) {
      if (!force) {
        await marcarFalhaNoMes("RH_DIRETORIA", refMes, error);
      }
      throw error;
    }
  }

  if (!gerReservado && !force) {
    gerencias = { enviados: 0, pulado: true, motivo: "Já enviado no mês." };
  } else {
    try {
      gerencias = await enviarEmailGerencias();
      if (Number(gerencias?.enviados || 0) > 0 && !force) {
        await marcarEnviadoNoMes("GERENCIAS", refMes);
      } else if (!force) {
        await limparReservaNoMes("GERENCIAS", refMes);
      }
    } catch (error) {
      if (!force) {
        await marcarFalhaNoMes("GERENCIAS", refMes, error);
      }
      throw error;
    }
  }
  return {
    pulado: false,
    refMes,
    origem,
    rhDiretoria,
    gerencias,
  };
}

export async function executarNotificacoesPreviaDia17(options?: {
  force?: boolean;
  origem?: "cron" | "startup" | "manual";
}) {
  const force = Boolean(options?.force);
  const origem = options?.origem || "cron";
  const { refMes } = dataRefMesSaoPaulo();
  const alvo = alvoDoAvisoDia17();
  const gate = validarHostAutorizadoParaEmail();

  if (!gate.autorizado) {
    console.log(`[FÉRIAS][DIA17] Envio pulado: ${gate.motivo}`);
    return {
      pulado: true,
      motivo: gate.motivo,
      refMes,
      refAlvo: alvo.refAlvo,
      origem,
      rhDiretoria: { enviados: 0, pulado: true },
      gerencias: { enviados: 0, pulado: true },
    };
  }

  if (!podeExecutarPreviaDia17Hoje(force)) {
    return {
      pulado: true,
      motivo: "Fora do dia 17.",
      refMes,
      refAlvo: alvo.refAlvo,
      origem,
      rhDiretoria: { enviados: 0, pulado: true },
      gerencias: { enviados: 0, pulado: true },
    };
  }

  const reservado = force ? true : await reservarEnvioNoMes("PREVIA_DIA17", refMes);
  if (!reservado && !force) {
    return {
      pulado: true,
      motivo: "Prévia do dia 17 já enviada neste mês.",
      refMes,
      refAlvo: alvo.refAlvo,
      origem,
      rhDiretoria: { enviados: 0, pulado: true },
      gerencias: { enviados: 0, pulado: true },
    };
  }

  try {
    const rhDiretoria = await enviarEmailPreviaRhDiretoriaDia17({
      mesAlvo: alvo.mesAlvo,
      anoAlvo: alvo.anoAlvo,
    });

    const gerencias = await enviarEmailPreviaGerenciasDia17({
      mesAlvo: alvo.mesAlvo,
      anoAlvo: alvo.anoAlvo,
    });

    const totalEnvios =
      Number(rhDiretoria?.enviados || 0) + Number(gerencias?.enviados || 0);

    if (totalEnvios > 0 && !force) {
      await marcarEnviadoNoMes("PREVIA_DIA17", refMes);
    } else if (!force) {
      await limparReservaNoMes("PREVIA_DIA17", refMes);
    }

    return {
      pulado: false,
      refMes,
      refAlvo: alvo.refAlvo,
      origem,
      rhDiretoria,
      gerencias,
    };
  } catch (error) {
    if (!force) {
      await marcarFalhaNoMes("PREVIA_DIA17", refMes, error);
    }
    throw error;
  }
}

//teste de envio de e-mail para a TI
{/*export async function enviarEmailTiFerias() {
  const hoje = new Date();
  const em3Dias = addDias(3);
  const amanha = addDias(1);

  const preInicio = feriasFakeTeste();
  const inicioHoje = feriasFakeTeste();
  const preVolta = feriasFakeTeste();
  const ultimoDia = feriasFakeTeste();

  let enviados = 0;

  if (preInicio.length) {
    const assunto = `[TI] Em 3 dias iniciam férias (${dataBR(em3Dias)})`;

    const html = `
      <div style="font-family: Arial, sans-serif; font-size: 14px; color: #222;">
        <p>Boa tarde,</p>

        <p>
          Daqui a 3 dias (<strong>${dataBR(em3Dias)}</strong>) os seguintes
          colaboradores <strong>INICIAM férias</strong>:
        </p>

        ${buildListaHtml(preInicio)}

        <p style="margin-top: 20px; color: #666;">
          Este e-mail foi enviado automaticamente pela intranet.
        </p>
      </div>
    `;

    await sendEmail(EMAIL_TI, assunto, html);
    enviados++;
  }

  if (inicioHoje.length) {
    const assunto = `[TI] Início de férias HOJE (${dataBR(hoje)})`;

    const html = `
      <div style="font-family: Arial, sans-serif; font-size: 14px; color: #222;">
        <p>Bom dia,</p>

        <p>
          Colaboradores que <strong>INICIAM férias HOJE</strong>
          (<strong>${dataBR(hoje)}</strong>):
        </p>

        ${buildListaHtml(inicioHoje)}

        <p style="margin-top: 20px; color: #666;">
          Este e-mail foi enviado automaticamente pela intranet.
        </p>
      </div>
    `;

    await sendEmail(EMAIL_TI, assunto, html);
    enviados++;
  }

  if (preVolta.length) {
    const assunto = `[TI] Em 3 dias RETORNAM de férias (${dataBR(em3Dias)})`;

    const html = `
      <div style="font-family: Arial, sans-serif; font-size: 14px; color: #222;">
        <p>Boa tarde,</p>

        <p>
          Daqui a 3 dias (<strong>${dataBR(em3Dias)}</strong>) os seguintes
          colaboradores <strong>RETORNAM de férias</strong>:
        </p>

        ${buildListaHtml(preVolta)}

        <p style="margin-top: 20px; color: #666;">
          Este e-mail foi enviado automaticamente pela intranet.
        </p>
      </div>
    `;

    await sendEmail(EMAIL_TI, assunto, html);
    enviados++;
  }

  if (ultimoDia.length) {
    const assunto = `[TI] ÚLTIMO dia de férias, retorno amanhã: ${dataBR(amanha)}`;

    const html = `
      <div style="font-family: Arial, sans-serif; font-size: 14px; color: #222;">
        <p>Boa tarde,</p>

        <p>
          Hoje (<strong>${dataBR(hoje)}</strong>) é o
          <strong>ÚLTIMO dia de férias</strong> de:
        </p>

        ${buildListaHtml(ultimoDia)}

        <p>Retorno amanhã: <strong>${dataBR(amanha)}</strong></p>

        <p style="margin-top: 20px; color: #666;">
          Este e-mail foi enviado automaticamente pela intranet.
        </p>
      </div>
    `;

    await sendEmail(EMAIL_TI, assunto, html);
    enviados++;
  }

  return { enviados };
}*/}

export async function executarTodasNotificacoesFerias() {
  const mensal = await executarNotificacoesMensaisFerias({
    force: false,
    origem: "startup",
  });

  return {
    mensal,
    ti: {
      enviados: 0,
      pulado: true,
      motivo:
        "Notificações da TI não são executadas no startup. Execução exclusiva pelo cron.",
    },
  };
}
