import axios from "axios";
import { registrarErroTela } from "./error_log.service";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const api = axios.create({
    baseURL: API_URL,
    withCredentials: true,
    timeout: 60000,
});

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        try {
            await registrarErroTela({
                PAGE_URL:
                    typeof window !== "undefined"
                        ? window.location.href
                        : null,
                ERROR_MESSAGE:
                    error?.response?.data?.error ||
                    error?.response?.data?.details ||
                    error?.message ||
                    "Erro desconhecido",
                ERROR_STACK: error?.stack || null,
                SOURCE: "cnab240.service.ts",
            });
        } catch (e) {
            console.error("Erro ao registrar log:", e);
        }

        return Promise.reject(error);
    }
);

export type FavorecidoCnab = {
    CPF: string;
    IDCLIENTE?: string | null;
    BANCO: string;
    AGENCIA: string;
    CONTA: string;
    DV_CONTA: string;
    NOME: string;
    ENDERECO?: string | null;
    NUMERO?: string | null;
    COMPLEMENTO?: string | null;
    BAIRRO?: string | null;
    CEP?: string | null;
    CEP_COMPLEMENTO?: string | null;
    CIDADE?: string | null;
    UF?: string | null;
    CONTA_ATIVA?: string | null;
};

export type TransferenciaCnabPayload = {
    sequencia: number;
    cpfCnpj: string;
    banco: string;
    agencia: string;
    conta: string;
    dvConta: string;
    nome: string;
    valor: number;
    tipo: 1 | 2;
    descricao: string;
};

export type RemessaCnab = {
    ID_REMESSA: number;
    NM_ARQUIVO: string;
    DT_GERACAO: string;
    QT_PAGAMENTOS: number;
    VL_TOTAL: number;
    STATUS: string;
};

export async function buscarFavorecidoPorCpf(
    cpf: string
): Promise<FavorecidoCnab> {
    const cpfLimpo = cpf.replace(/\D/g, "");

    const response = await api.get(`/v1/cnab240/favorecido/${cpfLimpo}`);

    return response.data;
}

export async function listarRemessas(): Promise<RemessaCnab[]> {
    const response = await api.get("/v1/cnab240/remessas");

    return Array.isArray(response.data) ? response.data : [];
}

/**
 * Temporário:
 * ainda usa Excel enquanto não criamos o endpoint novo por JSON.
 */
export async function gerarCnab240PorExcel(file: File): Promise<Blob> {
    const formData = new FormData();
    formData.append("file", file, file.name);

    const response = await fetch(`${API_URL}/v1/cnab240/gerar`, {
        method: "POST",
        body: formData,
        credentials: "include",
    });

    if (!response.ok) {
        const error = await response.json().catch(() => null);

        throw new Error(
            error?.details ||
            error?.error ||
            "Erro ao gerar CNAB240."
        );
    }

    return await response.blob();
}

/**
 * Próxima etapa:
 * vamos criar esse endpoint no backend para gerar pela tela.
 */
export async function gerarCnab240PorTransferencias(
    transferencias: TransferenciaCnabPayload[]
): Promise<Blob> {
    const response = await api.post(
        "/v1/cnab240/gerar-transferencias",
        { transferencias },
        {
            responseType: "blob",
        }
    );

    return response.data;
}

export async function importarRetorno(file: File): Promise<any> {
    const formData = new FormData();
    formData.append("file", file, file.name);

    const response = await fetch(`${API_URL}/v1/cnab240/importar-retorno`, {
        method: "POST",
        body: formData,
        credentials: "include",
    });

    if (!response.ok) {
        const error = await response.json().catch(() => null);

        throw new Error(
            error?.details ||
            error?.error ||
            "Erro ao importar retorno."
        );
    }

    return await response.json();
}