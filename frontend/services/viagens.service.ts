import { api } from "./api.service";
import { getAuditoriaHeaders } from "@/utils/auditoria-headers";

export type TipoViagem = "IDA_VOLTA" | "SOMENTE_IDA";
export type StatusViagem = "PENDENTE_CONSELHO" | "APROVADA" | "REPROVADA";

export type PerfilViagens = {
  NM_USUARIO: string;
  IS_CONSELHO: boolean;
  IS_SUPORTE: boolean;
};

export type FuncionarioViagem = {
  ID_FUNCIONARIO: number;
  NM_FUNCIONARIO: string;
};

export type MotoristaViagem = FuncionarioViagem;

export type AcompanhanteViagem = {
  ID_FUNCIONARIO: number;
  NM_ACOMPANHANTE?: string;
  NM_FUNCIONARIO?: string;
};

export type ViagemItem = {
  ID_VIAGEM: number;
  NM_SOLICITANTE: string;
  DS_LOGIN_SOLICITANTE: string;
  DS_DEPARTAMENTO?: string | null;
  TP_VIAGEM: TipoViagem;
  DT_IDA: string;
  DT_VOLTA?: string | null;
  SN_MOTORISTA_AGUARDA?: "S" | "N" | null;
  ID_FUNCIONARIO_MOTORISTA: number;
  DS_DESTINO: string;
  NM_MOTORISTA?: string | null;
  ST_VIAGEM: StatusViagem;
  NM_ACOMPANHANTES?: string | null;
  NM_APROVADOR?: string | null;
  DS_MOTIVO_REPROVACAO?: string | null;
};

export type ViagemDetalhe = ViagemItem & {
  ACOMPANHANTES: Array<{ ID_FUNCIONARIO: number; NM_ACOMPANHANTE: string }>;
};

export type IndisponibilidadeMotorista = Pick<
  ViagemItem,
  "ID_VIAGEM" | "DS_DESTINO" | "DT_IDA" | "DT_VOLTA" | "TP_VIAGEM" | "ST_VIAGEM"
>;

export async function obterPerfilViagens() {
  const { data } = await api.get<PerfilViagens>("/v1/viagens/meu-perfil");
  return data;
}

export async function pesquisarFuncionariosViagem(busca: string) {
  const { data } = await api.get<{ items: FuncionarioViagem[] }>("/v1/viagens/funcionarios", {
    params: { busca },
  });
  return Array.isArray(data?.items) ? data.items : [];
}

export async function listarMotoristasViagem() {
  const { data } = await api.get<{ items: MotoristaViagem[] }>("/v1/viagens/motoristas");
  return Array.isArray(data?.items) ? data.items : [];
}

export async function consultarDisponibilidadeMotorista(params: {
  id_funcionario_motorista: number;
  tipo_viagem: TipoViagem;
  dt_ida: string;
  dt_volta?: string | null;
  sn_motorista_aguarda?: "S" | "N" | null;
}) {
  const { data } = await api.get<{ DISPONIVEL: boolean; items: IndisponibilidadeMotorista[] }>(
    "/v1/viagens/disponibilidade-motorista",
    { params }
  );
  return { disponivel: Boolean(data?.DISPONIVEL), items: data?.items || [] };
}

export async function criarViagem(payload: {
  TP_VIAGEM: TipoViagem;
  DT_IDA: string;
  DT_VOLTA?: string | null;
  SN_MOTORISTA_AGUARDA?: "S" | "N" | null;
  DS_DESTINO: string;
  ID_FUNCIONARIO_MOTORISTA: number;
  ACOMPANHANTES: Array<{ ID_FUNCIONARIO: number }>;
}) {
  const { data } = await api.post("/v1/viagens", payload, { headers: getAuditoriaHeaders() });
  return data;
}

export async function listarViagens(params: {
  page?: number;
  limit?: number;
  status?: StatusViagem | "";
  solicitante?: string;
  periodo_inicio?: string;
  periodo_fim?: string;
}) {
  const { data } = await api.get<{
    items: ViagemItem[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  }>("/v1/viagens", { params });
  return data;
}

export async function buscarViagem(id: number) {
  const { data } = await api.get<ViagemDetalhe>(`/v1/viagens/${id}`);
  return data;
}

export async function listarViagensPendentes() {
  const { data } = await api.get<{ items: ViagemItem[] }>("/v1/viagens/pendentes");
  return Array.isArray(data?.items) ? data.items : [];
}

export async function decidirViagem(
  id: number,
  payload: { ACAO: "APROVADA" | "REPROVADA"; DS_MOTIVO_REPROVACAO?: string }
) {
  const { data } = await api.put(`/v1/viagens/${id}/decisao`, payload, {
    headers: getAuditoriaHeaders(),
  });
  return data;
}
