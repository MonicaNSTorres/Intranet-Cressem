"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useState } from "react";
import { FaFilePdf, FaSearch } from "react-icons/fa";
import { buscarFuncionarioPorCpfTermo } from "@/services/termo_responsabilidade_uso.service";
import { gerarPdfTermoResponsabilidadeUso } from "@/lib/pdf/gerarPdfTermoResponsabilidadeUso";

type EquipamentoTipo = "" | "celular" | "notebook";

function capitalizeWords(str?: string | null) {
    return String(str || "")
        .toLowerCase()
        .split(" ")
        .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : ""))
        .join(" ");
}

function formatarCpf(valor: string) {
    const digits = valor.replace(/\D/g, "").slice(0, 11);

    return digits
        .replace(/^(\d{3})(\d)/, "$1.$2")
        .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
        .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

function somenteNumeros(valor: string) {
    return valor.replace(/\D/g, "");
}

function validarCpf(cpf: string) {
    cpf = cpf.replace(/[\s.-]*/gim, "");

    if (typeof cpf !== "string") return false;
    if (
        !cpf ||
        cpf.length !== 11 ||
        [
            "00000000000",
            "11111111111",
            "22222222222",
            "33333333333",
            "44444444444",
            "55555555555",
            "66666666666",
            "77777777777",
            "88888888888",
            "99999999999",
        ].includes(cpf)
    ) {
        return false;
    }

    let soma = 0;
    let resto = 0;

    for (let i = 1; i <= 9; i += 1) {
        soma += parseInt(cpf.substring(i - 1, i), 10) * (11 - i);
    }

    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpf.substring(9, 10), 10)) return false;

    soma = 0;
    for (let i = 1; i <= 10; i += 1) {
        soma += parseInt(cpf.substring(i - 1, i), 10) * (12 - i);
    }

    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpf.substring(10, 11), 10)) return false;

    return true;
}

function getDataHojeFormatoAmericano() {
    const data = new Date();
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const dia = String(data.getDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
}

function phoneMask(value: string) {
    if (!value) return "";
    let cleaned = value.replace(/\D/g, "");
    cleaned = cleaned.replace(/(\d{2})(\d)/, "($1) $2");
    cleaned = cleaned.replace(/(\d)(\d{4})$/, "$1-$2");
    return cleaned;
}

export function TermoResponsabilidadeUsoForm() {
    const [cpf, setCpf] = useState("");
    const [nome, setNome] = useState("");
    const [equipamento, setEquipamento] = useState<EquipamentoTipo>("");
    const [modelo, setModelo] = useState("");
    const [numeroSerie, setNumeroSerie] = useState("");
    const [linha, setLinha] = useState("");
    const [entrega, setEntrega] = useState("");
    const [acessorios, setAcessorios] = useState("");

    const [loadingBusca, setLoadingBusca] = useState(false);
    const [gerando, setGerando] = useState(false);
    const [erro, setErro] = useState("");
    const [info, setInfo] = useState("");

    useEffect(() => {
        setEntrega(getDataHojeFormatoAmericano());
    }, []);

    const cpfNumerico = useMemo(() => somenteNumeros(cpf), [cpf]);

    function validarCampos() {
        if (!cpfNumerico) {
            setErro("CPF não preenchido.");
            return false;
        }

        if (!validarCpf(cpfNumerico)) {
            setErro("Informe um CPF válido.");
            return false;
        }

        if (!nome.trim()) {
            setErro("Nome não preenchido.");
            return false;
        }

        if (!equipamento) {
            setErro("Selecione o tipo de equipamento.");
            return false;
        }

        if (!modelo.trim()) {
            setErro("Modelo não preenchido.");
            return false;
        }

        if (!numeroSerie.trim()) {
            setErro("Número de série não preenchido.");
            return false;
        }

        if (equipamento === "celular" && !linha.trim()) {
            setErro("Número de linha não preenchido.");
            return false;
        }

        return true;
    }

    async function buscarFuncionario() {
        try {
            setErro("");
            setInfo("");

            if (!cpfNumerico) {
                setErro("Informe o CPF para buscar.");
                return;
            }

            if (!validarCpf(cpfNumerico)) {
                setErro("Informe um CPF válido.");
                return;
            }

            setLoadingBusca(true);

            const funcionario = await buscarFuncionarioPorCpfTermo(cpfNumerico);

            if (funcionario?.found) {
                setNome(capitalizeWords(funcionario.nome || ""));
                setInfo("Colaborador localizado com sucesso.");
            } else {
                setNome("");
                setInfo("CPF não encontrado. Preencha o nome manualmente.");
            }
        } catch (e: any) {
            console.error(e);
            setNome("");
            setInfo("CPF não encontrado. Preencha o nome manualmente.");
        } finally {
            setLoadingBusca(false);
        }
    }

    function aoTrocarEquipamento(valor: EquipamentoTipo) {
        setEquipamento(valor);
        setErro("");
        setInfo("");

        if (valor === "notebook") {
            setModelo("Notebook Dell Latitude 3550");
            setLinha("");
            setAcessorios("Carregador e kit teclado e mouse sem fio;");
            return;
        }

        if (valor === "celular") {
            setModelo("");
            setAcessorios("Carregador, capinha e película;");
            return;
        }

        setModelo("");
        setLinha("");
        setAcessorios("");
    }

    async function gerarPdf() {
        try {
            setErro("");
            setInfo("");

            if (!validarCampos()) return;

            setGerando(true);

            await gerarPdfTermoResponsabilidadeUso({
                cpf: formatarCpf(cpfNumerico),
                nome: capitalizeWords(nome),
                equipamento,
                modelo: capitalizeWords(modelo),
                numeroSerie,
                linha,
                entrega,
                acessorios,
            });
        } catch (e: any) {
            console.error(e);
            setErro("Não foi possível gerar o PDF do termo.");
        } finally {
            setGerando(false);
        }
    }

    return (
        <div className="min-w-225 mx-auto rounded-xl bg-white p-6 shadow">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_1fr]">
                <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">
                        CPF
                    </label>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
                        <input
                            value={cpf}
                            onChange={(e) => setCpf(formatarCpf(e.target.value))}
                            placeholder="000.000.000-00"
                            maxLength={14}
                            className="rounded border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                        />

                        <button
                            type="button"
                            onClick={buscarFuncionario}
                            disabled={loadingBusca}
                            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded bg-secondary px-5 py-2 font-semibold text-white shadow hover:bg-primary disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <FaSearch />
                            {loadingBusca ? "Buscando..." : "Buscar"}
                        </button>
                    </div>
                </div>

                <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">
                        Nome
                    </label>
                    <input
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        className="w-full rounded border px-3 py-2"
                        placeholder="Nome do colaborador"
                    />
                </div>
            </div>

            {(erro || info) && (
                <div className="mt-4">
                    {erro ? (
                        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                            {erro}
                        </div>
                    ) : (
                        <div className="rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                            {info}
                        </div>
                    )}
                </div>
            )}

            <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-12">
                <div className="lg:col-span-3">
                    <label className="mb-1 block text-xs font-medium text-gray-600">
                        Equipamento
                    </label>
                    <select
                        value={equipamento}
                        onChange={(e) => aoTrocarEquipamento(e.target.value as EquipamentoTipo)}
                        className="w-full rounded border px-3 py-2"
                    >
                        <option value=""></option>
                        <option value="celular">Celular</option>
                        <option value="notebook">Notebook</option>
                    </select>
                </div>

                <div className="lg:col-span-5">
                    <label className="mb-1 block text-xs font-medium text-gray-600">
                        Modelo
                    </label>
                    <input
                        value={modelo}
                        onChange={(e) => setModelo(e.target.value)}
                        className="w-full rounded border px-3 py-2"
                    />
                </div>

                <div className="lg:col-span-4">
                    <label className="mb-1 block text-xs font-medium text-gray-600">
                        NR Série
                    </label>
                    <input
                        value={numeroSerie}
                        onChange={(e) => setNumeroSerie(e.target.value)}
                        className="w-full rounded border px-3 py-2"
                    />
                </div>

                {equipamento === "celular" && (
                    <div className="lg:col-span-4">
                        <label className="mb-1 block text-xs font-medium text-gray-600">
                            Número Linha
                        </label>
                        <input
                            value={linha}
                            onChange={(e) => setLinha(phoneMask(e.target.value))}
                            maxLength={15}
                            className="w-full rounded border px-3 py-2"
                        />
                    </div>
                )}

                <div className="lg:col-span-4">
                    <label className="mb-1 block text-xs font-medium text-gray-600">
                        Entrega
                    </label>
                    <input
                        type="date"
                        value={entrega}
                        onChange={(e) => setEntrega(e.target.value)}
                        className="w-full rounded border px-3 py-2"
                        readOnly
                    />
                </div>

                <div className="lg:col-span-8">
                    <label className="mb-1 block text-xs font-medium text-gray-600">
                        Acessórios
                    </label>
                    <input
                        value={acessorios}
                        onChange={(e) => setAcessorios(e.target.value)}
                        maxLength={80}
                        className="w-full rounded border px-3 py-2"
                    />
                </div>
            </div>

            <div className="mt-6 border-t pt-5 flex items-center justify-end">
                <button
                    onClick={gerarPdf}
                    disabled={gerando}
                    className="inline-flex items-center gap-2 rounded bg-secondary px-5 py-2 font-semibold text-white shadow hover:bg-primary cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                >
                    <FaFilePdf />
                    {gerando ? "Gerando PDF..." : "Gerar PDF"}
                </button>
            </div>
        </div>
    );
}