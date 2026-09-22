import { MigracaoContratoLinhaPayload } from "@/services/migracao_contrato.service";

type GerarArquivoMigracaoContratoOpts = {
  linhas: MigracaoContratoLinhaPayload[];
  fileName?: string;
};

export async function gerarArquivoMigracaoContratoTxt({
  linhas,
  fileName = "migracao_contrato_destino.txt",
}: GerarArquivoMigracaoContratoOpts) {
  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  if (!API_URL) {
    throw new Error("NEXT_PUBLIC_API_URL não definido no .env do front");
  }

  const res = await fetch(`${API_URL}/v1/migracao-contrato/gerar-arquivo`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(linhas),
  });

  if (!res.ok) {
    let errorMessage = "Falha ao gerar arquivo.";
    try {
      const json = await res.json();
      errorMessage = json?.error || errorMessage;
    } catch {
      //
    }
    throw new Error(errorMessage);
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();

  window.URL.revokeObjectURL(url);
}