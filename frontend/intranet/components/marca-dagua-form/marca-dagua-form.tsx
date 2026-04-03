"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useRef, useState } from "react";
import { aplicarMarcaDagua } from "@/services/marca_dagua.service";

function getOutputFileName(fileName: string) {
  const base = String(fileName || "arquivo").replace(/\.pdf$/i, "") || "arquivo";
  return `${base}_marca_dagua.pdf`;
}

export function MarcaDaguaForm() {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [arquivo, setArquivo] = useState<File | null>(null);
  const [nomeArquivo, setNomeArquivo] = useState("Nenhum arquivo selecionado");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [info, setInfo] = useState("");

  function limparSelecao() {
    if (inputRef.current) {
      inputRef.current.value = "";
    }

    setArquivo(null);
    setNomeArquivo("Nenhum arquivo selecionado");
  }

  function validarArquivo(file: File) {
    const ext = file.name.split(".").pop()?.toLowerCase();

    if (file.size <= 1024) {
      return "Selecione um PDF válido (maior que 1 KB).";
    }

    if (ext !== "pdf" || file.type !== "application/pdf") {
      return "Selecione apenas arquivos PDF.";
    }

    return "";
  }

  function onSelecionarClick() {
    setErro("");
    setInfo("");
    inputRef.current?.click();
  }

  function onArquivoChange(e: React.ChangeEvent<HTMLInputElement>) {
    setErro("");
    setInfo("");

    const file = e.target.files?.[0];

    if (!file) {
      limparSelecao();
      return;
    }

    const validacao = validarArquivo(file);

    if (validacao) {
      setErro(validacao);
      limparSelecao();
      return;
    }

    setArquivo(file);
    setNomeArquivo(file.name);
  }

  async function onAplicarMarcaDagua() {
    setErro("");
    setInfo("");

    if (!arquivo) {
      setErro("Selecione um PDF primeiro.");
      return;
    }

    try {
      setLoading(true);
      setInfo("Por favor, aguarde enquanto aplicamos a marca d’água...");

      const blob = await aplicarMarcaDagua(arquivo);

      const url = window.URL.createObjectURL(
        new Blob([blob], { type: "application/pdf" })
      );

      const a = document.createElement("a");
      a.href = url;
      a.download = getOutputFileName(arquivo.name);
      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);

      setInfo("Marca d’água aplicada com sucesso. Seu download foi iniciado.");
      limparSelecao();
    } catch (e: any) {
      setErro(e?.message || "Falha ao processar o PDF. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-w-225 mx-auto rounded-xl bg-white p-6 shadow">
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <h3 className="text-sm font-semibold text-slate-800">
          Aplicar marca d&apos;água
        </h3>

        <div className="mt-3 text-sm text-slate-700">
          <p className="mb-2">Para aplicar a marca d&apos;água no seu arquivo PDF:</p>
          <ol className="list-decimal space-y-1 pl-5">
            <li>Clique em <strong>Selecionar</strong> e escolha o arquivo PDF desejado.</li>
            <li>Confira o nome do arquivo exibido abaixo do botão selecionar.</li>
            <li>Clique em <strong>Aplicar marca d&apos;água</strong> e aguarde o processamento.</li>
            <li>O download do arquivo já com a marca d&apos;água será iniciado automaticamente.</li>
          </ol>
        </div>
      </div>

      <div className="mt-6">
        <label className="mb-1 block text-xs font-medium text-gray-600">
          Selecione o arquivo
        </label>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
          <div className="rounded border px-3 py-2 text-sm text-gray-700">
            {nomeArquivo}
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
          accept="application/pdf"
          className="hidden"
          onChange={onArquivoChange}
        />
      </div>

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

      <div className="mt-6 border-t pt-5 flex items-center justify-end">
        <button
          type="button"
          onClick={onAplicarMarcaDagua}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded bg-secondary px-5 py-2 font-semibold text-white shadow hover:bg-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Processando..." : "Aplicar marca d’água"}
        </button>
      </div>
    </div>
  );
}