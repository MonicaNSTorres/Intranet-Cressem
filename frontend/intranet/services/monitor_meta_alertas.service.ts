import axios from "axios";
import { getAuditoriaHeaders } from "@/utils/auditoria-headers";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
  timeout: 30000,
});

export type StatusAlertaMeta = "aberto" | "resolvido" | "todos";

export type MonitorMetaAlerta = {
  id_alerta: string;
  dt_execucao: string;
  nm_gravidade: string | null;
  nm_regra: string | null;
  nm_entidade: string | null;
  vl_encontrado: string | null;
  vl_esperado: string | null;
  sn_resolvido: number;
  nm_observacao: string | null;
};

export type MonitorMetaAlertasResponse = {
  items: MonitorMetaAlerta[];
  total: number;
  total_pages: number;
  page: number;
  limit: number;
  resumo: {
    total: number;
    abertos: number;
    resolvidos: number;
  };
};

export async function listarMonitorMetaAlertas(params: {
  status?: StatusAlertaMeta;
  tela?: string;
  tema?: string;
  gravidade?: string;
  entidade?: string;
  page?: number;
  limit?: number;
}) {
  const response = await api.get<MonitorMetaAlertasResponse>(
    "/v1/monitor-meta-alertas",
    { params }
  );

  return response.data;
}

export async function resolverMonitorMetaAlerta(id: string) {
  const response = await api.patch(
    "/v1/monitor-meta-alertas/resolver",
    { id_alerta: id },
    {
      headers: getAuditoriaHeaders(),
    }
  );

  return response.data;
}
