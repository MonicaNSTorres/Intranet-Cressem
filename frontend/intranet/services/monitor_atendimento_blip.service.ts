import { api } from "./api.service";

export type MonitorAtendimentoBlipParams = {
  dataInicio?: string;
  dataFim?: string;
  gravidade?: "TODAS" | "CRITICA" | "ALTA" | "BAIXA";
  tipo?: "TODOS" | "PRIMEIRA_RESPOSTA" | "ESPERA_FILA";
  gerente?: string;
  agente?: string;
  fila?: string;
  statusAtendimento?: string;
  evento?: string;
  minutosMin?: number;
  busca?: string;
  incluirNormal?: "S" | "N";
  page?: number;
  limit?: number;
};

export type MonitorAtendimentoBlipItem = {
  TIPO_MONITOR: string;
  ID_ORIGEM: string;
  TICKET_ID: string;
  SEQUENTIAL_ID: number | null;
  PARENT_SEQUENTIAL_ID: number | null;
  CUSTOMER_NAME: string;
  CUSTOMER_IDENTITY: string | null;
  AGENT_IDENTITY: string | null;
  RESPONSAVEL: string | null;
  GERENTE: string | null;
  FILA_ORIGEM: string | null;
  FILA_DESTINO: string | null;
  CAMPAIGN_ID: string | null;
  STATUS_ATENDIMENTO: string | null;
  DATA_ABERTURA: string | null;
  MINUTOS: number;
  DATA_EVENTO: string;
  EVENT_TYPE: string | null;
  OBSERVACOES: string | null;
  GRAVIDADE: string;
};

export type MonitorAtendimentoBlipRankingFuncionario = {
  RESPONSAVEL: string;
  GERENTE: string;
  QTD_ALERTAS: number;
  QTD_CRITICOS: number;
  QTD_ALTOS: number;
  QTD_BAIXOS: number;
  MEDIA_MINUTOS: number;
  MAIOR_ESPERA: number;
};

export type MonitorAtendimentoBlipRankingFila = {
  FILA: string;
  GERENTE: string;
  QTD_ALERTAS: number;
  QTD_CRITICOS: number;
  QTD_ALTOS: number;
  QTD_BAIXOS: number;
  MEDIA_MINUTOS: number;
  MAIOR_ESPERA: number;
};

export type MonitorAtendimentoBlipRankingGerente = {
  GERENTE: string;
  QTD_ALERTAS: number;
  QTD_CRITICOS: number;
  QTD_ALTOS: number;
  QTD_BAIXOS: number;
  MEDIA_MINUTOS: number;
  MAIOR_ESPERA: number;
};

export type MonitorAtendimentoBlipResponse = {
  items: MonitorAtendimentoBlipItem[];
  total: number;
  total_pages: number;
  page: number;
  limit: number;
  resumo: {
    total: number;
    criticos: number;
    altos: number;
    baixos: number;
    primeira_resposta: number;
    espera_fila: number;
    alertas_email: number;
    transferencias: number;
    tickets: number;
    media_minutos: number;
    maior_espera: number;
  };
  ranking_funcionarios: MonitorAtendimentoBlipRankingFuncionario[];
  ranking_filas: MonitorAtendimentoBlipRankingFila[];
  ranking_gerentes: MonitorAtendimentoBlipRankingGerente[];
};

export async function listarMonitorAtendimentoBlip(
  params: MonitorAtendimentoBlipParams
) {
  const response = await api.get<MonitorAtendimentoBlipResponse>(
    "/v1/monitor-atendimento-blip",
    {
      params,
      timeout: 30000,
    }
  );

  return response.data;
}
