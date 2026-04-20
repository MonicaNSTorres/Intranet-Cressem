/* eslint-disable @typescript-eslint/no-explicit-any */

export type ChaveRelatorioFuncionario =
  | "entrada_cooperados"
  | "conta_corrente_abertas"
  | "seguro_gerais_novo"
  | "seguro_venda_nova"
  | "seguro_rural"
  | "consorcio"
  | "saldo_previdencia_mi"
  | "saldo_previdencia_vgbl";

export type ModoPeriodoFuncionario = "semana" | "mes" | "ano";

export type RelatorioFuncionarioItem = Record<string, any>;

export type RelatorioFuncionarioDataInfo = {
  nm_tabela?: string;
  dt_carga?: string;
  dt_movimento?: string;
  ultima_insercao?: string;
  dt_ultima_insercao?: string;
  datetime?: string;
};

export const TEMAS_SOMENTE_ANO_FUNCIONARIO = new Set<ChaveRelatorioFuncionario>([]);

export const CAMPOS_COLORIR_FUNCIONARIO = new Set([
  "producao_semanal",
  "gap_semanal",
  "producao_ano",
  "perc_meta_realizada",
  "falta_para_meta",
  "porcentagem_semanal",
  "porcentagem_semana",
  "gap_vigente",
]);

export const MAPA_TEMA_PARA_TABELA_FUNCIONARIO: Record<string, string> = {
  entrada_cooperados: "CONTA_CAPITAL_DIARIO_NOVO",
  conta_corrente_abertas: "CONTA_CORRENTE_DIARIO_NOVO",
  seguro_gerais_novo: "SEGUROS_GERAIS_PRODUCAO_DIARIO",
  seguro_venda_nova: "SEGURO_VENDA_NOVA_ATUALIZADA",
  seguro_rural: "SEGUROS_RURAL_PRODUCAO_DIARIO",
  consorcio: "CONSORCIO_MENSAL_NOVO",
  saldo_previdencia_mi: "PREVIDENCIA_MI_DIARIO_NOVO",
  saldo_previdencia_vgbl: "PREVIDENCIA_VGBL_PRODUCAO_DIARIO",
};

function normalizarTexto(texto: string) {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function parseNumeroBR(valor: unknown) {
  if (valor === null || valor === undefined) return NaN;
  if (typeof valor === "number") return valor;

  let s = String(valor).trim();
  if (!s || s === "-") return NaN;

  s = s.replace(/\s/g, "").replace(/R\$/gi, "");
  s = s.replace(/%/g, "");
  s = s.replace(/\./g, "").replace(",", ".");

  const n = Number(s);
  return Number.isNaN(n) ? NaN : n;
}

export const TIPOS_RELATORIO_FUNCIONARIO_OPTIONS = [
  {
    label: "Escolher Sicoob",
    options: [
      { value: "entrada_cooperados", label: "Cooperados NOVOS" },
      { value: "conta_corrente_abertas", label: "Conta Corrente NOVAS" },
    ],
  },
  {
    label: "Proteção",
    options: [
      { value: "seguro_gerais_novo", label: "Seguro Gerais NOVOS" },
      { value: "seguro_venda_nova", label: "Seguro Vida VENDA NOVA" },
      { value: "seguro_rural", label: "Seguro Rural" },
    ],
  },
  {
    label: "Crédito / Serviços",
    options: [{ value: "consorcio", label: "Consórcio" }],
  },
  {
    label: "Investimento",
    options: [
      { value: "saldo_previdencia_mi", label: "Previdência MI" },
      { value: "saldo_previdencia_vgbl", label: "Previdência VGBL" },
    ],
  },
];

export const CONFIGURACAO_RELATORIOS_FUNCIONARIO: Record<
  ChaveRelatorioFuncionario,
  { colunas: string[]; campos: string[] }
> = {
  entrada_cooperados: {
    colunas: [
      "Funcionário",
      "Produção Semanal",
      "Meta Semanal",
      "% Semana",
      "GAP Semanal",
      "Produção Ano",
      "Meta 2026",
      "% Meta Realizada",
      "Falta Para Meta",
    ],
    campos: [
      "nm_funcionario",
      "producao_semanal",
      "meta_semanal",
      "porcentagem_semanal",
      "gap_semanal",
      "producao_ano",
      "meta_2026",
      "perc_meta_realizada",
      "falta_para_meta",
    ],
  },

  conta_corrente_abertas: {
    colunas: [
      "Funcionário",
      "Produção Semanal",
      "Meta Semanal",
      "% Semana",
      "GAP Semanal",
      "Produção Ano",
      "Meta Ano",
      "% Meta Realizada",
      "Falta Para Meta",
    ],
    campos: [
      "nm_funcionario",
      "producao_semanal",
      "meta_semanal_52",
      "porcentagem_semana",
      "gap_semanal",
      "producao_ano",
      "meta_ano",
      "perc_meta_realizada",
      "falta_para_meta",
    ],
  },

  seguro_gerais_novo: {
    colunas: [
      "Funcionário",
      "Produção Semanal",
      "Meta Semanal",
      "% Semana",
      "GAP Semanal",
      "Produção Ano",
      "Meta 2026",
      "% Meta Realizada",
      "Falta Para Meta",
    ],
    campos: [
      "nm_funcionario",
      "producao_semanal",
      "meta_semanal_52",
      "porcentagem_semana",
      "gap_semanal",
      "producao_ano",
      "meta_2026",
      "perc_meta_realizada",
      "falta_para_meta",
    ],
  },

  seguro_venda_nova: {
    colunas: [
      "Funcionário",
      "Produção Vigente",
      "Meta Vigente",
      "GAP Vigente",
      "Produção Semanal",
      "Meta Semanal",
      "% Semana",
      "GAP Semanal",
      "Produção Ano",
      "Meta 2026",
      "% Meta Realizada",
      "Falta Para Meta",
    ],
    campos: [
      "nm_funcionario",
      "producao_vigente",
      "meta_vigente",
      "gap_vigente",
      "producao_semanal",
      "meta_semanal",
      "porcentagem_semana",
      "gap_semanal",
      "producao_ano",
      "meta_2026",
      "perc_meta_realizada",
      "falta_para_meta",
    ],
  },

  seguro_rural: {
    colunas: [
      "Funcionário",
      "Produção Semanal",
      "Meta Semanal",
      "% Semana",
      "GAP Semanal",
      "Produção Ano",
      "Meta 2026",
      "% Meta Realizada",
      "Falta Para Meta",
    ],
    campos: [
      "nm_funcionario",
      "producao_semanal",
      "meta_semanal",
      "porcentagem_semana",
      "gap_semanal",
      "producao_ano",
      "meta_2026",
      "perc_meta_realizada",
      "falta_para_meta",
    ],
  },

  consorcio: {
    colunas: [
      "Funcionário",
      "Produção Semanal",
      "Meta Semanal",
      "% Semana",
      "GAP Semanal",
      "Produção Ano",
      "Meta 2026",
      "% Meta Realizada",
      "Falta Para Meta",
    ],
    campos: [
      "nm_funcionario",
      "producao_semanal",
      "meta_semanal_52",
      "porcentagem_semana",
      "gap_semanal",
      "producao_ano",
      "meta_2026",
      "perc_meta_realizada",
      "falta_para_meta",
    ],
  },

  saldo_previdencia_mi: {
    colunas: [
      "Funcionário",
      "Produção Vigente",
      "Meta Vigente",
      "GAP Vigente",
      "Produção Semanal",
      "Meta Semanal",
      "% Semana",
      "GAP Semanal",
      "Produção Ano",
      "Meta Ano",
      "% Meta Realizada",
      "Falta Para Meta",
    ],
    campos: [
      "nm_funcionario",
      "producao_vigente",
      "meta_vigente",
      "gap_vigente",
      "producao_semanal",
      "meta_semanal",
      "porcentagem_semana",
      "gap_semanal",
      "producao_ano",
      "meta_ano",
      "perc_meta_realizada",
      "falta_para_meta",
    ],
  },

  saldo_previdencia_vgbl: {
    colunas: [
      "Funcionário",
      "Produção Vigente",
      "Meta Vigente",
      "GAP Vigente",
      "Produção Semanal",
      "Meta Semanal",
      "% Semana",
      "GAP Semanal",
      "Produção Ano",
      "Meta 2026",
      "% Meta Realizada",
      "Falta Para Meta",
    ],
    campos: [
      "nm_funcionario",
      "producao_vigente",
      "meta_vigente",
      "gap_vigente",
      "producao_semanal",
      "meta_semanal_52",
      "porcentagem_semana",
      "gap_semanal",
      "producao_ano",
      "meta_2026",
      "perc_meta_realizada",
      "falta_para_meta",
    ],
  },
};

export function getConfigAjustadaPorPeriodoFuncionario(
  relatorio: ChaveRelatorioFuncionario,
  modoPeriodo: ModoPeriodoFuncionario
) {
  const configOriginal = CONFIGURACAO_RELATORIOS_FUNCIONARIO[relatorio];
  if (!configOriginal) return null;

  if (modoPeriodo !== "mes" && modoPeriodo !== "ano") {
    return configOriginal;
  }

  const pares = configOriginal.colunas.map((col, i) => ({
    col,
    campo: configOriginal.campos[i],
  }));

  const ehFuncionario = (col: string, campo: string) => {
    const tCol = normalizarTexto(String(col));
    const tCampo = normalizarTexto(String(campo));
    return tCol === "funcionario" || tCampo === "nm_funcionario";
  };

  const ehProducaoSemanal = (col: string, campo: string) => {
    const tCol = normalizarTexto(String(col));
    const tCampo = normalizarTexto(String(campo));
    return tCol === "producao semanal" || tCampo === "producao_semanal";
  };

  const ehColunaSemanal = (col: string, campo: string) => {
    const tCol = normalizarTexto(String(col));
    const tCampo = normalizarTexto(String(campo));

    return (
      tCol.includes("semanal") ||
      tCol.includes("semana") ||
      tCampo.includes("semanal") ||
      tCampo.includes("semana")
    );
  };

  if (modoPeriodo === "mes") {
    const colunaFuncionario = pares.find((p) => ehFuncionario(p.col, p.campo));
    const colunaProducao = pares.find((p) => ehProducaoSemanal(p.col, p.campo));

    const paresAjustados = [];

    if (colunaFuncionario) {
      paresAjustados.push({
        col: "Funcionário",
        campo: colunaFuncionario.campo,
      });
    }

    if (colunaProducao) {
      paresAjustados.push({
        col: "Produção Mensal",
        campo: colunaProducao.campo,
      });
    }

    return {
      ...configOriginal,
      colunas: paresAjustados.map((p) => p.col),
      campos: paresAjustados.map((p) => p.campo),
    };
  }

  const paresFiltrados = pares.filter(({ col, campo }) => {
    return !ehColunaSemanal(col, campo);
  });

  return {
    ...configOriginal,
    colunas: paresFiltrados.map((p) => p.col),
    campos: paresFiltrados.map((p) => p.campo),
  };
}