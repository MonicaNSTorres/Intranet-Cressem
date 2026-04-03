"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useRef, useState } from "react";
import { FaDownload, FaFilePdf, FaImage } from "react-icons/fa";
import { converterArquivos } from "@/services/conversor_arquivos.service";

export function ConversorArquivosForm() {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [files, setFiles] = useState<File[]>([]);
  const [formatoDe, setFormatoDe] = useState("");
  const [formatoPara, setFormatoPara] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [info, setInfo] = useState("");

  function limparSelecao() {
    if (inputRef.current) {
      inputRef.current.value = "";
    }

    setFiles([]);
  }

  function onSelecionarClick() {
    setErro("");
    setInfo("");
    inputRef.current?.click();
  }

  function onArquivosChange(e: React.ChangeEvent<HTMLInputElement>) {
    setErro("");
    setInfo("");

    const lista = Array.from(e.target.files || []);

    if (!lista.length) {
      limparSelecao();
      return;
    }

    const arquivosInvalidos = lista.filter((file) => {
      const ext = file.name.split(".").pop()?.toLowerCase();
      return ext !== "pdf" || file.type !== "application/pdf";
    });

    if (arquivosInvalidos.length > 0) {
      setErro("Selecione apenas arquivos PDF.");
      limparSelecao();
      return;
    }

    setFiles(lista);
  }

  async function onConverter() {
    setErro("");
    setInfo("");

    if (!files.length) {
      setErro("Selecione pelo menos um arquivo PDF.");
      return;
    }

    if (!formatoDe) {
      setErro("Selecione o formato inicial.");
      return;
    }

    if (!formatoPara) {
      setErro("Selecione o formato final.");
      return;
    }

    try {
      setLoading(true);
      setInfo("Por favor, aguarde enquanto convertemos seus arquivos...");

      const blob = await converterArquivos(files, formatoDe, formatoPara);

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "arquivos_convertidos.zip";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setInfo("Conversão concluída com sucesso. O download do ZIP foi iniciado.");
      limparSelecao();
      setFormatoDe("");
      setFormatoPara("");
    } catch (e: any) {
      setErro(e?.message || "Falha ao converter os arquivos. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-w-225 mx-auto rounded-xl bg-white p-6 shadow">
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <h3 className="text-sm font-semibold text-slate-800">
          Conversão de arquivos
        </h3>

        <div className="mt-3 text-sm text-slate-700">
          <p className="mb-2">Para converter seus arquivos:</p>
          <ol className="list-decimal space-y-1 pl-5">
            <li>Clique em <strong>Selecionar</strong> e escolha os arquivos PDF desejados.</li>
            <li>Selecione o formato inicial e o formato final da conversão.</li>
            <li>Clique em <strong>Converter</strong> e aguarde o processamento.</li>
            <li>O download de um arquivo <strong>.zip</strong> será iniciado automaticamente.</li>
          </ol>
        </div>
      </div>

      <div className="mt-6">
        <label className="mb-1 block text-xs font-medium text-gray-600">
          Selecione os arquivos
        </label>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
          <div className="rounded border px-3 py-2 text-sm text-gray-700">
            {files.length > 0
              ? `${files.length} arquivo(s) selecionado(s)`
              : "Nenhum arquivo selecionado"}
          </div>

          <button
            type="button"
            onClick={onSelecionarClick}
            disabled={loading}
            className="cursor-pointer rounded border border-slate-300 bg-white px-6 py-2 font-semibold text-slate-700 hover:bg-slate-50 hover:shadow-sm disabled:opacity-70"
          >
            Selecionar
          </button>
        </div>

        <input
          ref={inputRef}
          type="file"
          multiple
          accept="application/pdf"
          className="hidden"
          onChange={onArquivosChange}
        />
      </div>

      {files.length > 0 && (
        <div className="mt-4 rounded border border-slate-200 bg-slate-50 p-3">
          <p className="mb-2 text-xs font-medium text-gray-600">
            Arquivos selecionados
          </p>

          <ul className="space-y-2">
            {files.map((file, index) => (
              <li
                key={`${file.name}-${index}`}
                className="flex items-center gap-2 text-sm text-gray-700"
              >
                <FaFilePdf className="text-red-500" />
                <span className="truncate">{file.name}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            De
          </label>
          <select
            value={formatoDe}
            onChange={(e) => setFormatoDe(e.target.value)}
            className="w-full rounded border px-3 py-2"
            disabled={loading}
          >
            <option value="">Selecione</option>
            <option value="pdf">PDF</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Para
          </label>
          <select
            value={formatoPara}
            onChange={(e) => setFormatoPara(e.target.value)}
            className="w-full rounded border px-3 py-2"
            disabled={loading}
          >
            <option value="">Selecione</option>
            <option value="pdfa">PDF/A</option>
            <option value="png">Imagem (PNG)</option>
          </select>
        </div>
      </div>

      {formatoPara === "png" && (
        <div className="mt-4 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Cada página do PDF será convertida em uma imagem PNG dentro do arquivo ZIP.
        </div>
      )}

      {(erro || info) && (
        <div className="mt-4">
          {erro ? (
            <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {erro}
            </div>
          ) : (
            <div className="rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              {info}
            </div>
          )}
        </div>
      )}

      <div className="mt-6 flex items-center justify-end border-t pt-5">
        <button
          type="button"
          onClick={onConverter}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded bg-secondary px-5 py-2 font-semibold text-white shadow hover:bg-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          {formatoPara === "png" ? <FaImage /> : <FaDownload />}
          {loading ? "Convertendo..." : "Converter"}
        </button>
      </div>
    </div>
  );
}