"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ReactNode } from "react";
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
    const chars = onlyCpfCnpjChars(value).slice(0, 14);

    if (chars.length <= 11 && !/[A-Z]/.test(chars)) {
        return chars
            .replace(/^(\d{3})(\d)/, "$1.$2")
            .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
            .replace(/\.(\d{3})(\d)/, ".$1-$2");
    }

    return chars
        .replace(/^(.{2})(.)/, "$1.$2")
        .replace(/^(.{2})\.(.{3})(.)/, "$1.$2.$3")
        .replace(/\.(.{3})(.)/, ".$1/$2")
        .replace(/(.{4})(.)$/, "$1-$2");
}

function onlyCpfCnpjChars(value: string) {
    return String(value || "")
        .replace(/[^a-zA-Z0-9]/g, "")
        .toUpperCase();
}

function formatContaCorrente(value: string) {
    const digits = String(value || "").replace(/\D/g, "").slice(0, 12);
    if (digits.length <= 1) return digits;
    return `${digits.slice(0, -1)}-${digits.slice(-1)}`;
}

const fieldClass =
    "h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/15";

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
            [11, 14].includes(onlyCpfCnpjChars(outorganteCpfCnpj).length) &&
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
        <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm">
            <div className="h-1 bg-gradient-to-r from-primary via-secondary to-third" />

            <div className="space-y-5 p-5 md:p-6">
                <SectionCard
                    title="Consulta do procurador"
                    description="Busque pelo CPF para carregar os dados disponíveis e ajuste manualmente se necessário."
                >
                    <SearchForm onSearch={onBuscar}>
                        <div>
                            <FieldLabel>CPF do procurador(a)</FieldLabel>

                            <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
                                <SearchInput
                                    value={formatCpfView(cpf)}
                                    onChange={(e) => setCpf(e.target.value)}
                                    placeholder="CPF (somente números)"
                                    className={fieldClass}
                                    maxLength={14}
                                />

                                <SearchButton loading={loading} label="Pesquisar" />
                            </div>

                            {erro && (
                                <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                                    {erro}
                                </div>
                            )}

                            {info && (
                                <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                                    {info}
                                </div>
                            )}
                        </div>
                    </SearchForm>
                </SectionCard>

                <SectionCard
                    title="Procurador(a) renunciante"
                    description="Dados da pessoa que está renunciando à procuração."
                >
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                        <div className="md:col-span-2">
                            <FieldLabel>Nome completo</FieldLabel>
                            <input
                                value={renuncianteNome}
                                onChange={(e) => setRenuncianteNome(e.target.value)}
                                className={fieldClass}
                                placeholder="Nome completo"
                            />
                        </div>

                        <div>
                            <FieldLabel>CPF</FieldLabel>
                            <input
                                value={formatCpfView(renuncianteCpf)}
                                onChange={(e) =>
                                    setRenuncianteCpf(e.target.value.replace(/\D/g, "").slice(0, 11))
                                }
                                className={fieldClass}
                                placeholder="CPF"
                                inputMode="numeric"
                                maxLength={14}
                            />
                        </div>

                        <div>
                            <FieldLabel>RG (opcional)</FieldLabel>
                            <input
                                value={renuncianteRg}
                                onChange={(e) => setRenuncianteRg(e.target.value)}
                                className={fieldClass}
                                placeholder="RG"
                            />
                        </div>
                    </div>
                </SectionCard>

                <SectionCard
                    title="Outorgante e conta"
                    description="Informe a pessoa ou empresa vinculada à procuração e a conta relacionada."
                >
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                        <div className="md:col-span-2">
                            <FieldLabel>Outorgante - Nome/Razão Social</FieldLabel>
                            <input
                                value={outorganteNomeRazao}
                                onChange={(e) => setOutorganteNomeRazao(e.target.value)}
                                className={fieldClass}
                                placeholder="Nome completo ou Razão social"
                            />
                        </div>

                        <div>
                            <FieldLabel>CPF/CNPJ do outorgante</FieldLabel>
                            <input
                                value={formatCpfCnpjView(outorganteCpfCnpj)}
                                onChange={(e) =>
                                    setOutorganteCpfCnpj(onlyCpfCnpjChars(e.target.value).slice(0, 14))
                                }
                                className={fieldClass}
                                placeholder="CPF ou CNPJ"
                                maxLength={18}
                            />
                        </div>

                        <div>
                            <FieldLabel>Número da conta</FieldLabel>
                            <input
                                value={numeroConta}
                                onChange={(e) => setNumeroConta(formatContaCorrente(e.target.value))}
                                className={fieldClass}
                                placeholder="XXXXXXXX-X"
                                inputMode="numeric"
                            />
                        </div>
                    </div>
                </SectionCard>

                <SectionCard
                    title="Local e data"
                    description="Essas informações serão refletidas no PDF gerado."
                >
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                        <div>
                            <FieldLabel>Cidade</FieldLabel>
                            <select
                                value={cidade}
                                onChange={(e) => setCidade(e.target.value)}
                                className={fieldClass}
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
                            <FieldLabel>Dia</FieldLabel>
                            <input
                                value={dia}
                                onChange={(e) => setDia(e.target.value)}
                                className={fieldClass}
                            />
                        </div>

                        <div>
                            <FieldLabel>Mês</FieldLabel>
                            <input
                                value={mes}
                                onChange={(e) => setMes(e.target.value)}
                                className={fieldClass}
                            />
                        </div>

                        <div>
                            <FieldLabel>Ano</FieldLabel>
                            <input
                                value={ano}
                                onChange={(e) => setAno(e.target.value)}
                                className={fieldClass}
                            />
                        </div>
                    </div>
                </SectionCard>

                <div className="flex justify-end border-t border-slate-200 pt-5">
                    <button
                        onClick={gerar}
                        disabled={!formularioValido}
                        className={`inline-flex h-10 items-center justify-center rounded-xl px-5 text-sm font-semibold text-white shadow-sm transition ${formularioValido
                            ? "bg-secondary hover:bg-primary"
                            : "cursor-not-allowed bg-slate-300"
                            }`}
                    >
                        Gerar PDF
                    </button>
                </div>
            </div>
        </div>
    );
}

function SectionCard({
    title,
    description,
    children,
}: {
    title: string;
    description?: string;
    children: ReactNode;
}) {
    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4">
                <h2 className="flex items-center gap-2 text-base font-semibold text-title">
                    <span className="h-2 w-2 rounded-full bg-primary" />
                    {title}
                </h2>

                {description && (
                    <p className="mt-1 text-sm text-paragraph">
                        {description}
                    </p>
                )}
            </div>

            {children}
        </section>
    );
}

function FieldLabel({ children }: { children: ReactNode }) {
    return (
        <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
            {children}
        </label>
    );
}