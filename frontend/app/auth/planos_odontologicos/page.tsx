"use client";

import { useEffect, useState } from "react";
import { FaMoneyBillWave } from "react-icons/fa";
import BackButton from "@/components/back-button/back-button";
import { PlanosOdontologicos } from "@/components/planos-odontologicos/planos-odontologicos";
import {
    canAccess,
    PAGE_ACCESS,
    type AuthUserLike,
} from "@/lib/access-control";
import { getMeAdUser } from "@/services/auth.service";

export default function PlanosOdontologicosPage() {
    const [loading, setLoading] = useState(true);
    const [allowed, setAllowed] = useState(false);
    const [
        modalNovoPlanoAberta,
        setModalNovoPlanoAberta,
    ] = useState(false);

    useEffect(() => {
        async function validarAcesso() {
            try {
                const user = (await getMeAdUser()) as AuthUserLike;

                setAllowed(
                    canAccess(
                        user,
                        PAGE_ACCESS.planosOdontologicos
                    )
                );
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

    return (
        <main className="w-full p-6 lg:p-8">
            <div className="mb-6">
                <div className="mb-4">
                    <BackButton />
                </div>

                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-2xl bg-[#C7D300] border-[#C7D300] border flex items-center justify-center text-emerald-700 shadow">
                            <FaMoneyBillWave size={16} />
                        </div>

                        <div className="min-w-0">
                            <h1 className="text-2xl font-semibold text-gray-900 truncate">
                                Planos Odontológicos
                            </h1>

                            <p className="text-sm text-gray-600 mt-1">
                                Gestão dos planos, valores vigentes e histórico de reajustes.
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => setModalNovoPlanoAberta(true)}
                        className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl bg-secondary px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary"
                    >
                        + Novo plano
                    </button>
                </div>
            </div>

            <PlanosOdontologicos
                abrirNovoPlano={modalNovoPlanoAberta}
                onFecharNovoPlano={() =>
                    setModalNovoPlanoAberta(false)
                }
            />
        </main>
    );
}