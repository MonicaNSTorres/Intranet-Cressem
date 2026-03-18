"use client";

import Link from "next/link";
import { FaCalculator} from "react-icons/fa";
import { CalculadoraJurosCartaoForm } from "@/components/calculadora-juros-cartao-form/calculadora-juros-cartao-form";
import BackButton from "@/components/back-button/back-button";

export default function AuxilioCrechePage() {
    return (
        <div className="p-6 lg:p-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="min-w-0">
                    <BackButton />
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-2xl bg-[#C7D300] border-[#C7D300] border flex items-center justify-center text-emerald-700">
                            <FaCalculator size={16} />
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-2xl font-semibold text-gray-900 truncate">
                                Cálculadora de Atraso Cartão de Crédito
                            </h1>
                            <p className="text-sm text-gray-600 mt-1">
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