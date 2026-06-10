"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FaBell,
  FaCheckCircle,
  FaExclamationTriangle,
  FaFilter,
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

function formatarData(value: string | null | undefined) {
  if (!value) return "-";

  const data = new Date(value);
  if (!Number.isNaN(data.getTime())) {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(data);
  }

  return String(value);
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

function diferenca(item: MonitorMetaAlerta) {
  const esperado = Number(String(item.vl_esperado || "0").replace(",", "."));
  const encontrado = Number(String(item.vl_encontrado || "0").replace(",", "."));

  if (!Number.isFinite(esperado) || !Number.isFinite(encontrado)) {
    return "-";
  }

  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(encontrado - esperado);
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
  const [page, setPage] = useState(1);

  const [items, setItems] = useState<MonitorMetaAlerta[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [resumo, setResumo] = useState({ total: 0, abertos: 0, resolvidos: 0 });
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [info, setInfo] = useState("");
  const [resolvendoId, setResolvendoId] = useState<string | null>(null);

  const filtrosAtivos = useMemo(() => {
    return [tela, tema, gravidade, entidade].filter(Boolean).length;
  }, [entidade, gravidade, tela, tema]);

  async function carregar(pagina = page) {
    try {
      setLoading(true);
      setErro("");

      const data = await listarMonitorMetaAlertas({
        status,
        tela: tela || undefined,
        tema: tema || undefined,
        gravidade: gravidade || undefined,
        entidade: entidade || undefined,
        page: pagina,
        limit: 10,
      });

      setItems(data.items || []);
      setTotalPages(data.total_pages || 1);
      setPage(data.page || pagina);
      setResumo(data.resumo || { total: 0, abertos: 0, resolvidos: 0 });
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
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Gravidade</th>
                <th className="px-4 py-3">Regra</th>
                <th className="px-4 py-3">Entidade</th>
                <th className="px-4 py-3">Esperado</th>
                <th className="px-4 py-3">Encontrado</th>
                <th className="px-4 py-3">Diferença</th>
                <th className="px-4 py-3">Observação</th>
                <th className="px-4 py-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-gray-500">
                    Carregando alertas...
                  </td>
                </tr>
              )}

              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-gray-500">
                    Nenhum alerta encontrado para os filtros atuais.
                  </td>
                </tr>
              )}

              {!loading && items.map((item) => {
                const resolvido = Number(item.sn_resolvido) === 1;
                const observacoes = extrairObservacao(item.nm_observacao);

                return (
                  <tr key={item.id_alerta} className="align-top transition hover:bg-gray-50/70">
                    <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                      {formatarData(item.dt_execucao)}
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
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getBadgeGravidade(item.nm_gravidade)}`}
                      >
                        {item.nm_gravidade || "-"}
                      </span>
                    </td>
                    <td className="min-w-48 px-4 py-3 font-medium text-gray-800">
                      {item.nm_regra || "-"}
                    </td>
                    <td className="min-w-40 px-4 py-3 text-gray-700">
                      {item.nm_entidade || "-"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                      {item.vl_esperado || "0"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                      {item.vl_encontrado || "0"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-gray-900">
                      {diferenca(item)}
                    </td>
                    <td className="min-w-80 px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {observacoes.length === 0 && (
                          <span className="text-gray-400">-</span>
                        )}
                        {observacoes.map((obs) => (
                          <span
                            key={`${item.id_alerta}-${obs.chave}-${obs.valor}`}
                            className="rounded-full border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-600"
                          >
                            <strong>{obs.chave}:</strong> {obs.valor}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
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

        <div className="flex flex-col gap-3 border-t border-gray-100 bg-gray-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-500">
            Página <strong>{page}</strong> de <strong>{totalPages}</strong>
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => carregar(Math.max(page - 1, 1))}
              disabled={loading || page <= 1}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Anterior
            </button>
            <button
              type="button"
              onClick={() => carregar(Math.min(page + 1, totalPages))}
              disabled={loading || page >= totalPages}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Próxima
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
