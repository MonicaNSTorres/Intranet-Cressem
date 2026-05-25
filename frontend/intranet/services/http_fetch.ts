import { registrarErroTela } from "./error_log.service";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

type ApiFetchOptions = RequestInit & {
  source?: string;
  errorMessage?: string;
};

export async function apiFetch(path: string, options: ApiFetchOptions = {}) {
  if (!API_URL) {
    throw new Error("NEXT_PUBLIC_API_URL não definido");
  }

  const { source, errorMessage, ...fetchOptions } = options;

  try {
    const res = await fetch(`${API_URL}${path}`, {
      credentials: "include",
      cache: "no-store",
      ...fetchOptions,
      headers: {
        ...(fetchOptions.body instanceof FormData
          ? {}
          : { "Content-Type": "application/json" }),
        ...(fetchOptions.headers || {}),
      },
    });

    return res;
  } catch (error: any) {
    await registrarErroTela({
      PAGE_URL: typeof window !== "undefined" ? window.location.href : null,
      ERROR_MESSAGE:
        error?.message || errorMessage || "Erro em requisição da intranet",
      ERROR_STACK: error?.stack || null,
      ERROR_DETAIL: {
        path,
        method: fetchOptions.method || "GET",
      },
      SOURCE: source || "FETCH_ERROR",
    });

    throw error;
  }
}

export async function tratarErroResponse(
  res: Response,
  fallbackMessage: string,
  source: string
) {
  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message = json?.error || json?.details || fallbackMessage;

    await registrarErroTela({
      PAGE_URL: typeof window !== "undefined" ? window.location.href : null,
      ERROR_MESSAGE: message,
      ERROR_STACK: null,
      ERROR_DETAIL: {
        status: res.status,
        statusText: res.statusText,
        url: res.url,
        responseData: json,
      },
      SOURCE: source,
    });

    throw new Error(message);
  }

  return json;
}