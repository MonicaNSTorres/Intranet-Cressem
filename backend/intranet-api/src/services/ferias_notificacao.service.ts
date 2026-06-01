import oracledb from "oracledb";
import { oracleExecute, oracleExecuteCommit } from "./oracle.service";
import { sendEmail } from "./email.service";
import os from "os";

const EMAIL_RH = [
  "paloma.eduarda@sicoob.com.br",
  "jorge.gregorio@sicoob.com.br",
];

const EMAIL_DIRETORIA = [
  "tiago.teixeira@sicoob.com.br",
  "paulo.tarso@sicoob.com.br",
  "luiz.gerhard@sicoob.com.br",
];

const EMAIL_TI = "informatica.cressem@sicoob.com.br";
const ROTINA = "FERIAS_NOTIFICACAO";

type TipoNotificacaoMensal = "RH_DIRETORIA" | "GERENCIAS" | "PREVIA_DIA17";

function dataRefMesSaoPaulo(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((p) => p.type === "year")?.value || "0000";
  const month = parts.find((p) => p.type === "month")?.value || "00";
  const day = Number(parts.find((p) => p.type === "day")?.value || "0");

  return {
    refMes: `${year}-${month}`,
    diaDoMes: day,
  };
}

function chaveControle(tipo: TipoNotificacaoMensal, refMes: string) {
  return `${ROTINA}:${tipo}:${refMes}`;
}

function destinatarioControle(tipo: TipoNotificacaoMensal) {
  return tipo === "RH_DIRETORIA"
    ? "RH_DIRETORIA@INTRANET"
    : "GERENCIAS@INTRANET";
}

function assuntoControle(tipo: TipoNotificacaoMensal, refMes: string) {
  return `Controle envio ${tipo} ${refMes}`;
}

async function reservarEnvioNoMes(tipo: TipoNotificacaoMensal, refMes: string) {
  const idempotencyKey = chaveControle(tipo, refMes);

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
        competencia: refMes,
        destinatario: destinatarioControle(tipo),
        assunto: assuntoControle(tipo, refMes),
        origemHost: os.hostname(),
        origemPid: String(process.pid),
      }
    );
    return true;
  } catch (error: any) {
    const message = String(error?.message || "");
    const jaExiste =
      error?.errorNum === 1 ||
      message.includes("ORA-00001") ||
      message.toUpperCase().includes("UNIQUE");

    if (jaExiste) return false;
    throw error;
  }
}

async function marcarEnviadoNoMes(tipo: TipoNotificacaoMensal, refMes: string) {
  const idempotencyKey = chaveControle(tipo, refMes);
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

async function marcarFalhaNoMes(
  tipo: TipoNotificacaoMensal,
  refMes: string,
  erro: unknown
) {
  const idempotencyKey = chaveControle(tipo, refMes);
  const erroTexto = String((erro as any)?.message || erro || "").slice(0, 2000);
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

async function limparReservaNoMes(tipo: TipoNotificacaoMensal, refMes: string) {
  const idempotencyKey = chaveControle(tipo, refMes);
  await oracleExecuteCommit(
    `
      DELETE FROM DBACRESSEM.EMAIL_ENVIO_CONTROLE
       WHERE ID_EMPOTENCY_KEY = :idempotencyKey
         AND NM_STATUS = 'RESERVADO'
    `,
    { idempotencyKey }
  );
}

function podeExecutarMensalHoje(force = false) {
  if (force) return true;
  const { diaDoMes } = dataRefMesSaoPaulo();
  return diaDoMes >= 1 && diaDoMes <= 3;
}

function podeExecutarPreviaDia17Hoje(force = false) {
  if (force) return true;
  const { diaDoMes } = dataRefMesSaoPaulo();
  return diaDoMes === 17;
}

function alvoDoAvisoDia17(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);

  const anoBase = Number(parts.find((p) => p.type === "year")?.value || "0");
  const mesBase = Number(parts.find((p) => p.type === "month")?.value || "0");
  const idxBase = anoBase * 12 + (mesBase - 1);
  const idxAlvo = idxBase + 2;
  const anoAlvo = Math.floor(idxAlvo / 12);
  const mesAlvo = (idxAlvo % 12) + 1;

  return {
    anoAlvo,
    mesAlvo,
    refAlvo: `${anoAlvo}-${String(mesAlvo).padStart(2, "0")}`,
  };
}



function dataBR(value: any) {
  if (!value) return "-";

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString("pt-BR");
}

function mesAnoAtual() {
  const hoje = new Date();

  return {
    mes: String(hoje.getMonth() + 1).padStart(2, "0"),
    ano: hoje.getFullYear(),
  };
}

function addDias(dias: number) {
  const data = new Date();
  data.setDate(data.getDate() + dias);
  return data;
}

function feriasFakeTeste() {
  const hoje = new Date();
  const fim = new Date();
  fim.setDate(hoje.getDate() + 10);

  return [
    {
      ID_FERIAS_FUNCIONARIOS: 999999,
      ID_FUNCIONARIO: 999999,
      NOME: "Funcionário Teste",
      EMAIL: "teste@sicoob.com.br",
      DT_DIA_INICIO: hoje,
      DT_DIA_FIM: fim,
      NOME_GERENTE: "Gerente Teste",
      EMAIL_GERENTE: "monica.torres@sicoob.com.br",
    },
  ];
}

function buildListaHtml(rows: any[]) {
  if (!rows?.length) {
    return "<p>- (vazio)</p>";
  }

  return `
    <ul>
      ${rows
        .map(
          (row) => `
            <li>
              <strong>${row.NOME || row.NM_FUNCIONARIO || "-"}</strong>
              — Início: <strong>${dataBR(row.DT_DIA_INICIO)}</strong>
              | Fim: <strong>${dataBR(row.DT_DIA_FIM)}</strong>
            </li>
          `
        )
        .join("")}
    </ul>
  `;
}

async function buscarFeriasMesAtual() {
  const sql = `
    SELECT
      F.ID_FERIAS_FUNCIONARIOS,
      F.DT_DIA_INICIO,
      F.DT_DIA_FIM,
      F.DT_DIAS_TOTAIS,
      F.ID_FUNCIONARIO,
      P.NM_FUNCIONARIO AS NOME,
      P.EMAIL AS EMAIL,
      P.CD_GERENCIA,
      G.NM_FUNCIONARIO AS NOME_GERENTE,
      G.EMAIL AS EMAIL_GERENTE
    FROM DBACRESSEM.FERIAS_FUNCIONARIOS F
    JOIN DBACRESSEM.FUNCIONARIOS_SICOOB_CRESSEM P
      ON P.ID_FUNCIONARIO = F.ID_FUNCIONARIO
    LEFT JOIN DBACRESSEM.FUNCIONARIOS_SICOOB_CRESSEM G
      ON G.ID_FUNCIONARIO = P.CD_GERENCIA
    WHERE EXTRACT(MONTH FROM F.DT_DIA_INICIO) = EXTRACT(MONTH FROM SYSDATE)
      AND EXTRACT(YEAR FROM F.DT_DIA_INICIO) = EXTRACT(YEAR FROM SYSDATE)
    ORDER BY F.DT_DIA_INICIO, P.NM_FUNCIONARIO
  `;

  const result = await oracleExecute(
    sql,
    {},
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  return (result.rows || []) as any[];
}

async function buscarFeriasPorMesAno(mes: number, ano: number) {
  const sql = `
    SELECT
      F.ID_FERIAS_FUNCIONARIOS,
      F.DT_DIA_INICIO,
      F.DT_DIA_FIM,
      F.DT_DIAS_TOTAIS,
      F.ID_FUNCIONARIO,
      P.NM_FUNCIONARIO AS NOME,
      P.EMAIL AS EMAIL,
      P.CD_GERENCIA,
      G.NM_FUNCIONARIO AS NOME_GERENTE,
      G.EMAIL AS EMAIL_GERENTE
    FROM DBACRESSEM.FERIAS_FUNCIONARIOS F
    JOIN DBACRESSEM.FUNCIONARIOS_SICOOB_CRESSEM P
      ON P.ID_FUNCIONARIO = F.ID_FUNCIONARIO
    LEFT JOIN DBACRESSEM.FUNCIONARIOS_SICOOB_CRESSEM G
      ON G.ID_FUNCIONARIO = P.CD_GERENCIA
    WHERE EXTRACT(MONTH FROM F.DT_DIA_INICIO) = :mes
      AND EXTRACT(YEAR FROM F.DT_DIA_INICIO) = :ano
    ORDER BY F.DT_DIA_INICIO, P.NM_FUNCIONARIO
  `;

  const result = await oracleExecute(
    sql,
    { mes, ano },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  return (result.rows || []) as any[];
}

//funcao para fins de teste de envio do email ao rh/diretoria
{/*async function buscarFeriasMesAtual() {
  console.log("[FÉRIAS TESTE] Usando férias fake para teste.");

  return feriasFakeTeste();

  //depois do teste, remova o return acima e volte para o SQL original
}*/}

async function buscarInicioNoDia(data: Date) {
  const sql = `
    SELECT
      F.ID_FERIAS_FUNCIONARIOS,
      F.DT_DIA_INICIO,
      F.DT_DIA_FIM,
      F.ID_FUNCIONARIO,
      P.NM_FUNCIONARIO AS NOME,
      P.EMAIL
    FROM DBACRESSEM.FERIAS_FUNCIONARIOS F
    JOIN DBACRESSEM.FUNCIONARIOS_SICOOB_CRESSEM P
      ON P.ID_FUNCIONARIO = F.ID_FUNCIONARIO
    WHERE TRUNC(F.DT_DIA_INICIO) = TRUNC(:data)
    ORDER BY P.NM_FUNCIONARIO
  `;

  const result = await oracleExecute(
    sql,
    { data },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  return (result.rows || []) as any[];
}

async function buscarUltimoDia(data: Date) {
  const sql = `
    SELECT
      F.ID_FERIAS_FUNCIONARIOS,
      F.DT_DIA_INICIO,
      F.DT_DIA_FIM,
      F.ID_FUNCIONARIO,
      P.NM_FUNCIONARIO AS NOME,
      P.EMAIL
    FROM DBACRESSEM.FERIAS_FUNCIONARIOS F
    JOIN DBACRESSEM.FUNCIONARIOS_SICOOB_CRESSEM P
      ON P.ID_FUNCIONARIO = F.ID_FUNCIONARIO
    WHERE TRUNC(F.DT_DIA_FIM) = TRUNC(:data)
    ORDER BY P.NM_FUNCIONARIO
  `;

  const result = await oracleExecute(
    sql,
    { data },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  return (result.rows || []) as any[];
}

async function buscarRetornoEm(dataRetorno: Date) {
  const sql = `
    SELECT
      F.ID_FERIAS_FUNCIONARIOS,
      F.DT_DIA_INICIO,
      F.DT_DIA_FIM,
      F.ID_FUNCIONARIO,
      P.NM_FUNCIONARIO AS NOME,
      P.EMAIL
    FROM DBACRESSEM.FERIAS_FUNCIONARIOS F
    JOIN DBACRESSEM.FUNCIONARIOS_SICOOB_CRESSEM P
      ON P.ID_FUNCIONARIO = F.ID_FUNCIONARIO
    WHERE TRUNC(F.DT_DIA_FIM + 1) = TRUNC(:dataRetorno)
    ORDER BY P.NM_FUNCIONARIO
  `;

  const result = await oracleExecute(
    sql,
    { dataRetorno },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  return (result.rows || []) as any[];
}

export async function enviarEmailRhDiretoria() {
  const rows = await buscarFeriasMesAtual();

  if (!rows.length) {
    console.log("[Férias] Nenhum início de férias no mês para RH/Diretoria.");
    return { enviados: 0 };
  }

  const { mes, ano } = mesAnoAtual();

  const assunto = `[RH/Diretoria] Férias do mês ${mes}/${ano}`;

  const html = `
    <div style="font-family: Arial, sans-serif; font-size: 14px; color: #222;">
      <p>Olá,</p>

      <p>
        Colaboradores que <strong>INICIAM férias</strong> em
        <strong>${mes}/${ano}</strong>:
      </p>

      ${buildListaHtml(rows)}

      <br/>

      <p>Atenciosamente,<br/>Equipe RH</p>

      <p style="margin-top: 20px; color: #666;">
        Este email foi enviado automaticamente pela intranet.
      </p>
    </div>
  `;

  await sendEmail([...EMAIL_RH, ...EMAIL_DIRETORIA], assunto, html);

  return { enviados: 1 };
}

export async function enviarEmailGerencias() {
  const rows = await buscarFeriasMesAtual();

  if (!rows.length) {
    console.log("[Férias] Nenhum início de férias no mês para Gerências.");
    return { enviados: 0 };
  }

  const porGerente: Record<string, any[]> = {};

  for (const row of rows) {
    const emailGerente = String(row.EMAIL_GERENTE || "").trim();

    if (!emailGerente) continue;

    if (!porGerente[emailGerente]) {
      porGerente[emailGerente] = [];
    }

    porGerente[emailGerente].push(row);
  }

  const { mes, ano } = mesAnoAtual();

  let enviados = 0;

  for (const emailGerente of Object.keys(porGerente)) {
    const itens = porGerente[emailGerente];
    const nomeGerente = itens[0]?.NOME_GERENTE || "Gerência";

    const assunto = `[Gerência] Férias dos seus liderados em ${mes}/${ano}`;

    const html = `
      <div style="font-family: Arial, sans-serif; font-size: 14px; color: #222;">
        <p>Olá <strong>${nomeGerente}</strong>,</p>

        <p>
          Seus liderados que <strong>INICIAM férias</strong> em
          <strong>${mes}/${ano}</strong>:
        </p>

        ${buildListaHtml(itens)}

        <br/>

        <p>Qualquer dúvida, conte com o RH.</p>

        <p style="margin-top: 20px; color: #666;">
          Este email foi enviado automaticamente pela intranet.
        </p>
      </div>
    `;

    await sendEmail(emailGerente, assunto, html);
    enviados++;
  }

  return { enviados };
}

async function enviarEmailPreviaRhDiretoriaDia17(params: {
  mesAlvo: number;
  anoAlvo: number;
}) {
  const { mesAlvo, anoAlvo } = params;
  const rows = await buscarFeriasPorMesAno(mesAlvo, anoAlvo);
  const mesFmt = String(mesAlvo).padStart(2, "0");

  if (!rows.length) {
    const assunto = `[RH/Diretoria] Previa de ferias ${mesFmt}/${anoAlvo} - sem cadastro`;
    const html = `
      <div style="font-family: Arial, sans-serif; font-size: 14px; color: #222;">
        <p>Ola,</p>
        <p>Nao ha cadastro de ferias para <strong>${mesFmt}/${anoAlvo}</strong>.</p>
        <p style="margin-top: 20px; color: #666;">Este email foi enviado automaticamente pela intranet.</p>
      </div>
    `;
    await sendEmail(EMAIL_RH, assunto, html);
    return { enviados: 1, semCadastro: true };
  }

  const assunto = `[RH/Diretoria] Previa de ferias ${mesFmt}/${anoAlvo}`;
  const html = `
    <div style="font-family: Arial, sans-serif; font-size: 14px; color: #222;">
      <p>Ola,</p>
      <p>Colaboradores que iniciam ferias em <strong>${mesFmt}/${anoAlvo}</strong>:</p>
      ${buildListaHtml(rows)}
      <p style="margin-top: 20px; color: #666;">Este email foi enviado automaticamente pela intranet.</p>
    </div>
  `;

  await sendEmail([...EMAIL_RH, ...EMAIL_DIRETORIA], assunto, html);
  return { enviados: 1, semCadastro: false };
}

async function enviarEmailPreviaGerenciasDia17(params: {
  mesAlvo: number;
  anoAlvo: number;
}) {
  const { mesAlvo, anoAlvo } = params;
  const rows = await buscarFeriasPorMesAno(mesAlvo, anoAlvo);
  const mesFmt = String(mesAlvo).padStart(2, "0");

  if (!rows.length) {
    return { enviados: 0, semCadastro: true };
  }

  const porGerente: Record<string, any[]> = {};
  for (const row of rows) {
    const emailGerente = String(row.EMAIL_GERENTE || "").trim();
    if (!emailGerente) continue;
    if (!porGerente[emailGerente]) {
      porGerente[emailGerente] = [];
    }
    porGerente[emailGerente].push(row);
  }

  let enviados = 0;
  for (const emailGerente of Object.keys(porGerente)) {
    const itens = porGerente[emailGerente];
    const nomeGerente = itens[0]?.NOME_GERENTE || "Gerencia";
    const assunto = `[Gerencia] Previa de ferias dos liderados ${mesFmt}/${anoAlvo}`;
    const html = `
      <div style="font-family: Arial, sans-serif; font-size: 14px; color: #222;">
        <p>Ola <strong>${nomeGerente}</strong>,</p>
        <p>Seus liderados que iniciam ferias em <strong>${mesFmt}/${anoAlvo}</strong>:</p>
        ${buildListaHtml(itens)}
        <p style="margin-top: 20px; color: #666;">Este email foi enviado automaticamente pela intranet.</p>
      </div>
    `;
    await sendEmail(emailGerente, assunto, html);
    enviados++;
  }

  return { enviados, semCadastro: false };
}

export async function enviarEmailTiFerias() {
  const hoje = new Date();
  const em3Dias = addDias(3);
  const amanha = addDias(1);

  const preInicio = await buscarInicioNoDia(em3Dias);
  const inicioHoje = await buscarInicioNoDia(hoje);
  const preVolta = await buscarRetornoEm(em3Dias);
  const ultimoDia = await buscarUltimoDia(hoje);

  let enviados = 0;

  if (preInicio.length) {
    const assunto = `[TI] Em 3 dias iniciam férias (${dataBR(em3Dias)})`;

    const html = `
      <div style="font-family: Arial, sans-serif; font-size: 14px; color: #222;">
        <p>Boa tarde,</p>

        <p>
          Daqui a 3 dias (<strong>${dataBR(em3Dias)}</strong>) os seguintes
          colaboradores <strong>INICIAM férias</strong>:
        </p>

        ${buildListaHtml(preInicio)}

        <p style="margin-top: 20px; color: #666;">
          Este email foi enviado automaticamente pela intranet.
        </p>
      </div>
    `;

    await sendEmail(EMAIL_TI, assunto, html);
    enviados++;
  }

  if (inicioHoje.length) {
    const assunto = `[TI] Início de férias HOJE (${dataBR(hoje)})`;

    const html = `
      <div style="font-family: Arial, sans-serif; font-size: 14px; color: #222;">
        <p>Bom dia,</p>

        <p>
          Colaboradores que <strong>INICIAM férias HOJE</strong>
          (<strong>${dataBR(hoje)}</strong>):
        </p>

        ${buildListaHtml(inicioHoje)}

        <p style="margin-top: 20px; color: #666;">
          Este email foi enviado automaticamente pela intranet.
        </p>
      </div>
    `;

    await sendEmail(EMAIL_TI, assunto, html);
    enviados++;
  }

  if (preVolta.length) {
    const assunto = `[TI] Em 3 dias RETORNAM de férias (${dataBR(em3Dias)})`;

    const html = `
      <div style="font-family: Arial, sans-serif; font-size: 14px; color: #222;">
        <p>Boa tarde,</p>

        <p>
          Daqui a 3 dias (<strong>${dataBR(em3Dias)}</strong>) os seguintes
          colaboradores <strong>RETORNAM de férias</strong>:
        </p>

        ${buildListaHtml(preVolta)}

        <p style="margin-top: 20px; color: #666;">
          Este email foi enviado automaticamente pela intranet.
        </p>
      </div>
    `;

    await sendEmail(EMAIL_TI, assunto, html);
    enviados++;
  }

  if (ultimoDia.length) {
    const assunto = `[TI] ÚLTIMO dia de férias, retorno amanhã: ${dataBR(amanha)}`;

    const html = `
      <div style="font-family: Arial, sans-serif; font-size: 14px; color: #222;">
        <p>Boa tarde,</p>

        <p>
          Hoje (<strong>${dataBR(hoje)}</strong>) é o
          <strong>ÚLTIMO dia de férias</strong> de:
        </p>

        ${buildListaHtml(ultimoDia)}

        <p>Retorno amanhã: <strong>${dataBR(amanha)}</strong></p>

        <p style="margin-top: 20px; color: #666;">
          Este email foi enviado automaticamente pela intranet.
        </p>
      </div>
    `;

    await sendEmail(EMAIL_TI, assunto, html);
    enviados++;
  }

  return { enviados };
}

export async function executarNotificacoesMensaisFerias(options?: {
  force?: boolean;
  origem?: "cron" | "startup" | "manual";
}) {
  const force = Boolean(options?.force);
  const origem = options?.origem || "cron";
  const { refMes } = dataRefMesSaoPaulo();

  if (!podeExecutarMensalHoje(force)) {
    console.log(
      `[FÉRIAS] Mensal ignorado (${origem}): fora da janela de envio (dia 1 a 3).`
    );
    return {
      pulado: true,
      motivo: "Fora da janela mensal (dia 1 a 3).",
      refMes,
      origem,
      rhDiretoria: { enviados: 0, pulado: true },
      gerencias: { enviados: 0, pulado: true },
    };
  }

  let rhDiretoria: any = { enviados: 0, pulado: false };
  let gerencias: any = { enviados: 0, pulado: false };

  const rhReservado = force ? true : await reservarEnvioNoMes("RH_DIRETORIA", refMes);
  const gerReservado = force ? true : await reservarEnvioNoMes("GERENCIAS", refMes);

  if (!rhReservado && !force) {
    rhDiretoria = { enviados: 0, pulado: true, motivo: "Ja enviado no mes." };
  } else {
    try {
      rhDiretoria = await enviarEmailRhDiretoria();
      if (Number(rhDiretoria?.enviados || 0) > 0 && !force) {
        await marcarEnviadoNoMes("RH_DIRETORIA", refMes);
      } else if (!force) {
        await limparReservaNoMes("RH_DIRETORIA", refMes);
      }
    } catch (error) {
      if (!force) {
        await marcarFalhaNoMes("RH_DIRETORIA", refMes, error);
      }
      throw error;
    }
  }

  if (!gerReservado && !force) {
    gerencias = { enviados: 0, pulado: true, motivo: "Ja enviado no mes." };
  } else {
    try {
      gerencias = await enviarEmailGerencias();
      if (Number(gerencias?.enviados || 0) > 0 && !force) {
        await marcarEnviadoNoMes("GERENCIAS", refMes);
      } else if (!force) {
        await limparReservaNoMes("GERENCIAS", refMes);
      }
    } catch (error) {
      if (!force) {
        await marcarFalhaNoMes("GERENCIAS", refMes, error);
      }
      throw error;
    }
  }
  return {
    pulado: false,
    refMes,
    origem,
    rhDiretoria,
    gerencias,
  };
}

export async function executarNotificacoesPreviaDia17(options?: {
  force?: boolean;
  origem?: "cron" | "startup" | "manual";
}) {
  const force = Boolean(options?.force);
  const origem = options?.origem || "cron";
  const { refMes } = dataRefMesSaoPaulo();
  const alvo = alvoDoAvisoDia17();

  if (!podeExecutarPreviaDia17Hoje(force)) {
    return {
      pulado: true,
      motivo: "Fora do dia 17.",
      refMes,
      refAlvo: alvo.refAlvo,
      origem,
      rhDiretoria: { enviados: 0, pulado: true },
      gerencias: { enviados: 0, pulado: true },
    };
  }

  const reservado = force ? true : await reservarEnvioNoMes("PREVIA_DIA17", refMes);
  if (!reservado && !force) {
    return {
      pulado: true,
      motivo: "Previa do dia 17 ja enviada neste mes.",
      refMes,
      refAlvo: alvo.refAlvo,
      origem,
      rhDiretoria: { enviados: 0, pulado: true },
      gerencias: { enviados: 0, pulado: true },
    };
  }

  try {
    const rhDiretoria = await enviarEmailPreviaRhDiretoriaDia17({
      mesAlvo: alvo.mesAlvo,
      anoAlvo: alvo.anoAlvo,
    });

    const gerencias = await enviarEmailPreviaGerenciasDia17({
      mesAlvo: alvo.mesAlvo,
      anoAlvo: alvo.anoAlvo,
    });

    const totalEnvios =
      Number(rhDiretoria?.enviados || 0) + Number(gerencias?.enviados || 0);

    if (totalEnvios > 0 && !force) {
      await marcarEnviadoNoMes("PREVIA_DIA17", refMes);
    } else if (!force) {
      await limparReservaNoMes("PREVIA_DIA17", refMes);
    }

    return {
      pulado: false,
      refMes,
      refAlvo: alvo.refAlvo,
      origem,
      rhDiretoria,
      gerencias,
    };
  } catch (error) {
    if (!force) {
      await marcarFalhaNoMes("PREVIA_DIA17", refMes, error);
    }
    throw error;
  }
}

//teste de envio de email para a TI
{/*export async function enviarEmailTiFerias() {
  const hoje = new Date();
  const em3Dias = addDias(3);
  const amanha = addDias(1);

  const preInicio = feriasFakeTeste();
  const inicioHoje = feriasFakeTeste();
  const preVolta = feriasFakeTeste();
  const ultimoDia = feriasFakeTeste();

  let enviados = 0;

  if (preInicio.length) {
    const assunto = `[TI] Em 3 dias iniciam férias (${dataBR(em3Dias)})`;

    const html = `
      <div style="font-family: Arial, sans-serif; font-size: 14px; color: #222;">
        <p>Boa tarde,</p>

        <p>
          Daqui a 3 dias (<strong>${dataBR(em3Dias)}</strong>) os seguintes
          colaboradores <strong>INICIAM férias</strong>:
        </p>

        ${buildListaHtml(preInicio)}

        <p style="margin-top: 20px; color: #666;">
          Este email foi enviado automaticamente pela intranet.
        </p>
      </div>
    `;

    await sendEmail(EMAIL_TI, assunto, html);
    enviados++;
  }

  if (inicioHoje.length) {
    const assunto = `[TI] Início de férias HOJE (${dataBR(hoje)})`;

    const html = `
      <div style="font-family: Arial, sans-serif; font-size: 14px; color: #222;">
        <p>Bom dia,</p>

        <p>
          Colaboradores que <strong>INICIAM férias HOJE</strong>
          (<strong>${dataBR(hoje)}</strong>):
        </p>

        ${buildListaHtml(inicioHoje)}

        <p style="margin-top: 20px; color: #666;">
          Este email foi enviado automaticamente pela intranet.
        </p>
      </div>
    `;

    await sendEmail(EMAIL_TI, assunto, html);
    enviados++;
  }

  if (preVolta.length) {
    const assunto = `[TI] Em 3 dias RETORNAM de férias (${dataBR(em3Dias)})`;

    const html = `
      <div style="font-family: Arial, sans-serif; font-size: 14px; color: #222;">
        <p>Boa tarde,</p>

        <p>
          Daqui a 3 dias (<strong>${dataBR(em3Dias)}</strong>) os seguintes
          colaboradores <strong>RETORNAM de férias</strong>:
        </p>

        ${buildListaHtml(preVolta)}

        <p style="margin-top: 20px; color: #666;">
          Este email foi enviado automaticamente pela intranet.
        </p>
      </div>
    `;

    await sendEmail(EMAIL_TI, assunto, html);
    enviados++;
  }

  if (ultimoDia.length) {
    const assunto = `[TI] ÚLTIMO dia de férias, retorno amanhã: ${dataBR(amanha)}`;

    const html = `
      <div style="font-family: Arial, sans-serif; font-size: 14px; color: #222;">
        <p>Boa tarde,</p>

        <p>
          Hoje (<strong>${dataBR(hoje)}</strong>) é o
          <strong>ÚLTIMO dia de férias</strong> de:
        </p>

        ${buildListaHtml(ultimoDia)}

        <p>Retorno amanhã: <strong>${dataBR(amanha)}</strong></p>

        <p style="margin-top: 20px; color: #666;">
          Este email foi enviado automaticamente pela intranet.
        </p>
      </div>
    `;

    await sendEmail(EMAIL_TI, assunto, html);
    enviados++;
  }

  return { enviados };
}*/}

export async function executarTodasNotificacoesFerias() {
  const mensal = await executarNotificacoesMensaisFerias({
    force: true,
    origem: "manual",
  });
  const ti = await enviarEmailTiFerias();

  return {
    mensal,
    ti,
  };
}
