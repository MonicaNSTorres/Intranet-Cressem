"use client";

import { FaFileSignature } from "react-icons/fa";
import BackButton from "@/components/back-button/back-button";
import { FichaDesimpedimentoForm } from "@/components/ficha-desimpedimento-form/ficha-desimpedimento-form";
import { useRouter } from "next/navigation";

export default function FichaDesimpedimentoPage() {
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