import oracledb from "oracledb";
import { oracleExecute } from "./oracle.service";
import { sendEmail } from "./email.service";

const JANELAS_AVISO = [60, 30, 20, 10, 5, 4, 3, 2, 1];

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
  const contratos = await buscarContratosProximosVencimento();

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

  const porResponsavel: Record<
    string,
    {
      nome: string;
      contratos: any[];
    }
  > = {};

  for (const contrato of contratos) {
    const email = String(contrato.EMAIL || "").trim();

    if (!email) continue;

    if (!porResponsavel[email]) {
      porResponsavel[email] = {
        nome: contrato.NM_FUNCIONARIO || "Colega",
        contratos: [],
      };
    }

    porResponsavel[email].contratos.push(contrato);
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

    await sendEmail(email, subject, html);

    enviados++;
  }

  return {
    enviados,
    destinatarios: Object.keys(porResponsavel).length,
    contratosComAviso: contratos.length,
  };
}