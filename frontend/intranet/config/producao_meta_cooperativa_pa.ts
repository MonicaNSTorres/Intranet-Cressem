/* eslint-disable @typescript-eslint/no-explicit-any */

export type ChaveRelatorioPA =
  | "entrada_cooperados"
  | "saldo_cooperados"
  | "conta_corrente_abertas"
  | "conta_corrente_ativas"
  | "portabilidade"
  | "volume_transacoes"
  | "liquidacao_baixa"
  | "faturamento_sipag"
  | "seguro_gerais_novo"
  | "seguro_gerais_renovado"
  | "seguro_venda_nova"
  | "seguro_arrecadação"
  | "consorcio"
  | "emprestimo_bancoob"
  | "saldo_previdencia_mi"
  | "saldo_previdencia_vgbl"
  | "carteira_credito_rural"
  | "conta_poupanca"
  | "seguro_rural";

export type ModoPeriodoPA = "semana" | "mes" | "ano";

export type RelatorioItem = Record<string, any>;

export type RelatorioDataInfo = {
  nm_tabela?: string;
  dt_carga?: string;
  dt_movimento?: string;
};

export const TEMAS_SOMENTE_ANO = new Set<ChaveRelatorioPA>([
  "conta_corrente_ativas",
  "portabilidade",
  "saldo_cooperados",
]);

export const CAMPOS_COLORIR = new Set([
  "producao_semanal",
  "gap_semanal",
  "producao_ano",
  "perc_meta_realizada",
  "falta_para_meta",
  "porcentagem_semanal",
]);

export const MAPA_TEMA_PARA_TABELA: Record<string, string> = {
  volume_transacoes: "VOLUME_TRANSACOES_DIARIO",
  faturamento_sipag: "FATURAMENTO_SIPAG_DIARIO",
  seguro_arrecadação: "ANALITICO_SEGUROS_ARRECADACAO",
  seguro_venda_nova: "ANALITICO_SEGUROS_VENDA_NOVA",
  seguro_rural: "SEGUROS_GERAIS_PRODUCAO_DIARIO",
  consorcio: "CONSORCIO_MENSAL_NOVO",
  portabilidade: "PORTABILIDADE_DIARIO",
  saldo_previdencia_mi: "PREVIDENCIA_MI_DIARIO_NOVO",
  saldo_previdencia_vgbl: "PREVIDENCIA_VGBL_PRODUCAO_DIARIO",
  seguro_gerais_novo: "SEGUROS_GERAIS_PRODUCAO_DIARIO",
  seguro_gerais_renovado: "SEGUROS_GERAIS_PRODUCAO_DIARIO",
  conta_corrente_ativas: "CONTA_CORRENTE_DIARIO_NOVO",
  conta_corrente_abertas: "CONTA_CORRENTE_DIARIO_NOVO",
  entrada_cooperados: "CONTA_CAPITAL_DIARIO_NOVO",
  saldo_cooperados: "CONTA_CAPITAL_DIARIO_NOVO",
  conta_poupanca: "CONTA_CAPITAL_DIARIO_NOVO",
  emprestimo_bancoob: "CARTAO_CREDITO_BANCOOB_DIARIO",
  liquidacao_baixa: "MOVIMENTO_LIQUIDACOES_BAIXA",
  carteira_credito_rural: "CARTEIRA_CREDITO_DIARIO",
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

export const TIPOS_RELATORIO_OPTIONS = [
  {
    label: "Escolher Sicoob",
    options: [
      { value: "entrada_cooperados", label: "Cooperados NOVOS" },
      { value: "saldo_cooperados", label: "Cooperados SALDO" },
      { value: "conta_corrente_abertas", label: "Conta Corrente NOVAS" },
      { value: "conta_corrente_ativas", label: "Conta Corrente SALDO" },
      { value: "portabilidade", label: "Portabilidade" },
    ],
  },
  {
    label: "Recebimentos e Pagamentos",
    options: [
      { value: "volume_transacoes", label: "Cartões" },
      { value: "liquidacao_baixa", label: "Cobrança" },
      { value: "faturamento_sipag", label: "Sipag" },
    ],
  },
  {
    label: "Proteção",
    options: [
      { value: "seguro_gerais_novo", label: "Seguro Gerais NOVOS" },
      { value: "seguro_gerais_renovado", label: "Seguro Gerais RENOVAÇÕES" },
      { value: "seguro_venda_nova", label: "Seguro Vida VENDA NOVA" },
      { value: "seguro_arrecadação", label: "Seguro Vida ARRECADAÇÃO" },
    ],
  },
  {
    label: "Crédito / Serviços",
    options: [
      { value: "consorcio", label: "Consórcio" },
      { value: "emprestimo_bancoob", label: "Empréstimo CCS" },
    ],
  },
  {
    label: "Investimento",
    options: [
      { value: "saldo_previdencia_mi", label: "Previdência MI" },
      { value: "saldo_previdencia_vgbl", label: "Previdência VGBL" },
    ],
  },
];

export const CONFIGURACAO_RELATORIOS: Record<
  ChaveRelatorioPA,
  { colunas: string[]; campos: string[] }
> = {
  volume_transacoes: {
    colunas: [
      "Numero PA",
      "Nome PA",
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
      "numero_pa",
      "nome_pa",
      "producao_semanal",
      "meta_semanal_ano",
      "porcentagem_semanal",
      "gap_semanal",
      "producao_ano",
      "meta_2026",
      "perc_meta_realizada",
      "falta_para_meta",
    ],
  },

  faturamento_sipag: {
    colunas: [
      "Numero PA",
      "Nome PA",
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
      "numero_pa",
      "nome_pa",
      "producao_semanal",
      "meta_semanal_ano",
      "porcentagem_semanal",
      "gap_semanal",
      "producao_ano",
      "meta_2026",
      "perc_meta_realizada",
      "falta_para_meta",
    ],
  },

  seguro_arrecadação: {
    colunas: [
      "Numero PA",
      "Nome PA",
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
      "numero_pa",
      "nome_pa",
      "producao_semanal",
      "meta_semanal_ano",
      "porcentagem_semanal",
      "gap_semanal",
      "producao_ano",
      "meta_2026",
      "perc_meta_realizada",
      "falta_para_meta",
    ],
  },

  seguro_gerais_novo: {
    colunas: [
      "Numero PA",
      "Nome PA",
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
      "numero_pa",
      "nome_pa",
      "producao_semanal",
      "meta_semanal_ano",
      "porcentagem_semanal",
      "gap_semanal",
      "producao_ano",
      "meta_2026",
      "perc_meta_realizada",
      "falta_para_meta",
    ],
  },

  seguro_gerais_renovado: {
    colunas: [
      "Numero PA",
      "Nome PA",
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
      "numero_pa",
      "nome_pa",
      "producao_semanal",
      "meta_semanal_ano",
      "porcentagem_semanal",
      "gap_semanal",
      "producao_ano",
      "meta_2026",
      "perc_meta_realizada",
      "falta_para_meta",
    ],
  },

  seguro_rural: {
    colunas: [
      "Numero PA",
      "Nome PA",
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
      "numero_pa",
      "nome_pa",
      "producao_semanal",
      "meta_semanal_ano",
      "porcentagem_semanal",
      "gap_semanal",
      "producao_ano",
      "meta_2026",
      "perc_meta_realizada",
      "falta_para_meta",
    ],
  },

  liquidacao_baixa: {
    colunas: [
      "Numero PA",
      "Nome PA",
      "Produção Semanal",
      "Meta Semanal",
      "GAP Semanal",
      "Produção Ano",
      "Meta 2026",
      "% Meta Realizada",
      "Falta Para Meta",
    ],
    campos: [
      "numero_pa",
      "nome_pa",
      "producao_semanal",
      "meta_semanal_ano",
      "gap_semanal",
      "producao_ano",
      "meta_2026",
      "perc_meta_realizada",
      "falta_para_meta",
    ],
  },

  consorcio: {
    colunas: [
      "Numero PA",
      "Nome PA",
      "Produção Semanal",
      "% Semana",
      "GAP Semanal",
      "Produção Ano",
      "Meta Semanal",
      "Meta 2026",
      "% Meta Realizada",
      "Falta Para Meta",
    ],
    campos: [
      "numero_pa",
      "nome_pa",
      "producao_semanal",
      "porcentagem_semanal",
      "gap_semanal",
      "producao_ano",
      "meta_semanal_ano",
      "meta_2026",
      "perc_meta_realizada",
      "falta_para_meta",
    ],
  },

  carteira_credito_rural: {
    colunas: [
      "Numero PA",
      "Nome PA",
      "Produção Semanal",
      "Meta Semanal",
      "% Semana",
      "GAP Semanal",
      "Produção Ano",
      "Meta Ano",
      "% Ano",
      "GAP Ano",
    ],
    campos: [
      "numero_pa",
      "nome_pa",
      "premio_liquido_semanal",
      "meta_semanal",
      "perc_semana",
      "gap_semanal",
      "premio_liquido_ano",
      "meta_ano",
      "perc_ano",
      "gap_ano",
    ],
  },

  entrada_cooperados: {
    colunas: [
      "Numero PA",
      "Nome PA",
      "Produção Semanal",
      "Meta Semanal",
      "% Semanal",
      "GAP Semanal",
      "Produção Ano",
      "Meta 2026",
      "% Meta Realizada",
      "Falta Para Meta",
    ],
    campos: [
      "numero_pa",
      "nome_pa",
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

  saldo_cooperados: {
    colunas: [
      "Numero PA",
      "Nome PA",
      "Feito no mês vigente",
      "Meta 2026",
      "% Meta Realizada",
      "Falta Para Meta",
    ],
    campos: [
      "numero_pa",
      "nome_pa",
      "feito_no_mes_vigente",
      "meta_2026",
      "perc_meta_realizada",
      "falta_para_meta",
    ],
  },

  saldo_previdencia_mi: {
    colunas: [
      "Numero PA",
      "Nome PA",
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
      "numero_pa",
      "nome_pa",
      "producao_semanal",
      "meta_semanal_ano",
      "porcentagem_semanal",
      "gap_semanal",
      "producao_ano",
      "meta_2026",
      "perc_meta_realizada",
      "falta_para_meta",
    ],
  },

  saldo_previdencia_vgbl: {
    colunas: [
      "Numero PA",
      "Nome PA",
      "Produção Semanal",
      "% Semana",
      "GAP Semanal",
      "Produção Ano",
      "Meta 2026",
      "% Meta Realizada",
      "Falta Para Meta",
    ],
    campos: [
      "numero_pa",
      "nome_pa",
      "producao_semanal",
      "porcentagem_semanal",
      "gap_semanal",
      "producao_ano",
      "meta_2026",
      "perc_meta_realizada",
      "falta_para_meta",
    ],
  },

  seguro_venda_nova: {
    colunas: [
      "Numero PA",
      "Nome PA",
      "Produção Semanal",
      "% Semana",
      "GAP Semanal",
      "Meta Semanal",
      "Produção Ano",
      "Meta 2026",
      "% Meta Realizada",
      "Falta Para Meta",
    ],
    campos: [
      "numero_pa",
      "nome_pa",
      "producao_semanal",
      "porcentagem_semanal",
      "gap_semanal",
      "meta_semanal_ano",
      "producao_ano",
      "meta_2026",
      "perc_meta_realizada",
      "falta_para_meta",
    ],
  },

  portabilidade: {
    colunas: [
      "Numero PA",
      "Nome PA",
      "Produção Semanal",
      "Meta Semanal",
      "GAP Semanal",
      "Produção Ano",
      "Meta Ano",
      "% Meta Realizada",
      "Falta Para Meta",
    ],
    campos: [
      "numero_pa",
      "nome_pa",
      "producao_semanal",
      "meta_semanal_ano",
      "gap_semanal",
      "producao_ano",
      "meta_ano",
      "perc_meta_realizada",
      "falta_para_meta",
    ],
  },

  conta_corrente_abertas: {
    colunas: [
      "Numero PA",
      "Nome PA",
      "Produção Semanal",
      "Meta Semanal",
      "GAP Semanal",
      "Produção Ano",
      "Meta Ano",
      "% Meta Realizada",
      "Falta Para Meta",
    ],
    campos: [
      "numero_pa",
      "nome_pa",
      "producao_semanal",
      "meta_semanal",
      "gap_semanal",
      "producao_ano",
      "meta_ano",
      "perc_meta_realizada",
      "falta_para_meta",
    ],
  },

  conta_corrente_ativas: {
    colunas: [
      "Numero PA",
      "Nome PA",
      "Produção Semanal",
      "Meta Semanal",
      "GAP Semanal",
      "Produção Ano",
      "Meta Ano",
      "% Meta Realizada",
      "Falta Para Meta",
    ],
    campos: [
      "numero_pa",
      "nome_pa",
      "producao_semanal",
      "meta_semanal",
      "gap_semanal",
      "producao_ano",
      "meta_ano",
      "perc_meta_realizada",
      "falta_para_meta",
    ],
  },

  emprestimo_bancoob: {
    colunas: [
      "Numero PA",
      "Nome PA",
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
      "numero_pa",
      "nome_pa",
      "producao_semanal",
      "meta_semanal_ano",
      "porcentagem_semanal",
      "gap_semanal",
      "producao_ano",
      "meta_2026",
      "perc_meta_realizada",
      "falta_para_meta",
    ],
  },

  conta_poupanca: {
    colunas: [
      "Numero PA",
      "Nome PA",
      "Produção Semanal",
      "Meta Semanal",
      "GAP Semanal",
      "Produção Ano",
      "Meta 2026",
      "% Meta Realizada",
      "Falta Para Meta",
    ],
    campos: [
      "numero_pa",
      "nome_pa",
      "producao_semanal",
      "meta_semanal_ano",
      "gap_semanal",
      "producao_ano",
      "meta_2026",
      "perc_meta_realizada",
      "falta_para_meta",
    ],
  },
};

export function getConfigAjustadaPorPeriodo(
  relatorio: ChaveRelatorioPA,
  modoPeriodo: ModoPeriodoPA
) {
  const configOriginal = CONFIGURACAO_RELATORIOS[relatorio];
  if (!configOriginal) return null;

  if (modoPeriodo !== "mes" && modoPeriodo !== "ano") {
    return configOriginal;
  }

  const pares = configOriginal.colunas.map((col, i) => ({
    col,
    campo: configOriginal.campos[i],
  }));

  const ehNumeroPA = (campo: string) => {
    const tCampo = normalizarTexto(String(campo));
    return tCampo === "numero_pa" || tCampo === "nr_pa";
  };

  const ehNomePA = (campo: string) => {
    const tCampo = normalizarTexto(String(campo));
    return tCampo === "nome_pa";
  };

  const ehProducao = (col: string, campo: string) => {
    const tCol = normalizarTexto(String(col));
    const tCampo = normalizarTexto(String(campo));

    return (
      tCol.includes("producao semanal") ||
      tCampo === "producao_semanal" ||
      tCampo === "premio_liquido_semanal"
    );
  };

  if (modoPeriodo === "mes") {
    const colunaNumeroPA = pares.find((p) => ehNumeroPA(p.campo));
    const colunaNomePA = pares.find((p) => ehNomePA(p.campo));
    const colunaProducao = pares.find((p) => ehProducao(p.col, p.campo));

    const paresAjustados = [];

    if (colunaNumeroPA) {
      paresAjustados.push({
        col: "Numero PA",
        campo: colunaNumeroPA.campo,
      });
    }

    if (colunaNomePA) {
      paresAjustados.push({
        col: "Nome PA",
        campo: colunaNomePA.campo,
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

  if (modoPeriodo === "ano") {
    const paresFiltrados = pares.filter(({ col, campo }) => {
      const tCol = normalizarTexto(String(col));
      const tCampo = normalizarTexto(String(campo));

      const ehSemanal =
        tCol.includes("semanal") ||
        tCol.includes("semana") ||
        tCampo.includes("semanal") ||
        tCampo.includes("semana");

      return !ehSemanal;
    });

    return {
      ...configOriginal,
      colunas: paresFiltrados.map((p) => p.col),
      campos: paresFiltrados.map((p) => p.campo),
    };
  }

  return configOriginal;
}