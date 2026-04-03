"use client";

import { useEffect, useState } from "react";
import { listarCidadesCressem, type CidadeCressemOption } from "@/services/cidades-cressem.service";

type Props = {
    value: string;
    onChange: (value: string) => void;
    label?: string;
    required?: boolean;
};

export function CidadeCressemSelect({
    value,
    onChange,
    label = "Cidade",
    required = false,
}: Props) {
    const [cidades, setCidades] = useState<CidadeCressemOption[]>([]);
    const [loading, setLoading] = useState(false);
    const [erro, setErro] = useState("");

    useEffect(() => {
        async function load() {
            setLoading(true);
            setErro("");
            try {
                const data = await listarCidadesCressem();
                setCidades(data);
            } catch (e: unknown) {
                setErro(e instanceof Error ? e.message : "Erro ao carregar cidades.");
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    return (
        <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
                {label}
            </label>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                required={required}
                disabled={loading}
                className="w-full h-[42px] border px-3 rounded leading-[42px] bg-white"
            >
                <option value="">{loading ? "Carregando..." : "Selecione"}</option>
                {cidades.map((c) => (
                    <option key={c.value} value={c.value}>
                        {c.label}
                    </option>
                ))}
            </select>
            {erro && <p className="mt-1 text-xs text-red-600">{erro}</p>}
        </div>
    );
}
