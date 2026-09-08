import cron from "node-cron";
import oracledb from "oracledb";

import { getOraclePool } from "../config/oracle.pool";
import { sendEmail } from "../services/email.service";

type ViagemDoMotorista = {
  ID_FUNCIONARIO_MOTORISTA: number;
  NM_MOTORISTA: string;
  EMAIL_MOTORISTA: string;
  NM_SOLICITANTE: string;
  DS_DESTINO: string;
  DT_IDA: string;
  DT_VOLTA: string | null;
  TP_VIAGEM: "IDA_VOLTA" | "SOMENTE_IDA";
  ST_VIAGEM: "PENDENTE_CONSELHO" | "APROVADA";
};

function texto(valor: unknown) {
  return String(valor || "").trim();
}

function escaparHtml(valor: unknown) {
  return texto(valor)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function hojeSaoPaulo() {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const obter = (tipo: Intl.DateTimeFormatPartTypes) =>
    partes.find((parte) => parte.type === tipo)?.value || "";

  return `${obter("year")}-${obter("month")}-${obter("day")}`;
}

function formatarDataHora(valor: string | null) {
  const bruto = texto(valor);
  if (!bruto) return "Não informado";

  const [data, hora] = bruto.replace("T", " ").split(" ");
  const [ano, mes, dia] = data.split("-");
  if (!ano || !mes || !dia) return bruto;

  return `${dia}/${mes}/${ano}${hora ? ` às ${hora.slice(0, 5)}` : ""}`;
}

function tituloStatus(status: ViagemDoMotorista["ST_VIAGEM"]) {
  return status === "APROVADA" ? "Aprovada" : "Pendente Secretaria";
}

function tituloTipo(tipo: ViagemDoMotorista["TP_VIAGEM"]) {
  return tipo === "IDA_VOLTA" ? "Ida e volta" : "Somente ida";
}

function montarEmail(nomeMotorista: string, dataReferencia: string, viagens: ViagemDoMotorista[]) {
  const itens = viagens
    .map(
      (viagem) => `
        <tr>
          <td style="padding:14px;border-bottom:1px solid #E2E8F0;">
            <strong>${escaparHtml(formatarDataHora(viagem.DT_IDA))}</strong>
            ${viagem.DT_VOLTA ? `<br><span style="color:#475467;">Retorno: ${escaparHtml(formatarDataHora(viagem.DT_VOLTA))}</span>` : ""}
          </td>
          <td style="padding:14px;border-bottom:1px solid #E2E8F0;">
            <strong>${escaparHtml(viagem.DS_DESTINO)}</strong><br>
            <span style="color:#475467;">${escaparHtml(tituloTipo(viagem.TP_VIAGEM))} · Solicitante: ${escaparHtml(viagem.NM_SOLICITANTE)}</span>
          </td>
          <td style="padding:14px;border-bottom:1px solid #E2E8F0;white-space:nowrap;color:${viagem.ST_VIAGEM === "APROVADA" ? "#047857" : "#B45309"};font-weight:700;">
            ${escaparHtml(tituloStatus(viagem.ST_VIAGEM))}
          </td>
        </tr>`
    )
    .join("");

  const [ano, mes, dia] = dataReferencia.split("-");
  const dataBr = `${dia}/${mes}/${ano}`;

  return `
    <div style="margin:0;padding:32px 16px;background:#F6FBFA;font-family:Segoe UI,Arial,sans-serif;color:#101828;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:760px;margin:auto;background:#FFFFFF;border:1px solid #E2E8F0;border-radius:18px;overflow:hidden;">
        <tr>
          <td style="padding:24px 28px;background:linear-gradient(135deg,#00AE9D,#79B729);color:#FFFFFF;">
            <div style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;opacity:.9;">Intranet Cressem</div>
            <h1 style="margin:8px 0 0;font-size:24px;">Sua agenda de viagens</h1>
            <p style="margin:8px 0 0;font-size:15px;">Compromissos previstos para ${escaparHtml(dataBr)}.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 28px;">
            <p style="margin:0 0 18px;font-size:15px;">Olá, <strong>${escaparHtml(nomeMotorista)}</strong>. Você possui ${viagens.length} compromisso${viagens.length === 1 ? "" : "s"} de viagem para hoje.</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #E2E8F0;border-radius:12px;overflow:hidden;font-size:14px;">
              <thead>
                <tr style="background:#F8FAFC;color:#475467;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;">
                  <th style="padding:12px 14px;">Horário</th>
                  <th style="padding:12px 14px;">Destino</th>
                  <th style="padding:12px 14px;">Situação</th>
                </tr>
              </thead>
              <tbody>${itens}</tbody>
            </table>
            <p style="margin:20px 0 0;font-size:12px;color:#667085;">Este é um lembrete automático da Intranet Cressem.</p>
          </td>
        </tr>
      </table>
    </div>`;
}

export async function enviarAgendaDiariaMotoristas() {
  let conn: oracledb.Connection | undefined;
  const dataReferencia = hojeSaoPaulo();

  try {
    conn = await getOraclePool().getConnection();
    const result = await conn.execute(
      `
        SELECT
          v.ID_FUNCIONARIO_MOTORISTA,
          v.NM_MOTORISTA,
          f.EMAIL AS EMAIL_MOTORISTA,
          v.NM_SOLICITANTE,
          v.DS_DESTINO,
          TO_CHAR(v.DT_IDA, 'YYYY-MM-DD HH24:MI:SS') AS DT_IDA,
          TO_CHAR(v.DT_VOLTA, 'YYYY-MM-DD HH24:MI:SS') AS DT_VOLTA,
          v.TP_VIAGEM,
          v.ST_VIAGEM
        FROM DBACRESSEM.VIAGENS v
        INNER JOIN DBACRESSEM.FUNCIONARIOS_SICOOB_CRESSEM f
          ON f.ID_FUNCIONARIO = v.ID_FUNCIONARIO_MOTORISTA
        WHERE v.ST_VIAGEM IN ('PENDENTE_CONSELHO', 'APROVADA')
          AND f.SN_ATIVO = 1
          AND TRIM(f.EMAIL) IS NOT NULL
          AND v.DT_IDA < TO_TIMESTAMP(:INICIO_DIA, 'YYYY-MM-DD HH24:MI:SS') + INTERVAL '1' DAY
          AND NVL(v.DT_VOLTA, v.DT_IDA) >= TO_TIMESTAMP(:INICIO_DIA, 'YYYY-MM-DD HH24:MI:SS')
        ORDER BY v.ID_FUNCIONARIO_MOTORISTA, v.DT_IDA
      `,
      {
        INICIO_DIA: `${dataReferencia} 00:00:00`,
      },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const porMotorista = new Map<string, ViagemDoMotorista[]>();
    for (const linha of (result.rows || []) as ViagemDoMotorista[]) {
      const email = texto(linha.EMAIL_MOTORISTA);
      if (!email) continue;
      const chave = `${linha.ID_FUNCIONARIO_MOTORISTA}:${email.toUpperCase()}`;
      porMotorista.set(chave, [...(porMotorista.get(chave) || []), linha]);
    }

    let enviados = 0;
    let falhas = 0;
    for (const viagens of porMotorista.values()) {
      const motorista = viagens[0];
      try {
        await sendEmail(
          texto(motorista.EMAIL_MOTORISTA),
          `Agenda de viagens de hoje — ${dataReferencia.split("-").reverse().join("/")}`,
          montarEmail(texto(motorista.NM_MOTORISTA), dataReferencia, viagens)
        );
        enviados += 1;
      } catch (error) {
        falhas += 1;
        console.error(`[CRON VIAGENS] Falha ao enviar agenda do motorista ${motorista.ID_FUNCIONARIO_MOTORISTA}:`, error);
      }
    }

    console.log(`[CRON VIAGENS] Agenda ${dataReferencia}: ${enviados} e-mail(s) enviado(s), ${falhas} falha(s).`);
    return { dataReferencia, motoristas: porMotorista.size, enviados, falhas };
  } finally {
    if (conn) await conn.close();
  }
}

export function iniciarCronAgendaDiariaMotoristas() {
  cron.schedule(
    "0 8 * * *",
    async () => {
      try {
        await enviarAgendaDiariaMotoristas();
      } catch (error) {
        console.error("[CRON VIAGENS] Erro ao processar a agenda diária dos motoristas:", error);
      }
    },
    { timezone: "America/Sao_Paulo" }
  );

  console.log("[CRON VIAGENS] Agenda diária dos motoristas agendada para 08:00.");
}
