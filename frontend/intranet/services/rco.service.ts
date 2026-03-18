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

export async function listarOrigensRco(): Promise<string[]> {
    ensureApiUrl();

    const res = await fetch(`${API_URL}/v1/rco/origens`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
        throw new Error(json?.error || "Falha ao listar origens de RCO.");
    }

    // esperado: { data: ["PUBLICO", "PRIVADO"] }
    return (json?.data || []) as string[];
}

export async function buscarValorBaseRco(
    origem: string,
    valor: number
): Promise<FatorRco> {
    ensureApiUrl();

    const res = await fetch(
        `${API_URL}/v1/rco/buscar?origem=${encodeURIComponent(origem)}&valor=${valor}`,
        {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            cache: "no-store",
        }
    );

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
        throw new Error(json?.error || "Falha ao buscar valor base de RCO.");
    }

    // esperado: { data: { VL_RETORNO: ... } }
    return (json?.data || {}) as FatorRco;
}

export async function processarRco(
    dataOperacao: string,
    dataUltima: string,
    rco: number,
    dataHoje: string
): Promise<number> {
    ensureApiUrl();

    const res = await fetch(`${API_URL}/v1/rco/processar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

    // esperado: { processamento_rco: "123.45" }
    return Number(json?.processamento_rco ?? 0);
}
