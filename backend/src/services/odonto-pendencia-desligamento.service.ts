import oracledb from "oracledb";
import { getOraclePool } from "../config/oracle.pool";
import { oracleExecute, oracleExecuteCommit } from "./oracle.service";
import { sendEmail } from "./email.service";

const ID_DIRETOR = 94;

type Pendencia = {
  ID_PENDENCIA_ODONTO: number;
  TP_ORIGEM: "DEMISSAO" | "DESIMPEDIMENTO";
  ID_ORIGEM: string | null;
  NR_CPF: string;
  NM_ASSOCIADO: string | null;
  ID_BENEFICIARIO_REFERENCIA: number;
  NM_USUARIO_ORIGEM: string | null;
  LOGIN_USUARIO_ORIGEM: string | null;
  DS_EMAIL_USUARIO: string | null;
  DT_REGISTRO: Date | string;
  NR_CICLO: number;
};

function somenteNumeros(valor: unknown) { return String(valor || "").replace(/\D/g, ""); }
function isModoTeste() { return ["1", "true", "sim", "yes"].includes(String(process.env.EMAIL_MODO_TESTE || "").trim().toLowerCase()); }
function emailsFinanceiro() {
  return String(process.env.REEMBOLSO_FINANCEIRO_EMAIL || process.env.FINANCEIRO_EMAIL || "")
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);
}
function escaparHtml(valor: unknown) { return String(valor || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] || c)); }
function dataBr(valor: Date | string | null | undefined) { return valor ? new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" }).format(new Date(valor)) : "-"; }

function montarEmail(pendencia: Pendencia, tipo: "LEMBRETE" | "DESLIGAMENTO", ciclo?: number, dependentes = 0, simulacao = false) {
  const origem = pendencia.TP_ORIGEM === "DEMISSAO" ? "Demissão" : "Desimpedimento";
  const titulo = tipo === "DESLIGAMENTO" ? "Desligamento odontológico automático" : "Pendência de desligamento odontológico";
  const introducao = tipo === "DESLIGAMENTO"
    ? simulacao
      ? "Simulação do último nível: nenhum titular ou dependente foi inativado."
      : `O titular foi inativado automaticamente. Dependentes desligados: <strong>${dependentes}</strong>.`
    : `Identificamos que o benefício odontológico abaixo continua ativo após o ${origem.toLowerCase()} registrado por você.`;
  const lembrete = ciclo === 2
    ? "Lembrete 2 de 2. Este é o último lembrete. Solicite ao atendente do Convênio Odontológico que realize o desligamento antes do próximo ciclo."
    : "Lembrete 1 de 2. Este é o primeiro lembrete. Solicite ao atendente do Convênio Odontológico que realize o desligamento.";
  const alerta = tipo === "LEMBRETE"
    ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:14px 0 0;background:#FFFBEB;border-left:3px solid #F59E0B;"><tr><td style="padding:12px 13px;font-size:12px;line-height:18px;color:#9A3412;">${lembrete}</td></tr></table>`
    : "";
  return `<!doctype html><html><body style="margin:0;padding:24px;background:#F6FBFA;font-family:Arial,Helvetica,sans-serif;color:#0F172A;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;"><tr><td align="center"><table role="presentation" width="760" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:760px;background:#FFFFFF;border:1px solid #E2E8F0;border-radius:18px;overflow:hidden;border-collapse:separate;"><tr><td style="padding:19px 22px;background:#00AE9D;color:#FFFFFF;"><div style="font-size:10px;line-height:14px;font-weight:bold;letter-spacing:.8px;">INTRANET CRESSEM</div><div style="font-size:16px;line-height:22px;font-weight:bold;margin-top:2px;">${titulo}</div></td></tr><tr><td style="padding:21px 22px 18px;"><p style="margin:0 0 13px;font-size:12px;line-height:18px;color:#0F172A;">${introducao}</p><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;border:1px solid #D9E2E8;"><tr><td width="28%" style="padding:8px 10px;background:#F8FAFC;border-right:1px solid #D9E2E8;border-bottom:1px solid #D9E2E8;font-size:12px;line-height:16px;font-weight:bold;">Associado</td><td style="padding:8px 10px;border-bottom:1px solid #D9E2E8;font-size:12px;line-height:16px;">${escaparHtml(pendencia.NM_ASSOCIADO)}</td></tr><tr><td style="padding:8px 10px;background:#F8FAFC;border-right:1px solid #D9E2E8;border-bottom:1px solid #D9E2E8;font-size:12px;line-height:16px;font-weight:bold;">CPF</td><td style="padding:8px 10px;border-bottom:1px solid #D9E2E8;font-size:12px;line-height:16px;">${escaparHtml(pendencia.NR_CPF)}</td></tr><tr><td style="padding:8px 10px;background:#F8FAFC;border-right:1px solid #D9E2E8;font-size:12px;line-height:16px;font-weight:bold;">Registro</td><td style="padding:8px 10px;font-size:12px;line-height:16px;">${dataBr(pendencia.DT_REGISTRO)}</td></tr></table>${alerta}</td></tr><tr><td style="padding:0 22px 21px;color:#64748B;font-size:11px;line-height:16px;">Mensagem automática da Intranet Cressem.</td></tr></table></td></tr></table></body></html>`;
}

async function buscarBeneficioAtivo(cpf: string) {
  const result = await oracleExecute<any>(`SELECT NVL(B.ID_TITULAR, B.ID_BENEFICIARIO) AS ID_TITULAR,
      NVL(T.NM_BENEFICIARIO, B.NM_BENEFICIARIO) AS NM_TITULAR
    FROM DBACRESSEM.ODONTO_BENEFICIARIO B
    LEFT JOIN DBACRESSEM.ODONTO_BENEFICIARIO T ON T.ID_BENEFICIARIO = B.ID_TITULAR
    WHERE REGEXP_REPLACE(B.NR_CPF, '[^0-9]', '') = :cpf AND B.SN_ATIVO = 1
    FETCH FIRST 1 ROWS ONLY`, { cpf }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
  return result.rows?.[0] || null;
}

export async function criarPendenciaOdontoDesligamento(input: { origem: "DEMISSAO" | "DESIMPEDIMENTO"; idOrigem: string | number; cpf: string; nomeAssociado?: string | null; usuario: { nome?: string | null; login?: string | null; email?: string | null; }; }) {
  try {
    const cpf = somenteNumeros(input.cpf);
    if (cpf.length !== 11 && cpf.length !== 14) return { criada: false, motivo: "CPF inválido." };
    const beneficio = await buscarBeneficioAtivo(cpf);
    if (!beneficio) return { criada: false, motivo: "Sem benefício odontológico ativo." };
    const aberta = await oracleExecute<any>(`SELECT ID_PENDENCIA_ODONTO FROM DBACRESSEM.ODONTO_PENDENCIA_DESLIGAMENTO WHERE NR_CPF = :cpf AND ST_PENDENCIA = 'PENDENTE' FETCH FIRST 1 ROWS ONLY`, { cpf }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    if (aberta.rows?.length) return { criada: false, motivo: "Já existe pendência aberta." };
    const result = await oracleExecuteCommit<any>(`INSERT INTO DBACRESSEM.ODONTO_PENDENCIA_DESLIGAMENTO (TP_ORIGEM, ID_ORIGEM, NR_CPF, NM_ASSOCIADO, ID_BENEFICIARIO_REFERENCIA, NM_USUARIO_ORIGEM, LOGIN_USUARIO_ORIGEM, DS_EMAIL_USUARIO, DT_REGISTRO, NR_CICLO, ST_PENDENCIA, QT_DEPENDENTES_DESLIGADOS, DT_ATUALIZACAO) VALUES (:origem, :idOrigem, :cpf, :nomeAssociado, :idBeneficiario, :nomeUsuario, :loginUsuario, :emailUsuario, SYSDATE, 0, 'PENDENTE', 0, SYSDATE) RETURNING ID_PENDENCIA_ODONTO INTO :id`, {
      origem: input.origem, idOrigem: String(input.idOrigem), cpf, nomeAssociado: input.nomeAssociado || beneficio.NM_TITULAR || null,
      idBeneficiario: Number(beneficio.ID_TITULAR), nomeUsuario: input.usuario.nome || null, loginUsuario: input.usuario.login || null, emailUsuario: input.usuario.email || null,
      id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
    });
    const id = Array.isArray((result.outBinds as any)?.id) ? (result.outBinds as any).id[0] : (result.outBinds as any)?.id;
    return { criada: true, idPendencia: Number(id) };
  } catch (error) {
    console.error("[ODONTO PENDÊNCIA] Erro ao criar pendência:", error);
    return { criada: false, motivo: "Falha interna ao registrar pendência." };
  }
}

async function buscarGestor(email: string | null) {
  if (!email) return "";
  const result = await oracleExecute<any>(`SELECT G.EMAIL FROM DBACRESSEM.FUNCIONARIOS_SICOOB_CRESSEM F LEFT JOIN DBACRESSEM.FUNCIONARIOS_SICOOB_CRESSEM G ON G.ID_FUNCIONARIO = F.CD_GERENCIA WHERE UPPER(TRIM(F.EMAIL)) = UPPER(TRIM(:email)) FETCH FIRST 1 ROWS ONLY`, { email }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
  return String(result.rows?.[0]?.EMAIL || "").trim();
}

async function buscarDiretor() {
  const result = await oracleExecute<any>(`SELECT EMAIL FROM DBACRESSEM.FUNCIONARIOS_SICOOB_CRESSEM WHERE ID_FUNCIONARIO = :id`, { id: ID_DIRETOR }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
  return String(result.rows?.[0]?.EMAIL || "").trim();
}

async function atualizarPendencia(id: number, sql: string, binds: Record<string, unknown> = {}) {
  await oracleExecuteCommit(`UPDATE DBACRESSEM.ODONTO_PENDENCIA_DESLIGAMENTO SET ${sql}, DT_ATUALIZACAO = SYSDATE WHERE ID_PENDENCIA_ODONTO = :id`, { ...binds, id });
}

async function desligarTitular(idTitular: number) {
  const conn = await getOraclePool().getConnection();
  try {
    const dependentes = await conn.execute(`UPDATE DBACRESSEM.ODONTO_BENEFICIARIO SET SN_ATIVO = 0, DT_EXCLUSAO_PLANO = SYSDATE, DT_ATUALIZACAO = SYSDATE, DS_OBSERVACAO = :observacao, NM_USUARIO_ATUALIZACAO = :usuario, LOGIN_USUARIO_ATUALIZACAO = :login WHERE ID_TITULAR = :idTitular AND SN_ATIVO = 1`, { idTitular, observacao: "Desligado automaticamente pela Intranet após 3 ciclos mensais de pendência de desligamento odontológico.", usuario: "INTRANET - DESLIGAMENTO AUTOMATICO", login: "INTRANET_AUTOMATICO" });
    await conn.execute(`UPDATE DBACRESSEM.ODONTO_BENEFICIARIO SET SN_ATIVO = 0, DT_EXCLUSAO_PLANO = SYSDATE, DT_ATUALIZACAO = SYSDATE, DS_OBSERVACAO = :observacao, NM_USUARIO_ATUALIZACAO = :usuario, LOGIN_USUARIO_ATUALIZACAO = :login WHERE ID_BENEFICIARIO = :idTitular AND SN_ATIVO = 1`, { idTitular, observacao: "Desligado automaticamente pela Intranet após 3 ciclos mensais de pendência de desligamento odontológico.", usuario: "INTRANET - DESLIGAMENTO AUTOMATICO", login: "INTRANET_AUTOMATICO" });
    await conn.commit();
    return Number(dependentes.rowsAffected || 0);
  } catch (error) { await conn.rollback(); throw error; } finally { await conn.close(); }
}

export async function processarPendenciasOdontoDesligamento(options: { teste?: boolean; nivelTeste?: 1 | 2 | 3 } = {}) {
  const teste = Boolean(options.teste);
  const nivelTeste = options.nivelTeste;
  const condicaoTeste = teste ? " AND UPPER(NVL(NM_ASSOCIADO, ' ')) LIKE '%TESTE%'" : "";
  const condicaoMes = teste ? "" : " AND TRUNC(DT_REGISTRO) < TRUNC(SYSDATE, 'MM')";
  const result = await oracleExecute<Pendencia>(`SELECT ID_PENDENCIA_ODONTO, TP_ORIGEM, ID_ORIGEM, NR_CPF, NM_ASSOCIADO, ID_BENEFICIARIO_REFERENCIA, NM_USUARIO_ORIGEM, LOGIN_USUARIO_ORIGEM, DS_EMAIL_USUARIO, DT_REGISTRO, NR_CICLO FROM DBACRESSEM.ODONTO_PENDENCIA_DESLIGAMENTO WHERE ST_PENDENCIA = 'PENDENTE'${condicaoMes}${condicaoTeste} ORDER BY DT_REGISTRO`, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
  const resumo = { processadas: 0, resolvidasManualmente: 0, avisos: 0, desligadas: 0, erros: 0, ignoradasTeste: 0 };
  for (const pendencia of (result.rows || []) as Pendencia[]) {
    resumo.processadas += 1;
    try {
      const beneficio = await buscarBeneficioAtivo(somenteNumeros(pendencia.NR_CPF));
      if (!beneficio) {
        await atualizarPendencia(Number(pendencia.ID_PENDENCIA_ODONTO), "ST_PENDENCIA = 'RESOLVIDA_MANUAL', DT_RESOLUCAO = SYSDATE, DS_ERRO_EMAIL = NULL");
        resumo.resolvidasManualmente += 1;
        continue;
      }
      if (teste && nivelTeste) {
        if (!pendencia.DS_EMAIL_USUARIO) throw new Error("E-mail do usuário que criou a origem não foi registrado.");
        const cicloAtual = Number(pendencia.NR_CICLO || 0);
        const cicloEsperado = nivelTeste - 1;
        if (cicloAtual !== cicloEsperado) {
          throw new Error(`A pendência está no ciclo ${cicloAtual}. Para testar o nível ${nivelTeste}, execute primeiro os níveis anteriores ou use o reset de teste.`);
        }
        if (nivelTeste === 1 || nivelTeste === 2) {
          const gestor = nivelTeste === 2 ? await buscarGestor(pendencia.DS_EMAIL_USUARIO) : "";
          await sendEmail(pendencia.DS_EMAIL_USUARIO, `SICOOB CRESSEM - Lembrete de desligamento odontológico - ${pendencia.NM_ASSOCIADO || pendencia.NR_CPF}`, montarEmail(pendencia, "LEMBRETE", nivelTeste), [], { cc: [...(nivelTeste === 2 ? [gestor] : []), ...emailsFinanceiro()].filter(Boolean) });
          await atualizarPendencia(Number(pendencia.ID_PENDENCIA_ODONTO), "NR_CICLO = :ciclo, DT_ULTIMO_AVISO = SYSDATE, DS_ERRO_EMAIL = NULL", { ciclo: nivelTeste });
          resumo.avisos += 1;
        } else {
          const gestor = await buscarGestor(pendencia.DS_EMAIL_USUARIO);
          const diretor = await buscarDiretor();
          await sendEmail(pendencia.DS_EMAIL_USUARIO, `SICOOB CRESSEM - Desligamento odontológico automático - ${pendencia.NM_ASSOCIADO || pendencia.NR_CPF}`, montarEmail(pendencia, "DESLIGAMENTO", undefined, 0, true), [], { cc: [gestor, diretor, ...emailsFinanceiro()].filter(Boolean) });
          // No teste registramos o encerramento para validar o fluxo completo,
          // mas nunca executamos a inativação de titular ou dependentes.
          await atualizarPendencia(Number(pendencia.ID_PENDENCIA_ODONTO), "NR_CICLO = 3, ST_PENDENCIA = 'DESLIGADA_AUTOMATICAMENTE', DT_RESOLUCAO = SYSDATE, QT_DEPENDENTES_DESLIGADOS = 0, DS_ERRO_EMAIL = NULL");
          resumo.desligadas += 1;
        }
        continue;
      }
      const ciclo = Number(pendencia.NR_CICLO || 0);
      if (ciclo < 2) {
        const proximoCiclo = ciclo + 1;
        const gestor = proximoCiclo === 2 ? await buscarGestor(pendencia.DS_EMAIL_USUARIO) : "";
        const cc = [...(proximoCiclo === 2 ? [gestor] : []), ...emailsFinanceiro()].filter(Boolean);
        if (!pendencia.DS_EMAIL_USUARIO) throw new Error("E-mail do usuário que criou a origem não foi registrado.");
        await sendEmail(pendencia.DS_EMAIL_USUARIO, `SICOOB CRESSEM - Lembrete de desligamento odontológico - ${pendencia.NM_ASSOCIADO || pendencia.NR_CPF}`, montarEmail(pendencia, "LEMBRETE", proximoCiclo), [], { cc });
        await atualizarPendencia(Number(pendencia.ID_PENDENCIA_ODONTO), "NR_CICLO = :ciclo, DT_ULTIMO_AVISO = SYSDATE, DS_ERRO_EMAIL = NULL", { ciclo: proximoCiclo });
        resumo.avisos += 1;
        continue;
      }
      // O ambiente de teste nunca altera benefícios, inclusive se o cron for
      // disparado acidentalmente. Em produção, o teste manual também ignora
      // o ciclo de desligamento.
      if (teste || isModoTeste()) { resumo.ignoradasTeste += 1; continue; }
      const dependentes = await desligarTitular(Number(beneficio.ID_TITULAR));
      await atualizarPendencia(Number(pendencia.ID_PENDENCIA_ODONTO), "NR_CICLO = 3, ST_PENDENCIA = 'DESLIGADA_AUTOMATICAMENTE', DT_RESOLUCAO = SYSDATE, QT_DEPENDENTES_DESLIGADOS = :dependentes, DS_ERRO_EMAIL = NULL", { dependentes });
      resumo.desligadas += 1;
      try {
        const gestor = await buscarGestor(pendencia.DS_EMAIL_USUARIO);
        const diretor = await buscarDiretor();
        if (!pendencia.DS_EMAIL_USUARIO) throw new Error("E-mail do usuário que criou a origem não foi registrado.");
        await sendEmail(pendencia.DS_EMAIL_USUARIO, `SICOOB CRESSEM - Desligamento odontológico automático - ${pendencia.NM_ASSOCIADO || pendencia.NR_CPF}`, montarEmail(pendencia, "DESLIGAMENTO", undefined, dependentes), [], { cc: [gestor, diretor, ...emailsFinanceiro()].filter(Boolean) });
      } catch (error: any) {
        await atualizarPendencia(Number(pendencia.ID_PENDENCIA_ODONTO), "DS_ERRO_EMAIL = :erro", { erro: String(error?.message || error).slice(0, 1000) });
        resumo.erros += 1;
      }
    } catch (error: any) {
      await atualizarPendencia(Number(pendencia.ID_PENDENCIA_ODONTO), "DS_ERRO_EMAIL = :erro", { erro: String(error?.message || error).slice(0, 1000) });
      resumo.erros += 1;
    }
  }
  return resumo;
}
