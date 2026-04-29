import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function listarItensEstoqueConsumiveis() {
    const { data } = await axios.get(`${API_URL}/v1/estoque-consumiveis/itens`, {
        withCredentials: true,
    });
    return data;
}

export async function listarSolicitacoesEstoqueGlpi() {
    const { data } = await axios.get(`${API_URL}/v1/estoque-consumiveis/solicitacoes-glpi`, {
        withCredentials: true,
    });
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
    const { data } = await axios.post(
        `${API_URL}/v1/estoque-consumiveis/solicitacoes-glpi/sincronizar`,
        payload,
        { withCredentials: true }
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
    const { data } = await axios.post(
        `${API_URL}/v1/estoque-consumiveis/solicitacoes-glpi/${idSolicitacao}/baixa`,
        payload,
        { withCredentials: true }
    );
    return data;
}

export async function lancarEntradaEstoque(payload: {
    idItem: number;
    quantidade: number;
    observacao?: string;
    usuario: string;
}) {
    const { data } = await axios.post(
        `${API_URL}/v1/estoque-consumiveis/entrada`,
        payload,
        { withCredentials: true }
    );
    return data;
}

export async function buscarBalancoMensalEstoque(ano: number, mes: number) {
    const { data } = await axios.get(
        `${API_URL}/v1/estoque-consumiveis/balanco-mensal`,
        {
            params: { ano, mes },
            withCredentials: true,
        }
    );
    return data;
}

export async function sincronizarChamadosReaisGlpi() {
    const { data } = await axios.post(
        `${API_URL}/v1/estoque-consumiveis/solicitacoes-glpi/sincronizar-real`,
        {},
        { withCredentials: true }
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
    const { data } = await axios.post(
        `${API_URL}/v1/estoque-consumiveis/solicitacoes-glpi/${idSolicitacao}/resposta-manual`,
        payload,
        { withCredentials: true }
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
    const { data } = await axios.post(
        `${API_URL}/v1/estoque-consumiveis/itens`,
        payload,
        { withCredentials: true }
    );

    return data;
}

export async function importarProdutosExcelEstoque(file: File) {
    const formData = new FormData();
    formData.append("file", file);

    const { data } = await axios.post(
        `${API_URL}/v1/estoque-consumiveis/importar-excel`,
        formData,
        {
            withCredentials: true,
            headers: {
                "Content-Type": "multipart/form-data",
            },
        }
    );

    return data;
}

export async function listarAlertasEmailEstoque() {
    const { data } = await axios.get(
        `${API_URL}/v1/estoque-consumiveis/alertas-email`,
        { withCredentials: true }
    );

    return data;
}

export async function buscarPainelGlpiEstoque() {
    const { data } = await axios.get(`${API_URL}/v1/estoque-consumiveis/painel-glpi`, {
        withCredentials: true,
    });

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
    const { data } = await axios.post(
        `${API_URL}/v1/estoque-consumiveis/saida-manual-glpi`,
        payload,
        { withCredentials: true }
    );

    return data;
}