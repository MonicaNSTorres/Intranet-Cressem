"use client";

import { useEffect, useMemo, useState } from "react";
import BackButton from "@/components/back-button/back-button";
import { FaPhone } from "react-icons/fa";
import { buscarRamais } from "@/services/ramais.service";

type RamalRow = {
    ID: number | string;
    RAMAL: string | number | null;
    NOME: string | null;
    DEPARTAMENTO: string | null;
    EMAIL: string | null;
    LOGIN: string | null;
};

export default function RamaisPage() {
    const [q, setQ] = useState("");
    const [loading, setLoading] = useState(false);
    const [rows, setRows] = useState<RamalRow[]>([]);
    const [error, setError] = useState<string | null>(null);
    const debouncedQ = useDebouncedValue(q, 300);//bounc para nao bater no back

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            setError(null);

            try {
                const data = await buscarRamais(debouncedQ);
                setRows(Array.isArray(data.data) ? data.data : []);
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
                            <FaPhone size={16} />
                        </div>

                        <div className="min-w-0">
                            <h1 className="text-2xl font-semibold text-gray-900 truncate">
                                Ramais
                            </h1>
                            <p className="text-sm text-gray-600 mt-1">
                                Busque na lista de ramais, digitando na barra de pesquisa.
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
                            placeholder="Ex: Ana, TI, 214, email@..., login..."
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
                        Lista de Ramais
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
                        Nenhum ramal encontrado.
                    </div>
                ) : (
                    <div className="mt-4 overflow-auto">
                        <table className="min-w-225 w-full text-sm">
                            <thead>
                                <tr className="text-left text-xs text-gray-500">
                                    <th className="py-3 px-3">Ramal</th>
                                    <th className="py-3 px-3">Nome</th>
                                    <th className="py-3 px-3">Departamento</th>
                                    <th className="py-3 px-3">E-mail</th>
                                    <th className="py-3 px-3">Login</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((r) => (
                                    <tr
                                        key={String(r.ID)}
                                        className="border-t border-gray-100 hover:bg-gray-50/60"
                                    >
                                        <td className="py-3 px-3 font-semibold text-gray-900">
                                            {r.RAMAL ?? "-"}
                                        </td>

                                        <td className="py-3 px-3 text-gray-900">{r.NOME ?? "-"}</td>

                                        <td className="py-3 px-3 text-gray-700">
                                            {r.DEPARTAMENTO ?? "-"}
                                        </td>

                                        <td className="py-3 px-3 text-gray-700">
                                            {r.EMAIL ? (
                                                <a className="text-secondary hover:underline" href={`mailto:${r.EMAIL}`}>
                                                    {r.EMAIL}
                                                </a>
                                            ) : (
                                                "-"
                                            )}
                                        </td>

                                        <td className="py-3 px-3 text-gray-700">{r.LOGIN ?? "-"}</td>
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