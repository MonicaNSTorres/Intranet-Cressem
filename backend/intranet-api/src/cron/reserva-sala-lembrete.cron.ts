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

async function processarLembretesReservaSala() {
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
        AND NVL(SN_LEMBRETE_ENVIADO, 'N') = 'N'
        AND DS_EMAIL IS NOT NULL
        AND DT_INICIO BETWEEN CURRENT_TIMESTAMP
        AND CURRENT_TIMESTAMP + INTERVAL '30' MINUTE
      ORDER BY DT_INICIO ASC
      `,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const reservas = (result.rows || []) as any[];

    if (!reservas.length) return;

    for (const reserva of reservas) {
      try {
        await sendEmail(
          reserva.DS_EMAIL,
          "Sua reunião começa em 30 minutos",
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
            Sua reserva começa em aproximadamente 30 minutos.
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
              Sua reunião está prestes a começar.
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
              Início em aproximadamente 30 minutos
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

        if (toTrim(reserva.TP_ESPACO).toUpperCase() === "AUDITORIO") {
          await sendEmail(
            "monica.torres@sicoob.com.br",
            "Lembrete - Evento no auditório inicia em 30 minutos",
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
          Evento no auditório inicia em aproximadamente 30 minutos.
        </p>
      </td>
    </tr>

    <tr>
      <td style="padding:32px;">
        <p style="font-size:16px;margin-top:0;">
          Olá, <strong>Janaina</strong>.
        </p>

        <p style="color:#4b5563;font-size:15px;">
          Este é um aviso para ciência de que existe uma reserva do auditório
          prestes a iniciar.
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

          await sendEmail(
            "julia.a.coutinho@sicoob.com.br",
            "Lembrete - Evento no auditório inicia em 30 minutos",
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
          Evento no auditório inicia em aproximadamente 30 minutos.
        </p>
      </td>
    </tr>

    <tr>
      <td style="padding:32px;">
        <p style="font-size:16px;margin-top:0;">
          Olá, <strong>Equipe de Marketing</strong>.
        </p>

        <p style="color:#4b5563;font-size:15px;">
          Este é um aviso para ciência de que existe uma reserva do auditório
          prestes a iniciar, caso seja necessária alguma divulgação, cobertura
          ou apoio da equipe.
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
            SN_LEMBRETE_ENVIADO = 'S',
            UPDATED_AT = CURRENT_TIMESTAMP
          WHERE ID_RESERVA_SALA = :ID_RESERVA_SALA
          `,
          {
            ID_RESERVA_SALA: reserva.ID_RESERVA_SALA,
          },
          { autoCommit: false } as any
        );

        await conn.commit();

        console.log(
          `[CRON RESERVA SALA] Lembrete enviado para reserva ${reserva.ID_RESERVA_SALA}`
        );
      } catch (emailError) {
        await conn.rollback();

        console.error(
          `[CRON RESERVA SALA] Erro ao enviar lembrete da reserva ${reserva.ID_RESERVA_SALA}:`,
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
  cron.schedule("* * * * *", async () => {
    await processarLembretesReservaSala();
  });

  console.log("[CRON RESERVA SALA] Cron de lembretes iniciado.");
}