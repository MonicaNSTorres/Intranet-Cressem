import { registrarErroTela } from "./error_log.service";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export type MotivoOption = {
    value: string;
    label: string;
};

async function registrarErroMotivoResgate(
    error: any,
    detail: Record<string, any>,
    source: string
) {
    await registrarErroTela({
        PAGE_URL:
            typeof window !== "undefined" ? window.location.href : null,

        ERROR_MESSAGE:
            error?.message || "Erro no service de motivo resgate",

        ERROR_STACK: error?.stack || null,

        ERROR_DETAIL: detail,

        SOURCE: source,
    });
}

export async function listarMotivosResgate(): Promise<MotivoOption[]> {
    try {
        if (!API_URL) {
            throw new Error("NEXT_PUBLIC_API_URL nao definido.");
        }

        const res = await fetch(`${API_URL}/v1/motivo-resgate`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            cache: "no-store",
        });

        const json = await res.json().catch(() => ({}));

        if (!res.ok) {
            throw new Error(json?.error || "Falha ao carregar motivos.");
        }

        const rows = Array.isArray(json?.data) ? json.data : [];

        return rows.map((r: { NM_MOTIVO?: string }) => {
            const texto = r.NM_MOTIVO || "";
            return { value: texto, label: texto };
        });
    } catch (error: any) {
        await registrarErroMotivoResgate(
            error,
            {
                endpoint: "/v1/motivo-resgate",
                method: "GET",
            },
            "MOTIVO_RESGATE_LISTAR"
        );

        throw error;
    }
}