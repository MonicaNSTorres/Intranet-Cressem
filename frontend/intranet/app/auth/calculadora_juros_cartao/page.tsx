"use client";

import { useEffect, useState } from "react";
import { FaCalculator } from "react-icons/fa";
import { CalculadoraJurosCartaoForm } from "@/components/calculadora-juros-cartao-form/calculadora-juros-cartao-form";
import BackButton from "@/components/back-button/back-button";
import {
    canAccess,
    PAGE_ACCESS,
    type AuthUserLike,
} from "@/lib/access-control";
import { getMeAdUser } from "@/services/auth.service";

export default function AuxilioCrechePage() {
    const [loading, setLoading] = useState(true);
    const [allowed, setAllowed] = useState(false);

    useEffect(() => {
        async function validarAcesso() {
            try {
                const user = (await getMeAdUser()) as AuthUserLike;

                setAllowed(canAccess(user, PAGE_ACCESS.calculadoraJurosCartao));
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
            <div className="p-6 text-sm font-medium text-slate-500">
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

    return (
        <div className="p-6 lg:p-8">
            <div className="mb-4">
                <BackButton />
            </div>

            <div className="p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#C7D300] bg-[#C7D300] text-[#006f65] shadow-sm">
                            <FaCalculator size={16} />
                        </div>

                        <div className="min-w-0">
                            <h1 className="truncate text-2xl font-black text-slate-950">
                                Calculadora de Atraso Cartão de Crédito
                            </h1>
                            <p className="mt-1 text-sm font-medium text-slate-600">
                                Informe os dados e calcule juros, multa, mora e total a pagar.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-6">
                <CalculadoraJurosCartaoForm />
            </div>

        </div>
    );
}
