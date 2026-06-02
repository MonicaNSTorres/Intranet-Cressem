"use client";

import { useEffect, useState } from "react";
import {
  FaDownload,
  FaEdit,
  FaFileAlt,
  FaFilePdf,
  FaPlus,
  FaSearch,
  FaTimes,
  FaUpload,
} from "react-icons/fa";
import {
  getDownloadTermoMensalCaixaAssinadoUrl,
  listarPAsTermoMensalCaixa,
  listarTermosMensaisCaixa,
  obterTermoMensalCaixaPorId,
  PAOption,
  StatusTermoMensalCaixa,
  TermoMensalCaixa,
  uploadTermoMensalCaixaAssinado,
} from "@/services/termos_mensais_caixa.service";
import { gerarPdfTermoMensalCaixa } from "@/lib/pdf/gerarPdfTermoMensalCaixa";

const meses = [
  { value: "01", label: "Janeiro" },
  { value: "02", label: "Fevereiro" },
  { value: "03", label: "Março" },
  { value: "04", label: "Abril" },
  { value: "05", label: "Maio" },
  { value: "06", label: "Junho" },
  { value: "07", label: "Julho" },
  { value: "08", label: "Agosto" },
  { value: "09", label: "Setembro" },
  { value: "10", label: "Outubro" },
  { value: "11", label: "Novembro" },
  { value: "12", label: "Dezembro" },
];

function competenciaAtual() {
  const hoje = new Date();
  return {
    ano: String(hoje.getFullYear()),
    mes: String(hoje.getMonth() + 1).padStart(2, "0"),
  };
}

function anosDisponiveis() {
  const anoAtual = new Date().getFullYear();
  return Array.from({ length: 8 }, (_, index) => String(anoAtual - index));
}

function formatarCompetencia(value?: string) {
  if (!value?.includes("-")) return value || "-";

  const [ano, mes] = value.split("-");
  const mesLabel = meses.find((item) => item.value === mes)?.label || mes;

  return `${mesLabel}/${ano}`;
}

function getStatusClass(status: StatusTermoMensalCaixa) {
  const classes: Record<StatusTermoMensalCaixa, string> = {
    RASCUNHO: "bg-gray-100 text-gray-700",
    PREENCHIDO: "bg-blue-50 text-blue-700",
    PDF_GERADO: "bg-yellow-50 text-yellow-700",
    ASSINADO_ANEXADO: "bg-emerald-50 text-emerald-700",
    CONCLUIDO: "bg-green-100 text-green-700",
  };

  return classes[status] || "bg-gray-100 text-gray-700";
}

export function TermosMensaisCaixa() {
  const atual = competenciaAtual();

  const [mes, setMes] = useState(atual.mes);
  const [ano, setAno] = useState(atual.ano);
  const [pa, setPa] = useState("");
  const [status, setStatus] = useState("");
  const [pas, setPas] = useState<PAOption[]>([]);

  const [termos, setTermos] = useState<TermoMensalCaixa[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  const [modalAssinadoAberta, setModalAssinadoAberta] = useState(false);
  const [termoSelecionado, setTermoSelecionado] =
    useState<TermoMensalCaixa | null>(null);
  const [arquivoAssinado, setArquivoAssinado] = useState<File | null>(null);
  const [uploadingAssinado, setUploadingAssinado] = useState(false);
  const [erroModalAssinado, setErroModalAssinado] = useState("");

  const competencia = `${ano}-${mes}`;

  async function buscarTermos() {
    try {
      setLoading(true);
      setErro("");

      const response = await listarTermosMensaisCaixa({
        competencia,
        pa,
        status,
      });

      setTermos(response.data || []);
    } catch (error: any) {
      setErro(error?.message || "Erro ao buscar termos mensais caixa.");
    } finally {
      setLoading(false);
    }
  }

  async function anexarTermoAssinado() {
    try {
      if (!termoSelecionado) return;

      if (!arquivoAssinado) {
        setErroModalAssinado("Selecione o PDF assinado antes de enviar.");
        return;
      }

      setUploadingAssinado(true);
      setErroModalAssinado("");

      await uploadTermoMensalCaixaAssinado({
        id: termoSelecionado.ID_TERMOS_MENSAIS_CAIXA,
        arquivo: arquivoAssinado,
        usuarioAtualizacao: "INTRANET",
      });

      setModalAssinadoAberta(false);
      setArquivoAssinado(null);
      setTermoSelecionado(null);

      await buscarTermos();
    } catch (error: any) {
      setErroModalAssinado(error?.message || "Erro ao anexar termo assinado.");
    } finally {
      setUploadingAssinado(false);
    }
  }

  async function gerarPdfDaListagem(id: number) {
    try {
      setErro("");

      const response = await obterTermoMensalCaixaPorId(id);
      const termo = response.data;
      const dados = termo.DS_DADOS_FORMULARIO;

      await gerarPdfTermoMensalCaixa({
        competencia: termo.DT_COMPETENCIA,
        pa: termo.NM_PA,
        dataTermo: dados?.dataTermo || "",
        responsavel: dados?.responsavel || "",
        tesoureiro: dados?.tesoureiro || "",
        diretorFinanceiro: dados?.diretorFinanceiro || "",
        gerente: dados?.gerente || "",
        valores: dados?.valores,
        observacao: dados?.observacao || "",
      });
    } catch (error: any) {
      setErro(error?.message || "Erro ao gerar PDF do termo.");
    }
  }

  useEffect(() => {
    async function iniciarTela() {
      try {
        const response = await listarPAsTermoMensalCaixa();
        setPas(response.data || []);
      } catch (error) {
        console.error(error);
      }

      await buscarTermos();
    }

    iniciarTela();
  }, []);

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="absolute right-[-80px] top-[-80px] h-56 w-56 rounded-full bg-[#C7D300]/20 blur-3xl" />
        <div className="absolute bottom-[-100px] left-[-80px] h-56 w-56 rounded-full bg-[#00AE9D]/10 blur-3xl" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              <FaFileAlt size={12} />
              Conferência mensal de caixa
            </span>

            <h2 className="mt-4 text-xl font-semibold text-gray-900">
              Preencha, gere e acompanhe os termos mensais
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
              Cadastre a conferência mensal pela intranet, gere o PDF para impressão e depois anexe o termo assinado.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              window.location.href = "/auth/termos_mensais_caixa/novo";
            }}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-secondary px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary"
          >
            <FaPlus size={12} />
            Nova conferência
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_120px_1fr_1fr_auto] md:items-end">
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">
              Mês
            </label>
            <select
              value={mes}
              onChange={(e) => setMes(e.target.value)}
              className="h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm outline-none focus:border-[#00AE9D] focus:ring-2 focus:ring-[#00AE9D]/20"
            >
              {meses.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">
              Ano
            </label>
            <select
              value={ano}
              onChange={(e) => setAno(e.target.value)}
              className="h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm outline-none focus:border-[#00AE9D] focus:ring-2 focus:ring-[#00AE9D]/20"
            >
              {anosDisponiveis().map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">
              PA
            </label>
            <select
              value={pa}
              onChange={(e) => setPa(e.target.value)}
              className="h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm outline-none focus:border-[#00AE9D] focus:ring-2 focus:ring-[#00AE9D]/20"
            >
              <option value="">Todos</option>

              {pas.map((item) => (
                <option key={item.ID_PA_ATUALIZADA} value={item.NM_FANTASIA}>
                  {item.NR_PA} - {item.NM_FANTASIA}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm outline-none focus:border-[#00AE9D] focus:ring-2 focus:ring-[#00AE9D]/20"
            >
              <option value="">Todos</option>
              <option value="RASCUNHO">Rascunho</option>
              <option value="PREENCHIDO">Preenchido</option>
              <option value="PDF_GERADO">PDF gerado</option>
              <option value="ASSINADO_ANEXADO">Assinado anexado</option>
              <option value="CONCLUIDO">Concluído</option>
            </select>
          </div>

          <button
            type="button"
            onClick={buscarTermos}
            disabled={loading}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-secondary px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            <FaSearch size={12} />
            {loading ? "Buscando..." : "Buscar"}
          </button>
        </div>
      </section>

      {erro && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          {erro}
        </div>
      )}

      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Conferências encontradas
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Resultado para {formatarCompetencia(competencia)}.
            </p>
          </div>

          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
            {termos.length} registro(s)
          </span>
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-5 py-4">Competência</th>
                <th className="px-5 py-4">PA</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Criação</th>
                <th className="px-5 py-4">Atualização</th>
                <th className="px-5 py-4 text-right">Ações</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 bg-white">
              {termos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-14 text-center">
                    <div className="mx-auto flex max-w-sm flex-col items-center">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
                        <FaFileAlt size={24} />
                      </div>

                      <h3 className="mt-4 text-sm font-semibold text-gray-900">
                        Nenhuma conferência encontrada
                      </h3>

                      <p className="mt-1 text-sm text-gray-500">
                        Cadastre uma nova conferência mensal para iniciar o preenchimento.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                termos.map((item) => (
                  <tr
                    key={item.ID_TERMOS_MENSAIS_CAIXA}
                    className="transition hover:bg-gray-50"
                  >
                    <td className="px-5 py-4 font-medium text-gray-800">
                      {formatarCompetencia(item.DT_COMPETENCIA)}
                    </td>

                    <td className="px-5 py-4 text-gray-700">{item.NM_PA}</td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${getStatusClass(
                          item.SN_STATUS
                        )}`}
                      >
                        {item.SN_STATUS}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-gray-600">
                      {item.DT_CRIACAO || "-"}
                    </td>

                    <td className="px-5 py-4 text-gray-600">
                      {item.DT_ATUALIZACAO || "-"}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            window.location.href = `/auth/termos_mensais_caixa/${item.ID_TERMOS_MENSAIS_CAIXA}`;
                          }}
                          className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-3 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
                        >
                          <FaEdit size={11} />
                          Editar
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            gerarPdfDaListagem(item.ID_TERMOS_MENSAIS_CAIXA)
                          }
                          className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-secondary px-3 text-xs font-semibold text-white transition hover:bg-primary"
                        >
                          <FaFilePdf size={11} />
                          Gerar PDF
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setTermoSelecionado(item);
                            setArquivoAssinado(null);
                            setErroModalAssinado("");
                            setModalAssinadoAberta(true);
                          }}
                          className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-[#00AE9D] px-3 text-xs font-semibold text-white transition hover:bg-emerald-700"
                        >
                          <FaUpload size={11} />
                          Anexar
                        </button>

                        {item.NM_ARQUIVO_ASSINADO && (
                          <a
                            href={getDownloadTermoMensalCaixaAssinadoUrl(
                              item.ID_TERMOS_MENSAIS_CAIXA
                            )}
                            className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-gray-800 px-3 text-xs font-semibold text-white transition hover:bg-gray-900"
                          >
                            <FaDownload size={11} />
                            Baixar assinado
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {modalAssinadoAberta && termoSelecionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-yellow-50 px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-emerald-700">
                    <FaUpload size={12} />
                    Termo assinado
                  </span>

                  <h3 className="mt-3 text-xl font-semibold text-gray-900">
                    Anexar termo assinado
                  </h3>

                  <p className="mt-1 text-sm text-gray-600">
                    {termoSelecionado.NM_PA} -{" "}
                    {formatarCompetencia(termoSelecionado.DT_COMPETENCIA)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setModalAssinadoAberta(false);
                    setArquivoAssinado(null);
                    setTermoSelecionado(null);
                    setErroModalAssinado("");
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-gray-500 shadow-sm transition hover:bg-gray-100 hover:text-gray-800"
                >
                  <FaTimes size={14} />
                </button>
              </div>
            </div>

            <div className="space-y-5 px-6 py-6">
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">
                  PDF assinado
                </label>

                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => {
                    setErroModalAssinado("");
                    setArquivoAssinado(e.target.files?.[0] || null);
                  }}
                  className="w-full rounded-2xl border border-gray-300 bg-white px-3 py-3 text-sm"
                />

                {arquivoAssinado && (
                  <p className="mt-2 text-xs font-semibold text-emerald-700">
                    Arquivo selecionado: {arquivoAssinado.name}
                  </p>
                )}
              </div>

              {erroModalAssinado && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
                  {erroModalAssinado}
                </div>
              )}

              <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
                Anexe aqui o PDF já impresso e assinado. Depois disso, ele ficará disponível para download na listagem.
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-gray-100 bg-gray-50 px-6 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setModalAssinadoAberta(false);
                  setArquivoAssinado(null);
                  setTermoSelecionado(null);
                  setErroModalAssinado("");
                }}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-gray-300 bg-white px-5 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={anexarTermoAssinado}
                disabled={uploadingAssinado || !arquivoAssinado}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#00AE9D] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                <FaUpload size={14} />
                {uploadingAssinado ? "Enviando..." : "Anexar PDF"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}