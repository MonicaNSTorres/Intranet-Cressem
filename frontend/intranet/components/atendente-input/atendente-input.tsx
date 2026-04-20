"use client";

import { useEffect } from "react";
import { getMeAdUser } from "@/services/auth.service";

type Props = {
    value: string;
    onChange: (value: string) => void;
};

export function AtendenteInput({ value, onChange }: Props) {
    async function obterNomeLogado(): Promise<string> {
        const nomeSession = (sessionStorage.getItem("NOME_COMPLETO") || "").trim();
        if (nomeSession) return nomeSession;

        try {
            const me = await getMeAdUser();
            return (me?.nome_completo || "").trim();
        } catch {
            return "";
        }
    }

    useEffect(() => {
        async function carregarAtendente() {
            const nome = await obterNomeLogado();
            onChange(nome);
        }
        carregarAtendente();
    }, [onChange]);

    return (
        <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Atendente</label>
            <input
                value={value}
                readOnly
                className="w-full border px-3 py-2 rounded bg-gray-50 cursor-not-allowed"
            />
        </div>
    );
}