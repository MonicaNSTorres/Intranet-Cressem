const API_URL = process.env.NEXT_PUBLIC_API_URL;

export type AutorizacaoOption = {
    value: string;
    label: string;
};

export async function listarAutorizacaoResgate(): Promise<AutorizacaoOption[]> {
    if (!API_URL) throw new Error("NEXT_PUBLIC_API_URL nao definido.");

    const res = await fetch(`${API_URL}/v1/autorizacao-resgate`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error || "Falha ao carregar Autorizações.");

    const rows = Array.isArray(json?.data) ? json.data : [];

    return rows.map((r: { NM_AUTORIZADO?: string }) => {
        const texto = r.NM_AUTORIZADO || "";
        return { value: texto, label: texto };
    });
}
