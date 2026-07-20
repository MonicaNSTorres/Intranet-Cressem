import { api } from "./api.service";

async function baixarBlob(
  url: string,
  filename: string
): Promise<void> {
  const response = await api.get<Blob>(url, {
    responseType: "blob",
    timeout: 60000,
  });

  const blob = new Blob(
    [response.data],
    {
      type: "text/csv;charset=utf-8;",
    }
  );

  const href = window.URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = href;
  link.download = filename;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  window.URL.revokeObjectURL(href);
}

export async function downloadCsvContratantesOdonto() {
  await baixarBlob(
    "/v1/download_pessoas_odontologicas",
    "convenio_odontologico.csv"
  );
}

export async function downloadCsvHistoricoCustoOdonto() {
  await baixarBlob(
    "/v1/download_custo_odonto",
    "custo_odontologico.csv"
  );
}

export async function downloadCsvMaiorIdadeOdonto() {
  await baixarBlob(
    "/v1/download_pessoas_odontologicas_maior_idade",
    "maior_idade_odontologico.csv"
  );
}

export async function downloadCsvFolhaOdonto() {
  await baixarBlob(
    "/v1/download_pessoas_odontologicas_folha",
    "convenio_odonto_folha.csv"
  );
}