const API_URL = process.env.NEXT_PUBLIC_API_URL;

function getApiUrl() {
  if (!API_URL) {
    throw new Error("NEXT_PUBLIC_API_URL nao definido no .env do front");
  }

  return API_URL;
}

export async function aplicarMarcaDagua(file: File) {
  const apiUrl = getApiUrl();

  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${apiUrl}/v1/marca_dagua`, {
    method: "POST",
    body: formData,
    credentials: "include",
    cache: "no-store",
  });

  if (!res.ok) {
    let mensagem = "Falha ao processar o PDF. Tente novamente.";

    try {
      const blob = await res.blob();
      const text = await blob.text();

      if (text) {
        try {
          const parsed = JSON.parse(text);
          mensagem = parsed?.error || parsed?.details || text;
        } catch {
          mensagem = text;
        }
      }
    } catch {
      // mantem mensagem padrao
    }

    throw new Error(mensagem);
  }

  const blob = await res.blob();
  return blob;
}
