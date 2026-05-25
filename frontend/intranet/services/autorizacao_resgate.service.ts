import { registrarErroTela } from "./error_log.service";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export type AutorizacaoOption = {
    value: string;
    label: string;
};

export async function listarAutorizacaoResgate(): Promise<AutorizacaoOption[]> {
    try {
        if (!API_URL) {
            throw new Error("NEXT_PUBLIC_API_URL nao definido.");
        }

        const res = await fetch(`${API_URL}/v1/autorizacao-resgate`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            cache: "no-store",
        });

        const json = await res.json().catch(() => ({}));

        if (!res.ok) {
            throw new Error(
                json?.error || "Falha ao carregar Autorizações."
            );
        }

        const rows = Array.isArray(json?.data) ? json.data : [];

        return rows.map((r: { NM_AUTORIZADO?: string }) => {
            const texto = r.NM_AUTORIZADO || "";

            return {
                value: texto,
                label: texto,
            };
        });
    } catch (error: any) {
        await registrarErroTela({
            PAGE_URL:
                typeof window !== "undefined"
                    ? window.location.href
                    : null,

            ERROR_MESSAGE:
                error?.message ||
                "Erro ao listar autorizações de resgate",

            ERROR_STACK: error?.stack || null,

            ERROR_DETAIL: {
                endpoint: "/v1/autorizacao-resgate",
                method: "GET",
            },

            SOURCE: "AUTORIZACAO_RESGATE",
        });

        throw error;
    }
}