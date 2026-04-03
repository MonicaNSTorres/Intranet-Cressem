const API_URL = process.env.NEXT_PUBLIC_API_URL;

export type CidadeCressemOption = {
    value: string;
    label: string;
};

export async function listarCidadesCressem(): Promise<CidadeCressemOption[]> {
    if (!API_URL) throw new Error("NEXT_PUBLIC_API_URL nao definido.");

    const res = await fetch(`${API_URL}/v1/cidades-cressem`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error || "Falha ao carregar cidades.");

    // esperado: { data: [{ nome: "SAO JOSE DOS CAMPOS" }, ...] }
    const rows = Array.isArray(json?.data) ? json.data : [];
    return rows.map((r: { NM_CIDADE?: string }) => ({
        value: r.NM_CIDADE || "",
        label: r.NM_CIDADE || "",
    }));
}
