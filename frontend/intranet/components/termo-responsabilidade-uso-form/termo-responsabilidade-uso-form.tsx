"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useState } from "react";
import { FaFilePdf, FaSearch } from "react-icons/fa";
import { buscarFuncionarioPorCpfTermo } from "@/services/termo_responsabilidade_uso.service";
import { gerarPdfTermoResponsabilidadeUso } from "@/lib/pdf/gerarPdfTermoResponsabilidadeUso";
import { SearchForm } from "@/components/ui/search-form";
import { SearchInput } from "@/components/ui/search-input";

type EquipamentoTipo = "" | "celular" | "notebook";

const labelClass = "mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-600";
const fieldClass =
    "h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-left text-sm font-medium text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/10";
const searchInputClass =
    "h-10 rounded-xl border-slate-300 py-0 text-left text-sm font-medium text-slate-700 shadow-sm placeholder:text-slate-400 hover:border-slate-400 focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/10";
const primaryButtonClass =
    "inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[var(--secondary)] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer";
const pdfButtonClass =
    "inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--fourth)] disabled:cursor-not-allowed disabled:opacity-60";

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

    const formularioValido = useMemo(() => {
        if (!cpfNumerico) return false;
        if (!validarCpf(cpfNumerico)) return false;

        if (!nome.trim()) return false;
        if (!equipamento) return false;
        if (!modelo.trim()) return false;
        if (!numeroSerie.trim()) return false;
        if (!entrega.trim()) return false;
        if (!acessorios.trim()) return false;

        if (equipamento === "celular" && !linha.trim()) return false;

        return true;
    }, [
        cpfNumerico,
        nome,
        equipamento,
        modelo,
        numeroSerie,
        entrega,
        acessorios,
        linha,
    ]);

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
        <div className="mx-auto overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="h-1 bg-gradient-to-r from-[var(--primary)] via-[var(--primary)] to-[var(--third)]" />

            <div className="space-y-5 p-5 lg:p-6">
                <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-200 p-4">
                        <h2 className="flex items-center gap-2 text-base font-bold text-[var(--title)]">
                            <span className="h-2 w-2 rounded-full bg-[var(--primary)]" />
                            Consulta do colaborador
                        </h2>
                        <p className="mt-1 text-sm text-[var(--paragraph)]">
                            Pesquise pelo CPF para preencher o nome automaticamente.
                        </p>
                    </div>

                    <div className="p-4">
                        <SearchForm onSearch={buscarFuncionario}>
                            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_1fr]">
                                <div>
                                    <label className={labelClass}>
                                        CPF
                                    </label>
                                    <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
                                        <SearchInput
                                            value={cpf}
                                            onChange={(e) => setCpf(formatarCpf(e.target.value))}
                                            placeholder="000.000.000-00"
                                            maxLength={14}
                                            className={searchInputClass}
                                        />

                                        <button
                                            type="submit"
                                            disabled={loadingBusca}
                                            className={primaryButtonClass}
                                        >
                                            <FaSearch />
                                            {loadingBusca ? "Pesquisando..." : "Pesquisar"}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className={labelClass}>
                                        Nome
                                    </label>
                                    <input
                                        value={nome}
                                        onChange={(e) => setNome(e.target.value)}
                                        className={fieldClass}
                                        placeholder="Nome do colaborador"
                                    />
                                </div>
                            </div>

                            {(erro || info) && (
                                <div className="mt-4">
                                    {erro ? (
                                        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
                                            {erro}
                                        </div>
                                    ) : (
                                        <div className="rounded-xl border border-[var(--primary)]/20 bg-[var(--primary)]/10 p-3 text-sm font-medium text-[var(--primary)]">
                                            {info}
                                        </div>
                                    )}
                                </div>
                            )}
                        </SearchForm>
                    </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-200 p-4">
                        <h2 className="flex items-center gap-2 text-base font-bold text-[var(--title)]">
                            <span className="h-2 w-2 rounded-full bg-[var(--primary)]" />
                            Dados do equipamento
                        </h2>
                        <p className="mt-1 text-sm text-[var(--paragraph)]">
                            Informe o equipamento entregue e os acessórios que constarão no termo.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-12">
                        <div className="lg:col-span-3">
                            <label className={labelClass}>
                                Equipamento
                            </label>
                            <select
                                value={equipamento}
                                onChange={(e) => aoTrocarEquipamento(e.target.value as EquipamentoTipo)}
                                className={fieldClass}
                            >
                                <option value="">Selecione</option>
                                <option value="celular">Celular</option>
                                <option value="notebook">Notebook</option>
                            </select>
                        </div>

                        <div className="lg:col-span-5">
                            <label className={labelClass}>
                                Modelo
                            </label>
                            <input
                                value={modelo}
                                onChange={(e) => setModelo(e.target.value)}
                                className={fieldClass}
                            />
                        </div>

                        <div className="lg:col-span-4">
                            <label className={labelClass}>
                                NR Série
                            </label>
                            <input
                                value={numeroSerie}
                                onChange={(e) => setNumeroSerie(e.target.value)}
                                className={fieldClass}
                            />
                        </div>

                        {equipamento === "celular" && (
                            <div className="lg:col-span-4">
                                <label className={labelClass}>
                                    Número Linha
                                </label>
                                <input
                                    value={linha}
                                    onChange={(e) => setLinha(phoneMask(e.target.value))}
                                    maxLength={15}
                                    className={fieldClass}
                                />
                            </div>
                        )}

                        <div className="lg:col-span-4">
                            <label className={labelClass}>
                                Entrega
                            </label>
                            <input
                                type="date"
                                value={entrega}
                                onChange={(e) => setEntrega(e.target.value)}
                                className={fieldClass}
                                readOnly
                            />
                        </div>

                        <div className="lg:col-span-8">
                            <label className={labelClass}>
                                Acessórios
                            </label>
                            <input
                                value={acessorios}
                                onChange={(e) => setAcessorios(e.target.value)}
                                maxLength={80}
                                className={fieldClass}
                            />
                        </div>
                    </div>
                </section>

                <div className="flex items-center justify-end border-t border-slate-200 pt-5">
                    <button
                        type="button"
                        onClick={gerarPdf}
                        disabled={!formularioValido || gerando}
                        className={
                            formularioValido && !gerando
                                ? `${pdfButtonClass} cursor-pointer`
                                : `${pdfButtonClass} bg-slate-300 hover:bg-slate-300`
                        }
                    >
                        <FaFilePdf />
                        {gerando ? "Gerando PDF..." : "Gerar PDF"}
                    </button>
                </div>
            </div>
        </div>
    );
}
