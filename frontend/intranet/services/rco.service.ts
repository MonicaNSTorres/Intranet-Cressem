import { registrarErroTela } from "./error_log.service";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

type FatorRco = {
    VL_RETORNO?: number;
    vl_retorno?: number;
};

function ensureApiUrl() {
    if (!API_URL) {
        throw new Error("NEXT_PUBLIC_API_URL nao definido no .env do front");
    }
}

async function registrarErroRco(
    error: any,
    detail: Record<string, any>,
    source: string
) {
    await registrarErroTela({
        PAGE_URL:
            typeof window !== "undefined" ? window.location.href : null,

        ERROR_MESSAGE:
            error?.message || "Erro no service de RCO",

        ERROR_STACK: error?.stack || null,

        ERROR_DETAIL: detail,

        SOURCE: source,
    });
}

export async function listarOrigensRco(): Promise<string[]> {
    try {
        ensureApiUrl();

        const res = await fetch(`${API_URL}/v1/rco/origens`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            cache: "no-store",
        });

        const json = await res.json().catch(() => ({}));

        if (!res.ok) {
            throw new Error(json?.error || "Falha ao listar origens de RCO.");
        }

        //esperado: { data: ["PUBLICO", "PRIVADO"] }
        return (json?.data || []) as string[];
    } catch (error: any) {
        await registrarErroRco(
            error,
            {
                endpoint: "/v1/rco/origens",
                method: "GET",
            },
            "RCO_LISTAR_ORIGENS"
        );

        throw error;
    }
}

export async function buscarValorBaseRco(
    origem: string,
    valor: number
): Promise<FatorRco> {
    try {
        ensureApiUrl();

        const res = await fetch(
            `${API_URL}/v1/rco/buscar?origem=${encodeURIComponent(origem)}&valor=${valor}`,
            {
                method: "GET",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                cache: "no-store",
            }
        );

        const json = await res.json().catch(() => ({}));

        if (!res.ok) {
            throw new Error(json?.error || "Falha ao buscar valor base de RCO.");
        }

        //esperado: { data: { VL_RETORNO: ... } }
        return (json?.data || {}) as FatorRco;
    } catch (error: any) {
        await registrarErroRco(
            error,
            {
                endpoint: "/v1/rco/buscar",
                method: "GET",
                origem,
                valor,
            },
            "RCO_BUSCAR_VALOR_BASE"
        );

        throw error;
    }
}

export async function processarRco(
    dataOperacao: string,
    dataUltima: string,
    rco: number,
    dataHoje: string
): Promise<number> {
    try {
        ensureApiUrl();

        const res = await fetch(`${API_URL}/v1/rco/processar`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            cache: "no-store",
            body: JSON.stringify({
                data_operacao: dataOperacao,
                data_ultima: dataUltima,
                rco,
                data_hoje: dataHoje,
            }),
        });

        const json = await res.json().catch(() => ({}));

        if (!res.ok) {
            throw new Error(json?.error || "Falha ao processar RCO.");
        }

        //esperado: { processamento_rco: "123.45" }
        return Number(json?.processamento_rco ?? 0);
    } catch (error: any) {
        await registrarErroRco(
            error,
            {
                endpoint: "/v1/rco/processar",
                method: "POST",
                dataOperacao,
                dataUltima,
                rco,
                dataHoje,
            },
            "RCO_PROCESSAR"
        );

        throw error;
    }
}