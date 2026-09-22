"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  FaChartLine,
  FaChevronLeft,
  FaChevronRight,
  FaClock,
  FaDownload,
  FaEraser,
  FaExclamationTriangle,
  FaEye,
  FaFilter,
  FaHeadset,
  FaSearch,
  FaSitemap,
  FaTicketAlt,
  FaTimes,
  FaExchangeAlt,
  FaUserTie,
} from "react-icons/fa";
import {
  listarMonitorAtendimentoBlip,
  type MonitorAtendimentoBlipItem,
  type MonitorAtendimentoBlipParams,
  type MonitorAtendimentoBlipRankingFila,
  type MonitorAtendimentoBlipRankingFuncionario,
  type MonitorAtendimentoBlipRankingGerente,
} from "@/services/monitor_atendimento_blip.service";

const inputBase =
  "h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-[#00AE9D] focus:ring-4 focus:ring-[#00AE9D]/10";

const hoje = new Date();
const trintaDiasAtras = new Date();
trintaDiasAtras.setDate(hoje.getDate() - 30);

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function limparInicio(value: string) {
  return String(value || "").replace(/^\s+/, "");
}

function formatarData(value?: string | null) {
  if (!value) return "-";
  const texto = String(value).trim();
  const match = texto.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/);

  if (match) {
    const [, ano, mes, dia, hora = "00", minuto = "00"] = match;
    return `${dia}/${mes}/${ano} ${hora}:${minuto}`;
  }

  return texto;
}

function formatarNumero(value: unknown, digits = 0) {
  const numero = Number(value || 0);
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Number.isFinite(numero) ? numero : 0);
}

function tipoLabel(value?: string | null) {
  if (value === "PRIMEIRA_RESPOSTA") return "Primeira resposta";
  if (value === "ESPERA_FILA") return "Espera em fila";
  return "-";
}

function eventoResumo(value?: string | null) {
  const texto = String(value || "").trim();
  if (!texto) return "-";

  if (texto.toUpperCase().includes("EMAIL")) {
    const minutos = texto.match(/(\d+)\s*minutos?/i)?.[1];
    return minutos ? `E-mail de atraso (${minutos}m)` : "E-mail de atraso";
  }

  if (texto.toUpperCase().includes("TRANSFERIDO")) {
    const minutos = texto.match(/(\d+)\s*minutos?/i)?.[1];
    return minutos ? `Transferência de fila (${minutos}m)` : "Transferência de fila";
  }

  if (texto.toUpperCase().includes("PRIMEIRA")) {
    const minutos = texto.match(/(\d+)\s*minutos?/i)?.[1];
    return minutos ? `Primeira resposta (${minutos}m)` : "Primeira resposta";
  }

  return texto;
}

function gravidadeClass(value?: string | null) {
  const gravidade = String(value || "").toUpperCase();

  if (gravidade === "CRITICA") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (gravidade === "ALTA") {
    return "border-orange-200 bg-orange-50 text-orange-700";
  }

  if (gravidade === "BAIXA") {
    return "border-yellow-200 bg-yellow-50 text-yellow-700";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function csvCell(value: unknown) {
  const text = String(value ?? "").replace(/\r?\n|\r/g, " ").trim();
  return `"${text.replace(/"/g, '""')}"`;
}

function baixarCsv(filename: string, rows: unknown[][]) {
  const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(";")).join("\r\n")}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function StatCard({
  icon,
  label,
  value,
  hint,
  variant = "default",
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  hint: string;
  variant?: "default" | "danger" | "warning" | "success";
}) {
  const classes = {
    default: "border-slate-200 bg-white text-slate-900",
    danger: "border-red-200 bg-red-50 text-red-700",
    warning: "border-orange-200 bg-orange-50 text-orange-700",
    success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  };

  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${classes[variant]}`}>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/80 shadow-sm">
          {icon}
        </div>
        <span className="text-[11px] font-bold uppercase tracking-[0.08em] opacity-70">
          {label}
        </span>
      </div>
      <div className="text-3xl font-black leading-none">{value}</div>
      <p className="mt-2 text-xs font-medium opacity-75">{hint}</p>
    </div>
  );
}

function RankingCard({
  title,
  subtitle,
  icon,
  items,
  type,
}: {
  title: string;
  subtitle: string;
  icon: ReactNode;
  items: Array<
    | MonitorAtendimentoBlipRankingFuncionario
    | MonitorAtendimentoBlipRankingFila
    | MonitorAtendimentoBlipRankingGerente
  >;
  type: "funcionario" | "fila" | "gerente";
}) {
  function getNome(item: any) {
    if (type === "funcionario") return item.RESPONSAVEL;
    if (type === "fila") return item.FILA;
    return item.GERENTE;
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-[#00AE9D]">
            {icon}
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900">{title}</h3>
            <p className="text-xs text-slate-500">{subtitle}</p>
          </div>
        </div>
      </div>

      <div className="divide-y divide-slate-100">
        {items.length ? (
          items.map((item: any, index) => (
            <div key={`${type}-${getNome(item)}-${index}`} className="px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-black text-slate-600">
                      {index + 1}
                    </span>
                    <p className="truncate text-sm font-black text-slate-900">
                      {getNome(item) || "Não informado"}
                    </p>
                  </div>
                  {type !== "gerente" && (
                    <p className="mt-1 truncate pl-8 text-xs text-slate-500">
                      Gerente: {item.GERENTE || "Sem gerente"}
                    </p>
                  )}
                </div>

                <div className="text-right">
                  <p className="text-lg font-black text-slate-900">
                    {formatarNumero(item.QTD_ALERTAS)}
                  </p>
                  <p className="text-[11px] uppercase text-slate-400">alertas</p>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-center text-[11px] xl:grid-cols-5">
                <div className="rounded-xl bg-red-50 px-2 py-2 font-bold text-red-700">
                  {formatarNumero(item.QTD_CRITICOS)} críticos
                </div>
                <div className="rounded-xl bg-orange-50 px-2 py-2 font-bold text-orange-700">
                  {formatarNumero(item.QTD_ALTOS)} altos
                </div>
                <div className="rounded-xl bg-yellow-50 px-2 py-2 font-bold text-yellow-700">
                  {formatarNumero(item.QTD_BAIXOS)} baixos
                </div>
                <div className="rounded-xl bg-slate-50 px-2 py-2 font-bold text-slate-600">
                  média {formatarNumero(item.MEDIA_MINUTOS, 1)}m
                </div>
                <div className="rounded-xl bg-slate-50 px-2 py-2 font-bold text-slate-600">
                  máx. {formatarNumero(item.MAIOR_ESPERA)}m
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="px-5 py-10 text-center text-sm text-slate-500">
            Nenhum alerta encontrado.
          </div>
        )}
      </div>
    </section>
  );
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
  const primeiro = totalItems === 0 ? 0 : (currentPage - 1) * limit + 1;
  const ultimo = Math.min(currentPage * limit, totalItems);

  return (
    <div className="border-t border-slate-100 bg-white px-4 py-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <p className="text-sm text-slate-500">
            Mostrando <span className="font-semibold text-slate-700">{primeiro}</span> até{" "}
            <span className="font-semibold text-slate-700">{ultimo}</span> de{" "}
            <span className="font-semibold text-slate-700">{totalItems}</span> ocorrência(s)
          </p>

          <select
            value={limit}
            onChange={(event) => onLimitChange(Number(event.target.value))}
            disabled={loading}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none transition focus:border-[#00AE9D] focus:ring-2 focus:ring-[#00AE9D]/10 disabled:cursor-not-allowed disabled:opacity-60"
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

function DetalheOcorrenciaModal({
  item,
  onClose,
}: {
  item: MonitorAtendimentoBlipItem | null;
  onClose: () => void;
}) {
  if (!item) return null;

  const detalhes: Array<[string, string | number]> = [
    ["Tipo", tipoLabel(item.TIPO_MONITOR)],
    ["Evento", item.EVENT_TYPE || "-"],
    ["Ticket", item.TICKET_ID || "-"],
    ["Sequencial", item.SEQUENTIAL_ID || "-"],
    ["Sequencial pai", item.PARENT_SEQUENTIAL_ID || "-"],
    ["Cliente", item.CUSTOMER_NAME || "-"],
    ["Identidade cliente", item.CUSTOMER_IDENTITY || "-"],
    ["Agente Blip", item.AGENT_IDENTITY || "-"],
    ["Responsável", item.RESPONSAVEL || "-"],
    ["Gerente", item.GERENTE || "-"],
    ["Fila origem", item.FILA_ORIGEM || "-"],
    ["Fila destino", item.FILA_DESTINO || "-"],
    ["Status no Blip", item.STATUS_ATENDIMENTO || "-"],
    ["Campanha", item.CAMPAIGN_ID || "-"],
    ["Data de abertura", formatarData(item.DATA_ABERTURA)],
    ["Data do alerta", formatarData(item.DATA_EVENTO)],
    ["Minutos", `${formatarNumero(item.MINUTOS)}m`],
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.12em] text-[#00AE9D]">
              Detalhe da ocorrência
            </p>
            <h3 className="mt-1 text-xl font-black text-slate-900">
              {eventoResumo(item.EVENT_TYPE)}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Ticket {item.SEQUENTIAL_ID || item.TICKET_ID || "-"} • {item.CUSTOMER_NAME || "Cliente não informado"}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50"
            aria-label="Fechar detalhes"
          >
            <FaTimes />
          </button>
        </div>

        <div className="max-h-[calc(90vh-92px)] overflow-y-auto p-6">
          <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className={`rounded-2xl border p-4 ${gravidadeClass(item.GRAVIDADE)}`}>
              <p className="text-xs font-black uppercase opacity-70">Gravidade</p>
              <p className="mt-2 text-2xl font-black">{item.GRAVIDADE}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-black uppercase text-slate-500">Tempo registrado</p>
              <p className="mt-2 text-2xl font-black text-slate-900">
                {formatarNumero(item.MINUTOS)} min
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-black uppercase text-slate-500">Origem</p>
              <p className="mt-2 text-sm font-black text-slate-900">
                {tipoLabel(item.TIPO_MONITOR)}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200">
            <div className="grid grid-cols-1 divide-y divide-slate-100 md:grid-cols-2 md:divide-x md:divide-y-0">
              {detalhes.map(([label, value]) => (
                <div key={label} className="border-b border-slate-100 px-4 py-3 last:border-b-0">
                  <p className="text-[11px] font-black uppercase tracking-[0.05em] text-slate-500">
                    {label}
                  </p>
                  <p className="mt-1 break-words text-sm font-semibold text-slate-900">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-black uppercase tracking-[0.05em] text-slate-500">
              Observações da automação
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm font-semibold text-slate-700">
              {item.OBSERVACOES || "Nenhuma observação registrada."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MonitorAtendimentoBlip() {
  const [dataInicio, setDataInicio] = useState(toIsoDate(trintaDiasAtras));
  const [dataFim, setDataFim] = useState(toIsoDate(hoje));
  const [gravidade, setGravidade] =
    useState<MonitorAtendimentoBlipParams["gravidade"]>("TODAS");
  const [tipo, setTipo] =
    useState<MonitorAtendimentoBlipParams["tipo"]>("PRIMEIRA_RESPOSTA");
  const [gerente, setGerente] = useState("");
  const [agente, setAgente] = useState("");
  const [fila, setFila] = useState("");
  const [statusAtendimento, setStatusAtendimento] = useState("TODOS");
  const [evento, setEvento] = useState("");
  const [minutosMin, setMinutosMin] = useState("");
  const [busca, setBusca] = useState("");
  const [items, setItems] = useState<MonitorAtendimentoBlipItem[]>([]);
  const [rankingFuncionarios, setRankingFuncionarios] = useState<MonitorAtendimentoBlipRankingFuncionario[]>([]);
  const [rankingFilas, setRankingFilas] = useState<MonitorAtendimentoBlipRankingFila[]>([]);
  const [rankingGerentes, setRankingGerentes] = useState<MonitorAtendimentoBlipRankingGerente[]>([]);
  const [resumo, setResumo] = useState({
    total: 0,
    criticos: 0,
    altos: 0,
    baixos: 0,
    primeira_resposta: 0,
    espera_fila: 0,
    alertas_email: 0,
    transferencias: 0,
    tickets: 0,
    media_minutos: 0,
    maior_espera: 0,
  });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);
  const [baixando, setBaixando] = useState(false);
  const [erro, setErro] = useState("");
  const [selecionado, setSelecionado] = useState<MonitorAtendimentoBlipItem | null>(null);

  const paramsAtuais = useMemo<MonitorAtendimentoBlipParams>(() => ({
    dataInicio,
    dataFim,
    gravidade,
    tipo,
    gerente: gerente.trim() || undefined,
    agente: agente.trim() || undefined,
    fila: fila.trim() || undefined,
    statusAtendimento: statusAtendimento !== "TODOS" ? statusAtendimento : undefined,
    evento: evento.trim() || undefined,
    minutosMin: minutosMin ? Number(minutosMin) : undefined,
    busca: busca.trim() || undefined,
    incluirNormal: "N",
    page,
    limit,
  }), [
    agente,
    busca,
    dataFim,
    dataInicio,
    evento,
    fila,
    gerente,
    gravidade,
    limit,
    minutosMin,
    page,
    statusAtendimento,
    tipo,
  ]);

  async function carregar(
    novaPagina = page,
    novoLimit = limit,
    paramsOverride?: MonitorAtendimentoBlipParams
  ) {
    try {
      setLoading(true);
      setErro("");

      const response = await listarMonitorAtendimentoBlip({
        ...(paramsOverride || paramsAtuais),
        page: novaPagina,
        limit: novoLimit,
      });

      setItems(response.items || []);
      setResumo(response.resumo || resumo);
      setRankingFuncionarios(response.ranking_funcionarios || []);
      setRankingFilas(response.ranking_filas || []);
      setRankingGerentes(response.ranking_gerentes || []);
      setPage(Number(response.page || novaPagina));
      setLimit(Number(response.limit || novoLimit));
      setTotalPages(Number(response.total_pages || 1));
      setTotalItems(Number(response.total || 0));
    } catch (error: any) {
      console.error(error);
      setErro(
        error?.response?.data?.error ||
          error?.response?.data?.details ||
          "Não foi possível carregar o monitor de atendimento."
      );
    } finally {
      setLoading(false);
    }
  }

  function limparFiltros() {
    setDataInicio(toIsoDate(trintaDiasAtras));
    setDataFim(toIsoDate(hoje));
    setGravidade("TODAS");
    setTipo("PRIMEIRA_RESPOSTA");
    setGerente("");
    setAgente("");
    setFila("");
    setStatusAtendimento("TODOS");
    setEvento("");
    setMinutosMin("");
    setBusca("");
    setPage(1);
    carregar(1, limit, {
      dataInicio: toIsoDate(trintaDiasAtras),
      dataFim: toIsoDate(hoje),
      gravidade: "TODAS",
      tipo: "PRIMEIRA_RESPOSTA",
      statusAtendimento: undefined,
      evento: undefined,
      minutosMin: undefined,
      incluirNormal: "N",
    });
  }

  function selecionarVisao(novoTipo: MonitorAtendimentoBlipParams["tipo"]) {
    setTipo(novoTipo);
    setPage(1);
    carregar(1, limit, {
      ...paramsAtuais,
      tipo: novoTipo,
      page: 1,
      limit,
    });
  }

  async function baixarRelatorioCsv() {
    try {
      setBaixando(true);
      setErro("");

      const limiteCsv = 100;
      const primeiraPagina = await listarMonitorAtendimentoBlip({
        ...paramsAtuais,
        page: 1,
        limit: limiteCsv,
      });
      const totalPaginasCsv = Math.max(Number(primeiraPagina.total_pages || 1), 1);
      const registros = [...(primeiraPagina.items || [])];

      for (let paginaCsv = 2; paginaCsv <= totalPaginasCsv; paginaCsv += 1) {
        const pagina = await listarMonitorAtendimentoBlip({
          ...paramsAtuais,
          page: paginaCsv,
          limit: limiteCsv,
        });
        registros.push(...(pagina.items || []));
      }

      baixarCsv("monitor_atendimento_blip.csv", [
        [
          "Tipo",
          "Gravidade",
          "Evento resumido",
          "Evento original",
          "Ticket",
          "Sequencial",
          "Cliente",
          "Identidade cliente",
          "Agente Blip",
          "Responsável",
          "Gerente",
          "Fila origem",
          "Fila destino",
          "Status Blip",
          "Campanha",
          "Data abertura",
          "Minutos",
          "Data alerta",
          "Observações",
        ],
        ...registros.map((item) => [
          tipoLabel(item.TIPO_MONITOR),
          item.GRAVIDADE,
          eventoResumo(item.EVENT_TYPE),
          item.EVENT_TYPE || "-",
          item.TICKET_ID,
          item.SEQUENTIAL_ID || "-",
          item.CUSTOMER_NAME,
          item.CUSTOMER_IDENTITY || "-",
          item.AGENT_IDENTITY || "-",
          item.RESPONSAVEL || "-",
          item.GERENTE || "-",
          item.FILA_ORIGEM || "-",
          item.FILA_DESTINO || "-",
          item.STATUS_ATENDIMENTO || "-",
          item.CAMPAIGN_ID || "-",
          formatarData(item.DATA_ABERTURA),
          item.MINUTOS,
          formatarData(item.DATA_EVENTO),
          item.OBSERVACOES || "-",
        ]),
      ]);
    } catch (error: any) {
      console.error(error);
      setErro(
        error?.response?.data?.error ||
          error?.response?.data?.details ||
          "Não foi possível baixar o CSV."
      );
    } finally {
      setBaixando(false);
    }
  }

  useEffect(() => {
    carregar(1, limit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mostrarFuncionarios = tipo !== "ESPERA_FILA";
  const mostrarFilas = tipo !== "PRIMEIRA_RESPOSTA";
  const visaoPrimeiraResposta = tipo === "PRIMEIRA_RESPOSTA";
  const cardsResumo: Array<{
    key: string;
    icon: ReactNode;
    label: string;
    value: string;
    hint: string;
    variant?: "default" | "danger" | "warning" | "success";
  }> = visaoPrimeiraResposta
    ? [
        {
          key: "total",
          icon: <FaExclamationTriangle />,
          label: "Total",
          value: formatarNumero(resumo.total),
          hint: "primeira resposta 20m+",
          variant: "default",
        },
        {
          key: "criticos",
          icon: <FaClock />,
          label: "Críticos",
          value: formatarNumero(resumo.criticos),
          hint: "primeira resposta 90m+",
          variant: "danger",
        },
        {
          key: "altos",
          icon: <FaChartLine />,
          label: "Altos",
          value: formatarNumero(resumo.altos),
          hint: "primeira resposta 50m+",
          variant: "warning",
        },
        {
          key: "baixos",
          icon: <FaClock />,
          label: "Baixos",
          value: formatarNumero(resumo.baixos),
          hint: "primeira resposta 20m+",
          variant: "default",
        },
        {
          key: "resposta",
          icon: <FaHeadset />,
          label: "Resposta",
          value: formatarNumero(resumo.primeira_resposta),
          hint: "alertas de primeira resposta",
          variant: "success",
        },
        {
          key: "tickets",
          icon: <FaTicketAlt />,
          label: "Tickets",
          value: formatarNumero(resumo.tickets),
          hint: `média ${formatarNumero(resumo.media_minutos, 1)}m • e-mails ${formatarNumero(resumo.alertas_email)}`,
          variant: "default",
        },
      ]
    : [
        {
          key: "total",
          icon: <FaExclamationTriangle />,
          label: "Total",
          value: formatarNumero(resumo.total),
          hint: "espera em fila 10m+",
          variant: "default",
        },
        {
          key: "criticos",
          icon: <FaClock />,
          label: "Críticos",
          value: formatarNumero(resumo.criticos),
          hint: "espera em fila 50m+",
          variant: "danger",
        },
        {
          key: "altos",
          icon: <FaChartLine />,
          label: "Altos",
          value: formatarNumero(resumo.altos),
          hint: "espera em fila 30m+",
          variant: "warning",
        },
        {
          key: "baixos",
          icon: <FaClock />,
          label: "Baixos",
          value: formatarNumero(resumo.baixos),
          hint: "espera em fila 10m+",
          variant: "default",
        },
        {
          key: "fila",
          icon: <FaSitemap />,
          label: "Fila",
          value: formatarNumero(resumo.espera_fila),
          hint: "alertas de espera em fila",
          variant: "success",
        },
        {
          key: "transferencias",
          icon: <FaExchangeAlt />,
          label: "Transferências",
          value: formatarNumero(resumo.transferencias),
          hint: "mudanças entre filas",
          variant: "default",
        },
        {
          key: "tickets",
          icon: <FaTicketAlt />,
          label: "Tickets",
          value: formatarNumero(resumo.tickets),
          hint: `média ${formatarNumero(resumo.media_minutos, 1)}m • e-mails ${formatarNumero(resumo.alertas_email)}`,
          variant: "default",
        },
      ];

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3">
          <h2 className="text-sm font-black uppercase tracking-[0.05em] text-[#00AE9D]">
            Visão do monitor
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Escolha se deseja analisar atrasos de primeira resposta ou gargalos em filas.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {[
            {
              value: "PRIMEIRA_RESPOSTA" as const,
              title: "Primeira resposta",
              description: "Funcionários e gerentes",
              icon: <FaHeadset />,
            },
            {
              value: "ESPERA_FILA" as const,
              title: "Filas",
              description: "Gargalos e transferências",
              icon: <FaSitemap />,
            },
          ].map((visao) => {
            const ativo = tipo === visao.value;

            return (
              <button
                key={visao.value}
                type="button"
                onClick={() => selecionarVisao(visao.value)}
                disabled={loading}
                className={`flex items-center gap-4 rounded-2xl border p-4 text-left shadow-sm transition disabled:cursor-not-allowed disabled:opacity-70 ${
                  ativo
                    ? "border-[#00AE9D] bg-emerald-50 ring-4 ring-[#00AE9D]/10"
                    : "border-slate-200 bg-white hover:border-[#00AE9D]/50 hover:bg-slate-50"
                }`}
              >
                <span
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                    ativo ? "bg-[#00AE9D] text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {visao.icon}
                </span>
                <span className="min-w-0">
                  <span className="block text-base font-black text-slate-900">{visao.title}</span>
                  <span className="block text-xs font-semibold text-slate-500">
                    {visao.description}
                  </span>
                </span>
                {ativo && (
                  <span className="ml-auto rounded-full bg-white px-3 py-1 text-xs font-black text-[#00796F]">
                    selecionado
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <div
        className={`grid grid-cols-1 gap-4 md:grid-cols-2 ${
          visaoPrimeiraResposta ? "xl:grid-cols-6" : "xl:grid-cols-7"
        }`}
      >
        {cardsResumo.map((card) => (
          <StatCard
            key={card.key}
            icon={card.icon}
            label={card.label}
            value={card.value}
            hint={card.hint}
            variant={card.variant}
          />
        ))}
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.04em] text-[#00AE9D]">
              <FaFilter />
              Filtros
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Monitore atrasos de primeira resposta e espera em fila por período.
            </p>
          </div>

          <button
            type="button"
            onClick={limparFiltros}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <FaEraser />
            Limpar
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
          <div>
            <label className="text-xs font-bold uppercase text-slate-600">Início</label>
            <input
              type="date"
              value={dataInicio}
              onChange={(event) => setDataInicio(event.target.value)}
              className={inputBase}
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase text-slate-600">Fim</label>
            <input
              type="date"
              value={dataFim}
              onChange={(event) => setDataFim(event.target.value)}
              className={inputBase}
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase text-slate-600">Gravidade</label>
            <select value={gravidade} onChange={(event) => setGravidade(event.target.value as any)} className={inputBase}>
              <option value="TODAS">Todas</option>
              <option value="CRITICA">Crítica</option>
              <option value="ALTA">Alta</option>
              <option value="BAIXA">Baixa</option>
            </select>
          </div>

          <div className="xl:col-span-2">
            <label className="text-xs font-bold uppercase text-slate-600">Pesquisa</label>
            <input
              value={busca}
              onChange={(event) => setBusca(limparInicio(event.target.value))}
              onKeyDown={(event) => {
                if (event.key === "Enter") carregar(1, limit);
              }}
              className={inputBase}
              placeholder="Ticket, cliente, gerente, agente ou fila"
            />
          </div>

          <div className="xl:col-span-2">
            <label className="text-xs font-bold uppercase text-slate-600">Gerente</label>
            <input
              value={gerente}
              onChange={(event) => setGerente(limparInicio(event.target.value))}
              className={inputBase}
              placeholder="Nome do gerente"
            />
          </div>

          <div className="xl:col-span-2">
            <label className="text-xs font-bold uppercase text-slate-600">Funcionário/agente</label>
            <input
              value={agente}
              onChange={(event) => setAgente(limparInicio(event.target.value))}
              className={inputBase}
              placeholder="Nome do agente"
            />
          </div>

          <div className="xl:col-span-2">
            <label className="text-xs font-bold uppercase text-slate-600">Fila</label>
            <input
              value={fila}
              onChange={(event) => setFila(limparInicio(event.target.value))}
              className={inputBase}
              placeholder="Equipe/fila origem ou destino"
            />
          </div>

          <div className="xl:col-span-2">
            <label className="text-xs font-bold uppercase text-slate-600">Evento da automação</label>
            <input
              value={evento}
              onChange={(event) => setEvento(limparInicio(event.target.value))}
              className={inputBase}
              placeholder="Ex.: e-mail, transferido, 50 minutos"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase text-slate-600">Status Blip</label>
            <select
              value={statusAtendimento}
              onChange={(event) => setStatusAtendimento(event.target.value)}
              className={inputBase}
            >
              <option value="TODOS">Todos</option>
              <option value="WAITING">Waiting</option>
              <option value="OPEN">Open</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold uppercase text-slate-600">Mínimo minutos</label>
            <input
              type="number"
              min={0}
              value={minutosMin}
              onChange={(event) => setMinutosMin(event.target.value.replace(/\D/g, ""))}
              className={inputBase}
              placeholder="Ex.: 50"
            />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={baixarRelatorioCsv}
              disabled={baixando || loading || totalItems === 0}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-5 text-sm font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400"
            >
              <FaDownload />
              {baixando ? "Baixando..." : "Baixar CSV"}
            </button>

            <button
              type="button"
              onClick={() => carregar(1, limit)}
              disabled={loading}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#79B729] px-6 text-sm font-bold text-white shadow-sm transition hover:bg-[#6AA020] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FaSearch />
              {loading ? "Buscando..." : "Pesquisar"}
            </button>
        </div>
      </section>

      {erro && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {erro}
        </div>
      )}

      <div
        className={`grid grid-cols-1 gap-5 ${
          mostrarFuncionarios && mostrarFilas ? "xl:grid-cols-3" : "xl:grid-cols-2"
        }`}
      >
        {mostrarFuncionarios && (
          <RankingCard
            title="Funcionários com mais alertas"
            subtitle="Primeira resposta acima do limite"
            icon={<FaHeadset />}
            items={rankingFuncionarios}
            type="funcionario"
          />
        )}
        <RankingCard
          title="Gerentes responsáveis"
          subtitle="Visão consolidada por gestão"
          icon={<FaUserTie />}
          items={rankingGerentes}
          type="gerente"
        />
        {mostrarFilas && (
          <RankingCard
            title="Filas com mais gargalo"
            subtitle="Espera acumulada por equipe"
            icon={<FaSitemap />}
            items={rankingFilas}
            type="fila"
          />
        )}
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-emerald-200 bg-gradient-to-r from-[#003641] via-[#00AE9D] to-[#79B729] px-5 py-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-base font-black text-white">Ocorrências detalhadas</h3>
              <p className="text-xs font-medium text-white/80">
                Tickets ordenados por criticidade, maior espera e data mais recente.
              </p>
            </div>
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-white">
              {formatarNumero(totalItems)} registro(s)
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[1450px] w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-[0.04em] text-slate-600">
                <th className="px-4 py-3 font-black">Data</th>
                <th className="px-4 py-3 font-black">Gravidade</th>
                <th className="px-4 py-3 font-black">Tipo</th>
                <th className="px-4 py-3 font-black">Evento</th>
                <th className="px-4 py-3 font-black">Ticket / Cliente</th>
                <th className="px-4 py-3 font-black">Responsável</th>
                <th className="px-4 py-3 font-black">Gerente</th>
                <th className="px-4 py-3 font-black">Fila origem</th>
                <th className="px-4 py-3 font-black">Fila destino</th>
                <th className="px-4 py-3 text-right font-black">Minutos</th>
                <th className="px-4 py-3 text-right font-black">Ação</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center text-slate-500">
                    Carregando monitor...
                  </td>
                </tr>
              ) : items.length ? (
                items.map((item, index) => (
                  <tr key={`${item.TICKET_ID}-${item.TIPO_MONITOR}-${item.DATA_EVENTO}-${index}`} className="border-b border-slate-100 last:border-b-0 hover:bg-emerald-50/40">
                    <td className="px-4 py-4 text-slate-700">{formatarData(item.DATA_EVENTO)}</td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${gravidadeClass(item.GRAVIDADE)}`}>
                        {item.GRAVIDADE}
                      </span>
                    </td>
                    <td className="px-4 py-4 font-semibold text-slate-700">{tipoLabel(item.TIPO_MONITOR)}</td>
                    <td className="px-4 py-4">
                      <p className="max-w-[220px] font-semibold text-slate-700">
                        {eventoResumo(item.EVENT_TYPE)}
                      </p>
                      {item.STATUS_ATENDIMENTO && (
                        <p className="mt-1 text-xs text-slate-400">
                          Status: {item.STATUS_ATENDIMENTO}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-black text-slate-900">
                        {item.SEQUENTIAL_ID || item.TICKET_ID || "-"}
                      </p>
                      <p className="text-xs text-slate-500">{item.CUSTOMER_NAME || "-"}</p>
                    </td>
                    <td className="px-4 py-4 text-slate-700">{item.RESPONSAVEL || "-"}</td>
                    <td className="px-4 py-4 text-slate-700">{item.GERENTE || "-"}</td>
                    <td className="px-4 py-4 text-slate-700">{item.FILA_ORIGEM || "-"}</td>
                    <td className="px-4 py-4 text-slate-700">{item.FILA_DESTINO || "-"}</td>
                    <td className="px-4 py-4 text-right text-base font-black text-slate-900">
                      {formatarNumero(item.MINUTOS)}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSelecionado(item)}
                        className="inline-flex h-9 items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 text-xs font-black text-sky-700 transition hover:bg-sky-100"
                      >
                        <FaEye />
                        Detalhes
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center text-slate-500">
                    Nenhuma ocorrência encontrada para os filtros informados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={totalItems}
          limit={limit}
          loading={loading}
          onChange={(novaPagina) => carregar(novaPagina, limit)}
          onLimitChange={(novoLimit) => carregar(1, novoLimit)}
        />
      </section>

      <DetalheOcorrenciaModal item={selecionado} onClose={() => setSelecionado(null)} />
    </div>
  );
}
