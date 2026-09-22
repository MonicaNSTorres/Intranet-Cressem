import { api } from "./api.service";

export async function listarItensEstoqueConsumiveis() {
    const { data } = await api.get(
        "/v1/estoque-consumiveis/itens"
    );

    return data;
}

export async function listarSolicitacoesEstoqueGlpi() {
    const { data } = await api.get(
        "/v1/estoque-consumiveis/solicitacoes-glpi"
    );

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

export async function buscarBalancoMensalEstoque(
    ano: number,
    mes: number
) {
    const { data } = await api.get(
        "/v1/estoque-consumiveis/balanco-mensal",
        {
            params: {
                ano,
                mes,
            },
        }
    );

    return data;
}

export async function sincronizarChamadosReaisGlpi() {
    const { data } = await api.post(
        "/v1/estoque-consumiveis/solicitacoes-glpi/sincronizar-real",
        {},
        {
            timeout: 30000,
        }
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

export async function importarProdutosExcelEstoque(
    file: File
) {
    const formData = new FormData();

    formData.append("file", file);

    const { data } = await api.post(
        "/v1/estoque-consumiveis/importar-excel",
        formData,
        {
            timeout: 60000,
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
    const { data } = await api.get(
        "/v1/estoque-consumiveis/painel-glpi"
    );

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
        payload,
        {
            timeout: 30000,
        }
    );

    return data;
}

export async function listarMovimentacoesMensaisEstoque(
    ano: number,
    mes: number
) {
    const { data } = await api.get(
        "/v1/estoque-consumiveis/movimentacoes-mensais",
        {
            params: {
                ano,
                mes,
            },
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

export async function darBaixaItemSolicitacaoEstoque(
    idSolicitacaoItem: number,
    payload: {
        idItem: number;
        quantidadeAtendida: number;
        observacao?: string;
        usuarioAtendimento: string;
    }
) {
    const { data } = await api.post(
        `/v1/estoque-consumiveis/solicitacoes-glpi/itens/${idSolicitacaoItem}/baixa`,
        payload
    );

    return data;
}