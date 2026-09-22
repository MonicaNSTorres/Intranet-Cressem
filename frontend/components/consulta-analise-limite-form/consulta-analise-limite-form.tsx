"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useRef, useState } from "react";
import {
  FaSearch,
  FaEraser,
  FaInfoCircle,
  FaPrint,
  FaSignature,
  FaDownload,
  FaUpload,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";
import {
  listarAnalisesLimite,
  buscarAnaliseLimitePorId,
} from "@/services/analise_limite.service";
import { gerarPdfAnaliseLimite } from "@/lib/pdf/gerarPdfAnaliseLimite";

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
  SG_LIMITE_CARTAO?: number | string;
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
  "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#00AE9D] focus:ring-2 focus:ring-[#00AE9D]/10";

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

function onlyCpfCnpjChars(value: string) {
  return String(value || "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase();
}

function isPJ(doc?: string) {
  return onlyCpfCnpjChars(doc || "").length === 14;
}

function formatCpfCnpjView(value?: string) {
  const digits = onlyCpfCnpjChars(value || "");

  if (digits.length <= 11 && !/[A-Z]/.test(digits)) {
    const s = digits.slice(0, 11);
    if (s.length <= 3) return s;
    if (s.length <= 6) return `${s.slice(0, 3)}.${s.slice(3)}`;
    if (s.length <= 9) return `${s.slice(0, 3)}.${s.slice(3, 6)}.${s.slice(6)}`;
    return `${s.slice(0, 3)}.${s.slice(3, 6)}.${s.slice(6, 9)}-${s.slice(9)}`;
  }

  const s = digits.slice(0, 14);
  if (s.length <= 2) return s;
  if (s.length <= 5) return `${s.slice(0, 2)}.${s.slice(2)}`;
  if (s.length <= 8) return `${s.slice(0, 2)}.${s.slice(2, 5)}.${s.slice(5)}`;
  if (s.length <= 12) return `${s.slice(0, 2)}.${s.slice(2, 5)}.${s.slice(5, 8)}/${s.slice(8)}`;
  return `${s.slice(0, 2)}.${s.slice(2, 5)}.${s.slice(5, 8)}/${s.slice(8, 12)}-${s.slice(12)}`;
}

function toFlag(value: any): "1" | "0" {
  if (
    value === true ||
    value === 1 ||
    value === "1" ||
    value === "S" ||
    value === "SIM" ||
    value === "Sim"
  ) {
    return "1";
  }

  return "0";
}

function toNumberValue(value: any): number {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  const normalized = String(value).replace(/[^\d,.-]/g, "").replace(/\s/g, "");
  const comma = normalized.includes(",");
  const dot = normalized.includes(".");

  if (comma && dot) {
    const n = Number(normalized.replace(/\./g, "").replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  }

  if (comma) {
    const n = Number(normalized.replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  }

  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
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
      <label className="mb-2 block text-[11px] font-black uppercase tracking-wide text-slate-600">
        {label}
      </label>
      <div
        className={`rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-3 text-sm font-semibold text-slate-800 shadow-sm ${multiline ? "min-h-[96px] whitespace-pre-wrap" : ""
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
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-white px-5 py-4">
        <h3 className="flex items-center gap-2 text-sm font-black text-slate-950 before:h-2 before:w-2 before:rounded-full before:bg-[#00AE9D]">
          {title}
        </h3>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function FieldGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{children}</div>;
}

function Pagination({
  currentPage,
  totalPages,
  totalItems,
  limit,
  loading,
  onChange,
  onLimitChange,
}: {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  limit: number;
  loading: boolean;
  onChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
}) {
  const primeiroRegistro = totalItems === 0 ? 0 : (currentPage - 1) * limit + 1;
  const ultimoRegistro = Math.min(currentPage * limit, totalItems);

  return (
    <div className="border-t border-slate-100 bg-white px-4 py-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <p className="text-sm text-slate-500">
            Mostrando{" "}
            <span className="font-semibold text-slate-700">
              {primeiroRegistro}
            </span>{" "}
            até{" "}
            <span className="font-semibold text-slate-700">
              {ultimoRegistro}
            </span>{" "}
            de{" "}
            <span className="font-semibold text-slate-700">{totalItems}</span>{" "}
            análise(s)
          </p>

          <select
            value={limit}
            onChange={(event) => onLimitChange(Number(event.target.value))}
            disabled={loading}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-[#00AE9D] focus:ring-2 focus:ring-[#00AE9D]/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value={10}>10 por página</option>
            <option value={20}>20 por página</option>
            <option value={50}>50 por página</option>
            <option value={100}>100 por página</option>
          </select>
        </div>

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => onChange(Math.max(currentPage - 1, 1))}
            disabled={currentPage <= 1 || loading}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FaChevronLeft />
            Anterior
          </button>

          <span className="rounded-xl bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">
            Página {currentPage} de {totalPages}
          </span>

          <button
            type="button"
            onClick={() => onChange(Math.min(currentPage + 1, totalPages))}
            disabled={currentPage >= totalPages || loading}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Próxima
            <FaChevronRight />
          </button>
        </div>
      </div>
    </div>
  );
}

export function ConsultaAnaliseLimiteForm() {
  const [txtAnalise, setTxtAnalise] = useState("");
  const [txtDia, setTxtDia] = useState("");

  const [analises, setAnalises] = useState<AnaliseLimite[]>([]);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);

  const [selectedAnalise, setSelectedAnalise] = useState<AnaliseLimite | null>(null);
  const [openInfoModal, setOpenInfoModal] = useState(false);
  const [openAssinaturaModal, setOpenAssinaturaModal] = useState(false);

  const [arquivoAssinatura, setArquivoAssinatura] = useState<File | null>(null);
  const [salvandoAssinatura, setSalvandoAssinatura] = useState(false);
  const assinaturaInputRef = useRef<HTMLInputElement | null>(null);

  async function buscarAlteracoes(page = 1, limit = 10) {
    try {
      setLoading(true);

      const docBusca = onlyCpfCnpjChars(txtAnalise);

      const isCpfOuCnpj =
        docBusca.length === 11 || docBusca.length === 14;

      const response: ApiResponse = await listarAnalisesLimite({
        page,
        limit,
        cpf: isCpfOuCnpj ? docBusca : "",
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
    setLimit(10);
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

  async function imprimiAnalise(analise: AnaliseLimite) {
    try {
      const detalhada = await buscarAnaliseLimitePorId(analise.ID_ANALISE).catch(
        () => analise
      );

      const ehPJ = isPJ(detalhada.NR_CPF_CNPJ_ASSOCIADO);

      await gerarPdfAnaliseLimite(
        {
          tipoFormulario: ehPJ ? "PJ" : "PF",
          cpf: formatCpfCnpjView(detalhada.NR_CPF_CNPJ_ASSOCIADO || ""),
          nome: String(detalhada.NM_ASSOCIADO || ""),
          celular: String(detalhada.NR_CELULAR || ""),
          empresa: String(detalhada.NM_EMPRESA || ""),

          contaCorrente: String(detalhada.NR_CONTA_CORRENTE || ""),
          salarioBruto: ehPJ
            ? toNumberValue(detalhada.VL_FATURAMENTO_MENSAL)
            : toNumberValue(detalhada.SL_BRUTO),
          salarioLiquido: ehPJ
            ? toNumberValue(detalhada.VL_FATURAMENTO_ANUAL)
            : toNumberValue(detalhada.SL_LIQUIDO),
          portabilidade: toFlag(detalhada.PORTABILIDADE),
          efetivo: toFlag(detalhada.FUNCIONARIO_EFETIVO),
          cessaoCredito: toFlag(detalhada.CESSAO_CREDITO),
          dataPagamento: String(detalhada.DT_PAGAMENTO || ""),
          carteira: String(detalhada.NV_CARTEIRA || ""),
          iap: String(detalhada.NR_IAP ?? ""),

          ocorrenciaCRM: toFlag(detalhada.OCORRENCIA_CRM),
          obsCRM: String(detalhada.OBS_CRM || ""),

          risco: String(detalhada.RISCO || ""),
          pd: String(detalhada.PD || ""),
          crl: toNumberValue(detalhada.NR_CRL),
          capital: toNumberValue(detalhada.CAPITAL),
          divida: toNumberValue(detalhada.DIVIDA),
          restricoes: toFlag(detalhada.RESTRICAO),
          quaisRestricoes: String(detalhada.DESC_RESTRICAO || ""),

          sugestaoLimiteCartao: toNumberValue(
            detalhada.SG_LIMITE_CARTAO ?? detalhada.SG_LIMITE
          ),
          sugestaoLimiteCheque: toNumberValue(detalhada.SG_LIMITE),
          cartao: toFlag(detalhada.CARTAO),
          cartaoAtual: toNumberValue(detalhada.LT_ATUAL_CARTAO),
          cartaoAprovado: toNumberValue(detalhada.LT_APROVADO_CARTAO),
          especial: toFlag(detalhada.CHEQUE_ESPECIAL),
          especialAtual: toNumberValue(detalhada.LT_ATUAL_CH),
          especialAprovado: toNumberValue(detalhada.LT_APROVADO_CH),

          dataEnvio: String(detalhada.DT || "").slice(0, 10),
        },
        { acao: "print" }
      );
    } catch (error) {
      console.error("Erro ao imprimir análise:", error);
      alert("Não foi possível imprimir a análise.");
    }
  }

  function buscarAoPressionarEnter(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      buscarAlteracoes(1, limit);
    }
  }

  useEffect(() => {
    buscarAlteracoes(1, 10);
    // A busca inicial deve rodar só uma vez ao abrir a consulta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ehPJSelecionado = selectedAnalise
    ? isPJ(selectedAnalise.NR_CPF_CNPJ_ASSOCIADO)
    : false;

  return (
    <div className="mx-auto w-full space-y-5">
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-white px-5 py-4">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-black text-slate-950 before:h-2 before:w-2 before:rounded-full before:bg-[#00AE9D]">
              Consulta de Análise de Limite
            </h2>
            <p className="mt-1 text-sm font-medium text-slate-500">
              Busque análises cadastradas, visualize detalhes e gerencie assinaturas.
            </p>
          </div>
        </div>
        </div>

        <div className="grid gap-4 p-5 xl:grid-cols-[minmax(0,1fr)_220px_auto]">
          <div>
            <label className="mb-2 block text-[11px] font-black uppercase tracking-wide text-slate-600">
              Nome, CPF/CNPJ ou Funcionário
            </label>
            <input
              type="text"
              value={
                /^\d+$/.test(txtAnalise.replace(/\D/g, ""))
                  ? formatCpfCnpjView(txtAnalise)
                  : txtAnalise
              }
              onChange={(e) => {
                const value = e.target.value;

                const doc = onlyCpfCnpjChars(value);

                if (doc.length > 0 && /^[A-Z0-9.\-\/]+$/i.test(value)) {
                  setTxtAnalise(doc.slice(0, 14));
                } else {
                  setTxtAnalise(value);
                }
              }}
              onKeyDown={buscarAoPressionarEnter}
              placeholder="Nome, CPF/CNPJ ou Funcionário"
              className={inputBase}
            />
          </div>

          <div>
            <label className="mb-2 block text-[11px] font-black uppercase tracking-wide text-slate-600">
              Dia
            </label>
            <input
              type="date"
              value={txtDia}
              onChange={(e) => setTxtDia(e.target.value)}
              onKeyDown={buscarAoPressionarEnter}
              className={inputBase}
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row xl:items-end">
            <button
              type="button"
              onClick={() => buscarAlteracoes(1, limit)}
              disabled={loading}
              className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#79B729] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#00AE9D] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FaSearch />
              {loading ? "Buscando..." : "Buscar"}
            </button>

            <button
              type="button"
              onClick={limpar}
              className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-[#49479D] hover:text-[#49479D]"
            >
              <FaEraser />
              Limpar
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-white px-5 py-4">
          <h3 className="flex items-center gap-2 text-lg font-black text-slate-950 before:h-2 before:w-2 before:rounded-full before:bg-[#00AE9D]">
            Resultados da consulta
          </h3>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Visualize os dados e acesse as ações disponíveis para cada análise.
            {totalItems > 0 ? ` Total localizado: ${totalItems}.` : ""}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-50">
              <tr className="text-left">
                <th className="px-4 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                  Solicitante
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
                  <td colSpan={6} className="px-4 py-10 text-center text-sm font-medium text-slate-500">
                    Carregando análises...
                  </td>
                </tr>
              ) : analises.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm font-medium text-slate-500">
                    Nenhum resultado encontrado.
                  </td>
                </tr>
              ) : (
                analises.map((analise) => (
                  <tr
                    key={analise.ID_ANALISE}
                    className="transition hover:bg-[#00AE9D]/5"
                  >
                    <td className="px-4 py-4">
                      <div className="text-sm font-bold text-slate-800">
                        {capitalizeWords(analise.NM_ASSOCIADO) || "-"}
                      </div>
                      <div className="mt-1 text-xs font-semibold text-slate-500">
                        {formatCpfCnpjView(analise.NR_CPF_CNPJ_ASSOCIADO)}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm font-medium text-slate-600">
                      {formatDateBR(analise.DT)}
                    </td>
                    <td className="px-4 py-4 text-sm font-semibold text-slate-700">
                      {primeiroUltimoNome(
                        capitalizeWords(analise.NM_FUNCIONARIO)
                      )}
                    </td>

                    <td className="px-4 py-4 text-center">
                      <button
                        onClick={() => abrirModalInfo(analise)}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#49479D] text-white shadow-sm transition hover:bg-[#00AE9D]"
                        title="Ver detalhes"
                      >
                        <FaInfoCircle />
                      </button>
                    </td>

                    <td className="px-4 py-4 text-center">
                      <button
                        onClick={() => imprimiAnalise(analise)}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#00AE9D] text-white shadow-sm transition hover:bg-[#79B729]"
                        title="Imprimir"
                      >
                        <FaPrint />
                      </button>
                    </td>

                    <td className="px-4 py-4 text-center">
                      <button
                        onClick={() => abrirModalAssinatura(analise)}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#C7D300] text-[#006f65] shadow-sm transition hover:bg-[#00AE9D] hover:text-white"
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

        {totalItems > 0 && (
          <Pagination
            currentPage={paginaAtual}
            totalPages={Math.max(totalPages, 1)}
            totalItems={totalItems}
            limit={limit}
            loading={loading}
            onChange={(page) => buscarAlteracoes(page, limit)}
            onLimitChange={(novoLimit) => {
              setLimit(novoLimit);
              buscarAlteracoes(1, novoLimit);
            }}
          />
        )}
      </div>

      {openInfoModal && selectedAnalise && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4">
              <div>
                <h3 className="text-lg font-black text-slate-950">
                  Detalhes da Análise
                </h3>
                <p className="text-sm font-medium text-slate-500">
                  Análise feita por{" "}
                  {primeiroUltimoNome(
                    capitalizeWords(selectedAnalise.NM_FUNCIONARIO)
                  )}{" "}
                  em {formatDateBR(selectedAnalise.DT)}
                </p>
              </div>

              <button
                onClick={() => setOpenInfoModal(false)}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-[#49479D] hover:text-[#49479D]"
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
                      <Field label="Data de Pagamento" value={formatDateBR(selectedAnalise.DT_PAGAMENTO)} />
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
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Field label="Cartão?" value={boolToSimNao(selectedAnalise.CARTAO)} />
                    <Field label="Limite Atual Cartão" value={formatMoney(selectedAnalise.LT_ATUAL_CARTAO)} />
                    <Field
                      label="Sugestão de Limite Cartão"
                      value={formatMoney(selectedAnalise.SG_LIMITE_CARTAO ?? selectedAnalise.SG_LIMITE)}
                    />
                    <Field label="Limite Aprovado Cartão" value={formatMoney(selectedAnalise.LT_APROVADO_CARTAO)} />

                    <Field label="Cheque Especial?" value={boolToSimNao(selectedAnalise.CHEQUE_ESPECIAL)} />
                    <Field label="Limite Atual Cheque" value={formatMoney(selectedAnalise.LT_ATUAL_CH)} />
                    <Field label="Sugestão de Limite Cheque" value={formatMoney(selectedAnalise.SG_LIMITE)} />
                    <Field label="Limite Aprovado Cheque" value={formatMoney(selectedAnalise.LT_APROVADO_CH)} />
                  </div>
                </Section>
              </div>
            </div>
          </div>
        </div>
      )}

      {openAssinaturaModal && selectedAnalise && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4">
          <div className="w-full max-w-xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4">
              <div>
                <h3 className="text-lg font-black text-slate-950">
                  Assinatura da Análise
                </h3>
                <p className="text-sm font-medium text-slate-500">
                  Gerencie o arquivo assinado desta análise.
                </p>
              </div>

              <button
                onClick={() => setOpenAssinaturaModal(false)}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-[#49479D] hover:text-[#49479D]"
              >
                Fechar
              </button>
            </div>

            <div className="space-y-5 p-6">
              <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
                <label className="mb-3 block text-sm font-black text-slate-700">
                  Upload de Arquivo Assinado
                </label>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <input
                    ref={assinaturaInputRef}
                    type="file"
                    accept=".pdf"
                    onChange={(e) =>
                      setArquivoAssinatura(e.target.files?.[0] || null)
                    }
                    className="hidden"
                  />

                  <div className="flex h-10 min-w-0 flex-1 items-center overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <button
                      type="button"
                      onClick={() => assinaturaInputRef.current?.click()}
                      className="ml-1 inline-flex h-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-200"
                    >
                      Procurar...
                    </button>

                    <span className="min-w-0 truncate px-3 text-sm font-medium text-slate-600">
                      {arquivoAssinatura?.name || "Nenhum arquivo selecionado."}
                    </span>
                  </div>

                  <button
                    onClick={salvarAssinatura}
                    disabled={salvandoAssinatura}
                    className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#79B729] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#00AE9D] disabled:opacity-60"
                  >
                    <FaUpload />
                    {salvandoAssinatura ? "Salvando..." : "Salvar"}
                  </button>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="mb-2 text-sm font-black text-slate-700">
                  Arquivo atual salvo
                </p>
                <p className="text-sm font-medium text-slate-500">
                  {selectedAnalise.NM_ASSINATURA
                    ? selectedAnalise.NM_ASSINATURA.split("/").pop()
                    : "Nenhum arquivo enviado ainda."}
                </p>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => baixarArquivo(selectedAnalise.NM_ASSINATURA)}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#00AE9D] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#79B729]"
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

