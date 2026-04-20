"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useState } from "react";
import {
  FaSearch,
  FaEraser,
  FaInfoCircle,
  FaPrint,
  FaSignature,
  FaDownload,
  FaUpload,
  FaFilePdf,
  FaCalendarAlt,
  FaUserTie,
} from "react-icons/fa";
import {
  listarAnalisesLimite,
  buscarAnaliseLimitePorId,
} from "@/services/analise_limite.service";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

type AnaliseLimite = {
  ID_ANALISE: number;
  NR_CPF_CNPJ_ASSOCIADO: string;
  NM_ASSOCIADO: string;
  NM_FUNCIONARIO: string;
  DT: string;
  DIA?: string;

  NR_CELULAR?: string;
  NM_EMPRESA?: string;
  NR_CONTA_CORRENTE?: string;

  SL_BRUTO?: number | string;
  SL_LIQUIDO?: number | string;
  VL_FATURAMENTO_MENSAL?: number | string;
  VL_FATURAMENTO_ANUAL?: number | string;

  PORTABILIDADE?: boolean | number | string;
  FUNCIONARIO_EFETIVO?: boolean | number | string;
  CESSAO_CREDITO?: boolean | number | string;
  DT_PAGAMENTO?: string;
  NV_CARTEIRA?: string;
  NR_IAP?: string;

  OCORRENCIA_CRM?: boolean | number | string;
  OBS_CRM?: string;

  RISCO?: string;
  PD?: string;
  NR_CRL?: number | string;
  CAPITAL?: number | string;
  DIVIDA?: number | string;
  RESTRICAO?: boolean | number | string;
  DESC_RESTRICAO?: string;

  SG_LIMITE?: number | string;
  CARTAO?: boolean | number | string;
  LT_ATUAL_CARTAO?: number | string;
  LT_APROVADO_CARTAO?: number | string;
  CHEQUE_ESPECIAL?: boolean | number | string;
  LT_ATUAL_CH?: number | string;
  LT_APROVADO_CH?: number | string;

  NM_ASSINATURA?: string;
};

type ApiResponse = {
  items: AnaliseLimite[];
  total_pages: number;
  total_items: number;
  current_page?: number;
};

const inputBase =
  "h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100";

function formatDateBR(date?: string | null) {
  if (!date) return "";
  const value = String(date).slice(0, 10);
  const [y, m, d] = value.split("-");
  if (!y || !m || !d) return String(date);
  return `${d}/${m}/${y}`;
}

function formatMoney(value: any) {
  if (value === null || value === undefined || value === "") return "";
  const num =
    typeof value === "number"
      ? value
      : Number(String(value).replace(/\./g, "").replace(",", "."));

  if (!Number.isFinite(num)) return String(value);

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(num);
}

function boolToSimNao(value: any) {
  if (
    value === true ||
    value === 1 ||
    value === "1" ||
    value === "S" ||
    value === "SIM" ||
    value === "Sim"
  ) {
    return "Sim";
  }
  return "Não";
}

function capitalizeWords(text?: string) {
  if (!text) return "";
  return text
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function primeiroUltimoNome(name?: string) {
  if (!name) return "";
  const partes = name.trim().split(/\s+/).filter(Boolean);
  if (partes.length <= 1) return name;
  return `${partes[0]} ${partes[partes.length - 1]}`;
}

function onlyDigits(value: string) {
  return String(value || "").replace(/\D/g, "");
}

function isPJ(doc?: string) {
  return onlyDigits(doc || "").length === 14;
}

function buildPagination(current: number, total: number) {
  const pages: (number | string)[] = [];
  const range = 2;

  if (total <= 1) return [1];

  if (current > 1) {
    pages.push(1);
    if (current > 3) pages.push("...");
  }

  for (
    let i = Math.max(1, current - range);
    i <= Math.min(total, current + range);
    i++
  ) {
    if (!pages.includes(i)) pages.push(i);
  }

  if (current < total) {
    if (current < total - 2) pages.push("...");
    if (!pages.includes(total)) pages.push(total);
  }

  return pages;
}

function Field({
  label,
  value,
  colSpan,
  multiline = false,
}: {
  label: string;
  value?: React.ReactNode;
  colSpan?: string;
  multiline?: boolean;
}) {
  return (
    <div className={colSpan || ""}>
      <label className="mb-2 block text-[12px] font-semibold uppercase tracking-[0.03em] text-slate-600">
        {label}
      </label>
      <div
        className={`rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-700 shadow-sm ${
          multiline ? "min-h-[90px] whitespace-pre-wrap" : ""
        }`}
      >
        {value || "-"}
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-emerald-200 bg-gradient-to-r from-[#79B729] to-[#8ED12F] px-5 py-3">
        <h3 className="text-sm font-bold text-white">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function FieldGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{children}</div>;
}

export function ConsultaAnaliseLimiteForm() {
  const [txtAnalise, setTxtAnalise] = useState("");
  const [txtDia, setTxtDia] = useState("");

  const [analises, setAnalises] = useState<AnaliseLimite[]>([]);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);

  const [selectedAnalise, setSelectedAnalise] = useState<AnaliseLimite | null>(null);
  const [openInfoModal, setOpenInfoModal] = useState(false);
  const [openAssinaturaModal, setOpenAssinaturaModal] = useState(false);

  const [arquivoAssinatura, setArquivoAssinatura] = useState<File | null>(null);
  const [salvandoAssinatura, setSalvandoAssinatura] = useState(false);

  const paginationItems = useMemo(
    () => buildPagination(paginaAtual, totalPages),
    [paginaAtual, totalPages]
  );

  async function buscarAlteracoes(page = 1, limit = 10) {
    try {
      setLoading(true);

      const isCpfOuCnpj =
        onlyDigits(txtAnalise).length === 11 || onlyDigits(txtAnalise).length === 14;

      const response: ApiResponse = await listarAnalisesLimite({
        page,
        limit,
        cpf: isCpfOuCnpj ? txtAnalise : "",
        nome: !isCpfOuCnpj ? txtAnalise : "",
      });

      let items = response.items || [];

      if (txtDia) {
        items = items.filter((item) => String(item.DT || "").slice(0, 10) === txtDia);
      }

      setAnalises(items);
      setPaginaAtual(response.current_page || page);
      setTotalPages(response.total_pages || 0);
      setTotalItems(txtDia ? items.length : response.total_items || 0);
    } catch (error) {
      console.error("Erro ao buscar análises:", error);
      setAnalises([]);
      setPaginaAtual(1);
      setTotalPages(0);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  }

  function limpar() {
    setTxtAnalise("");
    setTxtDia("");
    setAnalises([]);
    setPaginaAtual(1);
    setTotalPages(0);
    setTotalItems(0);
  }

  async function abrirModalInfo(analise: AnaliseLimite) {
    try {
      const detalhada = await buscarAnaliseLimitePorId(analise.ID_ANALISE);
      setSelectedAnalise(detalhada);
      setOpenInfoModal(true);
    } catch (error) {
      console.error("Erro ao buscar detalhes da análise:", error);
      setSelectedAnalise(analise);
      setOpenInfoModal(true);
    }
  }

  function abrirModalAssinatura(analise: AnaliseLimite) {
    setSelectedAnalise(analise);
    setArquivoAssinatura(null);
    setOpenAssinaturaModal(true);
  }

  async function baixarArquivo(caminho?: string) {
    if (!API_URL) {
      alert("NEXT_PUBLIC_API_URL não definido.");
      return;
    }

    if (!caminho) {
      alert("Nenhum arquivo salvo para download.");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/v1/analise_limite_cheque_cartao_download`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ oficio: caminho }),
      });

      if (!res.ok) {
        throw new Error("Erro ao baixar arquivo.");
      }

      const blob = await res.blob();
      const contentDisposition = res.headers.get("content-disposition") || "";
      const nomeArquivo = contentDisposition.includes("filename=")
        ? contentDisposition.split("filename=")[1].replace(/"/g, "")
        : caminho.split("/").pop() || "assinatura.pdf";

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", nomeArquivo);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Erro ao baixar arquivo:", error);
      alert("Erro ao baixar o arquivo.");
    }
  }

  async function salvarAssinatura() {
    if (!API_URL) {
      alert("NEXT_PUBLIC_API_URL não definido.");
      return;
    }

    if (!selectedAnalise) return;

    if (!arquivoAssinatura) {
      alert("Selecione um arquivo PDF.");
      return;
    }

    try {
      setSalvandoAssinatura(true);

      const formData = new FormData();
      formData.append(
        "NR_CPF_CNPJ_ASSOCIADO",
        selectedAnalise.NR_CPF_CNPJ_ASSOCIADO
      );
      formData.append("ID_ANALISE", String(selectedAnalise.ID_ANALISE));
      formData.append("OFICIO", arquivoAssinatura);

      const res = await fetch(`${API_URL}/v1/analise_limite_cheque_cartao_upload`, {
        method: "PUT",
        body: formData,
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json?.error || json?.details || "Erro ao salvar assinatura.");
      }

      const novoNome = json?.NM_ASSINATURA;

      if (novoNome) {
        const atualizada = { ...selectedAnalise, NM_ASSINATURA: novoNome };
        setSelectedAnalise(atualizada);

        setAnalises((prev) =>
          prev.map((item) =>
            item.ID_ANALISE === atualizada.ID_ANALISE ? atualizada : item
          )
        );

        setArquivoAssinatura(null);
        alert("Assinatura salva com sucesso.");
      }
    } catch (error) {
      console.error("Erro ao salvar assinatura:", error);
      alert("Erro ao salvar assinatura.");
    } finally {
      setSalvandoAssinatura(false);
    }
  }

  function gerarHtmlImpressao(analise: AnaliseLimite) {
    const ehPJ = isPJ(analise.NR_CPF_CNPJ_ASSOCIADO);
    const mostrarDataPagamento = !!analise.CESSAO_CREDITO;

    return `
      <html>
        <head>
          <title>Impressão - Análise de Limite</title>
          <style>
            * { box-sizing: border-box; }
            body {
              font-family: Arial, Helvetica, sans-serif;
              color: #1f2937;
              padding: 32px;
              font-size: 12px;
            }
            h1 {
              text-align: center;
              color: #14532d;
              margin-bottom: 24px;
            }
            .section {
              border: 1px solid #d1d5db;
              margin-bottom: 18px;
              border-radius: 8px;
              overflow: hidden;
            }
            .section-header {
              background: #166534;
              color: white;
              padding: 10px 14px;
              font-weight: bold;
            }
            .section-body {
              padding: 14px;
            }
            .grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 10px 18px;
            }
            .full { grid-column: 1 / -1; }
            .signatures {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 24px;
              margin-top: 40px;
            }
            .signature {
              text-align: center;
            }
            .line {
              border-top: 1px solid #111827;
              margin-bottom: 8px;
              height: 36px;
            }
            .footer-date {
              text-align: right;
              margin-top: 24px;
            }
          </style>
        </head>
        <body>
          <h1>Relatório de Análise de Limite</h1>

          <div class="section">
            <div class="section-header">Dados do Associado</div>
            <div class="section-body grid">
              <div><strong>CPF/CNPJ:</strong> ${analise.NR_CPF_CNPJ_ASSOCIADO || ""}</div>
              <div class="full"><strong>Nome:</strong> ${analise.NM_ASSOCIADO || ""}</div>
              <div><strong>Celular:</strong> ${analise.NR_CELULAR || ""}</div>
              ${
                !ehPJ
                  ? `<div class="full"><strong>Empresa:</strong> ${analise.NM_EMPRESA || ""}</div>`
                  : ""
              }
            </div>
          </div>

          <div class="section">
            <div class="section-header">Informações Bancárias e Salariais</div>
            <div class="section-body grid">
              <div><strong>Conta Corrente:</strong> ${analise.NR_CONTA_CORRENTE || ""}</div>
              <div><strong>${ehPJ ? "Faturamento Mensal" : "Salário Bruto"}:</strong> ${
                ehPJ
                  ? formatMoney(analise.VL_FATURAMENTO_MENSAL)
                  : formatMoney(analise.SL_BRUTO)
              }</div>
              <div><strong>${ehPJ ? "Faturamento Anual" : "Salário Líquido"}:</strong> ${
                ehPJ
                  ? formatMoney(analise.VL_FATURAMENTO_ANUAL)
                  : formatMoney(analise.SL_LIQUIDO)
              }</div>

              ${
                !ehPJ
                  ? `<div><strong>Portabilidade:</strong> ${boolToSimNao(
                      analise.PORTABILIDADE
                    )}</div>
                     <div><strong>Funcionário Efetivo:</strong> ${boolToSimNao(
                       analise.FUNCIONARIO_EFETIVO
                     )}</div>`
                  : ""
              }

              <div><strong>Cessão de Crédito:</strong> ${boolToSimNao(
                analise.CESSAO_CREDITO
              )}</div>

              ${
                mostrarDataPagamento
                  ? `<div><strong>Data Pagamento:</strong> ${formatDateBR(
                      analise.DT_PAGAMENTO
                    )}</div>`
                  : ""
              }

              <div><strong>Nível Carteira:</strong> ${analise.NV_CARTEIRA || ""}</div>
              <div><strong>Números IAP:</strong> ${analise.NR_IAP || ""}</div>
            </div>
          </div>

          <div class="section">
            <div class="section-header">Status CRM e Observações</div>
            <div class="section-body grid">
              <div><strong>Ocorrência CRM:</strong> ${boolToSimNao(
                analise.OCORRENCIA_CRM
              )}</div>
              <div class="full"><strong>Observação:</strong> ${analise.OBS_CRM || ""}</div>
            </div>
          </div>

          <div class="section">
            <div class="section-header">Indicadores de Risco / Financeiros</div>
            <div class="section-body grid">
              <div><strong>Risco:</strong> ${analise.RISCO || ""}</div>
              <div><strong>PD:</strong> ${analise.PD || ""}</div>
              <div><strong>CRL:</strong> ${formatMoney(analise.NR_CRL)}</div>
              <div><strong>Capital:</strong> ${formatMoney(analise.CAPITAL)}</div>
              <div><strong>Dívida:</strong> ${formatMoney(analise.DIVIDA)}</div>
              <div><strong>Restrições:</strong> ${boolToSimNao(
                analise.RESTRICAO
              )}</div>
              <div class="full"><strong>Quais:</strong> ${analise.DESC_RESTRICAO || ""}</div>
            </div>
          </div>

          <div class="section">
            <div class="section-header">Sugestão de Limite e Aprovações</div>
            <div class="section-body grid">
              <div class="full"><strong>Sugestão de Limite:</strong> ${formatMoney(
                analise.SG_LIMITE
              )}</div>
              <div><strong>Cartão:</strong> ${boolToSimNao(analise.CARTAO)}</div>
              <div><strong>Limite Atual Cartão:</strong> ${formatMoney(
                analise.LT_ATUAL_CARTAO
              )}</div>
              <div><strong>Limite Aprovado Cartão:</strong> ${formatMoney(
                analise.LT_APROVADO_CARTAO
              )}</div>
              <div><strong>Cheque Especial:</strong> ${boolToSimNao(
                analise.CHEQUE_ESPECIAL
              )}</div>
              <div><strong>Limite Atual Especial:</strong> ${formatMoney(
                analise.LT_ATUAL_CH
              )}</div>
              <div><strong>Limite Aprovado Especial:</strong> ${formatMoney(
                analise.LT_APROVADO_CH
              )}</div>
            </div>
          </div>

          <div class="signatures">
            <div class="signature">
              <div class="line"></div>
              <small>Assinatura Colaborador</small>
            </div>
            <div class="signature">
              <div class="line"></div>
              <small>Assinatura Gerência</small>
            </div>
            <div class="signature">
              <div class="line"></div>
              <small>Assinatura Diretoria</small>
            </div>
          </div>

          <div class="footer-date">
            <small>Data Análise: ${formatDateBR(analise.DT)}</small>
          </div>
        </body>
      </html>
    `;
  }

  function imprimiAnalise(analise: AnaliseLimite) {
    const win = window.open("", "_blank", "width=1000,height=800");
    if (!win) return;

    win.document.open();
    win.document.write(gerarHtmlImpressao(analise));
    win.document.close();
    win.focus();

    setTimeout(() => {
      win.print();
    }, 400);
  }

  useEffect(() => {
    function onEnter(event: KeyboardEvent) {
      if (event.key === "Enter") {
        buscarAlteracoes(1, 10);
      }
    }

    document.addEventListener("keypress", onEnter);
    return () => document.removeEventListener("keypress", onEnter);
  }, [txtAnalise, txtDia]);

  const ehPJSelecionado = selectedAnalise
    ? isPJ(selectedAnalise.NR_CPF_CNPJ_ASSOCIADO)
    : false;

  return (
    <div className="mx-auto w-full space-y-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">
              Consulta de Análise de Limite
            </h2>
            <p className="text-sm text-slate-500">
              Busque análises cadastradas, visualize detalhes e gerencie assinaturas.
            </p>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_220px_auto]">
          <div>
            <label className="mb-2 block text-[12px] font-semibold uppercase tracking-[0.03em] text-slate-600">
              Nome, CPF/CNPJ ou Funcionário
            </label>
            <input
              type="text"
              value={txtAnalise}
              onChange={(e) => setTxtAnalise(e.target.value)}
              placeholder="Digite para buscar..."
              className={inputBase}
            />
          </div>

          <div>
            <label className="mb-2 block text-[12px] font-semibold uppercase tracking-[0.03em] text-slate-600">
              Dia
            </label>
            <input
              type="date"
              value={txtDia}
              onChange={(e) => setTxtDia(e.target.value)}
              className={inputBase}
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row xl:items-end">
            <button
              type="button"
              onClick={() => buscarAlteracoes(1, 10)}
              disabled={loading}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-secondary px-5 text-sm font-semibold text-white shadow-sm transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
            >
              <FaSearch />
              {loading ? "Buscando..." : "Buscar"}
            </button>

            <button
              type="button"
              onClick={limpar}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 cursor-pointer"
            >
              <FaEraser />
              Limpar
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
              <FaFilePdf />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Total encontrado
              </p>
              <p className="text-2xl font-bold text-slate-900">{totalItems}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700">
              <FaCalendarAlt />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Página atual
              </p>
              <p className="text-2xl font-bold text-slate-900">{paginaAtual}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-lime-50 text-lime-700">
              <FaUserTie />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Total de páginas
              </p>
              <p className="text-2xl font-bold text-slate-900">{totalPages}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h3 className="text-lg font-semibold text-slate-900">
            Resultados da consulta
          </h3>
          <p className="text-sm text-slate-500">
            Visualize os dados e acesse as ações disponíveis para cada análise.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-50">
              <tr className="text-left">
                <th className="px-4 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                  CPF/CNPJ
                </th>
                <th className="px-4 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                  Dia
                </th>
                <th className="px-4 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                  Funcionário
                </th>
                <th className="px-4 py-4 text-center text-xs font-bold uppercase tracking-wide text-slate-500">
                  Informações
                </th>
                <th className="px-4 py-4 text-center text-xs font-bold uppercase tracking-wide text-slate-500">
                  Imprimir
                </th>
                <th className="px-4 py-4 text-center text-xs font-bold uppercase tracking-wide text-slate-500">
                  Assinatura
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-sm text-slate-500"
                  >
                    Carregando análises...
                  </td>
                </tr>
              ) : analises.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-sm text-slate-500"
                  >
                    Nenhum resultado encontrado.
                  </td>
                </tr>
              ) : (
                analises.map((analise) => (
                  <tr
                    key={analise.ID_ANALISE}
                    className="transition hover:bg-slate-50"
                  >
                    <td className="px-4 py-4 text-sm font-medium text-slate-700">
                      {analise.NR_CPF_CNPJ_ASSOCIADO}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600">
                      {formatDateBR(analise.DT)}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-700">
                      {primeiroUltimoNome(
                        capitalizeWords(analise.NM_FUNCIONARIO)
                      )}
                    </td>

                    <td className="px-4 py-4 text-center">
                      <button
                        onClick={() => abrirModalInfo(analise)}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-600 text-white transition hover:bg-slate-700"
                        title="Ver detalhes"
                      >
                        <FaInfoCircle />
                      </button>
                    </td>

                    <td className="px-4 py-4 text-center">
                      <button
                        onClick={() => imprimiAnalise(analise)}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-sky-600 text-white transition hover:bg-sky-700"
                        title="Imprimir"
                      >
                        <FaPrint />
                      </button>
                    </td>

                    <td className="px-4 py-4 text-center">
                      <button
                        onClick={() => abrirModalAssinatura(analise)}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white transition hover:bg-emerald-700"
                        title="Assinatura"
                      >
                        <FaSignature />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-center gap-2 border-t border-slate-200 px-4 py-5">
            <button
              onClick={() => buscarAlteracoes(Math.max(1, paginaAtual - 1), 10)}
              disabled={paginaAtual === 1}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Anterior
            </button>

            {paginationItems.map((item, index) =>
              item === "..." ? (
                <span
                  key={`dots-${index}`}
                  className="px-2 text-sm text-slate-400"
                >
                  ...
                </span>
              ) : (
                <button
                  key={item}
                  onClick={() => buscarAlteracoes(Number(item), 10)}
                  className={`h-10 min-w-[40px] rounded-xl px-3 text-sm font-semibold transition ${
                    paginaAtual === item
                      ? "bg-[#79B729] text-white"
                      : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {item}
                </button>
              )
            )}

            <button
              onClick={() =>
                buscarAlteracoes(Math.min(totalPages, paginaAtual + 1), 10)
              }
              disabled={paginaAtual === totalPages}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Próxima
            </button>
          </div>
        )}
      </div>

      {openInfoModal && selectedAnalise && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Detalhes da Análise
                </h3>
                <p className="text-sm text-slate-500">
                  Análise feita por{" "}
                  {primeiroUltimoNome(
                    capitalizeWords(selectedAnalise.NM_FUNCIONARIO)
                  )}{" "}
                  em {formatDateBR(selectedAnalise.DT)}
                </p>
              </div>

              <button
                onClick={() => setOpenInfoModal(false)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Fechar
              </button>
            </div>

            <div className="max-h-[calc(92vh-84px)] overflow-y-auto p-6">
              <div className="space-y-5">
                <Section title="Dados do Associado">
                  <FieldGrid>
                    <Field label="CPF/CNPJ" value={selectedAnalise.NR_CPF_CNPJ_ASSOCIADO} />
                    <Field label="Nome" value={selectedAnalise.NM_ASSOCIADO} colSpan="lg:col-span-2" />
                    <Field label="Celular" value={selectedAnalise.NR_CELULAR} />
                    {!ehPJSelecionado && (
                      <Field label="Empresa" value={selectedAnalise.NM_EMPRESA} colSpan="lg:col-span-2" />
                    )}
                  </FieldGrid>
                </Section>

                <Section title="Informações Bancárias e Salariais">
                  <FieldGrid>
                    <Field label="Conta Corrente" value={selectedAnalise.NR_CONTA_CORRENTE} />
                    <Field
                      label={ehPJSelecionado ? "Faturamento Mensal" : "Salário Bruto"}
                      value={
                        ehPJSelecionado
                          ? formatMoney(selectedAnalise.VL_FATURAMENTO_MENSAL)
                          : formatMoney(selectedAnalise.SL_BRUTO)
                      }
                    />
                    <Field
                      label={ehPJSelecionado ? "Faturamento Anual" : "Salário Líquido"}
                      value={
                        ehPJSelecionado
                          ? formatMoney(selectedAnalise.VL_FATURAMENTO_ANUAL)
                          : formatMoney(selectedAnalise.SL_LIQUIDO)
                      }
                    />

                    {!ehPJSelecionado && (
                      <>
                        <Field label="Possui Portabilidade?" value={boolToSimNao(selectedAnalise.PORTABILIDADE)} />
                        <Field label="Funcionário Efetivo?" value={boolToSimNao(selectedAnalise.FUNCIONARIO_EFETIVO)} />
                      </>
                    )}

                    <Field label="Cessão de Crédito?" value={boolToSimNao(selectedAnalise.CESSAO_CREDITO)} />

                    {!!selectedAnalise.CESSAO_CREDITO && (
                      <Field label="Data Pagamento" value={formatDateBR(selectedAnalise.DT_PAGAMENTO)} />
                    )}

                    <Field label="Nível Carteira" value={selectedAnalise.NV_CARTEIRA} />
                    <Field label="Números IAP" value={selectedAnalise.NR_IAP} />
                  </FieldGrid>
                </Section>

                <Section title="Status CRM e Observações">
                  <FieldGrid>
                    <Field label="Ocorrência CRM" value={boolToSimNao(selectedAnalise.OCORRENCIA_CRM)} />
                    <Field
                      label="Observação"
                      value={selectedAnalise.OBS_CRM}
                      colSpan="lg:col-span-2"
                      multiline
                    />
                  </FieldGrid>
                </Section>

                <Section title="Indicadores de Risco / Financeiros">
                  <FieldGrid>
                    <Field label="Risco" value={selectedAnalise.RISCO} />
                    <Field label="PD" value={selectedAnalise.PD} />
                    <Field label="CRL" value={formatMoney(selectedAnalise.NR_CRL)} />
                    <Field label="Capital" value={formatMoney(selectedAnalise.CAPITAL)} />
                    <Field label="Dívida" value={formatMoney(selectedAnalise.DIVIDA)} />
                    <Field label="Restrições?" value={boolToSimNao(selectedAnalise.RESTRICAO)} />
                    <Field
                      label="Quais?"
                      value={selectedAnalise.DESC_RESTRICAO}
                      colSpan="lg:col-span-3"
                    />
                  </FieldGrid>
                </Section>

                <Section title="Sugestão de Limite e Aprovações">
                  <FieldGrid>
                    <Field
                      label="Sugestão de Limite do Associado"
                      value={formatMoney(selectedAnalise.SG_LIMITE)}
                      colSpan="lg:col-span-3"
                    />
                    <Field label="Cartão?" value={boolToSimNao(selectedAnalise.CARTAO)} />
                    <Field label="Limite Atual Cartão" value={formatMoney(selectedAnalise.LT_ATUAL_CARTAO)} />
                    <Field label="Limite Aprovado Cartão" value={formatMoney(selectedAnalise.LT_APROVADO_CARTAO)} />

                    <Field label="Cheque Especial?" value={boolToSimNao(selectedAnalise.CHEQUE_ESPECIAL)} />
                    <Field label="Limite Atual Especial" value={formatMoney(selectedAnalise.LT_ATUAL_CH)} />
                    <Field label="Limite Aprovado Especial" value={formatMoney(selectedAnalise.LT_APROVADO_CH)} />
                  </FieldGrid>
                </Section>
              </div>
            </div>
          </div>
        </div>
      )}

      {openAssinaturaModal && selectedAnalise && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4">
          <div className="w-full max-w-xl rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Assinatura da Análise
                </h3>
                <p className="text-sm text-slate-500">
                  Gerencie o arquivo assinado desta análise.
                </p>
              </div>

              <button
                onClick={() => setOpenAssinaturaModal(false)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Fechar
              </button>
            </div>

            <div className="space-y-5 p-6">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <label className="mb-3 block text-sm font-semibold text-slate-700">
                  Upload de Arquivo Assinado
                </label>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) =>
                      setArquivoAssinatura(e.target.files?.[0] || null)
                    }
                    className="block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700"
                  />

                  <button
                    onClick={salvarAssinatura}
                    disabled={salvandoAssinatura}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                  >
                    <FaUpload />
                    {salvandoAssinatura ? "Salvando..." : "Salvar"}
                  </button>
                </div>

                {arquivoAssinatura && (
                  <p className="mt-3 text-sm text-slate-500">
                    Arquivo selecionado:{" "}
                    <span className="font-medium text-slate-700">
                      {arquivoAssinatura.name}
                    </span>
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="mb-2 text-sm font-semibold text-slate-700">
                  Arquivo atual salvo
                </p>
                <p className="text-sm text-slate-500">
                  {selectedAnalise.NM_ASSINATURA
                    ? selectedAnalise.NM_ASSINATURA.split("/").pop()
                    : "Nenhum arquivo enviado ainda."}
                </p>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => baixarArquivo(selectedAnalise.NM_ASSINATURA)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:brightness-95"
                >
                  <FaDownload />
                  Baixar Documento
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}