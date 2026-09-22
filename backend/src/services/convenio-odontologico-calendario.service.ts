import oracledb from "oracledb";
import { getOraclePool } from "../config/oracle.pool";
import { sendEmail } from "./email.service";
import { ArquivoFolha, gerarFotografiaFolhaEmpresa, LinhaFolha, montarCsvFolha, montarEmailFolha, proximoDiaUtil } from "./convenio-odontologico-folha.service";

const TIMEZONE = "America/Sao_Paulo";
const DESTINATARIO_TESTE = "marcelo.bueno@sicoob.com.br";

type Calendario = {
  ID_ODONTO_FOLHA_CALENDARIO: number;
  CD_COMPETENCIA_CORTE: string;
  ID_EMPRESA: number;
  NM_EMPRESA: string;
  DT_CORTE: Date | string;
  DT_CORTE_EFETIVO: Date | string;
  DT_ENVIO_AVISO: Date | string;
  DT_ENVIO_AVISO_EFETIVO: Date | string;
  ST_FECHAMENTO: string;
  ST_AVISO: string;
  DS_ERRO_FECHAMENTO?: string | null;
  DS_ERRO_AVISO?: string | null;
};

function dataHojeIso(data = new Date()) {
  const partes = new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(data);
  const campo = (tipo: string) => partes.find((parte) => parte.type === tipo)?.value || "";
  return `${campo("year")}-${campo("month")}-${campo("day")}`;
}

function dataIso(valor: Date | string) {
  if (typeof valor === "string" && /^\d{4}-\d{2}-\d{2}$/.test(valor)) return valor;
  const data = new Date(valor);
  const partes = new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(data);
  const campo = (tipo: string) => partes.find((parte) => parte.type === tipo)?.value || "";
  return `${campo("year")}-${campo("month")}-${campo("day")}`;
}

function exibirData(valor: Date | string) { return dataIso(valor).split("-").reverse().join("/"); }
function escaparHtml(valor: unknown) { return String(valor || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] || c)); }

function competenciaSeguinte(competencia: string) {
  const [anoTexto, mesTexto] = competencia.split("-");
  const ano = Number(anoTexto); const mes = Number(mesTexto);
  if (!ano || mes < 1 || mes > 12) throw new Error("Competência de corte inválida.");
  return `${mes === 12 ? ano + 1 : ano}-${String(mes === 12 ? 1 : mes + 1).padStart(2, "0")}`;
}

function competenciaAnterior(competencia: string) {
  const [anoTexto, mesTexto] = competencia.split("-");
  const ano = Number(anoTexto); const mes = Number(mesTexto);
  return `${mes === 1 ? ano - 1 : ano}-${String(mes === 1 ? 12 : mes - 1).padStart(2, "0")}`;
}

function montarEmailCalendario(calendarios: Calendario[]) {
  const competencia = calendarios[0]?.CD_COMPETENCIA_CORTE?.split("-").reverse().join("/") || "";
  const linhas = calendarios.map((item) => `<tr><td style="padding:10px;border-bottom:1px solid #E2E8F0;color:#007C72;font-weight:700;">${escaparHtml(item.NM_EMPRESA)}</td><td align="center" style="padding:10px;border-bottom:1px solid #E2E8F0;">${exibirData(item.DT_CORTE_EFETIVO)}</td></tr>`).join("");
  return `<!doctype html><html><body style="margin:0;padding:24px;background:#F6FBFA;font-family:Arial,Helvetica,sans-serif;color:#1F2937;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center"><table role="presentation" width="760" cellspacing="0" cellpadding="0" style="width:100%;max-width:760px;background:#fff;border:1px solid #E2E8F0;border-radius:18px;overflow:hidden;"><tr><td style="padding:24px 30px;background:#00AE9D;color:#fff;"><div style="font-size:11px;font-weight:bold;letter-spacing:1px;">INTRANET CRESSEM</div><div style="margin-top:5px;font-size:21px;font-weight:bold;">Calendário de fechamento do convênio odontológico</div><div style="margin-top:6px;font-size:13px;">Cortes da competência ${competencia}</div></td></tr><tr><td style="padding:26px 30px;"><p style="margin:0 0 18px;font-size:14px;line-height:20px;">Confira abaixo as datas-limite para inclusão, alteração e desligamento do convênio odontológico. Movimentações realizadas após o corte serão consideradas apenas na próxima competência.</p><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;border:1px solid #E2E8F0;"><tr style="background:#F6FBFA;"><th align="left" style="padding:10px;color:#334155;font-size:12px;">Empresa</th><th style="padding:10px;color:#334155;font-size:12px;">Data de corte</th></tr>${linhas}</table></td></tr><tr><td style="padding:0 30px 22px;color:#64748B;font-size:11px;">Mensagem automática da Intranet Cressem.</td></tr></table></td></tr></table></body></html>`;
}

function destinatarioCalendario() {
  return String(process.env.EMAIL_CONVENIO_ODONTO_CALENDARIO || process.env.EMAIL_CONVENIO_ODONTO_FOLHA || DESTINATARIO_TESTE).trim();
}

export async function listarCalendarioFolha(competencia?: string) {
  const conn = await getOraclePool().getConnection();
  try {
    const filtro = competencia ? " WHERE C.CD_COMPETENCIA_CORTE = :competencia" : "";
    const result = await conn.execute<Calendario>(`SELECT C.ID_ODONTO_FOLHA_CALENDARIO, C.CD_COMPETENCIA_CORTE, C.ID_EMPRESA, E.NM_EMPRESA, C.DT_CORTE, C.DT_CORTE_EFETIVO, C.DT_ENVIO_AVISO, C.DT_ENVIO_AVISO_EFETIVO, C.ST_FECHAMENTO, C.ST_AVISO, C.DS_ERRO_FECHAMENTO, C.DS_ERRO_AVISO FROM DBACRESSEM.ODONTO_FOLHA_CALENDARIO C INNER JOIN DBACRESSEM.ODONTO_EMPRESA E ON E.ID_EMPRESA = C.ID_EMPRESA${filtro} ORDER BY C.CD_COMPETENCIA_CORTE DESC, E.NM_EMPRESA`, competencia ? { competencia } : {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    return result.rows || [];
  } finally { await conn.close(); }
}

export async function salvarCalendarioFolha(input: { competencia: string; idEmpresa: number; dataCorte: string; dataEnvioAviso: string; }) {
  if (!/^\d{4}-\d{2}$/.test(input.competencia)) throw new Error("Competência inválida. Use AAAA-MM.");
  if (!Number.isInteger(input.idEmpresa) || input.idEmpresa <= 0) throw new Error("Empresa inválida.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.dataCorte) || !/^\d{4}-\d{2}-\d{2}$/.test(input.dataEnvioAviso)) throw new Error("Informe as datas do calendário.");
  if (!input.dataCorte.startsWith(input.competencia) || !input.dataEnvioAviso.startsWith(input.competencia)) throw new Error("As datas de corte e de aviso devem pertencer à competência configurada.");
  const corteEfetivo = proximoDiaUtil(input.dataCorte);
  const avisoEfetivo = proximoDiaUtil(input.dataEnvioAviso);
  const conn = await getOraclePool().getConnection();
  try {
    const existente = await conn.execute<any>(`SELECT ST_FECHAMENTO FROM DBACRESSEM.ODONTO_FOLHA_CALENDARIO WHERE CD_COMPETENCIA_CORTE = :competencia AND ID_EMPRESA = :idEmpresa`, { competencia: input.competencia, idEmpresa: input.idEmpresa }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    if (existente.rows?.[0]?.ST_FECHAMENTO === "FECHADO") throw new Error("O calendário não pode ser alterado porque a fotografia da folha já foi fechada.");
    await conn.execute(`MERGE INTO DBACRESSEM.ODONTO_FOLHA_CALENDARIO C USING (SELECT :competencia CD_COMPETENCIA_CORTE, :idEmpresa ID_EMPRESA FROM DUAL) D ON (C.CD_COMPETENCIA_CORTE = D.CD_COMPETENCIA_CORTE AND C.ID_EMPRESA = D.ID_EMPRESA) WHEN MATCHED THEN UPDATE SET C.DT_CORTE = TO_DATE(:dataCorte, 'YYYY-MM-DD'), C.DT_CORTE_EFETIVO = TO_DATE(:corteEfetivo, 'YYYY-MM-DD'), C.DT_ENVIO_AVISO = TO_DATE(:dataAviso, 'YYYY-MM-DD'), C.DT_ENVIO_AVISO_EFETIVO = TO_DATE(:avisoEfetivo, 'YYYY-MM-DD'), C.ST_FECHAMENTO = 'ABERTO', C.ST_AVISO = 'PENDENTE', C.DS_ERRO_FECHAMENTO = NULL, C.DS_ERRO_AVISO = NULL, C.DT_ATUALIZACAO = SYSDATE WHEN NOT MATCHED THEN INSERT (CD_COMPETENCIA_CORTE, ID_EMPRESA, DT_CORTE, DT_CORTE_EFETIVO, DT_ENVIO_AVISO, DT_ENVIO_AVISO_EFETIVO, ST_FECHAMENTO, ST_AVISO, NR_TENTATIVAS_AVISO, DT_CRIACAO, DT_ATUALIZACAO) VALUES (:competencia, :idEmpresa, TO_DATE(:dataCorte, 'YYYY-MM-DD'), TO_DATE(:corteEfetivo, 'YYYY-MM-DD'), TO_DATE(:dataAviso, 'YYYY-MM-DD'), TO_DATE(:avisoEfetivo, 'YYYY-MM-DD'), 'ABERTO', 'PENDENTE', 0, SYSDATE, SYSDATE)`, { competencia: input.competencia, idEmpresa: input.idEmpresa, dataCorte: input.dataCorte, corteEfetivo, dataAviso: input.dataEnvioAviso, avisoEfetivo });
    await conn.commit();
    return { competencia: input.competencia, idEmpresa: input.idEmpresa, dataCorteEfetiva: corteEfetivo, dataAvisoEfetiva: avisoEfetivo };
  } catch (error) { await conn.rollback(); throw error; } finally { await conn.close(); }
}

async function gravarFotografia(calendario: Calendario, arquivo: ArquivoFolha | null) {
  const competenciaDesconto = competenciaSeguinte(calendario.CD_COMPETENCIA_CORTE);
  const conn = await getOraclePool().getConnection();
  try {
    const empresa = arquivo?.empresa || calendario.NM_EMPRESA;
    const linhas = arquivo?.linhas || [];
    const total = arquivo?.total || 0;
    const nome = arquivo?.nomeArquivo || `folha_convenio_odontologico_${String(calendario.ID_EMPRESA)}_${competenciaDesconto.replace("-", "_")}.csv`;
    const existente = await conn.execute<any>(`SELECT ID_ODONTO_FOLHA_ENVIO, ST_ENVIO FROM DBACRESSEM.ODONTO_FOLHA_ENVIO WHERE CD_COMPETENCIA = :competencia AND ID_EMPRESA = :idEmpresa`, { competencia: competenciaDesconto, idEmpresa: calendario.ID_EMPRESA }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    if (existente.rows?.[0]?.ST_ENVIO === "ENVIADO") throw new Error("A folha desta empresa já foi enviada e não pode ter a fotografia substituída.");
    await conn.execute(`MERGE INTO DBACRESSEM.ODONTO_FOLHA_ENVIO E USING (SELECT :competencia CD_COMPETENCIA, :idEmpresa ID_EMPRESA FROM DUAL) D ON (E.CD_COMPETENCIA = D.CD_COMPETENCIA AND E.ID_EMPRESA = D.ID_EMPRESA) WHEN MATCHED THEN UPDATE SET E.DT_REFERENCIA = TO_DATE(:referencia, 'YYYY-MM-DD'), E.NM_EMPRESA = :empresa, E.DS_DESTINATARIO = :destinatario, E.NM_ARQUIVO = :nomeArquivo, E.NR_REGISTROS = :titulares, E.VL_TOTAL = :total, E.ST_ENVIO = 'FECHADO', E.DS_ERRO = NULL WHEN NOT MATCHED THEN INSERT (CD_COMPETENCIA, DT_REFERENCIA, ID_EMPRESA, NM_EMPRESA, DS_DESTINATARIO, NM_ARQUIVO, NR_REGISTROS, VL_TOTAL, ST_ENVIO, NR_TENTATIVAS, DT_CRIACAO) VALUES (:competencia, TO_DATE(:referencia, 'YYYY-MM-DD'), :idEmpresa, :empresa, :destinatario, :nomeArquivo, :titulares, :total, 'FECHADO', 0, SYSDATE)`, { competencia: competenciaDesconto, idEmpresa: calendario.ID_EMPRESA, referencia: dataIso(calendario.DT_CORTE_EFETIVO), empresa, destinatario: String(process.env.EMAIL_CONVENIO_ODONTO_FOLHA || DESTINATARIO_TESTE), nomeArquivo: nome, titulares: linhas.length, total });
    const envio = await conn.execute<any>(`SELECT ID_ODONTO_FOLHA_ENVIO FROM DBACRESSEM.ODONTO_FOLHA_ENVIO WHERE CD_COMPETENCIA = :competencia AND ID_EMPRESA = :idEmpresa`, { competencia: competenciaDesconto, idEmpresa: calendario.ID_EMPRESA }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    const idEnvio = Number(envio.rows?.[0]?.ID_ODONTO_FOLHA_ENVIO);
    await conn.execute(`DELETE FROM DBACRESSEM.ODONTO_FOLHA_ENVIO_ITEM WHERE ID_ODONTO_FOLHA_ENVIO = :idEnvio`, { idEnvio });
    for (const [indice, linha] of linhas.entries()) await conn.execute(`INSERT INTO DBACRESSEM.ODONTO_FOLHA_ENVIO_ITEM (ID_ODONTO_FOLHA_ENVIO, NR_ORDEM, ID_TITULAR, ID_OPERADORA, NR_CPF_TITULAR, NM_TITULAR, NR_MATRICULA, NM_EMPRESA, NR_CNPJ_EMPRESA, NM_OPERADORA, DS_PLANOS, QT_BENEFICIARIOS, VL_TOTAL, DT_CRIACAO) VALUES (:idEnvio, :ordem, :idTitular, :idOperadora, :cpf, :nomeTitular, :matricula, :empresa, :cnpj, :operadora, :planos, :beneficiarios, :total, SYSDATE)`, { idEnvio, ordem: indice + 1, idTitular: linha.idTitular, idOperadora: linha.idOperadora, cpf: linha.cpfTitular.replace(/\D/g, ""), nomeTitular: linha.nomeTitular, matricula: linha.matricula, empresa: linha.empresa, cnpj: (linha.cnpjEmpresa || "").replace(/\D/g, ""), operadora: linha.operadora, planos: linha.planos.join(" | "), beneficiarios: linha.beneficiarios, total: linha.total });
    await conn.execute(`UPDATE DBACRESSEM.ODONTO_FOLHA_CALENDARIO SET ST_FECHAMENTO = 'FECHADO', DT_FECHAMENTO = SYSDATE, DS_ERRO_FECHAMENTO = NULL, DT_ATUALIZACAO = SYSDATE WHERE ID_ODONTO_FOLHA_CALENDARIO = :id`, { id: calendario.ID_ODONTO_FOLHA_CALENDARIO });
    await conn.commit();
  } catch (error) { await conn.rollback(); throw error; } finally { await conn.close(); }
}

export async function processarFechamentosFolhaOdontologica(data = new Date()) {
  const hoje = dataHojeIso(data);
  const conn = await getOraclePool().getConnection();
  let calendarios: Calendario[] = [];
  try {
    const result = await conn.execute<Calendario>(`SELECT C.ID_ODONTO_FOLHA_CALENDARIO, C.CD_COMPETENCIA_CORTE, C.ID_EMPRESA, E.NM_EMPRESA, C.DT_CORTE, C.DT_CORTE_EFETIVO, C.DT_ENVIO_AVISO, C.DT_ENVIO_AVISO_EFETIVO, C.ST_FECHAMENTO, C.ST_AVISO FROM DBACRESSEM.ODONTO_FOLHA_CALENDARIO C INNER JOIN DBACRESSEM.ODONTO_EMPRESA E ON E.ID_EMPRESA = C.ID_EMPRESA WHERE C.ST_FECHAMENTO = 'ABERTO' AND TRUNC(C.DT_CORTE_EFETIVO) < TO_DATE(:hoje, 'YYYY-MM-DD') ORDER BY C.DT_CORTE_EFETIVO`, { hoje }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    calendarios = result.rows || [];
  } finally { await conn.close(); }
  const resultado = { fechadas: 0, erros: 0 };
  for (const calendario of calendarios) {
    try {
      const arquivo = await gerarFotografiaFolhaEmpresa(Number(calendario.ID_EMPRESA), competenciaSeguinte(calendario.CD_COMPETENCIA_CORTE), dataIso(calendario.DT_CORTE_EFETIVO));
      await gravarFotografia(calendario, arquivo);
      resultado.fechadas += 1;
    } catch (error: any) {
      const erro = String(error?.message || error).slice(0, 2000);
      const atualizacao = await getOraclePool().getConnection();
      try { await atualizacao.execute(`UPDATE DBACRESSEM.ODONTO_FOLHA_CALENDARIO SET ST_FECHAMENTO = 'ERRO', DS_ERRO_FECHAMENTO = :erro, DT_ATUALIZACAO = SYSDATE WHERE ID_ODONTO_FOLHA_CALENDARIO = :id`, { erro, id: calendario.ID_ODONTO_FOLHA_CALENDARIO }); await atualizacao.commit(); } finally { await atualizacao.close(); }
      resultado.erros += 1;
    }
  }
  return resultado;
}

export async function processarAvisosCalendarioFolha(data = new Date()) {
  const hoje = dataHojeIso(data);
  const conn = await getOraclePool().getConnection();
  let calendarios: Calendario[] = [];
  try {
    const result = await conn.execute<Calendario>(`SELECT C.ID_ODONTO_FOLHA_CALENDARIO, C.CD_COMPETENCIA_CORTE, C.ID_EMPRESA, E.NM_EMPRESA, C.DT_CORTE, C.DT_CORTE_EFETIVO, C.DT_ENVIO_AVISO, C.DT_ENVIO_AVISO_EFETIVO, C.ST_FECHAMENTO, C.ST_AVISO FROM DBACRESSEM.ODONTO_FOLHA_CALENDARIO C INNER JOIN DBACRESSEM.ODONTO_EMPRESA E ON E.ID_EMPRESA = C.ID_EMPRESA WHERE C.ST_AVISO <> 'ENVIADO' AND TRUNC(C.DT_ENVIO_AVISO_EFETIVO) <= TO_DATE(:hoje, 'YYYY-MM-DD') ORDER BY C.CD_COMPETENCIA_CORTE, E.NM_EMPRESA`, { hoje }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    calendarios = result.rows || [];
  } finally { await conn.close(); }
  if (!calendarios.length) return { enviado: false, quantidade: 0, emails: 0 };
  const destinatario = destinatarioCalendario();
  const grupos = new Map<string, Calendario[]>();
  for (const item of calendarios) {
    const chave = `${item.CD_COMPETENCIA_CORTE}:${dataIso(item.DT_ENVIO_AVISO_EFETIVO)}`;
    grupos.set(chave, [...(grupos.get(chave) || []), item]);
  }
  let enviados = 0;
  for (const itens of grupos.values()) {
    try {
      await sendEmail(destinatario, `SICOOB CRESSEM - Calendário de fechamento do convênio odontológico — ${itens[0].CD_COMPETENCIA_CORTE.split("-").reverse().join("/")}`, montarEmailCalendario(itens));
      const atualizacao = await getOraclePool().getConnection();
      try { for (const item of itens) await atualizacao.execute(`UPDATE DBACRESSEM.ODONTO_FOLHA_CALENDARIO SET ST_AVISO = 'ENVIADO', DT_AVISO_ENVIADO = SYSDATE, NR_TENTATIVAS_AVISO = NR_TENTATIVAS_AVISO + 1, DS_ERRO_AVISO = NULL, DT_ATUALIZACAO = SYSDATE WHERE ID_ODONTO_FOLHA_CALENDARIO = :id`, { id: item.ID_ODONTO_FOLHA_CALENDARIO }); await atualizacao.commit(); } finally { await atualizacao.close(); }
      enviados += itens.length;
    } catch (error: any) {
      const erro = String(error?.message || error).slice(0, 2000); const atualizacao = await getOraclePool().getConnection();
      try { for (const item of itens) await atualizacao.execute(`UPDATE DBACRESSEM.ODONTO_FOLHA_CALENDARIO SET ST_AVISO = 'FALHA', NR_TENTATIVAS_AVISO = NR_TENTATIVAS_AVISO + 1, DS_ERRO_AVISO = :erro, DT_ATUALIZACAO = SYSDATE WHERE ID_ODONTO_FOLHA_CALENDARIO = :id`, { erro, id: item.ID_ODONTO_FOLHA_CALENDARIO }); await atualizacao.commit(); } finally { await atualizacao.close(); }
      throw error;
    }
  }
  return { enviado: enviados > 0, quantidade: enviados, emails: grupos.size, destinatario };
}

async function carregarArquivosFechados(competencia: string) {
  const conn = await getOraclePool().getConnection();
  try {
    const envios = await conn.execute<any>(`SELECT ID_ODONTO_FOLHA_ENVIO, ID_EMPRESA, NM_EMPRESA, NM_ARQUIVO, VL_TOTAL FROM DBACRESSEM.ODONTO_FOLHA_ENVIO WHERE CD_COMPETENCIA = :competencia AND ST_ENVIO IN ('FECHADO', 'FALHA') AND NR_REGISTROS > 0 ORDER BY NM_EMPRESA`, { competencia }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    const arquivos: ArquivoFolha[] = [];
    for (const envio of envios.rows || []) {
      const itens = await conn.execute<any>(`SELECT ID_TITULAR, ID_OPERADORA, NR_CPF_TITULAR, NM_TITULAR, NR_MATRICULA, NM_EMPRESA, NR_CNPJ_EMPRESA, NM_OPERADORA, DS_PLANOS, QT_BENEFICIARIOS, VL_TOTAL FROM DBACRESSEM.ODONTO_FOLHA_ENVIO_ITEM WHERE ID_ODONTO_FOLHA_ENVIO = :id ORDER BY NR_ORDEM`, { id: envio.ID_ODONTO_FOLHA_ENVIO }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
      const linhas: LinhaFolha[] = (itens.rows || []).map((item: any) => ({ idTitular: Number(item.ID_TITULAR), cpfTitular: item.NR_CPF_TITULAR, nomeTitular: item.NM_TITULAR, matricula: item.NR_MATRICULA, idEmpresa: Number(envio.ID_EMPRESA), empresa: item.NM_EMPRESA || envio.NM_EMPRESA, cnpjEmpresa: item.NR_CNPJ_EMPRESA, idOperadora: Number(item.ID_OPERADORA), operadora: item.NM_OPERADORA, planos: String(item.DS_PLANOS || "").split(" | ").filter(Boolean), beneficiarios: Number(item.QT_BENEFICIARIOS), total: Number(item.VL_TOTAL) }));
      const csv = montarCsvFolha(competencia, linhas);
      arquivos.push({ idEmpresa: Number(envio.ID_EMPRESA), empresa: envio.NM_EMPRESA, competencia, nomeArquivo: envio.NM_ARQUIVO, linhas, total: Number(envio.VL_TOTAL), csvBase64: csv.toString("base64") });
    }
    return arquivos;
  } finally { await conn.close(); }
}

export async function enviarFolhaFechada(competenciaDesconto: string) {
  const competenciaCorte = competenciaAnterior(competenciaDesconto);
  const calendarios = await listarCalendarioFolha(competenciaCorte) as Calendario[];
  if (!calendarios.length) throw new Error(`Nenhum calendário de corte foi configurado para ${competenciaCorte}.`);
  const pendentes = calendarios.filter((calendario) => calendario.ST_FECHAMENTO !== "FECHADO");
  if (pendentes.length) throw new Error(`Folha não enviada: existem empresas sem fotografia fechada: ${pendentes.map((item) => item.NM_EMPRESA).join(", ")}.`);
  const arquivos = await carregarArquivosFechados(competenciaDesconto);
  const destinatario = String(process.env.EMAIL_CONVENIO_ODONTO_FOLHA || DESTINATARIO_TESTE).trim();
  const empresas = arquivos.map((arquivo) => ({ empresa: arquivo.empresa, titulares: arquivo.linhas.length, total: arquivo.total, arquivo: arquivo.nomeArquivo }));
  if (!arquivos.length) return { competencia: competenciaDesconto, referencia: competenciaCorte, enviado: false, destinatario, empresas, totalGeral: 0, ignoradas: [] };
  const conn = await getOraclePool().getConnection();
  try { for (const arquivo of arquivos) await conn.execute(`UPDATE DBACRESSEM.ODONTO_FOLHA_ENVIO SET ST_ENVIO = 'PROCESSANDO', NR_TENTATIVAS = NR_TENTATIVAS + 1, DS_ERRO = NULL WHERE CD_COMPETENCIA = :competencia AND ID_EMPRESA = :idEmpresa`, { competencia: competenciaDesconto, idEmpresa: arquivo.idEmpresa }); await conn.commit(); } finally { await conn.close(); }
  try {
    await sendEmail(destinatario, `SICOOB CRESSEM - Folha do convênio odontológico — competência ${competenciaDesconto.split("-").reverse().join("/")}`, montarEmailFolha(competenciaDesconto, arquivos), arquivos.map((arquivo) => ({ name: arquivo.nomeArquivo, contentBytes: arquivo.csvBase64, contentType: "text/csv; charset=utf-8" })));
    const fim = await getOraclePool().getConnection();
    try { for (const arquivo of arquivos) await fim.execute(`UPDATE DBACRESSEM.ODONTO_FOLHA_ENVIO SET ST_ENVIO = 'ENVIADO', DT_ENVIO = SYSDATE, DS_ERRO = NULL WHERE CD_COMPETENCIA = :competencia AND ID_EMPRESA = :idEmpresa`, { competencia: competenciaDesconto, idEmpresa: arquivo.idEmpresa }); await fim.commit(); } finally { await fim.close(); }
    return { competencia: competenciaDesconto, referencia: competenciaCorte, enviado: true, destinatario, empresas, totalGeral: arquivos.reduce((soma, arquivo) => soma + arquivo.total, 0), ignoradas: [] };
  } catch (error: any) {
    const erro = String(error?.message || error).slice(0, 2000); const fim = await getOraclePool().getConnection();
    try { for (const arquivo of arquivos) await fim.execute(`UPDATE DBACRESSEM.ODONTO_FOLHA_ENVIO SET ST_ENVIO = 'FALHA', DS_ERRO = :erro WHERE CD_COMPETENCIA = :competencia AND ID_EMPRESA = :idEmpresa`, { erro, competencia: competenciaDesconto, idEmpresa: arquivo.idEmpresa }); await fim.commit(); } finally { await fim.close(); }
    throw error;
  }
}
