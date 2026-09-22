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
    <div className="mx-auto overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-gradient-to-r from-[#00AE9D]/10 via-white to-[#C7D300]/10 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#00AE9D]">
              Conversão do documento
            </p>
            <h3 className="mt-1 text-lg font-black text-slate-950">
              Aplicar marca d&apos;água
            </h3>
            <p className="mt-1 max-w-2xl text-sm font-medium text-slate-600">
              Envie um PDF válido e baixe o arquivo processado assim que o backend concluir.
            </p>
          </div>

          <div className="rounded-2xl border border-[#C7D300]/40 bg-[#C7D300]/10 px-4 py-3 text-xs font-semibold text-slate-700 lg:max-w-md">
            O download começa automaticamente ao terminar. Selecione novamente o arquivo se precisar refazer.
          </div>
        </div>
      </div>

      <div className="p-5">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <h4 className="text-sm font-black text-slate-900">
            Como usar
          </h4>

          <ol className="mt-3 grid gap-2 text-sm font-medium text-slate-600 md:grid-cols-2">
            <li className="rounded-xl border border-slate-200 bg-white px-3 py-2">
              1. Clique em <strong>Selecionar</strong> e escolha o PDF.
            </li>
            <li className="rounded-xl border border-slate-200 bg-white px-3 py-2">
              2. Confira o nome do arquivo selecionado.
            </li>
            <li className="rounded-xl border border-slate-200 bg-white px-3 py-2">
              3. Clique em <strong>Aplicar marca d&apos;água</strong>.
            </li>
            <li className="rounded-xl border border-slate-200 bg-white px-3 py-2">
              4. Aguarde o download iniciar automaticamente.
            </li>
          </ol>
        </div>

        <div className="mt-6">
          <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">
            Arquivo PDF
          </label>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
            <div className="flex min-h-12 items-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm">
              {nomeArquivo}
            </div>

            <button
              type="button"
              onClick={onSelecionarClick}
              disabled={loading}
              className="cursor-pointer rounded-2xl bg-[#006f65] px-6 py-3 text-sm font-black text-white shadow-sm transition hover:bg-[#00AE9D] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
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
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
                {erro}
              </div>
            ) : (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
                {info}
              </div>
            )}
          </div>
        )}

        <div className="mt-6 flex items-center justify-end border-t border-slate-100 pt-5">
          <button
            type="button"
            onClick={onAplicarMarcaDagua}
            disabled={loading}
            className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-[#00AE9D] px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-[#006f65] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Processando..." : "Aplicar marca d’água"}
          </button>
        </div>
      </div>
    </div>
  );
}