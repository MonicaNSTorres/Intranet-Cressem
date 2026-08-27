import { Request, Response } from "express";
import { sendEmail } from "../services/email.service";
import { oracleExecute } from "../services/oracle.service";
import { AuthenticatedRequest } from "../middleware/auth.middleware";

function modoTesteParticipacaoAtivo() {
  return (
    process.env.NODE_ENV === "development" &&
    String(process.env.PARTICIPACAO_TEST_MODE || "").trim().toLowerCase() === "true"
  );
}

function formatarCnpj(cnpj: string) {
  if (!cnpj) return "";
  const n = cnpj.replace(/\D/g, "");

  if (n.length === 11) {
    return n.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }

  if (n.length === 14) {
    return n.replace(
      /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
      "$1.$2.$3/$4-$5"
    );
  }

  return cnpj;
}

function getParamAsString(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value || "";
}

function getParamAsNumber(value: string | string[] | undefined) {
  const parsed = Number(getParamAsString(value));
  return Number.isFinite(parsed) ? parsed : null;
}

function getParticipacaoDebugEmail() {
  const raw =
    process.env.PARTICIPACAO_DEBUG_EMAIL ||
    process.env.REEMBOLSO_DEBUG_EMAIL ||
    "";

  return String(raw)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function aplicarParticipacaoDebugDestinatarios(destinatarios: string | string[]) {
  const debugEmails = getParticipacaoDebugEmail();
  if (debugEmails.length) return debugEmails;

  if (Array.isArray(destinatarios)) {
    return destinatarios
      .map((email) => String(email || "").trim())
      .filter(Boolean);
  }

  return [String(destinatarios || "").trim()].filter(Boolean);
}

function simNao(value: any) {
  return Number(value || 0) === 1 ? "SIM" : "NÃO";
}

function fmtMoney(value: any) {
  const n = Number(value || 0);
  return n.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtDate(value: any) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("pt-BR");
}


function escaparHtml(value: any) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function linhaTabelaEmail(label: string, value: any) {
  return `
    <tr>
      <td
        width="36%"
        valign="top"
        style="
          padding: 11px 12px;
          border-bottom: 1px solid #dfe6e2;
          background-color: #f7f9f8;
          font-family: Arial, sans-serif;
          font-size: 13px;
          line-height: 18px;
          font-weight: 700;
          color: #17211d;
        "
      >
        ${escaparHtml(label)}
      </td>
      <td
        width="64%"
        valign="top"
        style="
          padding: 11px 12px;
          border-bottom: 1px solid #dfe6e2;
          background-color: #ffffff;
          font-family: Arial, sans-serif;
          font-size: 13px;
          line-height: 18px;
          color: #17211d;
          word-break: break-word;
        "
      >
        ${escaparHtml(value)}
      </td>
    </tr>
  `;
}

function montarEmailParticipacao({
  titulo,
  saudacao,
  introducao,
  linhas,
  orientacao,
}: {
  titulo: string;
  saudacao: string;
  introducao: string;
  linhas: string;
  orientacao?: string;
}) {
  return `
    <!doctype html>
    <html>
      <body style="margin:0; padding:0; background-color:#f2f6f4;">
        <table
          role="presentation"
          width="100%"
          cellspacing="0"
          cellpadding="0"
          border="0"
          style="width:100%; background-color:#f2f6f4; margin:0; padding:0;"
        >
          <tr>
            <td align="center" style="padding:24px 12px;">
              <table
                role="presentation"
                width="620"
                cellspacing="0"
                cellpadding="0"
                border="0"
                style="
                  width:100%;
                  max-width:620px;
                  background-color:#ffffff;
                  border:1px solid #d7e0db;
                  border-radius:14px;
                  overflow:hidden;
                "
              >
                <tr>
                  <td
                    style="
                      padding:20px 22px 18px 22px;
                      background-color:#007a48;
                      font-family:Arial, sans-serif;
                    "
                  >
                    <div
                      style="
                        margin:0 0 6px 0;
                        font-size:11px;
                        line-height:15px;
                        font-weight:700;
                        color:#ffffff;
                        text-transform:uppercase;
                      "
                    >
                      <span
                        style="
                          background-color:#fff200;
                          color:#17211d;
                          padding:1px 3px;
                        "
                      >PARTICIPAÇÃO</span>
                      <span style="color:#ffffff;"> DE MARKETING</span>
                    </div>

                    <div
                      style="
                        margin:0;
                        font-size:20px;
                        line-height:25px;
                        font-weight:700;
                        color:#ffffff;
                      "
                    >
                      ${escaparHtml(titulo)}
                    </div>
                  </td>
                </tr>

                <tr>
                  <td style="padding:20px 22px 22px 22px;">
                    <p
                      style="
                        margin:0 0 10px 0;
                        font-family:Arial, sans-serif;
                        font-size:13px;
                        line-height:19px;
                        color:#17211d;
                      "
                    >
                      ${escaparHtml(saudacao)}
                    </p>

                    <p
                      style="
                        margin:0 0 16px 0;
                        font-family:Arial, sans-serif;
                        font-size:13px;
                        line-height:19px;
                        color:#17211d;
                      "
                    >
                      ${escaparHtml(introducao)}
                    </p>

                    <table
                      role="presentation"
                      width="100%"
                      cellspacing="0"
                      cellpadding="0"
                      border="0"
                      style="
                        width:100%;
                        border-collapse:separate;
                        border-spacing:0;
                        border:1px solid #d7e0db;
                        border-radius:10px;
                        overflow:hidden;
                      "
                    >
                      ${linhas}
                    </table>

                    ${
                      orientacao
                        ? `
                          <table
                            role="presentation"
                            width="100%"
                            cellspacing="0"
                            cellpadding="0"
                            border="0"
                            style="width:100%; margin-top:16px;"
                          >
                            <tr>
                              <td
                                style="
                                  padding:11px 13px;
                                  background-color:#eaf5ef;
                                  border-left:4px solid #00a65a;
                                  border-radius:7px;
                                  font-family:Arial, sans-serif;
                                  font-size:13px;
                                  line-height:18px;
                                  color:#17211d;
                                "
                              >
                                <strong>Orientação:</strong>
                                ${escaparHtml(orientacao)}
                              </td>
                            </tr>
                          </table>
                        `
                        : ""
                    }

                    <p
                      style="
                        margin:18px 0 0 0;
                        font-family:Arial, sans-serif;
                        font-size:11px;
                        line-height:16px;
                        color:#607067;
                      "
                    >
                      Este e-mail foi enviado automaticamente pelo sistema.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

export const emailController = {
  async emailTesteParticipacao(req: AuthenticatedRequest, res: Response) {
    try {
      if (!modoTesteParticipacaoAtivo()) {
        return res.status(404).json({ error: "Modo de teste não está ativo." });
      }

      const id = getParamAsNumber(req.params.id);
      const emailUsuario = String(req.user?.email || "").trim();

      if (id === null) {
        return res.status(400).json({ error: "ID inválido." });
      }

      if (!emailUsuario) {
        return res.status(400).json({ error: "Usuário autenticado sem e-mail." });
      }

      const patrocinioResult = await oracleExecute(
        `SELECT * FROM DBACRESSEM.PATROCINIO WHERE ID_PATROCINIO = :id`,
        { id }
      );
      const patrocinio: any = patrocinioResult.rows?.[0];

      if (!patrocinio) {
        return res.status(404).json({ error: "Patrocínio não encontrado." });
      }

      if (!String(patrocinio.NM_SOLICITANTE || "").toUpperCase().includes("TESTE")) {
        return res.status(403).json({
          error: "O e-mail de teste só pode ser enviado para solicitações identificadas como TESTE.",
        });
      }

      const body = montarEmailParticipacao({
        titulo: "Teste de fluxo de participação",
        saudacao: "Olá,",
        introducao: "Este é um e-mail de teste enviado pelo modo local de simulação.",
        linhas: [
          linhaTabelaEmail("ID Solicitação", id),
          linhaTabelaEmail("Empresa", patrocinio.NM_SOLICITANTE || ""),
          linhaTabelaEmail("Status atual", patrocinio.NM_ANDAMENTO || ""),
        ].join(""),
        orientacao: "Nenhuma pessoa do fluxo real foi notificada por este teste.",
      });

      await sendEmail(
        emailUsuario,
        `[TESTE] Participação ${id} atualizada`,
        body
      );

      return res.json({ message: "E-mail de teste enviado ao usuário logado." });
    } catch (error: any) {
      console.error(error);
      return res.status(500).json({
        error: "Erro ao enviar e-mail de teste",
        details: error.message,
      });
    }
  },

  async emailGerencia(req: Request, res: Response) {
    try {
      const funcionario = getParamAsString(req.params.funcionario);
      const empresa = getParamAsString(req.params.empresa);
      const id = getParamAsNumber(req.params.id);

      if (id === null) {
        return res.status(400).json({ error: "ID inválido." });
      }

      const patrocinioResult = await oracleExecute(
        `SELECT * FROM DBACRESSEM.PATROCINIO WHERE ID_PATROCINIO = :id`,
        { id }
      );

      const patrocinio: any = patrocinioResult.rows?.[0];

      if (!patrocinio) {
        return res.status(404).json({ error: "Patrocínio não encontrado" });
      }

      const diasResult = await oracleExecute(
        `
        SELECT
          TO_CHAR(DT_DIA, 'DD/MM/YYYY') AS DT_DIA,
          HR_INICIO,
          HR_FIM
        FROM DBACRESSEM.DATA_HORA_PATROCINIO
        WHERE ID_PATROCINIO = :id
        ORDER BY DT_DIA, HR_INICIO
      `,
        { id }
      );

      const diasHtml = (diasResult.rows || [])
        .map((row: any, index: number) => {
          const dtDia = String(row?.DT_DIA || "");
          const hrInicio = String(row?.HR_INICIO || "");
          const hrFim = String(row?.HR_FIM || "");
          return linhaTabelaEmail(
            `Dia do Evento${(diasResult.rows || []).length > 1 ? ` ${index + 1}` : ""}`,
            `${dtDia} - ${hrInicio} às ${hrFim}`
          );
        })
        .join("");

      const subject = "Nova Solicitação de Participação de Marketing Recebida";

      const body = montarEmailParticipacao({
        titulo: "Nova solicitação",
        saudacao: "Prezado(a) Gestor(a),",
        introducao:
          "Uma solicitação de participação de marketing está aguardando sua avaliação.",
        linhas: [
          linhaTabelaEmail("ID Solicitação", id),
          linhaTabelaEmail("Empresa", empresa),
          linhaTabelaEmail(
            "Solicitante",
            patrocinio.NM_FUNCIONARIO || funcionario || "-"
          ),
          linhaTabelaEmail(
            "CNPJ/CPF",
            formatarCnpj(patrocinio.NR_CPF_CNPJ)
          ),
          linhaTabelaEmail("Funcionário", funcionario),
          diasHtml,
          linhaTabelaEmail(
            "Precisa de Valor Monetário?",
            simNao(patrocinio.VL_MONETARIO)
          ),
          linhaTabelaEmail(
            "Valor Solicitado",
            `R$ ${fmtMoney(patrocinio.VL_PATROCINIO)}`
          ),
          linhaTabelaEmail("É insumo?", simNao(patrocinio.QTD_INSUMO)),
          linhaTabelaEmail(
            "Estimativa de Valor",
            `R$ ${fmtMoney(patrocinio.VL_ESTIMATIVA)}`
          ),
          linhaTabelaEmail("Solicitação", patrocinio.DESC_SOLICITACAO || ""),
          linhaTabelaEmail("Resumo", patrocinio.DESC_RESUMO_EVENTO || ""),
          linhaTabelaEmail(
            "Precisa de Motorista?",
            simNao(patrocinio.CD_MOTORISTA)
          ),
          linhaTabelaEmail(
            "Precisa de Funcionários?",
            simNao(patrocinio.CD_FUNCIONARIOS)
          ),
          linhaTabelaEmail(
            "Data da Solicitação",
            fmtDate(patrocinio.DT_SOLICITACAO)
          ),
          linhaTabelaEmail("Cidade", patrocinio.NM_CIDADE || ""),
          linhaTabelaEmail(
            "Reserva Auditório Sede",
            simNao(patrocinio.CD_AUDITORIO_SEDE)
          ),
          linhaTabelaEmail(
            "Reserva Centro de Convivência",
            simNao(patrocinio.CD_AUDITORIO_CENTRO)
          ),
          linhaTabelaEmail("Status", patrocinio.NM_ANDAMENTO || ""),
        ].join(""),
        orientacao:
          "Por favor, acesse a Intranet para visualizar os detalhes completos da solicitação e registrar seu parecer.",
      });

      const funcionarioResult = await oracleExecute(
        `
        SELECT
          f.ID_FUNCIONARIO,
          f.CD_GERENCIA
        FROM DBACRESSEM.FUNCIONARIOS_SICOOB_CRESSEM f
        WHERE UPPER(TRIM(f.NM_FUNCIONARIO)) = UPPER(TRIM(:nome))
        FETCH FIRST 1 ROWS ONLY
      `,
        { nome: patrocinio.NM_FUNCIONARIO || funcionario }
      );

      const funcionarioRow: any = funcionarioResult.rows?.[0];

      if (!funcionarioRow) {
        return res.status(404).json({
          error: "Funcionário solicitante não encontrado para identificar a gerência.",
        });
      }

      const codigoGerencia = String(funcionarioRow.CD_GERENCIA || "").trim();

      if (!codigoGerencia) {
        return res.status(400).json({
          error: "Funcionário solicitante sem gerência vinculada.",
        });
      }

      const gerenciaResult = await oracleExecute(
        `
        SELECT
          f.EMAIL,
          f.NM_FUNCIONARIO
        FROM DBACRESSEM.FUNCIONARIOS_SICOOB_CRESSEM f
        WHERE TRIM(TO_CHAR(f.ID_FUNCIONARIO)) = TRIM(:codigoGerencia)
        FETCH FIRST 1 ROWS ONLY
      `,
        { codigoGerencia }
      );

      const gerenciaRow: any = gerenciaResult.rows?.[0];
      const gerenteEmail = String(gerenciaRow?.EMAIL || "").trim();

      if (!gerenteEmail) {
        return res.status(404).json({
          error: "E-mail da gerência do solicitante não encontrado.",
        });
      }

      await sendEmail(
        aplicarParticipacaoDebugDestinatarios(gerenteEmail),
        subject,
        body
      );

      if (Number(patrocinio.CD_AUDITORIO_SEDE || 0) === 1) {
        const auditorioResult = await oracleExecute(
          `
          SELECT
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
            OBS_AUDITORIO_SICOOB_SEDE
          FROM DBACRESSEM.AUDITORIO_SICOOB_SEDE
          WHERE ID_PATROCINIO = :id
          ORDER BY ID_AUDITORIO_SICOOB_SEDE DESC
        `,
          { id }
        );

        const auditorio: any = auditorioResult.rows?.[0] || {};

        const microfoneHtml =
          Number(auditorio.SN_USO_MICROFONE || 0) === 1
            ? linhaTabelaEmail(
                "Uso de microfone?",
                `SIM - Quantidade: ${auditorio.QNTD_MICROFONE || 0}`
              )
            : linhaTabelaEmail("Uso de microfone?", "NÃO");

        const projetorHtml =
          Number(auditorio.SN_USO_PROJETOR || 0) === 1
            ? linhaTabelaEmail(
                "Uso de projeção?",
                `SIM - Apresentação via: ${auditorio.NM_APRESENTACAO || "-"}`
              )
            : linhaTabelaEmail("Uso de projeção?", "NÃO");

        const transmissaoHtml =
          Number(auditorio.SN_AO_VIVO || 0) === 1
            ? linhaTabelaEmail(
                "Haverá transmissão ao vivo?",
                `SIM - Plataforma(s): ${auditorio.NM_PLATAFORMA || "-"}`
              )
            : linhaTabelaEmail("Haverá transmissão ao vivo?", "NÃO");

        const internetHtml =
          Number(auditorio.SN_INTERNET || 0) === 1
            ? linhaTabelaEmail(
                "Uso de Internet dedicada?",
                `SIM - Justificativa: ${auditorio.DESC_JUSTIFICATIVA || "-"}`
              )
            : linhaTabelaEmail("Uso de Internet dedicada?", "NÃO");

        const bodyAuditorio = montarEmailParticipacao({
          titulo: "Reserva do Auditório Sede",
          saudacao: "Prezada Equipe de TI,",
          introducao:
            "Uma solicitação de Participação de Marketing solicitou a reserva do Auditório Sede.",
          linhas: [
            linhaTabelaEmail("ID Solicitação", id),
            linhaTabelaEmail("Empresa", empresa),
            linhaTabelaEmail(
              "Solicitante",
              patrocinio.NM_FUNCIONARIO || funcionario || "-"
            ),
            linhaTabelaEmail(
              "CNPJ/CPF",
              formatarCnpj(patrocinio.NR_CPF_CNPJ)
            ),
            linhaTabelaEmail("Funcionário", funcionario),
            diasHtml,
            linhaTabelaEmail(
              "Solicitação",
              patrocinio.DESC_SOLICITACAO || ""
            ),
            linhaTabelaEmail(
              "Resumo do Evento",
              patrocinio.DESC_RESUMO_EVENTO || ""
            ),
            linhaTabelaEmail(
              "Precisa de Funcionários?",
              simNao(patrocinio.CD_FUNCIONARIOS)
            ),
            linhaTabelaEmail(
              "Data da Solicitação",
              fmtDate(patrocinio.DT_SOLICITACAO)
            ),
            linhaTabelaEmail("Cidade", patrocinio.NM_CIDADE || ""),
            linhaTabelaEmail("Status", patrocinio.NM_ANDAMENTO || ""),
            linhaTabelaEmail(
              "Estimativa de Convidados",
              auditorio.QTD_ESTIMATIVA_CONVIDADOS || 0
            ),
            microfoneHtml,
            projetorHtml,
            linhaTabelaEmail(
              "Uso de áudio externo via notebook?",
              simNao(auditorio.SN_AUDIO_EXTERNO)
            ),
            linhaTabelaEmail(
              "Tem operador do som e apresentação?",
              simNao(auditorio.SN_OPERADOR)
            ),
            transmissaoHtml,
            internetHtml,
            linhaTabelaEmail(
              "Observações",
              auditorio.OBS_AUDITORIO_SICOOB_SEDE || "-"
            ),
          ].join(""),
          orientacao:
            "Por favor, acesse a Intranet para acompanhar os detalhes da reserva e tratar as providências necessárias.",
        });

        const subjectAuditorio =
          "Nova Solicitação de Reserva do Auditório Sede Recebida";

        await sendEmail(
          aplicarParticipacaoDebugDestinatarios([
            "informatica.cressem@sicoob.com.br",
            "luiz.gerhard@sicoob.com.br",
            "fabio.sprado@sicoob.com.br",
          ]),
          subjectAuditorio,
          bodyAuditorio
        );
      }

      return res.json({
        message: "Email enviado para gerência",
        debug_email_ativo: getParticipacaoDebugEmail().length > 0,
      });
    } catch (error: any) {
      console.error(error);

      return res.status(500).json({
        error: "Erro ao enviar email gerência",
        details: error.message,
      });
    }
  },

  async emailMarketing(req: Request, res: Response) {
    try {
      const id = getParamAsNumber(req.params.id);

      if (id === null) {
        return res.status(400).json({ error: "ID inválido." });
      }

      const patrocinioResult = await oracleExecute(
        `SELECT * FROM DBACRESSEM.PATROCINIO WHERE ID_PATROCINIO = :id`,
        { id }
      );
      const patrocinio: any = patrocinioResult.rows?.[0];

      if (!patrocinio) {
        return res.status(404).json({ error: "Patrocínio não encontrado." });
      }

      const body = montarEmailParticipacao({
        titulo: "Parecer de Marketing solicitado",
        saudacao: "Prezados(as),",
        introducao:
          "A Gerência registrou o parecer e a solicitação de participação de marketing aguarda a opinião do setor de Marketing.",
        linhas: [
          linhaTabelaEmail("ID Solicitação", id),
          linhaTabelaEmail("Empresa", patrocinio.NM_SOLICITANTE || ""),
          linhaTabelaEmail("Solicitante", patrocinio.NM_FUNCIONARIO || ""),
          linhaTabelaEmail("Solicitação", patrocinio.DESC_SOLICITACAO || ""),
          linhaTabelaEmail("Resumo", patrocinio.DESC_RESUMO_EVENTO || ""),
          linhaTabelaEmail("Status", patrocinio.NM_ANDAMENTO || ""),
        ].join(""),
        orientacao:
          "Por favor, acessem a Intranet para consultar os detalhes e registrar o parecer de Marketing.",
      });

      await sendEmail(
        aplicarParticipacaoDebugDestinatarios([
          "julia.a.coutinho@sicoob.com.br",
          "luiz.gerhard@sicoob.com.br",
        ]),
        "Parecer de Marketing solicitado - Participação",
        body
      );

      return res.json({
        message: "Email enviado para marketing",
        debug_email_ativo: getParticipacaoDebugEmail().length > 0,
      });
    } catch (error: any) {
      console.error(error);
      return res.status(500).json({
        error: "Erro ao enviar email para marketing",
        details: error.message,
      });
    }
  },

  async emailDiretoria(req: Request, res: Response) {
    try {
      const funcionario = getParamAsString(req.params.funcionario);
      const empresa = getParamAsString(req.params.empresa);
      const id = getParamAsNumber(req.params.id);

      if (id === null) {
        return res.status(400).json({ error: "ID inválido." });
      }

      const patrocinioResult = await oracleExecute(
        `SELECT * FROM DBACRESSEM.PATROCINIO WHERE ID_PATROCINIO = :id`,
        { id }
      );

      const patrocinio: any = patrocinioResult.rows?.[0];

      if (!patrocinio) {
        return res.status(404).json({ error: "Patrocínio não encontrado" });
      }

      const subject = "Nova Solicitação de Participação de Marketing Recebida";

      const body = montarEmailParticipacao({
        titulo: "Atualização de solicitação",
        saudacao: "Prezado(a) Diretor(a),",
        introducao:
          "Uma solicitação de participação de marketing está aguardando sua avaliação.",
        linhas: [
          linhaTabelaEmail("ID Solicitação", id),
          linhaTabelaEmail("Empresa", empresa),
          linhaTabelaEmail(
            "Solicitante",
            patrocinio.NM_FUNCIONARIO || funcionario || "-"
          ),
          linhaTabelaEmail(
            "CNPJ/CPF",
            formatarCnpj(patrocinio.NR_CPF_CNPJ)
          ),
          linhaTabelaEmail("Funcionário", funcionario),
          linhaTabelaEmail("Solicitação", patrocinio.DESC_SOLICITACAO || ""),
          linhaTabelaEmail("Resumo", patrocinio.DESC_RESUMO_EVENTO || ""),
          linhaTabelaEmail("Status", patrocinio.NM_ANDAMENTO || ""),
        ].join(""),
        orientacao:
          "Por favor, acesse a Intranet para visualizar os detalhes completos e registrar seu parecer.",
      });

      const emails = aplicarParticipacaoDebugDestinatarios([
        "paulo.tarso@sicoob.com.br",
      ]);

      await sendEmail(emails, subject, body);

      return res.json({
        message: "Email enviado para diretoria",
        debug_email_ativo: getParticipacaoDebugEmail().length > 0,
      });
    } catch (error: any) {
      console.error(error);

      return res.status(500).json({
        error: "Erro ao enviar email diretoria",
        details: error.message,
      });
    }
  },

  async emailConselho(req: Request, res: Response) {
    try {
      const id = getParamAsNumber(req.params.id);

      if (id === null) {
        return res.status(400).json({ error: "ID inválido." });
      }

      const patrocinioResult = await oracleExecute(
        `SELECT * FROM DBACRESSEM.PATROCINIO WHERE ID_PATROCINIO = :id`,
        { id }
      );

      const patrocinio: any = patrocinioResult.rows?.[0];

      if (!patrocinio) {
        return res.status(404).json({ error: "Patrocínio não encontrado." });
      }

      const subject = "Nova Solicitação de Participação de Marketing Recebida";

      const body = montarEmailParticipacao({
        titulo: "Atualização de solicitação",
        saudacao: "Prezados(as) Conselheiros(as),",
        introducao:
          "Uma solicitação de participação de marketing está aguardando decisão do conselho.",
        linhas: [
          linhaTabelaEmail("ID Solicitação", id),
          linhaTabelaEmail("Empresa", patrocinio.NM_SOLICITANTE || ""),
          linhaTabelaEmail(
            "CNPJ/CPF",
            formatarCnpj(patrocinio.NR_CPF_CNPJ)
          ),
          linhaTabelaEmail("Solicitação", patrocinio.DESC_SOLICITACAO || ""),
          linhaTabelaEmail("Resumo", patrocinio.DESC_RESUMO_EVENTO || ""),
          linhaTabelaEmail("Status", patrocinio.NM_ANDAMENTO || ""),
        ].join(""),
        orientacao:
          "Por favor, acesse a Intranet para visualizar os detalhes completos e registrar a decisão final.",
      });

      const emailsConselho = aplicarParticipacaoDebugDestinatarios([
        "janainag@sicoob.com.br",
        "isabeli.cmartins@sicoob.com.br"
      ]);

      await sendEmail(emailsConselho, subject, body);

      return res.json({
        message: "Email enviado para conselho",
        debug_email_ativo: getParticipacaoDebugEmail().length > 0,
      });
    } catch (error: any) {
      console.error(error);

      return res.status(500).json({
        error: "Erro ao enviar email conselho",
        details: error.message,
      });
    }
  },

  async emailParecerFinal(req: Request, res: Response) {
    try {
      const id = getParamAsNumber(req.params.id);

      if (id === null) {
        return res.status(400).json({ error: "ID inválido." });
      }

      const patrocinioResult = await oracleExecute(
        `SELECT * FROM DBACRESSEM.PATROCINIO WHERE ID_PATROCINIO = :id`,
        { id }
      );

      const patrocinio: any = patrocinioResult.rows?.[0];

      if (!patrocinio) {
        return res.status(404).json({ error: "Patrocínio não encontrado" });
      }

      const subject = "Solicitação de Participação de Marketing Finalizada";

      const body = montarEmailParticipacao({
        titulo: "Solicitação finalizada",
        saudacao: "Prezados(as),",
        introducao: "A solicitação abaixo foi finalizada:",
        linhas: [
          linhaTabelaEmail("ID Solicitação", id),
          linhaTabelaEmail(
            "Solicitante",
            patrocinio.NM_FUNCIONARIO || "-"
          ),
          linhaTabelaEmail(
            "CNPJ/CPF",
            formatarCnpj(patrocinio.NR_CPF_CNPJ)
          ),
          linhaTabelaEmail("Solicitação", patrocinio.DESC_SOLICITACAO || ""),
          linhaTabelaEmail("Resumo", patrocinio.DESC_RESUMO_EVENTO || ""),
          linhaTabelaEmail("Status", patrocinio.NM_ANDAMENTO || ""),
        ].join(""),
        orientacao:
          "Para histórico e consulta completa, acesse a Intranet.",
      });

      const destinatarios = new Set<string>();

      const addEmail = (email: any) => {
        const e = String(email || "").trim().toLowerCase();
        if (e) destinatarios.add(e);
      };

      const buscarEmailPorNome = async (nome: string) => {
        const nomeLimpo = String(nome || "").trim();
        if (!nomeLimpo) return "";

        const result = await oracleExecute(
          `
          SELECT
            TRIM(f.EMAIL) AS EMAIL
          FROM DBACRESSEM.FUNCIONARIOS_SICOOB_CRESSEM f
          WHERE UPPER(TRIM(f.NM_FUNCIONARIO)) = UPPER(TRIM(:nome))
          FETCH FIRST 1 ROWS ONLY
        `,
          { nome: nomeLimpo }
        );

        return String((result.rows?.[0] as any)?.EMAIL || "").trim();
      };

      const buscarEmailGerenciaDoFuncionario = async (nomeFuncionario: string) => {
        const nomeLimpo = String(nomeFuncionario || "").trim();
        if (!nomeLimpo) return "";

        const funcionarioResult = await oracleExecute(
          `
          SELECT
            f.CD_GERENCIA
          FROM DBACRESSEM.FUNCIONARIOS_SICOOB_CRESSEM f
          WHERE UPPER(TRIM(f.NM_FUNCIONARIO)) = UPPER(TRIM(:nome))
          FETCH FIRST 1 ROWS ONLY
        `,
          { nome: nomeLimpo }
        );

        const funcionarioRow: any = funcionarioResult.rows?.[0];
        const codigoGerencia = String(funcionarioRow?.CD_GERENCIA || "").trim();
        if (!codigoGerencia) return "";

        const gerenciaResult = await oracleExecute(
          `
          SELECT
            TRIM(f.EMAIL) AS EMAIL
          FROM DBACRESSEM.FUNCIONARIOS_SICOOB_CRESSEM f
          WHERE TRIM(TO_CHAR(f.ID_FUNCIONARIO)) = TRIM(:codigoGerencia)
          FETCH FIRST 1 ROWS ONLY
        `,
          { codigoGerencia }
        );

        return String((gerenciaResult.rows?.[0] as any)?.EMAIL || "").trim();
      };

      // 1) Pessoa que solicitou (funcionário)
      addEmail(await buscarEmailPorNome(String(patrocinio.NM_FUNCIONARIO || "")));

      // 2) Gerente da pessoa que solicitou
      addEmail(
        await buscarEmailGerenciaDoFuncionario(String(patrocinio.NM_FUNCIONARIO || ""))
      );

      // 3) Diretoria (preferência: diretoria registrada no patrocínio)
      addEmail(await buscarEmailPorNome(String(patrocinio.NM_DIRETORIA || "")));
      // fallback atual caso não encontre diretoria no cadastro
      addEmail("paulo.tarso@sicoob.com.br");

      // 4) Se tiver auditório, incluir TI no envio final também
      const temAuditorio =
        Number(patrocinio.CD_AUDITORIO_SEDE || 0) === 1 ||
        Number(patrocinio.CD_AUDITORIO_CENTRO || 0) === 1;

      if (temAuditorio) {
        addEmail("luiz.gerhard@sicoob.com.br");
        addEmail("fabio.sprado@sicoob.com.br");
      }

      const emails = aplicarParticipacaoDebugDestinatarios(
        Array.from(destinatarios)
      );

      if (!emails.length) {
        return res.status(404).json({
          error: "Nenhum destinatário encontrado para envio do parecer final.",
        });
      }

      await sendEmail(emails, subject, body);

      return res.json({
        message: "Email final enviado",
        destinatarios: emails,
        debug_email_ativo: getParticipacaoDebugEmail().length > 0,
      });
    } catch (error: any) {
      console.error(error);

      return res.status(500).json({
        error: "Erro ao enviar email final",
        details: error.message,
      });
    }
  },
};
