"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import { gerarPdfRenunciaProcurador } from "@/lib/pdf/gerarPdfRenunciaProcurador";
import { formatCpfView, hojeBR } from "@/utils/br";
import { useAssociadoPorCpf } from "@/hooks/useAssociadoPorCpf";
import { SearchForm } from "@/components/ui/search-form";
import { SearchInput } from "@/components/ui/search-input";
import { SearchButton } from "@/components/ui/search-button";
import {
    buscarCidadesResgate
} from "@/services/resgate_capital.service";

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

function formatCpfCnpjView(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 14);

    if (digits.length <= 11) {
        return digits
            .replace(/^(\d{3})(\d)/, "$1.$2")
            .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
            .replace(/\.(\d{3})(\d)/, ".$1-$2");
    }

    return digits
        .replace(/^(\d{2})(\d)/, "$1.$2")
        .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
        .replace(/\.(\d{3})(\d)/, ".$1/$2")
        .replace(/(\d{4})(\d)/, "$1-$2");
}

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
    const [cidades, setCidades] = useState<{ value: string; label: string }[]>([]);

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

    useEffect(() => {
        async function carregarCidades() {
            try {
                const lista = await buscarCidadesResgate(); // retorna [{ ID_CIDADES, ID_UF, NM_CIDADE }]
                const opcoes = (lista || [])
                    .map((c) => {
                        const nome = String(c.NM_CIDADE || "").trim();
                        return { value: nome, label: nome };
                    })
                    .filter((c) => c.value.length > 0);

                setCidades(opcoes);
            } catch (e) {
                console.error("Erro ao carregar cidades:", e);
                setCidades([]);
            }
        }

        carregarCidades();
    }, []);

    const formularioValido = useMemo(() => {
        return (
            renuncianteNome.trim() !== "" &&
            renuncianteCpf.replace(/\D/g, "").length === 11 &&
            outorganteNomeRazao.trim() !== "" &&
            [11, 14].includes(outorganteCpfCnpj.replace(/\D/g, "").length) &&
            numeroConta.trim() !== "" &&
            cidade.trim() !== "" &&
            dia.trim() !== "" &&
            mes.trim() !== "" &&
            ano.trim() !== ""
        );
    }, [
        renuncianteNome,
        renuncianteCpf,
        outorganteNomeRazao,
        outorganteCpfCnpj,
        numeroConta,
        cidade,
        dia,
        mes,
        ano,
    ]);

    return (
        <div className="min-w-225 mx-auto p-6 bg-white rounded-xl shadow">
            <SearchForm onSearch={onBuscar}>
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                        CPF do procurador(a)
                    </label>

                    <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
                        <SearchInput
                            value={formatCpfView(cpf)}
                            onChange={(e) => setCpf(e.target.value)}
                            placeholder="CPF (somente números)"
                            className="border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-emerald-300"
                            inputMode="numeric"
                            maxLength={14}
                        />

                        <SearchButton loading={loading} label="Pesquisar" />
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
            </SearchForm>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="md:col-span-2">
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

            <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="md:col-span-2">
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
                        value={formatCpfCnpjView(outorganteCpfCnpj)}
                        onChange={(e) =>
                            setOutorganteCpfCnpj(e.target.value.replace(/\D/g, "").slice(0, 14))
                        }
                        className="w-full border px-3 py-2 rounded"
                        placeholder="CPF ou CNPJ"
                        inputMode="numeric"
                        maxLength={18}
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
                <div className="md:col-span-1">
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                        Cidade
                    </label>
                    <select
                        value={cidade}
                        onChange={(e) => setCidade(e.target.value)}
                        className="w-full border px-3 py-2 rounded bg-white"
                    >
                        <option value="">Selecione</option>
                        {cidades.map((c) => (
                            <option key={c.value} value={c.value}>
                                {c.label}
                            </option>
                        ))}
                    </select>
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
                    disabled={!formularioValido}
                    className={`inline-flex items-center gap-2 text-white font-semibold px-5 py-2 rounded shadow transition
        ${formularioValido
                            ? "bg-secondary hover:bg-primary cursor-pointer"
                            : "bg-gray-300 cursor-not-allowed"
                        }`}
                >
                    Gerar PDF
                </button>
            </div>
        </div>
    );
}