import cron from "node-cron";
import oracledb from "oracledb";
import { getOraclePool } from "../config/oracle.pool";
import { sendEmail } from "../services/email.service";

const EMAIL_RESPONSAVEL_RESERVA = process.env.RESERVA_EMAIL_RESPONSAVEL || "";
const EMAIL_MARKETING = process.env.RESERVA_EMAIL_MARKETING || "";
const EMAILS_INFRA =
  process.env.RESERVA_EMAILS_INFRA
    ?.split(",")
    .map((email) => email.trim())
    .filter(Boolean) || [];

function formatDateTimeBR(value: any) {
  if (!value) return "";

  const raw = String(value).replace("T", " ");
  const [date, time] = raw.split(" ");
  const [y, m, d] = String(date || "").split("-");
  const hora = String(time || "").slice(0, 5);

  if (!y || !m || !d) return String(value);

  return `${d}/${m}/${y}${hora ? ` às ${hora}` : ""}`;
}

function toTrim(v: any) {
  return String(v || "").trim();
}

type TipoLembreteReserva = "08H" | "10MIN";

async function processarLembretesReservaSala(tipoLembrete: TipoLembreteReserva) {
  let conn: oracledb.Connection | undefined;

  try {
    conn = await getOraclePool().getConnection();

    const result = await conn.execute(
      `
      SELECT
        ID_RESERVA_SALA,
        TP_ESPACO,
        NM_ESPACO,
        DS_TITULO,
        DS_OBSERVACAO,
        TO_CHAR(DT_INICIO, 'YYYY-MM-DD HH24:MI:SS') AS DT_INICIO,
        TO_CHAR(DT_FIM, 'YYYY-MM-DD HH24:MI:SS') AS DT_FIM,
        NM_USUARIO,
        DS_LOGIN,
        DS_EMAIL,
        DS_DEPARTAMENTO
      FROM DBACRESSEM.RESERVA_SALA_REUNIAO
      WHERE ST_RESERVA = 'ATIVA'
        AND DS_EMAIL IS NOT NULL
        AND (
          (
            :TIPO_LEMBRETE = '08H'
            AND NVL(SN_LEMBRETE_08H_ENVIADO, 'N') = 'N'
            AND TRUNC(DT_INICIO) = TRUNC(CURRENT_TIMESTAMP)
            AND DT_INICIO > CURRENT_TIMESTAMP
          )
          OR
          (
            :TIPO_LEMBRETE = '10MIN'
            AND NVL(SN_LEMBRETE_10MIN_ENVIADO, 'N') = 'N'
            AND DT_INICIO > CURRENT_TIMESTAMP
            AND DT_INICIO <= CURRENT_TIMESTAMP + INTERVAL '10' MINUTE
          )
        )
      ORDER BY DT_INICIO ASC
      `,
      {
        TIPO_LEMBRETE: tipoLembrete,
      },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const reservas = (result.rows || []) as any[];

    console.log("[CRON RESERVA SALA] Tipo:", tipoLembrete);
    console.log("[CRON RESERVA SALA] Reservas encontradas:", reservas.length);

    console.log(reservas);

    if (!reservas.length) return;

    const isLembrete08h = tipoLembrete === "08H";

    for (const reserva of reservas) {
      try {
        //lembrete enviado ao usuario que realizou a reserva
        await sendEmail(
          reserva.DS_EMAIL,
          isLembrete08h
            ? "Lembrete da sua reserva de hoje"
            : "Sua reunião começa em 10 minutos",
          `
  <div style="
    background:#79B729;
    padding:40px 20px;
    font-family:Segoe UI, Arial, sans-serif;
  ">
    <table
      width="100%"
      cellpadding="0"
      cellspacing="0"
      style="
        max-width:700px;
        margin:auto;
        background:#ffffff;
        border-radius:16px;
        overflow:hidden;
        box-shadow:0 4px 20px rgba(0,0,0,0.08);
      "
    >
      <tr>
        <td style="background:#f59e0b;padding:24px;color:white;">
          <h1 style="margin:0;font-size:24px;">
            Lembrete de Reunião
          </h1>

          <p style="margin-top:8px;font-size:14px;opacity:.95;">
            ${isLembrete08h
            ? "Você possui uma reserva agendada para hoje."
            : "Sua reserva começa em aproximadamente 10 minutos."}
          </p>
        </td>
      </tr>

      <tr>
        <td style="padding:32px;">
          <p style="font-size:16px;margin-top:0;">
            Olá,
            <strong>
              ${toTrim(reserva.NM_USUARIO || reserva.DS_LOGIN) || "usuário"}
            </strong>
          </p>

          <div
            style="
              background:#fef3c7;
              border-left:5px solid #f59e0b;
              padding:18px;
              border-radius:8px;
              margin-bottom:24px;
            "
          >
            <strong>⚠ Atenção</strong>

            <p style="margin:8px 0 0 0;">
              ${isLembrete08h
            ? "Você possui uma reunião agendada para hoje."
            : "Sua reunião está prestes a começar."}
            </p>
          </div>

          <div
            style="
              background:#f9fafb;
              border:1px solid #e5e7eb;
              border-radius:12px;
              padding:20px;
            "
          >
            <table width="100%">
              <tr>
                <td style="padding:8px 0;color:#6b7280;">Espaço</td>
                <td style="padding:8px 0;font-weight:600;">
                  ${toTrim(reserva.NM_ESPACO)}
                </td>
              </tr>

              <tr>
                <td style="padding:8px 0;color:#6b7280;">Reunião</td>
                <td style="padding:8px 0;font-weight:600;">
                  ${toTrim(reserva.DS_TITULO)}
                </td>
              </tr>

              <tr>
                <td style="padding:8px 0;color:#6b7280;">Início</td>
                <td style="padding:8px 0;font-weight:700;color:#b45309;font-size:18px;">
                  ${formatDateTimeBR(reserva.DT_INICIO)}
                </td>
              </tr>

              <tr>
                <td style="padding:8px 0;color:#6b7280;">Fim</td>
                <td style="padding:8px 0;font-weight:700;color:#b45309;font-size:18px;">
                  ${formatDateTimeBR(reserva.DT_FIM)}
                </td>
              </tr>

              ${reserva.DS_OBSERVACAO
            ? `
                    <tr>
                      <td style="padding:8px 0;color:#6b7280;">
                        Observação
                      </td>
                      <td style="padding:8px 0;">
                        ${toTrim(reserva.DS_OBSERVACAO)}
                      </td>
                    </tr>
                  `
            : ""
          }
            </table>
          </div>

          <div style="margin-top:24px;text-align:center;">
            <div
              style="
                display:inline-block;
                background:#f59e0b;
                color:white;
                padding:14px 24px;
                border-radius:10px;
                font-weight:700;
                font-size:16px;
              "
            >
              ${isLembrete08h
            ? "Reserva agendada para hoje"
            : "Início em aproximadamente 10 minutos"}
            </div>
          </div>
        </td>
      </tr>

      <tr>
        <td
          style="
            background:#f9fafb;
            padding:20px;
            text-align:center;
            color:#6b7280;
            font-size:12px;
          "
        >
          Este é um lembrete automático da Intranet.
          <br />
          Não responda esta mensagem.
        </td>
      </tr>
    </table>
  </div>
  `
        );

        const tipoEspacoReserva = toTrim(reserva.TP_ESPACO).toUpperCase();
        const exigeChecklistEspecial =
          tipoEspacoReserva === "AUDITORIO" ||
          tipoEspacoReserva === "SALA_TREINAMENTO" ||
          tipoEspacoReserva === "AUDITORIO_CENTRO_CONVIVENCIA";

        if (!exigeChecklistEspecial) {
          //lembrete da Sala de Reuniao para ciencia da Janaina (e-mail temporario da Monica durante os testes)
          await sendEmail(
            EMAIL_RESPONSAVEL_RESERVA,
            isLembrete08h
              ? "Lembrete - Reserva de espaço agendada para hoje"
              : "Lembrete - Reserva de espaço inicia em 10 minutos",
            `
<div style="
  background:#00AE9D;
  padding:40px 20px;
  font-family:Segoe UI, Arial, sans-serif;
">
  <table
    width="100%"
    cellpadding="0"
    cellspacing="0"
    style="
      max-width:700px;
      margin:auto;
      background:#ffffff;
      border-radius:16px;
      overflow:hidden;
      box-shadow:0 4px 20px rgba(0,0,0,0.08);
    "
  >
    <tr>
      <td style="background:#00AE9D;padding:24px;color:white;">
        <h1 style="margin:0;font-size:24px;">
          Lembrete de Reserva de Espaço
        </h1>

        <p style="margin-top:8px;font-size:14px;opacity:.95;">
          ${isLembrete08h
              ? "Existe uma reserva de espaço agendada para hoje."
              : "Existe uma reserva de espaço iniciando em aproximadamente 10 minutos."}
        </p>
      </td>
    </tr>

    <tr>
      <td style="padding:32px;">
        <p style="font-size:16px;margin-top:0;">
          Olá, <strong>Janaina</strong>.
        </p>

        <p style="color:#4b5563;font-size:15px;">
          ${isLembrete08h
              ? "Este é um aviso para ciência de que existe uma reserva de espaço agendada para hoje."
              : "Este é um aviso para ciência de que existe uma reserva de espaço prestes a iniciar."}
        </p>

        <div
          style="
            background:#f9fafb;
            border:1px solid #e5e7eb;
            border-radius:12px;
            padding:20px;
            margin-top:24px;
          "
        >
          <table width="100%">
            <tr>
              <td style="padding:8px 0;color:#6b7280;">Reunião</td>
              <td style="padding:8px 0;font-weight:600;">
                ${toTrim(reserva.DS_TITULO)}
              </td>
            </tr>

            <tr>
              <td style="padding:8px 0;color:#6b7280;">Espaço</td>
              <td style="padding:8px 0;font-weight:600;">
                ${toTrim(reserva.NM_ESPACO)}
              </td>
            </tr>

            <tr>
              <td style="padding:8px 0;color:#6b7280;">Responsável</td>
              <td style="padding:8px 0;font-weight:600;">
                ${toTrim(reserva.NM_USUARIO || reserva.DS_LOGIN) || "-"}
              </td>
            </tr>

            <tr>
              <td style="padding:8px 0;color:#6b7280;">Departamento</td>
              <td style="padding:8px 0;font-weight:600;">
                ${toTrim(reserva.DS_DEPARTAMENTO) || "-"}
              </td>
            </tr>

            <tr>
              <td style="padding:8px 0;color:#6b7280;">Início</td>
              <td style="padding:8px 0;font-weight:700;color:#00AE9D;font-size:16px;">
                ${formatDateTimeBR(reserva.DT_INICIO)}
              </td>
            </tr>

            <tr>
              <td style="padding:8px 0;color:#6b7280;">Fim</td>
              <td style="padding:8px 0;font-weight:700;color:#00AE9D;font-size:16px;">
                ${formatDateTimeBR(reserva.DT_FIM)}
              </td>
            </tr>

            ${reserva.DS_OBSERVACAO
              ? `
                  <tr>
                    <td style="padding:8px 0;color:#6b7280;">Observação</td>
                    <td style="padding:8px 0;">
                      ${toTrim(reserva.DS_OBSERVACAO)}
                    </td>
                  </tr>
                `
              : ""
            }
          </table>
        </div>

        <div
          style="
            margin-top:24px;
            background:#ecfdf5;
            border-left:4px solid #00AE9D;
            padding:16px;
            border-radius:8px;
          "
        >
          <strong>Aviso automático</strong>

          <p style="margin:8px 0 0 0;color:#374151;">
            Este e-mail foi enviado apenas para ciência da reserva do espaço.
          </p>
        </div>
      </td>
    </tr>

    <tr>
      <td
        style="
          background:#f9fafb;
          padding:20px;
          text-align:center;
          color:#6b7280;
          font-size:12px;
        "
      >
        Este é um lembrete automático da Intranet.
        <br />
        Não responda esta mensagem.
      </td>
    </tr>
  </table>
</div>
`
          );
        }

        if (exigeChecklistEspecial) {
          const nomeEspacoEspecial =
            tipoEspacoReserva === "AUDITORIO"
              ? "auditório"
              : tipoEspacoReserva === "SALA_TREINAMENTO"
                ? "sala de treinamento"
                : "auditório do Centro de Convivência";
          const nomeEspacoEspecialTitulo =
            tipoEspacoReserva === "AUDITORIO"
              ? "Auditório"
              : tipoEspacoReserva === "SALA_TREINAMENTO"
                ? "Sala de Treinamento"
                : "Auditório do Centro de Convivência";
          //lembrete do Auditorio para ciencia da Janaina (e-mail temporario da Monica durante os testes)
          await sendEmail(
            EMAIL_RESPONSAVEL_RESERVA,
            isLembrete08h
              ? "Lembrete - Evento na ${nomeEspacoEspecial} agendado para hoje"
              : "Lembrete - Evento na ${nomeEspacoEspecial} inicia em 10 minutos",
            `
<div style="
  background:#00AE9D;
  padding:40px 20px;
  font-family:Segoe UI, Arial, sans-serif;
">
  <table
    width="100%"
    cellpadding="0"
    cellspacing="0"
    style="
      max-width:700px;
      margin:auto;
      background:#ffffff;
      border-radius:16px;
      overflow:hidden;
      box-shadow:0 4px 20px rgba(0,0,0,0.08);
    "
  >
    <tr>
      <td style="background:#00AE9D;padding:24px;color:white;">
        <h1 style="margin:0;font-size:24px;">
          Lembrete - ${nomeEspacoEspecialTitulo}
        </h1>

        <p style="margin-top:8px;font-size:14px;opacity:.95;">
          ${isLembrete08h
              ? "Existe um evento na ${nomeEspacoEspecial} agendado para hoje."
              : "Evento na ${nomeEspacoEspecial} inicia em aproximadamente 10 minutos."}
        </p>
      </td>
    </tr>

    <tr>
      <td style="padding:32px;">
        <p style="font-size:16px;margin-top:0;">
          Olá, <strong>Janaina</strong>.
        </p>

        <p style="color:#4b5563;font-size:15px;">
          ${isLembrete08h
              ? "Este é um aviso para ciência de que existe uma reserva da ${nomeEspacoEspecial} agendada para hoje."
              : "Este é um aviso para ciência de que existe uma reserva da ${nomeEspacoEspecial} prestes a iniciar."}
        </p>

        <div
          style="
            background:#f9fafb;
            border:1px solid #e5e7eb;
            border-radius:12px;
            padding:20px;
            margin-top:24px;
          "
        >
          <table width="100%">
            <tr>
              <td style="padding:8px 0;color:#6b7280;">Evento</td>
              <td style="padding:8px 0;font-weight:600;">
                ${toTrim(reserva.DS_TITULO)}
              </td>
            </tr>

            <tr>
              <td style="padding:8px 0;color:#6b7280;">Espaço</td>
              <td style="padding:8px 0;font-weight:600;">
                ${toTrim(reserva.NM_ESPACO)}
              </td>
            </tr>

            <tr>
              <td style="padding:8px 0;color:#6b7280;">Responsável</td>
              <td style="padding:8px 0;font-weight:600;">
                ${toTrim(reserva.NM_USUARIO || reserva.DS_LOGIN) || "-"}
              </td>
            </tr>

            <tr>
              <td style="padding:8px 0;color:#6b7280;">Departamento</td>
              <td style="padding:8px 0;font-weight:600;">
                ${toTrim(reserva.DS_DEPARTAMENTO) || "-"}
              </td>
            </tr>

            <tr>
              <td style="padding:8px 0;color:#6b7280;">Início</td>
              <td style="padding:8px 0;font-weight:700;color:#00AE9D;font-size:16px;">
                ${formatDateTimeBR(reserva.DT_INICIO)}
              </td>
            </tr>

            <tr>
              <td style="padding:8px 0;color:#6b7280;">Fim</td>
              <td style="padding:8px 0;font-weight:700;color:#00AE9D;font-size:16px;">
                ${formatDateTimeBR(reserva.DT_FIM)}
              </td>
            </tr>

            ${reserva.DS_OBSERVACAO
              ? `
                  <tr>
                    <td style="padding:8px 0;color:#6b7280;">Observação</td>
                    <td style="padding:8px 0;">
                      ${toTrim(reserva.DS_OBSERVACAO)}
                    </td>
                  </tr>
                `
              : ""
            }
          </table>
        </div>

        <div
          style="
            margin-top:24px;
            background:#ecfdf5;
            border-left:4px solid #00AE9D;
            padding:16px;
            border-radius:8px;
          "
        >
          <strong>Aviso automático</strong>

          <p style="margin:8px 0 0 0;color:#374151;">
            Este e-mail foi enviado apenas para ciência da reserva da ${nomeEspacoEspecial}.
          </p>
        </div>
      </td>
    </tr>

    <tr>
      <td
        style="
          background:#f9fafb;
          padding:20px;
          text-align:center;
          color:#6b7280;
          font-size:12px;
        "
      >
        Este é um lembrete automático da Intranet.
        <br />
        Não responda esta mensagem.
      </td>
    </tr>
  </table>
</div>
`
          );

          //lembrete do Auditorio para ciencia da equipe de Marketing
          await sendEmail(
            EMAIL_MARKETING,
            isLembrete08h
              ? "Lembrete - Evento na ${nomeEspacoEspecial} agendado para hoje"
              : "Lembrete - Evento na ${nomeEspacoEspecial} inicia em 10 minutos",
            `
<div style="
  background:#00AE9D;
  padding:40px 20px;
  font-family:Segoe UI, Arial, sans-serif;
">
  <table
    width="100%"
    cellpadding="0"
    cellspacing="0"
    style="
      max-width:700px;
      margin:auto;
      background:#ffffff;
      border-radius:16px;
      overflow:hidden;
      box-shadow:0 4px 20px rgba(0,0,0,0.08);
    "
  >
    <tr>
      <td style="background:#00AE9D;padding:24px;color:white;">
        <h1 style="margin:0;font-size:24px;">
          Lembrete - ${nomeEspacoEspecialTitulo}
        </h1>

        <p style="margin-top:8px;font-size:14px;opacity:.95;">
          ${isLembrete08h
              ? "Existe um evento na ${nomeEspacoEspecial} agendado para hoje."
              : "Evento na ${nomeEspacoEspecial} inicia em aproximadamente 10 minutos."}
        </p>
      </td>
    </tr>

    <tr>
      <td style="padding:32px;">
        <p style="font-size:16px;margin-top:0;">
          Olá, <strong>Equipe de Marketing</strong>.
        </p>

        <p style="color:#4b5563;font-size:15px;">
          ${isLembrete08h
              ? "Este é um aviso para ciência de que existe uma reserva da ${nomeEspacoEspecial} agendada para hoje, caso seja necessária alguma divulgação, cobertura ou apoio da equipe."
              : "Este é um aviso para ciência de que existe uma reserva da ${nomeEspacoEspecial} prestes a iniciar, caso seja necessária alguma divulgação, cobertura ou apoio da equipe."}
        </p>

        <div
          style="
            background:#f9fafb;
            border:1px solid #e5e7eb;
            border-radius:12px;
            padding:20px;
            margin-top:24px;
          "
        >
          <table width="100%">
            <tr>
              <td style="padding:8px 0;color:#6b7280;">Evento</td>
              <td style="padding:8px 0;font-weight:600;">
                ${toTrim(reserva.DS_TITULO)}
              </td>
            </tr>

            <tr>
              <td style="padding:8px 0;color:#6b7280;">Espaço</td>
              <td style="padding:8px 0;font-weight:600;">
                ${toTrim(reserva.NM_ESPACO)}
              </td>
            </tr>

            <tr>
              <td style="padding:8px 0;color:#6b7280;">Responsável</td>
              <td style="padding:8px 0;font-weight:600;">
                ${toTrim(reserva.NM_USUARIO || reserva.DS_LOGIN) || "-"}
              </td>
            </tr>

            <tr>
              <td style="padding:8px 0;color:#6b7280;">Departamento</td>
              <td style="padding:8px 0;font-weight:600;">
                ${toTrim(reserva.DS_DEPARTAMENTO) || "-"}
              </td>
            </tr>

            <tr>
              <td style="padding:8px 0;color:#6b7280;">Início</td>
              <td style="padding:8px 0;font-weight:700;color:#00AE9D;font-size:16px;">
                ${formatDateTimeBR(reserva.DT_INICIO)}
              </td>
            </tr>

            <tr>
              <td style="padding:8px 0;color:#6b7280;">Fim</td>
              <td style="padding:8px 0;font-weight:700;color:#00AE9D;font-size:16px;">
                ${formatDateTimeBR(reserva.DT_FIM)}
              </td>
            </tr>

            ${reserva.DS_OBSERVACAO
              ? `
                  <tr>
                    <td style="padding:8px 0;color:#6b7280;">Observação</td>
                    <td style="padding:8px 0;">
                      ${toTrim(reserva.DS_OBSERVACAO)}
                    </td>
                  </tr>
                `
              : ""
            }
          </table>
        </div>

        <div
          style="
            margin-top:24px;
            background:#ecfdf5;
            border-left:4px solid #00AE9D;
            padding:16px;
            border-radius:8px;
          "
        >
          <strong>Aviso automático</strong>

          <p style="margin:8px 0 0 0;color:#374151;">
            Este e-mail foi enviado apenas para ciência da equipe de Marketing.
          </p>
        </div>
      </td>
    </tr>

    <tr>
      <td
        style="
          background:#f9fafb;
          padding:20px;
          text-align:center;
          color:#6b7280;
          font-size:12px;
        "
      >
        Este é um lembrete automático da Intranet.
        <br />
        Não responda esta mensagem.
      </td>
    </tr>
  </table>
</div>
`
          );
        }

        await conn.execute(
          `
          UPDATE DBACRESSEM.RESERVA_SALA_REUNIAO
          SET
            SN_LEMBRETE_08H_ENVIADO = CASE
              WHEN :TIPO_LEMBRETE = '08H' THEN 'S'
              ELSE SN_LEMBRETE_08H_ENVIADO
            END,
            SN_LEMBRETE_10MIN_ENVIADO = CASE
              WHEN :TIPO_LEMBRETE = '10MIN' THEN 'S'
              ELSE SN_LEMBRETE_10MIN_ENVIADO
            END,
            UPDATED_AT = CURRENT_TIMESTAMP
          WHERE ID_RESERVA_SALA = :ID_RESERVA_SALA
          `,
          {
            ID_RESERVA_SALA: reserva.ID_RESERVA_SALA,
            TIPO_LEMBRETE: tipoLembrete,
          },
          { autoCommit: false } as any
        );

        await conn.commit();

        console.log(
          `[CRON RESERVA SALA] Lembrete ${tipoLembrete} enviado para reserva ${reserva.ID_RESERVA_SALA}`
        );
      } catch (emailError) {
        await conn.rollback();

        console.error(
          `[CRON RESERVA SALA] Erro ao enviar lembrete ${tipoLembrete} da reserva ${reserva.ID_RESERVA_SALA}:`,
          emailError
        );
      }
    }
  } catch (err) {
    console.error("[CRON RESERVA SALA] Erro geral ao processar lembretes:", err);
  } finally {
    if (conn) {
      try {
        await conn.close();
      } catch { }
    }
  }
}


type TipoAvisoInfraAuditorio = "5_DIAS" | "1_DIA" | "DIA";

async function processarAvisosInfraAuditorio() {
  let conn: oracledb.Connection | undefined;

  try {
    conn = await getOraclePool().getConnection();

    const result = await conn.execute(
      `
      SELECT
        ID_RESERVA_SALA,
        TP_ESPACO,
        NM_ESPACO,
        DS_TITULO,
        DS_OBSERVACAO,
        TO_CHAR(DT_INICIO, 'YYYY-MM-DD HH24:MI:SS') AS DT_INICIO,
        TO_CHAR(DT_FIM, 'YYYY-MM-DD HH24:MI:SS') AS DT_FIM,
        NM_USUARIO,
        DS_LOGIN,
        DS_EMAIL,
        DS_DEPARTAMENTO,
        NVL(SN_INFRA_5_DIAS_ENVIADO, 'N') AS SN_INFRA_5_DIAS_ENVIADO,
        NVL(SN_INFRA_1_DIA_ENVIADO, 'N') AS SN_INFRA_1_DIA_ENVIADO,
        NVL(SN_INFRA_DIA_ENVIADO, 'N') AS SN_INFRA_DIA_ENVIADO
      FROM DBACRESSEM.RESERVA_SALA_REUNIAO
      WHERE ST_RESERVA = 'ATIVA'
        AND UPPER(TRIM(TP_ESPACO)) IN ('AUDITORIO', 'SALA_TREINAMENTO', 'AUDITORIO_CENTRO_CONVIVENCIA')
        AND (
          (
            TRUNC(DT_INICIO) = TRUNC(CURRENT_TIMESTAMP) + 5
            AND NVL(SN_INFRA_5_DIAS_ENVIADO, 'N') = 'N'
          )
          OR
          (
            TRUNC(DT_INICIO) = TRUNC(CURRENT_TIMESTAMP) + 1
            AND NVL(SN_INFRA_1_DIA_ENVIADO, 'N') = 'N'
          )
          OR
          (
            TRUNC(DT_INICIO) = TRUNC(CURRENT_TIMESTAMP)
            AND NVL(SN_INFRA_DIA_ENVIADO, 'N') = 'N'
            AND DT_INICIO > CURRENT_TIMESTAMP
          )
        )
      ORDER BY DT_INICIO ASC
      `,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const reservas = (result.rows || []) as any[];

    console.log(
      "[CRON RESERVA SALA] Avisos de Infra de Auditório/Sala de Treinamento/Auditório do Centro de Convivência encontrados:",
      reservas.length
    );

    if (!reservas.length) return;

    const emailsInfra = [
      "ricardo.henrique@sicoob.com.br",
      "fabio.sprado@sicoob.com.br",
      "thiago.msantos@sicoob.com.br",
      EMAIL_RESPONSAVEL_RESERVA,
    ];

    for (const reserva of reservas) {
      const tipoEspacoInfra = toTrim(reserva.TP_ESPACO).toUpperCase();
      const nomeEspacoInfra =
        tipoEspacoInfra === "AUDITORIO"
          ? "auditório"
          : tipoEspacoInfra === "SALA_TREINAMENTO"
            ? "sala de treinamento"
            : "auditório do Centro de Convivência";
      const nomeEspacoInfraTitulo =
        tipoEspacoInfra === "AUDITORIO"
          ? "Auditório"
          : tipoEspacoInfra === "SALA_TREINAMENTO"
            ? "Sala de Treinamento"
            : "Auditório do Centro de Convivência";

      const tiposAviso: TipoAvisoInfraAuditorio[] = [];

      if (
        reserva.SN_INFRA_5_DIAS_ENVIADO === "N"
      ) {
        const dataInicio = String(reserva.DT_INICIO || "").slice(0, 10);
        const hojeResult = await conn.execute(
          `
          SELECT
            CASE
              WHEN TO_DATE(:DT_INICIO, 'YYYY-MM-DD') = TRUNC(CURRENT_TIMESTAMP) + 5
              THEN 1
              ELSE 0
            END AS EH_5_DIAS
          FROM DUAL
          `,
          {
            DT_INICIO: dataInicio,
          },
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        if (Number((hojeResult.rows?.[0] as any)?.EH_5_DIAS || 0) === 1) {
          tiposAviso.push("5_DIAS");
        }
      }

      if (
        reserva.SN_INFRA_1_DIA_ENVIADO === "N"
      ) {
        const dataInicio = String(reserva.DT_INICIO || "").slice(0, 10);
        const hojeResult = await conn.execute(
          `
          SELECT
            CASE
              WHEN TO_DATE(:DT_INICIO, 'YYYY-MM-DD') = TRUNC(CURRENT_TIMESTAMP) + 1
              THEN 1
              ELSE 0
            END AS EH_1_DIA
          FROM DUAL
          `,
          {
            DT_INICIO: dataInicio,
          },
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        if (Number((hojeResult.rows?.[0] as any)?.EH_1_DIA || 0) === 1) {
          tiposAviso.push("1_DIA");
        }
      }

      if (
        reserva.SN_INFRA_DIA_ENVIADO === "N"
      ) {
        const dataInicio = String(reserva.DT_INICIO || "").slice(0, 10);
        const hojeResult = await conn.execute(
          `
          SELECT
            CASE
              WHEN TO_DATE(:DT_INICIO, 'YYYY-MM-DD') = TRUNC(CURRENT_TIMESTAMP)
              THEN 1
              ELSE 0
            END AS EH_DIA
          FROM DUAL
          `,
          {
            DT_INICIO: dataInicio,
          },
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        if (Number((hojeResult.rows?.[0] as any)?.EH_DIA || 0) === 1) {
          tiposAviso.push("DIA");
        }
      }

      for (const tipoAviso of tiposAviso) {
        try {
          const tituloPrazo =
            tipoAviso === "5_DIAS"
              ? "Evento na ${nomeEspacoInfra} em 5 dias"
              : tipoAviso === "1_DIA"
                ? "Evento na ${nomeEspacoInfra} amanhã"
                : "Evento na ${nomeEspacoInfra} hoje";

          const textoPrazo =
            tipoAviso === "5_DIAS"
              ? "Existe um evento reservado na ${nomeEspacoInfra} para daqui a 5 dias."
              : tipoAviso === "1_DIA"
                ? "Existe um evento reservado na ${nomeEspacoInfra} para amanhã."
                : "Existe um evento reservado na ${nomeEspacoInfra} para hoje.";

          const htmlInfra = `
<div style="
  background:#00AE9D;
  padding:40px 20px;
  font-family:Segoe UI, Arial, sans-serif;
">
  <table
    width="100%"
    cellpadding="0"
    cellspacing="0"
    style="
      max-width:700px;
      margin:auto;
      background:#ffffff;
      border-radius:16px;
      overflow:hidden;
      box-shadow:0 4px 20px rgba(0,0,0,0.08);
    "
  >
    <tr>
      <td style="background:#00AE9D;padding:24px;color:white;">
        <h1 style="margin:0;font-size:24px;">
          Lembrete - ${nomeEspacoInfraTitulo} - Infra
        </h1>

        <p style="margin-top:8px;font-size:14px;opacity:.95;">
          ${textoPrazo}
        </p>
      </td>
    </tr>

    <tr>
      <td style="padding:32px;">
        <p style="font-size:16px;margin-top:0;">
          Olá, <strong>Equipe de Infra</strong>.
        </p>

        <p style="color:#4b5563;font-size:15px;">
          Este é um aviso automático para ciência e preparação da equipe
          para o evento reservado na ${nomeEspacoInfra}.
        </p>

        <div
          style="
            background:#f9fafb;
            border:1px solid #e5e7eb;
            border-radius:12px;
            padding:20px;
            margin-top:24px;
          "
        >
          <table width="100%">
            <tr>
              <td style="padding:8px 0;color:#6b7280;">Evento</td>
              <td style="padding:8px 0;font-weight:600;">
                ${toTrim(reserva.DS_TITULO)}
              </td>
            </tr>

            <tr>
              <td style="padding:8px 0;color:#6b7280;">Espaço</td>
              <td style="padding:8px 0;font-weight:600;">
                ${toTrim(reserva.NM_ESPACO)}
              </td>
            </tr>

            <tr>
              <td style="padding:8px 0;color:#6b7280;">Responsável</td>
              <td style="padding:8px 0;font-weight:600;">
                ${toTrim(reserva.NM_USUARIO || reserva.DS_LOGIN) || "-"}
              </td>
            </tr>

            <tr>
              <td style="padding:8px 0;color:#6b7280;">Departamento</td>
              <td style="padding:8px 0;font-weight:600;">
                ${toTrim(reserva.DS_DEPARTAMENTO) || "-"}
              </td>
            </tr>

            <tr>
              <td style="padding:8px 0;color:#6b7280;">Início</td>
              <td style="padding:8px 0;font-weight:700;color:#00AE9D;font-size:16px;">
                ${formatDateTimeBR(reserva.DT_INICIO)}
              </td>
            </tr>

            <tr>
              <td style="padding:8px 0;color:#6b7280;">Fim</td>
              <td style="padding:8px 0;font-weight:700;color:#00AE9D;font-size:16px;">
                ${formatDateTimeBR(reserva.DT_FIM)}
              </td>
            </tr>

            ${
              reserva.DS_OBSERVACAO
                ? `
                  <tr>
                    <td style="padding:8px 0;color:#6b7280;">Observação</td>
                    <td style="padding:8px 0;">
                      ${toTrim(reserva.DS_OBSERVACAO)}
                    </td>
                  </tr>
                `
                : ""
            }
          </table>
        </div>

        <div
          style="
            margin-top:24px;
            background:#ecfdf5;
            border-left:4px solid #00AE9D;
            padding:16px;
            border-radius:8px;
          "
        >
          <strong>Aviso automático</strong>

          <p style="margin:8px 0 0 0;color:#374151;">
            ${
              tipoAviso === "5_DIAS"
                ? "Faltam 5 dias para o evento."
                : tipoAviso === "1_DIA"
                  ? "O evento acontece amanhã."
                  : "O evento acontece hoje."
            }
          </p>
        </div>
      </td>
    </tr>

    <tr>
      <td
        style="
          background:#f9fafb;
          padding:20px;
          text-align:center;
          color:#6b7280;
          font-size:12px;
        "
      >
        Este é um lembrete automático da Intranet.
        <br />
        Não responda esta mensagem.
      </td>
    </tr>
  </table>
</div>
`;

          for (const emailInfra of emailsInfra) {
            await sendEmail(
              emailInfra,
              `Lembrete - ${tituloPrazo}`,
              htmlInfra
            );
          }

          await conn.execute(
            `
            UPDATE DBACRESSEM.RESERVA_SALA_REUNIAO
            SET
              SN_INFRA_5_DIAS_ENVIADO = CASE
                WHEN :TIPO_AVISO = '5_DIAS' THEN 'S'
                ELSE SN_INFRA_5_DIAS_ENVIADO
              END,
              SN_INFRA_1_DIA_ENVIADO = CASE
                WHEN :TIPO_AVISO = '1_DIA' THEN 'S'
                ELSE SN_INFRA_1_DIA_ENVIADO
              END,
              SN_INFRA_DIA_ENVIADO = CASE
                WHEN :TIPO_AVISO = 'DIA' THEN 'S'
                ELSE SN_INFRA_DIA_ENVIADO
              END,
              UPDATED_AT = CURRENT_TIMESTAMP
            WHERE ID_RESERVA_SALA = :ID_RESERVA_SALA
            `,
            {
              ID_RESERVA_SALA: reserva.ID_RESERVA_SALA,
              TIPO_AVISO: tipoAviso,
            },
            { autoCommit: false } as any
          );

          await conn.commit();

          console.log(
            `[CRON RESERVA SALA] Aviso Infra ${tipoAviso} enviado para reserva ${reserva.ID_RESERVA_SALA}`
          );
        } catch (emailError) {
          await conn.rollback();

          console.error(
            `[CRON RESERVA SALA] Erro ao enviar aviso Infra ${tipoAviso} da reserva ${reserva.ID_RESERVA_SALA}:`,
            emailError
          );
        }
      }
    }
  } catch (err) {
    console.error(
      "[CRON RESERVA SALA] Erro geral ao processar avisos de Infra de Auditório/Sala de Treinamento/Auditório do Centro de Convivência:",
      err
    );
  } finally {
    if (conn) {
      try {
        await conn.close();
      } catch { }
    }
  }
}

export function iniciarCronLembreteReservaSala() {
  cron.schedule(
    "0 8 * * *",
    async () => {
      await processarLembretesReservaSala("08H");
      await processarAvisosInfraAuditorio();
    },
    {
      timezone: "America/Sao_Paulo",
    }
  );

  cron.schedule(
    "* * * * *",
    async () => {
      await processarLembretesReservaSala("10MIN");
    },
    {
      timezone: "America/Sao_Paulo",
    }
  );

  console.log(
    "[CRON RESERVA SALA] Cron das 08h, avisos da Infra de Auditório/Sala de Treinamento/Auditório do Centro de Convivência e cron de 10 minutos iniciados."
  );
}