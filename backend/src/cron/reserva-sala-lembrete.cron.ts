import cron from "node-cron";
import oracledb from "oracledb";
import { getOraclePool } from "../config/oracle.pool";
import { sendEmail } from "../services/email.service";

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

        if (toTrim(reserva.TP_ESPACO).toUpperCase() !== "AUDITORIO") {
          //lembrete da Sala de Reuniao para ciencia da Janaina (e-mail temporario da Monica durante os testes)
          await sendEmail(
            "monica.torres@sicoob.com.br",
            isLembrete08h
              ? "Lembrete - Reserva de sala agendada para hoje"
              : "Lembrete - Reserva de sala inicia em 10 minutos",
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
          Lembrete de Reserva de Sala
        </h1>

        <p style="margin-top:8px;font-size:14px;opacity:.95;">
          ${isLembrete08h
              ? "Existe uma reserva de sala agendada para hoje."
              : "Existe uma reserva de sala iniciando em aproximadamente 10 minutos."}
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
              ? "Este é um aviso para ciência de que existe uma reserva de sala de reunião agendada para hoje."
              : "Este é um aviso para ciência de que existe uma reserva de sala de reunião prestes a iniciar."}
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
              <td style="padding:8px 0;color:#6b7280;">Sala</td>
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
            Este e-mail foi enviado apenas para ciência da reserva da sala de reunião.
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

        if (toTrim(reserva.TP_ESPACO).toUpperCase() === "AUDITORIO") {
          //lembrete do Auditorio para ciencia da Janaina (e-mail temporario da Monica durante os testes)
          await sendEmail(
            "monica.torres@sicoob.com.br",
            isLembrete08h
              ? "Lembrete - Evento no auditório agendado para hoje"
              : "Lembrete - Evento no auditório inicia em 10 minutos",
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
          Lembrete do Auditório
        </h1>

        <p style="margin-top:8px;font-size:14px;opacity:.95;">
          ${isLembrete08h
              ? "Existe um evento no auditório agendado para hoje."
              : "Evento no auditório inicia em aproximadamente 10 minutos."}
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
              ? "Este é um aviso para ciência de que existe uma reserva do auditório agendada para hoje."
              : "Este é um aviso para ciência de que existe uma reserva do auditório prestes a iniciar."}
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
              <td style="padding:8px 0;color:#6b7280;">Auditório</td>
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
            Este e-mail foi enviado apenas para ciência da reserva do auditório.
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
            "julia.a.coutinho@sicoob.com.br",
            isLembrete08h
              ? "Lembrete - Evento no auditório agendado para hoje"
              : "Lembrete - Evento no auditório inicia em 10 minutos",
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
          Lembrete do Auditório
        </h1>

        <p style="margin-top:8px;font-size:14px;opacity:.95;">
          ${isLembrete08h
              ? "Existe um evento no auditório agendado para hoje."
              : "Evento no auditório inicia em aproximadamente 10 minutos."}
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
              ? "Este é um aviso para ciência de que existe uma reserva do auditório agendada para hoje, caso seja necessária alguma divulgação, cobertura ou apoio da equipe."
              : "Este é um aviso para ciência de que existe uma reserva do auditório prestes a iniciar, caso seja necessária alguma divulgação, cobertura ou apoio da equipe."}
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
              <td style="padding:8px 0;color:#6b7280;">Auditório</td>
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

export function iniciarCronLembreteReservaSala() {
  cron.schedule(
    "0 8 * * *",
    async () => {
      await processarLembretesReservaSala("08H");
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
    "[CRON RESERVA SALA] Cron das 08h e cron de 10 minutos iniciados."
  );
}