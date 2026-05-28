import { sendEmail } from "./email.service";
import { oracleExecute, oracleExecuteCommit, oracleExecuteManyCommit } from "./oracle.service";

type GenericRow = Record<string, unknown>;

type RegistrarMonitorParams = {
  tela: string;
  tema: string;
  periodo: string;
  fonte: string;
  dtFimPeriodo: string;
  rows: GenericRow[];
};

const SQL_INSERT_CARGA = `
  INSERT INTO DBACRESSEM.MONITOR_META_CARGA (
    DT_EXECUCAO,
    NM_TEMA,
    NM_FONTE,
    QTD_LINHAS,
    QTD_DISTINTAS,
    DT_MAX,
    NM_STATUS,
    NM_DETALHES
  ) VALUES (
    SYSDATE,
    :nm_tema,
    :nm_fonte,
    :qtd_linhas,
    :qtd_distintas,
    TO_DATE(:dt_max, 'DD/MM/YYYY'),
    :nm_status,
    :nm_detalhes
  )
`;

const SQL_INSERT_RESULTADO = `
  INSERT INTO DBACRESSEM.MONITOR_META_RESULTADO (
    DT_EXECUCAO,
    NM_TELA,
    NM_TEMA,
    DT_PERIODO,
    CV_ENTIDADE,
    NM_JSON,
    NM_STATUS,
    NM_DETALHES
  ) VALUES (
    SYSDATE,
    :nm_tela,
    :nm_tema,
    :dt_periodo,
    :cv_entidade,
    :nm_json,
    :nm_status,
    :nm_detalhes
  )
`;

const SQL_INSERT_ALERTA = `
  INSERT INTO DBACRESSEM.MONITOR_META_ALERTA (
    DT_EXECUCAO,
    NM_GRAVIDADE,
    NM_REGRA,
    NM_ENTIDADE,
    VL_ENCONTRADO,
    VL_ESPERADO,
    SN_RESOLVIDO,
    NM_OBSERVACAO
  )
  SELECT
    SYSDATE,
    :nm_gravidade,
    :nm_regra,
    :nm_entidade,
    :vl_encontrado,
    :vl_esperado,
    0,
    :nm_observacao
  FROM DUAL
  WHERE NOT EXISTS (
    SELECT 1
    FROM DBACRESSEM.MONITOR_META_ALERTA A
    WHERE A.SN_RESOLVIDO = 0
      AND A.NM_REGRA = :nm_regra
      AND A.NM_ENTIDADE = :nm_entidade
      AND NVL(A.VL_ENCONTRADO, ' ') = NVL(:vl_encontrado, ' ')
      AND NVL(A.VL_ESPERADO, ' ') = NVL(:vl_esperado, ' ')
      AND NVL(A.NM_OBSERVACAO, ' ') = NVL(:nm_observacao, ' ')
  )
`;

type VariacaoDetectada = {
  entidade: string;
  metrica: string;
  valorAtual: number;
  valorAnterior: number;
  variacaoPerc: number;
  gravidade: "BAIXA" | "MEDIA" | "ALTA" | "CRITICA";
  ordemAlfabetica?: string;
};

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function maskEntityForEmail(entity: string): string {
  if (!entity.startsWith("CPF:")) return entity;
  const digits = entity.replace(/\D/g, "");
  if (digits.length < 4) return "CPF:***";
  return `CPF:***${digits.slice(-4)}`;
}

function normalizeEntityKey(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim().toUpperCase();
}

function buildEntityKey(row: GenericRow, idx: number): string {
  const numeroPa = normalizeEntityKey(row.numero_pa);
  if (numeroPa) return `PA:${numeroPa}`;

  const cpf = normalizeEntityKey(row.cpf_funcionario ?? row.nr_cpf_responsavel_cadastro);
  if (cpf) return `CPF:${cpf}`;

  const nome = normalizeEntityKey(row.nm_funcionario);
  if (nome) return `FUNC:${nome}`;

  return `LINHA:${idx + 1}`;
}

function distinctEntityCount(rows: GenericRow[]) {
  const keys = new Set<string>();
  rows.forEach((row, idx) => keys.add(buildEntityKey(row, idx)));
  return keys.size;
}

function toNumberSafe(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : NaN;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return NaN;
    const normalized = trimmed.replace(/\./g, "").replace(",", ".");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : NaN;
  }
  return NaN;
}

function getAlertThresholdPerc() {
  const raw = String(process.env.MONITOR_META_ALERT_LIMITE_PERC || "").trim();
  const parsed = Number(raw);
  if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  return 15;
}

function isMonitorAlertEnabled() {
  const raw = String(process.env.MONITOR_META_ALERT_ENABLED || "true")
    .trim()
    .toLowerCase();
  return !["0", "false", "off", "no", "disabled"].includes(raw);
}

function getMonitorAlertRecipients() {
  const configured = String(process.env.MONITOR_META_ALERT_EMAIL_TO || "").trim();
  if (configured) {
    return configured
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return ["marcelo.bueno@sicoob.com.br"];
}

function parseBrDate(value: string): Date | null {
  const raw = String(value || "").trim();
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(raw);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const parsed = new Date(year, month - 1, day);

  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  parsed.setHours(0, 0, 0, 0);
  return parsed;
}

function getInicioSemanaAtual() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const day = now.getDay(); // 0 domingo ... 6 sábado
  const diffToMonday = day === 0 ? -6 : 1 - day;
  now.setDate(now.getDate() + diffToMonday);
  return now;
}

function deveMonitorarPeriodo(dtFimPeriodo: string) {
  const dtFim = parseBrDate(dtFimPeriodo);
  if (!dtFim) return false;
  const inicioSemanaAtual = getInicioSemanaAtual();
  // Monitora somente períodos finalizados antes da semana atual.
  return dtFim < inicioSemanaAtual;
}

function calcularVariacaoPercentual(atual: number, anterior: number) {
  if (anterior === 0) {
    if (atual === 0) return 0;
    return 100;
  }
  return Math.abs(((atual - anterior) / Math.abs(anterior)) * 100);
}

function houveAlteracaoReal(atual: number, anterior: number) {
  return Math.abs(atual - anterior) > 1e-9;
}

function calcularGravidade(variacaoPerc: number): VariacaoDetectada["gravidade"] {
  if (variacaoPerc >= 50) return "CRITICA";
  if (variacaoPerc >= 30) return "ALTA";
  if (variacaoPerc >= 15) return "MEDIA";
  return "BAIXA";
}

function compareEntidade(a: string, b: string) {
  const paA = /^PA:(\d+)$/.exec(a);
  const paB = /^PA:(\d+)$/.exec(b);

  if (paA && paB) {
    return Number(paA[1]) - Number(paB[1]);
  }

  if (paA) return -1;
  if (paB) return 1;

  return a.localeCompare(b);
}

function getOrdemAlfabeticaFuncionario(row: GenericRow): string | null {
  const nome = normalizeEntityKey(row.nm_funcionario);
  if (nome) return nome;
  return null;
}

function getMetricKey(row: GenericRow): string | null {
  const candidates = [
    "producao_semanal",
    "feito_no_mes_vigente",
    "producao_mensal",
    "producao_vigente",
  ];

  for (const key of candidates) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== "") {
      return key;
    }
  }
  return null;
}

async function buscarValoresAnteriores(
  tela: string,
  tema: string,
  periodo: string,
  entidades: string[],
  metrica: string
) {
  if (!entidades.length) return new Map<string, number>();
  if (!/^[A-Za-z0-9_]+$/.test(metrica)) return new Map<string, number>();

  const bindNames = entidades.map((_, idx) => `:ent_${idx}`);
  const binds: Record<string, string> = {
    nm_tela: tela,
    nm_tema: tema,
    dt_periodo: periodo,
  };
  entidades.forEach((value, idx) => {
    binds[`ent_${idx}`] = value;
  });

  const jsonPath = `$.${metrica}`;

  const sql = `
    SELECT
      X.CV_ENTIDADE,
      JSON_VALUE(
        X.NM_JSON,
        '${jsonPath}'
        RETURNING NUMBER
        NULL ON EMPTY
        NULL ON ERROR
      ) AS VALOR_ANTERIOR
    FROM (
      SELECT
        R.CV_ENTIDADE,
        R.NM_JSON,
        ROW_NUMBER() OVER (
          PARTITION BY R.CV_ENTIDADE
          ORDER BY R.DT_EXECUCAO DESC, R.ID_MONITOR_META_RESULTADO DESC
        ) AS RN
      FROM DBACRESSEM.MONITOR_META_RESULTADO R
      WHERE R.NM_TELA = :nm_tela
        AND R.NM_TEMA = :nm_tema
        AND R.DT_PERIODO = :dt_periodo
        AND R.CV_ENTIDADE IN (${bindNames.join(", ")})
    ) X
    WHERE X.RN = 1
  `;

  const result = await oracleExecute(sql, binds, {});
  const output = new Map<string, number>();

  for (const row of (result.rows || []) as Array<any>) {
    const entidade = normalizeEntityKey(row.CV_ENTIDADE);
    const valor = toNumberSafe(row.VALOR_ANTERIOR);
    if (entidade && !Number.isNaN(valor)) {
      output.set(entidade, valor);
    }
  }

  return output;
}

function montarHtmlAlerta(
  tela: string,
  tema: string,
  periodo: string,
  variacoes: VariacaoDetectada[]
) {
  const variacoesOrdenadas = [...variacoes].sort((a, b) => {
    if (a.ordemAlfabetica && b.ordemAlfabetica) {
      const byNome = a.ordemAlfabetica.localeCompare(b.ordemAlfabetica);
      if (byNome !== 0) return byNome;
    }

    const byEntidade = compareEntidade(a.entidade, b.entidade);
    if (byEntidade !== 0) return byEntidade;
    return a.metrica.localeCompare(b.metrica);
  });

  const linhas = variacoesOrdenadas
    .slice(0, 40)
    .map(
      (item) =>
        `<tr>
          <td style="padding:6px;border:1px solid #ddd;">${escapeHtml(maskEntityForEmail(item.entidade))}</td>
          <td style="padding:6px;border:1px solid #ddd;">${escapeHtml(item.metrica)}</td>
          <td style="padding:6px;border:1px solid #ddd;">${escapeHtml(item.valorAnterior)}</td>
          <td style="padding:6px;border:1px solid #ddd;">${escapeHtml(item.valorAtual)}</td>
          <td style="padding:6px;border:1px solid #ddd;">${escapeHtml(item.variacaoPerc.toFixed(2))}%</td>
          <td style="padding:6px;border:1px solid #ddd;">${escapeHtml(item.gravidade)}</td>
        </tr>`
    )
    .join("");

  return `
    <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#222;">
      <h3 style="margin:0 0 10px;">Alerta de Monitoramento de Metas</h3>
      <p style="margin:0 0 6px;"><strong>Tela:</strong> ${escapeHtml(tela)}</p>
      <p style="margin:0 0 6px;"><strong>Tema:</strong> ${escapeHtml(tema)}</p>
      <p style="margin:0 0 14px;"><strong>Período:</strong> ${escapeHtml(periodo)}</p>
      <table style="border-collapse:collapse;width:100%;font-size:13px;">
        <thead>
          <tr style="background:#f2f2f2;">
            <th style="padding:6px;border:1px solid #ddd;text-align:left;">Entidade</th>
            <th style="padding:6px;border:1px solid #ddd;text-align:left;">Métrica</th>
            <th style="padding:6px;border:1px solid #ddd;text-align:left;">Anterior</th>
            <th style="padding:6px;border:1px solid #ddd;text-align:left;">Atual</th>
            <th style="padding:6px;border:1px solid #ddd;text-align:left;">Variação</th>
            <th style="padding:6px;border:1px solid #ddd;text-align:left;">Gravidade</th>
          </tr>
        </thead>
        <tbody>
          ${linhas}
        </tbody>
      </table>
      <p style="margin-top:12px;color:#666;">Total de alertas nesta execução: ${variacoes.length}</p>
    </div>
  `;
}

async function processarAlertasVariacao(
  tela: string,
  tema: string,
  periodo: string,
  rows: GenericRow[],
  dtFimPeriodo: string
) {
  if (!isMonitorAlertEnabled()) return;
  if (!deveMonitorarPeriodo(dtFimPeriodo)) return;

  const limite = getAlertThresholdPerc();
  const maxRows = 500;
  const rowsToCheck = rows.slice(0, maxRows);

  const candidatosPorMetrica = new Map<
    string,
    Array<{ entidade: string; valorAtual: number; ordemAlfabetica?: string }>
  >();

  rowsToCheck.forEach((row, idx) => {
    const entidade = buildEntityKey(row, idx);
    const metrica = getMetricKey(row);
    if (!metrica) return;

    const valorAtual = toNumberSafe(row[metrica]);
    if (Number.isNaN(valorAtual)) return;
    const ordemAlfabetica = getOrdemAlfabeticaFuncionario(row) || undefined;

    const lista = candidatosPorMetrica.get(metrica) || [];
    lista.push({ entidade, valorAtual, ordemAlfabetica });
    candidatosPorMetrica.set(metrica, lista);
  });

  const variacoesInseridas: VariacaoDetectada[] = [];

  for (const [metrica, candidatos] of candidatosPorMetrica.entries()) {
    const anteriores = await buscarValoresAnteriores(
      tela,
      tema,
      periodo,
      candidatos.map((item) => item.entidade),
      metrica
    );

    for (const candidato of candidatos) {
      const valorAnterior = anteriores.get(candidato.entidade);
      if (valorAnterior === undefined) continue;

      if (!houveAlteracaoReal(candidato.valorAtual, valorAnterior)) continue;

      const variacaoPerc = calcularVariacaoPercentual(candidato.valorAtual, valorAnterior);
      if (variacaoPerc <= limite) continue;

      const gravidade = calcularGravidade(variacaoPerc);
      const observacao =
        `Tela=${tela};Tema=${tema};Periodo=${periodo};` +
        `Metrica=${metrica};Variacao=${variacaoPerc.toFixed(2)}%`;

      const insertResult = await oracleExecuteCommit(
        SQL_INSERT_ALERTA,
        {
          nm_gravidade: gravidade,
          nm_regra: `VARIACAO_${metrica.toUpperCase()}`,
          nm_entidade: candidato.entidade,
          vl_encontrado: String(candidato.valorAtual),
          vl_esperado: String(valorAnterior),
          nm_observacao: observacao,
        },
        {}
      );

      if ((insertResult.rowsAffected || 0) > 0) {
        variacoesInseridas.push({
          entidade: candidato.entidade,
          metrica,
          valorAtual: candidato.valorAtual,
          valorAnterior,
          variacaoPerc,
          gravidade,
          ordemAlfabetica: candidato.ordemAlfabetica,
        });
      }
    }
  }

  if (!variacoesInseridas.length) return;

  const recipients = getMonitorAlertRecipients();
  if (!recipients.length) return;

  const subject = `[ALERTA MONITOR META] ${tema} - ${tela} - ${variacoesInseridas.length} ocorrência(s)`;
  const html = montarHtmlAlerta(tela, tema, periodo, variacoesInseridas);

  await sendEmail(recipients, subject, html);
}

export async function registrarMonitorMeta(params: RegistrarMonitorParams) {
  const rows = params.rows ?? [];
  const qtdLinhas = rows.length;
  const qtdDistintas = distinctEntityCount(rows);

  await oracleExecuteCommit(
    SQL_INSERT_CARGA,
    {
      nm_tema: params.tema,
      nm_fonte: params.fonte,
      qtd_linhas: qtdLinhas,
      qtd_distintas: qtdDistintas,
      dt_max: params.dtFimPeriodo,
      nm_status: "OK",
      nm_detalhes: `Registros monitorados: ${qtdLinhas}`,
    },
    {}
  );

  if (!qtdLinhas) return;

  const binds = rows.map((row, idx) => ({
    nm_tela: params.tela,
    nm_tema: params.tema,
    dt_periodo: params.periodo,
    cv_entidade: buildEntityKey(row, idx),
    nm_json: JSON.stringify(row),
    nm_status: "OK",
    nm_detalhes: null,
  }));

  try {
    await processarAlertasVariacao(
      params.tela,
      params.tema,
      params.periodo,
      rows,
      params.dtFimPeriodo
    );
  } catch (alertErr) {
    console.error("[MONITOR_META] Falha ao processar alertas de variação:", alertErr);
  }

  await oracleExecuteManyCommit(SQL_INSERT_RESULTADO, binds, {});
}
