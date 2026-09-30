import oracledb from "oracledb";
import { oracleExecute } from "./oracle.service";
import { sendEmail } from "./email.service";

const DESTINATARIO_PADRAO = "marcelo.bueno@sicoob.com.br";

export type AlertaIdade = {
  ID_BENEFICIARIO: number;
  NOME_BENEFICIARIO: string;
  CPF_BENEFICIARIO: string;
  DATA_NASCIMENTO: string;
  NOME_TITULAR: string;
  CPF_TITULAR: string;
  MATRICULA_TITULAR: string | null;
  EMPRESA: string | null;
  OPERADORA: string;
  NM_PLANO: string;
  VL_MENSALIDADE: number | null;
  IDADE_ALVO: 18 | 24;
  DATA_ANIVERSARIO: string;
  ALERTA_BENEFICIARIO: string;
  MES_AVISO: string;
  MES_ANIVERSARIO: string;
};

// A comparação é feita pelo mês do aniversário, não pela idade no dia do cron.
// Assim, nenhum dependente que complete 18/24 anos no mês seguinte fica de fora.
const SQL_ALERTAS_IDADE = `
  WITH PARAMETROS AS (
    SELECT REFERENCIA,
           TRUNC(REFERENCIA, 'MM') AS MES_AVISO,
           ADD_MONTHS(TRUNC(REFERENCIA, 'MM'), 1) AS MES_ANIVERSARIO
      FROM (SELECT TO_DATE(:referencia, 'YYYY-MM-DD') AS REFERENCIA FROM DUAL)
  ), BASE AS (
    SELECT B.ID_BENEFICIARIO,
           B.NM_BENEFICIARIO AS NOME_BENEFICIARIO,
           LPAD(REGEXP_REPLACE(B.NR_CPF, '[^0-9]', ''), 11, '0') AS CPF_BENEFICIARIO,
           B.DT_NASCIMENTO,
           NVL(T.NM_BENEFICIARIO, B.NM_BENEFICIARIO) AS NOME_TITULAR,
           LPAD(REGEXP_REPLACE(NVL(T.NR_CPF, B.NR_CPF), '[^0-9]', ''), 11, '0') AS CPF_TITULAR,
           NVL(T.NR_MATRICULA, B.NR_MATRICULA) AS MATRICULA_TITULAR,
           E.NM_EMPRESA AS EMPRESA,
           O.NM_OPERADORA AS OPERADORA,
           P.NM_PLANO,
           PV.VL_MENSALIDADE,
           R.MES_AVISO,
           R.MES_ANIVERSARIO,
           CASE
             WHEN TRUNC(ADD_MONTHS(B.DT_NASCIMENTO, 216), 'MM') = R.MES_ANIVERSARIO THEN 18
             ELSE 24
           END AS IDADE_ALVO,
           ROW_NUMBER() OVER (
             PARTITION BY B.ID_BENEFICIARIO
             ORDER BY PV.DT_VIGENCIA_INICIO DESC, PV.ID_PLANO_VALOR DESC,
                      H.DT_INICIO DESC NULLS LAST
           ) AS NR_LINHA
      FROM DBACRESSEM.ODONTO_BENEFICIARIO B
      CROSS JOIN PARAMETROS R
      INNER JOIN DBACRESSEM.ODONTO_TIPO_BENEFICIARIO TB
        ON TB.ID_TIPO_BENEFICIARIO = B.ID_TIPO_BENEFICIARIO
      INNER JOIN DBACRESSEM.ODONTO_PLANO P ON P.ID_PLANO = B.ID_PLANO
      INNER JOIN DBACRESSEM.ODONTO_OPERADORA O ON O.ID_OPERADORA = P.ID_OPERADORA
      LEFT JOIN DBACRESSEM.ODONTO_BENEFICIARIO T ON T.ID_BENEFICIARIO = B.ID_TITULAR
      LEFT JOIN DBACRESSEM.ODONTO_BENEF_EMPRESA_HIST H
        ON H.ID_BENEFICIARIO = NVL(B.ID_TITULAR, B.ID_BENEFICIARIO)
       AND TRUNC(H.DT_INICIO) <= R.REFERENCIA
       AND (H.DT_FIM IS NULL OR TRUNC(H.DT_FIM) > R.REFERENCIA)
      LEFT JOIN DBACRESSEM.ODONTO_EMPRESA E
        ON E.ID_EMPRESA = NVL(H.ID_EMPRESA, NVL(T.ID_EMPRESA, B.ID_EMPRESA))
      LEFT JOIN DBACRESSEM.ODONTO_PLANO_VALOR PV
        ON PV.ID_PLANO = P.ID_PLANO
       AND PV.SN_ATIVO = 1
       AND TRUNC(PV.DT_VIGENCIA_INICIO) <= R.REFERENCIA
       AND (PV.DT_VIGENCIA_FIM IS NULL OR TRUNC(PV.DT_VIGENCIA_FIM) >= R.REFERENCIA)
     WHERE B.SN_ATIVO = 1
       AND TB.CD_TIPO_BENEFICIARIO = 'DEPENDENTE'
       AND P.CD_CLIENTE_CONVENIADO = 9045
       AND B.DT_NASCIMENTO IS NOT NULL
       AND TRUNC(B.DT_INCLUSAO_PLANO) <= R.REFERENCIA
       AND (B.DT_EXCLUSAO_PLANO IS NULL OR TRUNC(B.DT_EXCLUSAO_PLANO) > R.REFERENCIA)
       AND (
         TRUNC(ADD_MONTHS(B.DT_NASCIMENTO, 216), 'MM') = R.MES_ANIVERSARIO
         OR TRUNC(ADD_MONTHS(B.DT_NASCIMENTO, 288), 'MM') = R.MES_ANIVERSARIO
       )
  )
  SELECT ID_BENEFICIARIO, NOME_BENEFICIARIO, CPF_BENEFICIARIO,
         TO_CHAR(DT_NASCIMENTO, 'DD/MM/YYYY') AS DATA_NASCIMENTO,
         NOME_TITULAR, CPF_TITULAR, MATRICULA_TITULAR, EMPRESA,
         OPERADORA, NM_PLANO, VL_MENSALIDADE, IDADE_ALVO,
         TO_CHAR(ADD_MONTHS(DT_NASCIMENTO, IDADE_ALVO * 12), 'DD/MM/YYYY') AS DATA_ANIVERSARIO,
         CASE
           WHEN IDADE_ALVO = 18 THEN
             'VERIFICAR SE CURSA FACULDADE. SE NÃO CURSAR, ALTERAR PARA O PLANO AGREGADO AOS 18 ANOS; SE CURSAR, PODE PERMANECER COMO DEPENDENTE ATÉ OS 24 ANOS.'
           ELSE 'PROVIDENCIAR A ALTERAÇÃO PARA O PLANO AGREGADO AO COMPLETAR 24 ANOS.'
         END AS ALERTA_BENEFICIARIO,
         TO_CHAR(MES_AVISO, 'MM/YYYY') AS MES_AVISO,
         TO_CHAR(MES_ANIVERSARIO, 'MM/YYYY') AS MES_ANIVERSARIO
    FROM BASE
   WHERE NR_LINHA = 1
   ORDER BY EMPRESA, OPERADORA, NOME_TITULAR, NOME_BENEFICIARIO
`;

function escaparHtml(valor: unknown) {
  return String(valor ?? "").replace(/[&<>"']/g, (caractere) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[caractere] || caractere));
}

function formatarCpf(cpf: string) {
  const digitos = String(cpf || "").replace(/\D/g, "");
  return digitos.length === 11
    ? `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6, 9)}-${digitos.slice(9)}`
    : cpf || "-";
}

function formatarValor(valor: number | null) {
  return valor == null ? "-" : Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function montarEmail(alertas: AlertaIdade[]) {
  const mesAviso = escaparHtml(alertas[0].MES_AVISO);
  const mesAniversario = escaparHtml(alertas[0].MES_ANIVERSARIO);
  const tem18Anos = alertas.some((item) => Number(item.IDADE_ALVO) === 18);
  const tem24Anos = alertas.some((item) => Number(item.IDADE_ALVO) === 24);
  const idadesNoEmail = tem18Anos && tem24Anos ? "18 ou 24 anos" : tem18Anos ? "18 anos" : "24 anos";
  const orientacoes = [
    tem18Anos ? "Aos 18 anos, verifique se cursam faculdade para definir a permanência como dependentes ou a mudança para agregado." : "",
    tem24Anos ? "Aos 24 anos, providencie a alteração do plano." : "",
  ].filter(Boolean).join(" ");
  const linhas = alertas.map((item) => `<tr>
    <td style="padding:10px;border-bottom:1px solid #E2E8F0;vertical-align:top;"><strong>${escaparHtml(item.NOME_BENEFICIARIO)}</strong><br>CPF: ${escaparHtml(formatarCpf(item.CPF_BENEFICIARIO))}<br>Nascimento: ${escaparHtml(item.DATA_NASCIMENTO)}</td>
    <td style="padding:10px;border-bottom:1px solid #E2E8F0;vertical-align:top;">${escaparHtml(item.NOME_TITULAR)}<br>CPF: ${escaparHtml(formatarCpf(item.CPF_TITULAR))}<br>Matrícula: ${escaparHtml(item.MATRICULA_TITULAR || "-")}</td>
    <td style="padding:10px;border-bottom:1px solid #E2E8F0;vertical-align:top;">${escaparHtml(item.EMPRESA || "-")}</td>
    <td style="padding:10px;border-bottom:1px solid #E2E8F0;vertical-align:top;">${escaparHtml(item.OPERADORA)}<br>${escaparHtml(item.NM_PLANO)}<br>${escaparHtml(formatarValor(item.VL_MENSALIDADE))}</td>
    <td style="padding:10px;border-bottom:1px solid #E2E8F0;vertical-align:top;"><strong>${item.IDADE_ALVO} anos em ${escaparHtml(item.DATA_ANIVERSARIO)}</strong><br>${escaparHtml(item.ALERTA_BENEFICIARIO)}</td>
  </tr>`).join("");

  return `<!doctype html><html><body style="margin:0;padding:24px;background:#F6FBFA;font-family:Arial,Helvetica,sans-serif;color:#0F172A;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center"><table role="presentation" width="760" cellspacing="0" cellpadding="0" style="width:100%;max-width:760px;background:#FFFFFF;border:1px solid #E2E8F0;border-radius:18px;overflow:hidden;"><tr><td style="padding:22px 26px;background:#00AE9D;color:#FFFFFF;"><div style="font-size:11px;font-weight:bold;letter-spacing:1px;">INTRANET CRESSEM</div><div style="margin-top:5px;font-size:19px;font-weight:bold;">Alerta de idade do convênio odontológico</div><div style="margin-top:5px;font-size:12px;">Aviso de ${mesAviso} · aniversários em ${mesAniversario}</div></td></tr><tr><td style="padding:22px 26px;font-size:13px;line-height:20px;"><p style="margin:0 0 14px;">Os dependentes abaixo, vinculados ao plano antigo 9045, completarão ${idadesNoEmail} no próximo mês. ${orientacoes} Este aviso não altera benefícios automaticamente.</p><p style="margin:0 0 16px;"><strong>Total de dependentes:</strong> ${alertas.length}</p><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;font-size:11px;"><tr style="background:#F6FBFA;"><th align="left" style="padding:9px;">Dependente</th><th align="left" style="padding:9px;">Titular</th><th align="left" style="padding:9px;">Empresa</th><th align="left" style="padding:9px;">Convênio</th><th align="left" style="padding:9px;">Providência</th></tr>${linhas}</table></td></tr><tr><td style="padding:0 26px 22px;color:#64748B;font-size:11px;">Mensagem automática da Intranet Cressem.</td></tr></table></td></tr></table></body></html>`;
}

export function modoTesteAlertaIdadeAtivo() {
  return ["1", "true", "sim", "yes"].includes(String(process.env.EMAIL_MODO_TESTE || "").trim().toLowerCase());
}

export function validarReferenciaAlertaIdade(referencia?: string) {
  if (referencia === undefined) {
    const partes = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
    const parte = (tipo: string) => partes.find((item) => item.type === tipo)?.value;
    return `${parte("year")}-${parte("month")}-${parte("day")}`;
  }
  const data = /^\d{4}-\d{2}-\d{2}$/.test(referencia) ? new Date(`${referencia}T00:00:00Z`) : null;
  if (!data || !Number.isFinite(data.getTime()) || data.toISOString().slice(0, 10) !== referencia || Number(referencia.slice(0, 4)) < 1900) {
    throw new Error("Informe uma data de referência válida no formato AAAA-MM-DD.");
  }
  return referencia;
}

type FiltrosAlertaIdade = { referencia?: string; idade?: 18 | 24 };

export async function consultarAlertasIdadeConvenioOdontologico(filtros: FiltrosAlertaIdade = {}) {
  const referencia = validarReferenciaAlertaIdade(filtros.referencia);
  const resultado = await oracleExecute<AlertaIdade>(SQL_ALERTAS_IDADE, { referencia }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
  const alertas = ((resultado.rows || []) as AlertaIdade[]).filter((item) => !filtros.idade || Number(item.IDADE_ALVO) === filtros.idade);
  const [ano, mes] = referencia.split("-").map(Number);
  const proximoMes = new Date(Date.UTC(ano, mes, 1));
  return {
    referencia,
    mesAviso: `${String(mes).padStart(2, "0")}/${ano}`,
    mesAniversario: `${String(proximoMes.getUTCMonth() + 1).padStart(2, "0")}/${proximoMes.getUTCFullYear()}`,
    alertas,
  };
}

export async function enviarAlertaMensalIdadeConvenioOdontologico(opcoes: FiltrosAlertaIdade & { teste?: boolean } = {}) {
  if (opcoes.teste && !modoTesteAlertaIdadeAtivo()) throw new Error("O envio de teste exige EMAIL_MODO_TESTE=true.");
  const consulta = await consultarAlertasIdadeConvenioOdontologico(opcoes);
  const { alertas, ...periodo } = consulta;
  const destinatario = modoTesteAlertaIdadeAtivo()
    ? String(process.env.EMAIL_DESTINO_TESTE || DESTINATARIO_PADRAO).trim()
    : String(process.env.EMAIL_CONVENIO_ODONTOLOGICO_ALERTA_IDADE || DESTINATARIO_PADRAO).trim();
  if (!alertas.length) return { enviado: false, enviados: 0, destinatario, ...periodo };

  if (!destinatario) throw new Error("Destinatário do alerta de idade odontológico não configurado.");

  await sendEmail(
    destinatario,
    `SICOOB CRESSEM - Alerta de idade do convênio odontológico — ${alertas[0].MES_AVISO}`,
    montarEmail(alertas)
  );
  return { enviado: true, enviados: alertas.length, destinatario, ...periodo };
}
