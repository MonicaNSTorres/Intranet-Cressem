import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
});

export type PopupAviso = {
  ID_POPUP: number;
  TITULO: string;
  MENSAGEM: string;
  BOTAO_ACEITAR: string;
  BOTAO_RECUSAR: string;
  OBRIGATORIO: "S" | "N";
  ST_ATIVO?: "S" | "N";
  EXIBIR_APOS_LOGIN?: "S" | "N";
  DT_INICIO?: string | null;
  DT_FIM?: string | null;
  IMAGEM_BASE64?: string | null;
};

export async function buscarPopupPendenteMe() {
  const { data } = await api.get("/v1/popup-aviso/pendente/me");
  return data as {
    temPopupPendente: boolean;
    popup: PopupAviso | null;
  };
}

export async function responderPopupAviso(payload: {
  idPopup: number;
  resposta: "ACEITO" | "RECUSADO";
}) {
  const { data } = await api.post("/v1/popup-aviso/responder", payload);
  return data;
}

export async function listarPopupsAviso() {
  const { data } = await api.get("/v1/popup-aviso");
  return data;
}

export async function buscarPopupAvisoPorId(id: number) {
  const { data } = await api.get(`/v1/popup-aviso/${id}`);
  return data;
}

export async function criarPopupAviso(payload: any) {
  const { data } = await api.post("/v1/popup-aviso", payload);
  return data;
}

export async function editarPopupAviso(id: number, payload: any) {
  const { data } = await api.put(`/v1/popup-aviso/${id}`, payload);
  return data;
}

export async function ativarPopupAviso(id: number, stAtivo: "S" | "N") {
  const { data } = await api.patch(`/v1/popup-aviso/${id}/ativar`, { stAtivo });
  return data;
}