const API_URL = process.env.NEXT_PUBLIC_API_URL;

export type MotivoOption = {
    value: string;
    label: string;
};

export async function listarMotivosResgate(): Promise<MotivoOption[]> {
    if (!API_URL) throw new Error("NEXT_PUBLIC_API_URL nao definido.");

    const res = await fetch(`${API_URL}/v1/motivo-resgate`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error || "Falha ao carregar motivos.");

    const rows = Array.isArray(json?.data) ? json.data : [];

    return rows.map((r: { NM_MOTIVO?: string }) => {
        const texto = r.NM_MOTIVO || "";
        return { value: texto, label: texto };
    });
}