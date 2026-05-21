import axios from "axios";

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL,
    withCredentials: true,
    timeout: 15000,
});

type UsuarioLogado = {
    username?: string;
    nome_completo?: string;
    email?: string;
    department?: string;
};

let usuarioCache: UsuarioLogado | null = null;

async function buscarUsuarioLogado() {
    if (usuarioCache) return usuarioCache;

    try {
        const response = await api.get("/v1/me");
        usuarioCache = response.data || null;
        return usuarioCache;
    } catch {
        return null;
    }
}

export type ErrorLogPayload = {
    USERNAME?: string | null;
    NOME_COMPLETO?: string | null;
    EMAIL?: string | null;
    DEPARTMENT?: string | null;
    PAGE_URL?: string | null;
    ERROR_MESSAGE: string;
    ERROR_STACK?: string | null;
    ERROR_DETAIL?: unknown;
    SOURCE?: string;
};

export async function registrarErroTela(payload: ErrorLogPayload) {
    try {
        const user = await buscarUsuarioLogado();

        await api.post("/v1/error-logs", {
            USERNAME: payload.USERNAME || user?.username || null,
            NOME_COMPLETO: payload.NOME_COMPLETO || user?.nome_completo || null,
            EMAIL: payload.EMAIL || user?.email || null,
            DEPARTMENT: payload.DEPARTMENT || user?.department || null,

            PAGE_URL: payload.PAGE_URL || null,
            ERROR_MESSAGE: payload.ERROR_MESSAGE,
            ERROR_STACK: payload.ERROR_STACK || null,
            ERROR_DETAIL: payload.ERROR_DETAIL || null,
            SOURCE: payload.SOURCE || "FRONTEND",
        });
    } catch {
        //evita loop infinito caso o log falhe
    }
}

export async function buscarUsuarioLogadoParaErro() {
    return buscarUsuarioLogado();
}