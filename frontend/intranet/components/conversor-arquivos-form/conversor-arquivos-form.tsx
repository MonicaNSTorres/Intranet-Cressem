"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useRef, useState } from "react";
import {
  FaDownload,
  FaFileAlt,
  FaFilePdf,
  FaFileWord,
  FaGripVertical,
  FaImage,
  FaTrash,
} from "react-icons/fa";
import { converterArquivos } from "@/services/conversor_arquivos.service";

const conversoesComuns = [
  {
    de: "pdf",
    para: "pdfa",
    titulo: "PDF para PDF/A",
    descricao: "Ideal para arquivamento, auditoria e documentos oficiais.",
    detalhe: "Gera um PDF compatível com preservação documental.",
    icone: FaFilePdf,
  },
  {
    de: "pdf",
    para: "png",
    titulo: "PDF para PNG",
    descricao: "Transforma cada página em imagem com boa qualidade.",
    detalhe: "Cada página do PDF será uma imagem PNG dentro do ZIP.",
    icone: FaImage,
  },
  {
    de: "pdf",
    para: "jpg",
    titulo: "PDF para JPG",
    descricao: "Útil para envio rápido, prévias e visualização em sistemas.",
    detalhe: "Cada página do PDF será uma imagem JPG dentro do ZIP.",
    icone: FaImage,
  },
  {
    de: "pdf",
    para: "svg",
    titulo: "PDF para SVG",
    descricao: "Gera imagens vetoriais para uso técnico ou visual.",
    detalhe: "Cada página do PDF será um SVG dentro do ZIP.",
    icone: FaImage,
  },
  {
    de: "pdf",
    para: "docx",
    titulo: "PDF para DOCX",
    descricao: "Extrai o texto do PDF para um documento Word editável.",
    detalhe: "Gera um DOCX editável com o texto extraído. PDFs escaneados precisam de OCR para virar texto.",
    icone: FaFileWord,
  },
  {
    de: "docx",
    para: "pdf",
    titulo: "DOCX para PDF",
    descricao: "Transforma documentos Word em PDF para envio ou arquivamento.",
    detalhe: "Gera um PDF para cada arquivo DOCX enviado.",
    icone: FaFilePdf,
  },
  {
    de: "imagem",
    para: "pdf",
    titulo: "Imagem para PDF",
    descricao: "Junta imagens PNG ou JPG em um único PDF.",
    detalhe: "As imagens selecionadas serão agrupadas em um PDF dentro do ZIP.",
    icone: FaFileAlt,
  },
  {
    de: "imagem",
    para: "jpg",
    titulo: "Imagem para JPG",
    descricao: "Padroniza imagens PNG/JPG em JPG.",
    detalhe: "Gera uma imagem JPG para cada arquivo enviado.",
    icone: FaImage,
  },
  {
    de: "imagem",
    para: "png",
    titulo: "Imagem para PNG",
    descricao: "Padroniza imagens PNG/JPG em PNG.",
    detalhe: "Gera uma imagem PNG para cada arquivo enviado.",
    icone: FaImage,
  },
];

export function ConversorArquivosForm() {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [files, setFiles] = useState<File[]>([]);
  const [formatoDe, setFormatoDe] = useState("");
  const [formatoPara, setFormatoPara] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [info, setInfo] = useState("");
  const [arquivoArrastadoIndex, setArquivoArrastadoIndex] = useState<number | null>(null);

  const conversaoSelecionada = conversoesComuns.find(
    (conversao) => conversao.de === formatoDe && conversao.para === formatoPara
  );

  const origemImagem = formatoDe === "imagem";
  const origemDocx = formatoDe === "docx";
  const permiteOrdenarImagens = origemImagem;
  const textoTipoArquivo = !formatoDe
    ? "arquivos"
    : origemImagem
    ? "imagens PNG ou JPG"
    : origemDocx
      ? "arquivos DOCX"
      : "arquivos PDF";
  const acceptArquivos = !formatoDe
    ? ".pdf,.docx,image/png,image/jpeg"
    : origemImagem
    ? "image/png,image/jpeg"
    : origemDocx
      ? ".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      : "application/pdf";

  function selecionarConversao(de: string, para: string) {
    setErro("");
    setInfo("");
    setFormatoDe(de);
    setFormatoPara(para);
    limparSelecao();
  }

  function onFormatoDeChange(valor: string) {
    setErro("");
    setInfo("");
    setFormatoDe(valor);
    setFormatoPara(valor === "imagem" ? "pdf" : valor === "docx" ? "pdf" : "");
    limparSelecao();
  }

  function limparSelecao() {
    if (inputRef.current) {
      inputRef.current.value = "";
    }

    setFiles([]);
    setArquivoArrastadoIndex(null);
  }

  function limparInputArquivo() {
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  function removerArquivo(indexParaRemover: number) {
    setFiles((arquivosAtuais) =>
      arquivosAtuais.filter((_, index) => index !== indexParaRemover)
    );
  }

  function ordenarArquivo(indexOrigem: number, indexDestino: number) {
    if (indexOrigem === indexDestino) {
      return;
    }

    setFiles((arquivosAtuais) => {
      const novosArquivos = [...arquivosAtuais];
      const [arquivoMovido] = novosArquivos.splice(indexOrigem, 1);
      novosArquivos.splice(indexDestino, 0, arquivoMovido);
      return novosArquivos;
    });
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
      limparInputArquivo();
      return;
    }

    if (!formatoDe) {
      setErro("Selecione o formato inicial antes de escolher os arquivos.");
      limparInputArquivo();
      return;
    }

    const arquivosInvalidos = lista.filter((file) => {
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (origemImagem) {
        return !["png", "jpg", "jpeg"].includes(ext || "");
      }

      if (origemDocx) {
        return ext !== "docx";
      }

      return ext !== "pdf" || file.type !== "application/pdf";
    });

    if (arquivosInvalidos.length > 0) {
      setErro(`Selecione apenas ${textoTipoArquivo}.`);
      limparInputArquivo();
      return;
    }

    setFiles((arquivosAtuais) => (origemImagem ? [...arquivosAtuais, ...lista] : lista));
    limparInputArquivo();
  }

  async function onConverter() {
    setErro("");
    setInfo("");

    if (!files.length) {
      setErro(`Selecione pelo menos um arquivo de origem: ${textoTipoArquivo}.`);
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
    <div className="mx-auto overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-gradient-to-r from-[#00AE9D]/10 via-white to-[#C7D300]/20 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#00AE9D]">
              Conversor
            </p>
            <h3 className="mt-1 text-lg font-black text-slate-950">
              Conversão de arquivos
            </h3>
            <p className="mt-1 max-w-2xl text-sm font-medium text-slate-600">
              Escolha uma conversão comum ou selecione manualmente os formatos de origem e destino.
            </p>
          </div>

          <div className="rounded-2xl border border-[#C7D300]/40 bg-[#C7D300]/10 px-4 py-3 text-xs font-semibold text-slate-700 lg:max-w-md">
            O download de um arquivo <strong>.zip</strong> será iniciado automaticamente ao concluir.
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
              1. Escolha uma conversão comum ou selecione os formatos.
            </li>
            <li className="rounded-xl border border-slate-200 bg-white px-3 py-2">
              2. Clique em <strong>Selecionar</strong> e escolha os arquivos.
            </li>
            <li className="rounded-xl border border-slate-200 bg-white px-3 py-2">
              3. Se forem imagens, organize a ordem antes de converter.
            </li>
            <li className="rounded-xl border border-slate-200 bg-white px-3 py-2">
              4. Clique em <strong>Converter</strong> e aguarde o ZIP.
            </li>
          </ol>
        </div>

      <div className="mt-6">
        <div className="mb-2">
          <h3 className="text-sm font-black text-slate-900">
            Conversões mais comuns
          </h3>
          <p className="text-xs font-medium text-slate-500">
            Clique em uma opção para preencher os formatos automaticamente.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {conversoesComuns.map((conversao) => {
            const Icone = conversao.icone;
            const selecionada =
              formatoDe === conversao.de && formatoPara === conversao.para;

            return (
              <button
                key={`${conversao.de}-${conversao.para}`}
                type="button"
                onClick={() => selecionarConversao(conversao.de, conversao.para)}
                disabled={loading}
                className={`cursor-pointer rounded-2xl border p-4 text-left transition hover:border-[#00AE9D]/40 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-70 ${
                  selecionada
                    ? "border-[#00AE9D]/40 bg-[#00AE9D]/10 shadow-sm"
                    : "border-slate-200 bg-white hover:border-[#79B729]/40"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                      selecionada
                        ? "bg-[#00AE9D] text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    <Icone />
                  </div>

                  <div>
                    <p className="text-sm font-black text-slate-900">
                      {conversao.titulo}
                    </p>
                    <p className="mt-1 text-xs font-medium leading-5 text-slate-500">
                      {conversao.descricao}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6">
        <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">
          Selecione os arquivos
        </label>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
            <div className="flex h-10 items-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm">
              {files.length > 0
                ? `${files.length} arquivo(s) selecionado(s)`
                : "Nenhum arquivo selecionado"}
          </div>

          <button
            type="button"
            onClick={onSelecionarClick}
            disabled={loading}
            className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl bg-[#49479D] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#00AE9D] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Selecionar
          </button>
        </div>

        <input
          ref={inputRef}
          type="file"
          multiple
          accept={acceptArquivos}
          className="hidden"
          onChange={onArquivosChange}
        />
      </div>

      {files.length > 0 && (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                Arquivos selecionados
              </p>
              {permiteOrdenarImagens && (
                <p className="mt-1 text-xs font-medium text-slate-500">
                  Arraste para ordenar os arquivos antes da conversão. Se selecionar mais imagens,
                  elas entram no final da lista.
                </p>
              )}
            </div>
          </div>

          <ul className="space-y-2">
            {files.map((file, index) => (
              <li
                key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
                draggable={permiteOrdenarImagens && !loading}
                onDragStart={() => setArquivoArrastadoIndex(index)}
                onDragOver={(event) => {
                  if (permiteOrdenarImagens) {
                    event.preventDefault();
                  }
                }}
                onDrop={() => {
                  if (arquivoArrastadoIndex !== null) {
                    ordenarArquivo(arquivoArrastadoIndex, index);
                  }
                  setArquivoArrastadoIndex(null);
                }}
                onDragEnd={() => setArquivoArrastadoIndex(null)}
                className={`flex items-center gap-3 rounded-2xl border bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition ${
                  permiteOrdenarImagens
                    ? "cursor-grab active:cursor-grabbing"
                    : ""
                } ${
                  arquivoArrastadoIndex === index
                    ? "border-[#00AE9D]/40 bg-[#00AE9D]/10 opacity-80"
                    : "border-slate-200"
                }`}
              >
                {permiteOrdenarImagens && (
                  <FaGripVertical className="shrink-0 text-slate-400" />
                )}
                {origemImagem ? (
                  <FaImage className="shrink-0 text-sky-500" />
                ) : origemDocx ? (
                  <FaFileWord className="shrink-0 text-blue-600" />
                ) : (
                  <FaFilePdf className="shrink-0 text-red-500" />
                )}
                <span className="min-w-0 flex-1 truncate">{file.name}</span>
                <button
                  type="button"
                  onClick={() => removerArquivo(index)}
                  disabled={loading}
                  className="inline-flex h-10 items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                  title="Remover arquivo"
                >
                  <FaTrash />
                  Remover
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">
            De
          </label>
          <select
            value={formatoDe}
            onChange={(e) => onFormatoDeChange(e.target.value)}
            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm outline-none transition focus:border-[#00AE9D] focus:ring-2 focus:ring-[#00AE9D]/20"
            disabled={loading}
          >
            <option value="">Selecione</option>
            <option value="pdf">PDF</option>
            <option value="imagem">Imagem (PNG/JPG)</option>
            <option value="docx">DOCX</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">
            Para
          </label>
          <select
            value={formatoPara}
            onChange={(e) => setFormatoPara(e.target.value)}
            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm outline-none transition focus:border-[#00AE9D] focus:ring-2 focus:ring-[#00AE9D]/20"
            disabled={loading}
          >
            {!formatoDe ? (
              <option value="">Selecione o formato inicial</option>
            ) : origemImagem ? (
              <>
                <option value="pdf">PDF</option>
                <option value="png">Imagem (PNG)</option>
                <option value="jpg">Imagem (JPG)</option>
              </>
            ) : origemDocx ? (
              <option value="pdf">PDF</option>
            ) : (
              <>
                <option value="">Selecione</option>
                <option value="pdfa">PDF/A</option>
                <option value="png">Imagem (PNG)</option>
                <option value="jpg">Imagem (JPG)</option>
                <option value="docx">Documento Word (DOCX)</option>
                <option value="txt">Texto (TXT)</option>
                <option value="svg">Imagem vetorial (SVG)</option>
              </>
            )}
          </select>
        </div>
      </div>

      {conversaoSelecionada && (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
          {conversaoSelecionada.detalhe}
        </div>
      )}

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
          onClick={onConverter}
          disabled={loading}
          className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-[#79B729] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#00AE9D] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {["png", "jpg", "svg"].includes(formatoPara) ? <FaImage /> : <FaDownload />}
          {loading ? "Convertendo..." : "Converter"}
        </button>
      </div>
      </div>
    </div>
  );
}