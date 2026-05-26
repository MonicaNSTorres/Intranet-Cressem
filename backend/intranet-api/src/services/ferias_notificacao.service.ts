import oracledb from "oracledb";
import { oracleExecute } from "./oracle.service";
import { sendEmail } from "./email.service";
import fs from "fs/promises";
import os from "os";
import path from "path";

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

type TipoNotificacaoMensal = "RH_DIRETORIA" | "GERENCIAS";

const FERIAS_CONTROLE_PATH = path.join(
  os.tmpdir(),
  "intranet-ferias-notificacoes.json"
);

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

async function readControleMensal() {
  try {
    const raw = await fs.readFile(FERIAS_CONTROLE_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

async function writeControleMensal(data: Record<string, string>) {
  await fs.writeFile(FERIAS_CONTROLE_PATH, JSON.stringify(data, null, 2), "utf8");
}

function chaveControle(tipo: TipoNotificacaoMensal, refMes: string) {
  return `${tipo}:${refMes}`;
}

async function jaEnviadoNoMes(tipo: TipoNotificacaoMensal, refMes: string) {
  const controle = await readControleMensal();
  return Boolean(controle[chaveControle(tipo, refMes)]);
}

async function marcarEnviadoNoMes(tipo: TipoNotificacaoMensal, refMes: string) {
  const controle = await readControleMensal();
  controle[chaveControle(tipo, refMes)] = new Date().toISOString();
  await writeControleMensal(controle);
}

function podeExecutarMensalHoje(force = false) {
  if (force) return true;
  const { diaDoMes } = dataRefMesSaoPaulo();
  return diaDoMes >= 1 && diaDoMes <= 3;
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

  const rhJaEnviado = await jaEnviadoNoMes("RH_DIRETORIA", refMes);
  const gerJaEnviado = await jaEnviadoNoMes("GERENCIAS", refMes);

  let rhDiretoria: any = { enviados: 0, pulado: false };
  let gerencias: any = { enviados: 0, pulado: false };

  if (rhJaEnviado && !force) {
    rhDiretoria = { enviados: 0, pulado: true, motivo: "Já enviado no mês." };
  } else {
    rhDiretoria = await enviarEmailRhDiretoria();
    if (Number(rhDiretoria?.enviados || 0) > 0) {
      await marcarEnviadoNoMes("RH_DIRETORIA", refMes);
    }
  }

  if (gerJaEnviado && !force) {
    gerencias = { enviados: 0, pulado: true, motivo: "Já enviado no mês." };
  } else {
    gerencias = await enviarEmailGerencias();
    if (Number(gerencias?.enviados || 0) > 0) {
      await marcarEnviadoNoMes("GERENCIAS", refMes);
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
