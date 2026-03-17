"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";

type CompanyCommon = {
  cnpj: string;
  nome?: string;
  nome_gov?: string;
  nome_base?: string;
  cidade_base?: string;
  isNewToday?: boolean;
};

type ApiResp = {
  ok: boolean;
  error?: string;

  total_gov?: number;
  total_base?: number;
  empresas_em_comum?: number;
  new_today_count?: number;

  today?: string;
  yesterday?: string;
  had_yesterday?: boolean;

  email_sent_to?: string | null;
  email_skipped_daily_lock?: boolean;

  common_companies?: CompanyCommon[];
};

function norm(s: string) {
  return (s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function toCSV(rows: CompanyCommon[]) {
  const header = "CNPJ,RazaoSocial,Cidade";
  const esc = (s?: string) => `"${(s || "").replace(/"/g, '""')}"`;
  const body = rows
    .map((r) => [r.cnpj, esc(r.nome || r.nome_gov || r.nome_base), esc(r.cidade_base)].join(","))
    .join("\n");
  return `${header}\n${body}`;
}

function downloadCSV(rows: CompanyCommon[], filename: string) {
  const csv = toCSV(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function EmprestimoConsignadoForm() {
  const [loading, setLoading] = useState(false);
  const [resp, setResp] = useState<ApiResp | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [emailTo, setEmailTo] = useState<string>("");
  const [filter, setFilter] = useState<string>("");
  const [cityFilter, setCityFilter] = useState<string>("");

  const runNow = async () => {
    setLoading(true);
    setErr(null);
    try {
      const q = emailTo ? `?to=${encodeURIComponent(emailTo)}` : "";
      const r = await fetch(`/api/check-updates${q}`, { cache: "no-store" });
      const j = (await r.json()) as ApiResp;
      if (!r.ok || !j.ok) throw new Error(j?.error || "Falha");
      setResp(j);
    } catch (e: any) {
      setErr(e?.message || String(e));
      setResp(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runNow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const commons: CompanyCommon[] = resp?.common_companies || [];

  const cities = useMemo(() => {
    const s = new Set<string>();
    for (const c of commons) {
      const v = (c.cidade_base || "").trim();
      if (v) s.add(v);
    }
    return Array.from(s).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [commons]);

  const filtered = useMemo(() => {
    let list = commons;

    if (filter) {
      const q = norm(filter);
      list = list.filter(
        (c) =>
          norm(c.cnpj).includes(q) ||
          norm(c.nome || "").includes(q) ||
          norm(c.nome_gov || "").includes(q) ||
          norm(c.nome_base || "").includes(q) ||
          norm(c.cidade_base || "").includes(q)
      );
    }

    if (cityFilter) {
      list = list.filter((c) => (c.cidade_base || "") === cityFilter);
    }

    return list;
  }, [commons, filter, cityFilter]);

  const semRazao = useMemo(
    () => commons.filter((c) => !(c.nome || c.nome_gov || c.nome_base)),
    [commons]
  );

  const novosHoje = useMemo(
    () => commons.filter((c) => !!c.isNewToday),
    [commons]
  );

  return (
    <div className="min-w-225 mx-auto space-y-6">
      <div className="p-6 bg-white rounded-xl shadow dark:bg-gray-800">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Empresas habilitadas para empréstimo — Crédito do Trabalhador
            </h2>

            <p className="text-sm text-gray-600 mt-1 dark:text-gray-300">
              A lista é gerada comparando a base do DataPrev com sua planilha local (Empresas.xlsx/Empresas.csv).
            </p>

            {resp?.today && resp?.yesterday && (
              <p className="text-sm text-gray-500 mt-2 dark:text-gray-400">
                Comparativo diário: <b>{resp.yesterday}</b> → <b>{resp.today}</b>. Novos hoje:{" "}
                <b>{resp.new_today_count || 0}</b>.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2 md:items-end">
            <button
              type="button"
              onClick={runNow}
              disabled={loading}
              className="bg-secondary hover:bg-primary disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer text-white font-semibold px-4 py-2 rounded shadow"
            >
              {loading ? "Atualizando..." : "Atualizar agora"}
            </button>

            {/* Campo opcional para testar envio/param to */}
            {/*<div className="w-full md:w-[360px]">
              <label className="block text-xs font-medium text-gray-600 mb-1 dark:text-gray-300">
                Destinatário (opcional, querystring ?to=)
              </label>
              <input
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                placeholder="ex: email@dominio.com, outro@dominio.com"
                className="w-full border px-3 py-2 rounded text-sm dark:bg-gray-900 dark:text-gray-100 dark:border-gray-700"
              />
              {resp?.email_sent_to && (
                <p className="text-xs text-emerald-700 mt-1 dark:text-emerald-300">
                  E-mail enviado para: <b>{resp.email_sent_to}</b>
                </p>
              )}
              {resp?.email_skipped_daily_lock && (
                <p className="text-xs text-gray-500 mt-1 dark:text-gray-400">
                  E-mail já havia sido enviado hoje (trava diária).
                </p>
              )}
            </div>*/}
          </div>
        </div>

        {resp && (
          <div className="mt-5 grid grid-cols-1 md:grid-cols-4 gap-3 text-sm text-gray-700 dark:text-gray-100">
            <div className="rounded-lg border p-3 bg-gray-50 dark:bg-gray-900 dark:border-gray-700">
              Total DataPrev: <b>{resp.total_gov ?? "-"}</b>
            </div>
            <div className="rounded-lg border p-3 bg-gray-50 dark:bg-gray-900 dark:border-gray-700">
              Total Base: <b>{resp.total_base ?? "-"}</b>
            </div>
            <div className="rounded-lg border p-3 bg-gray-50 dark:bg-gray-900 dark:border-gray-700">
              Empresas em comum: <b>{resp.empresas_em_comum ?? "-"}</b>
            </div>
            <div className="rounded-lg border p-3 bg-gray-50 dark:bg-gray-900 dark:border-gray-700">
              Sem Razão Social: <b>{semRazao.length}</b>
            </div>
          </div>
        )}
      </div>

      {err && (
        <div className="p-4 rounded-lg border bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-200 dark:border-red-900/40">
          {err}
        </div>
      )}

      {loading && !resp && (
        <div className="text-sm text-gray-600 dark:text-gray-300">
          Carregando…
        </div>
      )}

      {commons.length > 0 && (
        <div className="p-6 bg-white rounded-xl shadow space-y-4 dark:bg-gray-800">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1 dark:text-gray-300">
                  Filtro geral
                </label>
                <input
                  type="text"
                  placeholder="CNPJ, Razão Social ou Cidade..."
                  className="w-full md:w-80 rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 dark:bg-gray-900 dark:text-gray-100 dark:border-gray-700"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1 dark:text-gray-300">
                  Cidade
                </label>
                <select
                  value={cityFilter}
                  onChange={(e) => setCityFilter(e.target.value)}
                  className="w-full md:w-80 rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 cursor-pointer dark:bg-gray-900 dark:text-gray-100 dark:border-gray-700"
                >
                  <option value="">Todas as cidades</option>
                  {cities.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="text-xs text-gray-500 dark:text-gray-400 md:pt-6">
                Exibindo <b>{filtered.length}</b> de <b>{commons.length}</b>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => downloadCSV(filtered, "empresas-filtradas.csv")}
                className="px-3 py-2 text-sm rounded border hover:shadow-md cursor-pointer dark:border-gray-700 dark:text-gray-100"
              >
                Baixar CSV (filtrado)
              </button>

              <button
                type="button"
                onClick={() => downloadCSV(novosHoje, "empresas-novas-hoje.csv")}
                className="px-3 py-2 text-sm rounded border hover:shadow-md cursor-pointer dark:border-gray-700 dark:text-gray-100"
              >
                Baixar CSV (novas hoje)
              </button>
            </div>
          </div>

          <div className="text-xs text-gray-500 dark:text-gray-300">
            <span className="inline-block rounded px-2 py-1 bg-yellow-100 text-yellow-900 dark:bg-yellow-900/40 dark:text-yellow-200 mr-2">
              Empresas novas
            </span>
            Linhas marcadas são CNPJs que existem hoje e não existiam ontem.
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border text-sm dark:border-gray-700 text-gray-900 dark:text-gray-100">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50">
                  <th className="text-left p-2 border dark:border-gray-700">CNPJ</th>
                  <th className="text-left p-2 border dark:border-gray-700">Razão Social</th>
                  <th className="text-left p-2 border dark:border-gray-700">Cidade</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr
                    key={r.cnpj}
                    className={[
                      "hover:bg-gray-50 dark:hover:bg-gray-700/40",
                      r.isNewToday ? "bg-yellow-100 dark:bg-yellow-900/40" : "",
                    ]
                      .join(" ")
                      .trim()}
                  >
                    <td className="p-2 border dark:border-gray-700 font-mono">{r.cnpj}</td>
                    <td className="p-2 border dark:border-gray-700">
                      {r.nome || r.nome_gov || r.nome_base || ""}
                    </td>
                    <td className="p-2 border dark:border-gray-700">{r.cidade_base || ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400">
            “Razão Social” usa o valor do GOV quando disponível; se estiver vazio, usa o da Base.
          </p>
        </div>
      )}
    </div>
  );
}