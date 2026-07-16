import { Request, Response } from "express";
import oracledb from "oracledb";
import { oracleExecute, setAuditoriaContext } from "../services/oracle.service";
import { getOraclePool } from "../config/oracle.pool";
import { sendEmail } from "../services/email.service";

function toTrim(v: any) {
  return String(v || "").trim();
}

function toUpperTrim(v: any) {
  return String(v || "").trim().toUpperCase();
}

function toNullable(v: any) {
  const value = String(v || "").trim();
  return value ? value : null;
}

function toDateTime(v: any) {
  if (!v) return null;
  return String(v).slice(0, 19);
}

function formatDateTimeBR(value: any) {
  if (!value) return "";

  const raw = String(value).replace("T", " ");
  const [date, time] = raw.split(" ");
  const [y, m, d] = String(date || "").split("-");
  const hora = String(time || "").slice(0, 5);

  if (!y || !m || !d) return String(value);

  return `${d}/${m}/${y}${hora ? ` às ${hora}` : ""}`;
}

export const reservaSalaReuniaoController = {
  async criar(req: Request, res: Response) {
    let conn: oracledb.Connection | undefined;

    try {
      const {
        TP_ESPACO,
        NM_ESPACO,
        DS_TITULO,
        DS_OBSERVACAO,
        DT_INICIO,
        DT_FIM,
        USUARIO,
        CHECKLIST_AUDITORIO,
      } = req.body || {};

      if (!TP_ESPACO) {
        return res.status(400).json({ error: "Tipo de espaço é obrigatório." });
      }

      if (!NM_ESPACO) {
        return res.status(400).json({ error: "Sala/Auditório é obrigatório." });
      }

      if (!DS_TITULO) {
        return res.status(400).json({ error: "Título da reunião é obrigatório." });
      }

      if (!DT_INICIO || !DT_FIM) {
        return res.status(400).json({ error: "Data e horário são obrigatórios." });
      }

      conn = await getOraclePool().getConnection();
      await setAuditoriaContext(conn, req);

      const conflitoSql = `
      SELECT COUNT(*) AS TOTAL
      FROM DBACRESSEM.RESERVA_SALA_REUNIAO
      WHERE ST_RESERVA = 'ATIVA'
        AND TP_ESPACO = :TP_ESPACO
        AND NM_ESPACO = :NM_ESPACO
        AND (
          TO_TIMESTAMP(:DT_INICIO, 'YYYY-MM-DD"T"HH24:MI:SS') < DT_FIM
          AND TO_TIMESTAMP(:DT_FIM, 'YYYY-MM-DD"T"HH24:MI:SS') > DT_INICIO
        )
    `;

      const conflitoResult = await conn.execute(
        conflitoSql,
        {
          TP_ESPACO: toUpperTrim(TP_ESPACO),
          NM_ESPACO: toTrim(NM_ESPACO),
          DT_INICIO: toDateTime(DT_INICIO),
          DT_FIM: toDateTime(DT_FIM),
        },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const totalConflito = Number((conflitoResult.rows?.[0] as any)?.TOTAL || 0);

      if (totalConflito > 0) {
        await conn.rollback();

        return res.status(409).json({
          error: "Esse espaço já está reservado nesse dia e horário.",
        });
      }

      const sql = `
      INSERT INTO DBACRESSEM.RESERVA_SALA_REUNIAO (
        TP_ESPACO,
        NM_ESPACO,
        DS_TITULO,
        DS_OBSERVACAO,
        DT_INICIO,
        DT_FIM,
        NM_USUARIO,
        DS_LOGIN,
        DS_EMAIL,
        DS_DEPARTAMENTO,
        ST_RESERVA
      ) VALUES (
        :TP_ESPACO,
        :NM_ESPACO,
        :DS_TITULO,
        :DS_OBSERVACAO,
        TO_TIMESTAMP(:DT_INICIO, 'YYYY-MM-DD"T"HH24:MI:SS'),
        TO_TIMESTAMP(:DT_FIM, 'YYYY-MM-DD"T"HH24:MI:SS'),
        :NM_USUARIO,
        :DS_LOGIN,
        :DS_EMAIL,
        :DS_DEPARTAMENTO,
        'ATIVA'
      )
      RETURNING ID_RESERVA_SALA INTO :ID_RESERVA_SALA
    `;

      const result = await conn.execute(
        sql,
        {
          TP_ESPACO: toUpperTrim(TP_ESPACO),
          NM_ESPACO: toTrim(NM_ESPACO),
          DS_TITULO: toUpperTrim(DS_TITULO),
          DS_OBSERVACAO: toNullable(DS_OBSERVACAO),
          DT_INICIO: toDateTime(DT_INICIO),
          DT_FIM: toDateTime(DT_FIM),

          NM_USUARIO: toNullable(
            USUARIO?.nome_completo || USUARIO?.nome || USUARIO?.username
          ),
          DS_LOGIN: toNullable(USUARIO?.username),
          DS_EMAIL: toNullable(USUARIO?.email),
          DS_DEPARTAMENTO: toNullable(USUARIO?.department),

          ID_RESERVA_SALA: {
            dir: oracledb.BIND_OUT,
            type: oracledb.NUMBER,
          },
        },
        { autoCommit: false } as any
      );

      const idReserva =
        (result.outBinds as any)?.ID_RESERVA_SALA?.[0] ||
        (result.outBinds as any)?.ID_RESERVA_SALA;

      await conn.commit();

      try {
        const emailUsuario = toNullable(USUARIO?.email);

        if (emailUsuario) {
          await sendEmail(
            emailUsuario,
            "Reserva de sala confirmada",
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
      <td
        style="
          background:#16a34a;
          padding:24px;
          color:white;
        "
      >
        <h1 style="margin:0;font-size:24px;">
          Reserva Confirmada
        </h1>

        <p style="margin-top:8px;font-size:14px;opacity:.95;">
          Sua reserva foi registrada com sucesso.
        </p>
      </td>
    </tr>

    <tr>
      <td style="padding:32px;">
        <p style="font-size:16px;margin-top:0;">
          Olá,
          <strong>
            ${toNullable(
              USUARIO?.nome_completo ||
              USUARIO?.nome ||
              USUARIO?.username
            ) || "usuário"}
          </strong>
        </p>

        <p style="color:#4b5563;font-size:15px;">
          A sua reserva foi cadastrada na Intranet.
          Confira os detalhes abaixo:
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
              <td style="padding:8px 0;color:#6b7280;">
                Espaço
              </td>
              <td style="padding:8px 0;font-weight:600;">
                ${toTrim(NM_ESPACO)}
              </td>
            </tr>

            <tr>
              <td style="padding:8px 0;color:#6b7280;">
                Reunião
              </td>
              <td style="padding:8px 0;font-weight:600;">
                ${toTrim(DS_TITULO)}
              </td>
            </tr>

            <tr>
              <td style="padding:8px 0;color:#6b7280;">
                Início
              </td>
              <td style="
                padding:8px 0;
                font-weight:700;
                color:#00AE9D;
                font-size:16px;
              ">
                ${formatDateTimeBR(DT_INICIO)}
              </td>
            </tr>

            <tr>
              <td style="padding:8px 0;color:#6b7280;">
                Fim
              </td>
              <td style="
                padding:8px 0;
                font-weight:700;
                color:#00AE9D;
                font-size:16px;
              ">
                ${formatDateTimeBR(DT_FIM)}
              </td>
            </tr>

            ${DS_OBSERVACAO
              ? `
                  <tr>
                    <td style="padding:8px 0;color:#6b7280;">
                      Observação
                    </td>
                    <td style="padding:8px 0;">
                      ${toTrim(DS_OBSERVACAO)}
                    </td>
                  </tr>
                `
              : ""}
          </table>
        </div>

        <div
          style="
            margin-top:24px;
            background:#ecfdf5;
            border-left:4px solid #16a34a;
            padding:16px;
            border-radius:8px;
          "
        >
          <strong>Lembrete automático</strong>

          <p style="margin:8px 0 0 0;color:#374151;">
            Você receberá um novo e-mail
            30 minutos antes do início da reunião.
          </p>
        </div>

        <div style="margin-top:32px;text-align:center;">
          <a
            href="https://intranet"
            style="
              display:inline-block;
              background:#79B729;
              color:white;
              text-decoration:none;
              padding:14px 24px;
              border-radius:10px;
              font-weight:600;
            "
          >
            Abrir Intranet
          </a>
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
        Este é um e-mail automático da Intranet.
        <br />
        Não responda esta mensagem.
      </td>
    </tr>
  </table>
</div>
`
          );
        }
      } catch (emailError) {
        console.error("Erro ao enviar e-mail de confirmação da reserva:", emailError);
      }

      try {
        console.log("TP_ESPACO recebido:", TP_ESPACO);

        if (toUpperTrim(TP_ESPACO) === "AUDITORIO") {
          const checklist = CHECKLIST_AUDITORIO || {};

          const emailsInfra = [
            "ricardo.henrique@sicoob.com.br",
            "fabio.sprado@sicoob.com.br",
            "thiago.msantos@sicoob.com.br",
            "monica.torres@sicoob.com.br",
          ];

          console.log("Enviando e-mail para Infra:", emailsInfra);

          const simNao = (value: any) => (value ? "Sim" : "Não");

          const htmlInfra = `
            <div style="background:#79B729;padding:40px 20px;font-family:Segoe UI,Arial,sans-serif;">
            <table
              width="100%"
              cellpadding="0"
              cellspacing="0"
              style="
                max-width:850px;
                margin:auto;
                background:#ffffff;
                border-radius:16px;
                overflow:hidden;
              "
            >

            <tr>
              <td style="background:#00AE9D;padding:24px;color:#fff;">
                <h1 style="margin:0;font-size:24px;">
                  Nova reserva do Auditório
                </h1>

                <p style="margin-top:8px;font-size:14px;">
                  Checklist preenchido automaticamente pela Intranet
                </p>
              </td>
            </tr>

            <tr>
            <td style="padding:32px">

            <h2 style="color:#00AE9D;">Informações Gerais do Evento</h2>

            <table width="100%">
            <tr><td><strong>Nome do Evento</strong></td><td>${checklist.nomeEvento || "-"}</td></tr>
            <tr><td><strong>Data do Evento</strong></td><td>${checklist.dataEvento || "-"}</td></tr>
            <tr><td><strong>Horário Inicial</strong></td><td>${checklist.horarioInicio || "-"}</td></tr>
            <tr><td><strong>Horário Final</strong></td><td>${checklist.horarioTermino || "-"}</td></tr>
            <tr><td><strong>Responsável</strong></td><td>${checklist.responsavelEvento || "-"}</td></tr>
            <tr><td><strong>Participantes</strong></td><td>${checklist.quantidadeParticipantes || "-"}</td></tr>
            </table>

            <hr>

            <h2 style="color:#00AE9D;">Dados da Reserva</h2>

            <table width="100%">
            <tr><td><strong>Reunião</strong></td><td>${toTrim(DS_TITULO)}</td></tr>
            <tr><td><strong>Início</strong></td><td>${formatDateTimeBR(DT_INICIO)}</td></tr>
            <tr><td><strong>Fim</strong></td><td>${formatDateTimeBR(DT_FIM)}</td></tr>
            <tr><td><strong>Solicitante</strong></td><td>${toNullable(
            USUARIO?.nome_completo ||
            USUARIO?.nome ||
            USUARIO?.username
          ) || "-"
            }</td></tr>
            <tr><td><strong>E-mail</strong></td><td>${toNullable(USUARIO?.email) || "-"}</td></tr>
            <tr><td><strong>Departamento</strong></td><td>${toNullable(USUARIO?.department) || "-"}</td></tr>
            </table>

            <hr>

            <h2 style="color:#00AE9D;">Recursos Necessários</h2>

            <table width="100%">
            <tr><td>Uso de microfones</td><td>${simNao(checklist.usoMicrofones)}</td></tr>
            <tr><td>Quantidade de microfones</td><td>${checklist.quantidadeMicrofones || "-"}</td></tr>
            <tr><td>Uso de projeção</td><td>${simNao(checklist.usoProjecao)}</td></tr>
            <tr><td>Notebook próprio</td><td>${simNao(checklist.notebookProprio)}</td></tr>
            <tr><td>Precisa de notebook</td><td>${simNao(checklist.precisaNotebook)}</td></tr>
            <tr><td>Áudio externo</td><td>${checklist.usoAudioExterno || "-"}</td></tr>
            <tr><td>Operador do som</td><td>${checklist.temOperadorSom || "-"}</td></tr>
            </table>

            <hr>

            <h2 style="color:#00AE9D;">Transmissão Online</h2>

            <table width="100%">
            <tr><td>Transmissão ao vivo</td><td>${checklist.transmissaoAoVivo || "-"}</td></tr>
            <tr><td>Plataforma</td><td>${checklist.plataformaTransmissao || "-"}</td></tr>
            </table>

            <hr>

            <h2 style="color:#00AE9D;">Outros Itens</h2>

            <table width="100%">
            <tr><td>Internet dedicada</td><td>${checklist.internetDedicada || "-"}</td></tr>
            </table>

            <hr>

            <h2 style="color:#00AE9D;">Observações</h2>

            <div style="
            background:#f5f5f5;
            padding:16px;
            border-radius:10px;
            ">
            ${checklist.observacoesAdicionais || "-"}
            </div>

            <hr>

            <h2 style="color:#00AE9D;">Equipe Técnica</h2>

            <table width="100%">
            <tr><td>Técnico escalado</td><td>${checklist.tecnicoEscalado || "-"}</td></tr>
            <tr><td>Equipe de apoio orientada</td><td>${simNao(checklist.instrucoesEquipeApoio)}</td></tr>
            <tr><td>Limitações técnicas informadas</td><td>${simNao(checklist.responsavelInformadoLimitacoes)}</td></tr>
            </table>

            </td>
            </tr>

            <tr>
            <td style="
            background:#f9fafb;
            padding:20px;
            text-align:center;
            color:#6b7280;
            font-size:12px;
            ">
            Este e-mail foi gerado automaticamente pela Intranet.
            </td>
            </tr>

            </table>
            </div>
            `;

          for (const emailInfra of emailsInfra) {
            await sendEmail(
              emailInfra,
              "Nova reserva do Auditório - Checklist preenchido",
              htmlInfra
            );
          }

          await sendEmail(
            "monica.torres@sicoob.com.br",
            "Auditório reservado - ciência do evento",
            `
            <div style="
              background:#79B729;
              padding:40px 20px;
              font-family:Segoe UI, Arial, sans-serif;
            ">
              <table width="100%" cellpadding="0" cellspacing="0" style="
                max-width:700px;
                margin:auto;
                background:#ffffff;
                border-radius:16px;
                overflow:hidden;
                box-shadow:0 4px 20px rgba(0,0,0,0.08);
              ">
                <tr>
                  <td style="background:#16a34a;padding:24px;color:white;">
                    <h1 style="margin:0;font-size:24px;">
                      Auditório Reservado
                    </h1>

                    <p style="margin-top:8px;font-size:14px;opacity:.95;">
                      Uma nova reserva do auditório foi cadastrada na Intranet.
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="padding:32px;">
                    <p style="font-size:16px;margin-top:0;">
                      Olá, <strong>Janaina</strong>
                    </p>

                    <p style="color:#4b5563;font-size:15px;">
                      Este aviso é apenas para ciência da nova reserva do auditório.
                    </p>

                    <div style="
                      background:#f9fafb;
                      border:1px solid #e5e7eb;
                      border-radius:12px;
                      padding:20px;
                      margin-top:24px;
                    ">
                      <table width="100%">
                        <tr>
                          <td style="padding:8px 0;color:#6b7280;">Evento</td>
                          <td style="padding:8px 0;font-weight:600;">
                            ${toTrim(DS_TITULO)}
                          </td>
                        </tr>

                        <tr>
                          <td style="padding:8px 0;color:#6b7280;">Espaço</td>
                          <td style="padding:8px 0;font-weight:600;">
                            ${toTrim(NM_ESPACO)}
                          </td>
                        </tr>

                        <tr>
                          <td style="padding:8px 0;color:#6b7280;">Início</td>
                          <td style="padding:8px 0;font-weight:700;color:#00AE9D;font-size:16px;">
                            ${formatDateTimeBR(DT_INICIO)}
                          </td>
                        </tr>

                        <tr>
                          <td style="padding:8px 0;color:#6b7280;">Fim</td>
                          <td style="padding:8px 0;font-weight:700;color:#00AE9D;font-size:16px;">
                            ${formatDateTimeBR(DT_FIM)}
                          </td>
                        </tr>

                        <tr>
                          <td style="padding:8px 0;color:#6b7280;">Solicitante</td>
                          <td style="padding:8px 0;font-weight:600;">
                            ${toNullable(
              USUARIO?.nome_completo ||
              USUARIO?.nome ||
              USUARIO?.username
            ) || "-"
            }
                          </td>
                        </tr>
                      </table>
                    </div>

                    <div style="
                      margin-top:24px;
                      background:#ecfdf5;
                      border-left:4px solid #16a34a;
                      padding:16px;
                      border-radius:8px;
                    ">
                      <strong>Aviso automático</strong>

                      <p style="margin:8px 0 0 0;color:#374151;">
                        Este e-mail foi enviado para ciência da reserva do auditório.
                      </p>
                    </div>

                    <div style="margin-top:32px;text-align:center;">
                      <a href="https://intranet" style="
                        display:inline-block;
                        background:#79B729;
                        color:white;
                        text-decoration:none;
                        padding:14px 24px;
                        border-radius:10px;
                        font-weight:600;
                      ">
                        Abrir Intranet
                      </a>
                    </div>
                  </td>
                </tr>

                <tr>
                  <td style="
                    background:#f9fafb;
                    padding:20px;
                    text-align:center;
                    color:#6b7280;
                    font-size:12px;
                  ">
                    Este é um e-mail automático da Intranet.
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
            "Auditório reservado - ciência do evento",
            `
<div style="
  background:#79B729;
  padding:40px 20px;
  font-family:Segoe UI, Arial, sans-serif;
">
  <table width="100%" cellpadding="0" cellspacing="0" style="
    max-width:700px;
    margin:auto;
    background:#ffffff;
    border-radius:16px;
    overflow:hidden;
    box-shadow:0 4px 20px rgba(0,0,0,0.08);
  ">
    <tr>
      <td style="background:#16a34a;padding:24px;color:white;">
        <h1 style="margin:0;font-size:24px;">
          Auditório Reservado
        </h1>

        <p style="margin-top:8px;font-size:14px;opacity:.95;">
          Uma nova reserva do auditório foi cadastrada na Intranet.
        </p>
      </td>
    </tr>

    <tr>
      <td style="padding:32px;">
        <p style="font-size:16px;margin-top:0;">
          Olá, <strong>Equipe de Marketing</strong>
        </p>

        <p style="color:#4b5563;font-size:15px;">
          Este e-mail é apenas para ciência de uma nova reserva do auditório,
          caso seja necessária alguma divulgação, cobertura ou apoio da equipe.
        </p>

        <div style="
          background:#f9fafb;
          border:1px solid #e5e7eb;
          border-radius:12px;
          padding:20px;
          margin-top:24px;
        ">
          <table width="100%">
            <tr>
              <td style="padding:8px 0;color:#6b7280;">Evento</td>
              <td style="padding:8px 0;font-weight:600;">
                ${toTrim(DS_TITULO)}
              </td>
            </tr>

            <tr>
              <td style="padding:8px 0;color:#6b7280;">Espaço</td>
              <td style="padding:8px 0;font-weight:600;">
                ${toTrim(NM_ESPACO)}
              </td>
            </tr>

            <tr>
              <td style="padding:8px 0;color:#6b7280;">Início</td>
              <td style="padding:8px 0;font-weight:700;color:#00AE9D;font-size:16px;">
                ${formatDateTimeBR(DT_INICIO)}
              </td>
            </tr>

            <tr>
              <td style="padding:8px 0;color:#6b7280;">Fim</td>
              <td style="padding:8px 0;font-weight:700;color:#00AE9D;font-size:16px;">
                ${formatDateTimeBR(DT_FIM)}
              </td>
            </tr>

            <tr>
              <td style="padding:8px 0;color:#6b7280;">Solicitante</td>
              <td style="padding:8px 0;font-weight:600;">
                ${toNullable(
              USUARIO?.nome_completo ||
              USUARIO?.nome ||
              USUARIO?.username
            ) || "-"
            }
              </td>
            </tr>

            ${DS_OBSERVACAO
              ? `
                  <tr>
                    <td style="padding:8px 0;color:#6b7280;">
                      Observação
                    </td>
                    <td style="padding:8px 0;">
                      ${toTrim(DS_OBSERVACAO)}
                    </td>
                  </tr>
                `
              : ""
            }
          </table>
        </div>

        <div style="
          margin-top:24px;
          background:#ecfdf5;
          border-left:4px solid #16a34a;
          padding:16px;
          border-radius:8px;
        ">
          <strong>Comunicado</strong>

          <p style="margin:8px 0 0 0;color:#374151;">
            Este e-mail foi enviado apenas para ciência da equipe de Marketing.
          </p>
        </div>

        <div style="margin-top:32px;text-align:center;">
          <a
            href="https://intranet"
            style="
              display:inline-block;
              background:#79B729;
              color:white;
              text-decoration:none;
              padding:14px 24px;
              border-radius:10px;
              font-weight:600;
            "
          >
            Abrir Intranet
          </a>
        </div>
      </td>
    </tr>

    <tr>
      <td style="
        background:#f9fafb;
        padding:20px;
        text-align:center;
        color:#6b7280;
        font-size:12px;
      ">
        Este é um e-mail automático da Intranet.
        <br />
        Não responda esta mensagem.
      </td>
    </tr>
  </table>
</div>
`
          );
        }
      } catch (emailInfraError) {
        console.error("Erro ao enviar e-mail para Infra:", emailInfraError);
      }

      return res.status(201).json({
        success: true,
        ID_RESERVA_SALA: idReserva,
      });
    } catch (err: any) {
      if (conn) {
        try {
          await conn.rollback();
        } catch { }
      }

      console.error("criar reserva sala reunião erro:", err);

      return res.status(500).json({
        error: "Falha ao cadastrar reserva.",
        details: String(err?.message || err),
      });
    } finally {
      if (conn) {
        try {
          await conn.close();
        } catch { }
      }
    }
  },

  async listar(req: Request, res: Response) {
    try {
      const inicio = String(req.query.inicio || "").trim();
      const fim = String(req.query.fim || "").trim();
      const tipoEspaco = String(req.query.tipoEspaco || "").trim();
      const nomeEspaco = String(req.query.nomeEspaco || "").trim();

      const filtros: string[] = [`ST_RESERVA = 'ATIVA'`];
      const binds: Record<string, any> = {};

      if (inicio) {
        filtros.push(`DT_INICIO >= TO_TIMESTAMP(:inicio, 'YYYY-MM-DD"T"HH24:MI:SS')`);
        binds.inicio = toDateTime(inicio);
      }

      if (fim) {
        filtros.push(`DT_FIM <= TO_TIMESTAMP(:fim, 'YYYY-MM-DD"T"HH24:MI:SS')`);
        binds.fim = toDateTime(fim);
      }

      if (tipoEspaco) {
        filtros.push(`TP_ESPACO = :tipoEspaco`);
        binds.tipoEspaco = toUpperTrim(tipoEspaco);
      }

      if (nomeEspaco) {
        filtros.push(`NM_ESPACO = :nomeEspaco`);
        binds.nomeEspaco = toTrim(nomeEspaco);
      }

      const whereClause = filtros.length ? `WHERE ${filtros.join(" AND ")}` : "";

      const sql = `
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
          ST_RESERVA,
          SN_LEMBRETE_ENVIADO,
          TO_CHAR(CREATED_AT, 'YYYY-MM-DD HH24:MI:SS') AS CREATED_AT
        FROM DBACRESSEM.RESERVA_SALA_REUNIAO
        ${whereClause}
        ORDER BY DT_INICIO ASC, NM_ESPACO ASC
      `;

      const result = await oracleExecute(
        sql,
        binds,
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      return res.json({
        items: result.rows || [],
      });
    } catch (err: any) {
      console.error("listar reserva sala reunião erro:", err);

      return res.status(500).json({
        error: "Falha ao listar reservas.",
        details: String(err?.message || err),
      });
    }
  },

  async cancelar(req: Request, res: Response) {
    let conn: oracledb.Connection | undefined;

    try {
      const id = Number(req.params.id);

      if (!id) {
        return res.status(400).json({
          error: "ID_RESERVA_SALA inválido.",
        });
      }

      const usuarioLogado = String((req as any).user?.sub || "")
        .trim()
        .toLowerCase();

      if (!usuarioLogado) {
        return res.status(401).json({
          error: "Usuário logado não identificado.",
        });
      }

      conn = await getOraclePool().getConnection();
      await setAuditoriaContext(conn, req);

      const reservaResult = await conn.execute(
        `
      SELECT
        ID_RESERVA_SALA,
        DS_LOGIN,
        ST_RESERVA
      FROM DBACRESSEM.RESERVA_SALA_REUNIAO
      WHERE ID_RESERVA_SALA = :ID_RESERVA_SALA
      `,
        {
          ID_RESERVA_SALA: id,
        },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const reserva = reservaResult.rows?.[0] as any;

      if (!reserva) {
        return res.status(404).json({
          error: "Reserva não encontrada.",
        });
      }

      if (reserva.ST_RESERVA !== "ATIVA") {
        return res.status(400).json({
          error: "Essa reserva já está cancelada.",
        });
      }

      const loginReserva = String(reserva.DS_LOGIN || "")
        .trim()
        .toLowerCase();

      if (loginReserva !== usuarioLogado) {
        return res.status(403).json({
          error: "Você só pode cancelar reservas criadas por você.",
        });
      }

      const result = await conn.execute(
        `
      UPDATE DBACRESSEM.RESERVA_SALA_REUNIAO
      SET
        ST_RESERVA = 'CANCELADA',
        UPDATED_AT = CURRENT_TIMESTAMP
      WHERE ID_RESERVA_SALA = :ID_RESERVA_SALA
        AND ST_RESERVA = 'ATIVA'
      `,
        {
          ID_RESERVA_SALA: id,
        },
        { autoCommit: false } as any
      );

      if (!result.rowsAffected) {
        await conn.rollback();

        return res.status(404).json({
          error: "Reserva não encontrada ou já cancelada.",
        });
      }

      await conn.commit();

      return res.json({
        success: true,
        ID_RESERVA_SALA: id,
      });
    } catch (err: any) {
      if (conn) {
        try {
          await conn.rollback();
        } catch { }
      }

      console.error("cancelar reserva sala reunião erro:", err);

      return res.status(500).json({
        error: "Falha ao cancelar reserva.",
        details: String(err?.message || err),
      });
    } finally {
      if (conn) {
        try {
          await conn.close();
        } catch { }
      }
    }
  },
};