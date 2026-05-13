"use client";

import { useEffect, useState } from "react";
import { FaFileSignature } from "react-icons/fa";
import BackButton from "@/components/back-button/back-button";
import { FichaDesimpedimentoForm } from "@/components/ficha-desimpedimento-form/ficha-desimpedimento-form";
import { useRouter } from "next/navigation";
import {
    canAccess,
    PAGE_ACCESS,
    type AuthUserLike,
} from "@/lib/access-control";
import { getMeAdUser } from "@/services/auth.service";

export default function FichaDesimpedimentoPage() {
    const [loading, setLoading] = useState(true);
    const [allowed, setAllowed] = useState(false);

    useEffect(() => {
        async function validarAcesso() {
            try {
                const user = (await getMeAdUser()) as AuthUserLike;

                setAllowed(canAccess(user, PAGE_ACCESS.fichaDesimpedimento));
            } catch (error) {
                console.error(error);
                setAllowed(false);
            } finally {
                setLoading(false);
            }
        }

        validarAcesso();
    }, []);

    if (loading) {
        return (
            <div className="p-6 text-sm text-gray-500">
                Carregando...
            </div>
        );
    }

    if (!allowed) {
        return (
            <div className="p-6">
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    Você não possui permissão para acessar esta tela.
                </div>
            </div>
        );
    }

    const router = useRouter();

    const handleClick = () => {
        router.push("/auth/consulta_ficha_desimpedimento");
    };

    return (
        <div className="p-6 lg:p-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="min-w-0">
                    <BackButton />
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-2xl bg-[#C7D300] border-[#C7D300] border flex items-center justify-center text-emerald-700 shadow">
                            <FaFileSignature size={16} />
                        </div>

                        <div className="min-w-0">
                            <h1 className="text-2xl font-semibold text-gray-900 truncate">
                                Ficha de Desimpedimento
                            </h1>
                            <p className="text-sm text-gray-600 mt-1">
                                Preencha os dados, busque por CPF, salve a ficha e gere o PDF quando necessário.
                            </p>
                        </div>
                    </div>
                </div>

                <div>
                    <button
                        onClick={handleClick}
                        className="rounded-lg bg-secondary px-6 py-2 text-md font-semibold text-white hover:bg-primary cursor-pointer"
                    >
                        Consultar fichas cadastradas
                    </button>
                </div>
            </div>

            <div className="mt-6">
                <FichaDesimpedimentoForm />
            </div>

            <div className="mt-8 text-xs text-gray-500">
                * Os dados do empregado(a) são carregados via intranet-api pela consulta de CPF.
            </div>
        </div>
    );
}