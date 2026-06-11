"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FaBell,
  FaCheckCircle,
  FaExclamationTriangle,
  FaEye,
  FaFilter,
  FaLayerGroup,
  FaListUl,
  FaStore,
  FaUserTie,
  FaSearch,
  FaTimes,
} from "react-icons/fa";
import {
  listarMonitorMetaAlertas,
  resolverMonitorMetaAlerta,
  type MonitorMetaAlerta,
  type StatusAlertaMeta,
} from "@/services/monitor_meta_alertas.service";

const GRAVIDADES = ["CRITICA", "ALTA", "MEDIA", "BAIXA"];
const TEMAS_MOEDA = [
  "arrecadacao",
  "bancoob",
  "cobranca",
  "consignado",
  "consorcio",
  "geral",
  "liquidacao",
  "seguro",
  "sicoobcard",
  "sipag",
  "transacoes",
  "venda",
];

const FORMATADOR_DATA_HORA_BR = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function formatarData(value: string | null | undefined) {
  if (!value) return "-";

  const texto = String(value).trim();
  if (!texto) return "-";

  const dataComFuso = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(texto);
  if (dataComFuso) {
    const data = new Date(texto);
    if (!Number.isNaN(data.getTime())) {
      return FORMATADOR_DATA_HORA_BR.format(data);
    }
  }

  const dataLocal = texto.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?)?$/
  );
  if (dataLocal) {
    const [, ano, mes, dia, hora = "00", minuto = "00"] = dataLocal;
    return `${dia}/${mes}/${ano}, ${hora}:${minuto}`;
  }

  const data = new Date(texto);
  if (!Number.isNaN(data.getTime())) {
    return FORMATADOR_DATA_HORA_BR.format(data);
  }

  return texto;
}

function getBadgeGravidade(gravidade: string | null) {
  const value = String(gravidade || "").toUpperCase();

  if (value === "CRITICA") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (value === "ALTA") {
    return "border-orange-200 bg-orange-50 text-orange-700";
  }

  if (value === "MEDIA") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function extrairObservacao(observacao: string | null) {
  const texto = String(observacao || "");
  const partes = texto.split(";").map((parte) => parte.trim()).filter(Boolean);

  return partes.map((parte) => {
    const [chave, ...resto] = parte.split("=");
    return {
      chave: chave || "Info",
      valor: resto.join("=") || parte,
    };
  });
}

function buscarObservacao(item: MonitorMetaAlerta, chave: string) {
  const observacoes = extrairObservacao(item.nm_observacao);
  return observacoes.find((obs) => obs.chave.toLowerCase() === chave.toLowerCase())?.valor || "";
}

function parseNumero(value: string | number | null | undefined) {
  const texto = String(value ?? "0")
    .replace("R$", "")
    .replace(/\s/g, "")
    .trim();

  if (texto.includes(",")) {
    return Number(texto.replace(/\./g, "").replace(",", "."));
  }

  return Number(texto);
}

function alertaUsaMoeda(item: MonitorMetaAlerta) {
  const tema = buscarObservacao(item, "Tema").toLowerCase();
  const regra = String(item.nm_regra || "").toLowerCase();
  const metrica = buscarObservacao(item, "Metrica").toLowerCase();

  return TEMAS_MOEDA.some(
    (termo) => tema.includes(termo) || regra.includes(termo) || metrica.includes(termo)
  );
}

function formatarValor(value: string | number | null | undefined, item: MonitorMetaAlerta) {
  const numero = parseNumero(value);

  if (!Number.isFinite(numero)) return "-";

  if (alertaUsaMoeda(item)) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numero);
  }

  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(numero);
}

function diferenca(item: MonitorMetaAlerta) {
  const esperado = parseNumero(item.vl_esperado);
  const encontrado = parseNumero(item.vl_encontrado);

  if (!Number.isFinite(esperado) || !Number.isFinite(encontrado)) {
    return "-";
  }

  return formatarValor(encontrado - esperado, item);
}

function getTema(item: MonitorMetaAlerta) {
  return buscarObservacao(item, "Tema") || "Sem tema";
}

function getPeriodo(item: MonitorMetaAlerta) {
  return buscarObservacao(item, "Mes") || buscarObservacao(item, "Periodo") || "-";
}

function getTipoEntidadeLabel(item: MonitorMetaAlerta) {
  const entidade = String(item.nm_entidade || "").toUpperCase();

  if (entidade.startsWith("FUNC:")) return "Funcionário";
  if (entidade.startsWith("PA:")) return "PA";
  return "Geral";
}

function limparEntidade(entidade: string | null) {
  return String(entidade || "-").replace(/^FUNC:/i, "").replace(/^PA:/i, "PA ");
}

function getMensagemErro(error: unknown, fallback: string) {
  if (typeof error === "object" && error !== null) {
    const maybeError = error as {
      message?: string;
      response?: {
        data?: {
          error?: string;
          details?: string;
        };
      };
    };

    return (
      maybeError.response?.data?.error ||
      maybeError.response?.data?.details ||
      maybeError.message ||
      fallback
    );
  }

  return fallback;
}

export function MonitorMetaAlertas() {
  const [status, setStatus] = useState<StatusAlertaMeta>("aberto");
  const [tela, setTela] = useState("");
  const [tema, setTema] = useState("");
  const [gravidade, setGravidade] = useState("");
  const [entidade, setEntidade] = useState("");
  const [tipoEntidade, setTipoEntidade] = useState<"" | "PA" | "FUNC">("");
  const [page, setPage] = useState(1);

  const [items, setItems] = useState<MonitorMetaAlerta[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [resumo, setResumo] = useState({ total: 0, abertos: 0, resolvidos: 0 });
  const [agrupamentoTema, setAgrupamentoTema] = useState<
    Array<{ tema: string | null; total: number; abertos: number; resolvidos: number }>
  >([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [info, setInfo] = useState("");
  const [resolvendoId, setResolvendoId] = useState<string | null>(null);
  const [alertaDetalhe, setAlertaDetalhe] = useState<MonitorMetaAlerta | null>(null);

  const filtrosAtivos = useMemo(() => {
    return [tela, tema, gravidade, entidade, tipoEntidade].filter(Boolean).length;
  }, [entidade, gravidade, tela, tema, tipoEntidade]);

  const paginasVisiveis = useMemo(() => {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }, [totalPages]);

  const observacoesDetalhe = useMemo(() => {
    return extrairObservacao(alertaDetalhe?.nm_observacao || null);
  }, [alertaDetalhe]);

  async function carregar(
    pagina = page,
    filtrosOverride?: {
      tema?: string;
      tipoEntidade?: "" | "PA" | "FUNC";
      limparTema?: boolean;
    }
  ) {
    try {
      setLoading(true);
      setErro("");

      const temaConsulta = filtrosOverride?.limparTema ? "" : filtrosOverride?.tema ?? tema;
      const tipoEntidadeConsulta = filtrosOverride?.tipoEntidade ?? tipoEntidade;

      const data = await listarMonitorMetaAlertas({
        status,
        tela: tela || undefined,
        tema: temaConsulta || undefined,
        gravidade: gravidade || undefined,
        entidade: entidade || undefined,
        tipo_entidade: tipoEntidadeConsulta || undefined,
        page: pagina,
        limit: 10,
      });

      setItems(data.items || []);
      setTotalPages(data.total_pages || 1);
      setPage(data.page || pagina);
      setResumo(data.resumo || { total: 0, abertos: 0, resolvidos: 0 });
      setAgrupamentoTema(data.agrupamento_tema || []);
      if (filtrosOverride?.limparTema) setTema("");
      else if (filtrosOverride?.tema !== undefined) setTema(filtrosOverride.tema);
      if (filtrosOverride?.tipoEntidade !== undefined) {
        setTipoEntidade(filtrosOverride.tipoEntidade);
      }
    } catch (error: unknown) {
      console.error(error);
      setItems([]);
      setErro(getMensagemErro(error, "Falha ao carregar alertas."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  function limparFiltros() {
    setTela("");
    setTema("");
    setGravidade("");
    setEntidade("");
    setTipoEntidade("");
    setInfo("");
    setErro("");
    setPage(1);
  }

  async function resolver(item: MonitorMetaAlerta) {
    if (!item.id_alerta || Number(item.sn_resolvido) === 1) return;

    const confirmar = window.confirm(
      `Marcar o alerta ${item.nm_entidade || ""} como resolvido?`
    );

    if (!confirmar) return;

    try {
      setResolvendoId(item.id_alerta);
      setErro("");
      setInfo("");

      await resolverMonitorMetaAlerta(item.id_alerta);

      setInfo("Alerta marcado como resolvido.");
      setAlertaDetalhe(null);
      await carregar(page);
    } catch (error: unknown) {
      console.error(error);
      setErro(getMensagemErro(error, "Falha ao resolver alerta."));
    } finally {
      setResolvendoId(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <FaBell className="text-[#00AE9D]" />
            Total filtrado
          </div>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{resumo.total}</p>
        </div>

        <div className="rounded-2xl border border-red-100 bg-red-50 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-red-700">
            <FaExclamationTriangle />
            Abertos
          </div>
          <p className="mt-2 text-2xl font-semibold text-red-700">{resumo.abertos}</p>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-emerald-700">
            <FaCheckCircle />
            Resolvidos
          </div>
          <p className="mt-2 text-2xl font-semibold text-emerald-700">{resumo.resolvidos}</p>
        </div>
      </div>

      {agrupamentoTema.length > 0 && (
        <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#00AE9D]">
                <FaLayerGroup />
                Pendências por tema
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Resumo dos alertas filtrados para priorizar a conferência.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {agrupamentoTema.slice(0, 8).map((grupo) => (
              <button
                key={grupo.tema || "sem-tema"}
                type="button"
                onClick={() => {
                  const temaGrupo = grupo.tema || "";
                  const jaSelecionado = tema === temaGrupo;

                  carregar(1, {
                    tema: jaSelecionado ? "" : temaGrupo,
                  });
                }}
                className={`rounded-2xl border p-4 text-left transition hover:border-[#00AE9D] hover:shadow-sm ${
                  tema === (grupo.tema || "")
                    ? "border-[#00AE9D] bg-[#00AE9D]/10 shadow-sm"
                    : "border-gray-200 bg-gradient-to-br from-white to-gray-50"
                }`}
              >
                <div className="truncate text-sm font-semibold text-gray-900">
                  {grupo.tema || "Sem tema"}
                </div>
                <div className="mt-3 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Abertos
                    </p>
                    <p className="text-2xl font-bold text-red-600">{grupo.abertos}</p>
                  </div>
                  <div className="text-right text-xs text-gray-500">
                    <p>Total: {grupo.total}</p>
                    <p>Resolvidos: {grupo.resolvidos}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#00AE9D]">
              <FaFilter />
              Filtros
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Consulte as ocorrências gravadas pelo monitor de metas.
            </p>
          </div>

          {filtrosAtivos > 0 && (
            <button
              type="button"
              onClick={limparFiltros}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
            >
              <FaTimes size={12} />
              Limpar
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
          <label className="space-y-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Status
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as StatusAlertaMeta);
                setPage(1);
              }}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium normal-case tracking-normal text-gray-700 outline-none transition focus:border-[#00AE9D] focus:ring-2 focus:ring-[#00AE9D]/10"
            >
              <option value="aberto">Abertos</option>
              <option value="resolvido">Resolvidos</option>
              <option value="todos">Todos</option>
            </select>
          </label>

          <label className="space-y-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Tela
            <input
              value={tela}
              onChange={(event) => setTela(event.target.value)}
              placeholder="producao_meta..."
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium normal-case tracking-normal text-gray-700 outline-none transition focus:border-[#00AE9D] focus:ring-2 focus:ring-[#00AE9D]/10"
            />
          </label>

          <label className="space-y-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Tema
            <input
              value={tema}
              onChange={(event) => setTema(event.target.value)}
              placeholder="consorcio"
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium normal-case tracking-normal text-gray-700 outline-none transition focus:border-[#00AE9D] focus:ring-2 focus:ring-[#00AE9D]/10"
            />
          </label>

          <label className="space-y-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Gravidade
            <select
              value={gravidade}
              onChange={(event) => setGravidade(event.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium normal-case tracking-normal text-gray-700 outline-none transition focus:border-[#00AE9D] focus:ring-2 focus:ring-[#00AE9D]/10"
            >
              <option value="">Todas</option>
              {GRAVIDADES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Entidade
            <input
              value={entidade}
              onChange={(event) => setEntidade(event.target.value)}
              placeholder="PA:0, FUNC..."
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium normal-case tracking-normal text-gray-700 outline-none transition focus:border-[#00AE9D] focus:ring-2 focus:ring-[#00AE9D]/10"
            />
          </label>
        </div>

        <div className="mt-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Tipo de alerta
          </p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {[
              { icon: FaListUl, label: "Todos", description: "PA e funcionários", value: "" as const },
              { icon: FaStore, label: "Alertas de PA", description: "Somente unidades/PA", value: "PA" as const },
              { icon: FaUserTie, label: "Alertas de funcionário", description: "Somente colaboradores", value: "FUNC" as const },
            ].map((option) => {
              const Icon = option.icon;
              const ativo = tipoEntidade === option.value;

              return (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => {
                    const proximoTipo = ativo && option.value !== "" ? "" : option.value;

                    carregar(1, {
                      tipoEntidade: proximoTipo,
                      limparTema: proximoTipo === "",
                    });
                  }}
                  className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition hover:border-[#00AE9D] hover:shadow-sm ${
                    ativo
                      ? "border-[#00AE9D] bg-[#00AE9D]/10 text-[#006f65] shadow-sm"
                      : "border-gray-200 bg-white text-gray-600"
                  }`}
                >
                  <span
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                      ativo ? "bg-[#00AE9D] text-white" : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    <Icon size={15} />
                  </span>
                  <span>
                    <span className="block text-sm font-bold">{option.label}</span>
                    <span className="block text-xs text-gray-500">{option.description}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={() => carregar(1)}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-[#79B729] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#679f22] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <FaSearch size={13} />
            {loading ? "Pesquisando..." : "Pesquisar"}
          </button>
        </div>
      </div>

      {erro && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          {erro}
        </div>
      )}

      {info && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
          {info}
        </div>
      )}

      <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Execução</th>
                <th className="px-4 py-3">Gravidade</th>
                <th className="px-4 py-3">Tema / Período</th>
                <th className="px-4 py-3">Entidade</th>
                <th className="px-4 py-3">Esperado</th>
                <th className="px-4 py-3">Encontrado</th>
                <th className="px-4 py-3">Diferença</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-gray-500">
                    Carregando alertas...
                  </td>
                </tr>
              )}

              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-gray-500">
                    Nenhum alerta encontrado para os filtros atuais.
                  </td>
                </tr>
              )}

              {!loading && items.map((item) => {
                const resolvido = Number(item.sn_resolvido) === 1;

                return (
                  <tr key={item.id_alerta} className="align-top transition hover:bg-gray-50/70">
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className="inline-flex rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-900 shadow-sm">
                        {formatarData(item.dt_execucao)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getBadgeGravidade(item.nm_gravidade)}`}
                      >
                        {item.nm_gravidade || "-"}
                      </span>
                    </td>
                    <td className="min-w-56 px-4 py-3">
                      <p className="font-semibold text-gray-900">{getTema(item)}</p>
                      <span className="mt-2 inline-flex rounded-full border border-[#00AE9D]/30 bg-[#00AE9D]/10 px-2.5 py-1 text-xs font-bold text-[#006f65]">
                        Período: {getPeriodo(item)}
                      </span>
                    </td>
                    <td className="min-w-56 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                        {getTipoEntidadeLabel(item)}
                      </p>
                      <p className="mt-1 font-medium text-gray-800">{limparEntidade(item.nm_entidade)}</p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                      {formatarValor(item.vl_esperado, item)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                      {formatarValor(item.vl_encontrado, item)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-gray-900">
                      {diferenca(item)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
                          resolvido
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-red-200 bg-red-50 text-red-700"
                        }`}
                      >
                        {resolvido ? "Resolvido" : "Aberto"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setAlertaDetalhe(item)}
                        className="mr-2 inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 transition hover:border-[#00AE9D] hover:text-[#008578]"
                      >
                        <FaEye size={12} />
                        Detalhes
                      </button>
                      <button
                        type="button"
                        onClick={() => resolver(item)}
                        disabled={resolvido || resolvendoId === item.id_alerta}
                        className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-50 disabled:text-gray-400"
                      >
                        <FaCheckCircle size={12} />
                        {resolvendoId === item.id_alerta ? "Salvando..." : "Resolver"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="border-t border-gray-100 bg-white px-4 py-4">
          <div className="flex justify-center overflow-x-auto">
            <div className="flex min-w-max gap-2">
              {paginasVisiveis.map((pagina) => (
                <button
                  key={pagina}
                  type="button"
                  onClick={() => carregar(pagina)}
                  disabled={loading || pagina === page}
                  className={`inline-flex h-9 min-w-9 items-center justify-center rounded-md border px-3 text-sm font-semibold transition ${
                    pagina === page
                      ? "border-[#00995D] bg-[#00995D] text-white shadow-sm"
                      : "border-gray-300 bg-white text-gray-700 hover:border-[#00995D] hover:text-[#00995D]"
                  } disabled:cursor-default`}
                >
                  {pagina}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {alertaDetalhe && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#00AE9D]">
                  Detalhe do alerta
                </p>
                <h3 className="mt-1 text-xl font-bold text-gray-900">
                  {getTema(alertaDetalhe)} · {getPeriodo(alertaDetalhe)}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {limparEntidade(alertaDetalhe.nm_entidade)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setAlertaDetalhe(null)}
                className="rounded-full border border-gray-200 p-2 text-gray-500 transition hover:bg-gray-50 hover:text-gray-800"
                aria-label="Fechar detalhes"
              >
                <FaTimes size={14} />
              </button>
            </div>

            <div className="max-h-[calc(90vh-92px)] overflow-y-auto px-6 py-5">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Esperado
                  </p>
                  <p className="mt-2 text-lg font-bold text-gray-900">
                    {formatarValor(alertaDetalhe.vl_esperado, alertaDetalhe)}
                  </p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Encontrado
                  </p>
                  <p className="mt-2 text-lg font-bold text-gray-900">
                    {formatarValor(alertaDetalhe.vl_encontrado, alertaDetalhe)}
                  </p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Diferença
                  </p>
                  <p className="mt-2 text-lg font-bold text-gray-900">
                    {diferenca(alertaDetalhe)}
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-gray-200 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Regra
                </p>
                <p className="mt-2 font-semibold text-gray-900">
                  {alertaDetalhe.nm_regra || "-"}
                </p>
              </div>

              <div className="mt-5 rounded-2xl border border-gray-200 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Observações técnicas
                </p>
                <div className="mt-3 overflow-hidden rounded-2xl border border-gray-200">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                      <tr>
                        <th className="w-44 px-4 py-3">Campo</th>
                        <th className="px-4 py-3">Valor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {observacoesDetalhe.map((obs) => (
                        <tr key={`${alertaDetalhe.id_alerta}-${obs.chave}-${obs.valor}`}>
                          <td className="bg-gray-50/60 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                            {obs.chave}
                          </td>
                          <td className="px-4 py-3 font-medium text-gray-800">
                            {obs.valor}
                          </td>
                        </tr>
                      ))}

                      {observacoesDetalhe.length === 0 && (
                        <tr>
                          <td colSpan={2} className="px-4 py-6 text-center text-gray-400">
                            Nenhuma observação técnica registrada.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAlertaDetalhe(null)}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
                >
                  Fechar
                </button>
                <button
                  type="button"
                  onClick={() => resolver(alertaDetalhe)}
                  disabled={Number(alertaDetalhe.sn_resolvido) === 1 || resolvendoId === alertaDetalhe.id_alerta}
                  className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-50 disabled:text-gray-400"
                >
                  <FaCheckCircle size={13} />
                  Resolver alerta
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
