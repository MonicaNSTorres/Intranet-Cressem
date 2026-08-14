import oracledb from "oracledb";
import { oracleExecute, oracleExecuteCommit } from "./oracle.service";
import { sendEmail } from "./email.service";
import os from "os";

const JANELAS_AVISO = [60, 30, 20, 10, 5, 4, 3, 2, 1];
const ROTINA = "CONTRATOS_NOTIFICACAO";

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

function dataRefDiaSaoPaulo(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((p) => p.type === "year")?.value || "0000";
  const month = parts.find((p) => p.type === "month")?.value || "00";
  const day = parts.find((p) => p.type === "day")?.value || "00";

  return `${year}-${month}-${day}`;
}

function chaveAvisoContrato(
  row: any,
  refDia: string
) {
  const idContrato = String(row.ID_CONTRATOS_EMPRESAS || "0");
  const idFuncionario = String(row.ID_FUNCIONARIO || "0");
  const diasRestantes = String(row.DIAS_RESTANTES || "0");
  return `${ROTINA}:${idContrato}:${idFuncionario}:${diasRestantes}:${refDia}`;
}

async function reservarAvisoContrato(row: any, refDia: string) {
  const idempotencyKey = chaveAvisoContrato(row, refDia);

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
        competencia: refDia,
        destinatario: String(row.EMAIL || "").trim() || "SEM_EMAIL",
        assunto: "Contratos próximos do vencimento",
        origemHost: os.hostname(),
        origemPid: String(process.pid),
      }
    );

    return { reservado: true, idempotencyKey };
  } catch (error: any) {
    const message = String(error?.message || "");
    const jaExiste =
      error?.errorNum === 1 ||
      message.includes("ORA-00001") ||
      message.toUpperCase().includes("UNIQUE");

    if (jaExiste) return { reservado: false, idempotencyKey };
    throw error;
  }
}

async function marcarAvisosEnviados(idempotencyKeys: string[]) {
  for (const idempotencyKey of idempotencyKeys) {
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
}

async function marcarAvisosFalha(idempotencyKeys: string[], erro: unknown) {
  const erroTexto = String((erro as any)?.message || erro || "").slice(0, 2000);

  for (const idempotencyKey of idempotencyKeys) {
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
}

function dataBR(value: any) {
  if (!value) return "-";

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString("pt-BR");
}

function escapeHtml(value: any) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function valorEmail(value: any) {
  const text = String(value ?? "").trim();
  return text || "-";
}

function onlyNumbers(value: any) {
  return String(value || "").replace(/\D/g, "");
}

function formatarCnpj(value: any) {
  const cnpj = onlyNumbers(value);

  if (cnpj.length !== 14) {
    return String(value || "-");
  }

  return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(
    5,
    8
  )}/${cnpj.slice(8, 12)}-${cnpj.slice(12)}`;
}

function montarLinhaEmail(label: string, value: any) {
  return `
    <tr>
      <td style="width: 190px; padding: 8px 12px; background: #f8fafc; border-bottom: 1px solid #e5e7eb; color: #475467; font-weight: 700;">
        ${label}
      </td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #101828; font-weight: 600;">
        ${escapeHtml(valorEmail(value))}
      </td>
    </tr>
  `;
}

function buildContratoInfo(row: any) {
  const diasRestantes = Number(row.DIAS_RESTANTES);
  const textoDias = Number.isFinite(diasRestantes)
    ? `${diasRestantes} dia(s)`
    : "-";

  return `
    <div style="margin: 0 0 16px 0; border: 1px solid #d9e2ec; border-radius: 12px; overflow: hidden; background: #ffffff;">
      <div style="padding: 12px 14px; background: #f0fdf9; border-bottom: 1px solid #d9e2ec; color: #006b5f; font-size: 14px; font-weight: 800;">
        ${escapeHtml(valorEmail(row.NM_EMPRESA))}
      </div>
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse; font-size: 13px;">
        ${montarLinhaEmail("Empresa", row.NM_EMPRESA)}
        ${montarLinhaEmail("CPF/CNPJ", formatarCnpj(row.NR_CNPJ))}
        ${montarLinhaEmail("Cidade", row.NM_CIDADE)}
        ${montarLinhaEmail("Data de vencimento", dataBR(row.DT_FIM))}
        ${montarLinhaEmail("Faltam", textoDias)}
      </table>
    </div>
  `;
}

function montarEmailContratosProximos(nome: string, contratosHtml: string) {
  return `
    <div style="margin: 0; padding: 24px; background: #f3f6f8; font-family: Arial, Helvetica, sans-serif; color: #101828;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse;">
        <tr>
          <td align="center">
            <table role="presentation" cellpadding="0" cellspacing="0" width="680" style="max-width: 680px; width: 100%; border-collapse: collapse; background: #ffffff; border: 1px solid #d9e2ec; border-radius: 14px; overflow: hidden;">
              <tr>
                <td style="padding: 18px 24px; background: linear-gradient(90deg, #00AE9D 0%, #79B729 100%); color: #ffffff;">
                  <div style="font-size: 18px; line-height: 1.3; font-weight: 800;">
                    Alerta de vencimento de contratos
                  </div>
                  <div style="font-size: 13px; line-height: 1.4; margin-top: 4px;">
                    Sistema de Gerenciamento de Contratos Sicoob Cressem
                  </div>
                </td>
              </tr>
              <tr>
                <td style="padding: 24px;">
                  <p style="margin: 0 0 12px 0; font-size: 14px; line-height: 1.6;">
                    Prezado(a) <strong>${escapeHtml(valorEmail(nome))}</strong>,
                  </p>
                  <p style="margin: 0 0 18px 0; font-size: 14px; line-height: 1.6; color: #475467;">
                    Os contratos abaixo estão próximos do vencimento. Acompanhe a renovação para evitar pendências.
                  </p>

                  ${contratosHtml}

                  <div style="margin-top: 18px; padding: 14px 16px; border: 1px solid #fde68a; border-radius: 12px; background: #fffbeb; color: #92400e; font-size: 13px; line-height: 1.5;">
                    <strong>Atenção:</strong> não esqueça de iniciar ou acompanhar a renovação dentro do prazo.
                  </div>

                  <p style="margin: 22px 0 0 0; font-size: 14px; line-height: 1.6;">
                    Atenciosamente,<br />
                    <strong>Sistema de Gerenciamento de Contratos Sicoob Cressem</strong>
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding: 14px 24px; background: #f8fafc; border-top: 1px solid #e5e7eb; color: #667085; font-size: 12px; line-height: 1.5;">
                  Este e-mail foi enviado automaticamente pela intranet.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  `;
}

async function buscarContratosProximosVencimento() {
  const sql = `
    SELECT
    C.ID_CONTRATOS_EMPRESAS,
    C.ID_CONTRATOS_EMPRESAS,
    C.NM_EMPRESA,
    C.NR_CNPJ,
    C.NM_CIDADE,
    C.DT_FIM,
    TRUNC(C.DT_FIM) - TRUNC(SYSDATE) AS DIAS_RESTANTES,
    F.ID_FUNCIONARIO,
    F.NM_FUNCIONARIO,
    F.EMAIL
    FROM DBACRESSEM.CONTRATOS_EMPRESAS C
    JOIN DBACRESSEM.EMAIL_CONTRATO EC
    ON EC.ID_CONTRATO = C.ID_CONTRATOS_EMPRESAS
    JOIN DBACRESSEM.FUNCIONARIOS_SICOOB_CRESSEM F
    ON F.ID_FUNCIONARIO = EC.ID_FUNCIONARIO
    WHERE C.DT_FIM IS NOT NULL
    AND TRUNC(C.DT_FIM) - TRUNC(SYSDATE) IN (60, 30, 20, 10, 5, 4, 3, 2, 1)
    AND F.EMAIL IS NOT NULL
    ORDER BY F.NM_FUNCIONARIO, C.DT_FIM, C.NM_EMPRESA
  `;

  const result = await oracleExecute(
    sql,
    {},
    {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
    }
  );

  return (result.rows || []) as any[];
}

export async function notificarContratosPorVencimento() {
  const gate = validarHostAutorizadoParaEmail();
  if (!gate.autorizado) {
    console.log(`[CONTRATOS] Envio pulado: ${gate.motivo}`);
    return {
      enviados: 0,
      destinatarios: 0,
      contratosComAviso: 0,
      pulado: true,
      message: gate.motivo,
    };
  }

  const contratos = await buscarContratosProximosVencimento();
  const refDia = dataRefDiaSaoPaulo();

  console.log(
    `[CONTRATOS] Contratos encontrados para aviso: ${contratos.length}`
  );

  if (!contratos.length) {
    return {
      enviados: 0,
      destinatarios: 0,
      contratosComAviso: 0,
      message: "Nenhum contrato próximo do vencimento encontrado.",
    };
  }

  const contratosReservados: any[] = [];
  let avisosDuplicados = 0;

  for (const contrato of contratos) {
    const tentativa = await reservarAvisoContrato(contrato, refDia);
    if (!tentativa.reservado) {
      avisosDuplicados++;
      continue;
    }

    contratosReservados.push({
      ...contrato,
      _idempotencyKey: tentativa.idempotencyKey,
    });
  }

  if (!contratosReservados.length) {
    return {
      enviados: 0,
      destinatarios: 0,
      contratosComAviso: 0,
      pulado: true,
      duplicadosIgnorados: avisosDuplicados,
      message: "Todos os avisos do dia já foram reservados/enviados anteriormente.",
    };
  }

  const porResponsavel: Record<
    string,
    {
      nome: string;
      contratos: any[];
      chaves: string[];
    }
  > = {};

  for (const contrato of contratosReservados) {
    const email = String(contrato.EMAIL || "").trim();

    if (!email) continue;

    if (!porResponsavel[email]) {
      porResponsavel[email] = {
        nome: contrato.NM_FUNCIONARIO || "Colega",
        contratos: [],
        chaves: [],
      };
    }

    porResponsavel[email].contratos.push(contrato);
    porResponsavel[email].chaves.push(String(contrato._idempotencyKey || ""));
  }

  let enviados = 0;

  for (const email of Object.keys(porResponsavel)) {
    const data = porResponsavel[email];

    if (!data.contratos.length) continue;

    const contratoInfo = data.contratos.map(buildContratoInfo).join("");

    const subject = "Contratos próximos do vencimento";
    const html = montarEmailContratosProximos(data.nome, contratoInfo);

    console.log(
      `[CONTRATOS] Enviando para ${data.nome} <${email}> - ${data.contratos.length} contrato(s)`
    );

    try {
      await sendEmail(email, subject, html);
      await marcarAvisosEnviados(data.chaves);
    } catch (error) {
      await marcarAvisosFalha(data.chaves, error);
      throw error;
    }

    enviados++;
  }

  return {
    enviados,
    destinatarios: Object.keys(porResponsavel).length,
    contratosComAviso: contratosReservados.length,
    duplicadosIgnorados: avisosDuplicados,
  };
}
