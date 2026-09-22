import oracledb from "oracledb";
import { getOraclePool } from "../config/oracle.pool";
import { sendEmail } from "./email.service";

const DESTINATARIO_PADRAO = "marcelo.bueno@sicoob.com.br";
const TIMEZONE = "America/Sao_Paulo";

type BeneficiarioFolha = {
  ID_BENEFICIARIO: number;
  ID_TITULAR: number;
  NM_TITULAR: string;
  NR_CPF_TITULAR: string;
  NR_MATRICULA_TITULAR: string | null;
  ID_EMPRESA: number | null;
  NM_EMPRESA: string | null;
  NR_CNPJ_EMPRESA: string | null;
  ID_OPERADORA: number;
  NM_OPERADORA: string;
  SN_OPERADORA_ATIVA: number;
  ID_PLANO: number;
  NM_PLANO: string;
  TP_COBRANCA: "POR_PESSOA" | "POR_PLANO";
  SN_PLANO_ATIVO: number;
  ID_PLANO_VALOR: number | null;
  VL_MENSALIDADE: number | null;
};

export type LinhaFolha = {
  idTitular: number;
  cpfTitular: string;
  nomeTitular: string;
  matricula: string | null;
  idEmpresa: number;
  empresa: string;
  cnpjEmpresa: string | null;
  idOperadora: number;
  operadora: string;
  planos: string[];
  beneficiarios: number;
  total: number;
};

export type ArquivoFolha = {
  idEmpresa: number;
  empresa: string;
  competencia: string;
  nomeArquivo: string;
  linhas: LinhaFolha[];
  total: number;
  csvBase64: string;
};

type ResultadoFolha = {
  competencia: string;
  referencia: string;
  enviado: boolean;
  destinatario: string;
  empresas: Array<{ empresa: string; titulares: number; total: number; arquivo?: string }>;
  totalGeral: number;
  ignoradas: string[];
  pendenciasCadastro?: number;
  alertaPendenciasEnviado?: boolean;
};

type PendenciaCadastroFolha = {
  idTitular: number;
  cpfTitular: string;
  nomeTitular: string;
  matricula: string | null;
  empresa: string | null;
  operadora: string;
  planos: string[];
  motivo: string;
};

function dataNoFuso(data = new Date()) {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(data);
  const get = (type: string) => partes.find((parte) => parte.type === type)?.value || "";
  return { ano: Number(get("year")), mes: Number(get("month")), dia: Number(get("day")) };
}

function dataPascoa(ano: number) {
  const a = ano % 19; const b = Math.floor(ano / 100); const c = ano % 100;
  const d = Math.floor(b / 4); const e = b % 4; const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3); const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4); const k = c % 4; const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451); const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(ano, mes - 1, dia));
}

function feriadosNacionais(ano: number) {
  const feriados = new Set([`${ano}-01-01`, `${ano}-04-21`, `${ano}-05-01`, `${ano}-09-07`, `${ano}-10-12`, `${ano}-11-02`, `${ano}-11-15`, `${ano}-11-20`, `${ano}-12-25`]);
  const sextaPaixao = dataPascoa(ano);
  sextaPaixao.setUTCDate(sextaPaixao.getUTCDate() - 2);
  feriados.add(sextaPaixao.toISOString().slice(0, 10));
  return feriados;
}

function competenciaAtual(data = new Date()) {
  const { ano, mes } = dataNoFuso(data);
  return `${ano}-${String(mes).padStart(2, "0")}`;
}

function referenciaAtual(data = new Date()) {
  const { ano, mes, dia } = dataNoFuso(data);
  return `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

export function competenciaAnterior(data = new Date()) {
  const { ano, mes } = dataNoFuso(data);
  const mesAnterior = mes === 1 ? 12 : mes - 1;
  return `${mes === 1 ? ano - 1 : ano}-${String(mesAnterior).padStart(2, "0")}`;
}

function ultimoDiaCompetencia(competencia: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(competencia);
  if (!match) throw new Error("Competência inválida. Use o formato AAAA-MM.");
  const ano = Number(match[1]);
  const mes = Number(match[2]);
  if (mes < 1 || mes > 12) throw new Error("Competência inválida. Use o formato AAAA-MM.");
  return `${ano}-${String(mes).padStart(2, "0")}-${String(new Date(Date.UTC(ano, mes, 0)).getUTCDate()).padStart(2, "0")}`;
}

function competenciaExibicao(competencia: string) {
  const [ano, mes] = competencia.split("-");
  return `${mes}/${ano}`;
}

function moeda(valor: number) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function valorCsvBanco(valor: number) {
  return Number(valor || 0).toFixed(2);
}

function csvCampo(valor: unknown) {
  const texto = String(valor ?? "");
  return /[;"\r\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

function nomeArquivo(empresa: string, competencia: string) {
  const empresaNormalizada = empresa
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase() || "EMPRESA";
  return `folha_convenio_odontologico_${empresaNormalizada}_${competencia.replace("-", "_")}.csv`;
}

function nomeArquivoPendencias(competencia: string) {
  return `pendencias_cadastro_folha_convenio_odontologico_${competencia.replace("-", "_")}.csv`;
}

function montarCsvPendencias(competencia: string, pendencias: PendenciaCadastroFolha[]) {
  const cabecalho = "COMPETENCIA;CPF_TITULAR;NOME_TITULAR;MATRICULA;EMPRESA;OPERADORA;PLANOS;MOTIVO";
  const corpo = pendencias.map((pendencia) => [
    competencia,
    pendencia.cpfTitular.replace(/\D/g, ""),
    pendencia.nomeTitular,
    pendencia.matricula || "",
    pendencia.empresa || "",
    pendencia.operadora,
    pendencia.planos.join(" | "),
    pendencia.motivo,
  ].map(csvCampo).join(";"));
  return Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from([cabecalho, ...corpo].join("\r\n"), "utf8")]);
}

function montarEmailPendencias(competencia: string, pendencias: PendenciaCadastroFolha[]) {
  const linhas = pendencias.map((pendencia) => `<tr><td style="padding:10px;border-bottom:1px solid #E2E8F0;">${escaparHtml(pendencia.nomeTitular)}</td><td style="padding:10px;border-bottom:1px solid #E2E8F0;">${escaparHtml(pendencia.cpfTitular)}</td><td style="padding:10px;border-bottom:1px solid #E2E8F0;color:#B45309;font-weight:700;">${escaparHtml(pendencia.motivo)}</td></tr>`).join("");
  const competenciaFormatada = competenciaExibicao(competencia);
  return `<!doctype html><html><body style="margin:0;padding:24px;background:#F6FBFA;font-family:Arial,Helvetica,sans-serif;color:#1F2937;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center"><table role="presentation" width="760" cellspacing="0" cellpadding="0" style="width:100%;max-width:760px;background:#fff;border:1px solid #E2E8F0;border-radius:18px;overflow:hidden;"><tr><td style="padding:24px 30px;background:#00AE9D;color:#fff;"><div style="font-size:11px;font-weight:bold;letter-spacing:1px;">INTRANET CRESSEM</div><div style="margin-top:5px;font-size:21px;font-weight:bold;">Pendências de cadastro da folha odontológica</div><div style="margin-top:6px;font-size:13px;">Competência ${competenciaFormatada}</div></td></tr><tr><td style="padding:26px 30px;"><p style="margin:0 0 18px;font-size:14px;line-height:20px;">Existem beneficiários elegíveis para cobrança, mas sem matrícula e/ou empresa. Eles foram retirados dos CSVs de desconto e estão relacionados no anexo para correção.</p><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;border:1px solid #E2E8F0;"><tr style="background:#F6FBFA;"><th align="left" style="padding:10px;color:#334155;font-size:12px;">Titular</th><th align="left" style="padding:10px;color:#334155;font-size:12px;">CPF</th><th align="left" style="padding:10px;color:#334155;font-size:12px;">Pendência</th></tr>${linhas}</table></td></tr><tr><td style="padding:0 30px 22px;color:#64748B;font-size:11px;">Mensagem automática da Intranet Cressem.</td></tr></table></td></tr></table></body></html>`;
}

export function montarCsvFolha(competencia: string, linhas: LinhaFolha[]) {
  const cabecalho = "COMPETENCIA;CPF_TITULAR;NOME_TITULAR;MATRICULA;EMPRESA;CNPJ_EMPRESA;OPERADORA;PLANOS;TOTAL_DESCONTO";
  const corpo = linhas.map((linha) => [
    competencia,
    linha.cpfTitular.replace(/\D/g, ""),
    linha.nomeTitular,
    linha.matricula || "",
    linha.empresa,
    (linha.cnpjEmpresa || "").replace(/\D/g, ""),
    linha.operadora,
    linha.planos.join(" | "),
    valorCsvBanco(linha.total),
  ].map(csvCampo).join(";"));
  return Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from([cabecalho, ...corpo].join("\r\n"), "utf8")]);
}

export function montarEmailFolha(competencia: string, arquivos: ArquivoFolha[]) {
  const linhas = arquivos.map((arquivo) => `
    <tr>
      <td style="padding:12px;border-bottom:1px solid #E2E8F0;color:#007C72;font-weight:700;">${escaparHtml(arquivo.empresa)}</td>
      <td align="center" style="padding:12px;border-bottom:1px solid #E2E8F0;color:#1F2937;">${arquivo.linhas.length}</td>
      <td align="right" style="padding:12px;border-bottom:1px solid #E2E8F0;color:#007C72;font-weight:700;">R$ ${moeda(arquivo.total)}</td>
    </tr>`).join("");
  const total = arquivos.reduce((soma, arquivo) => soma + arquivo.total, 0);
  const competenciaFormatada = competenciaExibicao(competencia);
  return `<!doctype html><html><body style="margin:0;padding:24px;background:#F6FBFA;font-family:Arial,Helvetica,sans-serif;color:#1F2937;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td align="center">
      <table role="presentation" width="760" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:760px;background:#FFFFFF;border:1px solid #E2E8F0;border-radius:18px;overflow:hidden;">
        <tr><td style="padding:28px 32px;background:#00AE9D;color:#FFFFFF;">
          <div style="font-size:12px;font-weight:700;letter-spacing:1.2px;">INTRANET CRESSEM</div>
          <div style="margin-top:10px;font-size:24px;font-weight:700;">Folha do convênio odontológico</div>
          <div style="margin-top:8px;font-size:14px;">Competência ${competenciaFormatada}</div>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 24px;font-size:15px;line-height:1.5;">Seguem anexos os arquivos CSV para processamento dos descontos do convênio odontológico, separados por empresa.</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid #E2E8F0;border-collapse:collapse;border-radius:10px;overflow:hidden;">
            <tr style="background:#F6FBFA;"><th align="left" style="padding:12px;color:#334155;font-size:13px;">Empresa</th><th style="padding:12px;color:#334155;font-size:13px;">Titulares</th><th align="right" style="padding:12px;color:#334155;font-size:13px;">Total</th></tr>
            ${linhas}
            <tr style="background:#ECFDF5;"><td colspan="2" style="padding:14px;font-weight:700;color:#006B5F;border-top:1px solid #00AE9D;">Total para desconto</td><td align="right" style="padding:14px;font-weight:700;color:#006B5F;border-top:1px solid #00AE9D;">R$ ${moeda(total)}</td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid #E2E8F0;color:#64748B;font-size:12px;line-height:1.5;">Este e-mail foi enviado automaticamente pela Intranet Cressem após a conclusão do prazo de movimentações do Cadastro.</td></tr>
      </table>
    </td></tr></table>
  </body></html>`;
}

function escaparHtml(valor: string) {
  return String(valor).replace(/[&<>"']/g, (caractere) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[caractere] || caractere));
}

async function carregarBeneficiarios(referencia: string) {
  const conn = await getOraclePool().getConnection();
  try {
    const result = await conn.execute<BeneficiarioFolha>(`
      SELECT B.ID_BENEFICIARIO, NVL(B.ID_TITULAR, B.ID_BENEFICIARIO) AS ID_TITULAR,
             NVL(T.NM_BENEFICIARIO, B.NM_BENEFICIARIO) AS NM_TITULAR,
             NVL(T.NR_CPF, B.NR_CPF) AS NR_CPF_TITULAR,
             NVL(T.NR_MATRICULA, B.NR_MATRICULA) AS NR_MATRICULA_TITULAR,
             E.ID_EMPRESA, E.NM_EMPRESA, E.NR_CNPJ AS NR_CNPJ_EMPRESA,
             O.ID_OPERADORA, O.NM_OPERADORA, O.SN_ATIVO AS SN_OPERADORA_ATIVA,
             P.ID_PLANO, P.NM_PLANO, P.TP_COBRANCA, P.SN_ATIVO AS SN_PLANO_ATIVO,
             PV.ID_PLANO_VALOR, PV.VL_MENSALIDADE
      FROM DBACRESSEM.ODONTO_BENEFICIARIO B
      INNER JOIN DBACRESSEM.ODONTO_TIPO_BENEFICIARIO TB ON TB.ID_TIPO_BENEFICIARIO = B.ID_TIPO_BENEFICIARIO
      INNER JOIN DBACRESSEM.ODONTO_PLANO P ON P.ID_PLANO = B.ID_PLANO
      INNER JOIN DBACRESSEM.ODONTO_OPERADORA O ON O.ID_OPERADORA = P.ID_OPERADORA
      LEFT JOIN DBACRESSEM.ODONTO_BENEFICIARIO T ON T.ID_BENEFICIARIO = B.ID_TITULAR
      LEFT JOIN DBACRESSEM.ODONTO_BENEF_EMPRESA_HIST H ON H.ID_BENEFICIARIO = NVL(B.ID_TITULAR, B.ID_BENEFICIARIO)
        AND TRUNC(H.DT_INICIO) <= TO_DATE(:referencia, 'YYYY-MM-DD')
        AND (H.DT_FIM IS NULL OR TRUNC(H.DT_FIM) > TO_DATE(:referencia, 'YYYY-MM-DD'))
      LEFT JOIN DBACRESSEM.ODONTO_EMPRESA E ON E.ID_EMPRESA = NVL(H.ID_EMPRESA, NVL(T.ID_EMPRESA, B.ID_EMPRESA))
      LEFT JOIN DBACRESSEM.ODONTO_PLANO_VALOR PV ON PV.ID_PLANO = P.ID_PLANO
        AND PV.SN_ATIVO = 1
        AND TRUNC(PV.DT_VIGENCIA_INICIO) <= TO_DATE(:referencia, 'YYYY-MM-DD')
        AND (PV.DT_VIGENCIA_FIM IS NULL OR TRUNC(PV.DT_VIGENCIA_FIM) >= TO_DATE(:referencia, 'YYYY-MM-DD'))
      WHERE TB.CD_TIPO_BENEFICIARIO IN ('TITULAR', 'DEPENDENTE')
        AND TRUNC(B.DT_INCLUSAO_PLANO) <= TO_DATE(:referencia, 'YYYY-MM-DD')
        AND (B.DT_EXCLUSAO_PLANO IS NULL OR TRUNC(B.DT_EXCLUSAO_PLANO) > TO_DATE(:referencia, 'YYYY-MM-DD'))
      ORDER BY E.NM_EMPRESA, O.NM_OPERADORA, NVL(T.NM_BENEFICIARIO, B.NM_BENEFICIARIO), P.NM_PLANO`, { referencia }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    return (result.rows || []) as BeneficiarioFolha[];
  } finally { await conn.close(); }
}

function identificarPendenciasCadastro(beneficiarios: BeneficiarioFolha[]) {
  const porTitular = new Map<number, BeneficiarioFolha[]>();
  for (const beneficiario of beneficiarios) {
    const titulares = porTitular.get(Number(beneficiario.ID_TITULAR)) || [];
    titulares.push(beneficiario);
    porTitular.set(Number(beneficiario.ID_TITULAR), titulares);
  }

  const pendencias: PendenciaCadastroFolha[] = [];
  for (const itens of porTitular.values()) {
    const titular = itens[0];
    const semMatricula = !String(titular.NR_MATRICULA_TITULAR || "").trim();
    const semEmpresa = !Number(titular.ID_EMPRESA) || !String(titular.NM_EMPRESA || "").trim();
    if (!semMatricula && !semEmpresa) continue;
    pendencias.push({
      idTitular: Number(titular.ID_TITULAR),
      cpfTitular: titular.NR_CPF_TITULAR,
      nomeTitular: titular.NM_TITULAR,
      matricula: titular.NR_MATRICULA_TITULAR,
      empresa: titular.NM_EMPRESA,
      operadora: titular.NM_OPERADORA,
      planos: Array.from(new Set(itens.map((item) => item.NM_PLANO))).sort(),
      motivo: [semMatricula ? "Sem matrícula" : "", semEmpresa ? "Sem empresa" : ""].filter(Boolean).join(" e "),
    });
  }
  return pendencias.sort((a, b) => a.nomeTitular.localeCompare(b.nomeTitular));
}

async function enviarRelatorioPendenciasCadastro(competencia: string, pendencias: PendenciaCadastroFolha[]) {
  if (!pendencias.length) return false;
  const destinatario = String(process.env.EMAIL_CONVENIO_ODONTOLOGICO_FOLHA_PENDENCIAS || DESTINATARIO_PADRAO).trim();
  const csv = montarCsvPendencias(competencia, pendencias);
  await sendEmail(
    destinatario,
    `SICOOB CRESSEM - Pendências de cadastro da folha odontológica — competência ${competenciaExibicao(competencia)}`,
    montarEmailPendencias(competencia, pendencias),
    [{ name: nomeArquivoPendencias(competencia), contentBytes: csv.toString("base64"), contentType: "text/csv; charset=utf-8" }]
  );
  return true;
}

function validarEConsolidar(beneficiarios: BeneficiarioFolha[]) {
  const erros: string[] = [];
  const porBeneficiario = new Map<number, BeneficiarioFolha[]>();
  for (const item of beneficiarios) {
    const grupo = porBeneficiario.get(Number(item.ID_BENEFICIARIO)) || [];
    grupo.push(item);
    porBeneficiario.set(Number(item.ID_BENEFICIARIO), grupo);
  }
  for (const itens of porBeneficiario.values()) {
    const item = itens[0];
    const identificacao = `${item.NM_TITULAR} (${item.NM_EMPRESA} / ${item.NM_PLANO})`;
    if (Number(item.SN_PLANO_ATIVO) !== 1) erros.push(`Plano inativo para ${identificacao}.`);
    if (Number(item.SN_OPERADORA_ATIVA) !== 1) erros.push(`Operadora inativa para ${identificacao}.`);
    if (!Number(item.ID_EMPRESA) || !String(item.NM_EMPRESA || "").trim()) erros.push(`Empresa ausente para ${identificacao}.`);
    if (item.TP_COBRANCA !== "POR_PESSOA" && item.TP_COBRANCA !== "POR_PLANO") erros.push(`Tipo de cobrança inválido para ${identificacao}.`);
    if (itens.length !== 1 || !item.ID_PLANO_VALOR || Number(item.VL_MENSALIDADE) <= 0) erros.push(`Valor vigente inválido ou ausente para ${identificacao}.`);
  }
  if (erros.length) throw new Error(`Folha não enviada. Corrija os dados: ${Array.from(new Set(erros)).join(" ")}`);

  const linhas = new Map<string, LinhaFolha>();
  const cobrancasPorPlano = new Set<string>();
  for (const item of beneficiarios) {
    const chave = [item.ID_TITULAR, item.ID_EMPRESA, item.ID_OPERADORA].join(":");
    let linha = linhas.get(chave);
    if (!linha) {
      const idEmpresa = Number(item.ID_EMPRESA);
      const empresa = String(item.NM_EMPRESA || "").trim();
      linha = { idTitular: Number(item.ID_TITULAR), cpfTitular: item.NR_CPF_TITULAR, nomeTitular: item.NM_TITULAR,
        matricula: item.NR_MATRICULA_TITULAR, idEmpresa, empresa,
        cnpjEmpresa: item.NR_CNPJ_EMPRESA, idOperadora: Number(item.ID_OPERADORA), operadora: item.NM_OPERADORA, planos: [], beneficiarios: 0, total: 0 };
      linhas.set(chave, linha);
    }
    linha.beneficiarios += 1;
    if (!linha.planos.includes(item.NM_PLANO)) linha.planos.push(item.NM_PLANO);
    if (item.TP_COBRANCA === "POR_PLANO") {
      const chaveCobranca = `${chave}:${item.ID_PLANO}`;
      if (cobrancasPorPlano.has(chaveCobranca)) continue;
      cobrancasPorPlano.add(chaveCobranca);
    }
    linha.total += Number(item.VL_MENSALIDADE);
  }
  return Array.from(linhas.values()).sort((a, b) => a.empresa.localeCompare(b.empresa) || a.nomeTitular.localeCompare(b.nomeTitular));
}

function agruparArquivos(competencia: string, linhas: LinhaFolha[]) {
  const porEmpresa = new Map<number, LinhaFolha[]>();
  for (const linha of linhas) porEmpresa.set(linha.idEmpresa, [...(porEmpresa.get(linha.idEmpresa) || []), linha]);
  return Array.from(porEmpresa.values()).map((linhasEmpresa) => {
    const empresa = linhasEmpresa[0].empresa;
    const csv = montarCsvFolha(competencia, linhasEmpresa);
    return { idEmpresa: linhasEmpresa[0].idEmpresa, empresa, competencia, nomeArquivo: nomeArquivo(empresa, competencia), linhas: linhasEmpresa,
      total: linhasEmpresa.reduce((soma, linha) => soma + linha.total, 0), csvBase64: csv.toString("base64") };
  });
}

export async function gerarFotografiaFolhaEmpresa(idEmpresa: number, competencia: string, referencia: string) {
  const beneficiarios = (await carregarBeneficiarios(referencia)).filter((beneficiario) => Number(beneficiario.ID_EMPRESA) === Number(idEmpresa));
  const linhas = validarEConsolidar(beneficiarios);
  return agruparArquivos(competencia, linhas)[0] || null;
}

async function enviosComSucesso(competencia: string) {
  const conn = await getOraclePool().getConnection();
  try {
    const result = await conn.execute<any>(`SELECT ID_EMPRESA FROM DBACRESSEM.ODONTO_FOLHA_ENVIO WHERE CD_COMPETENCIA = :competencia AND ST_ENVIO = 'ENVIADO'`, { competencia }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    return new Set((result.rows || []).map((row: any) => Number(row.ID_EMPRESA)));
  } finally { await conn.close(); }
}

async function registrarTentativa(arquivos: ArquivoFolha[], competencia: string, referencia: string, destinatario: string) {
  const conn = await getOraclePool().getConnection();
  try {
    for (const arquivo of arquivos) await conn.execute(`MERGE INTO DBACRESSEM.ODONTO_FOLHA_ENVIO E
      USING (SELECT :competencia CD_COMPETENCIA, :idEmpresa ID_EMPRESA FROM DUAL) D
      ON (E.CD_COMPETENCIA = D.CD_COMPETENCIA AND E.ID_EMPRESA = D.ID_EMPRESA)
      WHEN MATCHED THEN UPDATE SET E.DS_DESTINATARIO = :destinatario, E.NM_ARQUIVO = :nomeArquivo, E.NR_REGISTROS = :titulares, E.VL_TOTAL = :total, E.ST_ENVIO = 'PROCESSANDO', E.NR_TENTATIVAS = E.NR_TENTATIVAS + 1, E.DS_ERRO = NULL
      WHEN NOT MATCHED THEN INSERT (CD_COMPETENCIA, DT_REFERENCIA, ID_EMPRESA, NM_EMPRESA, DS_DESTINATARIO, NM_ARQUIVO, NR_REGISTROS, VL_TOTAL, ST_ENVIO, NR_TENTATIVAS, DT_CRIACAO) VALUES (:competencia, TO_DATE(:referencia, 'YYYY-MM-DD'), :idEmpresa, :empresa, :destinatario, :nomeArquivo, :titulares, :total, 'PROCESSANDO', 1, SYSDATE)`,
      { competencia, referencia, idEmpresa: arquivo.idEmpresa, empresa: arquivo.empresa, destinatario, nomeArquivo: arquivo.nomeArquivo, titulares: arquivo.linhas.length, total: arquivo.total });
    await conn.commit();
  } catch (error) { await conn.rollback(); throw error; } finally { await conn.close(); }
}

async function registrarErroValidacao(beneficiarios: BeneficiarioFolha[], competencia: string, referencia: string, destinatario: string, erro: string) {
  const empresas = new Map<number, string>();
  for (const beneficiario of beneficiarios) {
    const idEmpresa = Number(beneficiario.ID_EMPRESA);
    const empresa = String(beneficiario.NM_EMPRESA || "").trim();
    if (idEmpresa && empresa) empresas.set(idEmpresa, empresa);
  }
  const conn = await getOraclePool().getConnection();
  try {
    for (const [idEmpresa, empresa] of empresas) await conn.execute(`MERGE INTO DBACRESSEM.ODONTO_FOLHA_ENVIO E
      USING (SELECT :competencia CD_COMPETENCIA, :idEmpresa ID_EMPRESA FROM DUAL) D
      ON (E.CD_COMPETENCIA = D.CD_COMPETENCIA AND E.ID_EMPRESA = D.ID_EMPRESA)
      WHEN MATCHED THEN UPDATE SET E.ST_ENVIO = 'FALHA', E.DS_ERRO = :erro, E.NR_TENTATIVAS = E.NR_TENTATIVAS + 1
        WHERE E.ST_ENVIO <> 'ENVIADO'
      WHEN NOT MATCHED THEN INSERT (CD_COMPETENCIA, DT_REFERENCIA, ID_EMPRESA, NM_EMPRESA, DS_DESTINATARIO, NM_ARQUIVO, NR_REGISTROS, VL_TOTAL, ST_ENVIO, NR_TENTATIVAS, DT_CRIACAO, DS_ERRO)
        VALUES (:competencia, TO_DATE(:referencia, 'YYYY-MM-DD'), :idEmpresa, :empresa, :destinatario, :nomeArquivo, 0, 0, 'FALHA', 1, SYSDATE, :erro)`,
      { competencia, referencia, idEmpresa, empresa, destinatario, nomeArquivo: nomeArquivo(empresa, competencia), erro: erro.slice(0, 2000) });
    await conn.commit();
  } catch (error) { await conn.rollback(); throw error; } finally { await conn.close(); }
}

async function finalizarEnvio(arquivos: ArquivoFolha[], competencia: string, erro?: string) {
  const conn = await getOraclePool().getConnection();
  try {
    for (const arquivo of arquivos) {
      if (erro) {
        await conn.execute(`UPDATE DBACRESSEM.ODONTO_FOLHA_ENVIO SET ST_ENVIO = 'FALHA', DS_ERRO = :erro WHERE CD_COMPETENCIA = :competencia AND ID_EMPRESA = :idEmpresa`, { erro: erro.slice(0, 2000), competencia, idEmpresa: arquivo.idEmpresa });
        continue;
      }
      const envio = await conn.execute<any>(`UPDATE DBACRESSEM.ODONTO_FOLHA_ENVIO SET ST_ENVIO = 'ENVIADO', DT_ENVIO = SYSDATE, DS_ERRO = NULL WHERE CD_COMPETENCIA = :competencia AND ID_EMPRESA = :idEmpresa RETURNING ID_ODONTO_FOLHA_ENVIO INTO :id`, { competencia, idEmpresa: arquivo.idEmpresa, id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER } });
      const idFolhaEnvio = Array.isArray((envio.outBinds as any)?.id) ? (envio.outBinds as any).id[0] : (envio.outBinds as any)?.id;
      await conn.execute(`DELETE FROM DBACRESSEM.ODONTO_FOLHA_ENVIO_ITEM WHERE ID_ODONTO_FOLHA_ENVIO = :idFolhaEnvio`, { idFolhaEnvio });
      for (const [indice, linha] of arquivo.linhas.entries()) await conn.execute(`INSERT INTO DBACRESSEM.ODONTO_FOLHA_ENVIO_ITEM (ID_ODONTO_FOLHA_ENVIO, NR_ORDEM, ID_TITULAR, ID_OPERADORA, NR_CPF_TITULAR, NM_TITULAR, NR_MATRICULA, NM_EMPRESA, NR_CNPJ_EMPRESA, NM_OPERADORA, DS_PLANOS, QT_BENEFICIARIOS, VL_TOTAL, DT_CRIACAO) VALUES (:idFolhaEnvio, :ordem, :idTitular, :idOperadora, :cpf, :nome, :matricula, :empresa, :cnpj, :operadora, :planos, :beneficiarios, :total, SYSDATE)`,
        { idFolhaEnvio, ordem: indice + 1, idTitular: linha.idTitular, cpf: linha.cpfTitular.replace(/\D/g, ""), nome: linha.nomeTitular, matricula: linha.matricula, empresa: linha.empresa, cnpj: (linha.cnpjEmpresa || "").replace(/\D/g, ""), idOperadora: linha.idOperadora, operadora: linha.operadora, planos: linha.planos.join(" | "), beneficiarios: linha.beneficiarios, total: linha.total });
    }
    await conn.commit();
  } catch (error) { await conn.rollback(); throw error; } finally { await conn.close(); }
}

export async function gerarEEnviarFolhaOdontologica(options: { competencia?: string; referencia?: string; origem: "cron" | "manual" }) : Promise<ResultadoFolha> {
  const competencia = options.competencia || (options.origem === "manual" ? competenciaAtual() : competenciaAnterior());
  // A competência identifica o mês já encerrado. A folha é calculada com a
  // situação existente no momento do disparo, após o prazo do Cadastro.
  const referencia = options.referencia || referenciaAtual();
  const destinatario = String(process.env.EMAIL_CONVENIO_ODONTO_FOLHA || DESTINATARIO_PADRAO).trim();
  const beneficiarios = await carregarBeneficiarios(referencia);
  const pendenciasCadastro = identificarPendenciasCadastro(beneficiarios);
  const titularesComPendencia = new Set(pendenciasCadastro.map((pendencia) => pendencia.idTitular));
  const beneficiariosParaCobranca = beneficiarios.filter((beneficiario) => !titularesComPendencia.has(Number(beneficiario.ID_TITULAR)));
  let linhas: LinhaFolha[];
  try {
    linhas = validarEConsolidar(beneficiariosParaCobranca);
  } catch (error: any) {
    const mensagem = error?.message || "Dados inválidos para a folha odontológica.";
    await registrarErroValidacao(beneficiariosParaCobranca, competencia, referencia, destinatario, mensagem);
    throw error;
  }
  const todosArquivos = agruparArquivos(competencia, linhas);
  // A competência/empresa enviada com sucesso jamais é reenviada, seja pelo
  // cron ou pelo disparo manual. Falhas continuam elegíveis para nova tentativa.
  const enviados = await enviosComSucesso(competencia);
  const arquivos = todosArquivos.filter((arquivo) => !enviados.has(arquivo.idEmpresa));
  const ignoradas = todosArquivos.filter((arquivo) => enviados.has(arquivo.idEmpresa)).map((arquivo) => arquivo.empresa);
  const resultadoBase = { competencia, referencia, destinatario, empresas: arquivos.map((arquivo) => ({ empresa: arquivo.empresa, titulares: arquivo.linhas.length, total: arquivo.total, arquivo: arquivo.nomeArquivo })), totalGeral: arquivos.reduce((soma, arquivo) => soma + arquivo.total, 0), ignoradas };
  if (!arquivos.length) {
    const alertaPendenciasEnviado = await enviarRelatorioPendenciasCadastro(competencia, pendenciasCadastro);
    return { ...resultadoBase, enviado: false, pendenciasCadastro: pendenciasCadastro.length, alertaPendenciasEnviado };
  }
  await registrarTentativa(arquivos, competencia, referencia, destinatario);
  try {
    await sendEmail(destinatario, `SICOOB CRESSEM - Folha do convênio odontológico — competência ${competenciaExibicao(competencia)}`, montarEmailFolha(competencia, arquivos), arquivos.map((arquivo) => ({ name: arquivo.nomeArquivo, contentBytes: arquivo.csvBase64, contentType: "text/csv; charset=utf-8" })));
    await finalizarEnvio(arquivos, competencia);
    const alertaPendenciasEnviado = await enviarRelatorioPendenciasCadastro(competencia, pendenciasCadastro);
    return { ...resultadoBase, enviado: true, pendenciasCadastro: pendenciasCadastro.length, alertaPendenciasEnviado };
  } catch (error: any) {
    const mensagem = error?.message || "Falha desconhecida ao enviar a folha odontológica.";
    await finalizarEnvio(arquivos, competencia, mensagem);
    throw new Error(mensagem);
  }
}

export function ehPrimeiroDiaUtil(data = new Date()) {
  const { ano, mes, dia } = dataNoFuso(data);
  const atual = new Date(Date.UTC(ano, mes - 1, dia));
  if (atual.getUTCDay() === 0 || atual.getUTCDay() === 6) return false;
  const feriados = feriadosNacionais(ano);
  if (feriados.has(`${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`)) return false;
  for (let diaAnterior = 1; diaAnterior < dia; diaAnterior++) {
    const candidato = new Date(Date.UTC(ano, mes - 1, diaAnterior));
    if (candidato.getUTCDay() !== 0 && candidato.getUTCDay() !== 6 && !feriados.has(`${ano}-${String(mes).padStart(2, "0")}-${String(diaAnterior).padStart(2, "0")}`)) return false;
  }
  return true;
}

export function proximoDiaUtil(dataIso: string) {
  const [ano, mes, dia] = dataIso.split("-").map(Number);
  if (!ano || !mes || !dia) throw new Error("Data inválida.");
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  while (data.getUTCDay() === 0 || data.getUTCDay() === 6 || feriadosNacionais(data.getUTCFullYear()).has(data.toISOString().slice(0, 10))) data.setUTCDate(data.getUTCDate() + 1);
  return data.toISOString().slice(0, 10);
}
