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

function buildContratoInfo(row: any) {
  return `
    <div style="margin-bottom: 14px; padding: 12px; border: 1px solid #ddd; border-radius: 8px;">
      <p style="margin: 0 0 6px 0;">
        <strong>Empresa:</strong> ${row.NM_EMPRESA || "-"}
      </p>

      <p style="margin: 0 0 6px 0;">
        <strong>CNPJ:</strong> ${formatarCnpj(row.CNPJ)}
      </p>

      <p style="margin: 0 0 6px 0;">
        <strong>Cidade:</strong> ${row.NM_CIDADE || "-"}
      </p>

      <p style="margin: 0 0 6px 0;">
        <strong>Data de vencimento:</strong> ${dataBR(row.FIM)}
      </p>

      <p style="margin: 0;">
        <strong>Faltam:</strong> ${row.DIAS_RESTANTES} dia(s)
      </p>
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

    const html = `
      <div style="font-family: Arial, sans-serif; font-size: 14px; color: #222;">
        <p>Prezado(a) <strong>${data.nome}</strong>,</p>

        <p>Os seguintes contratos estão próximos do vencimento:</p>

        ${contratoInfo}

        <p>Não esqueça de sua renovação!</p>

        <p>
          Atenciosamente,<br/>
          Sistema de Gerenciamento de Contratos Sicoob Cressem
        </p>

        <p style="margin-top: 20px; color: #666;">
          Este email foi enviado automaticamente pela intranet.
        </p>
      </div>
    `;

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
