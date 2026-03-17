"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState } from "react";
import { gerarPdfRenunciaProcurador } from "@/lib/pdf/gerarPdfRenunciaProcurador";
import { formatCpfView, hojeBR } from "@/utils/br";
import { useAssociadoPorCpf } from "@/hooks/useAssociadoPorCpf";

const hojePartsBR = () => {
    const h = hojeBR(); // dd/mm/aaaa
    const [dia = "", mesNum = "", ano = ""] = (h || "").split("/");
    const meses = [
        "janeiro",
        "fevereiro",
        "março",
        "abril",
        "maio",
        "junho",
        "julho",
        "agosto",
        "setembro",
        "outubro",
        "novembro",
        "dezembro",
    ];
    const mesIdx = Math.max(0, Math.min(11, Number(mesNum) - 1));
    const mes = meses[isNaN(mesIdx) ? 0 : mesIdx];
    return { dia, mes, ano };
};

export function RenunciaProcuradorForm() {
    const [cpf, setCpf] = useState("");

    // Renunciante (procurador)
    const [renuncianteNome, setRenuncianteNome] = useState("");
    const [renuncianteCpf, setRenuncianteCpf] = useState("");
    const [renuncianteRg, setRenuncianteRg] = useState("");

    // Outorgante / conta
    const [outorganteNomeRazao, setOutorganteNomeRazao] = useState("");
    const [outorganteCpfCnpj, setOutorganteCpfCnpj] = useState("");
    const [numeroConta, setNumeroConta] = useState("");

    // Data/local
    const { dia: d0, mes: m0, ano: a0 } = useMemo(hojePartsBR, []);
    const [cidade, setCidade] = useState("São José dos Campos");
    const [dia, setDia] = useState(d0);
    const [mes, setMes] = useState(m0);
    const [ano, setAno] = useState(a0);

    const { loading, erro, info, buscar } = useAssociadoPorCpf();

    const onBuscar = async () => {
        const r = await buscar(cpf);
        if (r.found) {
            setRenuncianteNome(r.data.nome || "");
            setRenuncianteCpf(r.data.cpf || cpf.replace(/\D/g, ""));
            setRenuncianteRg(r.data.rg || "");
            if (r.data.cidade) setCidade(r.data.cidade);
        } else {
            setRenuncianteCpf(cpf.replace(/\D/g, ""));
        }
    };

    const gerar = async () => {
        await gerarPdfRenunciaProcurador({
            renuncianteNome,
            renuncianteCpf,
            renuncianteRg,
            outorganteNomeRazao,
            outorganteCpfCnpj,
            numeroConta,
            cidade,
            dia,
            mes,
            ano,
        });
    };

    return (
        <div className="min-w-225 mx-auto p-6 bg-white rounded-xl shadow">
            <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                    CPF do procurador(a)
                </label>

                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
                    <input
                        value={formatCpfView(cpf)}
                        onChange={(e) => setCpf(e.target.value)}
                        placeholder="CPF (somente números)"
                        className="border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-emerald-300"
                        inputMode="numeric"
                        maxLength={14}
                    />

                    <button
                        onClick={onBuscar}
                        disabled={loading}
                        className="bg-secondary text-white font-semibold px-6 py-2 rounded hover:bg-primary cursor-pointer hover:shadow-md"
                    >
                        {loading ? "Buscando..." : "Pesquisar"}
                    </button>
                </div>

                {erro && (
                    <div className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
                        {erro}
                    </div>
                )}
                {info && (
                    <div className="mt-3 text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded p-3">
                        {info}
                    </div>
                )}
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                        Procurador(a) renunciante — Nome completo
                    </label>
                    <input
                        value={renuncianteNome}
                        onChange={(e) => setRenuncianteNome(e.target.value)}
                        className="w-full border px-3 py-2 rounded"
                        placeholder="Nome completo"
                    />
                </div>

                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                        CPF
                    </label>
                    <input
                        value={formatCpfView(renuncianteCpf)}
                        onChange={(e) => setRenuncianteCpf(e.target.value.replace(/\D/g, "").slice(0, 11))}
                        className="w-full border px-3 py-2 rounded"
                        placeholder="CPF"
                        inputMode="numeric"
                        maxLength={14}
                    />
                </div>

                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                        RG (opcional)
                    </label>
                    <input
                        value={renuncianteRg}
                        onChange={(e) => setRenuncianteRg(e.target.value)}
                        className="w-full border px-3 py-2 rounded"
                        placeholder="RG"
                    />
                </div>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                        Outorgante — Nome/Razão Social
                    </label>
                    <input
                        value={outorganteNomeRazao}
                        onChange={(e) => setOutorganteNomeRazao(e.target.value)}
                        className="w-full border px-3 py-2 rounded"
                        placeholder="Nome completo ou Razão social"
                    />
                </div>

                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                        CPF/CNPJ do outorgante
                    </label>
                    <input
                        value={outorganteCpfCnpj}
                        onChange={(e) => setOutorganteCpfCnpj(e.target.value)}
                        className="w-full border px-3 py-2 rounded"
                        placeholder="CPF ou CNPJ"
                    />
                </div>

                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                        Número da conta
                    </label>
                    <input
                        value={numeroConta}
                        onChange={(e) => setNumeroConta(e.target.value)}
                        className="w-full border px-3 py-2 rounded"
                        placeholder="XXXXXXXX-X"
                    />
                </div>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                        Cidade
                    </label>
                    <input
                        value={cidade}
                        onChange={(e) => setCidade(e.target.value)}
                        className="w-full border px-3 py-2 rounded"
                    />
                </div>

                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                        Dia
                    </label>
                    <input
                        value={dia}
                        onChange={(e) => setDia(e.target.value)}
                        className="w-full border px-3 py-2 rounded"
                    />
                </div>

                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                        Mês
                    </label>
                    <input
                        value={mes}
                        onChange={(e) => setMes(e.target.value)}
                        className="w-full border px-3 py-2 rounded"
                    />
                </div>

                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                        Ano
                    </label>
                    <input
                        value={ano}
                        onChange={(e) => setAno(e.target.value)}
                        className="w-full border px-3 py-2 rounded"
                    />
                </div>
            </div>

            <div className="pt-5 border-t mt-6 flex items-center justify-end">
                <button
                    onClick={gerar}
                    className="inline-flex items-center gap-2 bg-secondary hover:bg-primary cursor-pointer text-white font-semibold px-5 py-2 rounded shadow"
                >
                    Gerar PDF
                </button>
            </div>
        </div>
    );
}