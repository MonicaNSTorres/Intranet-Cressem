import { api } from "./api.service";

export type FatorRco = {
    VL_RETORNO?: number;
    vl_retorno?: number;
};

type ListarOrigensRcoResponse = {
    data?: string[];
};

type BuscarValorBaseRcoResponse = {
    data?: FatorRco;
};

type ProcessarRcoResponse = {
    processamento_rco?: string | number;
};

export async function listarOrigensRco(): Promise<string[]> {
    const { data } = await api.get<ListarOrigensRcoResponse>(
        "/v1/rco/origens"
    );

    return Array.isArray(data?.data)
        ? data.data
        : [];
}

export async function buscarValorBaseRco(
    origem: string,
    valor: number
): Promise<FatorRco> {
    const { data } = await api.get<BuscarValorBaseRcoResponse>(
        "/v1/rco/buscar",
        {
            params: {
                origem,
                valor,
            },
        }
    );

    return data?.data || {};
}

export async function processarRco(
    dataOperacao: string,
    dataUltima: string,
    rco: number,
    dataHoje: string
): Promise<number> {
    const { data } = await api.post<ProcessarRcoResponse>(
        "/v1/rco/processar",
        {
            data_operacao: dataOperacao,
            data_ultima: dataUltima,
            rco,
            data_hoje: dataHoje,
        }
    );

    return Number(data?.processamento_rco ?? 0);
}