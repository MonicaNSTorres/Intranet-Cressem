import axios from "axios";
import { registrarErroTela } from "./error_log.service";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const api = axios.create({
    baseURL: API_URL,
    withCredentials: true,
    timeout: 30000,
});

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        try {
            await registrarErroTela({
                PAGE_URL:
                    typeof window !== "undefined" ? window.location.href : null,

                ERROR_MESSAGE:
                    error?.response?.data?.error ||
                    error?.response?.data?.message ||
                    error?.response?.data?.details ||
                    error?.message ||
                    "Erro no service de estoque de consumíveis",

                ERROR_STACK: error?.stack || null,

                ERROR_DETAIL: {
                    status: error?.response?.status,
                    url: error?.config?.url,
                    baseURL: error?.config?.baseURL,
                    method: error?.config?.method,
                    responseData: error?.response?.data,
                },

                SOURCE: "ESTOQUE_CONSUMIVEIS_AXIOS",
            });
        } catch {
            //evita loop infinito
        }

        return Promise.reject(error);
    }
);

export async function listarItensEstoqueConsumiveis() {
    const { data } = await api.get("/v1/estoque-consumiveis/itens");
    return data;
}

export async function listarSolicitacoesEstoqueGlpi() {
    const { data } = await api.get("/v1/estoque-consumiveis/solicitacoes-glpi");
    return data;
}

export async function sincronizarSolicitacaoEstoqueGlpi(payload: {
    idChamadoGlpi: number;
    nomeItemSolicitado: string;
    quantidadeSolicitada: number;
    nomeSolicitante?: string;
    nomeSetor?: string;
    descricaoGlpi?: string;
    dataSolicitacao?: string;
}) {
    const { data } = await api.post(
        "/v1/estoque-consumiveis/solicitacoes-glpi/sincronizar",
        payload
    );
    return data;
}

export async function darBaixaSolicitacaoEstoque(
    idSolicitacao: number,
    payload: {
        idItem: number;
        quantidadeAtendida: number;
        observacao?: string;
        usuarioAtendimento: string;
    }
) {
    const { data } = await api.post(
        `/v1/estoque-consumiveis/solicitacoes-glpi/${idSolicitacao}/baixa`,
        payload
    );
    return data;
}

export async function lancarEntradaEstoque(payload: {
    idItem: number;
    quantidade: number;
    observacao?: string;
    usuario: string;
}) {
    const { data } = await api.post(
        "/v1/estoque-consumiveis/entrada",
        payload
    );
    return data;
}

export async function buscarBalancoMensalEstoque(ano: number, mes: number) {
    const { data } = await api.get(
        "/v1/estoque-consumiveis/balanco-mensal",
        {
            params: { ano, mes },
        }
    );
    return data;
}

export async function sincronizarChamadosReaisGlpi() {
    const { data } = await api.post(
        "/v1/estoque-consumiveis/solicitacoes-glpi/sincronizar-real",
        {}
    );
    return data;
}

export async function responderManualSolicitacaoEstoque(
    idSolicitacao: number,
    payload: {
        idItem?: number | null;
        quantidadeAtendida?: number;
        resposta: string;
        usuarioAtendimento: string;
        statusGlpi: number;
    }
) {
    const { data } = await api.post(
        `/v1/estoque-consumiveis/solicitacoes-glpi/${idSolicitacao}/resposta-manual`,
        payload
    );

    return data;
}

export async function criarItemEstoqueConsumiveis(payload: {
    nome: string;
    descricao?: string;
    unidade: string;
    saldoAtual?: number;
    saldoMinimo?: number;
}) {
    const { data } = await api.post(
        "/v1/estoque-consumiveis/itens",
        payload
    );

    return data;
}

export async function importarProdutosExcelEstoque(file: File) {
    const formData = new FormData();
    formData.append("file", file);

    const { data } = await api.post(
        "/v1/estoque-consumiveis/importar-excel",
        formData,
        {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        }
    );

    return data;
}

export async function listarAlertasEmailEstoque() {
    const { data } = await api.get(
        "/v1/estoque-consumiveis/alertas-email"
    );

    return data;
}

export async function buscarPainelGlpiEstoque() {
    const { data } = await api.get("/v1/estoque-consumiveis/painel-glpi");

    return data;
}

export async function registrarSaidaManualComGlpi(payload: {
    idItem: number;
    quantidade: number;
    nomeSolicitante: string;
    nomeSetor?: string | null;
    observacao?: string | null;
    usuarioAtendimento: string;
}) {
    const { data } = await api.post(
        "/v1/estoque-consumiveis/saida-manual-glpi",
        payload
    );

    return data;
}

export async function listarMovimentacoesMensaisEstoque(ano: number, mes: number) {
    const { data } = await api.get(
        "/v1/estoque-consumiveis/movimentacoes-mensais",
        {
            params: { ano, mes },
        }
    );

    return data;
}

export async function atualizarItemEstoqueConsumiveis(
    idItem: number,
    payload: {
        nome: string;
        descricao?: string;
        unidade: string;
        saldoMinimo?: number;
    }
) {
    const { data } = await api.put(
        `/v1/estoque-consumiveis/itens/${idItem}`,
        payload
    );

    return data;
}