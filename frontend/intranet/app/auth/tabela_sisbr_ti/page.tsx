"use client";

import { useEffect, useMemo, useState } from "react";
import BackButton from "@/components/back-button/back-button";
import { FaNetworkWired } from "react-icons/fa";
import { buscarTabelaSisbrTi } from "@/services/sisbr-ti.service";

type SisbrRow = {
  FW: string | number | null;
  LOCAL: string | null;
  SISBR: string | null;
  IP: string | null;
  PROVEDOR: string | null;
  LINK_SISBR: string | null;
};

export default function TabelaSisbrTiPage() {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<SisbrRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const debouncedQ = useDebouncedValue(q, 300);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await buscarTabelaSisbrTi();
        const allRows = Array.isArray(data) ? data : [];

        const filtered = debouncedQ.trim()
          ? allRows.filter((row) =>
              Object.values(row).some((value) =>
                String(value ?? "")
                  .toLowerCase()
                  .includes(debouncedQ.trim().toLowerCase())
              )
            )
          : allRows;

        setRows(filtered);
      } catch (e: any) {
        setError(String(e?.message || "Erro ao carregar"));
        setRows([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [debouncedQ]);

  const total = useMemo(() => rows.length, [rows]);

  return (
    <div className="p-6 lg:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <BackButton />
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-[#C7D300] border-[#C7D300] border flex items-center justify-center text-emerald-700">
              <FaNetworkWired size={16} />
            </div>

            <div className="min-w-0">
              <h1 className="text-2xl font-semibold text-gray-900 truncate">
                Tabela SISBR TI
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Busque na lista de FW, local, SISBR, IP, provedor e link SISBR,
                digitando na barra de pesquisa.
              </p>
            </div>
          </div>
        </div>

        <div className="w-full lg:w-105">
          <label className="text-xs font-medium text-gray-600">Buscar</label>
          <div className="mt-1 flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2 shadow-sm">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Ex: FW, local, SISBR, IP, provedor..."
              className="w-full bg-transparent outline-none text-sm text-gray-900 placeholder:text-gray-400"
            />
            {q ? (
              <button
                onClick={() => setQ("")}
                className="text-xs px-2 py-1 rounded-lg border border-gray-200 hover:bg-gray-50"
              >
                Limpar
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">
            Lista SISBR TI
          </h2>
          <div className="text-xs text-gray-500">
            {loading ? "Carregando..." : `${total} encontrados`}
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {!loading && !error && rows.length === 0 ? (
          <div className="mt-6 text-center text-sm text-gray-500">
            Nenhum registro encontrado.
          </div>
        ) : (
          <div className="mt-4 overflow-auto">
            <table className="min-w-225 w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500">
                  <th className="py-3 px-3">FW</th>
                  <th className="py-3 px-3">Local</th>
                  <th className="py-3 px-3">SISBR</th>
                  <th className="py-3 px-3">IP</th>
                  <th className="py-3 px-3">Provedor</th>
                  <th className="py-3 px-3">Link SISBR</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => (
                  <tr
                    key={`${r.FW ?? "fw"}-${r.LOCAL ?? "local"}-${idx}`}
                    className="border-t border-gray-100 hover:bg-gray-50/60"
                  >
                    <td className="py-3 px-3 font-semibold text-gray-900">
                      {r.FW ?? "-"}
                    </td>

                    <td className="py-3 px-3 text-gray-900">{r.LOCAL ?? "-"}</td>

                    <td className="py-3 px-3 text-gray-700">
                      {r.SISBR ?? "-"}
                    </td>

                    <td className="py-3 px-3 text-gray-700">{r.IP ?? "-"}</td>

                    <td className="py-3 px-3 text-gray-700">
                      {r.PROVEDOR ?? "-"}
                    </td>

                    <td className="py-3 px-3 text-gray-700">
                      {r.LINK_SISBR ?? "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-3 text-xs text-gray-500">
          * Dados carregados do Oracle via intranet-api.
        </p>
      </div>
    </div>
  );
}

function useDebouncedValue<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);

  return debounced;
}