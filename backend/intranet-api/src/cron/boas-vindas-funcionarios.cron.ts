import cron from "node-cron";
import oracledb from "oracledb";

import { oracleExecute } from "../services/oracle.service";
import { sendEmail, validarHostAutorizadoParaEmail } from "../services/email.service";

function escapeHtml(value: any) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatarDataBrasil(value: any) {
  if (!value) return "-";

  const text = String(value).trim();
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (match) {
    return `${match[3]}/${match[2]}/${match[1]}`;
  }

  const date = new Date(text);

  if (Number.isNaN(date.getTime())) {
    return text;
  }

  return date.toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
  });
}

function infoTable(rows: Array<[string, any]>) {
  return `
    <table style="width:100%;border-collapse:collapse;margin-top:18px;">
      ${rows
        .map(
          ([label, value]) => `
            <tr>
              <td style="width:210px;padding:10px;border:1px solid #dbe5ef;background:#f8fafc;font-weight:700;">
                ${escapeHtml(label)}
              </td>
              <td style="padding:10px;border:1px solid #dbe5ef;">
                ${escapeHtml(value || "-")}
              </td>
            </tr>
          `
        )
        .join("")}
    </table>
  `;
}

function montarEmailBoasVindas(funcionario: any) {
  return `
    <div style="margin:0;padding:24px;background:#f4f7fb;font-family:Arial,sans-serif;color:#10233f;">
      <div style="max-width:760px;margin:0 auto;background:#ffffff;border:1px solid #dbe5ef;border-radius:16px;overflow:hidden;">
        <div style="background:#64b51f;color:#ffffff;padding:20px 24px;">
          <h2 style="margin:0;font-size:21px;line-height:1.3;">Boas-vindas ao Sicoob Cressem</h2>
        </div>

        <div style="padding:24px;font-size:14px;line-height:1.6;">
          <p style="margin-top:0;">Olá, <strong>${escapeHtml(funcionario.NM_FUNCIONARIO)}</strong>!</p>

          <p>
            Seja bem-vindo(a) ao <strong>Sicoob Cressem</strong>. Estamos felizes em ter você com a gente
            e desejamos uma ótima jornada nesta nova etapa.
          </p>

          <p>
            Abaixo estão os principais dados do seu cadastro para conferência:
          </p>

          ${infoTable([
            ["Nome", funcionario.NM_FUNCIONARIO],
            ["Data de admissão", formatarDataBrasil(funcionario.DT_ADMISSAO)],
            ["Cargo", funcionario.NM_CARGO],
            ["Setor", funcionario.NM_SETOR],
            ["Gerência", funcionario.NM_GERENCIA],
          ])}

          <p style="margin-top:20px;">
            Qualquer dúvida, procure o RH ou sua liderança direta.
          </p>

          <p style="margin-bottom:0;">Equipe RH</p>

          <p style="margin:22px 0 0;color:#526783;font-size:12px;">
            Este e-mail foi enviado automaticamente pela intranet.
          </p>
        </div>
      </div>
    </div>
  `;
}

export async function enviarBoasVindasFuncionariosAdmitidosHoje() {
  validarHostAutorizadoParaEmail();

  const result = await oracleExecute(
    `
      SELECT
        f.ID_FUNCIONARIO,
        f.NM_FUNCIONARIO,
        f.EMAIL,
        TO_CHAR(f.DT_ADMISSAO, 'YYYY-MM-DD') AS DT_ADMISSAO,
        s.NM_SETOR,
        c.NM_CARGO,
        ger.NM_FUNCIONARIO AS NM_GERENCIA
      FROM DBACRESSEM.FUNCIONARIOS_SICOOB_CRESSEM f
      LEFT JOIN DBACRESSEM.SETOR_SICOOB_CRESSEM s
        ON s.ID_SETOR = f.ID_SETOR
      LEFT JOIN DBACRESSEM.CARGO_GERENTES_SICOOB_CRESSEM c
        ON c.ID_CARGO = f.ID_CARGO
      LEFT JOIN DBACRESSEM.FUNCIONARIOS_SICOOB_CRESSEM ger
        ON ger.ID_FUNCIONARIO = f.CD_GERENCIA
      WHERE f.SN_ATIVO = 1
        AND f.EMAIL IS NOT NULL
        AND TRUNC(f.DT_ADMISSAO) = TRUNC(SYSDATE)
      ORDER BY UPPER(f.NM_FUNCIONARIO)
    `,
    {},
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  const funcionarios = (result.rows || []) as any[];

  for (const funcionario of funcionarios) {
    const email = String(funcionario.EMAIL || "").trim();

    if (!email) {
      continue;
    }

    await sendEmail(
      email,
      "Boas-vindas ao Sicoob Cressem",
      montarEmailBoasVindas(funcionario)
    );
  }

  return {
    total: funcionarios.length,
  };
}

cron.schedule(
  "0 9 * * *",
  async () => {
    try {
      console.log("[CRON BOAS-VINDAS FUNCIONÁRIOS] Enviando admissões do dia...");

      const result = await enviarBoasVindasFuncionariosAdmitidosHoje();

      console.log("[CRON BOAS-VINDAS FUNCIONÁRIOS] Resultado:", result);
    } catch (err) {
      console.error("[CRON BOAS-VINDAS FUNCIONÁRIOS] Erro:", err);
    }
  },
  {
    timezone: "America/Sao_Paulo",
  }
);
