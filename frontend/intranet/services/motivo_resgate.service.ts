import { api } from "./api.service";

export type MotivoOption = {
    value: string;
    label: string;
};

type MotivoResgateApiItem = {
    NM_MOTIVO?: string;
};

type MotivosResgateResponse = {
    data?: MotivoResgateApiItem[];
};

export async function listarMotivosResgate(): Promise<MotivoOption[]> {
    const response = await api.get<MotivosResgateResponse>(
        "/v1/motivo-resgate"
    );

    const rows = Array.isArray(response.data?.data)
        ? response.data.data
        : [];

    return rows.map((item) => {
        const texto = String(item.NM_MOTIVO || "").trim();

        return {
            value: texto,
            label: texto,
        };
    });
}